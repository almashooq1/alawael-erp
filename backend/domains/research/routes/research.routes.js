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
const { requireBranchAccess } = require('../../../middleware/branchScope.middleware');
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
// W1595 — server/approval-controlled fields a client must NOT self-set on a ResearchStudy.
// updateStudy forwarded req.body raw to findByIdAndUpdate (no whitelist), so a caller could
// PUT { status:'published', ethicsApproval:{ approved:true } } to bypass the ethics-review
// workflow (status transitions belong to the dedicated /:id/status endpoint; ethics approval
// is committee-controlled), or tamper createdBy/organizationId/isActive/statusHistory.
// NOTE: ResearchStudy has NO branchId field, so the :id routes are cross-branch (IDOR) —
// that needs a branchId schema migration + backfill and is FLAGGED for owner (not fixed here,
// since adding the field without backfill would hide every existing study).
const RESEARCH_SERVER_FIELDS = [
  '_id',
  'createdBy',
  'organizationId',
  'isActive',
  'status',
  'statusHistory',
  'ethicsApproval',
];
function stripStudyFields(body) {
  const clean = {};
  for (const k of Object.keys(body || {})) {
    if (!RESEARCH_SERVER_FIELDS.includes(k)) clean[k] = body[k];
  }
  return clean;
}
function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

// Create study
router.post(
  '/',
  validate(validateCreateStudy),
  asyncHandler(async (req, res) => {
    const data = await researchService.createStudy({
      ...req.body,
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
    const data = await researchService.getStudy(req.params.id);
    res.json({ success: true, data });
  })
);

// Update study
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = await researchService.updateStudy(req.params.id, stripStudyFields(req.body));
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
      req.body.reason
    );
    res.json({ success: true, data });
  })
);

// Enroll participant
router.post(
  '/:id/participants',
  validate(validateEnrollParticipant),
  asyncHandler(async (req, res) => {
    const data = await researchService.enrollParticipant(req.params.id, req.body);
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
      req.body.reason
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
      req.body.consentStatus
    );
    res.json({ success: true, data });
  })
);

// Milestones
router.post(
  '/:id/milestones',
  asyncHandler(async (req, res) => {
    const data = await researchService.addMilestone(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

// Publications
router.post(
  '/:id/publications',
  asyncHandler(async (req, res) => {
    const data = await researchService.addPublication(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

module.exports = router;
