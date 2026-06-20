const pool = require('../config/db');

/**
 * Order Service — all database operations for orders.
 */

/** Get all orders with user info and item count */
const getAll = async ({ page = 1, limit = 10, status }) => {
  let sql = `
    SELECT o.*, u.name AS customer_name, u.email AS customer_email,
           COUNT(oi.id) AS item_count
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
  `;
  const params = [];

  if (status) {
    sql += ' WHERE o.status = ?';
    params.push(status);
  }

  sql += ' GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));

  const [rows] = await pool.query(sql, params);

  // Total count
  let countSql = 'SELECT COUNT(*) AS total FROM orders';
  const countParams = [];
  if (status) {
    countSql += ' WHERE status = ?';
    countParams.push(status);
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

/** Get single order with items */
const getById = async (id) => {
  const [orders] = await pool.query(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email
     FROM orders o
     LEFT JOIN users u ON o.user_id = u.id
     WHERE o.id = ?`,
    [id]
  );

  if (!orders[0]) return null;

  const [items] = await pool.query(
    `SELECT oi.*, p.name AS product_name
     FROM order_items oi
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`,
    [id]
  );

  return { ...orders[0], items };
};

/** Update order status */
const updateStatus = async (id, status) => {
  const [result] = await pool.query(
    'UPDATE orders SET status = ? WHERE id = ?',
    [status, id]
  );

  if (result.affectedRows === 0) return null;
  return getById(id);
};

/** Create an order (for seeding / future customer use) */
const create = async ({ user_id, items }) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Calculate total
    let total = 0;
    for (const item of items) {
      total += item.price * item.quantity;
    }

    // Insert order
    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)',
      [user_id, total, 'pending']
    );

    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of items) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );
    }

    await connection.commit();
    return getById(orderId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = { getAll, getById, updateStatus, create };
