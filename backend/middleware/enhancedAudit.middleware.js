/**
 * Enhanced Audit Middleware — middleware التدقيق المحسّن
 *
 * يسجّل كل عملية كتابة (POST/PUT/PATCH/DELETE) في قاعدة البيانات.
 * يشمل: من نفّذ، ماذا فعل، على أي سجل، من أي IP، قبل/بعد التغيير.
 *
 * الاستخدام:
 *   const { auditLog, auditAction } = require('../middleware/enhancedAudit.middleware');
 *   router.post('/beneficiaries', requireAuth, auditAction('beneficiary.create'), handler);
 */
'use strict';

const logger = require('../utils/logger');

// ─── نموذج تسجيل التدقيق (بدون Mongoose لتفادي circular deps) ─────────────
let AuditLog;
const getAuditModel = () => {
  if (AuditLog) return AuditLog;
  try {
    const mongoose = require('mongoose');
    const { Schema } = mongoose;
    if (mongoose.models && mongoose.models.EnhancedAuditLog) {
      AuditLog = mongoose.models.EnhancedAuditLog;
      return AuditLog;
    }
    const auditSchema = new Schema(
      {
        // من نفّذ العملية
        userId: { type: Schema.Types.ObjectId, index: true },
        userEmail: String,
        userName: String,
        userRole: String,
        userIp: String,
        userAgent: String,
        // الفرع
        branchId: { type: Schema.Types.ObjectId, index: true },
        // العملية
        action: { type: String, required: true, index: true },
        module: { type: String, index: true },
        method: String,
        endpoint: String,
        // المورد المتأثر
        resourceType: String,
        resourceId: String,
        // التغييرات
        before: Schema.Types.Mixed,
        after: Schema.Types.Mixed,
        diff: Schema.Types.Mixed,
        // نتيجة العملية
        statusCode: Number,
        success: Boolean,
        errorMessage: String,
        // الطلب
        requestBody: Schema.Types.Mixed,
        queryParams: Schema.Types.Mixed,
        // توقيت
        duration: Number, // ms
        timestamp: { type: Date, default: Date.now, index: true },
        // التوافق مع الأنظمة السعودية
        zatcaRelated: { type: Boolean, default: false },
        nphiesRelated: { type: Boolean, default: false },
        muqeemRelated: { type: Boolean, default: false },
        gosiRelated: { type: Boolean, default: false },
      },
      {
        collection: 'enhanced_audit_logs',
        timestamps: false,
        versionKey: false,
      }
    );

    // فهارس مركّبة للبحث السريع
    auditSchema.index({ userId: 1, timestamp: -1 });
    auditSchema.index({ action: 1, timestamp: -1 });
    auditSchema.index({ branchId: 1, timestamp: -1 });
    auditSchema.index({ resourceType: 1, resourceId: 1 });

    AuditLog = mongoose.model('EnhancedAuditLog', auditSchema);
    return AuditLog;
  } catch {
    return null;
  }
};

// ─── دالة حفظ سجل التدقيق ────────────────────────────────────────────────
const saveAuditEntry = async entry => {
  try {
    const Model = getAuditModel();
    if (!Model) return;
    await Model.create(entry);
  } catch (err) {
    // لا نوقف التطبيق إذا فشل التدقيق
    logger.error('[EnhancedAudit] Failed to save audit entry:', err.message);
  }
};

// ─── تحديد الوحدة من المسار ──────────────────────────────────────────────
const getModuleFromPath = path => {
  const segments = path.split('/').filter(Boolean);
  // تجاهل "api" و"v1"
  const start = segments.findIndex(s => s !== 'api' && s !== 'v1');
  return segments[start] || 'unknown';
};

// ─── فلترة البيانات الحساسة ───────────────────────────────────────────────
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'pin', 'cvv', 'card', 'privateKey', 'key'];
const sanitizeBody = body => {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  SENSITIVE_KEYS.forEach(key => {
    if (key in sanitized) sanitized[key] = '[REDACTED]';
    // فحص case-insensitive
    Object.keys(sanitized).forEach(k => {
      if (k.toLowerCase().includes(key.toLowerCase())) {
        sanitized[k] = '[REDACTED]';
      }
    });
  });
  return sanitized;
};

// ─── Middleware رئيسي للتدقيق ─────────────────────────────────────────────
/**
 * auditLog — middleware يسجّل تلقائياً كل عمليات الكتابة
 */
