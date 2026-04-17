/**
 * Audit Trail Enhanced Routes — سجل التدقيق الشامل المحسّن
 * البرومبت 23: Comprehensive Audit Trail
 *
 * Endpoints:
 *   GET    /                    بحث متقدم في سجلات التدقيق
 *   GET    /statistics          إحصائيات التدقيق (by action/module/user/hour)
 *   GET    /for-model           سجل تدقيق لكائن محدد (type+id)
 *   GET    /user/:userId        نشاط مستخدم محدد
 *   GET    /export              تصدير سجلات (JSON)
 *   POST   /log                 تسجيل عملية يدوياً (للنظام)
 *   GET    /:id                 تفاصيل سجل تدقيق
 *   GET    /sensitive           سجلات الوصول للبيانات الحساسة
 *   GET    /login-attempts      محاولات تسجيل الدخول
 *   DELETE /cleanup             حذف السجلات القديمة (بعد فترة الاحتفاظ)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');
const { escapeRegex } = require('../utils/escapeRegex');

// Model — نستخدم AuditLog الموجود في النظام
let AuditLog;
try {
  AuditLog = require('../models/AuditLog');
} catch {
  try {
    // محاولة بديلة
    const auditModel = require('../models/auditLog.model');
    AuditLog = auditModel.default || auditModel;
  } catch {
    // إنشاء نموذج مبسط إذا لم يكن موجوداً
    const mongoose = require('mongoose');
    const escapeRegex = require('../utils/escapeRegex');
    const auditSchema = new mongoose.Schema(
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        userName: String,
        userRole: String,
        action: {
          type: String,
          enum: [
            'create',
            'update',
            'delete',
            'restore',
            'force_delete',
            'login',
            'logout',
            'login_failed',
            'export',
            'import',
            'print',
            'download',
            'view_sensitive',
            'approve',
            'reject',
            'assign',
            'status_change',
            'bulk_action',
            'settings_change',
            'permission_change',
            'password_change',
            'api_call',
          ],
        },
        auditableType: String,
        auditableId: mongoose.Schema.Types.Mixed,
        auditableLabel: String,
        oldValues: mongoose.Schema.Types.Mixed,
        newValues: mongoose.Schema.Types.Mixed,
        ipAddress: String,
        userAgent: String,
        url: String,
        method: String,
        branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
        tags: [String],
        module: String,
        durationMs: Number,
      },
      { timestamps: true }
    );

    auditSchema.index({ auditableType: 1, auditableId: 1 });
    auditSchema.index({ userId: 1, createdAt: -1 });
    auditSchema.index({ action: 1, createdAt: -1 });
    auditSchema.index({ branchId: 1, createdAt: -1 });
    auditSchema.index({ module: 1 });
    auditSchema.index({ createdAt: -1 });

    AuditLog = mongoose.model('AuditLog', auditSchema);
  }
}

router.use(authenticate);
router.use(requireBranchAccess);
// ─── Middleware: يتطلب دور auditor أو admin ──────────────────────────────────
function requireAuditor(req, res, next) {
  const allowedRoles = ['admin', 'super_admin', 'auditor', 'manager'];
  if (!allowedRoles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح — يتطلب صلاحية مدقق أو مدير',
      messageEn: 'Forbidden — auditor or admin role required',
    });
  }
  next();
}

// Action labels
const ACTION_LABELS = {
  create: 'إنشاء',
  update: 'تعديل',
  delete: 'حذف',
  restore: 'استعادة',
  force_delete: 'حذف نهائي',
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
  login_failed: 'محاولة دخول فاشلة',
  export: 'تصدير',
  import: 'استيراد',
  print: 'طباعة',
  download: 'تحميل',
  view_sensitive: 'عرض بيانات حساسة',
  approve: 'موافقة',
  reject: 'رفض',
  assign: 'تعيين',
  status_change: 'تغيير حالة',
  bulk_action: 'عملية جماعية',
  settings_change: 'تغيير إعدادات',
  permission_change: 'تغيير صلاحيات',
  password_change: 'تغيير كلمة مرور',
  api_call: 'طلب API',
};

// ─── LIST / SEARCH ────────────────────────────────────────────────────────────

/**
 * GET / — بحث متقدم في سجلات التدقيق
 */
