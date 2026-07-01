/**
 * Clinical Research Routes — مسارات API للبحث السريري
 */

const express = require('express');
const router = express.Router();
// W1140 — cross-branch isolation (W269 doctrine): auto-enforce beneficiary
// ownership on every :beneficiaryId param + body-carried beneficiary ids.
// W1168 — requireBranchAccess populates req.branchScope BEFORE the guards
// below (without it every assertBranchMatch helper silently no-ops) +
// effectiveBranchScope pins branchId reads against query/body spoofing.
const {
  branchScopedBeneficiaryParam,
  bodyScopedBeneficiaryGuard,
  effectiveBranchScope,
} = require('../../../middleware/assertBranchMatch');
const { requireBranchAccess, branchFilter } = require('../../../middleware/branchScope.middleware');
router.use(requireBranchAccess); // W1168 — must run before the param/body guards
router.param('beneficiaryId', branchScopedBeneficiaryParam);
router.use(bodyScopedBeneficiaryGuard);
const { researchService } = require('../services/ResearchService');
const {
  validateCreateStudy,
  validateEnrollParticipant,
  validateTransitionStatus,
  validate,
} = require('../validators/research.validator');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}
// W1602 — anti-mass-assignment: lifecycle/audit/tenant fields are server-controlled and must
// not be settable from the study create/update payload (status moves only via PUT /:id/status;
// branchId + createdBy are stamped server-side; code is auto-generated). ethicsApproval is left
// editable (coordinator data entry) — gating IRB approval is a separate product decision.
const STUDY_STRIP = ['status', 'statusHistory', 'code', 'branchId', 'createdBy', 'isDeleted', 'isActive'];
function stripStudy(body) {
  const out = { ...(body || {}) };
  for (const k of STUDY_STRIP) delete out[k];
  return out;
}

// Create study
router.post(
  '/',
  validate(validateCreateStudy),
  asyncHandler(async (req, res) => {
    const data = await researchService.createStudy({
      ...stripStudy(req.body),
      createdBy: getUserId(req),
      branchId: effectiveBranchScope(req) || req.user?.branchId || req.body.branchId,
    });
    res.status(201).json({ success: true, data });
  })
);

// List studies
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await researchService.listStudies({
      status: req.query.status,
      type: req.query.type,
      piId: req.query.piId,
      keyword: req.query.keyword,
      page: req.query.page,
      limit: req.query.limit,
      branchFilter: branchFilter(req), // W1602 — restricted → own branch only
    });
    res.json({ success: true, ...result });
  })
);

// Dashboard
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const data = await researchService.getDashboard(
      effectiveBranchScope(req) || req.query.branchId || req.user?.branchId
    );
    res.json({ success: true, data });
  })
);

// Get study
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = await researchService.getStudy(req.params.id, branchFilter(req));
    if (!data) return res.status(404).json({ success: false, error: 'Study not found' });
    res.json({ success: true, data });
  })
);

// Update study
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = await researchService.updateStudy(
      req.params.id,
      stripStudy(req.body),
      branchFilter(req)
    );
    if (!data) return res.status(404).json({ success: false, error: 'Study not found' });
    res.json({ success: true, data });
  })
);

// Transition status
router.put(
  '/:id/status',
  validate(validateTransitionStatus),
  asyncHandler(async (req, res) => {
    const data = await researchService.transitionStatus(
      req.params.id,
      req.body.status,
      getUserId(req),
      req.body.reason,
      branchFilter(req)
    );
    res.json({ success: true, data });
  })
);

// Enroll participant
router.post(
  '/:id/participants',
  validate(validateEnrollParticipant),
  asyncHandler(async (req, res) => {
    const data = await researchService.enrollParticipant(req.params.id, req.body, branchFilter(req));
    res.json({ success: true, data });
  })
);

// Withdraw participant
router.post(
  '/:id/participants/:beneficiaryId/withdraw',
  asyncHandler(async (req, res) => {
    const data = await researchService.withdrawParticipant(
      req.params.id,
      req.params.beneficiaryId,
      req.body.reason,
      branchFilter(req)
    );
    res.json({ success: true, data });
  })
);

// Record consent
router.put(
  '/:id/participants/:beneficiaryId/consent',
  asyncHandler(async (req, res) => {
    const data = await researchService.recordConsent(
      req.params.id,
      req.params.beneficiaryId,
      req.body.consentStatus,
      branchFilter(req)
    );
    res.json({ success: true, data });
  })
);

// Milestones
router.post(
  '/:id/milestones',
  asyncHandler(async (req, res) => {
    const data = await researchService.addMilestone(req.params.id, req.body, branchFilter(req));
    res.json({ success: true, data });
  })
);

// Publications
router.post(
  '/:id/publications',
  asyncHandler(async (req, res) => {
    const data = await researchService.addPublication(req.params.id, req.body, branchFilter(req));
    res.json({ success: true, data });
  })
);

module.exports = router;
