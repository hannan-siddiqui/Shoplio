const pool = require('../config/db');

/**
 * Dashboard Service — analytics queries for the admin dashboard.
 */

/** Get KPI stats: total revenue, orders, products, users */
const getStats = async () => {
  const [[{ totalRevenue }]] = await pool.query(
    'SELECT COALESCE(SUM(total), 0) AS totalRevenue FROM orders WHERE status != "cancelled"'
  );

  const [[{ totalOrders }]] = await pool.query(
    'SELECT COUNT(*) AS totalOrders FROM orders'
  );

  const [[{ totalProducts }]] = await pool.query(
    'SELECT COUNT(*) AS totalProducts FROM products'
  );

  const [[{ totalUsers }]] = await pool.query(
    'SELECT COUNT(*) AS totalUsers FROM users WHERE role = "customer"'
  );

  const [[{ pendingOrders }]] = await pool.query(
    'SELECT COUNT(*) AS pendingOrders FROM orders WHERE status = "pending"'
  );

  const [[{ inventoryValue }]] = await pool.query(
    'SELECT COALESCE(SUM(price * stock), 0) AS inventoryValue FROM products'
  );

  const [[{ lowStockCount }]] = await pool.query(
    'SELECT COUNT(*) AS lowStockCount FROM products WHERE stock <= 5'
  );

  return {
    totalRevenue: Number(totalRevenue),
    totalOrders,
    totalProducts,
    totalUsers,
    pendingOrders,
    inventoryValue: Number(inventoryValue),
    lowStockCount,
  };
};

/** Get monthly revenue for the last 12 months */
const getRevenueChart = async () => {
  const [rows] = await pool.query(`
    SELECT
      DATE_FORMAT(created_at, '%Y-%m') AS month,
      COALESCE(SUM(total), 0) AS revenue,
      COUNT(*) AS orders
    FROM orders
    WHERE status != 'cancelled'
      AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY month ASC
  `);

  // Fill in missing months with zero
  const result = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const found = rows.find(r => r.month === monthKey);
    result.push({
      month: monthNames[d.getMonth()],
      revenue: found ? Number(found.revenue) : 0,
      orders: found ? found.orders : 0,
    });
  }

  return result;
};

/** Get last N recent orders */
const getRecentOrders = async (limit = 10) => {
  const [rows] = await pool.query(`
    SELECT o.id, o.total, o.status, o.created_at,
           u.name AS customer_name, u.email AS customer_email
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
    LIMIT ?
  `, [Number(limit)]);

  return rows;
};

/** Get top products by order count */
const getTopProducts = async (limit = 5) => {
  const [rows] = await pool.query(`
    SELECT p.id, p.name, p.price,
           COALESCE(SUM(oi.quantity), 0) AS total_sold,
           COALESCE(SUM(oi.quantity * oi.price), 0) AS total_revenue
    FROM products p
    LEFT JOIN order_items oi ON p.id = oi.product_id
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT ?
  `, [Number(limit)]);

  return rows.map(r => ({
    ...r,
    total_revenue: Number(r.total_revenue),
  }));
};

module.exports = { getStats, getRevenueChart, getRecentOrders, getTopProducts };
