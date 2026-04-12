/**
 * Risk Assessment Routes
 * مسارات تقييم المخاطر
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const RiskAssessment = require('../models/RiskAssessment');
const safeError = require('../utils/safeError');

router.use(authenticate);

// ─── Risk matrix overview (before /:id) ──────────────────────────────────────
router.get('/matrix/overview', async (req, res) => {
  try {
    const [result] = await RiskAssessment.aggregate([
      {
        $addFields: {
          riskScore: { $multiply: [{ $ifNull: ['$probability', 1] }, { $ifNull: ['$impact', 1] }] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          critical: { $sum: { $cond: [{ $gte: ['$riskScore', 16] }, 1, 0] } },
          high: {
            $sum: {
              $cond: [{ $and: [{ $gte: ['$riskScore', 9] }, { $lt: ['$riskScore', 16] }] }, 1, 0],
            },
          },
          medium: {
            $sum: {
              $cond: [{ $and: [{ $gte: ['$riskScore', 4] }, { $lt: ['$riskScore', 9] }] }, 1, 0],
            },
          },
          low: { $sum: { $cond: [{ $lt: ['$riskScore', 4] }, 1, 0] } },
        },
      },
    ]);
    const data = result || { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    const matrix = { critical: data.critical, high: data.high, medium: data.medium, low: data.low };
    res.json({ success: true, data: { matrix, total: data.total }, message: 'مصفوفة المخاطر' });
  } catch (error) {
    safeError(res, error, 'fetching risk matrix');
  }
});

// ─── Stats summary (before /:id) ─────────────────────────────────────────────
router.get('/stats/summary', async (req, res) => {
  try {
    const [total, byStatus] = await Promise.all([
      RiskAssessment.countDocuments(),
      RiskAssessment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const stats = { total, identified: 0, assessed: 0, mitigated: 0, closed: 0 };
    byStatus.forEach(s => {
      const key = (s._id || '').toLowerCase();
      if (stats[key] !== undefined) stats[key] = s.count;
    });
    res.json({ success: true, data: stats, message: 'إحصائيات المخاطر' });
  } catch (error) {
    safeError(res, error, 'fetching risk stats');
  }
});

// ─── List risks ──────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.riskType = type;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      RiskAssessment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      RiskAssessment.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { page: +page, limit: +limit, total },
      message: 'قائمة المخاطر',
    });
  } catch (error) {
    safeError(res, error, 'fetching risks');
  }
});

// ─── Get single risk ─────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const risk = await RiskAssessment.findById(req.params.id).lean();
    if (!risk) return res.status(404).json({ success: false, message: 'المخاطرة غير موجودة' });
    res.json({ success: true, data: risk, message: 'بيانات المخاطرة' });
  } catch (error) {
    safeError(res, error, 'fetching risk');
  }
});

// ─── Create risk ─────────────────────────────────────────────────────────────
router.post(
  '/',
  authorize(['admin', 'manager']),
  validate([
    body('title').trim().notEmpty().withMessage('عنوان المخاطرة مطلوب'),
    body('riskType')
      .optional()
      .isIn(['operational', 'financial', 'strategic', 'compliance', 'reputational'])
      .withMessage('نوع المخاطرة غير صالح'),
    body('probability')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('الاحتمال يجب أن يكون بين 1 و 5'),
    body('impact')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('التأثير يجب أن يكون بين 1 و 5'),
  ]),
  async (req, res) => {
    try {
      const { title, description, riskType, probability, impact, mitigation } = req.body;
      if (!title) return res.status(400).json({ success: false, message: 'عنوان المخاطرة مطلوب' });
      const count = await RiskAssessment.countDocuments();
      const riskId = `RSK-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
      const risk = await RiskAssessment.create({
        riskId,
        title,
        description,
        riskType: riskType || 'operational',
        probability: probability || 3,
        impact: impact || 3,
        mitigation,
        status: 'identified',
        identifiedBy: req.user.id,
      });
      res.status(201).json({ success: true, data: risk, message: 'تم إنشاء تقييم المخاطرة' });
    } catch (error) {
      safeError(res, error, 'creating risk');
    }
  }
);

// ─── Update risk ─────────────────────────────────────────────────────────────
router.put('/:id', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { title, description, riskType, probability, impact, mitigation, status, owner } =
      req.body;
    const risk = await RiskAssessment.findByIdAndUpdate(
      req.params.id,
      { title, description, riskType, probability, impact, mitigation, status, owner },
      {
        new: true,
        runValidators: true,
      }
    ).lean();
    if (!risk) return res.status(404).json({ success: false, message: 'المخاطرة غير موجودة' });
    res.json({ success: true, data: risk, message: 'تم تحديث تقييم المخاطرة' });
  } catch (error) {
    safeError(res, error, 'updating risk');
  }
});

module.exports = router;
