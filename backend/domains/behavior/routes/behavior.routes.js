/**
 * Behavior Management Routes — مسارات API لإدارة السلوك
 */

const express = require('express');
const router = express.Router();
// W1140 — cross-branch isolation (W269 doctrine): auto-enforce beneficiary
// ownership on every :beneficiaryId param + body-carried beneficiary ids.
// W1155 — close the record/plan-keyed :id gap + list/dashboard branch scoping:
//   - /records/:id → :recordId, /plans/:id → :planId so ownership hooks fire
//   - lists + dashboard pass effectiveBranchScope(req) (ignores ?branchId= spoofing)
const {
  branchScopedBeneficiaryParam,
  branchScopedResourceParam,
  bodyScopedBeneficiaryGuard,
  effectiveBranchScope,
} = require('../../../middleware/assertBranchMatch');
router.param('beneficiaryId', branchScopedBeneficiaryParam);
router.param(
  'recordId',
  branchScopedResourceParam({
    modelName: 'BehaviorRecord',
    label: 'behavior record',
    loadModel: () => require('../models/BehaviorRecord'),
  })
);
router.param(
  'planId',
  branchScopedResourceParam({
    modelName: 'BehaviorPlan',
    label: 'behavior plan',
    loadModel: () => require('../models/BehaviorPlan'),
  })
);
router.use(bodyScopedBeneficiaryGuard);
const { behaviorService } = require('../services/BehaviorService');
const {
  validateCreateRecord,
  validateCreatePlan,
  validateUpdatePlan,
  validateAddReview,
  validate,
} = require('../validators/behavior.validator');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

// W1577 — server-owned fields a client must NOT self-set. The validators only
// enum-check status — they do NOT whitelist — so the raw ...req.body spread let a
// caller SELF-APPROVE a behavior plan (status:'active' + approvedBy/approvedAt bypass
// the /plans/:planId/approve endpoint — a clinical authorization bypass), tamper
// version/isDeleted/createdBy, or forge a reviewed behavior record.
const PLAN_SERVER_FIELDS = ['_id', 'branchId', 'createdBy', 'approvedBy', 'approvedAt', 'version', 'isDeleted'];
const RECORD_SERVER_FIELDS = ['_id', 'branchId', 'reportedBy', 'status', 'reviewedBy', 'reviewedAt', 'reviewNotes'];
function stripFields(body, fields) {
  const clean = {};
  for (const k of Object.keys(body || {})) {
    if (!fields.includes(k)) clean[k] = body[k];
  }
  return clean;
}
function stripPlanFields(body) {
  const clean = stripFields(body, PLAN_SERVER_FIELDS);
  // activation is approval-only: /plans/:planId/approve is the sole path to 'active'
  // (it also stamps approvedBy + approvedAt). Block self-activation via create/update.
  if (clean.status === 'active') delete clean.status;
  return clean;
}

/* ── Records ── */
router.post(
  '/records',
  validate(validateCreateRecord),
  asyncHandler(async (req, res) => {
    const data = await behaviorService.createRecord({
      ...stripFields(req.body, RECORD_SERVER_FIELDS),
      reportedBy: getUserId(req),
      // W1171 — pin: restricted callers cannot spoof a foreign branch
      branchId: effectiveBranchScope(req) || req.user?.branchId || req.body.branchId,
    });
    res.status(201).json({ success: true, data });
  })
);
router.get(
  '/records',
  asyncHandler(async (req, res) => {
    const result = await behaviorService.listRecords({
      beneficiaryId: req.query.beneficiaryId,
      behaviorPlanId: req.query.behaviorPlanId,
      topography: req.query.topography,
      severity: req.query.severity,
      from: req.query.from,
      to: req.query.to,
      page: req.query.page,
      limit: req.query.limit,
      branchId: effectiveBranchScope(req),
    });
    res.json({ success: true, ...result });
  })
);
router.get(
  '/records/:recordId',
  asyncHandler(async (req, res) => {
    const data = await behaviorService.getRecord(req.params.recordId);
    res.json({ success: true, data });
  })
);
router.put(
  '/records/:recordId/review',
  asyncHandler(async (req, res) => {
    const data = await behaviorService.reviewRecord(req.params.recordId, {
      reviewerId: getUserId(req),
      notes: req.body.notes,
    });
    res.json({ success: true, data });
  })
);

/* ── Plans ── */
router.post(
  '/plans',
  validate(validateCreatePlan),
  asyncHandler(async (req, res) => {
    const data = await behaviorService.createPlan({
      ...stripPlanFields(req.body),
      createdBy: getUserId(req),
      // W1171 — pin: restricted callers cannot spoof a foreign branch
      branchId: effectiveBranchScope(req) || req.user?.branchId || req.body.branchId,
    });
    res.status(201).json({ success: true, data });
  })
);
router.get(
  '/plans',
  asyncHandler(async (req, res) => {
    const result = await behaviorService.listPlans({
      beneficiaryId: req.query.beneficiaryId,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
      branchId: effectiveBranchScope(req),
    });
    res.json({ success: true, ...result });
  })
);
router.get(
  '/plans/:planId',
  asyncHandler(async (req, res) => {
    const data = await behaviorService.getPlan(req.params.planId);
    res.json({ success: true, data });
  })
);
router.put(
  '/plans/:planId',
  validate(validateUpdatePlan),
  asyncHandler(async (req, res) => {
    const data = await behaviorService.updatePlan(req.params.planId, stripPlanFields(req.body));
    res.json({ success: true, data });
  })
);
router.put(
  '/plans/:planId/approve',
  asyncHandler(async (req, res) => {
    const data = await behaviorService.approvePlan(req.params.planId, getUserId(req));
    res.json({ success: true, data });
  })
);
router.post(
  '/plans/:planId/reviews',
  validate(validateAddReview),
  asyncHandler(async (req, res) => {
    const data = await behaviorService.addReview(req.params.planId, {
      ...req.body,
      reviewedBy: getUserId(req),
    });
    res.json({ success: true, data });
  })
);

/* ── Analytics ── */
router.get(
  '/analytics/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const data = await behaviorService.getBeneficiaryAnalytics(
      req.params.beneficiaryId,
      parseInt(req.query.days) || 90
    );
    res.json({ success: true, data });
  })
);
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    // W1155 — effectiveBranchScope ignores ?branchId= spoofing for restricted callers
    const data = await behaviorService.getDashboard(
      effectiveBranchScope(req) || req.user?.branchId
    );
    res.json({ success: true, data });
  })
);

module.exports = router;
