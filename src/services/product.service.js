const pool = require('../config/db');

const PRODUCT_SELECT = `
  SELECT p.*,
         c.id AS category_id,
         c.name AS category_name,
         c.description AS category_description
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
`;

/** Get all products (with optional search, category filter & pagination) */
const getAll = async ({ search, category_id, page = 1, limit = 10 }) => {
  let sql = `${PRODUCT_SELECT} WHERE 1=1`;
  const params = [];

  if (search) {
    sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category_id) {
    sql += ' AND p.category_id = ?';
    params.push(Number(category_id));
  }

  sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  const [rows] = await pool.query(sql, params);

  let countSql = 'SELECT COUNT(*) AS total FROM products p WHERE 1=1';
  const countParams = [];

  if (search) {
    countSql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`);
  }

  if (category_id) {
    countSql += ' AND p.category_id = ?';
    countParams.push(Number(category_id));
  }

  const [[{ total }]] = await pool.query(countSql, countParams);

  return {
    data: rows.map(formatProduct),
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
  const [rows] = await pool.query(`${PRODUCT_SELECT} WHERE p.id = ?`, [id]);
  return rows[0] ? formatProduct(rows[0]) : null;
};

/** Create a new product */
const create = async ({ name, description, price, stock, category_id }) => {
  const [result] = await pool.query(
    'INSERT INTO products (name, description, price, stock, category_id) VALUES (?, ?, ?, ?, ?)',
    [name, description || null, price, stock || 0, category_id]
  );
  return getById(result.insertId);
};

/** Update a product by ID */
const update = async (id, { name, description, price, stock, category_id }) => {
  const fields = [];
  const params = [];

  if (name !== undefined)        { fields.push('name = ?');        params.push(name); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }
  if (price !== undefined)       { fields.push('price = ?');       params.push(price); }
  if (stock !== undefined)       { fields.push('stock = ?');       params.push(stock); }
  if (category_id !== undefined) { fields.push('category_id = ?'); params.push(category_id); }

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

function formatProduct(row) {
  const {
    category_name,
    category_description,
    ...product
  } = row;

  return {
    ...product,
    category: product.category_id
      ? {
          id: product.category_id,
          name: category_name,
          description: category_description,
        }
      : null,
  };
}

module.exports = { getAll, getById, create, update, remove };
