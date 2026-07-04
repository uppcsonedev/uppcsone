require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const path = require('path');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const fs = require('fs'); 
const multer = require('multer');

// ==========================================
// SUPABASE STORAGE INITIALIZATION
// ==========================================
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL; 
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/ping', (req, res) => {
  res.status(200).send('Server is awake');
});

// ==========================================
// RAZORPAY INITIALIZATION
// ==========================================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ==========================================
// BULLETPROOF CONNECTION POOL
// ==========================================
const dbConfig = process.env.DB_HOST ? {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  database: 'defaultdb',
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
} : {
  host: 'localhost',
  user: 'root',
  password: 'Akki2808!',
  database: 'ss_store', 
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const db = mysql.createPool(dbConfig);

db.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to the database successfully using a Connection Pool!');
  connection.release(); 
});

// ==========================================
// Helper Function: Secure Cloud Fetcher
// ==========================================
const streamFromCloud = (url, res, orderId, isDownload) => {
  const secureUrl = url.replace('http://', 'https://');
  const https = require('https');

  https.get(secureUrl, (cloudRes) => {
      // 1. Follow Redirects
      if (cloudRes.statusCode >= 300 && cloudRes.statusCode < 400 && cloudRes.headers.location) {
          return streamFromCloud(cloudRes.headers.location, res, orderId, isDownload);
      }

      // 2. Gatekeeper
      if (cloudRes.statusCode !== 200) {
          console.error(`Cloud Error! Status: ${cloudRes.statusCode}`);
          return res.status(500).send(`Error fetching file. Cloud Status: ${cloudRes.statusCode}`);
      }

      // 3. Pipe to Browser
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="Ebook_${orderId}.pdf"`);
      cloudRes.pipe(res);
  }).on('error', (e) => {
      console.error("Cloud Fetch Error:", e);
      res.status(500).send('Network error while loading PDF.');
  });
};

// ==========================================
// API ROUTES
// ==========================================

// Route A: Initiate Checkout & Generate Payment Intent
app.post('/api/orders', (req, res) => {
  const { name, whatsapp, email, bookId } = req.body;
  
  db.query('SELECT price FROM books WHERE id = ?', [bookId], (err, bookResults) => {
    if (err || bookResults.length === 0) return res.status(404).json({ error: 'Book not found' });

    const actualPrice = bookResults[0].price;
    const sql = `INSERT INTO orders (customer_name, whatsapp_number, email, book_id, payment_status) VALUES (?, ?, ?, ?, 'Pending')`;
    
    db.query(sql, [name, whatsapp, email, bookId], async (err, result) => {
      if (err) return res.status(500).json({ error: 'Failed to create order' });
      
      const internalOrderId = result.insertId;

      try {
        const options = {
          amount: actualPrice * 100, 
          currency: "INR",
          receipt: `receipt_${internalOrderId}`,
          notes: { internal_order_id: internalOrderId } 
        };

        const razorpayOrder = await razorpay.orders.create(options);

        res.json({
          success: true,
          orderId: internalOrderId,
          gatewayOrderId: razorpayOrder.id, 
          amount: razorpayOrder.amount, 
          currency: razorpayOrder.currency
        });
      } catch (rzpErr) {
        res.status(500).json({ error: "Failed to connect to payment gateway." });
      }
    });
  });
});

// Route B: Cryptographic Signature Verification (Gateway Webhook - Frontend)
app.post('/api/payment/verify', (req, res) => {
  const { internalOrderId, gatewayOrderId, gatewayPaymentId, gatewaySignature } = req.body;

  if (!gatewayOrderId || !gatewayPaymentId || !gatewaySignature) {
    return res.status(400).json({ success: false, message: 'Invalid payload.' });
  }

  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(gatewayOrderId + "|" + gatewayPaymentId)
    .digest('hex');

  if (generatedSignature !== gatewaySignature) {
    return res.status(400).json({ success: false, message: 'Verification failed.' });
  }

  const sql = `UPDATE orders SET payment_status = 'Paid' WHERE id = ?`;
  db.query(sql, [internalOrderId], (err) => {
    if (err) return res.status(500).json({ error: 'Database update failed' });
    res.json({ success: true, message: 'Payment verified.' });
  });
});

// ==========================================
// Route B.2: TRUE SERVER-TO-SERVER WEBHOOK
// ==========================================
app.post('/api/webhook/razorpay', (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET; 
  const signature = req.headers['x-razorpay-signature'];

  if (!signature || !webhookSecret) return res.status(400).send('Missing config');

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature === signature) {
      if (req.body.event === 'payment.captured') {
        const internalOrderId = req.body.payload.payment.entity.notes?.internal_order_id;
        if (internalOrderId) {
          db.query(`UPDATE orders SET payment_status = 'Paid' WHERE id = ?`, [internalOrderId], (err) => {
            if (!err) console.log(`✅ Webhook Success: Order #${internalOrderId} marked Paid!`);
          });
        }
      }
      res.status(200).send('Webhook verified');
    } else {
      res.status(400).send('Invalid signature');
    }
  } catch (error) {
    res.status(500).send('Server Error');
  }
});

