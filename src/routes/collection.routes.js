const router = require('express').Router();
const collectionController = require('../controllers/collection.controller');
const { authenticate, authorize } = require('../middleware/auth');

// CRUD routes for collections
router.get('/',       collectionController.getAll);    // GET    /api/collections
router.get('/:id',    collectionController.getById);   // GET    /api/collections/:id
router.post('/',      authenticate, authorize('admin'), collectionController.create);    // POST   /api/collections
router.put('/:id',    authenticate, authorize('admin'), collectionController.update);    // PUT    /api/collections/:id
router.delete('/:id', authenticate, authorize('admin'), collectionController.remove);    // DELETE /api/collections/:id

module.exports = router;
