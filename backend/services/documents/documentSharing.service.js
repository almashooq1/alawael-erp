'use strict';

/**
 * Document Sharing & Collaboration Service — خدمة المشاركة والتعاون
 * ═══════════════════════════════════════════════════════════════════
 * مشاركة مستندات مع صلاحيات دقيقة، روابط عامة، دعوات بالبريد،
 * تتبع الوصول، وإدارة المجموعات
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const logger = require('../../utils/logger');

// ─────────────────────────────────────────────
// مخطط المشاركة
// ─────────────────────────────────────────────

const DocumentShareSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },

    // نوع المشاركة
    shareType: {
      type: String,
      enum: ['user', 'group', 'department', 'public_link', 'email_invite'],
      required: true,
    },

    // المستلم
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    recipientName: String,
    recipientEmail: String,
    recipientGroup: String,
    recipientDepartment: String,

    // الصلاحيات
    permission: {
      type: String,
      enum: ['view', 'comment', 'edit', 'download', 'full_access'],
      default: 'view',
    },

    // الرابط العام
    shareLink: { type: String, unique: true, sparse: true },
    shareLinkPassword: String,

    // الانتهاء
    expiresAt: Date,
    isExpired: { type: Boolean, default: false },

    // الحالة
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired', 'pending'],
      default: 'active',
    },

    // التتبع
    accessCount: { type: Number, default: 0 },
    lastAccessedAt: Date,
    lastAccessedBy: String,

    // رسالة المشاركة
    message: String,

    // من شارك
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sharedByName: String,

    revokedAt: Date,
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'document_shares',
  }
);

DocumentShareSchema.index({ documentId: 1, recipientId: 1 });
DocumentShareSchema.index({ documentId: 1, status: 1 });
DocumentShareSchema.index({ shareLink: 1 });
DocumentShareSchema.index({ recipientId: 1, status: 1 });
DocumentShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const DocumentShare =
  mongoose.models.DocumentShare || mongoose.model('DocumentShare', DocumentShareSchema);

// ─────────────────────────────────────────────
// سجل الوصول
// ─────────────────────────────────────────────

const AccessLogSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', index: true },
    shareId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentShare' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    action: {
      type: String,
      enum: ['view', 'download', 'edit', 'print', 'comment'],
      default: 'view',
    },
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true, collection: 'document_access_logs' }
);

AccessLogSchema.index({ documentId: 1, createdAt: -1 });

const AccessLog =
  mongoose.models.DocumentAccessLog || mongoose.model('DocumentAccessLog', AccessLogSchema);

// ─────────────────────────────────────────────
// خدمة المشاركة
// ─────────────────────────────────────────────

class DocumentSharingService {
  /**
   * مشاركة مستند مع مستخدم
   */
  async shareWithUser(documentId, sharedBy, data) {
    try {
      // تحقق من عدم وجود مشاركة سابقة
      const existing = await DocumentShare.findOne({
        documentId,
        recipientId: data.recipientId,
        status: 'active',
      });

      if (existing) {
        // تحديث الصلاحيات
        existing.permission = data.permission || existing.permission;
        existing.expiresAt = data.expiresAt || existing.expiresAt;
        existing.message = data.message || existing.message;
        await existing.save();
        return { success: true, share: this._format(existing.toObject()), updated: true };
      }

      const share = new DocumentShare({
        documentId,
        shareType: 'user',
        recipientId: data.recipientId,
        recipientName: data.recipientName || '',
        recipientEmail: data.recipientEmail || '',
        permission: data.permission || 'view',
        expiresAt: data.expiresAt || null,
        message: data.message || '',
        sharedBy,
        sharedByName: data.sharedByName || '',
      });

      await share.save();
      logger.info(`[Sharing] مشاركة مستند ${documentId} مع مستخدم ${data.recipientId}`);
      return { success: true, share: this._format(share.toObject()) };
    } catch (err) {
      logger.error(`[Sharing] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * مشاركة مع قسم
   */
  async shareWithDepartment(documentId, sharedBy, data) {
    try {
      const share = new DocumentShare({
        documentId,
        shareType: 'department',
        recipientDepartment: data.department,
        permission: data.permission || 'view',
        expiresAt: data.expiresAt || null,
        message: data.message || '',
        sharedBy,
        sharedByName: data.sharedByName || '',
      });

      await share.save();
      return { success: true, share: this._format(share.toObject()) };
    } catch (err) {
      logger.error(`[Sharing] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * إنشاء رابط مشاركة عام
   */
  async createPublicLink(documentId, sharedBy, data = {}) {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const shareLink = `share_${token}`;

      const share = new DocumentShare({
        documentId,
        shareType: 'public_link',
        permission: data.permission || 'view',
        shareLink,
        shareLinkPassword: data.password
          ? crypto.createHash('sha256').update(data.password).digest('hex')
          : null,
        expiresAt: data.expiresAt || null,
        message: data.message || '',
        sharedBy,
        sharedByName: data.sharedByName || '',
      });

      await share.save();
      logger.info(`[Sharing] إنشاء رابط عام لمستند ${documentId}`);
      return { success: true, share: this._format(share.toObject()), link: shareLink };
    } catch (err) {
      logger.error(`[Sharing] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * الوصول عبر رابط عام
   */
  async accessByLink(shareLink, password, accessInfo = {}) {
    try {
      const share = await DocumentShare.findOne({ shareLink, status: 'active' });
      if (!share) throw new Error('الرابط غير صالح أو منتهي');

      // التحقق من كلمة المرور
      if (share.shareLinkPassword) {
        const hashed = crypto
          .createHash('sha256')
          .update(password || '')
          .digest('hex');
        if (hashed !== share.shareLinkPassword) {
          throw new Error('كلمة المرور غير صحيحة');
        }
      }

      // التحقق من الانتهاء
      if (share.expiresAt && new Date() > share.expiresAt) {
        share.status = 'expired';
        share.isExpired = true;
        await share.save();
        throw new Error('الرابط منتهي الصلاحية');
      }

      // تحديث التتبع
      share.accessCount += 1;
      share.lastAccessedAt = new Date();
      share.lastAccessedBy = accessInfo.userName || accessInfo.ipAddress || '';
      await share.save();

      // تسجيل الوصول
      await new AccessLog({
        documentId: share.documentId,
        shareId: share._id,
        userId: accessInfo.userId,
        userName: accessInfo.userName || '',
        action: 'view',
        ipAddress: accessInfo.ipAddress,
        userAgent: accessInfo.userAgent,
      }).save();

      return {
        success: true,
        documentId: share.documentId,
        permission: share.permission,
      };
    } catch (err) {
      logger.error(`[Sharing] خطأ وصول: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب مشاركات المستند
   */
  async getDocumentShares(documentId) {
    try {
      const shares = await DocumentShare.find({ documentId, status: { $ne: 'revoked' } })
        .populate('recipientId', 'name email avatar')
        .populate('sharedBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      return {
        success: true,
        shares: shares.map(s => this._format(s)),
        total: shares.length,
      };
    } catch (err) {
      logger.error(`[Sharing] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب المستندات المشاركة مع مستخدم
   */
  async getSharedWithMe(userId, options = {}) {
    try {
      const query = { recipientId: userId, status: 'active' };
      if (options.permission) query.permission = options.permission;

      const shares = await DocumentShare.find(query)
        .populate('documentId', 'title description category fileType fileSize createdAt')
        .populate('sharedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(options.limit || 50)
        .lean();

      return {
        success: true,
        shares: shares.filter(s => s.documentId).map(s => this._format(s)),
      };
    } catch (err) {
      logger.error(`[Sharing] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * إلغاء مشاركة
   */
  async revokeShare(shareId, revokedBy) {
    try {
      const share = await DocumentShare.findById(shareId);
      if (!share) throw new Error('المشاركة غير موجودة');

      share.status = 'revoked';
      share.revokedAt = new Date();
      share.revokedBy = revokedBy;
      await share.save();

      return { success: true, message: 'تم إلغاء المشاركة' };
    } catch (err) {
      logger.error(`[Sharing] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * تحديث صلاحيات مشاركة
   */
  async updatePermission(shareId, permission) {
    try {
      await DocumentShare.findByIdAndUpdate(shareId, { permission });
      return { success: true, message: 'تم تحديث الصلاحيات' };
    } catch (err) {
      logger.error(`[Sharing] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * سجل الوصول لمستند
   */
  async getAccessLog(documentId, options = {}) {
    try {
      const page = options.page || 1;
      const limit = options.limit || 50;

      const [logs, total] = await Promise.all([
        AccessLog.find({ documentId })
          .populate('userId', 'name email')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        AccessLog.countDocuments({ documentId }),
      ]);

      return { success: true, logs, total, page, pages: Math.ceil(total / limit) };
    } catch (err) {
      logger.error(`[Sharing] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * تسجيل وصول
   */
  async logAccess(documentId, userId, action, info = {}) {
    try {
      await new AccessLog({
        documentId,
        userId,
        userName: info.userName || '',
        action,
        ipAddress: info.ipAddress || '',
        userAgent: info.userAgent || '',
      }).save();
      return { success: true };
    } catch (err) {
      logger.warn(`[Sharing] خطأ تسجيل: ${err.message}`);
      return { success: false };
    }
  }

  /**
   * إحصائيات المشاركة
   */
  async getShareStats(documentId) {
    try {
      const [totalShares, byType, byPermission, totalAccess] = await Promise.all([
        DocumentShare.countDocuments({ documentId, status: 'active' }),
        DocumentShare.aggregate([
          { $match: { documentId: new mongoose.Types.ObjectId(documentId), status: 'active' } },
          { $group: { _id: '$shareType', count: { $sum: 1 } } },
        ]),
        DocumentShare.aggregate([
          { $match: { documentId: new mongoose.Types.ObjectId(documentId), status: 'active' } },
          { $group: { _id: '$permission', count: { $sum: 1 } } },
        ]),
        AccessLog.countDocuments({ documentId }),
      ]);

      return {
        success: true,
        stats: { totalShares, byType, byPermission, totalAccess },
      };
    } catch (err) {
      logger.error(`[Sharing] خطأ: ${err.message}`);
      throw err;
    }
  }

  _format(share) {
    const permLabels = {
      view: { label: 'عرض', icon: '👁️', color: '#2196F3' },
      comment: { label: 'تعليق', icon: '💬', color: '#4CAF50' },
      edit: { label: 'تعديل', icon: '✏️', color: '#FF9800' },
      download: { label: 'تحميل', icon: '📥', color: '#9C27B0' },
      full_access: { label: 'وصول كامل', icon: '🔓', color: '#F44336' },
    };

    return {
      id: share._id,
      documentId: share.documentId,
      document: share.documentId?.title
        ? {
            id: share.documentId._id,
            title: share.documentId.title,
            category: share.documentId.category,
            fileType: share.documentId.fileType,
          }
        : null,
      shareType: share.shareType,
      recipient: {
        id: share.recipientId?._id || share.recipientId,
        name: share.recipientName || share.recipientId?.name,
        email: share.recipientEmail || share.recipientId?.email,
        group: share.recipientGroup,
        department: share.recipientDepartment,
      },
      permission: { key: share.permission, ...(permLabels[share.permission] || permLabels.view) },
      shareLink: share.shareLink,
      hasPassword: !!share.shareLinkPassword,
      expiresAt: share.expiresAt,
      isExpired: share.isExpired,
      status: share.status,
      accessCount: share.accessCount,
      lastAccessedAt: share.lastAccessedAt,
      message: share.message,
      sharedBy: {
        id: share.sharedBy?._id || share.sharedBy,
        name: share.sharedByName || share.sharedBy?.name,
      },
      createdAt: share.createdAt,
    };
  }
}

module.exports = new DocumentSharingService();
module.exports.DocumentShare = DocumentShare;
module.exports.AccessLog = AccessLog;
