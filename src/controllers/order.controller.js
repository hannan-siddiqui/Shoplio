const orderService = require('../services/order.service');

/**
 * Order Controller — handles HTTP request/response for orders.
 */

/** GET /api/orders */
const getAll = async (req, res) => {
  const { page, limit, status } = req.query;
  const result = await orderService.getAll({ page, limit, status });

  res.json({
    success: true,
    message: 'Orders retrieved successfully',
    ...result,
  });
};

/** GET /api/orders/:id */
const getById = async (req, res) => {
  const order = await orderService.getById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: `Order with id ${req.params.id} not found`,
    });
  }

  res.json({
    success: true,
    message: 'Order retrieved successfully',
    data: order,
  });
};

/** PUT /api/orders/:id/status */
const updateStatus = async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Status must be one of: ${validStatuses.join(', ')}`,
    });
  }

  const order = await orderService.updateStatus(req.params.id, status);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: `Order with id ${req.params.id} not found`,
    });
  }

  res.json({
    success: true,
    message: 'Order status updated successfully',
    data: order,
  });
};

module.exports = { getAll, getById, updateStatus };
