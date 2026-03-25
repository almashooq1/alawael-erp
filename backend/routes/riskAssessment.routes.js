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

router.use(authenticate);

// ─── Risk matrix overview (before /:id) ──────────────────────────────────────
router.get('/matrix/overview', async (req, res) => {
  try {
    const risks = await RiskAssessment.find({}).lean();
    const matrix = { critical: 0, high: 0, medium: 0, low: 0 };
    risks.forEach(r => {
      const score = (r.probability || 1) * (r.impact || 1);
      if (score >= 16) matrix.critical++;
      else if (score >= 9) matrix.high++;
      else if (score >= 4) matrix.medium++;
      else matrix.low++;
    });
    res.json({ success: true, data: { matrix, total: risks.length }, message: 'مصفوفة المخاطر' });
  } catch (error) {
    logger.error('Error fetching risk matrix:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب مصفوفة المخاطر' });
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
    logger.error('Error fetching risk stats:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإحصائيات' });
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
    logger.error('Error fetching risks:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المخاطر' });
  }
});

// ─── Get single risk ─────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const risk = await RiskAssessment.findById(req.params.id).lean();
    if (!risk) return res.status(404).json({ success: false, message: 'المخاطرة غير موجودة' });
    res.json({ success: true, data: risk, message: 'بيانات المخاطرة' });
  } catch (error) {
    logger.error('Error fetching risk:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المخاطرة' });
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
      logger.error('Error creating risk:', error);
      res.status(500).json({ success: false, message: 'خطأ في إنشاء تقييم المخاطرة' });
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
    logger.error('Error updating risk:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث تقييم المخاطرة' });
  }
});

module.exports = router;
