/**
 * ALAWAEL ERP — PHASE 22: LEARNING & DEVELOPMENT (LMS) ROUTES
 * التدريب الإلكتروني للموظفين — دورات أونلاين، اختبارات، شهادات
 *
 * 20 API endpoints:
 *   📚 Programs:        Create / list / get / update / archive learning programs
 *   👤 Enrollment:      Enroll / status / get / mandatory-tracking
 *   📊 Analytics:       Completion rates, assessment scores, skill improvement, ROI, reports
 *   🏅 Certification:   Define path, track exam, manage license renewal
 *   🔗 Integration:     Third-party platform connect, content sync
 *
 * Base path: /api/learning-development  (dual-mounted with /api/v1/learning-development)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// ── Service ──
const LearningDevelopmentService = require('../services/learning-development.service');
const { safeError } = require('../utils/safeError');
const service = new LearningDevelopmentService();

// ══════════════════════════════════════════════════════════════════════════════
// LEARNING PROGRAMS — البرامج التعليمية
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST / — Create a learning program
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const data = service.createLearningProgram(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Create learning program error:', err.message);
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

/**
 * GET / — List learning programs (with filters)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const data = service.listPrograms(req.query);
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'List programs error');
  }
});

/**
 * GET /programs/:programId — Get a single program
 */
router.get('/programs/:programId', authenticate, async (req, res) => {
  try {
    const data = service.getProgram(req.params.programId);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Get program error:', err.message);
    res.status(404).json({ success: false, error: safeError(err) });
  }
});

/**
 * PUT /programs/:programId — Update a program
 */
router.put('/programs/:programId', authenticate, async (req, res) => {
  try {
    const data = service.updateProgram(req.params.programId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Update program error:', err.message);
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

/**
 * PATCH /programs/:programId/archive — Archive a program
 */
router.patch('/programs/:programId/archive', authenticate, async (req, res) => {
  try {
    const data = service.archiveProgram(req.params.programId);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Archive program error:', err.message);
    res.status(404).json({ success: false, error: safeError(err) });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ENROLLMENT — التسجيل والتتبع
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /enrollments — Enroll an employee in a program
 */
router.post('/enrollments', authenticate, async (req, res) => {
  try {
    const data = service.enrollEmployee(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Enroll employee error:', err.message);
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

/**
 * PATCH /enrollments/:enrollmentId/status — Update enrollment status / progress
 */
router.patch('/enrollments/:enrollmentId/status', authenticate, async (req, res) => {
  try {
    const { status, ...additionalData } = req.body;
    const data = service.updateEnrollmentStatus(req.params.enrollmentId, status, additionalData);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Update enrollment status error:', err.message);
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

/**
 * GET /enrollments/:enrollmentId — Get enrollment details
 */
router.get('/enrollments/:enrollmentId', authenticate, async (req, res) => {
  try {
    const data = service.getEnrollment(req.params.enrollmentId);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Get enrollment error:', err.message);
    res.status(404).json({ success: false, error: safeError(err) });
  }
});

/**
 * GET /enrollments/mandatory/:employeeId — Track mandatory training
 */
router.get('/enrollments/mandatory/:employeeId', authenticate, async (req, res) => {
  try {
    const data = service.trackMandatoryTraining(req.params.employeeId);
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Track mandatory training error');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS — التحليلات والتقارير
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /analytics/completion — Completion rates
 */
router.get('/analytics/completion', authenticate, async (req, res) => {
  try {
    const data = service.getCompletionRates(req.query);
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Completion rates error');
  }
});

/**
 * GET /analytics/scores/:employeeId — Assessment scores for employee
 */
router.get('/analytics/scores/:employeeId', authenticate, async (req, res) => {
  try {
    const data = service.getAssessmentScores(req.params.employeeId);
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Assessment scores error');
  }
});

/**
 * GET /analytics/skills/:employeeId — Skill improvement tracking
 */
router.get('/analytics/skills/:employeeId', authenticate, async (req, res) => {
  try {
    const data = service.trackSkillImprovement(req.params.employeeId);
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Skill improvement error');
  }
});

/**
 * GET /analytics/roi/:programId — Learning ROI for a program
 */
router.get('/analytics/roi/:programId', authenticate, async (req, res) => {
  try {
    const data = service.measureLearningROI(req.params.programId);
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Learning ROI error');
  }
});

/**
 * GET /analytics/report — Generate learning report
 */
router.get('/analytics/report', authenticate, async (req, res) => {
  try {
    const data = service.generateLearningReport(req.query);
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Learning report error');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// CERTIFICATION — الشهادات والتراخيص
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /certifications — Define a certification path
 */
router.post('/certifications', authenticate, async (req, res) => {
  try {
    const data = service.defineCertificationPath(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Define certification error:', err.message);
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

/**
 * POST /certifications/:certificationId/exams — Track exam status
 */
router.post('/certifications/:certificationId/exams', authenticate, async (req, res) => {
  try {
    const { employeeId, ...examData } = req.body;
    const data = service.trackExamStatus(employeeId, req.params.certificationId, examData);
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Track exam error:', err.message);
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

/**
 * POST /certifications/:certificationId/renewal — Manage license renewal
 */
router.post('/certifications/:certificationId/renewal', authenticate, async (req, res) => {
  try {
    const { employeeId, ...renewalData } = req.body;
    const data = service.manageLicenseRenewal(employeeId, req.params.certificationId, renewalData);
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('License renewal error:', err.message);
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// EXTERNAL INTEGRATION — التكامل الخارجي
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /integrations — Connect third-party learning platform
 */
router.post('/integrations', authenticate, async (req, res) => {
  try {
    const data = service.integrateThirdPartyPlatform(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error('Integration connect error:', err.message);
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

/**
 * POST /integrations/:integrationId/sync — Sync learning content
 */
router.post('/integrations/:integrationId/sync', authenticate, async (req, res) => {
  try {
    const data = service.syncLearningContent(req.params.integrationId);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Content sync error:', err.message);
    res.status(400).json({ success: false, error: safeError(err) });
  }
});

module.exports = router;
