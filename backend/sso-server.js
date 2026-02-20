#!/usr/bin/env node
/**
 * SSO Server - Standalone
 * نظام تسجيل الدخول الموحد - خادم مستقل
 * 
 * بديل مسبق عندما يكون الـ integration مع server رئيسي معقد
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// Simplified app without the complex middleware chain
const app = express();

// Core middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

console.log('[SSO-SERVER] Starting SSO Standalone Server...');
console.log('[SSO-SERVER] Environment: ' + process.env.NODE_ENV);
console.log('[SSO-SERVER] Mock Cache: ' + process.env.USE_MOCK_CACHE);
console.log('[SSO-SERVER] Mock DB: ' + process.env.USE_MOCK_DB);

// Load SSO Router directly
try {
  const ssoRouter = require('./routes/sso.routes');
  app.use('/api/sso', ssoRouter);
  console.log('[SSO-SERVER] ✅ SSO Routes registered on /api/sso');
} catch (error) {
  console.error('[SSO-SERVER] ❌ Failed to load SSO routes:', error.message);
  console.error('[SSO-SERVER] Stack:', error.stack);
  process.exit(1);
}

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'SSO',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Health under API path
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'SSO',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    message: 'SSO Endpoint not found'
  });
});

// Start server
const PORT = process.env.SSO_PORT || 3002;
const SERVER = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════╗
║    🚀 SSO Server (Standalone)             ║
╠════════════════════════════════════════════╣
║  ✅ Server running on port ${PORT}          ║
║  📍 Health: http://localhost:${PORT}/health  ║
║  🔐 SSO Base: http://localhost:${PORT}/api/sso ║
║  ⏲️ Start time: ${new Date().toISOString()} ║
╚════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[SSO-SERVER] Shutting down gracefully...');
  SERVER.close(() => {
    console.log('[SSO-SERVER] ✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('[SSO-SERVER] SIGTERM received, shutting down...');
  SERVER.close(() => {
    console.log('[SSO-SERVER] ✅ Server closed');
    process.exit(0);
  });
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('[SSO-SERVER] ❌ Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[SSO-SERVER] ❌ Unhandled rejection at:', promise, 'reason:', reason);
});

module.exports = app;
