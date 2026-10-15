const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool for MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'grocery',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✓ Successfully connected to MySQL database:', process.env.DB_NAME || 'grocery');
    connection.release();
  } catch (err) {
    console.error('✗ MySQL Connection Error:', err.message);
  }
})();

module.exports = pool;
