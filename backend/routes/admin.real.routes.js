const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const systemSettingsService = require('../services/systemSettingsService');
const safeError = require('../utils/safeError');

// Allowed roles that can be assigned via admin panel
const ALLOWED_ROLES = [
  'user',
  'staff',
  'manager',
  'admin',
  'supervisor',
  'accountant',
  'therapist',
];

router.use(authenticate);
router.use(requireBranchAccess);
router.use(authorize(['admin', 'super_admin']));

// Maximum records per page — prevents DoS via unbounded queries
const MAX_PAGE_LIMIT = 100;

// GET /overview
router.get('/overview', async (req, res) => {
  try {
    const [totalUsers, activeUsers, recentLogs] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: { $in: ['active', 'Active'] } }),
      AuditLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 3600000) } }),
    ]);
    res.json({
      success: true,
      data: { totalUsers, activeUsers, recentActivity: recentLogs, systemHealth: 'healthy' },
    });
  } catch (err) {
    safeError(res, err, 'Admin overview error');
  }
});

// GET /users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status } = req.query;
    const safeLimit = Math.min(+limit || 20, MAX_PAGE_LIMIT);
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * safeLimit;
    const [data, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: safeLimit, total } });
  } catch (err) {
    safeError(res, err, 'Admin users error');
  }
});

// GET /alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await Notification.find({ type: { $in: ['alert', 'warning', 'system'] } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json({ success: true, data: alerts });
  } catch (err) {
    safeError(res, err, 'Admin alerts error');
  }
});

// ============ SETTINGS ENDPOINTS ============

// GET /settings — get all system settings
router.get('/settings', async (req, res) => {
  try {
    const data = await systemSettingsService.getSettings();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Admin settings error');
  }
});

// GET /settings/full — get settings with change history (super admin)
router.get('/settings/full', async (req, res) => {
  try {
    const data = await systemSettingsService.getSettingsFull();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Admin settings full error');
  }
});

// PUT /settings — bulk update all settings
router.put('/settings', async (req, res) => {
  try {
    const data = await systemSettingsService.updateAll(req.body, req.user?.id);
    res.json({ success: true, data, message: 'تم حفظ جميع الإعدادات بنجاح' });
  } catch (err) {
    safeError(res, err, 'Admin settings update error');
  }
});

// PUT /settings/:section — update a specific section
router.put('/settings/:section', async (req, res) => {
  try {
    const data = await systemSettingsService.updateSection(
      req.params.section,
      req.body,
      req.user?.id
    );
    res.json({ success: true, data, message: `تم تحديث قسم ${req.params.section} بنجاح` });
  } catch (err) {
    safeError(res, err, 'admin.real');
  }
});

// POST /settings/reset — reset all settings to defaults
router.post('/settings/reset', async (req, res) => {
  try {
    const data = await systemSettingsService.resetAll(req.user?.id);
    res.json({ success: true, data, message: 'تم إعادة تعيين جميع الإعدادات إلى الوضع الافتراضي' });
  } catch (err) {
    safeError(res, err, 'Admin settings reset error');
  }
});

// POST /settings/reset/:section — reset a specific section to defaults
router.post('/settings/reset/:section', async (req, res) => {
  try {
    const data = await systemSettingsService.resetSection(req.params.section, req.user?.id);
    res.json({ success: true, data, message: `تم إعادة تعيين قسم ${req.params.section}` });
  } catch (err) {
    safeError(res, err, 'admin.real');
  }
});

// POST /settings/export — export settings as JSON
router.post('/settings/export', async (req, res) => {
  try {
    const data = await systemSettingsService.exportSettings();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Admin settings export error');
  }
});

// POST /settings/import — import settings from JSON
router.post('/settings/import', async (req, res) => {
  try {
    const data = await systemSettingsService.importSettings(req.body, req.user?.id);
    res.json({ success: true, data, message: 'تم استيراد الإعدادات بنجاح' });
  } catch (err) {
    safeError(res, err, 'Admin settings import error');
  }
});

// GET /settings/history — get change history
router.get('/settings/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const data = await systemSettingsService.getChangeHistory(limit);
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Admin settings history error');
  }
});

