require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const path = require('path');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const fs = require('fs'); 

const app = express();

app.use(cors());
app.use(express.json());

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
  // Pool-specific settings:
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

// Create the pool instead of a single connection
const db = mysql.createPool(dbConfig);

// Test the pool on startup
db.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to the database successfully using a Connection Pool!');
  connection.release(); // Hand the connection back to the pool so it can be used by the routes
});

// ==========================================
// API ROUTES
// ==========================================

// Route A: Initiate Checkout & Generate Payment Intent
app.post('/api/orders', (req, res) => {
  const { name, whatsapp, email, bookId } = req.body;
  
  // Securely fetch the actual price from the database first
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
          amount: actualPrice * 100, // Dynamically converts DB price to paise
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

// Route C: Secure Digital Delivery (Download)
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

    const filePath = path.join(__dirname, 'protected_files', results[0].file_url);
    res.download(filePath); 
  });
});

// Route C.2: Secure Digital Stream (Read in Browser)
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

    if (!fileUrl || fileUrl.trim() === '') {
      return res.status(404).send('<h1>Book Not Uploaded</h1><p>The PDF for this book has not been attached to the database yet.</p>');
    }

    const filePath = path.join(__dirname, 'protected_files', fileUrl);

    if (!fs.existsSync(filePath)) {
      console.error(`🚨 Missing File: ${filePath}`);
      return res.status(404).send('<h1>File Missing</h1><p>The PDF file cannot be found on the server. Please contact support.</p>');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Ebook_${orderId}.pdf"`);

    res.sendFile(filePath); 
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
      fileSize: `${book.file_size_mb} MB (PDF)`,
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