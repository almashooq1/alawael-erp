/**
 * ===================================================================
 * SIMPLIFIED TEST SERVER - للاختبار فقط
 * ===================================================================
 * هذا السيرفر المبسط لاختبار الـ Accounting APIs فقط
 * ===================================================================
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// ===================================================================
// Middleware
// ===================================================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===================================================================
// Database Connection
// ===================================================================
const connectDB = async () => {
  try {
    // Try direct connection to local MongoDB
    mongoose.set('strictQuery', false);
    await mongoose
      .connect('mongodb://localhost:27017/alawael-erp', {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
      })
      .then(() => {
        console.log('✅ MongoDB Connected');
      })
      .catch(() => {
        console.log('⚠️ Running without MongoDB - some features may not work');
      });
  } catch (error) {
    console.log('⚠️ Skipping MongoDB - continuing without database');
  }
};

connectDB();

// ===================================================================
// Simple Auth Middleware (for testing)
// ===================================================================
const testAuthMiddleware = (req, res, next) => {
  // Mock user for testing
  req.user = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
  };
  next();
};

// Apply test auth to all routes
app.use('/api', testAuthMiddleware);

// ===================================================================
// Routes
// ===================================================================
try {
  const accountingRoutes = require('./routes/accounting.routes');
  app.use('/api/accounting', accountingRoutes);
  console.log('✅ Accounting routes loaded successfully');
} catch (err) {
  console.error('❌ Error loading accounting routes:', err.message);
  // Continue with minimal routes
  app.use('/api/accounting/invoices', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable - routes error',
    });
  });
}

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Accounting Test Server is running',
    endpoints: {
      invoices: '/api/accounting/invoices',
      payments: '/api/accounting/payments',
      expenses: '/api/accounting/expenses',
    },
  });
});

// ===================================================================
// Error Handler
// ===================================================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

// ===================================================================
// Start Server
// ===================================================================
const PORT = process.env.TEST_PORT || 3002;

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 ACCOUNTING TEST SERVER STARTED');
  console.log('='.repeat(60));
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/`);
  console.log(`📍 Invoices: http://localhost:${PORT}/api/accounting/invoices`);
  console.log(`📍 Payments: http://localhost:${PORT}/api/accounting/payments`);
  console.log(`📍 Expenses: http://localhost:${PORT}/api/accounting/expenses`);
  console.log('='.repeat(60) + '\n');
});

module.exports = app;
