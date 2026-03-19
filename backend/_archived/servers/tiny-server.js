#!/usr/bin/env node

const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Server OK' });
});

app.get('/api/test/invoices', (req, res) => {
  res.json({ success: true, count: 0, data: [], message: 'No invoices' });
});

app.get('/api/test/payments', (req, res) => {
  res.json({ success: true, count: 0, data: [], message: 'No payments' });
});

app.get('/api/test/expenses', (req, res) => {
  res.json({ success: true, count: 0, data: [], message: 'No expenses' });
});

const PORT = 3008;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

server.on('error', err => {
  console.error('Error:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\\nGracefully shutting down...');
  server.close(() => process.exit(0));
});
