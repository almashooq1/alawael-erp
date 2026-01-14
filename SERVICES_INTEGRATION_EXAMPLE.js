/**
 * SERVICES INTEGRATION GUIDE
 * دليل تكامل الخدمات مع المسارات
 *
 * هذا الملف يحتوي على أمثلة كاملة لكيفية دمج
 * الخدمات الجديدة مع Express Routes
 */

// ============================================================================
// 1. ADVANCED SEARCH SERVICE INTEGRATION
// ============================================================================

const express = require('express');
const AdvancedSearchService = require('../services/advancedSearchService');

const searchRouter = express.Router();
const searchService = new AdvancedSearchService();

/**
 * POST /api/search
 * البحث المتقدم في جميع الحقول
 *
 * Body:
 * {
 *   "data": [...],
 *   "query": "البحث عن شيء",
 *   "options": {
 *     "fields": ["name", "email"],
 *     "fuzzyTolerance": 2,
 *     "limit": 50
 *   }
 * }
 */
searchRouter.post('/search', (req, res) => {
  try {
    const { data, query, options } = req.body;
    const results = searchService.advancedSearch(data, query, options);
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/search/filters
 * تطبيق المرشحات المتقدمة
 */
searchRouter.post('/search/filters', (req, res) => {
  try {
    const { data, filters } = req.body;
    const results = searchService.applyFilters(data, filters);
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/search/facets/:field
 * الحصول على فتيس البحث
 */
searchRouter.get('/search/facets/:field', (req, res) => {
  try {
    const { data } = req.body;
    const facets = searchService.facetedSearch(data, req.params.field);
    res.json(facets);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/search/autocomplete
 * الإكمال التلقائي
 */
searchRouter.get('/search/autocomplete', (req, res) => {
  try {
    const { data, query, field } = req.body;
    const suggestions = searchService.autocompleteSearch(data, query, field);
    res.json(suggestions);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/search/stats
 * إحصائيات البحث
 */
searchRouter.get('/search/stats', (req, res) => {
  try {
    const stats = searchService.getSearchStatistics();
    res.json(stats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/search/export
 * تصدير نتائج البحث
 */
searchRouter.post('/search/export', (req, res) => {
  try {
    const { results, format } = req.body;
    const exported = searchService.exportResults(results, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.send(exported);
    } else if (format === 'json') {
      res.json(exported);
    } else {
      res.json(exported);
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// 2. ADVANCED REPORTING SERVICE INTEGRATION
// ============================================================================

const AdvancedReportingService = require('../services/advancedReportingService');

const reportRouter = express.Router();
const reportingService = new AdvancedReportingService();

/**
 * POST /api/reports
 * توليد تقرير جديد
 *
 * Body:
 * {
 *   "template": "workflow-summary",
 *   "data": [...],
 *   "options": {}
 * }
 */
reportRouter.post('/reports', (req, res) => {
  try {
    const { template, data, options } = req.body;
    const report = reportingService.generateReport(template, data, options);
    res.json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/reports/schedule
 * جدولة تقرير دوري
 */
reportRouter.post('/reports/schedule', (req, res) => {
  try {
    const { templateId, frequency, recipients } = req.body;
    const schedule = reportingService.scheduleReport(templateId, frequency, recipients);
    res.json(schedule);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/reports/:id
 * الحصول على تقرير
 */
reportRouter.get('/reports/:id', (req, res) => {
  try {
    const report = reportingService.reports.get(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'التقرير غير موجود' });
    }
    res.json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/reports/:id/export
 * تصدير التقرير
 */
reportRouter.get('/reports/:id/export', (req, res) => {
  try {
    const { format } = req.query;
    const exported = reportingService.exportReport(req.params.id, format);

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
    } else if (format === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
    }

    res.send(exported);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// 3. EXTERNAL INTEGRATION SERVICE INTEGRATION
// ============================================================================

const ExternalIntegrationService = require('../services/externalIntegrationService');

const integrationRouter = express.Router();
const integrationService = new ExternalIntegrationService();

/**
 * POST /api/integrations/slack/configure
 * إعداد Slack
 */
integrationRouter.post('/integrations/slack/configure', async (req, res) => {
  try {
    const { webhookUrl, channels } = req.body;
    const result = await integrationService.configureSlack(webhookUrl, channels);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/integrations/slack/send
 * إرسال رسالة Slack
 */
integrationRouter.post('/integrations/slack/send', async (req, res) => {
  try {
    const { channel, message, options } = req.body;
    const result = await integrationService.sendSlackMessage(channel, message, options);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/integrations/email/configure
 * إعداد البريد الإلكتروني
 */
integrationRouter.post('/integrations/email/configure', async (req, res) => {
  try {
    const config = req.body;
    const result = await integrationService.configureEmail(config);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/integrations/email/send
 * إرسال بريد إلكتروني
 */
integrationRouter.post('/integrations/email/send', async (req, res) => {
  try {
    const { to, subject, body, options } = req.body;
    const result = await integrationService.sendEmail(to, subject, body, options);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/integrations/email/bulk
 * إرسال بريد جماعي
 */
integrationRouter.post('/integrations/email/bulk', async (req, res) => {
  try {
    const { recipients, subject, template, data } = req.body;
    const result = await integrationService.sendBulkEmail(recipients, subject, template, data);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/webhooks/register
 * تسجيل webhook جديد
 */
integrationRouter.post('/webhooks/register', (req, res) => {
  try {
    const { event, url, options } = req.body;
    const result = integrationService.registerWebhook(event, url, options);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/webhooks/:id/trigger
 * تشغيل webhook
 */
integrationRouter.post('/webhooks/:id/trigger', async (req, res) => {
  try {
    const { data } = req.body;
    const webhook = integrationService.webhooks.get(req.params.id);
    const result = await integrationService.executeWebhook(webhook, data);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/integrations/status
 * حالة الاتصالات
 */
integrationRouter.get('/integrations/status', (req, res) => {
  try {
    const status = integrationService.getConnectionStatus();
    res.json(status);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// 4. PROJECT MANAGEMENT SERVICE INTEGRATION
// ============================================================================

const ProjectManagementService = require('../services/projectManagementService');

const projectRouter = express.Router();
const projectService = new ProjectManagementService();

/**
 * POST /api/projects
 * إنشاء مشروع جديد
 */
projectRouter.post('/projects', (req, res) => {
  try {
    const projectData = req.body;
    const result = projectService.createProject(projectData);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/projects
 * الحصول على جميع المشاريع
 */
projectRouter.get('/projects', (req, res) => {
  try {
    const filters = req.query;
    const result = projectService.getAllProjects(filters);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/projects/:id/phases
 * إضافة مرحلة
 */
projectRouter.post('/projects/:id/phases', (req, res) => {
  try {
    const phaseData = req.body;
    const result = projectService.addPhase(req.params.id, phaseData);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/projects/:id/tasks
 * إنشاء مهمة
 */
projectRouter.post('/projects/:id/tasks', (req, res) => {
  try {
    const { phaseId, ...taskData } = req.body;
    const result = projectService.createTask(req.params.id, phaseId, taskData);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/projects/tasks/:taskId/status
 * تحديث حالة المهمة
 */
projectRouter.put('/projects/tasks/:taskId/status', (req, res) => {
  try {
    const { status, progress } = req.body;
    const result = projectService.updateTaskStatus(req.params.taskId, status, progress);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/projects/:id/budget
 * إدارة الميزانية
 */
projectRouter.post('/projects/:id/budget', (req, res) => {
  try {
    const budgetData = req.body;
    const result = projectService.manageBudget(req.params.id, budgetData);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:id/progress
 * حساب التقدم
 */
projectRouter.get('/projects/:id/progress', (req, res) => {
  try {
    const result = projectService.calculateProjectProgress(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:id/report
 * توليد تقرير المشروع
 */
projectRouter.get('/projects/:id/report', (req, res) => {
  try {
    const result = projectService.generateProjectReport(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// 5. AI ANALYTICS SERVICE INTEGRATION
// ============================================================================

const AIAnalyticsService = require('../services/aiAnalyticsService');

const aiRouter = express.Router();
const aiService = new AIAnalyticsService();

/**
 * POST /api/ai/predict/attendance
 * التنبؤ بالحضور
 */
aiRouter.post('/ai/predict/attendance', (req, res) => {
  try {
    const { employeeData, historyData } = req.body;
    const result = aiService.predictAttendancePatterns(employeeData, historyData);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/ai/predict/performance
 * التنبؤ بالأداء
 */
aiRouter.post('/ai/predict/performance', (req, res) => {
  try {
    const { employeeId, metrics } = req.body;
    const result = aiService.predictPerformance(employeeId, metrics);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/ai/detect/anomalies
 * كشف الشذوذ
 */
aiRouter.post('/ai/detect/anomalies', (req, res) => {
  try {
    const { data, type } = req.body;
    const result = aiService.detectAnomalies(data, type);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/ai/recommendations
 * التوصيات الذكية
 */
aiRouter.post('/ai/recommendations', (req, res) => {
  try {
    const { userId, userProfile, contextData } = req.body;
    const result = aiService.generateSmartRecommendations(userId, userProfile, contextData);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/ai/analyze/trends
 * تحليل الاتجاهات
 */
aiRouter.post('/ai/analyze/trends', (req, res) => {
  try {
    const { data, timeField } = req.body;
    const result = aiService.analyzeTrends(data, timeField);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// MAIN APP SETUP
// ============================================================================

const app = express();

// Middleware
app.use(express.json());

// Register Routes
app.use('/api', searchRouter);
app.use('/api', reportRouter);
app.use('/api', integrationRouter);
app.use('/api', projectRouter);
app.use('/api', aiRouter);

// Error Handler
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'خطأ في الخادم' });
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  app,
  searchRouter,
  reportRouter,
  integrationRouter,
  projectRouter,
  aiRouter,
};
