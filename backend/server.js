require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const path = require('path');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const fs = require('fs'); 
const multer = require('multer'); // 👈 NEW: Imported Multer

// 👇 NEW: Cloudinary Imports
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const https = require('https'); 

// 👇 NEW: Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
// 🚀 THE FIX: BULLETPROOF CONNECTION POOL
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
// API ROUTES
// ==========================================

// Route A: Initiate Checkout & Generate Payment Intent
app.post('/api/orders', (req, res) => {
  const { name, whatsapp, email, bookId } = req.body;
  
  db.query('SELECT price FROM books WHERE id = ?', [bookId], (err, bookResults) => {
    if (err || bookResults.length === 0) {
      return res.status(404).json({ error: 'Book not found or database error' });
    }

    const actualPrice = bookResults[0].price;
    const sql = `INSERT INTO orders (customer_name, whatsapp_number, email, book_id, payment_status) VALUES (?, ?, ?, ?, 'Pending')`;
    
    db.query(sql, [name, whatsapp, email, bookId], async (err, result) => {
      if (err) {
        console.error('🚨 CRITICAL DATABASE ERROR 🚨:', err);
        return res.status(500).json({ error: 'Failed to create order', sqlMessage: err.message });
      }
      
      const internalOrderId = result.insertId;

      try {
        const options = {
          amount: actualPrice * 100, 
          currency: "INR",
          receipt: `receipt_${internalOrderId}`
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
        console.error("Razorpay API Error:", rzpErr);
        res.status(500).json({ error: "Failed to connect to payment gateway." });
      }
    });
  });
});

// Route B: Cryptographic Signature Verification (Gateway Webhook)
app.post('/api/payment/verify', (req, res) => {
  const { internalOrderId, gatewayOrderId, gatewayPaymentId, gatewaySignature } = req.body;

  if (!gatewayOrderId || !gatewayPaymentId || !gatewaySignature) {
    return res.status(400).json({ success: false, message: 'Invalid payment signature payload.' });
  }

  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(gatewayOrderId + "|" + gatewayPaymentId)
    .digest('hex');

  if (generatedSignature !== gatewaySignature) {
    console.error("🚨 FRAUD ATTEMPT: Signatures do not match!");
    return res.status(400).json({ success: false, message: 'Cryptographic verification failed.' });
  }

  const sql = `UPDATE orders SET payment_status = 'Paid' WHERE id = ?`;
  
  db.query(sql, [internalOrderId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database update failed' });
    
    console.log(`Verified Transaction: Order #${internalOrderId} successfully upgraded to PAID status.`);
    res.json({ success: true, message: 'Payment verified and captured successfully.' });
  });
});

// ==========================================
// Route C: Secure Digital Delivery (Download)
// ==========================================
app.get('/api/download/:orderId', (req, res) => {
  const orderId = req.params.orderId;
  
  const sql = `
    SELECT o.payment_status, b.file_url 
    FROM orders o 
    JOIN books b ON o.book_id = b.id 
    WHERE o.id = ?
  `;
  
  db.query(sql, [orderId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'Order not found' });

    if (results[0].payment_status !== 'Paid') {
      return res.status(403).send('<h1>Access Denied</h1><p>Payment verification pending.</p>');
    }

    const fileUrl = results[0].file_url;

    if (!fileUrl || !fileUrl.startsWith('http')) {
      return res.status(404).send('<h1>File Error</h1><p>Invalid file link in database.</p>');
    }

    // Quietly fetch from Cloudinary and force a download
    https.get(fileUrl, (cloudinaryRes) => {
      res.setHeader('Content-Type', 'application/pdf');
      // 'attachment' forces the browser to download the file
      res.setHeader('Content-Disposition', `attachment; filename="Ebook_${orderId}.pdf"`);
      cloudinaryRes.pipe(res);
    }).on('error', (e) => {
      console.error("Cloudinary Fetch Error:", e);
      res.status(500).send('Error loading the PDF.');
    });
  });
});

