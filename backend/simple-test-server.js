/**
 * Simple Test Server - للاختبار المباشر
 */

const express = require('express');
const app = express();

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Server OK',
    endpoints: {
      invoices: '/api/test/invoices',
      payments: '/api/test/payments',
      expenses: '/api/test/expenses',
    },
  });
});

// Test endpoints - without models
app.get('/api/test/invoices', (req, res) => {
  res.json({ success: true, count: 0, data: [], message: 'No invoices' });
});

app.get('/api/test/invoices/stats', (req, res) => {
  res.json({ success: true, data: { totalInvoices: 0, totalAmount: 0 }, message: 'Stats' });
});

app.get('/api/test/payments', (req, res) => {
  res.json({ success: true, count: 0, data: [], message: 'No payments' });
});

app.get('/api/test/expenses', (req, res) => {
  res.json({ success: true, count: 0, data: [], message: 'No expenses' });
});

const PORT = 3005;

app
  .listen(PORT, () => {
    console.log(`
🚀 SIMPLE TEST SERVER RUNNING
📍 http://localhost:${PORT}
📍 http://localhost:${PORT}/api/test/invoices
`);
  })
  .on('error', err => {
    console.error('Server error:', err);
    process.exit(1);
  });

// Keep process alive
process.on('uncaughtException', err => {
  console.error('Uncaught exception:', err);
});
