/**
 * QUICK INTEGRATION SCRIPT
 * سكريبت التكامل السريع
 *
 * تشغيل هذا الملف للتكامل الفوري لجميع المسارات
 */

/**
 * STEP 1: Update app.js
 *
 * استبدل محتوى app.js بهذا:
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const setupNewRoutes = require('./backend/api/routes/setupRoutes');

// Import services
const AdvancedSearchService = require('./backend/services/advancedSearchService');
const AdvancedReportingService = require('./backend/services/advancedReportingService');
const ExternalIntegrationService = require('./backend/services/externalIntegrationService');
const ProjectManagementService = require('./backend/services/projectManagementService');
const AIAnalyticsService = require('./backend/services/aiAnalyticsService');

// Initialize Express
const app = express();

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// ============================================
// INITIALIZE SERVICES
// ============================================
const searchService = new AdvancedSearchService();
const reportingService = new AdvancedReportingService();
const integrationService = new ExternalIntegrationService();
const projectService = new ProjectManagementService();
const aiService = new AIAnalyticsService();

// Make services available globally
app.locals.searchService = searchService;
app.locals.reportingService = reportingService;
app.locals.integrationService = integrationService;
app.locals.projectService = projectService;
app.locals.aiService = aiService;

// ============================================
// REGISTER ALL NEW ROUTES
// ============================================
setupNewRoutes(app);

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    routes: {
      search: 7,
      reporting: 5,
      integration: 10,
      project: 14,
      ai: 7,
      total: 39,
    },
  });
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      status: err.status || 500,
    },
  });
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      path: req.path,
      method: req.method,
    },
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════');
  console.log('✅ Server Started Successfully');
  console.log('═══════════════════════════════════════════════');
  console.log(`🔗 Base URL: http://localhost:${PORT}`);
  console.log('');
  console.log('📊 Available Routes:');
  console.log('');
  console.log('🔍 Search Service (7 endpoints)');
  console.log('   POST   /api/search');
  console.log('   POST   /api/search/filters');
  console.log('   GET    /api/search/facets/:field');
  console.log('   POST   /api/search/autocomplete');
  console.log('   GET    /api/search/stats');
  console.log('   POST   /api/search/compound');
  console.log('   POST   /api/search/export');
  console.log('');
  console.log('📊 Reporting Service (5 endpoints)');
  console.log('   POST   /api/reports');
  console.log('   POST   /api/reports/schedule');
  console.log('   GET    /api/reports/:id');
  console.log('   GET    /api/reports/:id/export');
  console.log('   DELETE /api/reports/:id');
  console.log('');
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
  console.log('   GET    /api/integrations/log');
  console.log('');
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
  console.log('   POST   /api/projects/:id/close');
  console.log('');
  console.log('🤖 AI Service (7 endpoints)');
  console.log('   POST   /api/ai/predict/attendance');
  console.log('   POST   /api/ai/predict/performance');
  console.log('   POST   /api/ai/detect/anomalies');
  console.log('   POST   /api/ai/recommendations');
  console.log('   POST   /api/ai/analyze/trends');
  console.log('   GET    /api/ai/models');
  console.log('   GET    /api/ai/models/:id/info');
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('🧪 Running Tests:');
  console.log('   npm test');
  console.log('');
  console.log('📝 View Documentation:');
  console.log('   IMPLEMENTATION_GUIDE.md');
  console.log('');
  console.log('═══════════════════════════════════════════════');
});

module.exports = app;

/**
 * ============================================
 * FRONTEND INTEGRATION
 * ============================================
 *
 * Update your React App.jsx:
 *
 * import SearchDashboard from './components/SearchDashboard';
 * import ReportingDashboard from './components/ReportingDashboard';
 * import IntegrationSettings from './components/IntegrationSettings';
 * import ProjectTracker from './components/ProjectTracker';
 * import AIInsights from './components/AIInsights';
 *
 * function App() {
 *   const [activeComponent, setActiveComponent] = useState('search');
 *
 *   return (
 *     <div className="app">
 *       <Navigation onChange={setActiveComponent} />
 *       {activeComponent === 'search' && <SearchDashboard />}
 *       {activeComponent === 'reporting' && <ReportingDashboard />}
 *       {activeComponent === 'integration' && <IntegrationSettings />}
 *       {activeComponent === 'project' && <ProjectTracker />}
 *       {activeComponent === 'ai' && <AIInsights />}
 *     </div>
 *   );
 * }
 */
