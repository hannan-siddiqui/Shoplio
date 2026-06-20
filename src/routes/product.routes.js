const router = require('express').Router();
const productController = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middleware/auth');

// CRUD routes for products
router.get('/',       productController.getAll);    // GET    /api/products
router.get('/:id',    productController.getById);   // GET    /api/products/:id
router.post('/',      authenticate, authorize('admin'), productController.create);    // POST   /api/products
router.put('/:id',    authenticate, authorize('admin'), productController.update);    // PUT    /api/products/:id
router.delete('/:id', authenticate, authorize('admin'), productController.remove);    // DELETE /api/products/:id

module.exports = router;