// ==========================================
// Route C: Secure Digital Delivery (Download)
// ==========================================
app.get('/api/download/:orderId', (req, res) => {
  const orderId = req.params.orderId;
  const sql = `SELECT o.payment_status, b.file_url FROM orders o JOIN books b ON o.book_id = b.id WHERE o.id = ?`;
  
  db.query(sql, [orderId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (results[0].payment_status !== 'Paid') return res.status(403).send('Access Denied');

    const fileUrl = results[0].file_url;

    if (fileUrl.startsWith('http')) {
        streamFromCloud(fileUrl, res, orderId, true); // true = force download
    } else {
        const filePath = path.join(__dirname, 'protected_files', fileUrl);
        res.download(filePath, `Ebook_${orderId}.pdf`);
    }
  });
});

// ==========================================
// Route C.2: Secure Digital Stream (Read in Browser)
// ==========================================
app.get('/api/stream/:orderId', (req, res) => {
  const orderId = req.params.orderId;
  const sql = `SELECT o.payment_status, b.file_url FROM orders o JOIN books b ON o.book_id = b.id WHERE o.id = ?`;
  
  db.query(sql, [orderId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'Order not found' });
    if (results[0].payment_status !== 'Paid') return res.status(403).send('Access Denied');

    const fileUrl = results[0].file_url;

    if (fileUrl.startsWith('http')) {
        streamFromCloud(fileUrl, res, orderId, false); // false = inline stream
    } else {
        const filePath = path.join(__dirname, 'protected_files', fileUrl);
        res.sendFile(filePath);
    }
  });
});

// ==========================================
// Route F: Secure Admin Multi-File Upload (SUPABASE)
// ==========================================
const localDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'temp_uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/\s+/g, '_').split('.')[0];
    cb(null, Date.now() + '_' + cleanName + path.extname(file.originalname));
  }
});

// 100MB limit to handle massive PDFs smoothly
const upload = multer({ 
  storage: localDiskStorage,
  limits: { fileSize: 100 * 1024 * 1024 } 
});

const cpUpload = upload.fields([
  { name: 'pdf', maxCount: 1 }, 
  { name: 'coverImage', maxCount: 1 }
]);

