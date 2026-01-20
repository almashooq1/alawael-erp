const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// Log middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
try {
  const predictionsRouter = require('./routes/predictions');
  const reportsRouter = require('./routes/reports');
  const notificationsRouter = require('./routes/notifications');
  const monitoringRouter = require('./routes/monitoring');
  const supportRouter = require('./routes/support');
  const integrationsRouter = require('./routes/integrations');
  const performanceRouter = require('./routes/performance');

  app.use('/api/predictions', predictionsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/monitoring', monitoringRouter);
  app.use('/api/support', supportRouter);
  app.use('/api/integrations', integrationsRouter);
  app.use('/api/performance', performanceRouter);

  console.log('✅ All routes loaded successfully (7 systems)');
} catch (err) {
  console.error('❌ Error loading routes:', err.message);
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

module.exports = app;
