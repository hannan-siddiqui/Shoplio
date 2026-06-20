const router = require('express').Router();
const orderController = require('../controllers/order.controller');
const { authenticate, authorize } = require('../middleware/auth');

// All order routes require admin auth
router.use(authenticate, authorize('admin'));

router.get('/',            orderController.getAll);         // GET    /api/orders
router.get('/:id',         orderController.getById);        // GET    /api/orders/:id
router.put('/:id/status',  orderController.updateStatus);   // PUT    /api/orders/:id/status

module.exports = router;
