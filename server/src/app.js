const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/config');
const corsOptions = require('./config/cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const pesoPayRoutes = require('./routes/pesoPayRoutes');
const rateLimiter = require('./middleware/rateLimit');

// Initialize Express app
const app = express();

// Connect to MongoDB
mongoose
  .connect(config.MONGODB_URI)
  .then(() => console.log('MongoDB connection successful!'))
  .catch(err => console.error('MongoDB connection error:', err));

// Global middlewares

// Set security HTTP headers
app.use(helmet());

// Rate limiting
app.use('/api', rateLimiter);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Enable CORS with configuration
app.use(cors(corsOptions));

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy'
  });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/budgets', budgetRoutes);
app.use('/api/v1/pesopay', pesoPayRoutes);

// Handle undefined routes
app.all('*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  });
});

module.exports = app; 