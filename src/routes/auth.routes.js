const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);   // POST /api/auth/register
router.post('/login',    authController.login);       // POST /api/auth/login

// Protected routes
router.get('/me', authenticate, authController.getMe); // GET  /api/auth/me

module.exports = router;
