const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
require('dotenv').config();
require('express-async-errors');

const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');
const { initializeDatabase } = require('./services/db.service');

const app = express();

// --------------- Middleware ---------------
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------- Routes ---------------
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Ecommerce API is running 🚀',
    version: '1.0.0',
  });
});

app.use('/api', apiRoutes);

// --------------- Error handling ---------------
app.use(errorHandler);

// --------------- Start server ---------------
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Initialize DB tables before starting
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`\n✅  Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
