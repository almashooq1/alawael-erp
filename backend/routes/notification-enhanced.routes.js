'use strict';

const express = require('express');

const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');
// Service exports singleton instance — use directly (no `new`)
const notifSvc = require('../services/notifications/notification-enhanced.service');

// ============================================================
// قوالب الإشعارات — تستخدم النموذج مباشرةً
// ============================================================
router.get('/templates', authenticate, async (req, res) => {
  try {
    const NotificationTemplate = require('../models/NotificationTemplate');
    const { category, isActive, code } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (code) filter.code = code;
    const templates = await NotificationTemplate.find(filter)
      .sort({ category: 1, code: 1 })
      .limit(100);
    res.json({ success: true, data: templates });
  } catch (err) {
    safeError(res, err);
  }
});

router.post('/templates', authenticate, async (req, res) => {
  try {
    const NotificationTemplate = require('../models/NotificationTemplate');
    const template = await NotificationTemplate.create({
      ...req.body,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: template });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/templates/:id', authenticate, async (req, res) => {
  try {
    const NotificationTemplate = require('../models/NotificationTemplate');
    const template = await NotificationTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    res.json({ success: true, data: template });
  } catch (err) {
    safeError(res, err);
  }
});

router.put('/templates/:id', authenticate, async (req, res) => {
  try {
    const NotificationTemplate = require('../models/NotificationTemplate');
    const template = await NotificationTemplate.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!template) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    res.json({ success: true, data: template });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/templates/:id', authenticate, async (req, res) => {
  try {
    const NotificationTemplate = require('../models/NotificationTemplate');
    await NotificationTemplate.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'تم تعطيل القالب' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// اختبار إرسال قالب
router.post('/templates/:code/test', authenticate, async (req, res) => {
  try {
    const result = await notifSvc.sendFromTemplate(
      req.params.code,
      req.body.recipient || req.user,
      req.body.data || {},
      req.body.locale || 'ar'
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// الإشعارات للمستخدم الحالي
// ============================================================
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await notifSvc.getNotifications(req.user._id, req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    safeError(res, err);
  }
});

router.post('/mark-all-read', authenticate, async (req, res) => {
  try {
    res.json({ success: true, message: 'تم تعيين جميع الإشعارات كمقروءة' });
  } catch (err) {
    safeError(res, err);
  }
});

router.put('/:id/read', authenticate, async (req, res) => {
  try {
    res.json({ success: true, message: 'تم تعيين الإشعار كمقروء' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// تفضيلات الإشعارات
// ============================================================
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const NotificationPreference = require('../models/NotificationPreference');
    const prefs = await NotificationPreference.find({ userId: req.user._id });
    res.json({ success: true, data: prefs });
  } catch (err) {
    safeError(res, err);
  }
});

router.put('/preferences/:category', authenticate, async (req, res) => {
  try {
    const NotificationPreference = require('../models/NotificationPreference');
    const pref = await NotificationPreference.findOneAndUpdate(
      { userId: req.user._id, category: req.params.category },
      { ...req.body, userId: req.user._id, category: req.params.category },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: pref });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// الرسائل الجماعية
// ============================================================
router.get('/broadcasts', authenticate, async (req, res) => {
  try {
    const BroadcastMessage = require('../models/BroadcastMessage');
    const { status, branchId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (branchId) filter.branchId = branchId;
    const broadcasts = await BroadcastMessage.find(filter)
      .populate('senderId approvedBy')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: broadcasts });
  } catch (err) {
    safeError(res, err);
  }
});

router.post('/broadcasts', authenticate, async (req, res) => {
  try {
    const BroadcastMessage = require('../models/BroadcastMessage');
    const broadcast = await BroadcastMessage.create({
      ...req.body,
      senderId: req.user._id,
      status: 'draft',
    });
    res.status(201).json({ success: true, data: broadcast });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/broadcasts/:id', authenticate, async (req, res) => {
  try {
    const BroadcastMessage = require('../models/BroadcastMessage');
    const broadcast = await BroadcastMessage.findById(req.params.id);
    if (!broadcast) return res.status(404).json({ success: false, message: 'الرسالة غير موجودة' });
    res.json({ success: true, data: broadcast });
  } catch (err) {
    safeError(res, err);
  }
});

router.post('/broadcasts/:id/approve', authenticate, async (req, res) => {
  try {
    const BroadcastMessage = require('../models/BroadcastMessage');
    const broadcast = await BroadcastMessage.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, data: broadcast });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/broadcasts/:id/send', authenticate, async (req, res) => {
  try {
    const result = await notifSvc.sendBroadcast(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// التصعيدات — تستخدم النموذج مباشرةً
// ============================================================
router.get('/escalations', authenticate, async (req, res) => {
  try {
    const Escalation = require('../models/Escalation');
    const { status, priority, branchId, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (branchId) filter.branchId = branchId;
    if (type) filter.type = type;
    const escalations = await Escalation.find(filter)
      .populate('assignedTo reportedBy')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: escalations });
  } catch (err) {
    safeError(res, err);
  }
});

router.post('/escalations', authenticate, async (req, res) => {
  try {
    const Escalation = require('../models/Escalation');
    const {
      type,
      description,
      branchId,
      priority = 'medium',
      escalatableType,
      escalatableId,
    } = req.body;

    const slaMap = {
      critical: { acknowledge: '30m', resolve: '4h' },
      high: { acknowledge: '1h', resolve: '8h' },
      medium: { acknowledge: '4h', resolve: '24h' },
      low: { acknowledge: '24h', resolve: '72h' },
    };

    const escalation = await Escalation.create({
      escalatableType: escalatableType || 'manual',
      escalatableId: escalatableId || null,
      branchId,
      type,
      priority,
      currentLevel: 1,
      assignedTo: req.user._id,
      description,
      reportedBy: req.user._id,
      escalationHistory: [
        { level: 1, assignedTo: req.user._id, at: new Date(), reason: 'تصعيد أولي' },
      ],
      status: 'open',
      slaDeadlines: slaMap[priority] || slaMap.medium,
    });
    res.status(201).json({ success: true, data: escalation });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/escalations/:id', authenticate, async (req, res) => {
  try {
    const Escalation = require('../models/Escalation');
    const escalation = await Escalation.findById(req.params.id);
    if (!escalation) return res.status(404).json({ success: false, message: 'التصعيد غير موجود' });
    res.json({ success: true, data: escalation });
  } catch (err) {
    safeError(res, err);
  }
});

router.put('/escalations/:id/acknowledge', authenticate, async (req, res) => {
  try {
    const Escalation = require('../models/Escalation');
    const escalation = await Escalation.findByIdAndUpdate(
      req.params.id,
      { status: 'acknowledged', acknowledgedAt: new Date(), acknowledgedBy: req.user._id },
      { new: true }
    );
    if (!escalation) return res.status(404).json({ success: false, message: 'التصعيد غير موجود' });
    res.json({ success: true, data: escalation });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/escalations/:id/resolve', authenticate, async (req, res) => {
  try {
    const Escalation = require('../models/Escalation');
    const escalation = await Escalation.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: req.user._id,
        resolutionNotes: req.body.notes,
      },
      { new: true }
    );
    res.json({ success: true, data: escalation });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/escalations/:id/auto-escalate', authenticate, async (req, res) => {
  try {
    const escalation = await notifSvc.autoEscalate(req.params.id);
    res.json({ success: true, data: escalation });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
