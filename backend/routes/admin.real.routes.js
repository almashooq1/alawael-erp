const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const systemSettingsService = require('../services/systemSettingsService');

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
router.use(authorize(['admin', 'super_admin']));

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
    logger.error('Admin overview error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب نظرة عامة' });
  }
});

// GET /users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    logger.error('Admin users error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب المستخدمين' });
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
    logger.error('Admin alerts error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب التنبيهات' });
  }
});

// ============ SETTINGS ENDPOINTS ============

// GET /settings — get all system settings
router.get('/settings', async (req, res) => {
  try {
    const data = await systemSettingsService.getSettings();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Admin settings error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإعدادات' });
  }
});

// GET /settings/full — get settings with change history (super admin)
router.get('/settings/full', async (req, res) => {
  try {
    const data = await systemSettingsService.getSettingsFull();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Admin settings full error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإعدادات الكاملة' });
  }
});

// PUT /settings — bulk update all settings
router.put('/settings', async (req, res) => {
  try {
    const data = await systemSettingsService.updateAll(req.body, req.user?.id);
    res.json({ success: true, data, message: 'تم حفظ جميع الإعدادات بنجاح' });
  } catch (err) {
    logger.error('Admin settings update error:', err);
    res.status(500).json({ success: false, message: 'خطأ في حفظ الإعدادات' });
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
    logger.error(`Admin settings section update error (${req.params.section}):`, err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث قسم الإعدادات' });
  }
});

// POST /settings/reset — reset all settings to defaults
router.post('/settings/reset', async (req, res) => {
  try {
    const data = await systemSettingsService.resetAll(req.user?.id);
    res.json({ success: true, data, message: 'تم إعادة تعيين جميع الإعدادات إلى الوضع الافتراضي' });
  } catch (err) {
    logger.error('Admin settings reset error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إعادة تعيين الإعدادات' });
  }
});

// POST /settings/reset/:section — reset a specific section to defaults
router.post('/settings/reset/:section', async (req, res) => {
  try {
    const data = await systemSettingsService.resetSection(req.params.section, req.user?.id);
    res.json({ success: true, data, message: `تم إعادة تعيين قسم ${req.params.section}` });
  } catch (err) {
    logger.error(`Admin settings section reset error (${req.params.section}):`, err);
    res.status(500).json({ success: false, message: 'خطأ في إعادة تعيين القسم' });
  }
});

// POST /settings/export — export settings as JSON
router.post('/settings/export', async (req, res) => {
  try {
    const data = await systemSettingsService.exportSettings();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Admin settings export error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تصدير الإعدادات' });
  }
});

// POST /settings/import — import settings from JSON
router.post('/settings/import', async (req, res) => {
  try {
    const data = await systemSettingsService.importSettings(req.body, req.user?.id);
    res.json({ success: true, data, message: 'تم استيراد الإعدادات بنجاح' });
  } catch (err) {
    logger.error('Admin settings import error:', err);
    res.status(500).json({ success: false, message: 'خطأ في استيراد الإعدادات' });
  }
});

// GET /settings/history — get change history
router.get('/settings/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const data = await systemSettingsService.getChangeHistory(limit);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Admin settings history error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب سجل التغييرات' });
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
    logger.error('Admin maintenance toggle error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تبديل وضع الصيانة' });
  }
});

// POST /settings/test-email — test email configuration
router.post('/settings/test-email', async (req, res) => {
  try {
    const result = await systemSettingsService.testEmailConfig();
    res.json({ success: result.success, message: result.message });
  } catch (err) {
    logger.error('Admin test email error:', err);
    res.status(500).json({ success: false, message: 'خطأ في اختبار البريد الإلكتروني' });
  }
});

// POST /settings/backup — trigger manual backup
router.post('/settings/backup', async (req, res) => {
  try {
    const result = await systemSettingsService.triggerBackup(req.user?.id);
    res.json({ success: true, data: result, message: result.message });
  } catch (err) {
    logger.error('Admin trigger backup error:', err);
    res.status(500).json({ success: false, message: 'خطأ في بدء النسخ الاحتياطي' });
  }
});

// GET /reports
router.get('/reports', async (req, res) => {
  try {
    const Report = require('../models/Report');
    const reports = await Report.find().sort({ createdAt: -1 }).limit(20).lean();
    res.json({ success: true, data: reports });
  } catch (err) {
    logger.error('Admin reports error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب التقارير' });
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
    logger.error('Admin audit-logs error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب سجلات التدقيق' });
  }
});

// GET /clinics
router.get('/clinics', async (req, res) => {
  try {
    const Branch = require('../models/Branch');
    const clinics = await Branch.find().lean();
    res.json({ success: true, data: clinics });
  } catch (err) {
    logger.error('Admin clinics error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب العيادات' });
  }
});

// GET /notifications
router.get('/notifications', async (req, res) => {
  try {
    const data = await Notification.find().sort({ createdAt: -1 }).limit(30).lean();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Admin notifications error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإشعارات' });
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
    const safeUser = user.toObject();
    delete safeUser.password;
    res.status(201).json({ success: true, data: safeUser, message: 'تم إنشاء المستخدم' });
  } catch (err) {
    logger.error('Admin create user error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء المستخدم' });
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
    logger.error('Admin update user error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث المستخدم' });
  }
});

// DELETE /users/:id — delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    res.json({ success: true, message: 'تم حذف المستخدم' });
  } catch (err) {
    logger.error('Admin delete user error:', err);
    res.status(500).json({ success: false, message: 'خطأ في حذف المستخدم' });
  }
});

// DELETE /payments/:id — delete payment
router.delete('/payments/:id', async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'المدفوعة غير موجودة' });
    res.json({ success: true, message: 'تم حذف المدفوعة' });
  } catch (err) {
    logger.error('Admin delete payment error:', err);
    res.status(500).json({ success: false, message: 'خطأ في حذف المدفوعة' });
  }
});

module.exports = router;
