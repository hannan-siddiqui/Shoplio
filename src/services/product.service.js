const pool = require('../config/db');

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Fetch categories for a single product */
const getCategoriesForProduct = async (productId) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.description
     FROM categories c
     INNER JOIN product_categories pc ON pc.category_id = c.id
     WHERE pc.product_id = ?
     ORDER BY c.name`,
    [productId]
  );
  return rows;
};

/** Fetch collections for a single product */
const getCollectionsForProduct = async (productId) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.slug, c.description
     FROM collections c
     INNER JOIN product_collections pc ON pc.collection_id = c.id
     WHERE pc.product_id = ?
     ORDER BY c.name`,
    [productId]
  );
  return rows;
};

/** Fetch categories & collections for multiple products in bulk (N+1 avoidance) */
const populateProducts = async (products) => {
  if (products.length === 0) return products;

  const ids = products.map((p) => p.id);

  // Bulk-fetch categories
  const [catRows] = await pool.query(
    `SELECT pc.product_id, c.id, c.name, c.description
     FROM product_categories pc
     INNER JOIN categories c ON c.id = pc.category_id
     WHERE pc.product_id IN (?)
     ORDER BY c.name`,
    [ids]
  );

  // Bulk-fetch collections
  const [colRows] = await pool.query(
    `SELECT pc.product_id, c.id, c.name, c.slug, c.description
     FROM product_collections pc
     INNER JOIN collections c ON c.id = pc.collection_id
     WHERE pc.product_id IN (?)
     ORDER BY c.name`,
    [ids]
  );

  // Build lookup maps
  const catMap = {};
  for (const row of catRows) {
    if (!catMap[row.product_id]) catMap[row.product_id] = [];
    catMap[row.product_id].push({ id: row.id, name: row.name, description: row.description });
  }

  const colMap = {};
  for (const row of colRows) {
    if (!colMap[row.product_id]) colMap[row.product_id] = [];
    colMap[row.product_id].push({ id: row.id, name: row.name, slug: row.slug, description: row.description });
  }

  return products.map((p) => ({
    ...p,
    categories: catMap[p.id] || [],
    collections: colMap[p.id] || [],
  }));
};

/** Sync junction table rows (delete-then-reinsert inside the provided connection) */
const syncJunction = async (conn, table, productId, fkColumn, ids) => {
  await conn.query(`DELETE FROM ${table} WHERE product_id = ?`, [productId]);
  if (ids && ids.length > 0) {
    const values = ids.map((id) => [productId, id]);
    await conn.query(`INSERT INTO ${table} (product_id, ${fkColumn}) VALUES ?`, [values]);
  }
};

// ─── CRUD ───────────────────────────────────────────────────────────────────

/** Get all products (with optional search, category/collection filter & pagination) */
const getAll = async ({ search, category_id, collection_id, page = 1, limit = 10 }) => {
  let sql = 'SELECT p.* FROM products p WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category_id) {
    sql += ` AND EXISTS (
      SELECT 1 FROM product_categories pc
      WHERE pc.product_id = p.id AND pc.category_id = ?
    )`;
    params.push(Number(category_id));
  }

  if (collection_id) {
    sql += ` AND EXISTS (
      SELECT 1 FROM product_collections pcol
      WHERE pcol.product_id = p.id AND pcol.collection_id = ?
    )`;
    params.push(Number(collection_id));
  }

  // Count query (mirrors the same filters)
  let countSql = sql.replace('SELECT p.*', 'SELECT COUNT(*) AS total');
  const countParams = [...params];

  sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  const [rows] = await pool.query(sql, params);
  const [[{ total }]] = await pool.query(countSql, countParams);

  const populated = await populateProducts(rows);

  return {
    data: populated,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/** Get a single product by ID (with populated categories & collections) */
const getById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  if (!rows[0]) return null;

  const product = rows[0];
  product.categories = await getCategoriesForProduct(product.id);
  product.collections = await getCollectionsForProduct(product.id);
  return product;
};

/** Create a new product (with category & collection associations) */
const create = async ({ name, description, price, stock, categoryIds = [], collectionIds = [] }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO products (name, description, price, stock) VALUES (?, ?, ?, ?)',
      [name, description || null, price, stock || 0]
    );
    const productId = result.insertId;

    await syncJunction(conn, 'product_categories', productId, 'category_id', categoryIds);
    await syncJunction(conn, 'product_collections', productId, 'collection_id', collectionIds);

    await conn.commit();
    return getById(productId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/** Update a product by ID (with category & collection associations) */
const update = async (id, { name, description, price, stock, categoryIds, collectionIds }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Build dynamic SET clause for the product itself
    const fields = [];
    const params = [];

    if (name !== undefined)        { fields.push('name = ?');        params.push(name); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (price !== undefined)       { fields.push('price = ?');       params.push(price); }
    if (stock !== undefined)       { fields.push('stock = ?');       params.push(stock); }

    if (fields.length > 0) {
      params.push(id);
      const [result] = await conn.query(
        `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
        params
      );
      if (result.affectedRows === 0) {
        await conn.rollback();
        return null;
      }
    } else {
      // Verify product exists even if no scalar fields changed
      const [rows] = await conn.query('SELECT id FROM products WHERE id = ?', [id]);
      if (rows.length === 0) {
        await conn.rollback();
        return null;
      }
    }

    // Sync junction tables only if arrays were explicitly provided
    if (categoryIds !== undefined) {
      await syncJunction(conn, 'product_categories', id, 'category_id', categoryIds);
    }
    if (collectionIds !== undefined) {
      await syncJunction(conn, 'product_collections', id, 'collection_id', collectionIds);
    }

    await conn.commit();
    return getById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/** Delete a product by ID */
const remove = async (id) => {
  const product = await getById(id);
  if (!product) return null;

  await pool.query('DELETE FROM products WHERE id = ?', [id]);
  return product;
};

module.exports = { getAll, getById, create, update, remove };
