const jwt = require('jsonwebtoken');
const authService = require('../services/auth.service');
const { isValidEmail } = require('../middleware/validate');

/**
 * Auth Controller — handles register, login, and profile.
 */

/** POST /api/auth/register */
const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and password are required.',
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address.',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters.',
    });
  }

  // Check if user already exists
  const existingUser = await authService.findByEmail(email);
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists.',
    });
  }

  const user = await authService.createUser({ name, email, password, role: 'customer' });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.status(201).json({
    success: true,
    message: 'User registered successfully.',
    data: { user, token },
  });
};

/** POST /api/auth/login */
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.',
    });
  }

  const user = await authService.findByEmail(email);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  const isMatch = await authService.comparePassword(password, user.password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  // Don't return password
  const { password: _, ...userData } = user;

  res.json({
    success: true,
    message: 'Login successful.',
    data: {
      user: userData,
      token,
    },
  });
};

/** GET /api/auth/me */
const getMe = async (req, res) => {
  const user = await authService.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found.',
    });
  }

  res.json({
    success: true,
    data: user,
  });
};

module.exports = { register, login, getMe };
