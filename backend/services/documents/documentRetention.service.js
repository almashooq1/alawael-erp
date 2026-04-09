'use strict';

/**
 * Document Retention Policy Service — خدمة سياسات الاحتفاظ
 * ═══════════════════════════════════════════════════════════════
 * إدارة سياسات الاحتفاظ بالمستندات، قواعد الانتهاء التلقائي،
 * الحجز القانوني، التنظيف الآلي، والامتثال
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// ─────────────────────────────────────────────
// مخطط سياسة الاحتفاظ
// ─────────────────────────────────────────────

const RetentionPolicySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameEn: String,
    description: String,

    // القواعد
    rules: {
      // الفئات التي تنطبق عليها
      categories: [String],
      // أنواع الملفات
      fileTypes: [String],
      // الوسوم
      tags: [String],
      // الأقسام
      departments: [String],
    },

    // مدة الاحتفاظ
    retentionPeriod: {
      value: { type: Number, required: true },
      unit: {
        type: String,
        enum: ['days', 'months', 'years'],
        default: 'years',
      },
    },

    // الإجراء عند الانتهاء
    expiryAction: {
      type: String,
      enum: ['archive', 'delete', 'notify_only', 'review_required'],
      default: 'archive',
    },

    // فترة التحذير قبل الانتهاء (بالأيام)
    warningDays: { type: Number, default: 30 },

    // الأولوية (الأعلى يُنفذ أولاً)
    priority: { type: Number, default: 0 },

    // الحالة
    isActive: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false },

    // الحجز القانوني
    legalHold: {
      isEnabled: { type: Boolean, default: false },
      reason: String,
      holdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      holdAt: Date,
      releaseAt: Date,
    },

    // إحصائيات
    documentsAffected: { type: Number, default: 0 },
    lastExecutedAt: Date,
    executionCount: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'document_retention_policies',
  }
);

RetentionPolicySchema.index({ isActive: 1, priority: -1 });

const RetentionPolicy =
  mongoose.models.RetentionPolicy || mongoose.model('RetentionPolicy', RetentionPolicySchema);

// ─────────────────────────────────────────────
// سجل التنفيذ
// ─────────────────────────────────────────────

const RetentionLogSchema = new mongoose.Schema(
  {
    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'RetentionPolicy' },
    policyName: String,
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    documentTitle: String,
    action: {
      type: String,
      enum: [
        'archived',
        'deleted',
        'notified',
        'review_flagged',
        'legal_hold_applied',
        'legal_hold_released',
        'extended',
      ],
    },
    executedBy: String,
    details: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'document_retention_logs' }
);

RetentionLogSchema.index({ policyId: 1, createdAt: -1 });
RetentionLogSchema.index({ documentId: 1 });

const RetentionLog =
  mongoose.models.RetentionLog || mongoose.model('RetentionLog', RetentionLogSchema);

// ─────────────────────────────────────────────
// السياسات الافتراضية
// ─────────────────────────────────────────────

const DEFAULT_POLICIES = [
  {
    name: 'الوثائق المالية',
    nameEn: 'Financial Documents',
    description: 'الاحتفاظ بالوثائق المالية لمدة 7 سنوات وفقاً للمتطلبات النظامية',
    rules: { categories: ['مالية', 'فواتير', 'محاسبة'] },
    retentionPeriod: { value: 7, unit: 'years' },
    expiryAction: 'archive',
    warningDays: 90,
    priority: 10,
    isSystem: true,
  },
  {
    name: 'العقود',
    nameEn: 'Contracts',
    description: 'الاحتفاظ بالعقود لمدة 10 سنوات بعد انتهائها',
    rules: { categories: ['عقود', 'اتفاقيات'] },
    retentionPeriod: { value: 10, unit: 'years' },
    expiryAction: 'review_required',
    warningDays: 180,
    priority: 20,
    isSystem: true,
  },
  {
    name: 'المراسلات',
    nameEn: 'Correspondence',
    description: 'الاحتفاظ بالمراسلات لمدة 3 سنوات ثم أرشفة',
    rules: { categories: ['رسائل_رسمية', 'مراسلات'] },
    retentionPeriod: { value: 3, unit: 'years' },
    expiryAction: 'archive',
    warningDays: 30,
    priority: 5,
    isSystem: true,
  },
  {
    name: 'المسودات والملفات المؤقتة',
    nameEn: 'Drafts & Temp Files',
    description: 'حذف المسودات والملفات المؤقتة بعد 6 أشهر',
    rules: { tags: ['مسودة', 'مؤقت', 'draft'] },
    retentionPeriod: { value: 6, unit: 'months' },
    expiryAction: 'delete',
    warningDays: 14,
    priority: 1,
    isSystem: true,
  },
];

// ─────────────────────────────────────────────
// خدمة سياسات الاحتفاظ
// ─────────────────────────────────────────────

class DocumentRetentionService {
  /**
   * تهيئة السياسات الافتراضية
   */
  async initializeDefaults() {
    try {
      let created = 0;
      for (const policy of DEFAULT_POLICIES) {
        const exists = await RetentionPolicy.findOne({ name: policy.name, isSystem: true });
        if (!exists) {
          await new RetentionPolicy(policy).save();
          created++;
        }
      }
      return { success: true, created, message: `تم إنشاء ${created} سياسات افتراضية` };
    } catch (err) {
      logger.error(`[Retention] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب جميع السياسات
   */
  async getPolicies(options = {}) {
    try {
      const query = {};
      if (options.activeOnly !== false) query.isActive = true;

      const policies = await RetentionPolicy.find(query)
        .populate('createdBy', 'name')
        .sort({ priority: -1, name: 1 })
        .lean();

      return {
        success: true,
        policies: policies.map(p => this._formatPolicy(p)),
        total: policies.length,
      };
    } catch (err) {
      logger.error(`[Retention] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب سياسة واحدة
   */
  async getPolicy(policyId) {
    try {
      const policy = await RetentionPolicy.findById(policyId)
        .populate('createdBy', 'name email')
        .lean();
      if (!policy) return null;
      return this._formatPolicy(policy);
    } catch (err) {
      logger.error(`[Retention] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * إنشاء سياسة
   */
  async createPolicy(data, userId) {
    try {
      const policy = new RetentionPolicy({ ...data, createdBy: userId, updatedBy: userId });
      await policy.save();
      logger.info(`[Retention] سياسة جديدة: ${data.name}`);
      return { success: true, policy: this._formatPolicy(policy.toObject()) };
    } catch (err) {
      logger.error(`[Retention] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * تحديث سياسة
   */
  async updatePolicy(policyId, data, userId) {
    try {
      const policy = await RetentionPolicy.findById(policyId);
      if (!policy) throw new Error('السياسة غير موجودة');
      if (policy.isSystem) throw new Error('لا يمكن تعديل سياسات النظام');

      Object.assign(policy, data, { updatedBy: userId });
      await policy.save();
      return { success: true, policy: this._formatPolicy(policy.toObject()) };
    } catch (err) {
      logger.error(`[Retention] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * حذف سياسة
   */
  async deletePolicy(policyId) {
    try {
      const policy = await RetentionPolicy.findById(policyId);
      if (!policy) throw new Error('السياسة غير موجودة');
      if (policy.isSystem) throw new Error('لا يمكن حذف سياسات النظام');

      policy.isActive = false;
      await policy.save();
      return { success: true, message: 'تم تعطيل السياسة' };
    } catch (err) {
      logger.error(`[Retention] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * تطبيق الحجز القانوني على مستند
   */
  async applyLegalHold(documentId, userId, reason) {
    try {
      const Document = mongoose.model('Document');
      await Document.findByIdAndUpdate(documentId, {
        'retentionPolicy.legalHold': true,
        'retentionPolicy.legalHoldReason': reason,
        'retentionPolicy.legalHoldBy': userId,
        'retentionPolicy.legalHoldAt': new Date(),
      });

      await new RetentionLog({
        documentId,
        action: 'legal_hold_applied',
        executedBy: 'user',
        details: { reason, userId },
      }).save();

      logger.info(`[Retention] حجز قانوني على مستند: ${documentId}`);
      return { success: true, message: 'تم تطبيق الحجز القانوني' };
    } catch (err) {
      logger.error(`[Retention] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * إزالة الحجز القانوني
   */
  async releaseLegalHold(documentId, userId) {
    try {
      const Document = mongoose.model('Document');
      await Document.findByIdAndUpdate(documentId, {
        $unset: {
          'retentionPolicy.legalHold': 1,
          'retentionPolicy.legalHoldReason': 1,
          'retentionPolicy.legalHoldBy': 1,
          'retentionPolicy.legalHoldAt': 1,
        },
      });

      await new RetentionLog({
        documentId,
        action: 'legal_hold_released',
        executedBy: 'user',
        details: { userId },
      }).save();

      return { success: true, message: 'تم إزالة الحجز القانوني' };
    } catch (err) {
      logger.error(`[Retention] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * تنفيذ السياسات (يُشغّل بشكل مجدول)
   */
  async executeRetentionPolicies() {
    try {
      const policies = await RetentionPolicy.find({ isActive: true }).sort({ priority: -1 }).lean();
      const Document = mongoose.model('Document');
      const results = { processed: 0, archived: 0, deleted: 0, notified: 0, flagged: 0 };

      for (const policy of policies) {
        const expiryDate = this._calcExpiryDate(policy.retentionPeriod);
        const query = this._buildQuery(policy.rules, expiryDate);
        query['retentionPolicy.legalHold'] = { $ne: true };

        const expiredDocs = await Document.find(query).select('_id title').limit(500).lean();
        results.processed += expiredDocs.length;

        for (const doc of expiredDocs) {
          try {
            switch (policy.expiryAction) {
              case 'archive':
                await Document.findByIdAndUpdate(doc._id, {
                  status: 'archived',
                  archivedAt: new Date(),
                });
                results.archived++;
                break;
              case 'delete':
                await Document.findByIdAndUpdate(doc._id, {
                  isDeleted: true,
                  deletedAt: new Date(),
                });
                results.deleted++;
                break;
              case 'review_required':
                await Document.findByIdAndUpdate(doc._id, {
                  'retentionPolicy.reviewRequired': true,
                });
                results.flagged++;
                break;
              case 'notify_only':
                results.notified++;
                break;
            }

            await new RetentionLog({
              policyId: policy._id,
              policyName: policy.name,
              documentId: doc._id,
              documentTitle: doc.title,
              action:
                policy.expiryAction === 'delete'
                  ? 'deleted'
                  : policy.expiryAction === 'archive'
                    ? 'archived'
                    : policy.expiryAction === 'review_required'
                      ? 'review_flagged'
                      : 'notified',
              executedBy: 'system',
            }).save();
          } catch (docErr) {
            logger.warn(`[Retention] خطأ معالجة مستند ${doc._id}: ${docErr.message}`);
          }
        }

        await RetentionPolicy.findByIdAndUpdate(policy._id, {
          lastExecutedAt: new Date(),
          $inc: { executionCount: 1 },
          documentsAffected: expiredDocs.length,
        });
      }

      logger.info(`[Retention] تنفيذ السياسات: ${JSON.stringify(results)}`);
      return { success: true, results };
    } catch (err) {
      logger.error(`[Retention] خطأ في التنفيذ: ${err.message}`);
      throw err;
    }
  }

  /**
   * المستندات المنتهية أو قريبة الانتهاء
   */
  async getExpiringDocuments(options = {}) {
    try {
      const Document = mongoose.model('Document');
      const daysAhead = options.daysAhead || 30;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysAhead);

      const docs = await Document.find({
        expiryDate: { $lte: targetDate, $gte: new Date() },
        isDeleted: { $ne: true },
        'retentionPolicy.legalHold': { $ne: true },
      })
        .select('title category expiryDate createdAt')
        .sort({ expiryDate: 1 })
        .limit(options.limit || 100)
        .lean();

      return { success: true, documents: docs, total: docs.length };
    } catch (err) {
      logger.error(`[Retention] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * سجل تنفيذ السياسات
   */
  async getRetentionLogs(options = {}) {
    try {
      const query = {};
      if (options.policyId) query.policyId = options.policyId;
      if (options.documentId) query.documentId = options.documentId;

      const logs = await RetentionLog.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 100)
        .lean();

      return { success: true, logs, total: logs.length };
    } catch (err) {
      logger.error(`[Retention] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * إحصائيات
   */
  async getStats() {
    try {
      const [totalPolicies, activePolicies, totalLogs, recentLogs] = await Promise.all([
        RetentionPolicy.countDocuments(),
        RetentionPolicy.countDocuments({ isActive: true }),
        RetentionLog.countDocuments(),
        RetentionLog.aggregate([{ $group: { _id: '$action', count: { $sum: 1 } } }]),
      ]);

      return {
        success: true,
        stats: { totalPolicies, activePolicies, totalLogs, byAction: recentLogs },
      };
    } catch (err) {
      logger.error(`[Retention] خطأ: ${err.message}`);
      throw err;
    }
  }

  _calcExpiryDate(period) {
    const date = new Date();
    switch (period.unit) {
      case 'days':
        date.setDate(date.getDate() - period.value);
        break;
      case 'months':
        date.setMonth(date.getMonth() - period.value);
        break;
      case 'years':
        date.setFullYear(date.getFullYear() - period.value);
        break;
    }
    return date;
  }

  _buildQuery(rules, expiryDate) {
    const query = { createdAt: { $lte: expiryDate }, isDeleted: { $ne: true } };
    if (rules?.categories?.length) query.category = { $in: rules.categories };
    if (rules?.fileTypes?.length) query.fileType = { $in: rules.fileTypes };
    if (rules?.tags?.length) query.tags = { $in: rules.tags };
    if (rules?.departments?.length) query.department = { $in: rules.departments };
    return query;
  }

  _formatPolicy(policy) {
    const unitLabels = { days: 'يوم', months: 'شهر', years: 'سنة' };
    const actionLabels = {
      archive: { label: 'أرشفة', icon: '📦', color: '#607D8B' },
      delete: { label: 'حذف', icon: '🗑️', color: '#F44336' },
      notify_only: { label: 'إشعار فقط', icon: '🔔', color: '#FF9800' },
      review_required: { label: 'مراجعة مطلوبة', icon: '👁️', color: '#2196F3' },
    };

    return {
      id: policy._id,
      name: policy.name,
      nameEn: policy.nameEn,
      description: policy.description,
      rules: policy.rules,
      retentionPeriod: {
        ...policy.retentionPeriod,
        display: `${policy.retentionPeriod.value} ${unitLabels[policy.retentionPeriod.unit] || policy.retentionPeriod.unit}`,
      },
      expiryAction: {
        key: policy.expiryAction,
        ...(actionLabels[policy.expiryAction] || actionLabels.archive),
      },
      warningDays: policy.warningDays,
      priority: policy.priority,
      isActive: policy.isActive,
      isSystem: policy.isSystem,
      legalHold: policy.legalHold,
      documentsAffected: policy.documentsAffected,
      lastExecutedAt: policy.lastExecutedAt,
      executionCount: policy.executionCount,
      createdBy: policy.createdBy,
      createdAt: policy.createdAt,
    };
  }
}

module.exports = new DocumentRetentionService();
module.exports.RetentionPolicy = RetentionPolicy;
module.exports.RetentionLog = RetentionLog;
