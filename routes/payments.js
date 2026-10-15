const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/payments/process - Mock / Sandbox payment workflow
router.post('/process', async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { orderId, method, cardHolder, cardNumber, expiry, cvv, upiId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    // 1. Verify order exists and is pending
    const [orders] = await connection.query(
      `SELECT o.*, c.name AS customer_name, c.email AS customer_email 
       FROM orders o 
       JOIN customers c ON o.customer_id = c.id 
       WHERE o.id = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = orders[0];
    if (order.status === 'Paid') {
      return res.status(400).json({ success: false, message: 'Order is already marked as paid.' });
    }

    // 2. Validate mock payment details based on method
    const paymentMethod = method || 'Credit Card';

    if (paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card') {
      if (!cardNumber || cardNumber.replace(/\s+/g, '').length < 12) {
        return res.status(400).json({ success: false, message: 'Please provide a valid 16-digit card number (sandbox test card).' });
      }
      if (!cvv || cvv.length < 3) {
        return res.status(400).json({ success: false, message: 'Please provide a valid 3-digit CVV.' });
      }
    } else if (paymentMethod === 'UPI / QR') {
      if (!upiId || !upiId.includes('@')) {
        return res.status(400).json({ success: false, message: 'Please provide a valid UPI ID (e.g. user@bank).' });
      }
    }

    // 3. Generate Mock Transaction Reference
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = `TXN-GRC-${Date.now().toString().slice(-6)}-${randomHex}`;

    await connection.beginTransaction();

    // 4. Record payment in database
    const [payResult] = await connection.query(
      `INSERT INTO payments (order_id, amount, reference, status, method) 
       VALUES (?, ?, ?, 'Success', ?)`,
      [order.id, order.total, reference, paymentMethod]
    );

    // 5. Update order status to 'Paid'
    await connection.query(
      "UPDATE orders SET status = 'Paid' WHERE id = ?",
      [order.id]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: 'Payment processed successfully (Sandbox Simulator)',
      receipt: {
        paymentId: payResult.insertId,
        orderId: order.id,
        amount: order.total,
        reference: reference,
        method: paymentMethod,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    await connection.rollback();
    console.error('Payment processing error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process mock payment.' });
  } finally {
    connection.release();
  }
});

// GET /api/payments/order/:orderId - retrieve receipt details
router.get('/order/:orderId', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, o.total, o.created_at AS order_date, c.name AS customer_name, c.email AS customer_email 
       FROM payments p 
       JOIN orders o ON p.order_id = o.id 
       JOIN customers c ON o.customer_id = c.id 
       WHERE p.order_id = ?`,
      [req.params.orderId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment record not found for this order.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving payment receipt.' });
  }
});

module.exports = router;
