const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/reports/dashboard - summary metrics for admin dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    // 1. Total revenue
    const [revRows] = await db.query(
      "SELECT COALESCE(SUM(total), 0) AS total_revenue FROM orders WHERE status = 'Paid'"
    );

    // 2. Total orders count
    const [orderCountRows] = await db.query(
      "SELECT COUNT(*) AS total_orders, " +
      "SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) AS paid_orders, " +
      "SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_orders " +
      "FROM orders"
    );

    // 3. Total products and low stock count
    const [prodRows] = await db.query(
      "SELECT COUNT(*) AS total_products, " +
      "SUM(CASE WHEN stock <= 10 THEN 1 ELSE 0 END) AS low_stock_count " +
      "FROM products"
    );

    // 4. Total customers count
    const [custRows] = await db.query('SELECT COUNT(*) AS total_customers FROM customers');

    // 5. Category-wise sales
    const [categorySales] = await db.query(`
      SELECT c.name AS category_name, 
             COALESCE(SUM(oi.qty), 0) AS total_qty_sold, 
             COALESCE(SUM(oi.qty * oi.price), 0) AS total_sales
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'Paid'
      GROUP BY c.id
      ORDER BY total_sales DESC
    `);

    // 6. Top 5 Selling Products
    const [topProducts] = await db.query(`
      SELECT p.id, p.name, p.price, p.stock, p.unit,
             COALESCE(SUM(oi.qty), 0) AS total_sold,
             COALESCE(SUM(oi.qty * oi.price), 0) AS total_revenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'Paid'
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 5
    `);

    // 7. Low Stock Alert List
    const [lowStockProducts] = await db.query(
      `SELECT p.id, p.name, p.stock, p.price, p.unit, c.name AS category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.stock <= 10 
       ORDER BY p.stock ASC`
    );

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: Number(revRows[0].total_revenue).toFixed(2),
          totalOrders: orderCountRows[0].total_orders,
          paidOrders: orderCountRows[0].paid_orders || 0,
          pendingOrders: orderCountRows[0].pending_orders || 0,
          totalProducts: prodRows[0].total_products,
          lowStockCount: prodRows[0].low_stock_count || 0,
          totalCustomers: custRows[0].total_customers
        },
        categorySales,
        topProducts,
        lowStockProducts
      }
    });
  } catch (err) {
    console.error('Reports dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate dashboard reports.' });
  }
});

module.exports = router;
