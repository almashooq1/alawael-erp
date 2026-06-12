/**
 * Care Plans Routes — مسارات API لخطط الرعاية الموحدة
 *
 * الهدف السريري: إدارة خطط الرعاية المتكاملة المرتبطة
 * بالمستفيد والحلقة العلاجية والأهداف والتدخلات.
 *
 * @module domains/care-plans/routes/care-plans.routes
 */

const express = require('express');
const router = express.Router();
// W1140 — cross-branch isolation (W269 doctrine): auto-enforce beneficiary
// ownership on every :beneficiaryId param + body-carried beneficiary ids.
// W1152 — plan-keyed ownership: every :planId param loads the plan's own
// branchId and asserts it for restricted callers; list/dashboard endpoints
// scope through effectiveBranchScope() so ?branchId= spoofing is closed.
const {
  branchScopedBeneficiaryParam,
  branchScopedResourceParam,
  bodyScopedBeneficiaryGuard,
  effectiveBranchScope,
} = require('../../../middleware/assertBranchMatch');
router.param('beneficiaryId', branchScopedBeneficiaryParam);
router.param(
  'planId',
  branchScopedResourceParam({
    modelName: 'UnifiedCarePlan',
    label: 'care plan',
    loadModel: () => require('../models/UnifiedCarePlan'),
  })
);
router.use(bodyScopedBeneficiaryGuard);
const {
  validateCreateCarePlan,
  validateUpdateCarePlan,
  validate,
} = require('../validators/care-plans.validator');