app.post('/api/admin/upload', cpUpload, async (req, res) => {
  if (!req.files || !req.files['pdf'] || !req.files['coverImage']) {
    return res.status(400).json({ error: 'Both PDF and Cover Image are required.' });
  }

  const { title, category, pages, fileSize, price, physicalPrice } = req.body;
  const pdfLocalPath = req.files['pdf'][0].path; 
  const coverLocalPath = req.files['coverImage'][0].path; 
  const newBookId = 'book_' + Date.now(); 

  try {
    // 1. Read files into memory from temporary Render disk
    const coverBuffer = fs.readFileSync(coverLocalPath);
    const pdfBuffer = fs.readFileSync(pdfLocalPath);

    // 2. Upload Cover Image to Supabase
    const coverFileName = `covers/${Date.now()}_${req.files['coverImage'][0].originalname.replace(/\s+/g, '_')}`;
    const { error: coverError } = await supabase.storage
      .from('uppcs_store_files')
      .upload(coverFileName, coverBuffer, { contentType: req.files['coverImage'][0].mimetype });
    
    if (coverError) throw new Error(`Cover Upload Failed: ${coverError.message}`);

    // 3. Upload Large PDF to Supabase
    const pdfFileName = `pdfs/${Date.now()}_${req.files['pdf'][0].originalname.replace(/\s+/g, '_')}`;
    const { error: pdfError } = await supabase.storage
      .from('uppcs_store_files')
      .upload(pdfFileName, pdfBuffer, { contentType: req.files['pdf'][0].mimetype });

    if (pdfError) throw new Error(`PDF Upload Failed: ${pdfError.message}`);

    // 4. Generate the Public URLs for the Database
    const { data: coverUrlData } = supabase.storage.from('uppcs_store_files').getPublicUrl(coverFileName);
    const { data: pdfUrlData } = supabase.storage.from('uppcs_store_files').getPublicUrl(pdfFileName);

    // 5. Save to Aiven Database
    const sql = `
      INSERT INTO books 
      (id, title, description, category, pages, file_size_mb, price, physical_price, cover_image, file_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      newBookId, title, "No description provided.", category || null, 
      pages || null, fileSize || null, price, physicalPrice || null, 
      coverUrlData.publicUrl, pdfUrlData.publicUrl
    ];

    db.query(sql, values, (err) => {
      if (err) {
        console.error('🚨 Database Error:', err);
        if (fs.existsSync(pdfLocalPath)) fs.unlinkSync(pdfLocalPath);
        if (fs.existsSync(coverLocalPath)) fs.unlinkSync(coverLocalPath);
        return res.status(500).json({ error: `Database Error: ${err.message}` });
      } 
      
      // 6. Cleanup Temp Files from Render disk
      fs.unlinkSync(pdfLocalPath);
      fs.unlinkSync(coverLocalPath);

      console.log(`✅ Supabase Upload & DB Save Success: ${title}`);
      res.status(200).json({ success: true, message: 'Upload successful!' });
    });

  } catch (error) {
    console.error('🚨 Admin Upload Error:', error);
    
    if (fs.existsSync(pdfLocalPath)) fs.unlinkSync(pdfLocalPath);
    if (fs.existsSync(coverLocalPath)) fs.unlinkSync(coverLocalPath);
    
    res.status(500).json({ error: `Storage Error: ${error.message || error}` });
  }
});

// Route D: Fetch User Library
app.get('/api/library/:contact', (req, res) => {
  const sql = `SELECT id AS orderId, book_id AS bookId, created_at FROM orders WHERE (email = ? OR whatsapp_number = ?) AND payment_status = 'Paid' ORDER BY created_at DESC`;
  db.query(sql, [req.params.contact, req.params.contact], (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch library' });
    res.json({ success: true, library: results });
  });
});

// Route E: Fetch Store Catalog
app.get('/api/books', (req, res) => {
  db.query(`SELECT * FROM books ORDER BY created_at DESC`, (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch catalog' });
    const formattedBooks = results.map(book => ({
      id: book.id, title: book.title, description: book.description, category: book.category, pages: book.pages,
      fileSize: book.file_size_mb ? `${book.file_size_mb} MB (PDF)` : 'Unknown Size',
      price: book.price, coverImage: book.cover_image, fileUrl: book.file_url, physical_price: book.physical_price 
    }));
    res.json({ success: true, books: formattedBooks });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});