/**
 * Document Watermark Service — خدمة العلامات المائية للمستندات
 * ──────────────────────────────────────────────────────────────
 * إضافة علامات مائية ديناميكية (نص/صورة/QR)، ملفات تعريف الحماية،
 * حماية حقوق الملكية، تتبع التوزيع
 *
 * @module documentWatermark.service
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

/* ─── Watermark Profile Model ────────────────────────────────── */
const watermarkProfileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    type: {
      type: String,
      enum: ['text', 'image', 'qr', 'combined', 'invisible'],
      default: 'text',
    },
    config: {
      // Text watermark
      text: String,
      textAr: String,
      fontSize: { type: Number, default: 48 },
      fontFamily: { type: String, default: 'Cairo' },
      color: { type: String, default: 'rgba(0,0,0,0.08)' },
      rotation: { type: Number, default: -45 },
      opacity: { type: Number, default: 0.1, min: 0, max: 1 },
      position: {
        type: String,
        enum: [
          'center',
          'top-left',
          'top-right',
          'bottom-left',
          'bottom-right',
          'tile',
          'diagonal',
        ],
        default: 'diagonal',
      },
      // Image watermark
      imageUrl: String,
      imageWidth: Number,
      imageHeight: Number,
      // QR watermark
      qrContent: String,
      qrSize: { type: Number, default: 80 },
      // Common
      margin: { type: Number, default: 20 },
      repeat: { type: Boolean, default: false },
      repeatSpacing: { type: Number, default: 150 },
    },
    dynamicFields: [
      {
        placeholder: String,
        source: {
          type: String,
          enum: ['user', 'document', 'date', 'custom', 'tracking'],
        },
        field: String,
      },
    ],
    protection: {
      preventPrint: { type: Boolean, default: false },
      preventCopy: { type: Boolean, default: false },
      preventScreenshot: { type: Boolean, default: false },
      expiresAfter: Number, // hours
    },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'watermark_profiles' }
);

watermarkProfileSchema.index({ type: 1, isActive: 1 });

const WatermarkProfile =
  mongoose.models.WatermarkProfile || mongoose.model('WatermarkProfile', watermarkProfileSchema);

/* ─── Watermark Application Log Model ────────────────────────── */
const watermarkLogSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', index: true },
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'WatermarkProfile' },
    trackingCode: { type: String, unique: true },
    appliedText: String,
    recipientInfo: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String,
      email: String,
      purpose: String,
    },
    accessHistory: [
      {
        action: { type: String, enum: ['view', 'print', 'download', 'share'] },
        ip: String,
        userAgent: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'expired', 'revoked'],
      default: 'active',
    },
    expiresAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'watermark_logs' }
);

watermarkLogSchema.index({ trackingCode: 1 });
watermarkLogSchema.index({ documentId: 1, status: 1 });

const WatermarkLog =
  mongoose.models.WatermarkLog || mongoose.model('WatermarkLog', watermarkLogSchema);

/* ─── Default Profiles ───────────────────────────────────────── */
const DEFAULT_PROFILES = [
  {
    name: 'Confidential',
    nameAr: 'سري',
    type: 'text',
    config: {
      text: 'CONFIDENTIAL',
      textAr: 'سري',
      fontSize: 56,
      color: 'rgba(255,0,0,0.06)',
      rotation: -45,
      opacity: 0.08,
      position: 'diagonal',
      repeat: true,
      repeatSpacing: 200,
    },
    isDefault: true,
  },
  {
    name: 'Draft',
    nameAr: 'مسودة',
    type: 'text',
    config: {
      text: 'DRAFT',
      textAr: 'مسودة',
      fontSize: 72,
      color: 'rgba(128,128,128,0.08)',
      rotation: -30,
      opacity: 0.1,
      position: 'center',
    },
    isDefault: true,
  },
  {
    name: 'Copy Tracking',
    nameAr: 'تتبع النسخ',
    type: 'combined',
    config: {
      textAr: 'نسخة مخصصة لـ {{recipientName}}',
      fontSize: 28,
      color: 'rgba(0,0,0,0.05)',
      position: 'bottom-right',
      qrContent: '{{trackingUrl}}',
      qrSize: 60,
    },
    dynamicFields: [
      { placeholder: '{{recipientName}}', source: 'user', field: 'name' },
      { placeholder: '{{trackingUrl}}', source: 'tracking', field: 'url' },
    ],
    isDefault: true,
  },
  {
    name: 'Official Copy',
    nameAr: 'نسخة رسمية',
    type: 'text',
    config: {
      text: 'OFFICIAL COPY',
      textAr: 'نسخة رسمية — {{date}}',
      fontSize: 36,
      color: 'rgba(0,100,0,0.06)',
      rotation: 0,
      position: 'top-right',
    },
    dynamicFields: [{ placeholder: '{{date}}', source: 'date', field: 'current' }],
    isDefault: true,
  },
  {
    name: 'Invisible Tracking',
    nameAr: 'تتبع مخفي',
    type: 'invisible',
    config: {
      text: '{{trackingCode}}',
      opacity: 0.005,
      fontSize: 8,
      position: 'tile',
      repeat: true,
      repeatSpacing: 100,
    },
    dynamicFields: [{ placeholder: '{{trackingCode}}', source: 'tracking', field: 'code' }],
    protection: { preventPrint: false, preventCopy: true },
    isDefault: true,
  },
];

