/**
 * Risk Assessment Routes
 * مسارات تقييم المخاطر
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const _logger = require('../utils/logger');
const RiskAssessment = require('../models/RiskAssessment');
const safeError = require('../utils/safeError');

// W1207 — RiskAssessment's real vocabulary (riskName/riskDescription/nested
// assessment.{probability,impact} on a 0..1 scale/createdBy/REQUIRED
// organizationId). The old phantom payload (title/description/flat 1-5
// probability/identifiedBy, no organizationId) threw ValidationError on every
// create since the route shipped.
const MODEL_RISK_TYPES = [
  'operational',
  'financial',
  'credit',
  'market',
  'liquidity',
  'regulatory',
  'fraud',
  'reputational',
];
// The route's public API accepts strategic/compliance — map to the closest
// model enum values.
const RISK_TYPE_MAP = { strategic: 'operational', compliance: 'regulatory' };
const toModelRiskType = t => (MODEL_RISK_TYPES.includes(t) ? t : RISK_TYPE_MAP[t] || 'operational');
// API scale is 1..5; the model stores 0..1.
const toUnitScale = v => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0.6;
  return n > 1 ? Math.min(n, 5) / 5 : Math.max(0, n);
};
// Single-org deployment: organizationId is REQUIRED on the model but absent
// from req.user — resolve the singleton Organization.
async function resolveOrganizationId() {
  try {
    const Organization = mongoose.model('Organization');
    const org = await Organization.findOne().select('_id').lean();
    return org ? org._id : null;
  } catch (_) {
    return null;
  }
}

router.use(authenticate);
router.use(requireBranchAccess);
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
      const organizationId = await resolveOrganizationId();
      if (!organizationId)
        return res
          .status(422)
          .json({ success: false, message: 'تعذر تحديد المنظمة — لا يوجد سجل Organization' });
      const count = await RiskAssessment.countDocuments();
      const riskId = `RSK-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
      const risk = await RiskAssessment.create({
        riskId,
        organizationId,
        riskName: title,
        riskDescription: description || title,
        riskType: toModelRiskType(riskType),
        assessment: {
          probability: toUnitScale(probability ?? 3),
          impact: toUnitScale(impact ?? 3),
        },
        ...(mitigation ? { mitigation: { strategy: mitigation } } : {}),
        status: 'identified',
        createdBy: req.user._id || req.user.id,
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
    // W1207 — same phantom vocabulary on the update path (silently dropped).
    const set = {};
    if (title !== undefined) set.riskName = title;
    if (description !== undefined) set.riskDescription = description;
    if (riskType !== undefined) set.riskType = toModelRiskType(riskType);
    if (probability !== undefined) set['assessment.probability'] = toUnitScale(probability);
    if (impact !== undefined) set['assessment.impact'] = toUnitScale(impact);
    if (mitigation !== undefined) set['mitigation.strategy'] = mitigation;
    if (status !== undefined) set.status = status;
    if (owner !== undefined) set.assignedTo = owner;
    const risk = await RiskAssessment.findByIdAndUpdate(
      req.params.id,
      { $set: set },
      { returnDocument: 'after', runValidators: true }
    ).lean();
    if (!risk) return res.status(404).json({ success: false, message: 'المخاطرة غير موجودة' });
    res.json({ success: true, data: risk, message: 'تم تحديث تقييم المخاطرة' });
  } catch (error) {
    safeError(res, error, 'updating risk');
  }
});

module.exports = router;
