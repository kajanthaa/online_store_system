const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// Configure Multer storage for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + (ext || '.jpg'));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'), false);
    }
  }
});

// GET /api/products - list products with search, filter, and low-stock support
router.get('/', async (req, res) => {
  try {
    const { search, category, lowStock, minPrice, maxPrice, sort } = req.query;

    let query = `
      SELECT p.*, c.name AS category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE 1=1
    `;
    const params = [];

    // Search filter
    if (search && search.trim()) {
      query += ` AND (p.name LIKE ? OR c.name LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    // Category filter
    if (category && category !== 'all') {
      query += ` AND p.category_id = ?`;
      params.push(category);
    }

    // Low stock filter (Practical 02 requirement: Stock alerts < 10)
    if (lowStock === 'true' || lowStock === '1') {
      query += ` AND p.stock <= 10`;
    }

    // Price range filters
    if (minPrice && !isNaN(minPrice)) {
      query += ` AND p.price >= ?`;
      params.push(Number(minPrice));
    }
    if (maxPrice && !isNaN(maxPrice)) {
      query += ` AND p.price <= ?`;
      params.push(Number(maxPrice));
    }

    // Sorting
    if (sort === 'price_asc') {
      query += ` ORDER BY p.price ASC`;
    } else if (sort === 'price_desc') {
      query += ` ORDER BY p.price DESC`;
    } else if (sort === 'stock_asc') {
      query += ` ORDER BY p.stock ASC`;
    } else {
      query += ` ORDER BY p.id DESC`;
    }

    const [products] = await db.query(query, params);

    // Compute stock status flags for UI
    const enhanced = products.map(p => ({
      ...p,
      isLowStock: p.stock > 0 && p.stock <= 10,
      isOutOfStock: p.stock <= 0
    }));

    res.json({ success: true, count: enhanced.length, data: enhanced });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve products.' });
  }
});

// GET /api/products/low-stock-count - quick summary for dashboard badges
router.get('/low-stock-count', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT COUNT(*) AS count FROM products WHERE stock <= 10');
    res.json({ success: true, count: rows[0].count });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to count low stock products.' });
  }
});

// GET /api/products/:id - single product
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, c.name AS category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving product.' });
  }
});

// POST /api/products - Create product with picture upload (Protected admin route)
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, category_id, price, stock, unit, image_url } = req.body;

    // Server-side validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Product name is required.' });
    }
    if (price === undefined || isNaN(price) || Number(price) < 0) {
      return res.status(400).json({ success: false, message: 'A valid non-negative price is required.' });
    }
    if (stock === undefined || isNaN(stock) || Number(stock) < 0) {
      return res.status(400).json({ success: false, message: 'A valid non-negative stock count is required.' });
    }

    // Determine picture URL (uploaded file takes precedence over direct text URL)
    let finalImageUrl = '';
    if (req.file) {
      finalImageUrl = `/uploads/${req.file.filename}`;
    } else if (image_url && image_url.trim()) {
      finalImageUrl = image_url.trim();
    }

    const [result] = await db.query(
      `INSERT INTO products (name, category_id, price, stock, unit, image_url) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        category_id ? parseInt(category_id) : null,
        parseFloat(price),
        parseInt(stock),
        unit ? unit.trim() : 'kg',
        finalImageUrl
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Product created successfully with image.',
      data: { id: result.insertId, image_url: finalImageUrl }
    });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
});

// PUT /api/products/:id - Update product with picture upload (Protected admin route)
router.put('/:id', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, category_id, price, stock, unit, image_url } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Product name is required.' });
    }
    if (price === undefined || isNaN(price) || Number(price) < 0) {
      return res.status(400).json({ success: false, message: 'Valid non-negative price is required.' });
    }
    if (stock === undefined || isNaN(stock) || Number(stock) < 0) {
      return res.status(400).json({ success: false, message: 'Valid non-negative stock count is required.' });
    }

    // Get current product to preserve image if not updated
    const [existing] = await db.query('SELECT image_url FROM products WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    let finalImageUrl = existing[0].image_url || '';
    if (req.file) {
      finalImageUrl = `/uploads/${req.file.filename}`;
    } else if (image_url !== undefined && image_url.trim()) {
      finalImageUrl = image_url.trim();
    }

    const [result] = await db.query(
      `UPDATE products 
       SET name = ?, category_id = ?, price = ?, stock = ?, unit = ?, image_url = ? 
       WHERE id = ?`,
      [
        name.trim(),
        category_id ? parseInt(category_id) : null,
        parseFloat(price),
        parseInt(stock),
        unit ? unit.trim() : 'kg',
        finalImageUrl,
        req.params.id
      ]
    );

    res.json({
      success: true,
      message: 'Product updated successfully.',
      image_url: finalImageUrl
    });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
});

// DELETE /api/products/:id - Delete product (Protected admin route)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
});

module.exports = router;