router.get('/', requireAuditor, async (req, res) => {
  try {
    const {
      userId,
      action,
      module: mod,
      branchId,
      auditableType,
      auditableId,
      fromDate,
      toDate,
      search,
      sensitiveOnly,
      tag,
      sortBy = 'createdAt',
      sortDir = 'desc',
      page = 1,
      perPage = 50,
    } = req.query;

    const filter = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = Array.isArray(action) ? { $in: action } : action;
    if (mod) filter.module = mod;
    if (branchId) filter.branchId = branchId;
    if (auditableType) filter.auditableType = auditableType;
    if (auditableId) filter.auditableId = auditableId;
    if (tag) filter.tags = tag;
    if (sensitiveOnly === 'true') filter.tags = 'sensitive';

    if (fromDate && toDate) {
      filter.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    } else if (fromDate) {
      filter.createdAt = { $gte: new Date(fromDate) };
    } else if (toDate) {
      filter.createdAt = { $lte: new Date(toDate) };
    }

    if (search) {
      filter.$or = [
        { userName: { $regex: escapeRegex(search), $options: 'i' } },
        { auditableLabel: { $regex: escapeRegex(search), $options: 'i' } },
        { ipAddress: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(perPage);
    const AUDIT_SAFE_SORTS = new Set([
      'createdAt',
      'action',
      'module',
      'userName',
      'ipAddress',
      'auditableType',
    ]);
    const safeSortBy = AUDIT_SAFE_SORTS.has(sortBy) ? sortBy : 'createdAt';
    const sort = { [safeSortBy]: sortDir === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      AuditLog.find(filter).sort(sort).skip(skip).limit(Number(perPage)).lean(),
      AuditLog.countDocuments(filter),
    ]);

    // إضافة labels
    const enriched = data.map(log => ({
      ...log,
      actionLabel: ACTION_LABELS[log.action] || log.action,
    }));

    return res.json({
      success: true,
      data: enriched,
      pagination: {
        page: Number(page),
        perPage: Number(perPage),
        total,
        pages: Math.ceil(total / Number(perPage)),
      },
    });
  } catch (err) {
    safeError(res, err, '[AuditTrail] list error');
  }
});

// ─── STATISTICS ───────────────────────────────────────────────────────────────

/**
 * GET /statistics — إحصائيات التدقيق الشاملة
 */
router.get('/statistics', requireAuditor, async (req, res) => {
  try {
    const { period = 'month', branchId } = req.query;
    const branchFilter = branchId ? { branchId } : {};

    const fromDate =
      {
        today: new Date(new Date().setHours(0, 0, 0, 0)),
        week: (() => {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          return d;
        })(),
        month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        quarter: (() => {
          const d = new Date();
          d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
        year: new Date(new Date().getFullYear(), 0, 1),
      }[period] || new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const timeFilter = { ...branchFilter, createdAt: { $gte: fromDate } };

    const [
      totalActions,
      byAction,
      byModule,
      byUser,
      loginAttempts,
      sensitiveAccess,
      hourlyDistribution,
    ] = await Promise.all([
      AuditLog.countDocuments(timeFilter),
      AuditLog.aggregate([
        { $match: timeFilter },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      AuditLog.aggregate([
        { $match: { ...timeFilter, module: { $ne: null } } },
        { $group: { _id: '$module', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
      AuditLog.aggregate([
        { $match: { ...timeFilter, userId: { $ne: null } } },
        { $group: { _id: '$userId', userName: { $first: '$userName' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      Promise.all([
        AuditLog.countDocuments({ ...timeFilter, action: 'login' }),
        AuditLog.countDocuments({ ...timeFilter, action: 'login_failed' }),
      ]),
      AuditLog.countDocuments({ ...timeFilter, tags: 'sensitive' }),
      AuditLog.aggregate([
        { $match: timeFilter },
        { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return res.json({
      success: true,
      data: {
        period,
        totalActions,
        byAction: byAction.map(a => ({
          action: a._id,
          label: ACTION_LABELS[a._id] || a._id,
          count: a.count,
        })),
        byModule: byModule.map(m => ({ module: m._id, count: m.count })),
        byUser: byUser.map(u => ({ userId: u._id, userName: u.userName, count: u.count })),
        loginAttempts: {
          successful: loginAttempts[0],
          failed: loginAttempts[1],
          failureRate:
            loginAttempts[0] + loginAttempts[1] > 0
              ? Math.round((loginAttempts[1] / (loginAttempts[0] + loginAttempts[1])) * 100)
              : 0,
        },
        sensitiveAccess,
        hourlyDistribution: hourlyDistribution.reduce(
          (acc, h) => ({ ...acc, [h._id]: h.count }),
          {}
        ),
      },
    });
  } catch (err) {
    safeError(res, err, '[AuditTrail] statistics error');
  }
});

// ─── FOR MODEL ────────────────────────────────────────────────────────────────

/**
 * GET /for-model — سجل تدقيق لكائن محدد
 */
router.get('/for-model', requireAuditor, async (req, res) => {
  try {
    const { type, id, page = 1, perPage = 30 } = req.query;

    if (!type || !id) {
      return res.status(422).json({ success: false, message: 'type و id مطلوبان' });
    }

    const skip = (Number(page) - 1) * Number(perPage);
    const filter = { auditableType: type, auditableId: id };

    const [data, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(perPage)).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: data.map(log => ({ ...log, actionLabel: ACTION_LABELS[log.action] || log.action })),
      pagination: { page: Number(page), perPage: Number(perPage), total },
    });
  } catch (err) {
    safeError(res, err, '[AuditTrail] for-model error');
  }
});

// ─── USER ACTIVITY ────────────────────────────────────────────────────────────

/**
 * GET /user/:userId — نشاط مستخدم محدد
 */
router.get('/user/:userId', requireAuditor, async (req, res) => {
  try {
    const { fromDate, toDate, action, page = 1, perPage = 50 } = req.query;
    const filter = { userId: req.params.userId };
    if (action) filter.action = action;
    if (fromDate && toDate) {
      filter.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    }

    const skip = (Number(page) - 1) * Number(perPage);
    const [data, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(perPage)).lean(),
      AuditLog.countDocuments(filter),
    ]);

    // ملخص النشاط
    const summary = await AuditLog.aggregate([
      { $match: filter },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return res.json({
      success: true,
      data: data.map(log => ({ ...log, actionLabel: ACTION_LABELS[log.action] || log.action })),
      summary: summary.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      pagination: { page: Number(page), perPage: Number(perPage), total },
    });
  } catch (err) {
    safeError(res, err, '[AuditTrail] user activity error');
  }
});

// ─── SENSITIVE ACCESS ──────────────────────────────────────────────────────────

/**
 * GET /sensitive — سجلات الوصول للبيانات الحساسة
 */
router.get('/sensitive', requireAuditor, async (req, res) => {
  try {
    const { fromDate, toDate, userId, page = 1, perPage = 30 } = req.query;
    const filter = { tags: 'sensitive' };
    if (userId) filter.userId = userId;
    if (fromDate && toDate) {
      filter.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    }

    const skip = (Number(page) - 1) * Number(perPage);
    const [data, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(perPage)).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data,
      pagination: { page: Number(page), perPage: Number(perPage), total },
    });
  } catch (err) {
    safeError(res, err, '[AuditTrail] sensitive error');
  }
});

// ─── LOGIN ATTEMPTS ───────────────────────────────────────────────────────────

/**
 * GET /login-attempts — محاولات تسجيل الدخول (ناجحة وفاشلة)
 */
router.get('/login-attempts', requireAuditor, async (req, res) => {
  try {
    const { fromDate, toDate, ipAddress, page = 1, perPage = 50 } = req.query;
    const filter = { action: { $in: ['login', 'login_failed'] } };
    if (ipAddress) filter.ipAddress = ipAddress;
    if (fromDate && toDate) {
      filter.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    }

    const skip = (Number(page) - 1) * Number(perPage);
    const [data, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(perPage)).lean(),
      AuditLog.countDocuments(filter),
    ]);

    // أكثر IPs مشبوهة (فشل متعدد)
    const suspiciousIps = await AuditLog.aggregate([
      {
        $match: {
          action: 'login_failed',
          ...(fromDate && toDate
            ? { createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) } }
            : {}),
        },
      },
      { $group: { _id: '$ipAddress', count: { $sum: 1 } } },
      { $match: { count: { $gte: 3 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    return res.json({
      success: true,
      data,
      suspiciousIps,
      pagination: { page: Number(page), perPage: Number(perPage), total },
    });
  } catch (err) {
    safeError(res, err, '[AuditTrail] login attempts error');
  }
});

// ─── EXPORT ───────────────────────────────────────────────────────────────────

/**
 * GET /export — تصدير سجلات التدقيق (JSON)
 */
router.get('/export', requireAuditor, async (req, res) => {
  try {
    const { fromDate, toDate, action, module: mod, branchId } = req.query;

    if (!fromDate || !toDate) {
      return res.status(422).json({ success: false, message: 'from_date و to_date مطلوبان' });
    }

    const filter = {
      createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) },
    };
    if (action) filter.action = action;
    if (mod) filter.module = mod;
    if (branchId) filter.branchId = branchId;

    // تسجيل عملية التصدير نفسها
    try {
      await AuditLog.create({
        userId: req.user.id,
        userName: req.user.name || req.user.id,
        userRole: req.user.role,
        action: 'export',
        auditableType: 'AuditLog',
        auditableLabel: `تصدير سجلات من ${fromDate} إلى ${toDate}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        url: req.originalUrl,
        method: req.method,
        branchId: req.user.branchId || null,
        tags: ['export', 'audit'],
        module: 'audit_logs',
      });
    } catch {
      /* تجاهل أخطاء تسجيل التصدير */
    }

    const data = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(10000) // حد أقصى 10,000 سجل
      .lean();

    const exportData = data.map(log => ({
      ...log,
      actionLabel: ACTION_LABELS[log.action] || log.action,
      createdAtFormatted: new Date(log.createdAt).toLocaleString('ar-SA'),
    }));

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit_logs_${fromDate}_${toDate}.json"`
    );
    return res.json(exportData);
  } catch (err) {
    safeError(res, err, '[AuditTrail] export error');
  }
});

// ─── LOG (Manual) ─────────────────────────────────────────────────────────────

/**
 * POST /log — تسجيل عملية تدقيق يدوياً (للنظام الداخلي)
 */
router.post('/log', async (req, res) => {
  try {
    const {
      action,
      auditableType,
      auditableId,
      auditableLabel,
      oldValues,
      newValues,
      tags,
      module: mod,
    } = req.body;

    if (!action) {
      return res.status(422).json({ success: false, message: 'action مطلوب' });
    }

    const log = await AuditLog.create({
      userId: req.user?.id || null,
      userName: req.user?.name || 'System',
      userRole: req.user?.role || 'system',
      action,
      auditableType: auditableType || null,
      auditableId: auditableId || null,
      auditableLabel: auditableLabel || null,
      oldValues: oldValues || null,
      newValues: newValues || null,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      url: req.originalUrl,
      method: req.method,
      branchId: req.user?.branchId || null,
      tags: tags || [],
      module: mod || null,
    });

    return res.status(201).json({ success: true, data: log });
  } catch (err) {
    safeError(res, err, '[AuditTrail] log error');
  }
});

// ─── SHOW ─────────────────────────────────────────────────────────────────────

/**
 * GET /:id — تفاصيل سجل تدقيق
 */
router.get('/:id', requireAuditor, async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id).lean();
    if (!log) {
      return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    }

    // تنسيق التغييرات
    const changes = [];
    const oldValues = log.oldValues || {};
    const newValues = log.newValues || {};
    const allKeys = [...new Set([...Object.keys(oldValues), ...Object.keys(newValues)])];

    for (const key of allKeys) {
      changes.push({
        field: key,
        oldValue: oldValues[key] ?? null,
        newValue: newValues[key] ?? null,
        changed: JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key]),
      });
    }

    return res.json({
      success: true,
      data: {
        ...log,
        actionLabel: ACTION_LABELS[log.action] || log.action,
      },
      changes,
    });
  } catch (err) {
    safeError(res, err, '[AuditTrail] show error');
  }
});

// ─── CLEANUP (Admin only) ─────────────────────────────────────────────────────

/**
 * DELETE /cleanup — حذف السجلات القديمة (بعد فترة الاحتفاظ)
 * الاحتفاظ الافتراضي: 3 سنوات للسجلات العامة، 7 سنوات للحساسة
 */
router.delete('/cleanup', async (req, res) => {
  try {
    const { dryRun = 'true' } = req.query;

    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'يتطلب صلاحية super_admin' });
    }

    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const sevenYearsAgo = new Date();
    sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);

    // حساب السجلات المؤهلة للحذف
    const [regularCount, sensitiveCount] = await Promise.all([
      AuditLog.countDocuments({
        createdAt: { $lt: threeYearsAgo },
        tags: { $not: /sensitive/ },
      }),
      AuditLog.countDocuments({
        createdAt: { $lt: sevenYearsAgo },
        tags: 'sensitive',
      }),
    ]);

    if (dryRun === 'true') {
      return res.json({
        success: true,
        dryRun: true,
        wouldDelete: {
          regular: regularCount,
          sensitive: sensitiveCount,
          total: regularCount + sensitiveCount,
        },
        message: 'نتيجة المحاكاة — لم يُحذف شيء. أرسل dryRun=false لتنفيذ الحذف الفعلي',
      });
    }

    // الحذف الفعلي
    const [r1, r2] = await Promise.all([
      AuditLog.deleteMany({
        createdAt: { $lt: threeYearsAgo },
        tags: { $not: /sensitive/ },
      }),
      AuditLog.deleteMany({
        createdAt: { $lt: sevenYearsAgo },
        tags: 'sensitive',
      }),
    ]);

    logger.info(`[AuditTrail] Cleanup: deleted ${r1.deletedCount + r2.deletedCount} records`);

    return res.json({
      success: true,
      deleted: {
        regular: r1.deletedCount,
        sensitive: r2.deletedCount,
        total: r1.deletedCount + r2.deletedCount,
      },
      message: 'تم تنظيف السجلات القديمة بنجاح',
    });
  } catch (err) {
    safeError(res, err, '[AuditTrail] cleanup error');
  }
});

module.exports = router;
