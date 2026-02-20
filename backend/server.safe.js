require('dotenv').config();

// Safe startup: force mock DB/cache so we never rely on external services
process.env.USE_MOCK_DB = 'true';
process.env.USE_MOCK_CACHE = 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors());
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    port: PORT,
    mode: 'safe-start',
    mongodb: 'mock (safe mode)',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    mode: 'safe-start',
    services: {
      api: 'operational',
      database: 'mock (safe mode)',
      cache: 'mock (safe mode)',
    },
  });
});

// Safe require for route modules
const safeRequire = path => {
  try {
    return require(path);
  } catch (error) {
    console.log(`⚠️  Router not found or error loading: ${path}`);
    return null;
  }
};

// Load only essential auth routes
const authRouter = safeRequire('./routes/auth');
const usersRouter = safeRequire('./routes/users');
const dashboardRouter = safeRequire('./routes/dashboard');

if (authRouter) app.use('/api/auth', authRouter);
if (usersRouter) app.use('/api/users', usersRouter);
if (dashboardRouter) app.use('/api/dashboard', dashboardRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════╗
║    🚀 ERP System Backend (SAFE MODE)     ║
╠════════════════════════════════════════════╣
║  ✅ Server running on port ${PORT}          ║
║  ✅ Mock Database (No DB required)         ║
║  ✅ Safe startup - minimal dependencies    ║
║  📍 Health check: http://localhost:${PORT}/health  ║
║  🔌 API Base: http://localhost:${PORT}/api   ║
╚════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📴 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n📴 Received SIGTERM, shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
