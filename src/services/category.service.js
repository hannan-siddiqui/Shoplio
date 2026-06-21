const pool = require('../config/db');

const getAll = async ({ search, page = 1, limit = 50 } = {}) => {
  let sql = `
    SELECT c.*, COUNT(p.id) AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
  `;
  const params = [];

  if (search) {
    sql += ' WHERE c.name LIKE ? OR c.description LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' GROUP BY c.id ORDER BY c.name ASC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  const [rows] = await pool.query(sql, params);

  let countSql = 'SELECT COUNT(*) AS total FROM categories';
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

const getById = async (id) => {
  const [rows] = await pool.query(
    `SELECT c.*, COUNT(p.id) AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     WHERE c.id = ?
     GROUP BY c.id`,
    [id]
  );
  return rows[0] || null;
};

const create = async ({ name, description }) => {
  const [result] = await pool.query(
    'INSERT INTO categories (name, description) VALUES (?, ?)',
    [name, description || null]
  );
  return getById(result.insertId);
};

const update = async (id, { name, description }) => {
  const fields = [];
  const params = [];

  if (name !== undefined)        { fields.push('name = ?');        params.push(name); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }

  if (fields.length === 0) return getById(id);

  params.push(id);
  const [result] = await pool.query(
    `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
    params
  );

  if (result.affectedRows === 0) return null;
  return getById(id);
};

const remove = async (id) => {
  const category = await getById(id);
  if (!category) return null;

  await pool.query('DELETE FROM categories WHERE id = ?', [id]);
  return category;
};

const exists = async (id) => {
  const [rows] = await pool.query('SELECT id FROM categories WHERE id = ?', [id]);
  return rows.length > 0;
};

module.exports = { getAll, getById, create, update, remove, exists };
