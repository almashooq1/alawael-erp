/**
 * icf-assessments.routes.js
 * ══════════════════════════════════════════════════════════════════
 * International Classification of Functioning (ICF) Assessments API
 * تقييمات التصنيف الدولي للأداء الوظيفي والإعاقة والصحة
 *
 * Mounted at: /api/v1/icf-assessments
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// ── Dynamic model ────────────────────────────────────────────────────────────
function IcfAssessment() {
  try {
    return mongoose.model('IcfAssessment');
  } catch (_e) {
    return mongoose.model(
      'IcfAssessment',
      new mongoose.Schema(
        {
          beneficiaryId: { type: mongoose.Schema.Types.ObjectId, required: true },
          episodeId: mongoose.Schema.Types.ObjectId,
          assessedBy: mongoose.Schema.Types.ObjectId,
          assessmentDate: { type: Date, default: Date.now },
          status: {
            type: String,
            default: 'draft',
            enum: ['draft', 'completed', 'reviewed', 'archived'],
          },
          // ICF components
          bodyFunctions: [{ code: String, qualifier: Number, note: String }],
          bodyStructures: [{ code: String, qualifier: Number, note: String }],
          activities: [{ code: String, qualifier: Number, note: String }],
          participation: [{ code: String, qualifier: Number, note: String }],
          environmentalFactors: [{ code: String, qualifier: Number, note: String }],
          personalFactors: [String],
          // Scores
          totalScore: Number,
          domainScores: mongoose.Schema.Types.Mixed,
          recommendations: String,
          notes: String,
          isDeleted: { type: Boolean, default: false },
        },
        { timestamps: true }
      )
    );
  }
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ══════════════════════ CRUD ═══════════════════════════════════════════════ */

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const M = IcfAssessment();
    const { beneficiaryId, episodeId, status, limit = 20, skip = 0 } = req.query;
    const q = { isDeleted: { $ne: true } };
    if (beneficiaryId) q.beneficiaryId = new mongoose.Types.ObjectId(beneficiaryId);
    if (episodeId) q.episodeId = new mongoose.Types.ObjectId(episodeId);
    if (status) q.status = status;
    const [data, total] = await Promise.all([
      M.find(q).sort({ assessmentDate: -1 }).skip(Number(skip)).limit(Number(limit)).lean(),
      M.countDocuments(q),
    ]);
    res.json({ success: true, data, total });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const M = IcfAssessment();
    const doc = await M.create(req.body);
    res.status(201).json({ success: true, data: doc });
  })
);

router.get(
  '/statistics',
  asyncHandler(async (req, res) => {
    const M = IcfAssessment();
    const [total, byStatus] = await Promise.all([
      M.countDocuments({ isDeleted: { $ne: true } }),
      M.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);
    res.json({
      success: true,
      data: { total, byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])) },
    });
  })
);

router.get(
  '/domain-distribution',
  asyncHandler(async (req, res) => {
    const M = IcfAssessment();
    const dist = await M.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $project: {
          bodyFunctionsCount: { $size: { $ifNull: ['$bodyFunctions', []] } },
          activitiesCount: { $size: { $ifNull: ['$activities', []] } },
          participationCount: { $size: { $ifNull: ['$participation', []] } },
          environmentCount: { $size: { $ifNull: ['$environmentalFactors', []] } },
        },
      },
      {
        $group: {
          _id: null,
          avgBodyFunctions: { $avg: '$bodyFunctionsCount' },
          avgActivities: { $avg: '$activitiesCount' },
          avgParticipation: { $avg: '$participationCount' },
          avgEnvironment: { $avg: '$environmentCount' },
        },
      },
    ]);
    res.json({ success: true, data: dist[0] || {} });
  })
);

router.get(
  '/organization-report',
  asyncHandler(async (req, res) => {
    const M = IcfAssessment();
    const total = await M.countDocuments({ isDeleted: { $ne: true } });
    const recent = await M.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    res.json({ success: true, data: { total, recent } });
  })
);

router.get(
  '/codes',
  asyncHandler(async (_req, res) => {
    // Static ICF code reference — returns placeholder structure
    res.json({
      success: true,
      data: [
        { code: 'b130', title: 'Energy and drive functions', component: 'body_functions' },
        { code: 'b140', title: 'Attention functions', component: 'body_functions' },
        { code: 'd410', title: 'Changing basic body position', component: 'activities' },
        { code: 'd450', title: 'Walking', component: 'activities' },
        {
          code: 'e115',
          title: 'Products and technology for personal use',
          component: 'environment',
        },
      ],
    });
  })
);

router.get(
  '/codes/tree/:component',
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: { component: req.params.component, codes: [] } });
  })
);

router.get(
  '/benchmarks',
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: [] });
  })
);

router.post(
  '/benchmarks',
  asyncHandler(async (req, res) => {
    res.status(201).json({ success: true, data: req.body });
  })
);

router.post(
  '/benchmarks/import',
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: { imported: 0 } });
  })
);

router.get(
  '/beneficiary/:beneficiaryId/timeline',
  asyncHandler(async (req, res) => {
    const M = IcfAssessment();
    const data = await M.find({ beneficiaryId: req.params.beneficiaryId, isDeleted: { $ne: true } })
      .sort({ assessmentDate: 1 })
      .lean();
    res.json({ success: true, data });
  })
);

router.get(
  '/beneficiary/:beneficiaryId/comparative-report',
  asyncHandler(async (req, res) => {
    const M = IcfAssessment();
    const data = await M.find({ beneficiaryId: req.params.beneficiaryId, isDeleted: { $ne: true } })
      .sort({ assessmentDate: -1 })
      .limit(5)
      .lean();
    res.json({ success: true, data: { assessments: data, total: data.length } });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const M = IcfAssessment();
    const doc = await M.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Assessment not found' });
    res.json({ success: true, data: doc });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const M = IcfAssessment();
    const doc = await M.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Assessment not found' });
    res.json({ success: true, data: doc });
  })
);

router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const M = IcfAssessment();
    const doc = await M.findByIdAndUpdate(
      req.params.id,
      { $set: { status: req.body.status } },
      { new: true }
    ).lean();
    res.json({ success: true, data: doc });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const M = IcfAssessment();
    await M.findByIdAndUpdate(req.params.id, { $set: { isDeleted: true } });
    res.json({ success: true });
  })
);

router.get(
  '/:id/compare',
  asyncHandler(async (req, res) => {
    const M = IcfAssessment();
    const doc = await M.findById(req.params.id).lean();
    res.json({ success: true, data: { current: doc, previous: null } });
  })
);

router.get(
  '/:id/benchmark',
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: { score: null, percentile: null } });
  })
);

router.get(
  '/:id/report',
  asyncHandler(async (req, res) => {
    const M = IcfAssessment();
    const doc = await M.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Assessment not found' });
    res.json({ success: true, data: doc });
  })
);

module.exports = router;
