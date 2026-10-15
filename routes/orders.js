const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/orders - list all orders (with customer info)
router.get('/', async (req, res) => {
  try {
    const { status, limit } = req.query;
    let query = `
      SELECT o.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
             (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
             p.reference AS payment_reference, p.method AS payment_method
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND o.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY o.id DESC`;

    if (limit && !isNaN(limit)) {
      query += ` LIMIT ?`;
      params.push(parseInt(limit));
    }

    const [orders] = await db.query(query, params);
    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve orders.' });
  }
});

// GET /api/orders/:id - single order details with items
router.get('/:id', async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT o.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, c.address AS customer_address,
              p.reference AS payment_reference, p.method AS payment_method, p.status AS payment_status
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       LEFT JOIN payments p ON o.id = p.order_id
       WHERE o.id = ?`,
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const [items] = await db.query(
      `SELECT oi.*, p.name AS product_name, p.unit 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...orders[0],
        items
      }
    });
  } catch (err) {
    console.error('Error fetching order details:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve order details.' });
  }
});

// POST /api/orders - Create new order (Cart checkout workflow with transaction & stock update)
router.post('/', async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { customer, items } = req.body;

    // Validation
    if (!customer || !customer.name || !customer.email) {
      return res.status(400).json({ success: false, message: 'Customer name and email are required.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart cannot be empty.' });
    }

    // Start SQL transaction for data integrity
    await connection.beginTransaction();

    // 1. Resolve or create customer
    let customerId;
    const [custRows] = await connection.query(
      'SELECT id FROM customers WHERE email = ?',
      [customer.email.trim()]
    );

    if (custRows.length > 0) {
      customerId = custRows[0].id;
      // Update phone/address if supplied
      await connection.query(
        'UPDATE customers SET name = ?, phone = ?, address = ? WHERE id = ?',
        [customer.name.trim(), customer.phone || '', customer.address || '', customerId]
      );
    } else {
      const [newCust] = await connection.query(
        'INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)',
        [customer.name.trim(), customer.email.trim(), customer.phone || '', customer.address || '']
      );
      customerId = newCust.insertId;
    }

    // 2. Validate product stock and calculate verified total
    let total = 0;
    const verifiedItems = [];

    for (const item of items) {
      const [prodRows] = await connection.query(
        'SELECT id, name, price, stock FROM products WHERE id = ? FOR UPDATE',
        [item.productId]
      );

      if (prodRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Product ID ${item.productId} was not found.`
        });
      }

      const product = prodRows[0];
      const qty = parseInt(item.qty);

      if (qty <= 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for ${product.name}.`
        });
      }

      if (product.stock < qty) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${qty}`
        });
      }

      const itemTotal = Number(product.price) * qty;
      total += itemTotal;

      verifiedItems.push({
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        qty: qty
      });
    }

    // 3. Insert into orders table
    const [orderResult] = await connection.query(
      'INSERT INTO orders (customer_id, total, status) VALUES (?, ?, ?)',
      [customerId, total.toFixed(2), 'Pending']
    );
    const orderId = orderResult.insertId;

    // 4. Insert order items & deduct stock
    for (const item of verifiedItems) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, qty, price) VALUES (?, ?, ?, ?)',
        [orderId, item.productId, item.qty, item.price]
      );

      // Deduct stock (Practical 02 Stock Management)
      await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.qty, item.productId]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      data: {
        orderId,
        total: total.toFixed(2),
        customerId,
        status: 'Pending'
      }
    });
  } catch (err) {
    await connection.rollback();
    console.error('Order creation error:', err);
    res.status(500).json({ success: false, message: 'Failed to process order.' });
  } finally {
    connection.release();
  }
});

// PUT /api/orders/:id/status - Update order status (Admin protected)
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Pending', 'Paid', 'Completed', 'Cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const [result] = await db.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.json({ success: true, message: `Order status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
});

module.exports = router;
