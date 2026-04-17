/* eslint-disable no-unused-vars */
/**
 * Routes Registration
 * تسجيل جميع المسارات الجديدة
 *
 * أضف هذا الملف إلى app.js:
 * const setupNewRoutes = require('./backend/api/routes/setupRoutes');
 * setupNewRoutes(app);
 */

const searchRoutes = require('./search.routes');
const reportingRoutes = require('./reporting.routes');
const integrationRoutes = require('./integration.routes');
const projectRoutes = require('./project.routes');
const aiRoutes = require('./ai.routes');
const policyRoutes = require('../../routes/policyRoutes');
const incidentRoutes = require('../../routes/incidentRoutes');
const logger = require('../../utils/logger');

/**
 * Setup all new routes
 */
function setupNewRoutes(app) {
  // Search routes
  app.use('/api', searchRoutes);

  // Reporting routes
  app.use('/api', reportingRoutes);

  // Integration routes
  app.use('/api', integrationRoutes);

  // Project routes
  app.use('/api', projectRoutes);

  // AI routes
  app.use('/api', aiRoutes);

  // Policy Management routes
  app.use('/api/policies', policyRoutes);

  // Incident Management routes
  app.use('/api/incidents', incidentRoutes);

  logger.info('All new routes registered successfully');

  // Print available routes
  const routes = [
    '🔍 Search Routes:',
    '   POST /api/search',
    '   POST /api/search/filters',
    '   GET /api/search/facets/:field',
    '   POST /api/search/autocomplete',
    '   GET /api/search/stats',
    '   POST /api/search/compound',
    '   POST /api/search/export',
    '',
    '📊 Reporting Routes:',
    '   POST /api/reports',
    '   POST /api/reports/schedule',
    '   GET /api/reports/:id',
    '   GET /api/reports/:id/export',
    '   DELETE /api/reports/:id',
    '',
    '🔗 Integration Routes:',
    '   POST /api/integrations/slack/configure',
    '   POST /api/integrations/slack/send',
    '   POST /api/integrations/email/configure',
    '   POST /api/integrations/email/send',
    '   POST /api/integrations/email/bulk',
    '   POST /api/webhooks/register',
    '   POST /api/webhooks/:id/trigger',
    '   DELETE /api/webhooks/:id',
    '   GET /api/integrations/status',
    '   GET /api/integrations/log',
    '',
    '📋 Project Routes:',
    '   POST /api/projects',
    '   GET /api/projects',
    '   GET /api/projects/:id',
    '   POST /api/projects/:id/phases',
    '   POST /api/projects/:id/tasks',
    '   PUT /api/projects/tasks/:taskId/status',
    '   POST /api/projects/:id/resources',
    '   POST /api/projects/:id/risks',
    '   POST /api/projects/:id/budget',
    '   POST /api/projects/budget/:budgetId/expense',
    '   GET /api/projects/:id/progress',
    '   GET /api/projects/:id/schedule',
    '   GET /api/projects/:id/report',
    '   POST /api/projects/:id/close',
    '',
    '🤖 AI Routes:',
    '   POST /api/ai/predict/attendance',
    '   POST /api/ai/predict/performance',
    '   POST /api/ai/detect/anomalies',
    '   POST /api/ai/recommendations',
    '   POST /api/ai/analyze/trends',
    '   GET /api/ai/models',
    '   GET /api/ai/models/:id/info',
  ];

  logger.debug('Registered routes:\n' + routes.join('\n'));
}

module.exports = setupNewRoutes;
