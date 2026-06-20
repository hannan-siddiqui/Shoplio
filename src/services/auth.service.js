const bcrypt = require('bcryptjs');
const pool = require('../config/db');

/**
 * Auth Service — user database operations.
 */

/** Create a new user */
const createUser = async ({ name, email, password, role = 'customer' }) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const [result] = await pool.query(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, hashedPassword, role]
  );

  return findById(result.insertId);
};

/** Find user by email */
const findByEmail = async (email) => {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  return rows[0] || null;
};

/** Find user by ID (exclude password) */
const findById = async (id) => {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

/** Compare plain password with hashed password */
const comparePassword = async (plain, hashed) => {
  return bcrypt.compare(plain, hashed);
};

/** Get all users (admin use) */
const getAllUsers = async ({ page = 1, limit = 10 }) => {
  const offset = (Number(page) - 1) * Number(limit);

  const [rows] = await pool.query(
    'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [Number(limit), offset]
  );

  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM users');

  return {
    data: rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

module.exports = { createUser, findByEmail, findById, comparePassword, getAllUsers };
