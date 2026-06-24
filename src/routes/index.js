const router = require('express').Router();

// Mount feature routers
router.use('/auth', require('./auth.routes'));
router.use('/categories', require('./category.routes'));
router.use('/collections', require('./collection.routes'));
router.use('/products', require('./product.routes'));
router.use('/orders', require('./order.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/users', require('./user.routes'));

// Health-check for /api
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
