/**
 * Main Application Entry Point
 * نقطة الدخول الرئيسية للتطبيق
 *
 * Complete System with All Services, Routes, and Middleware
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Import Services
const AdvancedSearchService = require('./backend/services/advancedSearchService');
const AdvancedReportingService = require('./backend/services/advancedReportingService');
const ExternalIntegrationService = require('./backend/services/externalIntegrationService');
const ProjectManagementService = require('./backend/services/projectManagementService');
const AIAnalyticsService = require('./backend/services/aiAnalyticsService');

// Import Route Handlers
const setupNewRoutes = require('./backend/api/routes/setupRoutes');

// Initialize Express App
const app = express();

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================
app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// SERVICE INITIALIZATION
// ============================================
const searchService = new AdvancedSearchService();
const reportingService = new AdvancedReportingService();
const integrationService = new ExternalIntegrationService();
const projectService = new ProjectManagementService();
const aiService = new AIAnalyticsService();

// Make services available in app
app.locals.searchService = searchService;
app.locals.reportingService = reportingService;
app.locals.integrationService = integrationService;
app.locals.projectService = projectService;
app.locals.aiService = aiService;

// ============================================
// HEALTH CHECK & STATUS ENDPOINTS
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      search: 'operational',
      reporting: 'operational',
      integration: 'operational',
      project: 'operational',
      ai: 'operational',
    },
    endpoints: {
      total: 39,
      search: 7,
      reporting: 5,
      integration: 10,
      project: 14,
      ai: 7,
    },
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    message: 'Server is running',
    timestamp: new Date(),
    version: '1.0.0',
    services: ['search', 'reporting', 'integration', 'project', 'ai'],
  });
});

// ============================================
// REGISTER ALL ROUTES
// ============================================
setupNewRoutes(app);

// ============================================
// STATIC FILES (if needed)
// ============================================
app.use(express.static(path.join(__dirname, 'frontend', 'build')));

// ============================================
// API DOCUMENTATION ENDPOINT
// ============================================
app.get('/api/docs', (req, res) => {
  const documentation = {
    title: 'Advanced System API Documentation',
    version: '1.0.0',
    baseUrl: 'http://localhost:3000/api',
    services: [
      {
        name: 'Search Service',
        description: 'Advanced search with fuzzy matching, filters, and facets',
        endpoints: 7,
      },
      {
        name: 'Reporting Service',
        description: 'Report generation, scheduling, and export',
        endpoints: 5,
      },
      {
        name: 'Integration Service',
        description: 'Slack, Email, and Webhook integrations',
        endpoints: 10,
      },
      {
        name: 'Project Service',
        description: 'Project management with tasks, resources, and budgets',
        endpoints: 14,
      },
      {
        name: 'AI Service',
        description: 'Predictions, anomaly detection, and recommendations',
        endpoints: 7,
      },
    ],
    totalEndpoints: 39,
  };
  res.json(documentation);
});

// ============================================
// 404 ERROR HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      path: req.path,
      method: req.method,
      availableEndpoints: 'GET /api/docs or GET /health',
    },
  });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: status,
      timestamp: new Date().toISOString(),
    },
  });
});

// ============================================
// SERVER STARTUP
// ============================================
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           ✅ SERVER STARTED SUCCESSFULLY ✅               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`🔗 Base URL: http://localhost:${PORT}`);
  console.log('\n📊 AVAILABLE SERVICES:\n');

  console.log('🔍 Search Service (7 endpoints)');
  console.log('   POST   /api/search');
  console.log('   POST   /api/search/filters');
  console.log('   GET    /api/search/facets/:field');
  console.log('   POST   /api/search/autocomplete');
  console.log('   GET    /api/search/stats');
  console.log('   POST   /api/search/compound');
  console.log('   POST   /api/search/export\n');

  console.log('📊 Reporting Service (5 endpoints)');
  console.log('   POST   /api/reports');
  console.log('   POST   /api/reports/schedule');
  console.log('   GET    /api/reports/:id');
  console.log('   GET    /api/reports/:id/export');
  console.log('   DELETE /api/reports/:id\n');

  console.log('🔗 Integration Service (10 endpoints)');
  console.log('   POST   /api/integrations/slack/configure');
  console.log('   POST   /api/integrations/slack/send');
  console.log('   POST   /api/integrations/email/configure');
  console.log('   POST   /api/integrations/email/send');
  console.log('   POST   /api/integrations/email/bulk');
  console.log('   POST   /api/webhooks/register');
  console.log('   POST   /api/webhooks/:id/trigger');
  console.log('   DELETE /api/webhooks/:id');
  console.log('   GET    /api/integrations/status');
  console.log('   GET    /api/integrations/log\n');

  console.log('📋 Project Service (14 endpoints)');
  console.log('   POST   /api/projects');
  console.log('   GET    /api/projects');
  console.log('   GET    /api/projects/:id');
  console.log('   POST   /api/projects/:id/phases');
  console.log('   POST   /api/projects/:id/tasks');
  console.log('   PUT    /api/projects/tasks/:taskId/status');
  console.log('   POST   /api/projects/:id/resources');
  console.log('   POST   /api/projects/:id/risks');
  console.log('   POST   /api/projects/:id/budget');
  console.log('   POST   /api/projects/budget/:budgetId/expense');
  console.log('   GET    /api/projects/:id/progress');
  console.log('   GET    /api/projects/:id/schedule');
  console.log('   GET    /api/projects/:id/report');
  console.log('   POST   /api/projects/:id/close\n');

  console.log('🤖 AI Service (7 endpoints)');
  console.log('   POST   /api/ai/predict/attendance');
  console.log('   POST   /api/ai/predict/performance');
  console.log('   POST   /api/ai/detect/anomalies');
  console.log('   POST   /api/ai/recommendations');
  console.log('   POST   /api/ai/analyze/trends');
  console.log('   GET    /api/ai/models');
  console.log('   GET    /api/ai/models/:id/info\n');

  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📚 Documentation: GET /api/docs');
  console.log('💚 Health Check: GET /health');
  console.log('🧪 Run Tests: npm test');
  console.log('\n═══════════════════════════════════════════════════════════\n');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
