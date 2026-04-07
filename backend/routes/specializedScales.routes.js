/**
 * Specialized Assessment Scales Routes — مسارات مقاييس التقييم المتخصصة
 *
 * GET    /                       — List all scales (filterable)
 * GET    /categories             — Get categories with counts
 * GET    /by-disability/:type    — Scales for a disability type
 * GET    /:id                    — Single scale detail
 * POST   /                       — Create new scale
 * PUT    /:id                    — Update scale
 * DELETE /:id                    — Soft-delete (deactivate)
 *
 * Results:
 * GET    /results                — List results (filterable)
 * GET    /results/beneficiary/:id — Results for a beneficiary
 * GET    /results/stats          — Statistics
 * GET    /results/:id            — Single result detail
 * POST   /results                — Record a result
 * PUT    /results/:id            — Update result
 * PUT    /results/:id/review     — Review/approve
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  SpecializedAssessmentScale,
  SpecializedScaleResult,
} = require('../models/SpecializedAssessmentScale');
const { escapeRegex, stripUpdateMeta } = require('../utils/sanitize');

// ── Auth guard ──────────────────────────────────────────────
router.use(authenticate);

/* ─── Helper ───────────────────────────────────────────────────────────────── */

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  SCALES (المقاييس)
 * ═══════════════════════════════════════════════════════════════════════════ */

// GET / — list with filters & pagination
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, category, disability, search, active } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (disability) filter.targetDisabilities = disability;
    if (active !== undefined) filter.isActive = active === 'true';
    else filter.isActive = true;
    if (search) {
      filter.$or = [
        { nameAr: { $regex: escapeRegex(search), $options: 'i' } },
        { nameEn: { $regex: escapeRegex(search), $options: 'i' } },
        { abbreviation: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      SpecializedAssessmentScale.find(filter)
        .select('-items')
        .sort({ category: 1, nameAr: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      SpecializedAssessmentScale.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// GET /categories — category summary
router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await SpecializedAssessmentScale.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          scales: { $push: { id: '$_id', nameAr: '$nameAr', abbreviation: '$abbreviation' } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const categoryLabels = {
      autism: 'مقاييس طيف التوحد',
      motor: 'مقاييس حركية',
      intellectual: 'مقاييس ذهنية',
      speech: 'مقاييس نطق ولغة',
      behavioral: 'مقاييس سلوكية',
      developmental: 'مقاييس نمائية',
      sensory: 'مقاييس حسية',
      adaptive: 'مقاييس تكيفية',
      vocational: 'مقاييس مهنية',
      psychological: 'مقاييس نفسية',
    };

    const result = categories.map(c => ({
      key: c._id,
      nameAr: categoryLabels[c._id] || c._id,
      count: c.count,
      scales: c.scales,
    }));

    res.json({ success: true, data: result });
  })
);

// GET /by-disability/:type
router.get(
  '/by-disability/:type',
  asyncHandler(async (req, res) => {
    const data = await SpecializedAssessmentScale.find({
      targetDisabilities: req.params.type,
      isActive: true,
    })
      .select('-items')
      .sort({ category: 1, nameAr: 1 })
      .lean();

    res.json({ success: true, data });
  })
);

// GET /:id — full detail with items
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const scale = await SpecializedAssessmentScale.findById(req.params.id).lean();
    if (!scale) return res.status(404).json({ success: false, message: 'المقياس غير موجود' });
    res.json({ success: true, data: scale });
  })
);

// POST / — create
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const scale = await SpecializedAssessmentScale.create({
      ...req.body,
      createdBy: req.user?.id,
      isBuiltIn: false,
    });
    res.status(201).json({ success: true, data: scale, message: 'تم إنشاء المقياس بنجاح' });
  })
);

// PUT /:id — update
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const scale = await SpecializedAssessmentScale.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?.id },
      { new: true, runValidators: true }
    );
    if (!scale) return res.status(404).json({ success: false, message: 'المقياس غير موجود' });
    res.json({ success: true, data: scale, message: 'تم تحديث المقياس بنجاح' });
  })
);

// DELETE /:id — soft-delete
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const scale = await SpecializedAssessmentScale.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedBy: req.user?.id },
      { new: true }
    );
    if (!scale) return res.status(404).json({ success: false, message: 'المقياس غير موجود' });
    res.json({ success: true, message: 'تم تعطيل المقياس بنجاح' });
  })
);

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  RESULTS (نتائج التقييم)
 * ═══════════════════════════════════════════════════════════════════════════ */

