const pool = require('../middleware/db');

/**
 * Product Service — all database operations for the products table.
 */

/** Get all products (with optional search & pagination) */
const getAll = async ({ search, page = 1, limit = 10 }) => {
  let sql = 'SELECT * FROM products';
  const params = [];

  if (search) {
    sql += ' WHERE name LIKE ? OR description LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  const [rows] = await pool.query(sql, params);

  // Get total count for pagination
  let countSql = 'SELECT COUNT(*) AS total FROM products';
  const countParams = [];
  if (search) {
    countSql += ' WHERE name LIKE ? OR description LIKE ?';
    countParams.push(`%${search}%`, `%${search}%`);
  }
  const [[{ total }]] = await pool.query(countSql, countParams);

  return {
    data: rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/** Get a single product by ID */
const getById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  return rows[0] || null;
};

/** Create a new product */
const create = async ({ name, description, price, stock }) => {
  const [result] = await pool.query(
    'INSERT INTO products (name, description, price, stock) VALUES (?, ?, ?, ?)',
    [name, description || null, price, stock || 0]
  );
  return getById(result.insertId);
};

/** Update a product by ID */
const update = async (id, { name, description, price, stock }) => {
  const fields = [];
  const params = [];

  if (name !== undefined)        { fields.push('name = ?');        params.push(name); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }
  if (price !== undefined)       { fields.push('price = ?');       params.push(price); }
  if (stock !== undefined)       { fields.push('stock = ?');       params.push(stock); }

  if (fields.length === 0) return getById(id);

  params.push(id);
  const [result] = await pool.query(
    `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
    params
  );

  if (result.affectedRows === 0) return null;
  return getById(id);
};

/** Delete a product by ID */
const remove = async (id) => {
  const product = await getById(id);
  if (!product) return null;

  await pool.query('DELETE FROM products WHERE id = ?', [id]);
  return product;
};

module.exports = { getAll, getById, create, update, remove };
