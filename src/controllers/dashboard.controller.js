const dashboardService = require('../services/dashboard.service');

/** GET /api/dashboard/stats */
const getStats = async (_req, res) => {
  const stats = await dashboardService.getStats();

  res.json({
    success: true,
    message: 'Dashboard stats retrieved successfully',
    data: stats,
  });
};

/** GET /api/dashboard/revenue */
const getRevenue = async (_req, res) => {
  const chart = await dashboardService.getRevenueChart();

  res.json({
    success: true,
    message: 'Revenue chart data retrieved successfully',
    data: chart,
  });
};

/** GET /api/dashboard/recent-orders */
const getRecentOrders = async (req, res) => {
  const limit = req.query.limit || 10;
  const orders = await dashboardService.getRecentOrders(limit);

  res.json({
    success: true,
    message: 'Recent orders retrieved successfully',
    data: orders,
  });
};

/** GET /api/dashboard/top-products */
const getTopProducts = async (req, res) => {
  const limit = req.query.limit || 5;
  const products = await dashboardService.getTopProducts(limit);

  res.json({
    success: true,
    message: 'Top products retrieved successfully',
    data: products,
  });
};

module.exports = { getStats, getRevenue, getRecentOrders, getTopProducts };
