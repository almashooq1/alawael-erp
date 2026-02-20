/**
 * Simplified App with SSO Routes
 * تطبيق مبسط مع نقاط نهاية SSO
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// SSO Routes
const ssoRouter = require('./routes/sso.routes');
app.use('/api/sso', ssoRouter);

console.log('✅ SSO Routes loaded');

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'SSO Backend Server',
    timestamp: new Date().toISOString(),
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

module.exports = app;
