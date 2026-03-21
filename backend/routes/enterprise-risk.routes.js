/**
 * Enterprise Risk Management Routes — مسارات إدارة المخاطر المؤسسية
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');

const safeModel = n =>
  mongoose.models[n] ? mongoose.model(n) : require(`../models/EnterpriseRisk`)[n];

// ── Dashboard ────────────────────────────────────────────────
router.get('/dashboard', authenticate, async (_req, res) => {
  try {
    const Risk = safeModel('EnterpriseRisk');
    const Assessment = safeModel('RiskAssessment');

    const [totalRisks, critical, mitigating, assessments] = await Promise.all([
      Risk.countDocuments().catch(() => 0),
      Risk.countDocuments({ priority: 'critical' }).catch(() => 0),
      Risk.countDocuments({ status: 'mitigating' }).catch(() => 0),
      Assessment.countDocuments().catch(() => 0),
    ]);

    const byCategory = await Risk.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]).catch(() => []);
    const byStatus = await Risk.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).catch(() => []);
    const byPriority = await Risk.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]).catch(() => []);
    const topRisks = await Risk.find({ priority: { $in: ['critical', 'high'] } })
      .sort({ riskScore: -1 })
      .limit(5)
      .lean()
      .catch(() => []);

    res.json({
      success: true,
      data: {
        summary: { totalRisks, criticalRisks: critical, mitigating, totalAssessments: assessments },
        risksByCategory: byCategory.map(c => ({ category: c._id, count: c.count })),
        risksByStatus: byStatus.map(s => ({ status: s._id, count: s.count })),
        risksByPriority: byPriority.map(p => ({ priority: p._id, count: p.count })),
        topRisks,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Risks CRUD ───────────────────────────────────────────────
router.get('/risks', authenticate, async (req, res) => {
  try {
    const Risk = safeModel('EnterpriseRisk');
    const { status, category, priority, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      Risk.find(filter)
        .sort({ riskScore: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Risk.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: docs,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/risks', authenticate, async (req, res) => {
  try {
    const Risk = safeModel('EnterpriseRisk');
    const doc = await Risk.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/risks/:id', authenticate, async (req, res) => {
  try {
    const Risk = safeModel('EnterpriseRisk');
    const doc = await Risk.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ success: false, message: 'المخاطرة غير موجودة' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/risks/:id', authenticate, async (req, res) => {
  try {
    const Risk = safeModel('EnterpriseRisk');
    await Risk.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Risk Mitigations ─────────────────────────────────────────
router.post('/risks/:id/mitigations', authenticate, async (req, res) => {
  try {
    const Risk = safeModel('EnterpriseRisk');
    const risk = await Risk.findById(req.params.id);
    if (!risk) return res.status(404).json({ success: false, message: 'المخاطرة غير موجودة' });
    risk.mitigations.push(req.body);
    risk.history.push({ action: 'إضافة إجراء تخفيف', user: req.user?._id });
    await risk.save();
    res.status(201).json({ success: true, data: risk });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Assessments CRUD ─────────────────────────────────────────
router.get('/assessments', authenticate, async (req, res) => {
  try {
    const Assessment = safeModel('RiskAssessment');
    const docs = await Assessment.find().sort({ assessmentDate: -1 }).lean();
    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/assessments', authenticate, async (req, res) => {
  try {
    const Assessment = safeModel('RiskAssessment');
    const doc = await Assessment.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/assessments/:id', authenticate, async (req, res) => {
  try {
    const Assessment = safeModel('RiskAssessment');
    const doc = await Assessment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'التقييم غير موجود' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