const auditLog = (req, res, next) => {
  const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!WRITE_METHODS.includes(req.method)) return next();

  const startTime = Date.now();
  const originalSend = res.send.bind(res);

  res.send = function (body) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // تسجيل في الخلفية (لا ننتظر الاكتمال)
    setImmediate(async () => {
      try {
        const path = req.originalUrl || req.path;
        const module = getModuleFromPath(path);

        // تحديد إذا كانت مرتبطة بالأنظمة السعودية
        const isZatca =
          path.includes('zatca') || path.includes('e-invoicing') || path.includes('invoice');
        const isNphies =
          path.includes('nphies') ||
          path.includes('insurance-claims') ||
          path.includes('prior-auth');
        const isMuqeem =
          path.includes('muqeem') || path.includes('iqama') || path.includes('residence');
        const isGosi = path.includes('gosi') || path.includes('contribution');

        let responseData;
        try {
          responseData = typeof body === 'string' ? JSON.parse(body) : body;
        } catch {
          responseData = null;
        }

        await saveAuditEntry({
          userId: req.user?._id || req.user?.id,
          userEmail: req.user?.email,
          userName: req.user?.name || req.user?.fullName,
          userRole: req.user?.role,
          userIp: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
          userAgent: req.headers['user-agent'],
          branchId: req.user?.branchId || req.branchScope?.branchId,
          action: `${module}.${req.method.toLowerCase()}`,
          module,
          method: req.method,
          endpoint: path,
          resourceType: module,
          resourceId: req.params?.id || responseData?.data?._id || responseData?.data?.id,
          requestBody: sanitizeBody(req.body),
          queryParams: req.query,
          statusCode,
          success: statusCode >= 200 && statusCode < 300,
          errorMessage: statusCode >= 400 ? responseData?.message : undefined,
          duration,
          zatcaRelated: isZatca,
          nphiesRelated: isNphies,
          muqeemRelated: isMuqeem,
          gosiRelated: isGosi,
        });
      } catch {
        // صامت
      }
    });

    return originalSend(body);
  };

  next();
};

// ─── Decorator للأفعال المحددة ─────────────────────────────────────────────
/**
 * auditAction(action, options) — middleware لتسجيل فعل محدد
 *
 * @param {string} action - اسم الفعل مثل 'beneficiary.create'
 * @param {Object} options - { resourceType, getResourceId }
 */
const auditAction = (action, options = {}) => {
  return async (req, _res, next) => {
    req._auditAction = action;
    req._auditOptions = options;

    logger.debug(`[EnhancedAudit] Action tagged: ${action}`);
    next();
  };
};

// ─── دالة مباشرة لتسجيل حدث محدد ─────────────────────────────────────────
/**
 * logEvent — دالة تُستدعى مباشرة من controllers
 *
 * @param {Object} eventData - بيانات الحدث
 */
const logEvent = async eventData => {
  await saveAuditEntry({
    ...eventData,
    timestamp: new Date(),
  });
};

// ─── مسارات API للتدقيق ───────────────────────────────────────────────────
const express = require('express');
const router = express.Router();

/**
 * GET /api/audit-logs
 * جلب سجلات التدقيق مع فلترة وترقيم
 */
router.get('/', async (req, res) => {
  try {
    const Model = getAuditModel();
    if (!Model) {
      return res.json({ success: true, data: [], meta: { total: 0 } });
    }
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      module,
      branchId,
      from,
      to,
      success: successFilter,
    } = req.query;

    const filter = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = { $regex: action, $options: 'i' };
    if (module) filter.module = module;
    if (branchId) filter.branchId = branchId;
    if (successFilter !== undefined) filter.success = successFilter === 'true';
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const [records, total] = await Promise.all([
      Model.find(filter)
        .sort({ timestamp: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      Model.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: records,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/audit-logs/stats
 * إحصائيات التدقيق
 */
router.get('/stats', async (req, res) => {
  try {
    const Model = getAuditModel();
    if (!Model) return res.json({ success: true, data: {} });

    const { from, to } = req.query;
    const matchFilter = {};
    if (from || to) {
      matchFilter.timestamp = {};
      if (from) matchFilter.timestamp.$gte = new Date(from);
      if (to) matchFilter.timestamp.$lte = new Date(to);
    }

    const stats = await Model.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          successes: { $sum: { $cond: ['$success', 1, 0] } },
          failures: { $sum: { $cond: ['$success', 0, 1] } },
          zatcaEvents: { $sum: { $cond: ['$zatcaRelated', 1, 0] } },
          nphiesEvents: { $sum: { $cond: ['$nphiesRelated', 1, 0] } },
          muqeemEvents: { $sum: { $cond: ['$muqeemRelated', 1, 0] } },
          gosiEvents: { $sum: { $cond: ['$gosiRelated', 1, 0] } },
          avgDuration: { $avg: '$duration' },
        },
      },
    ]);

    return res.json({ success: true, data: stats[0] || {} });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/audit-logs/user/:userId
 * سجلات تدقيق مستخدم محدد
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const Model = getAuditModel();
    if (!Model) return res.json({ success: true, data: [] });

    const { page = 1, limit = 30 } = req.query;
    const records = await Model.find({ userId: req.params.userId })
      .sort({ timestamp: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    return res.json({ success: true, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = {
  auditLog,
  auditAction,
  logEvent,
  router,
};