let carePlansService;
try {
  ({ carePlansService } = require('../services/CarePlansService'));
} catch (_e) {
  carePlansService = null;
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const requireService = (req, res, next) => {
  if (!carePlansService) {
    return res.status(503).json({ success: false, message: 'CarePlansService unavailable' });
  }
  next();
};

/* ─── POST /care-plans — Create care plan ────────────────────────────────── */
router.post(
  '/',
  requireService,
  validate(validateCreateCarePlan),
  asyncHandler(async (req, res) => {
    const plan = await carePlansService.createPlan(req.body);
    res.status(201).json({ success: true, data: plan });
  })
);

/* ─── GET /care-plans — List care plans ─────────────────────────────────── */
router.get(
  '/',
  requireService,
  asyncHandler(async (req, res) => {
    const { limit = 20, skip = 0, ...filter } = req.query;
    // W1152 — restricted callers are pinned to their own branch (overrides
    // any ?branchId= the caller may have supplied in the query string)
    filter.branchId = effectiveBranchScope(req);
    const result = await carePlansService.listPlans(filter, { limit, skip });
    res.json({ success: true, ...result, skip: Number(skip), limit: Number(limit) });
  })
);

/* ─── GET /care-plans/dashboard — Stats ─────────────────────────────────── */
router.get(
  '/dashboard',
  requireService,
  asyncHandler(async (req, res) => {
    // W1152 — dashboard counts scoped to the caller's branch when restricted
    const data = await carePlansService.getDashboard({
      branchId: effectiveBranchScope(req),
    });
    res.json({ success: true, data });
  })
);

/* ─── GET /care-plans/beneficiary/:beneficiaryId — By beneficiary ──────── */
router.get(
  '/beneficiary/:beneficiaryId',
  requireService,
  asyncHandler(async (req, res) => {
    const result = await carePlansService.getBeneficiaryPlans(req.params.beneficiaryId);
    res.json({ success: true, ...result });
  })
);

/* ─── GET /care-plans/suggest-draft/:beneficiaryId — W1264 ─────────
 * مؤلّف الخطة الذكي: READ-ONLY proposal composed from the pathway bundle
 * (disability-matched) + the LIVE GoalBank (age-windowed Arabic SMART
 * texts) + the programs library (evidence-ranked, contraindication-aware).
 * Refuse-to-fabricate: the clinician reviews/edits — nothing auto-saves. */
router.get(
  '/suggest-draft/:beneficiaryId',
  requireService,
  asyncHandler(async (req, res) => {
    const { suggestDraftPlan } = require('../../../services/carePlanComposer.service');
    const proposal = await suggestDraftPlan(req.params.beneficiaryId);
    res.json({ success: true, data: proposal });
  })
);

/* ─── POST /care-plans/from-proposal/:beneficiaryId — W1266 ─────────
 * The clinician-approved bridge: composes (or accepts) the W1264 proposal,
 * applies the clinician's selections, resolves the OPEN episode, and
 * creates a REAL DRAFT UnifiedCarePlan. Body (all optional):
 *   { goalIndexes?: number[], interventionIndexes?: number[] }
 * 409 when no open episode exists. Draft only — never activates. */
router.post(
  '/from-proposal/:beneficiaryId',
  requireService,
  asyncHandler(async (req, res) => {
    const { createFromProposal } = require('../../../services/carePlanComposer.service');
    const result = await createFromProposal({
      beneficiaryId: req.params.beneficiaryId,
      actorId: req.user ? req.user.id || req.user._id : null,
      selections: {
        goalIndexes: Array.isArray(req.body.goalIndexes) ? req.body.goalIndexes : undefined,
        interventionIndexes: Array.isArray(req.body.interventionIndexes)
          ? req.body.interventionIndexes
          : undefined,
      },
    });
    res.status(201).json({ success: true, data: result });
  })
);

/* ─── GET /care-plans/:planId/audit-trail — W1257 (ADR-040 (b)) ────
 * PDPL Art.13 compliance timeline for a UI-authored plan: lifecycle +
 * hash-chained signatures (W1252) + family-notification attempts (W1254),
 * with integrity verification. Read-only; role-based redaction via
 * ?redactFor=family|executive|clinical (defaults to clinical). */
router.get(
  '/:planId/audit-trail',
  requireService,
  asyncHandler(async (req, res) => {
    const {
      buildUnifiedAuditTrail,
    } = require('../../../intelligence/care-plan-audit-trail.service');
    const plan = await carePlansService.getPlanById(req.params.planId);
    const allowed = ['clinical', 'family', 'executive'];
    const redactFor = allowed.includes(String(req.query.redactFor))
      ? String(req.query.redactFor)
      : 'clinical';
    const trail = buildUnifiedAuditTrail(plan, { redactFor });
    res.json({ success: true, data: trail });
  })
);

/* ─── GET /care-plans/:planId ─────────────────────────────────── */
router.get(
  '/:planId',
  requireService,
  asyncHandler(async (req, res) => {
    const plan = await carePlansService.getPlanById(req.params.planId);
    res.json({ success: true, data: plan });
  })
);

/* ─── PUT /care-plans/:planId — Update ───────────────────────────── */
router.put(
  '/:planId',
  requireService,
  validate(validateUpdateCarePlan),
  asyncHandler(async (req, res) => {
    const plan = await carePlansService.updatePlan(req.params.planId, req.body);
    res.json({ success: true, data: plan });
  })
);

/* ─── PUT /care-plans/:planId/activate — Activate care plan ───────────── */
router.put(
  '/:planId/activate',
  requireService,
  asyncHandler(async (req, res) => {
    // W1252 — pass the activating actor so the integrity layer records the
    // hash-chained 'activate' signature + seals the clinical body.
    const plan = await carePlansService.activatePlan(req.params.planId, {
      actor: req.user ? { id: req.user.id || req.user._id, role: req.user.role } : undefined,
    });
    res.json({ success: true, data: plan });
  })
);

/* ─── PUT /care-plans/:planId/complete — Complete care plan ───────────── */
router.put(
  '/:planId/complete',
  requireService,
  asyncHandler(async (req, res) => {
    const plan = await carePlansService.completePlan(req.params.planId, req.body);
    res.json({ success: true, data: plan });
  })
);

/* ─── POST /care-plans/:planId/goals — Add goal to plan ──────────────── */
router.post(
  '/:planId/goals',
  requireService,
  asyncHandler(async (req, res) => {
    const plan = await carePlansService.addGoal(req.params.planId, req.body);
    res.json({ success: true, data: plan });
  })
);

module.exports = router;
