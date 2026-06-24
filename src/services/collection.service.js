const pool = require('../config/db');

/** Generate a URL-friendly slug from a name */
function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const getAll = async ({ search, page = 1, limit = 50 } = {}) => {
  let sql = `
    SELECT c.*, COUNT(pc.product_id) AS product_count
    FROM collections c
    LEFT JOIN product_collections pc ON pc.collection_id = c.id
  `;
  const params = [];

  if (search) {
    sql += ' WHERE c.name LIKE ? OR c.description LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' GROUP BY c.id ORDER BY c.name ASC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  const [rows] = await pool.query(sql, params);

  let countSql = 'SELECT COUNT(*) AS total FROM collections';
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
    `SELECT c.*, COUNT(pc.product_id) AS product_count
     FROM collections c
     LEFT JOIN product_collections pc ON pc.collection_id = c.id
     WHERE c.id = ?
     GROUP BY c.id`,
    [id]
  );
  return rows[0] || null;
};

/** Find a collection by its slug */
const getBySlug = async (slug) => {
  const [rows] = await pool.query(
    'SELECT id FROM collections WHERE slug = ?',
    [slug]
  );
  return rows[0] || null;
};

const create = async ({ name, description }) => {
  const slug = slugify(name);
  const [result] = await pool.query(
    'INSERT INTO collections (name, slug, description) VALUES (?, ?, ?)',
    [name, slug, description || null]
  );
  return getById(result.insertId);
};

const update = async (id, { name, description }) => {
  const fields = [];
  const params = [];

  if (name !== undefined) {
    fields.push('name = ?');
    params.push(name);
    fields.push('slug = ?');
    params.push(slugify(name));
  }
  if (description !== undefined) {
    fields.push('description = ?');
    params.push(description);
  }

  if (fields.length === 0) return getById(id);

  params.push(id);
  const [result] = await pool.query(
    `UPDATE collections SET ${fields.join(', ')} WHERE id = ?`,
    params
  );

  if (result.affectedRows === 0) return null;
  return getById(id);
};

const remove = async (id) => {
  const collection = await getById(id);
  if (!collection) return null;

  await pool.query('DELETE FROM collections WHERE id = ?', [id]);
  return collection;
};

const exists = async (id) => {
  const [rows] = await pool.query('SELECT id FROM collections WHERE id = ?', [id]);
  return rows.length > 0;
};

module.exports = { getAll, getById, getBySlug, create, update, remove, exists };
