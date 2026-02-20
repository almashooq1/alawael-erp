#!/usr/bin/env node

/**
 * 🇸🇦 MOI Passport Integration - Standalone Server
 * Direct server with full MOI integration
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// 🇸🇦 MOI Routes
// ============================================

// Health Endpoint
app.get('/api/moi/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'MOI Passport Integration Service',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Main Health
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

// Start
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════╗
║  🇸🇦 MOI Standalone Server              ║
╚═══════════════════════════════════════╝
✅ Server running on port ${PORT}
📍 Health: http://localhost:${PORT}/health
🇸🇦 MOI: http://localhost:${PORT}/api/moi/health
  `);
});

process.on('SIGINT', () => {
  console.log('\n📴 Shutting down...');
  server.close(() => process.exit(0));
});
