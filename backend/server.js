require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');

// Security middleware
const securityHeaders = require('./middleware/securityHeaders');
const sanitizeInput = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');
const { suspiciousActivityDetector } = require('./utils/security');
const responseHandler = require('./middleware/responseHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security Middleware (MUST be first)
app.use(securityHeaders);
app.use(suspiciousActivityDetector);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization (protects against NoSQL injection, XSS, HPP)
app.use(sanitizeInput);

// Response handler middleware (provides res.success, res.error, etc.)
app.use(responseHandler);

// Request logging
app.use(morgan('dev'));

// Rate limiting for all API routes
app.use('/api', apiLimiter);

// API Routes
const authRoutes = require('./api/routes/auth.routes');
const usersRoutes = require('./api/routes/users.routes');
const hrRoutes = require('./routes/hr.routes');
const hropsRoutes = require('./routes/hrops.routes');
const reportsRoutes = require('./routes/reports.routes');
const financeRoutes = require('./routes/finance.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const aiRoutes = require('./routes/ai.routes');

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/employees', hrRoutes);
app.use('/api/hr', hropsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/ai', aiRoutes);

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
