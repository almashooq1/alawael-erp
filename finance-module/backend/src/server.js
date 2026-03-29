'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'finance-module',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/finance/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'finance-module' });
});

// Load routes safely
const routesPath = path.join(__dirname, 'routes');
try {
  const cashFlowRoute = require('./routes/cashFlow');
  app.use('/api/finance/cashflow', cashFlowRoute);
} catch (e) {
  console.warn('cashFlow route not loaded:', e.message);
}

try {
  const financeRoute = require('./routes/financeModule');
  app.use('/api/finance', financeRoute);
} catch (e) {
  console.warn('financeModule route not loaded:', e.message);
}

try {
  const riskRoute = require('./routes/risk');
  app.use('/api/finance/risk', riskRoute);
} catch (e) {
  console.warn('risk route not loaded:', e.message);
}

try {
  const validationRoute = require('./routes/validation');
  app.use('/api/finance/validation', validationRoute);
} catch (e) {
  console.warn('validation route not loaded:', e.message);
}

// Connect to MongoDB
const MONGODB_URI =
  process.env.MONGODB_URI ||
  `mongodb://${process.env.DB_HOST || 'mongodb'}:${process.env.DB_PORT || 27017}/${process.env.DB_NAME || 'alawael_erp'}`;

mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  })
  .then(() => console.log('✅ Finance Module: MongoDB connected'))
  .catch(err => console.error('⚠️ Finance Module: MongoDB connection failed:', err.message));

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Finance Module running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Finance Module: Shutting down...');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = app;
