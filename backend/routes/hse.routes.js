const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { SafetyIncident, SafetyInspection } = require('../models/HSE');

// ── Dashboard ────────────────────────────────────────────────────────
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [
      totalIncidents,
      openIncidents,
      investigating,
      closed,
      totalInspections,
      scheduledInspections,
    ] = await Promise.all([
      SafetyIncident.countDocuments(),
      SafetyIncident.countDocuments({ status: 'reported' }),
      SafetyIncident.countDocuments({ status: 'under_investigation' }),
      SafetyIncident.countDocuments({ status: 'closed' }),
      SafetyInspection.countDocuments(),
      SafetyInspection.countDocuments({ status: 'scheduled' }),
    ]);

    const bySeverity = await SafetyIncident.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);

    const byType = await SafetyIncident.aggregate([
      { $group: { _id: '$incidentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const recentIncidents = await SafetyIncident.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('incidentNumber titleAr incidentType severity status incidentDate')
      .lean();

    res.json({
      success: true,
      data: {
        totalIncidents,
        openIncidents,
        investigating,
        closed,
        totalInspections,
        scheduledInspections,
        bySeverity: bySeverity.map(s => ({ severity: s._id, count: s.count })),
        byType: byType.map(t => ({ type: t._id, count: t.count })),
        recentIncidents,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب بيانات لوحة التحكم', error: error.message });
  }
});

// ── Incidents CRUD ───────────────────────────────────────────────────
router.get('/incidents', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, severity } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    const docs = await SafetyIncident.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    const total = await SafetyIncident.countDocuments(filter);
    res.json({
      success: true,
      data: docs,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في جلب الحوادث', error: error.message });
  }
});

router.post('/incidents', authenticate, async (req, res) => {
  try {
    const doc = new SafetyIncident({ ...req.body, reportedBy: req.user._id || req.user.id });
    await doc.save();
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    res.status(400).json({ success: false, message: 'خطأ في إنشاء الحادثة', error: error.message });
  }
});

router.put('/incidents/:id', authenticate, async (req, res) => {
  try {
    const doc = await SafetyIncident.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ success: false, message: 'الحادثة غير موجودة' });
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(400).json({ success: false, message: 'خطأ في تحديث الحادثة', error: error.message });
  }
});

router.delete(
  '/incidents/:id',
  authenticate,
  authorize('admin', 'hse_manager'),
  async (req, res) => {
    try {
      const doc = await SafetyIncident.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: 'الحادثة غير موجودة' });
      res.json({ success: true, message: 'تم حذف الحادثة بنجاح' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ في حذف الحادثة', error: error.message });
    }
  }
);

// ── Inspections CRUD ─────────────────────────────────────────────────
router.get('/inspections', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const docs = await SafetyInspection.find(filter)
      .sort({ scheduledDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    const total = await SafetyInspection.countDocuments(filter);
    res.json({
      success: true,
      data: docs,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في جلب التفتيشات', error: error.message });
  }
});

router.post('/inspections', authenticate, async (req, res) => {
  try {
    const doc = new SafetyInspection({ ...req.body, inspector: req.user._id || req.user.id });
    await doc.save();
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    res.status(400).json({ success: false, message: 'خطأ في إنشاء التفتيش', error: error.message });
  }
});

router.put('/inspections/:id', authenticate, async (req, res) => {
  try {
    const doc = await SafetyInspection.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ success: false, message: 'التفتيش غير موجود' });
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(400).json({ success: false, message: 'خطأ في تحديث التفتيش', error: error.message });
  }
});

router.delete(
  '/inspections/:id',
  authenticate,
  authorize('admin', 'hse_manager'),
  async (req, res) => {
    try {
      const doc = await SafetyInspection.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: 'التفتيش غير موجود' });
      res.json({ success: true, message: 'تم حذف التفتيش بنجاح' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ في حذف التفتيش', error: error.message });
    }
  }
);

module.exports = router;