// POST /settings/maintenance — toggle maintenance mode
router.post('/settings/maintenance', async (req, res) => {
  try {
    const { enabled, message } = req.body;
    const data = await systemSettingsService.toggleMaintenance(enabled, message, req.user?.id);
    res.json({
      success: true,
      data,
      message: enabled ? 'تم تفعيل وضع الصيانة' : 'تم إيقاف وضع الصيانة',
    });
  } catch (err) {
    safeError(res, err, 'Admin maintenance toggle error');
  }
});

// POST /settings/test-email — test email configuration
router.post('/settings/test-email', async (req, res) => {
  try {
    const result = await systemSettingsService.testEmailConfig();
    res.json({ success: result.success, message: result.message });
  } catch (err) {
    safeError(res, err, 'Admin test email error');
  }
});

// POST /settings/backup — trigger manual backup
router.post('/settings/backup', async (req, res) => {
  try {
    const result = await systemSettingsService.triggerBackup(req.user?.id);
    res.json({ success: true, data: result, message: result.message });
  } catch (err) {
    safeError(res, err, 'Admin trigger backup error');
  }
});

// GET /reports
router.get('/reports', async (req, res) => {
  try {
    const Report = require('../models/Report');
    const reports = await Report.find().sort({ createdAt: -1 }).limit(20).lean();
    res.json({ success: true, data: reports });
  } catch (err) {
    safeError(res, err, 'Admin reports error');
  }
});

// GET /audit-logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, action } = req.query;
    const filter = {};
    if (action) filter.action = action;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    safeError(res, err, 'Admin audit-logs error');
  }
});

// GET /clinics
router.get('/clinics', async (req, res) => {
  try {
    const Branch = require('../models/Branch');
    const clinics = await Branch.find().limit(200).lean();
    res.json({ success: true, data: clinics });
  } catch (err) {
    safeError(res, err, 'Admin clinics error');
  }
});

// GET /notifications
router.get('/notifications', async (req, res) => {
  try {
    const data = await Notification.find().sort({ createdAt: -1 }).limit(30).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Admin notifications error');
  }
});

// POST /users — create new user
router.post('/users', async (req, res) => {
  try {
    const { name, email, phone, role, status } = req.body;
    if (role && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'الدور غير مسموح به' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مسجل مسبقاً' });
    }
    const crypto = require('crypto');
    const tempPass = crypto.randomBytes(16).toString('hex');
    const user = await User.create({
      name,
      email,
      phone,
      role,
      status: status || 'active',
      password: tempPass,
    });
    const safeUser = await User.findById(user._id).select('-password').lean();
    res.status(201).json({ success: true, data: safeUser, message: 'تم إنشاء المستخدم' });
  } catch (err) {
    safeError(res, err, 'Admin create user error');
  }
});

// PUT /users/:id — update user
router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, phone, role, status } = req.body;
    if (role && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'الدور غير مسموح به' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, role, status },
      { new: true, runValidators: true }
    )
      .select('-password')
      .lean();
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    res.json({ success: true, data: user, message: 'تم تحديث المستخدم' });
  } catch (err) {
    safeError(res, err, 'Admin update user error');
  }
});

// DELETE /users/:id — soft-delete (تعطيل المستخدم بدلاً من الحذف النهائي)
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false, deactivatedAt: new Date(), deactivatedBy: req.user?._id },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    logger.info(`User soft-deleted: ${user._id} by ${req.user?._id}`);
    res.json({ success: true, message: 'تم تعطيل المستخدم' });
  } catch (err) {
    safeError(res, err, 'Admin delete user error');
  }
});

// DELETE /payments/:id — soft-delete (إلغاء المدفوعة بدلاً من الحذف النهائي)
router.delete('/payments/:id', async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', cancelledAt: new Date(), cancelledBy: req.user?._id },
      { new: true }
    );
    if (!payment) return res.status(404).json({ success: false, message: 'المدفوعة غير موجودة' });
    logger.info(`Payment soft-deleted: ${payment._id} by ${req.user?._id}`);
    res.json({ success: true, message: 'تم إلغاء المدفوعة' });
  } catch (err) {
    safeError(res, err, 'Admin delete payment error');
  }
});

module.exports = router;
