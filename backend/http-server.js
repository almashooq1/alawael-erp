#!/usr/bin/env node

// STANDALONE ACCOUNTING SERVER
// No dependencies on routes or middleware, just pure endpoints

const http = require('http');
const url = require('url');

const PORT = 3002;
const HOST = '127.0.0.1';

// Sample data
const invoices = [];
const payments = [];
const expenses = [];

// Response helper
const sendJSON = (res, code, data) => {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
};

// Server
const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Health check
  if (pathname === '/' && method === 'GET') {
    return sendJSON(res, 200, {
      success: true,
      message: '✅ Accounting Server Running',
      version: '5.0.0',
      endpoints: [
        'GET  /api/accounting/invoices',
        'GET  /api/accounting/invoices/stats',
        'POST /api/accounting/invoices',
        'GET  /api/accounting/payments',
        'POST /api/accounting/payments',
        'GET  /api/accounting/expenses',
        'POST /api/accounting/expenses',
      ],
    });
  }

  // Invoices endpoints
  if (pathname === '/api/accounting/invoices') {
    if (method === 'GET') {
      return sendJSON(res, 200, {
        success: true,
        data: invoices,
        count: invoices.length,
        message: 'Invoices list',
      });
    }
    if (method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const invoice = { _id: 'inv-' + Date.now(), ...data, createdAt: new Date() };
          invoices.push(invoice);
          return sendJSON(res, 201, { success: true, data: invoice, message: 'Invoice created' });
        } catch (e) {
          return sendJSON(res, 400, { success: false, message: 'Invalid JSON' });
        }
      });
      return;
    }
  }

  if (pathname === '/api/accounting/invoices/stats' && method === 'GET') {
    return sendJSON(res, 200, {
      success: true,
      data: {
        total: invoices.length,
        totalAmount: invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
        paid: invoices.filter(i => i.status === 'paid').length,
        unpaid: invoices.filter(i => i.status !== 'paid').length,
      },
      message: 'Invoice stats',
    });
  }

  // Payments endpoints
  if (pathname === '/api/accounting/payments') {
    if (method === 'GET') {
      return sendJSON(res, 200, {
        success: true,
        data: payments,
        count: payments.length,
        message: 'Payments list',
      });
    }
    if (method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const payment = { _id: 'pay-' + Date.now(), ...data, createdAt: new Date() };
          payments.push(payment);
          return sendJSON(res, 201, { success: true, data: payment, message: 'Payment created' });
        } catch (e) {
          return sendJSON(res, 400, { success: false, message: 'Invalid JSON' });
        }
      });
      return;
    }
  }

  if (pathname === '/api/accounting/payments/stats' && method === 'GET') {
    return sendJSON(res, 200, {
      success: true,
      data: {
        total: payments.length,
        totalAmount: payments.reduce((sum, pay) => sum + (pay.amount || 0), 0),
        today: payments.filter(
          p => new Date(p.createdAt).toDateString() === new Date().toDateString()
        ).length,
      },
      message: 'Payment stats',
    });
  }

  // Expenses endpoints
  if (pathname === '/api/accounting/expenses') {
    if (method === 'GET') {
      return sendJSON(res, 200, {
        success: true,
        data: expenses,
        count: expenses.length,
        message: 'Expenses list',
      });
    }
    if (method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const expense = { _id: 'exp-' + Date.now(), ...data, createdAt: new Date() };
          expenses.push(expense);
          return sendJSON(res, 201, { success: true, data: expense, message: 'Expense created' });
        } catch (e) {
          return sendJSON(res, 400, { success: false, message: 'Invalid JSON' });
        }
      });
      return;
    }
  }

  if (pathname === '/api/accounting/expenses/stats' && method === 'GET') {
    return sendJSON(res, 200, {
      success: true,
      data: {
        total: expenses.length,
        totalAmount: expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
        pending: expenses.filter(e => e.status === 'pending').length,
        approved: expenses.filter(e => e.status === 'approved').length,
      },
      message: 'Expense stats',
    });
  }

  // 404
  return sendJSON(res, 404, { success: false, message: 'Endpoint not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║  ✅ ACCOUNTING SERVER v5.0 - NATIVE HTTP    ║
║  http://${HOST}:${PORT}                        ║
╚═══════════════════════════════════════════════╝

🔗 ENDPOINTS:

INVOICES:
  GET    /api/accounting/invoices
  GET    /api/accounting/invoices/stats
  POST   /api/accounting/invoices

PAYMENTS:
  GET    /api/accounting/payments
  GET    /api/accounting/payments/stats
  POST   /api/accounting/payments

EXPENSES:
  GET    /api/accounting/expenses
  GET    /api/accounting/expenses/stats
  POST   /api/accounting/expenses

✅ Ready!
`);
});

server.on('error', err => {
  console.error('Server error:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  server.close(() => process.exit(0));
});
