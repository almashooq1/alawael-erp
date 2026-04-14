/**
 * ALAWAEL ERP — PHASE 21: WORKFORCE ANALYTICS & PLANNING ROUTES
 * تحليلات القوى العاملة والتخطيط
 *
 * 18 API endpoints:
 *   📊 Dashboard:       Workforce health score, department analytics
 *   📈 Headcount:       Create / approve / list headcount plans
 *   🔮 Forecasting:     Create forecast, update accuracy
 *   🔄 Succession:      Create plan, add successors
 *   🎯 Skills:          Create mapping, update proficiency
 *   📉 Retention:       Analyze retention, predict attrition risk
 *   💰 Compensation:    Salary bands, compensation analysis, adjustments
 *   📋 Reports:         Generate workforce reports
 *
 * Base path: /api/workforce-analytics  (dual-mounted with /api/v1/workforce-analytics)
 */

const express = require('express');
const router = express.Router();
const { authenticateToken: authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

// ── Service ──
const WorkforceAnalyticsService = require('../services/workforce-analytics.service');
const { safeError } = require('../utils/safeError');
const service = new WorkforceAnalyticsService();

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD & HEALTH — لوحة المعلومات
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /health-score — Workforce health score
 */
router.get('/health-score', authenticate, async (req, res) => {
  try {
    const data = service.getWorkforceHealthScore();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Workforce health-score error');
  }
});

/**
 * GET /analytics/department/:departmentId — Department analytics
 */
router.get('/analytics/department/:departmentId', authenticate, async (req, res) => {
  try {
    const data = service.getDepartmentAnalytics(req.params.departmentId);
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Department analytics error');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// HEADCOUNT PLANNING — تخطيط القوى العاملة
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /headcount-plans — Create headcount plan
 */
router.post(
  '/headcount-plans',
  authenticate,
  authorize(['admin', 'system_admin', 'hr_manager']),
  async (req, res) => {
    try {
      const plan = service.createHeadcountPlan(req.body);
      res.status(201).json({ success: true, data: plan });
    } catch (err) {
      logger.error('Create headcount plan error:', err.message);
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

/**
 * GET /headcount-plans — List headcount plans
 */
router.get('/headcount-plans', authenticate, async (_req, res) => {
  try {
    res.json({ success: true, data: service.headcountPlans || [] });
  } catch (err) {
    safeError(res, err, 'workforce-analytics');
  }
});

/**
 * PUT /headcount-plans/:planId/approve — Approve/reject headcount plan
 */
router.put(
  '/headcount-plans/:planId/approve',
  authenticate,
  authorize(['admin', 'system_admin', 'ceo']),
  async (req, res) => {
    try {
      const plan = service.approveHeadcountPlan(req.params.planId, req.body);
      res.json({ success: true, data: plan });
    } catch (err) {
      logger.error('Approve headcount plan error:', err.message);
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// WORKFORCE FORECASTING — التنبؤ بالقوى العاملة
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /forecasts — Create workforce forecast
 */
router.post(
  '/forecasts',
  authenticate,
  authorize(['admin', 'system_admin', 'hr_manager', 'analyst']),
  async (req, res) => {
    try {
      const forecast = service.createForecast(req.body);
      res.status(201).json({ success: true, data: forecast });
    } catch (err) {
      logger.error('Create forecast error:', err.message);
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

/**
 * GET /forecasts — List forecasts
 */
router.get('/forecasts', authenticate, async (_req, res) => {
  try {
    res.json({ success: true, data: service.forecasts || [] });
  } catch (err) {
    safeError(res, err, 'workforce-analytics');
  }
});

/**
 * PUT /forecasts/:forecastId/accuracy — Update forecast accuracy
 */
router.put('/forecasts/:forecastId/accuracy', authenticate, async (req, res) => {
  try {
    const forecast = service.updateForecastAccuracy(req.params.forecastId, req.body);
    res.json({ success: true, data: forecast });
  } catch (err) {
    logger.error('Update forecast accuracy error:', err.message);
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SUCCESSION PLANNING — تخطيط التعاقب الوظيفي
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /succession-plans — Create succession plan
 */
router.post(
  '/succession-plans',
  authenticate,
  authorize(['admin', 'system_admin', 'hr_manager']),
  async (req, res) => {
    try {
      const plan = service.createSuccessionPlan(req.body);
      res.status(201).json({ success: true, data: plan });
    } catch (err) {
      logger.error('Create succession plan error:', err.message);
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

/**
 * GET /succession-plans — List succession plans
 */
router.get('/succession-plans', authenticate, async (_req, res) => {
  try {
    res.json({ success: true, data: service.successionPlans || [] });
  } catch (err) {
    safeError(res, err, 'workforce-analytics');
  }
});

/**
 * POST /succession-plans/:planId/successors — Add successor
 */
router.post(
  '/succession-plans/:planId/successors',
  authenticate,
  authorize(['admin', 'system_admin', 'hr_manager']),
  async (req, res) => {
    try {
      const successor = service.addSuccessor(req.params.planId, req.body);
      res.status(201).json({ success: true, data: successor });
    } catch (err) {
      logger.error('Add successor error:', err.message);
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// SKILLS & COMPETENCY — المهارات والكفاءات
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /skills — Create skill mapping
 */
router.post('/skills', authenticate, async (req, res) => {
  try {
    const mapping = service.createSkillMapping(req.body);
    res.status(201).json({ success: true, data: mapping });
  } catch (err) {
    logger.error('Create skill mapping error:', err.message);
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

/**
 * PUT /skills/:skillMappingId — Update skill proficiency
 */
router.put('/skills/:skillMappingId', authenticate, async (req, res) => {
  try {
    const mapping = service.updateSkillProficiency(req.params.skillMappingId, req.body);
    res.json({ success: true, data: mapping });
  } catch (err) {
    logger.error('Update skill proficiency error:', err.message);
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// RETENTION & ATTRITION — الاحتفاظ بالموظفين ومعدل الدوران
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /retention/analyze — Analyze retention
 */
router.post('/retention/analyze', authenticate, async (req, res) => {
  try {
    const analysis = service.analyzeRetention(req.body);
    res.status(201).json({ success: true, data: analysis });
  } catch (err) {
    logger.error('Analyze retention error:', err.message);
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

/**
 * POST /attrition-risk — Predict attrition risk for employee
 */
router.post('/attrition-risk', authenticate, async (req, res) => {
  try {
    const risk = service.predictAttritionRisk(req.body);
    res.json({ success: true, data: risk });
  } catch (err) {
    logger.error('Predict attrition risk error:', err.message);
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// COMPENSATION & BENEFITS — التعويضات والمزايا
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /salary-bands — Create salary band
 */
router.post(
  '/salary-bands',
  authenticate,
  authorize(['admin', 'system_admin', 'hr_manager']),
  async (req, res) => {
    try {
      const band = service.createSalaryBand(req.body);
      res.status(201).json({ success: true, data: band });
    } catch (err) {
      logger.error('Create salary band error:', err.message);
      res.status(400).json({ success: false, error: safeError(err) });
    }
  }
);

/**
 * GET /salary-bands — List salary bands
 */
router.get('/salary-bands', authenticate, async (_req, res) => {
  try {
    res.json({ success: true, data: service.salaryBands || [] });
  } catch (err) {
    safeError(res, err, 'workforce-analytics');
  }
});

/**
 * POST /compensation/analyze — Analyze compensation
 */
router.post('/compensation/analyze', authenticate, async (req, res) => {
  try {
    const analysis = service.analyzeCompensation(req.body);
    res.status(201).json({ success: true, data: analysis });
  } catch (err) {
    logger.error('Analyze compensation error:', err.message);
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

/**
 * POST /compensation/adjustments — Identify compensation adjustments
 */
router.post('/compensation/adjustments', authenticate, async (req, res) => {
  try {
    const adjustment = service.identifyCompensationAdjustments(req.body.employeeId, req.body);
    res.json({ success: true, data: adjustment });
  } catch (err) {
    logger.error('Compensation adjustments error:', err.message);
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// WORKFORCE REPORTS — تقارير القوى العاملة
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /reports — Generate workforce report
 */
router.post('/reports', authenticate, async (req, res) => {
  try {
    const report = service.generateWorkforceReport(req.body);
    res.status(201).json({ success: true, data: report });
  } catch (err) {
    logger.error('Generate workforce report error:', err.message);
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

module.exports = router;
