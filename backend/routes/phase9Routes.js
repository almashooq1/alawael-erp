/**
 * Phase 9 Advanced Features API Routes
 * Exposes security, workflows, analytics, and AI/ML features
 */

const express = require('express');
const router = express.Router();

// Import Phase 9 modules (assuming they're created in backend)
const AdvancedSecurityModule = require('../security/AdvancedSecurityModule');
const WorkflowEngine = require('../workflows/WorkflowEngine');
const AnalyticsService = require('../analytics/AnalyticsService');
const PerformanceOptimizer = require('../performance/PerformanceOptimizer');
const AIMLIntegration = require('../ai_ml/AIMLIntegration');

// ==================== SECURITY ENDPOINTS ====================

/**
 * GET /api/security/mfa/setup
 * Get MFA setup instructions and QR code
 */
router.get('/security/mfa/setup', (req, res) => {
  try {
    const userId = req.user.id;
    const mfaService = new AdvancedSecurityModule.MFAService();
    const setup = mfaService.generateQRCode(userId);

    res.json({
      success: true,
      data: {
        qrCode: setup.qrCode,
        secret: setup.secret,
        backupCodes: setup.backupCodes,
        instructions:
          'Scan the QR code with Microsoft Authenticator, Google Authenticator, or Authy',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/security/mfa/verify
 * Verify TOTP token and enable MFA
 */
router.post('/security/mfa/verify', (req, res) => {
  try {
    const { token, secret } = req.body;
    const mfaService = new AdvancedSecurityModule.MFAService();
    const isValid = mfaService.verifyToken(token, secret);

    if (isValid) {
      res.json({
        success: true,
        message: 'MFA enabled successfully',
        backupCodes: mfaService.generateBackupCodes(),
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid token',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/security/oauth/login/:provider
 * Start OAuth login flow
 */
router.get('/security/oauth/login/:provider', (req, res) => {
  try {
    const { provider } = req.params;
    const oauthService = new AdvancedSecurityModule.OAuthService();
    const authUrl = oauthService.getAuthURL(provider);

    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/security/field-encryption
 * Encrypt sensitive field
 */
router.post('/security/field-encryption', (req, res) => {
  try {
    const { value, field } = req.body;
    const encryption = new AdvancedSecurityModule.FieldEncryption();
    const encrypted = encryption.encryptField(field, value);

    res.json({
      success: true,
      data: {
        encrypted,
        field,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/security/audit-log
 * Get security audit log
 */
router.get('/security/audit-log', (req, res) => {
  try {
    const { userId, startDate, endDate, action } = req.query;
    const auditLogger = new AdvancedSecurityModule.AuditLogger();
    const logs = auditLogger.getAuditLogs({
      userId,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      action,
    });

    res.json({
      success: true,
      data: logs,
      totalRecords: logs.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ==================== WORKFLOW ENDPOINTS ====================

/**
 * POST /api/workflows/start
 * Start a new workflow
 */
router.post('/workflows/start', (req, res) => {
  try {
    const { workflowType, initiatorId, data } = req.body;
    const engine = new WorkflowEngine();
    const workflow = engine.startWorkflow(workflowType, initiatorId, data);

    res.json({
      success: true,
      data: {
        workflowId: workflow.id,
        status: workflow.status,
        currentStep: workflow.currentStep,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/workflows/:workflowId
 * Get workflow details
 */
router.get('/workflows/:workflowId', (req, res) => {
  try {
    const engine = new WorkflowEngine();
    const workflow = engine.getWorkflowStatus(req.params.workflowId);

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/workflows/:workflowId/tasks
 * Get pending tasks for workflow
 */
router.get('/workflows/:workflowId/tasks', (req, res) => {
  try {
    const engine = new WorkflowEngine();
    const tasks = engine.getPendingTasks(req.params.workflowId);

    res.json({
      success: true,
      data: tasks,
      totalTasks: tasks.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/workflows/:workflowId/tasks/:taskId/complete
 * Complete workflow task
 */
router.post('/workflows/:workflowId/tasks/:taskId/complete', (req, res) => {
  try {
    const { approval, comment } = req.body;
    const engine = new WorkflowEngine();
    const result = engine.completeStep(req.params.workflowId, {
      taskId: req.params.taskId,
      approval,
      comment,
      completedBy: req.user.id,
      completedAt: new Date(),
    });

    res.json({
      success: true,
      data: {
        workflowId: req.params.workflowId,
        status: result.status,
        nextStep: result.nextStep,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/workflows/my-tasks
 * Get user's pending workflow tasks
 */
router.get('/workflows/my-tasks', (req, res) => {
  try {
    const engine = new WorkflowEngine();
    const tasks = engine.getUserPendingTasks(req.user.id);

    res.json({
      success: true,
      data: tasks,
      totalPendingTasks: tasks.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ==================== ANALYTICS ENDPOINTS ====================

/**
 * GET /api/analytics/kpis
 * Get organization-wide KPIs
 */
router.get('/analytics/kpis', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const analyticsService = new AnalyticsService();
    const kpis = analyticsService.calculateKPIs(
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );

    res.json({
      success: true,
      data: kpis,
      generatedAt: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/analytics/department/:deptId
 * Get department-specific analytics
 */
router.get('/analytics/department/:deptId', (req, res) => {
  try {
    const analyticsService = new AnalyticsService();
    const metrics = analyticsService.getDepartmentMetrics(req.params.deptId);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/analytics/turnover-risk
 * Get turnover risk predictions
 */
router.get('/analytics/turnover-risk', (req, res) => {
  try {
    const analyticsService = new AnalyticsService();
    const risks = analyticsService.analyzeTurnoverRisk();

    res.json({
      success: true,
      data: {
        highRiskEmployees: risks.filter(r => r.riskLevel === 'HIGH'),
        criticalRiskEmployees: risks.filter(r => r.riskLevel === 'CRITICAL'),
        totalAtRisk: risks.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL').length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/analytics/performance
 * Get performance metrics
 */
router.get('/analytics/performance', (req, res) => {
  try {
    const analyticsService = new AnalyticsService();
    const metrics = analyticsService.getPerformanceMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/analytics/custom-report
 * Generate custom analytics report
 */
router.post('/analytics/custom-report', (req, res) => {
  try {
    const { title, metrics, filters, format, dateRange } = req.body;

    const analyticsService = new AnalyticsService();
    const report = analyticsService.generateCustomReport({
      title,
      metrics,
      filters,
      format,
      dateRange,
    });

    res.json({
      success: true,
      data: {
        reportId: report.id,
        title: report.title,
        format,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ==================== PERFORMANCE ENDPOINTS ====================

/**
 * GET /api/performance/metrics
 * Get system performance metrics
 */
router.get('/performance/metrics', (req, res) => {
  try {
    const optimizer = new PerformanceOptimizer.PerformanceMonitor();
    const metrics = optimizer.getMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/performance/cache-stats
 * Get cache statistics
 */
router.get('/performance/cache-stats', (req, res) => {
  try {
    const cacheManager = new PerformanceOptimizer.CacheManager();
    const stats = cacheManager.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/performance/slow-queries
 * Get slow database queries
 */
router.get('/performance/slow-queries', (req, res) => {
  try {
    const optimizer = new PerformanceOptimizer.QueryOptimizer();
    const slowQueries = optimizer.getSlowQueries();

    res.json({
      success: true,
      data: slowQueries,
      totalSlowQueries: slowQueries.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ==================== AI/ML ENDPOINTS ====================

/**
 * GET /api/ai/predict-turnover/:employeeId
 * Predict turnover risk for employee
 */
router.get('/ai/predict-turnover/:employeeId', (req, res) => {
  try {
    // Fetch employee data from database
    const employeeData = {
      _id: req.params.employeeId,
      name: 'Sample Employee',
      joinDate: '2020-01-15',
      lastPromotion: '2022-06-01',
      lastPerformanceRating: 'Above Average',
      salary: 65000,
    };

    const predictions = AIMLIntegration.PredictiveAnalytics.predictTurnover(employeeData);

    res.json({
      success: true,
      data: predictions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/ai/salary-increase/:employeeId
 * Predict salary increase
 */
router.get('/ai/salary-increase/:employeeId', (req, res) => {
  try {
    const employeeData = {
      lastPerformanceRating: 'Excellent',
      salary: 70000,
    };

    const marketData = {
      inflationRate: 3.2,
      marketAverage: 75000,
    };

    const prediction = AIMLIntegration.PredictiveAnalytics.predictSalaryIncrease(
      employeeData,
      marketData
    );

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/analyze-feedback
 * Analyze sentiment in employee feedback
 */
router.post('/ai/analyze-feedback', (req, res) => {
  try {
    const { feedbackText } = req.body;
    const sentiment = AIMLIntegration.NLPService.analyzeFeedbackSentiment(feedbackText);
    const topics = AIMLIntegration.NLPService.extractTopics(feedbackText);

    res.json({
      success: true,
      data: {
        sentiment,
        topics,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/ai/recommend-training/:employeeId
 * Get training recommendations
 */
router.get('/ai/recommend-training/:employeeId', (req, res) => {
  try {
    const employeeData = {
      position: 'Software Engineer',
    };

    const recommendations = AIMLIntegration.RecommendationEngine.recommendTrainings(employeeData);

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/ai/auto-approve-leave/:leaveRequestId
 * Check if leave request should be auto-approved
 */
router.get('/ai/auto-approve-leave/:leaveRequestId', (req, res) => {
  try {
    const leaveRequest = {
      numberOfDays: 3,
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    };

    const employeeData = {
      leaveBalance: 10,
      attendanceScore: 0.98,
      lastPerformanceRating: 'Excellent',
    };

    const decision = AIMLIntegration.IntelligentAutomation.shouldAutoApproveLeave(
      leaveRequest,
      employeeData
    );

    res.json({
      success: true,
      data: decision,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