/* ─── Service ────────────────────────────────────────────────── */
class DocumentWatermarkService {
  constructor() {
    this._initialized = false;
  }

  /* ─── Init ────────────────────────────────────────────────── */
  async init() {
    if (this._initialized) return;
    for (const p of DEFAULT_PROFILES) {
      await WatermarkProfile.findOneAndUpdate(
        { name: p.name, isDefault: true },
        { $setOnInsert: p },
        { upsert: true }
      );
    }
    this._initialized = true;
    return { success: true };
  }

  /* ─── Apply Watermark ─────────────────────────────────────── */
  async applyWatermark(options = {}) {
    const { documentId, profileId, recipientInfo, userId, customText } = options;
    await this.init();

    let profile;
    if (profileId) {
      profile = await WatermarkProfile.findById(profileId).lean();
    } else {
      profile = await WatermarkProfile.findOne({ isDefault: true, isActive: true }).lean();
    }
    if (!profile) return { success: false, error: 'ملف العلامة المائية غير موجود' };

    const trackingCode = `WM-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Resolve dynamic fields
    const resolvedText = this._resolveDynamicText(profile, {
      recipientName: recipientInfo?.name || 'مستخدم',
      trackingCode,
      trackingUrl: `${process.env.APP_URL || 'https://erp.alawael.com'}/track/${trackingCode}`,
      date: new Date().toLocaleDateString('ar-SA'),
      ...options.variables,
    });

    const log = new WatermarkLog({
      documentId,
      profileId: profile._id,
      trackingCode,
      appliedText: customText || resolvedText,
      recipientInfo,
      status: 'active',
      expiresAt: profile.protection?.expiresAfter
        ? new Date(Date.now() + profile.protection.expiresAfter * 3600000)
        : undefined,
      createdBy: userId,
    });
    await log.save();

    await WatermarkProfile.findByIdAndUpdate(profile._id, {
      $inc: { usageCount: 1 },
    });

    return {
      success: true,
      watermark: {
        trackingCode,
        text: customText || resolvedText,
        config: profile.config,
        type: profile.type,
        protection: profile.protection,
        profileName: profile.nameAr || profile.name,
      },
      logId: log._id,
    };
  }

  _resolveDynamicText(profile, vars) {
    let text = profile.config?.textAr || profile.config?.text || '';
    for (const [key, value] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
    }
    return text;
  }

  /* ─── Track Access ────────────────────────────────────────── */
  async trackAccess(trackingCode, accessInfo = {}) {
    const log = await WatermarkLog.findOne({ trackingCode });
    if (!log) return { success: false, error: 'كود التتبع غير صالح' };

    if (log.status === 'expired' || (log.expiresAt && new Date() > log.expiresAt)) {
      log.status = 'expired';
      await log.save();
      return { success: false, error: 'العلامة المائية منتهية الصلاحية' };
    }

    log.accessHistory.push({
      action: accessInfo.action || 'view',
      ip: accessInfo.ip,
      userAgent: accessInfo.userAgent,
      timestamp: new Date(),
    });
    await log.save();

    return { success: true, documentId: log.documentId };
  }

  /* ─── Revoke ──────────────────────────────────────────────── */
  async revokeWatermark(trackingCode, userId) {
    const log = await WatermarkLog.findOneAndUpdate(
      { trackingCode },
      { $set: { status: 'revoked' } },
      { new: true }
    );
    if (!log) return { success: false, error: 'كود التتبع غير موجود' };
    return { success: true };
  }

  /* ─── Get Logs ────────────────────────────────────────────── */
  async getLogs(options = {}) {
    const { documentId, status, page = 1, limit = 20 } = options;
    const filter = {};
    if (documentId) filter.documentId = documentId;
    if (status) filter.status = status;

    const [logs, total] = await Promise.all([
      WatermarkLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('profileId', 'name nameAr type')
        .populate('recipientInfo.userId', 'name email')
        .lean(),
      WatermarkLog.countDocuments(filter),
    ]);

    return { success: true, logs, total, page, limit };
  }

  /* ─── Profiles CRUD ───────────────────────────────────────── */
  async getProfiles(options = {}) {
    await this.init();
    const { type, isActive } = options;
    const filter = {};
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive;

    const profiles = await WatermarkProfile.find(filter)
      .sort({ isDefault: -1, usageCount: -1 })
      .lean();
    return { success: true, profiles };
  }

  async createProfile(data) {
    const profile = new WatermarkProfile({ ...data, isDefault: false });
    await profile.save();
    return { success: true, profile };
  }

  async updateProfile(profileId, updates) {
    const profile = await WatermarkProfile.findByIdAndUpdate(
      profileId,
      { $set: updates },
      { new: true }
    ).lean();
    if (!profile) return { success: false, error: 'الملف غير موجود' };
    return { success: true, profile };
  }

  async deleteProfile(profileId) {
    const profile = await WatermarkProfile.findById(profileId);
    if (!profile) return { success: false, error: 'الملف غير موجود' };
    if (profile.isDefault) return { success: false, error: 'لا يمكن حذف ملف افتراضي' };
    await profile.deleteOne();
    return { success: true };
  }

  /* ─── Batch Apply ─────────────────────────────────────────── */
  async batchApply(options = {}) {
    const { documentIds, profileId, recipientInfo, userId } = options;
    if (!documentIds?.length) return { success: false, error: 'لا توجد مستندات' };

    const results = [];
    for (const docId of documentIds) {
      const r = await this.applyWatermark({
        documentId: docId,
        profileId,
        recipientInfo,
        userId,
      });
      results.push({ documentId: docId, ...r });
    }

    return {
      success: true,
      total: results.length,
      succeeded: results.filter(r => r.success).length,
      results,
    };
  }

  /* ─── Verify ──────────────────────────────────────────────── */
  async verifyWatermark(trackingCode) {
    const log = await WatermarkLog.findOne({ trackingCode })
      .populate('documentId', 'title name')
      .populate('profileId', 'name nameAr type')
      .populate('recipientInfo.userId', 'name email')
      .lean();

    if (!log) return { success: false, error: 'كود التتبع غير صالح' };

    return {
      success: true,
      verification: {
        valid: log.status === 'active',
        status: log.status,
        document: log.documentId,
        profile: log.profileId,
        recipient: log.recipientInfo,
        appliedAt: log.createdAt,
        expiresAt: log.expiresAt,
        accessCount: log.accessHistory?.length || 0,
        lastAccess: log.accessHistory?.slice(-1)[0],
      },
    };
  }

  /* ─── Stats ───────────────────────────────────────────────── */
  async getStats() {
    const [totalProfiles, totalLogs, byType, byStatus] = await Promise.all([
      WatermarkProfile.countDocuments({ isActive: true }),
      WatermarkLog.countDocuments(),
      WatermarkProfile.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$type', count: { $sum: 1 }, totalUsage: { $sum: '$usageCount' } } },
      ]),
      WatermarkLog.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    return {
      success: true,
      stats: {
        totalProfiles,
        totalLogs,
        byType: byType.reduce(
          (a, t) => ({ ...a, [t._id]: { count: t.count, usage: t.totalUsage } }),
          {}
        ),
        byStatus: byStatus.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
      },
    };
  }
}

module.exports = new DocumentWatermarkService();
