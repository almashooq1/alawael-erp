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
    const stats = await assessmentsService.getDashboard({ from, to });
    res.json({ success: true, data: stats });
  })
);

/* ─── GET /assessments/beneficiary/:id — By beneficiary ─────────────────── */
router.get(
  '/beneficiary/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const { limit = 50, skip = 0 } = req.query;
    const { data, total } = await assessmentsService.getBeneficiaryAssessments(req.params.id, {
      limit: Number(limit),
      skip: Number(skip),
    });
    res.json({ success: true, data, total });
  })
);

/* ─── GET /assessments/:id — Single assessment ───────────────────────────── */
router.get(
  '/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const assessment = await assessmentsService.getAssessmentById(req.params.id);
    res.json({ success: true, data: assessment });
  })
);

/* ─── PUT /assessments/:id — Update assessment ───────────────────────────── */
router.put(
  '/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const assessment = await assessmentsService.updateAssessment(req.params.id, req.body);
    res.json({ success: true, data: assessment });
  })
);

/* ─── PUT /assessments/:id/complete — Complete assessment ────────────────── */
router.put(
  '/:id/complete',
  requireService,
  asyncHandler(async (req, res) => {
    const assessment = await assessmentsService.completeAssessment(req.params.id, req.body);
    res.json({ success: true, data: assessment });
  })
);

module.exports = router;
