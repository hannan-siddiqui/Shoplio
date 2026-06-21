const authService = require('../services/auth.service');

/** GET /api/users */
const getAll = async (req, res) => {
  const { page, limit } = req.query;
  const result = await authService.getAllUsers({ page, limit });

  res.json({
    success: true,
    message: 'Users retrieved successfully',
    ...result,
  });
};

module.exports = { getAll };