// ==========================================
// Route C.2: Secure Digital Stream (Read in Browser)
// ==========================================
app.get('/api/stream/:orderId', (req, res) => {
  const orderId = req.params.orderId;
  
  const sql = `
    SELECT o.payment_status, b.file_url 
    FROM orders o 
    JOIN books b ON o.book_id = b.id 
    WHERE o.id = ?
  `;
  
  db.query(sql, [orderId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'Order not found' });

    if (results[0].payment_status !== 'Paid') {
      return res.status(403).send('<h1>Access Denied</h1><p>Payment verification pending.</p>');
    }

    const fileUrl = results[0].file_url;

    if (!fileUrl || !fileUrl.startsWith('http')) {
      return res.status(404).send('<h1>Book Not Uploaded</h1><p>The PDF for this book has not been attached to the database yet.</p>');
    }

    // Quietly fetch from Cloudinary and stream to the browser viewer
    https.get(fileUrl, (cloudinaryRes) => {
      res.setHeader('Content-Type', 'application/pdf');
      // 'inline' tells the browser to open it in a reading tab
      res.setHeader('Content-Disposition', `inline; filename="Ebook_${orderId}.pdf"`);
      cloudinaryRes.pipe(res);
    }).on('error', (e) => {
      console.error("Cloudinary Fetch Error:", e);
      res.status(500).send('Error loading the PDF.');
    });
  });
});

// ==========================================
// Route F: Secure Admin Multi-File Upload (CLOUDINARY)
// ==========================================
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uppcs_store_files', // Creates a clean folder in your Cloudinary account
    resource_type: 'auto',       // CRITICAL: Allows both PDFs and Images
    public_id: (req, file) => {
      const cleanName = file.originalname.replace(/\s+/g, '_').split('.')[0];
      return Date.now() + '_' + cleanName;
    }
  }
});

const upload = multer({ storage: storage });

const cpUpload = upload.fields([
  { name: 'pdf', maxCount: 1 }, 
  { name: 'coverImage', maxCount: 1 }
]);

app.post('/api/admin/upload', cpUpload, (req, res) => {
  if (!req.files || !req.files['pdf'] || !req.files['coverImage']) {
    return res.status(400).json({ error: 'Both PDF and Cover Image are required.' });
  }

  const { title, category, pages, fileSize, price, physicalPrice } = req.body;
  
  const pdfUrl = req.files['pdf'][0].path; 
  const coverUrl = req.files['coverImage'][0].path; 

  // 👇 NEW: Automatically generate a unique text ID for your database format
  const newBookId = 'book_' + Date.now(); 

  // 👇 NEW: Added 'id' and 'description' to perfectly match your table structure
  const sql = `
    INSERT INTO books 
    (id, title, description, category, pages, file_size_mb, price, physical_price, cover_image, file_url) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const values = [
    newBookId,
    title, 
    "No description provided.", // Fallback text so the database doesn't crash
    category || null, 
    pages || null, 
    fileSize || null, 
    price, 
    physicalPrice || null, 
    coverUrl, 
    pdfUrl
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('🚨 Admin Upload DB Error:', err);
      return res.status(500).json({ error: 'Failed to save to database.' });
    }
    console.log(`✅ Uploaded to Cloudinary & DB: ${title}`);
    res.status(200).json({ success: true, message: 'Upload successful!' });
  });
});

// Route D: Fetch User Library
app.get('/api/library/:contact', (req, res) => {
  const contact = req.params.contact;
  
  const sql = `
    SELECT id AS orderId, book_id AS bookId, created_at 
    FROM orders 
    WHERE (email = ? OR whatsapp_number = ?) 
    AND payment_status = 'Paid'
    ORDER BY created_at DESC
  `;
  
  db.query(sql, [contact, contact], (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch library' });
    res.json({ success: true, library: results });
  });
});

// Route E: Fetch Store Catalog
app.get('/api/books', (req, res) => {
  const sql = `SELECT * FROM books ORDER BY created_at DESC`;
  
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch catalog' });
    
    const formattedBooks = results.map(book => ({
      id: book.id,
      title: book.title,
      description: book.description,
      category: book.category,
      pages: book.pages,
      fileSize: book.file_size_mb ? `${book.file_size_mb} MB (PDF)` : 'Unknown Size',
      price: book.price,
      coverImage: book.cover_image,
      fileUrl: book.file_url,
      physical_price: book.physical_price 
    }));

    res.json({ success: true, books: formattedBooks });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});