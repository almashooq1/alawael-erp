'use strict';

/**
 * Document Audit Trail Service — خدمة سجل التدقيق المتقدم
 * ═══════════════════════════════════════════════════════════════
 * سجل تدقيق شامل بنمط Blockchain للمستندات، كشف الأنشطة المشبوهة،
 * تقارير الامتثال، وتحليل النشاط
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const logger = require('../../utils/logger');

// ─────────────────────────────────────────────
// مخطط سجل التدقيق
// ─────────────────────────────────────────────

const AuditLogSchema = new mongoose.Schema(
  {
    // معرّف السجل الفريد (تسلسلي مثل Blockchain)
    sequenceNumber: { type: Number, required: true },
    previousHash: { type: String, default: '' },
    currentHash: { type: String, required: true },

    // المستند
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      index: true,
    },
    documentTitle: String,

    // الإجراء
    action: {
      type: String,
      enum: [
        'create',
        'read',
        'update',
        'delete',
        'upload',
        'download',
        'share',
        'unshare',
        'sign',
        'approve',
        'reject',
        'archive',
        'restore',
        'expire',
        'classify',
        'tag',
        'move',
        'workflow_start',
        'workflow_transition',
        'workflow_complete',
        'version_create',
        'version_restore',
        'permission_change',
        'bulk_operation',
        'template_generate',
        'export',
        'print',
        'comment',
        'mention',
        'login_access',
        'suspicious_activity',
      ],
      required: true,
      index: true,
    },
    actionLabel: String,

    // التفاصيل
    details: {
      description: String,
      changes: [
        {
          field: String,
          oldValue: mongoose.Schema.Types.Mixed,
          newValue: mongoose.Schema.Types.Mixed,
        },
      ],
      metadata: mongoose.Schema.Types.Mixed,
    },

    // الفاعل
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    userName: String,
    userRole: String,
    userDepartment: String,

    // معلومات الجلسة
    sessionInfo: {
      ipAddress: String,
      userAgent: String,
      deviceType: String,
      location: String,
    },

    // التصنيف الأمني
    severity: {
      type: String,
      enum: ['info', 'low', 'medium', 'high', 'critical'],
      default: 'info',
    },

    // هل هو نشاط مشبوه
    isSuspicious: { type: Boolean, default: false },
    suspiciousReason: String,

    // حالة الامتثال
    complianceFlags: [String], // مثال: 'gdpr', 'iso27001', 'sox'
  },
  {
    timestamps: true,
    collection: 'document_audit_logs',
  }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ documentId: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ isSuspicious: 1, createdAt: -1 });
AuditLogSchema.index({ severity: 1 });

const AuditLog =
  mongoose.models.DocumentAuditLog || mongoose.model('DocumentAuditLog', AuditLogSchema);

// ─────────────────────────────────────────────
// تصنيف الإجراءات
// ─────────────────────────────────────────────

const ACTION_CONFIG = {
  create: { label: 'إنشاء', severity: 'info', icon: '➕', category: 'crud' },
  read: { label: 'قراءة', severity: 'info', icon: '👁️', category: 'crud' },
  update: { label: 'تعديل', severity: 'low', icon: '✏️', category: 'crud' },
  delete: { label: 'حذف', severity: 'high', icon: '🗑️', category: 'crud' },
  upload: { label: 'رفع', severity: 'info', icon: '📤', category: 'file' },
  download: { label: 'تحميل', severity: 'low', icon: '📥', category: 'file' },
  share: { label: 'مشاركة', severity: 'medium', icon: '🔗', category: 'sharing' },
  unshare: { label: 'إلغاء مشاركة', severity: 'low', icon: '🔓', category: 'sharing' },
  sign: { label: 'توقيع', severity: 'medium', icon: '✍️', category: 'workflow' },
  approve: { label: 'اعتماد', severity: 'medium', icon: '✅', category: 'workflow' },
  reject: { label: 'رفض', severity: 'medium', icon: '❌', category: 'workflow' },
  archive: { label: 'أرشفة', severity: 'low', icon: '📦', category: 'lifecycle' },
  restore: { label: 'استعادة', severity: 'medium', icon: '♻️', category: 'lifecycle' },
  expire: { label: 'انتهاء صلاحية', severity: 'low', icon: '⏰', category: 'lifecycle' },
  classify: { label: 'تصنيف', severity: 'info', icon: '🏷️', category: 'intelligence' },
  tag: { label: 'إضافة وسم', severity: 'info', icon: '🔖', category: 'intelligence' },
  move: { label: 'نقل', severity: 'low', icon: '📁', category: 'organization' },
  workflow_start: { label: 'بدء سير العمل', severity: 'medium', icon: '▶️', category: 'workflow' },
  workflow_transition: {
    label: 'انتقال سير العمل',
    severity: 'low',
    icon: '➡️',
    category: 'workflow',
  },
  workflow_complete: {
    label: 'إكمال سير العمل',
    severity: 'info',
    icon: '🏁',
    category: 'workflow',
  },
  version_create: { label: 'إنشاء إصدار', severity: 'low', icon: '📌', category: 'versioning' },
  version_restore: { label: 'استعادة إصدار', severity: 'high', icon: '⏪', category: 'versioning' },
  permission_change: {
    label: 'تغيير الصلاحيات',
    severity: 'high',
    icon: '🔐',
    category: 'security',
  },
  bulk_operation: { label: 'عملية مجمعة', severity: 'medium', icon: '📋', category: 'bulk' },
  template_generate: {
    label: 'إنشاء من قالب',
    severity: 'info',
    icon: '📄',
    category: 'templates',
  },
  export: { label: 'تصدير', severity: 'medium', icon: '📤', category: 'file' },
  print: { label: 'طباعة', severity: 'low', icon: '🖨️', category: 'file' },
  comment: { label: 'تعليق', severity: 'info', icon: '💬', category: 'collaboration' },
  mention: { label: 'إشارة', severity: 'info', icon: '@', category: 'collaboration' },
  login_access: { label: 'دخول', severity: 'info', icon: '🔑', category: 'security' },
  suspicious_activity: {
    label: 'نشاط مشبوه',
    severity: 'critical',
    icon: '⚠️',
    category: 'security',
  },
};

// ─────────────────────────────────────────────
// خدمة التدقيق
// ─────────────────────────────────────────────

class DocumentAuditService {
  /**
   * تسجيل إجراء في سجل التدقيق
   */
  async log(params) {
    try {
      const {
        documentId,
        documentTitle,
        action,
        userId,
        userName,
        userRole,
        userDepartment,
        details,
        sessionInfo,
      } = params;

      const config = ACTION_CONFIG[action] || ACTION_CONFIG.read;

      // جلب آخر سجل لحساب الهاش التسلسلي
      const lastLog = await AuditLog.findOne()
        .sort({ sequenceNumber: -1 })
        .select('sequenceNumber currentHash')
        .lean();
      const sequenceNumber = (lastLog?.sequenceNumber || 0) + 1;
      const previousHash = lastLog?.currentHash || '0';

      // إنشاء الهاش (blockchain-style)
      const hashData = `${sequenceNumber}:${previousHash}:${documentId}:${action}:${userId}:${Date.now()}`;
      const currentHash = crypto.createHash('sha256').update(hashData).digest('hex');

      // كشف النشاط المشبوه
      const suspiciousCheck = await this._detectSuspiciousActivity(action, userId, documentId);

      const auditEntry = new AuditLog({
        sequenceNumber,
        previousHash,
        currentHash,
        documentId,
        documentTitle,
        action,
        actionLabel: config.label,
        details: details || {},
        userId,
        userName,
        userRole,
        userDepartment,
        sessionInfo: sessionInfo || {},
        severity: suspiciousCheck.isSuspicious ? 'critical' : config.severity,
        isSuspicious: suspiciousCheck.isSuspicious,
        suspiciousReason: suspiciousCheck.reason,
        complianceFlags: this._getComplianceFlags(action),
      });

      await auditEntry.save();
      logger.debug(`[Audit] #${sequenceNumber}: ${config.label} - ${documentTitle || documentId}`);

      return { success: true, sequenceNumber, hash: currentHash };
    } catch (err) {
      logger.error(`[Audit] خطأ: ${err.message}`);
      // التدقيق لا يجب أن يوقف العمليات
      return { success: false, error: err.message };
    }
  }

  /**
   * جلب سجل التدقيق لمستند
   */
  async getDocumentAuditLog(documentId, options = {}) {
    try {
      const query = { documentId };
      if (options.action) query.action = options.action;
      if (options.userId) query.userId = options.userId;
      if (options.severity) query.severity = options.severity;
      if (options.from || options.to) {
        query.createdAt = {};
        if (options.from) query.createdAt.$gte = new Date(options.from);
        if (options.to) query.createdAt.$lte = new Date(options.to);
      }

      const page = options.page || 1;
      const limit = options.limit || 50;

      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .populate('userId', 'name email')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        AuditLog.countDocuments(query),
      ]);

      return {
        success: true,
        logs: logs.map(l => this._formatLog(l)),
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error(`[Audit] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب سجل تدقيق مستخدم
   */
  async getUserAuditLog(userId, options = {}) {
    try {
      const query = { userId };
      if (options.action) query.action = options.action;
      if (options.from || options.to) {
        query.createdAt = {};
        if (options.from) query.createdAt.$gte = new Date(options.from);
        if (options.to) query.createdAt.$lte = new Date(options.to);
      }

      const page = options.page || 1;
      const limit = options.limit || 50;

      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .populate('documentId', 'title')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        AuditLog.countDocuments(query),
      ]);

      return {
        success: true,
        logs: logs.map(l => this._formatLog(l)),
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error(`[Audit] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * تقرير الأنشطة المشبوهة
   */
  async getSuspiciousActivities(options = {}) {
    try {
      const query = { isSuspicious: true };
      if (options.from || options.to) {
        query.createdAt = {};
        if (options.from) query.createdAt.$gte = new Date(options.from);
        if (options.to) query.createdAt.$lte = new Date(options.to);
      }

      const logs = await AuditLog.find(query)
        .populate('userId', 'name email')
        .populate('documentId', 'title')
        .sort({ createdAt: -1 })
        .limit(options.limit || 100)
        .lean();

      // تجميع حسب المستخدم
      const byUser = {};
      for (const log of logs) {
        const uid = log.userId?._id?.toString() || 'unknown';
        if (!byUser[uid]) {
          byUser[uid] = {
            userId: uid,
            userName: log.userName || log.userId?.name || 'غير معروف',
            count: 0,
            actions: [],
          };
        }
        byUser[uid].count++;
        byUser[uid].actions.push({
          action: log.action,
          reason: log.suspiciousReason,
          date: log.createdAt,
        });
      }

      return {
        success: true,
        total: logs.length,
        byUser: Object.values(byUser).sort((a, b) => b.count - a.count),
        logs: logs.map(l => this._formatLog(l)),
      };
    } catch (err) {
      logger.error(`[Audit] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * تقرير الامتثال
   */
  async getComplianceReport(options = {}) {
    try {
      const dateRange = {};
      if (options.from) dateRange.$gte = new Date(options.from);
      if (options.to) dateRange.$lte = new Date(options.to);
      const dateQuery = Object.keys(dateRange).length > 0 ? { createdAt: dateRange } : {};

      const [
        totalActions,
        actionBreakdown,
        severityBreakdown,
        suspiciousCount,
        topUsers,
        topDocuments,
        hourlyDistribution,
      ] = await Promise.all([
        AuditLog.countDocuments(dateQuery),
        AuditLog.aggregate([
          { $match: dateQuery },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        AuditLog.aggregate([
          { $match: dateQuery },
          { $group: { _id: '$severity', count: { $sum: 1 } } },
        ]),
        AuditLog.countDocuments({ ...dateQuery, isSuspicious: true }),
        AuditLog.aggregate([
          { $match: dateQuery },
          { $group: { _id: '$userId', count: { $sum: 1 }, userName: { $first: '$userName' } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        AuditLog.aggregate([
          { $match: { ...dateQuery, documentId: { $ne: null } } },
          {
            $group: { _id: '$documentId', count: { $sum: 1 }, title: { $first: '$documentTitle' } },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        AuditLog.aggregate([
          { $match: dateQuery },
          { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
      ]);

      return {
        success: true,
        report: {
          period: {
            from: options.from || 'الكل',
            to: options.to || 'الآن',
          },
          summary: {
            totalActions,
            suspiciousCount,
            suspiciousPercentage:
              totalActions > 0 ? ((suspiciousCount / totalActions) * 100).toFixed(2) : '0',
          },
          actionBreakdown: actionBreakdown.map(a => ({
            action: a._id,
            label: ACTION_CONFIG[a._id]?.label || a._id,
            icon: ACTION_CONFIG[a._id]?.icon || '📄',
            count: a.count,
          })),
          severityBreakdown: severityBreakdown.map(s => ({
            severity: s._id,
            count: s.count,
          })),
          topUsers: topUsers.map(u => ({
            userId: u._id,
            userName: u.userName || 'غير معروف',
            actionsCount: u.count,
          })),
          topDocuments: topDocuments.map(d => ({
            documentId: d._id,
            title: d.title || 'بدون عنوان',
            actionsCount: d.count,
          })),
          hourlyDistribution: hourlyDistribution.map(h => ({
            hour: h._id,
            count: h.count,
          })),
        },
      };
    } catch (err) {
      logger.error(`[Audit] خطأ في تقرير الامتثال: ${err.message}`);
      throw err;
    }
  }

  /**
   * التحقق من سلامة السلسلة (Blockchain integrity)
   */
  async verifyChainIntegrity(options = {}) {
    try {
      const limit = options.limit || 1000;
      const logs = await AuditLog.find()
        .sort({ sequenceNumber: 1 })
        .limit(limit)
        .select('sequenceNumber previousHash currentHash')
        .lean();

      let isValid = true;
      const issues = [];

      for (let i = 1; i < logs.length; i++) {
        const current = logs[i];
        const previous = logs[i - 1];

        if (current.previousHash !== previous.currentHash) {
          isValid = false;
          issues.push({
            sequenceNumber: current.sequenceNumber,
            expected: previous.currentHash,
            found: current.previousHash,
          });
        }
      }

      return {
        success: true,
        isValid,
        checkedRecords: logs.length,
        issues,
        message: isValid
          ? '✅ سلسلة التدقيق سليمة وغير معدلة'
          : `⚠️ تم اكتشاف ${issues.length} خلل في سلسلة التدقيق`,
      };
    } catch (err) {
      logger.error(`[Audit] خطأ في التحقق: ${err.message}`);
      throw err;
    }
  }

  /**
   * إحصائيات عامة
   */
  async getAuditStats() {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalLogs, todayLogs, weekLogs, monthLogs, suspiciousLogs, lastSequence] =
        await Promise.all([
          AuditLog.countDocuments(),
          AuditLog.countDocuments({ createdAt: { $gte: today } }),
          AuditLog.countDocuments({ createdAt: { $gte: thisWeek } }),
          AuditLog.countDocuments({ createdAt: { $gte: thisMonth } }),
          AuditLog.countDocuments({ isSuspicious: true }),
          AuditLog.findOne().sort({ sequenceNumber: -1 }).select('sequenceNumber').lean(),
        ]);

      return {
        success: true,
        stats: {
          totalLogs,
          todayLogs,
          weekLogs,
          monthLogs,
          suspiciousLogs,
          lastSequence: lastSequence?.sequenceNumber || 0,
        },
      };
    } catch (err) {
      logger.error(`[Audit] خطأ: ${err.message}`);
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  كشف الأنشطة المشبوهة
  // ═══════════════════════════════════════════════════════════

  async _detectSuspiciousActivity(action, userId, documentId) {
    try {
      const suspiciousPatterns = [];

      // 1. حذف مكثف (أكثر من 10 حذف في ساعة)
      if (action === 'delete') {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const deleteCount = await AuditLog.countDocuments({
          userId,
          action: 'delete',
          createdAt: { $gte: oneHourAgo },
        });
        if (deleteCount >= 10) {
          suspiciousPatterns.push('حذف مكثف: أكثر من 10 عمليات حذف في ساعة واحدة');
        }
      }

      // 2. تحميل مكثف (أكثر من 50 تحميل في ساعة)
      if (action === 'download') {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const downloadCount = await AuditLog.countDocuments({
          userId,
          action: 'download',
          createdAt: { $gte: oneHourAgo },
        });
        if (downloadCount >= 50) {
          suspiciousPatterns.push('تحميل مكثف: أكثر من 50 تحميل في ساعة واحدة');
        }
      }

      // 3. نشاط خارج ساعات العمل (في المنطقة الزمنية المحلية)
      const hour = new Date().getHours();
      if ((hour < 6 || hour > 23) && ['delete', 'export', 'permission_change'].includes(action)) {
        suspiciousPatterns.push('نشاط حساس خارج ساعات العمل');
      }

      // 4. تغيير صلاحيات متكرر
      if (action === 'permission_change') {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const permCount = await AuditLog.countDocuments({
          userId,
          action: 'permission_change',
          createdAt: { $gte: oneHourAgo },
        });
        if (permCount >= 5) {
          suspiciousPatterns.push('تغييرات صلاحيات متكررة');
        }
      }

      return {
        isSuspicious: suspiciousPatterns.length > 0,
        reason: suspiciousPatterns.join(' | '),
      };
    } catch (err) {
      return { isSuspicious: false, reason: '' };
    }
  }

  _getComplianceFlags(action) {
    const flags = [];
    if (['delete', 'permission_change', 'export'].includes(action)) flags.push('data_protection');
    if (['sign', 'approve', 'reject'].includes(action)) flags.push('workflow_compliance');
    if (['create', 'update', 'delete'].includes(action)) flags.push('change_management');
    return flags;
  }

  _formatLog(log) {
    const config = ACTION_CONFIG[log.action] || {};
    return {
      id: log._id,
      sequenceNumber: log.sequenceNumber,
      documentId: log.documentId,
      documentTitle: log.documentTitle,
      action: {
        key: log.action,
        label: config.label || log.action,
        icon: config.icon || '📄',
        category: config.category || 'other',
      },
      details: log.details,
      user: {
        id: log.userId?._id || log.userId,
        name: log.userName || log.userId?.name,
        role: log.userRole,
        department: log.userDepartment,
      },
      sessionInfo: log.sessionInfo,
      severity: log.severity,
      isSuspicious: log.isSuspicious,
      suspiciousReason: log.suspiciousReason,
      complianceFlags: log.complianceFlags,
      createdAt: log.createdAt,
    };
  }
}

module.exports = new DocumentAuditService();
module.exports.AuditLog = AuditLog;
