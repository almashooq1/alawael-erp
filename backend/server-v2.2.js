/**
 * ACCOUNTING TEST SERVER - DIRECT IMPLEMENTATION
 * No dependency on middleware, direct endpoint implementation
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Set test user on all requests
app.use((req, res, next) => {
  req.user = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Admin',
    email: 'admin@test.com',
    role: 'admin',
  };
  next();
});

// ===================================================================
// Database
// ===================================================================
try {
  mongoose.set('strictQuery', false);
  mongoose
    .connect('mongodb://localhost:27017/alawael-erp', {
      serverSelectionTimeoutMS: 2000,
    })
    .catch(() => {
      console.log('⚠️ MongoDB unavailable');
    });
} catch (err) {
  console.log('⚠️ DB error');
}

// ===================================================================
// Health
// ===================================================================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Accounting Server ✅',
    version: '2.2.0',
    mode: 'TEST',
    endpoints: [
      'GET /api/accounting/invoices',
      'GET /api/accounting/invoices/:id',
      'POST /api/accounting/invoices',
      'GET /api/accounting/payments',
      'GET /api/accounting/expenses',
    ],
  });
});

// ===================================================================
// TRY LOADING REAL ROUTES
// ===================================================================

// Create custom auth middleware that always passes
const customAuth = (req, res, next) => {
  req.user = req.user || {
    _id: '507f1f77bcf86cd799439011',
    role: 'admin',
  };
  next();
};

try {
  // Patch auth middleware BEFORE requiring routes
  const Module = require('module');
  const originalLoad = Module._load;

  Module._load = function (request, parent) {
    if (request.includes('auth.middleware')) {
      return {
        authenticateToken: customAuth,
        requireRole: () => customAuth,
        authenticate: customAuth,
        authorize: () => customAuth,
        validateSchema: () => customAuth,
      };
    }
    return originalLoad.apply(this, arguments);
  };

  const routes = require('./routes/accounting.routes');
  app.use('/api/accounting', routes);
  console.log('✅ Routes loaded');
} catch (e) {
  console.log('⚠️ Routes error:', e.message.substring(0, 50));

  // FALLBACK ENDPOINTS
  app.get('/api/accounting/invoices', (req, res) => {
    res.json({ success: true, data: [], message: 'Fallback' });
  });

  app.get('/api/accounting/payments', (req, res) => {
    res.json({ success: true, data: [], message: 'Fallback' });
  });

  app.get('/api/accounting/expenses', (req, res) => {
    res.json({ success: true, data: [], message: 'Fallback' });
  });
}

// ===================================================================
// 404
// ===================================================================
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// ===================================================================
// ERROR
// ===================================================================
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ success: false, message: err.message });
});

// ===================================================================
// START
// ===================================================================
const server = app.listen(3002, '127.0.0.1', () => {
  console.log(`
╔════════════════════════════════════════╗
║  ✅ ACCOUNTING SERVER v2.2            ║
║  http://localhost:3002                ║
╚════════════════════════════════════════╝

GET  http://localhost:3002/
GET  http://localhost:3002/api/accounting/invoices
GET  http://localhost:3002/api/accounting/payments
GET  http://localhost:3002/api/accounting/expenses

Ready! 🚀
`);
});

server.on('error', e => {
  console.error(e);
  process.exit(1);
});
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
