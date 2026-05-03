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

let ClinicalAssessment;
try {
  ({ ClinicalAssessment } = require('../models/ClinicalAssessment'));
} catch (_e) {
  ClinicalAssessment = null;
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ─── Model guard ─────────────────────────────────────────────────────────── */
const requireModel = (req, res, next) => {
  if (!ClinicalAssessment) {
    return res.status(503).json({ success: false, message: 'Assessment model unavailable' });
  }
  next();
};

/* ─── POST /assessments — Create assessment ──────────────────────────────── */
router.post(
  '/',
  requireModel,
  asyncHandler(async (req, res) => {
    // Accept both DDD-style aliases and canonical model field names
    const {
      beneficiaryId,
      beneficiary: beneficiaryRef,
      type,
      category,
      tool,
      assessorId,
      therapist: therapistRef,
      scheduledDate,
      assessmentDate: assessmentDateField,
      episodeId,
    } = req.body;
    // Canonical field resolution
    const beneficiaryValue = beneficiaryRef || beneficiaryId;
    const toolValue = tool || type;
    const assessmentDateValue = assessmentDateField || scheduledDate || new Date();
    const therapistValue = therapistRef || assessorId;
    if (!beneficiaryValue || !toolValue) {
      return res.status(400).json({ success: false, message: 'beneficiary and tool are required' });
    }
    const payload = {
      beneficiary: beneficiaryValue,
      tool: toolValue,
      assessmentDate: assessmentDateValue,
      status: 'draft',
    };
    if (category) payload.category = category;
    if (therapistValue) payload.therapist = therapistValue;
    if (episodeId) payload.episodeId = episodeId; // stored as extra field
    const assessment = await ClinicalAssessment.create(payload);
    res.status(201).json({ success: true, data: assessment });
  })
);

/* ─── GET /assessments — List assessments ────────────────────────────────── */
router.get(
  '/',
  requireModel,
  asyncHandler(async (req, res) => {
    const { beneficiaryId, beneficiary, category, type, status, limit = 20, skip = 0 } = req.query;
    const filter = {};
    // Accept both beneficiaryId alias and canonical beneficiary field
    const beneficiaryValue = beneficiary || beneficiaryId;
    if (beneficiaryValue) filter.beneficiary = beneficiaryValue;
    // Accept both category and type alias
    const categoryValue = category || type;
    if (categoryValue) filter.category = categoryValue;
    if (status) filter.status = status;
    const [data, total] = await Promise.all([
      ClinicalAssessment.find(filter)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .lean(),
      ClinicalAssessment.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, skip: Number(skip), limit: Number(limit) });
  })
);

/* ─── GET /assessments/dashboard — Summary stats ─────────────────────────── */
router.get(
  '/dashboard',
  requireModel,
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const dateFilter = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.$gte = new Date(from);
      if (to) dateFilter.createdAt.$lte = new Date(to);
    }
    const [total, byStatus, overdue] = await Promise.all([
      ClinicalAssessment.countDocuments(dateFilter),
      ClinicalAssessment.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      ClinicalAssessment.countDocuments({
        status: 'draft',
        assessmentDate: { $lt: new Date() },
      }),
    ]);
    const statusMap = Object.fromEntries(byStatus.map(r => [r._id, r.count]));
    res.json({ success: true, data: { total, byStatus: statusMap, overdue } });
  })
);

/* ─── GET /assessments/beneficiary/:id — By beneficiary ─────────────────── */
router.get(
  '/beneficiary/:id',
  requireModel,
  asyncHandler(async (req, res) => {
    const { limit = 50, skip = 0 } = req.query;
    const data = await ClinicalAssessment.find({ beneficiary: req.params.id })
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();
    res.json({ success: true, data, total: data.length });
  })
);

/* ─── GET /assessments/:id — Single assessment ───────────────────────────── */
router.get(
  '/:id',
  requireModel,
  asyncHandler(async (req, res) => {
    const assessment = await ClinicalAssessment.findById(req.params.id).lean();
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }
    res.json({ success: true, data: assessment });
  })
);

/* ─── PUT /assessments/:id — Update assessment ───────────────────────────── */
router.put(
  '/:id',
  requireModel,
  asyncHandler(async (req, res) => {
    const assessment = await ClinicalAssessment.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean();
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }
    res.json({ success: true, data: assessment });
  })
);

/* ─── PUT /assessments/:id/complete — Complete assessment ────────────────── */
router.put(
  '/:id/complete',
  requireModel,
  asyncHandler(async (req, res) => {
    const { results, summary, score, recommendations } = req.body;
    const assessment = await ClinicalAssessment.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'completed',
          completedDate: new Date(),
          results: results || {},
          summary,
          score,
          recommendations,
        },
      },
      { new: true, runValidators: true }
    ).lean();
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }
    res.json({ success: true, data: assessment });
  })
);

module.exports = router;
