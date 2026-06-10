/**
 * AR/VR Rehabilitation Routes — مسارات API لتأهيل الواقع الافتراضي / المعزز
 *
 * Order matters: every static path (/dashboard, /scenarios, /devices,
 * /analytics, /progress/:beneficiaryId) must be declared BEFORE the
 * catch-all `/:id` route, otherwise Express treats the literal as an
 * ObjectId and 404s.
 */

const express = require('express');
const router = express.Router();
// W1140 — cross-branch isolation (W269 doctrine): auto-enforce beneficiary
// ownership on every :beneficiaryId param + body-carried beneficiary ids.
const {
  branchScopedBeneficiaryParam,
  bodyScopedBeneficiaryGuard,
} = require('../../../middleware/assertBranchMatch');
router.param('beneficiaryId', branchScopedBeneficiaryParam);
router.use(bodyScopedBeneficiaryGuard);
const { arvrService } = require('../services/ARVRService');
const {
  validateCreateSession,
  validateCompleteSession,
  validateSafetyReport,
  validate,
} = require('../validators/ar-vr.validator');
const { listScenarios, getScenario } = require('../data/arvr-scenarios.catalog');
const { listDevices } = require('../data/arvr-devices.catalog');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

// Create
router.post(
  '/',
  validate(validateCreateSession),
  asyncHandler(async (req, res) => {
    const data = await arvrService.createSession({
      ...req.body,
      createdBy: getUserId(req),
      branchId: req.user?.branchId || req.body.branchId,
    });
    res.status(201).json({ success: true, data });
  })
);

// List
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await arvrService.listSessions({
      beneficiaryId: req.query.beneficiaryId,
      therapistId: req.query.therapistId,
      status: req.query.status,
      technologyType: req.query.technologyType,
      sessionType: req.query.sessionType,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, ...result });
  })
);

// ─── Static-prefixed routes (declared BEFORE /:id) ─────────────────────────

// Dashboard
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const data = await arvrService.getDashboard(req.query.branchId || req.user?.branchId);
    res.json({ success: true, data });
  })
);

// Analytics — trend window
router.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const data = await arvrService.getAnalytics({
      days: req.query.days ? Number(req.query.days) : 30,
      branchId: req.query.branchId || req.user?.branchId,
    });
    res.json({ success: true, data });
  })
);

// Scenarios catalog
router.get(
  '/scenarios',
  asyncHandler(async (req, res) => {
    const items = listScenarios({
      specialty: req.query.specialty,
      technologyType: req.query.technologyType || req.query.sessionType,
      minAge: req.query.minAge ? Number(req.query.minAge) : undefined,
      maxAge: req.query.maxAge ? Number(req.query.maxAge) : undefined,
    });
    res.json({ success: true, data: items, total: items.length });
  })
);

router.get(
  '/scenarios/:scenarioId',
  asyncHandler(async (req, res) => {
    const scenario = getScenario(req.params.scenarioId);
    if (!scenario) return res.status(404).json({ success: false, error: 'سيناريو غير موجود' });
    res.json({ success: true, data: scenario });
  })
);

// Devices catalog
router.get(
  '/devices',
  asyncHandler(async (req, res) => {
    const items = listDevices({
      formFactor: req.query.formFactor,
      handTracking:
        req.query.handTracking === 'true'
          ? true
          : req.query.handTracking === 'false'
            ? false
            : undefined,
    });
    res.json({ success: true, data: items, total: items.length });
  })
);

// Beneficiary progress
router.get(
  '/progress/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const data = await arvrService.getBeneficiaryProgress(
      req.params.beneficiaryId,
      req.query.scenarioId
    );
    res.json({ success: true, data });
  })
);

// ─── /:id catch-all (declared LAST) ────────────────────────────────────────

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = await arvrService.getSession(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.put(
  '/:id/start',
  asyncHandler(async (req, res) => {
    const data = await arvrService.startSession(req.params.id);
    res.json({ success: true, data });
  })
);
router.put(
  '/:id/pause',
  asyncHandler(async (req, res) => {
    const data = await arvrService.pauseSession(req.params.id);
    res.json({ success: true, data });
  })
);
router.put(
  '/:id/resume',
  asyncHandler(async (req, res) => {
    const data = await arvrService.resumeSession(req.params.id);
    res.json({ success: true, data });
  })
);
router.put(
  '/:id/complete',
  validate(validateCompleteSession),
  asyncHandler(async (req, res) => {
    const data = await arvrService.completeSession(req.params.id, req.body);
    res.json({ success: true, data });
  })
);
router.put(
  '/:id/abort',
  asyncHandler(async (req, res) => {
    const data = await arvrService.abortSession(req.params.id, req.body?.reason);
    res.json({ success: true, data });
  })
);
router.put(
  '/:id/safety',
  validate(validateSafetyReport),
  asyncHandler(async (req, res) => {
    const data = await arvrService.recordSafety(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

module.exports = router;
