const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session handling for Authentication (Practical 02)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'grocery_secret_key_98765',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true if HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
  })
);

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));

// HTML Page shortcuts
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🛒 Online Grocery Store Server running on port ${PORT}`);
  console.log(`🌐 Storefront: http://localhost:${PORT}`);
  console.log(`🔐 Admin Login: http://localhost:${PORT}/login`);
  console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
  console.log(`=======================================================`);
});