// GET /results — list
router.get(
  '/results',
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      beneficiary,
      scale,
      scaleCode,
      assessor,
      status,
      from,
      to,
    } = req.query;
    const filter = {};
    if (beneficiary) filter.beneficiary = beneficiary;
    if (scale) filter.scale = scale;
    if (scaleCode) filter.scaleCode = scaleCode;
    if (assessor) filter.assessor = assessor;
    if (status) filter.status = status;
    if (from || to) {
      filter.assessmentDate = {};
      if (from) filter.assessmentDate.$gte = new Date(from);
      if (to) filter.assessmentDate.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      SpecializedScaleResult.find(filter)
        .populate('scale', 'nameAr abbreviation category')
        .populate('beneficiary', 'name fileNumber')
        .populate('assessor', 'name')
        .sort({ assessmentDate: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      SpecializedScaleResult.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// GET /results/stats — statistics
router.get(
  '/results/stats',
  asyncHandler(async (_req, res) => {
    const [totalResults, byCategory, byMonth, recentResults] = await Promise.all([
      SpecializedScaleResult.countDocuments(),
      SpecializedScaleResult.aggregate([
        {
          $lookup: {
            from: 'specializedassessmentscales',
            localField: 'scale',
            foreignField: '_id',
            as: 'scaleInfo',
          },
        },
        { $unwind: '$scaleInfo' },
        {
          $group: {
            _id: '$scaleInfo.category',
            count: { $sum: 1 },
            avgScore: { $avg: '$totalPercentage' },
          },
        },
        { $sort: { count: -1 } },
      ]),
      SpecializedScaleResult.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$assessmentDate' } },
            count: { $sum: 1 },
            avgScore: { $avg: '$totalPercentage' },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 12 },
      ]),
      SpecializedScaleResult.find()
        .populate('scale', 'nameAr abbreviation')
        .populate('beneficiary', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    res.json({
      success: true,
      data: { totalResults, byCategory, byMonth: byMonth.reverse(), recentResults },
    });
  })
);

// GET /results/beneficiary/:id — results for beneficiary
router.get(
  '/results/beneficiary/:id',
  asyncHandler(async (req, res) => {
    const data = await SpecializedScaleResult.find({ beneficiary: req.params.id })
      .populate('scale', 'nameAr abbreviation category totalMaxScore interpretation')
      .populate('assessor', 'name')
      .sort({ assessmentDate: -1 })
      .lean();

    // Group by scale
    const grouped = {};
    data.forEach(r => {
      const key = r.scaleCode || r.scale?._id?.toString();
      if (!grouped[key]) {
        grouped[key] = {
          scale: r.scale,
          scaleCode: r.scaleCode,
          results: [],
        };
      }
      grouped[key].results.push(r);
    });

    res.json({ success: true, data: Object.values(grouped) });
  })
);

// GET /results/:id — single result
router.get(
  '/results/:id',
  asyncHandler(async (req, res) => {
    const result = await SpecializedScaleResult.findById(req.params.id)
      .populate('scale')
      .populate('beneficiary', 'name fileNumber dateOfBirth')
      .populate('assessor', 'name')
      .populate('supervisedBy', 'name')
      .populate('reviewedBy', 'name')
      .populate('approvedBy', 'name')
      .lean();

    if (!result) return res.status(404).json({ success: false, message: 'النتيجة غير موجودة' });
    res.json({ success: true, data: result });
  })
);

// POST /results — record
router.post(
  '/results',
  asyncHandler(async (req, res) => {
    const scale = await SpecializedAssessmentScale.findById(req.body.scale).lean();
    if (!scale) return res.status(404).json({ success: false, message: 'المقياس غير موجود' });

    // Auto-compute percentage
    const payload = { ...req.body, assessor: req.body.assessor || req.user?.id };
    if (payload.totalRawScore != null && scale.totalMaxScore) {
      payload.totalPercentage = Math.round((payload.totalRawScore / scale.totalMaxScore) * 100);
    }

    // Auto-interpret
    if (payload.totalPercentage != null && scale.interpretation?.length) {
      const interp = scale.interpretation.find(
        i => payload.totalPercentage >= i.min && payload.totalPercentage <= i.max
      );
      if (interp) {
        payload.interpretationLevel = interp.severity;
        payload.interpretationLabelAr = interp.labelAr;
      }
    }

    // Comparison with previous
    const prev = await SpecializedScaleResult.findOne({
      beneficiary: payload.beneficiary,
      scaleCode: payload.scaleCode,
    })
      .sort({ assessmentDate: -1 })
      .lean();

    if (prev) {
      payload.comparisonWithPrevious = {
        previousResultId: prev._id,
        previousScore: prev.totalPercentage,
        changePercent: payload.totalPercentage - prev.totalPercentage,
        trend:
          payload.totalPercentage > prev.totalPercentage
            ? 'improved'
            : payload.totalPercentage < prev.totalPercentage
              ? 'declined'
              : 'stable',
      };
    }

    const result = await SpecializedScaleResult.create(payload);
    res.status(201).json({ success: true, data: result, message: 'تم تسجيل نتيجة التقييم بنجاح' });
  })
);

// PUT /results/:id
router.put(
  '/results/:id',
  asyncHandler(async (req, res) => {
    const result = await SpecializedScaleResult.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!result) return res.status(404).json({ success: false, message: 'النتيجة غير موجودة' });
    res.json({ success: true, data: result, message: 'تم تحديث النتيجة بنجاح' });
  })
);

// PUT /results/:id/review
router.put(
  '/results/:id/review',
  asyncHandler(async (req, res) => {
    const { action } = req.body; // 'review' or 'approve'
    const update = {};
    if (action === 'review') {
      update.status = 'reviewed';
      update.reviewedBy = req.user?.id;
      update.reviewedAt = new Date();
    } else if (action === 'approve') {
      update.status = 'approved';
      update.approvedBy = req.user?.id;
      update.approvedAt = new Date();
    }

    const result = await SpecializedScaleResult.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!result) return res.status(404).json({ success: false, message: 'النتيجة غير موجودة' });
    res.json({ success: true, data: result, message: 'تم تحديث حالة المراجعة' });
  })
);

module.exports = router;
