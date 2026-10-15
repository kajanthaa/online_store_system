const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/customers - list all customers
router.get('/', async (req, res) => {
  try {
    const [customers] = await db.query(
      `SELECT c.*, COUNT(o.id) as order_count 
       FROM customers c 
       LEFT JOIN orders o ON c.id = o.customer_id 
       GROUP BY c.id 
       ORDER BY c.id DESC`
    );
    res.json({ success: true, data: customers });
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch customers.' });
  }
});

// POST /api/customers - Create or update customer
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Customer name is required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }

    // Check if customer exists by email
    const [existing] = await db.query('SELECT * FROM customers WHERE email = ?', [email.trim()]);
    if (existing.length > 0) {
      // Update existing customer info
      await db.query(
        'UPDATE customers SET name = ?, phone = ?, address = ? WHERE email = ?',
        [name.trim(), phone || '', address || '', email.trim()]
      );
      return res.json({
        success: true,
        message: 'Customer information updated.',
        data: { id: existing[0].id, name: name.trim(), email: email.trim() }
      });
    }

    const [result] = await db.query(
      'INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim(), phone || '', address || '']
    );

    res.status(201).json({
      success: true,
      message: 'Customer created successfully.',
      data: { id: result.insertId, name: name.trim(), email: email.trim() }
    });
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ success: false, message: 'Failed to save customer.' });
  }
});

// DELETE /api/customers/:id - Admin only
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }
    res.json({ success: true, message: 'Customer deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete customer.' });
  }
});

module.exports = router;
