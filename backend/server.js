require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AlAwael ERP Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Info
app.get('/', (req, res) => {
  res.json({
    name: 'AlAwael ERP API',
    version: '1.0.0',
    description: 'Rehabilitation Center Management System',
    endpoints: {
      health: '/health',
      api: '/api',
      docs: '/api-docs',
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  const host = '0.0.0.0';
  const displayURL = `http://localhost:${PORT}`;
  console.log(`
╔═══════════════════════════════════════════╗
║   AlAwael ERP Backend Server Started     ║
╠═══════════════════════════════════════════╣
║   Environment: ${process.env.NODE_ENV || 'development'}
║   Host: ${host}
║   Port: ${PORT}
║   URL: ${displayURL}
║   Health: ${displayURL}/health
║   API: ${displayURL}/
╚═══════════════════════════════════════════╝
  `);
});

// Handle server errors
server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
    console.error('Please close the other process or use a different port.');
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('\n📴 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📴 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
