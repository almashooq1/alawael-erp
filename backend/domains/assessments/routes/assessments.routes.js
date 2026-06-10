/**
 * Assessments Routes — مسارات API للتقييمات السريرية
 *
 * الهدف السريري: تمكين الأخصائي من إنشاء وتتبع التقييمات السريرية
 * المرتبطة بالمستفيد وحلقة الرعاية.
 *
 * @module domains/assessments/routes/assessments.routes
 */

const express = require('express');
const router = express.Router();
// W1140 — cross-branch isolation (W269 doctrine): auto-enforce beneficiary
// ownership on every :beneficiaryId param + body-carried beneficiary ids.
// W1155 — close the assessment-keyed :id gap + list/dashboard branch scoping:
//   - :id renamed :assessmentId so the ownership hook actually fires
//   - list + dashboard pass effectiveBranchScope(req) (ignores ?branchId= spoofing)
const {
  branchScopedBeneficiaryParam,
  branchScopedResourceParam,
  bodyScopedBeneficiaryGuard,
  effectiveBranchScope,
} = require('../../../middleware/assertBranchMatch');
router.param('beneficiaryId', branchScopedBeneficiaryParam);
router.param(
  'assessmentId',
  branchScopedResourceParam({
    modelName: 'ClinicalAssessment',
    label: 'assessment',
    loadModel: () => require('../models/ClinicalAssessment'),
  })
);
router.use(bodyScopedBeneficiaryGuard);
const {
  validateCreateAssessment,
  validateUpdateAssessment,
  validate,
} = require('../validators/assessments.validator');

let assessmentsService;
try {
  ({ assessmentsService } = require('../services/AssessmentsService'));
} catch (_e) {
  assessmentsService = null;
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ─── Service guard ───────────────────────────────────────────────────────── */
const requireService = (req, res, next) => {
  if (!assessmentsService) {
    return res.status(503).json({ success: false, message: 'Assessments service unavailable' });
  }
  next();
};

/* ─── POST /assessments — Create assessment ──────────────────────────────── */
router.post(
  '/',
  requireService,
  validate(validateCreateAssessment),
  asyncHandler(async (req, res) => {
    const assessment = await assessmentsService.createAssessment(req.body);
    res.status(201).json({ success: true, data: assessment });
  })
);

/* ─── GET /assessments — List assessments ────────────────────────────────── */
router.get(
  '/',
  requireService,
  asyncHandler(async (req, res) => {
    const { beneficiaryId, beneficiary, category, type, status, limit = 20, skip = 0 } = req.query;
    const filter = {
      beneficiary: beneficiary || beneficiaryId,
      category: category || type,
      status,
      // W1155 — restricted callers are pinned to their own branch
      branchId: effectiveBranchScope(req),
    };
    const { data, total } = await assessmentsService.listAssessments(filter, {
      limit: Number(limit),
      skip: Number(skip),
    });
    res.json({ success: true, data, total, skip: Number(skip), limit: Number(limit) });
  })
);

/* ─── GET /assessments/dashboard — Summary stats ─────────────────────────── */
router.get(
  '/dashboard',
  requireService,
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const stats = await assessmentsService.getDashboard({
      from,
      to,
      branchId: effectiveBranchScope(req),
    });
    res.json({ success: true, data: stats });
  })
);

/* ─── GET /assessments/beneficiary/:beneficiaryId — By beneficiary ─────── */
router.get(
  '/beneficiary/:beneficiaryId',
  requireService,
  asyncHandler(async (req, res) => {
    const { limit = 50, skip = 0 } = req.query;
    const { data, total } = await assessmentsService.getBeneficiaryAssessments(
      req.params.beneficiaryId,
      {
        limit: Number(limit),
        skip: Number(skip),
      }
    );
    res.json({ success: true, data, total });
  })
);

/* ─── GET /assessments/:assessmentId — Single assessment ─────────────────── */
router.get(
  '/:assessmentId',
  requireService,
  asyncHandler(async (req, res) => {
    const assessment = await assessmentsService.getAssessmentById(req.params.assessmentId);
    res.json({ success: true, data: assessment });
  })
);

/* ─── PUT /assessments/:assessmentId — Update assessment ─────────────────── */
router.put(
  '/:assessmentId',
  requireService,
  validate(validateUpdateAssessment),
  asyncHandler(async (req, res) => {
    const assessment = await assessmentsService.updateAssessment(req.params.assessmentId, req.body);
    res.json({ success: true, data: assessment });
  })
);

/* ─── PUT /assessments/:assessmentId/complete — Complete assessment ──────── */
router.put(
  '/:assessmentId/complete',
  requireService,
  asyncHandler(async (req, res) => {
    const assessment = await assessmentsService.completeAssessment(
      req.params.assessmentId,
      req.body
    );
    res.json({ success: true, data: assessment });
  })
);

module.exports = router;
