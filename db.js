// db.js - MySQL database connection pool and schema setup using mysql2/promise
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// MySQL Connection Configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kontributrack',
  connectTimeout: 5000 // 5-second timeout
};

let pool = null;

async function initDb() {
  console.log(`[DB] Connecting to MySQL server at ${DB_CONFIG.host}:${DB_CONFIG.port} (User: "${DB_CONFIG.user}", Database: "${DB_CONFIG.database}")...`);

  try {
    // 1. Connect without database first to verify MySQL server is alive & create DB if missing
    const rootConnection = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      connectTimeout: DB_CONFIG.connectTimeout
    });

    // 2. Create Database if missing
    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\`;`);
    console.log(`[DB] Database "${DB_CONFIG.database}" verified/created successfully.`);
    await rootConnection.end();

    // 3. Initialize connection pool for kontributrack database
    pool = mysql.createPool({
      ...DB_CONFIG,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // 4. Create Officers Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS officers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB;
    `);

    // 5. Create Members Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_number VARCHAR(50),
        monthly_due DECIMAL(10,2) NOT NULL,
        pin VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB;
    `);

    // 6. Create Payments Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        date_paid VARCHAR(50) NOT NULL,
        logged_by VARCHAR(255) NOT NULL,
        timestamp VARCHAR(255) NOT NULL,
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 7. Seed default officer if officers table is empty
    const [officerRows] = await pool.query('SELECT id FROM officers LIMIT 1');
    if (officerRows.length === 0) {
      // CHANGE BEFORE FINAL DEMO — default MVP credentials only
      const defaultPasswordHash = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO officers (username, password, name) VALUES (?, ?, ?)',
        ['admin', defaultPasswordHash, 'Treasurer Admin']
      );
      console.log('[DB SEED] Created default officer account: username="admin", password="admin123", name="Treasurer Admin" (CHANGE BEFORE FINAL DEMO — default MVP credentials only)');
    }

    console.log('[DB] MySQL database tables and schema verified successfully.');
  } catch (err) {
    console.error(`\n❌ [DB CONNECT ERROR] Failed to connect to MySQL server at ${DB_CONFIG.host}:${DB_CONFIG.port}!`);
    console.error(`   Error Message: ${err.message}`);
    throw err;
  }
}

// Database query helpers
const db = {
  DB_CONFIG,
  initDb,
  async all(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  },
  async get(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  },
  async run(sql, params = []) {
    const [result] = await pool.execute(sql, params);
    return { lastInsertRowid: result.insertId, affectedRows: result.affectedRows };
  }
};

module.exports = db;
