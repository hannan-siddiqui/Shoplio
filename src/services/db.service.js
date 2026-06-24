const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const TABLE_QUERIES = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS collections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS product_categories (
    product_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (product_id, category_id),
    CONSTRAINT fk_pc_product
      FOREIGN KEY (product_id) REFERENCES products(id)
      ON DELETE CASCADE,
    CONSTRAINT fk_pc_category
      FOREIGN KEY (category_id) REFERENCES categories(id)
      ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS product_collections (
    product_id INT NOT NULL,
    collection_id INT NOT NULL,
    PRIMARY KEY (product_id, collection_id),
    CONSTRAINT fk_pcol_product
      FOREIGN KEY (product_id) REFERENCES products(id)
      ON DELETE CASCADE,
    CONSTRAINT fk_pcol_collection
      FOREIGN KEY (collection_id) REFERENCES collections(id)
      ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_order_items_order
      FOREIGN KEY (order_id) REFERENCES orders(id)
      ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product
      FOREIGN KEY (product_id) REFERENCES products(id)
      ON DELETE RESTRICT
  )`,
];

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function tableExists(table) {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return rows.length > 0;
}

/**
 * Migrate the old products.category_id column to the product_categories
 * junction table.  After migration the FK and column are dropped so the
 * schema matches the new CREATE TABLE definition (no category_id column).
 */
async function migrateCategoryIdToJunction() {
  const hasCategoryId = await columnExists('products', 'category_id');
  if (!hasCategoryId) return; // already migrated

  // Ensure the junction table exists before we copy data
  const junctionReady = await tableExists('product_categories');
  if (!junctionReady) return; // will be created on next startup

  // Copy existing non-null category associations into the junction table
  await pool.query(`
    INSERT IGNORE INTO product_categories (product_id, category_id)
    SELECT id, category_id FROM products WHERE category_id IS NOT NULL
  `);

  // Drop the FK constraint (name may differ – try both the original name
  // and a generated fallback)
  try {
    await pool.query('ALTER TABLE products DROP FOREIGN KEY fk_products_category');
  } catch {
    // constraint may have already been removed or named differently
  }

  // Drop the column
  await pool.query('ALTER TABLE products DROP COLUMN category_id');
  console.log('✅ Migrated products.category_id → product_categories junction table');
}

async function seedDefaultAdmin() {
  const [[{ count }]] = await pool.query(
    'SELECT COUNT(*) AS count FROM users WHERE role = ?',
    ['admin']
  );

  if (count > 0) return;

  const name = process.env.ADMIN_NAME || 'Admin';
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  await pool.query(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, hashedPassword, 'admin']
  );

  console.log(`✅ Default admin created (${email})`);
}

async function initializeDatabase() {
  for (const query of TABLE_QUERIES) {
    await pool.query(query);
  }

  await migrateCategoryIdToJunction();
  await seedDefaultAdmin();

  console.log('✅ Database tables ready');
}

module.exports = { initializeDatabase };
