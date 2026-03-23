/* eslint-disable no-unused-vars */
/**
 * E-Stamp Model — الختم الإلكتروني
 *
 * Supports: official seals, department stamps, personal stamps, temporary stamps
 * Features: audit trail, approval workflow, verification, usage tracking, expiry
 */
const mongoose = require('mongoose');
const crypto = require('crypto');

/* ─── Audit Entry ────────────────────────────────────────────────────────── */
const stampAuditSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'created',
        'submitted_for_approval',
        'approved',
        'rejected',
        'activated',
        'deactivated',
        'revoked',
        'renewed',
        'applied',
        'verified',
        'updated',
        'transferred',
        'expired',
        'deleted',
      ],
      required: true,
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performerName: String,
    details: String,
    ip: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

/* ─── Usage Record — tracks where stamp was applied ──────────────────────── */
const usageRecordSchema = new mongoose.Schema(
  {
    documentId: String,
    documentTitle: String,
    documentType: {
      type: String,
      enum: [
        'contract',
        'letter',
        'certificate',
        'invoice',
        'memo',
        'report',
        'approval',
        'authorization',
        'policy',
        'medical_report',
        'legal_document',
        'financial_document',
        'hr_document',
        'other',
      ],
    },
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    appliedByName: String,
    appliedAt: { type: Date, default: Date.now },
    position: {
      x: Number,
      y: Number,
      page: { type: Number, default: 1 },
      scale: { type: Number, default: 1 },
      rotation: { type: Number, default: 0 },
    },
    verificationCode: String,
    verificationHash: String,
    notes: String,
    ip: String,
  },
  { _id: true }
);

/* ─── Authorized User — who can use this stamp ───────────────────────────── */
const authorizedUserSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: String,
  department: String,
  role: {
    type: String,
    enum: ['owner', 'admin', 'user', 'viewer'],
    default: 'user',
  },
  addedAt: { type: Date, default: Date.now },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

/* ═══ Main E-Stamp Schema ════════════════════════════════════════════════════ */
const eStampSchema = new mongoose.Schema(
  {
    stampId: {
      type: String,
      unique: true,
      index: true,
    },

    /* ─── Identity ─────────────────────────────────────────────────────── */
    name_ar: { type: String, required: true },
    name_en: String,
    description: String,

    stampType: {
      type: String,
      enum: [
        'official', // ختم رسمي — المؤسسة
        'department', // ختم إدارة
        'personal', // ختم شخصي
        'temporary', // ختم مؤقت
        'project', // ختم مشروع
        'confidential', // ختم سري
        'received', // ختم وارد
        'approved', // ختم معتمد
        'rejected', // ختم مرفوض
        'draft', // ختم مسودة
        'copy', // ختم نسخة
        'urgent', // ختم عاجل
      ],
      required: true,
    },

    category: {
      type: String,
      enum: [
        'administrative',
        'financial',
        'medical',
        'legal',
        'hr',
        'academic',
        'technical',
        'general',
      ],
      default: 'general',
    },

    /* ─── Visual Design ────────────────────────────────────────────────── */
    stampImage: String, // Base64 PNG/SVG of the stamp
    stampSVG: String, // SVG template for dynamic rendering
    stampShape: {
      type: String,
      enum: ['circle', 'rectangle', 'oval', 'square', 'custom'],
      default: 'circle',
    },
    colorScheme: {
      primary: { type: String, default: '#1a237e' },
      secondary: { type: String, default: '#c62828' },
      text: { type: String, default: '#1a237e' },
      border: { type: String, default: '#1a237e' },
    },
    size: {
      width: { type: Number, default: 150 },
      height: { type: Number, default: 150 },
    },
    includeDate: { type: Boolean, default: true },
    includeNumber: { type: Boolean, default: true },
    includeQR: { type: Boolean, default: false },

    /* ─── Organization ─────────────────────────────────────────────────── */
    department: String,
    organization: { type: String, default: 'مركز الأوائل للتأهيل' },
    authorityLevel: {
      type: String,
      enum: ['institution', 'department', 'section', 'individual'],
      default: 'department',
    },

    /* ─── Status & Workflow ────────────────────────────────────────────── */
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'active', 'suspended', 'revoked', 'expired'],
      default: 'draft',
    },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedByName: String,
    approvedAt: Date,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: String,

    /* ─── Validity ─────────────────────────────────────────────────────── */
    validFrom: { type: Date, default: Date.now },
    validUntil: Date,
    isExpirable: { type: Boolean, default: false },
    maxUsageCount: { type: Number, default: 0 }, // 0 = unlimited

    /* ─── Security ─────────────────────────────────────────────────────── */
    verificationSecret: String, // For generating per-application codes
    requireApprovalPerUse: { type: Boolean, default: false },
    requireOTP: { type: Boolean, default: false },
    ipWhitelist: [String],
    watermarkText: String,

    /* ─── Tracking ─────────────────────────────────────────────────────── */
    usageCount: { type: Number, default: 0 },
    lastUsedAt: Date,
    lastUsedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    /* ─── Relations ────────────────────────────────────────────────────── */
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdByName: String,
    authorizedUsers: [authorizedUserSchema],
    usageHistory: [usageRecordSchema],
    auditTrail: [stampAuditSchema],

    /* ─── Tags ─────────────────────────────────────────────────────────── */
    tags: [String],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ─── Indexes ────────────────────────────────────────────────────────────── */
eStampSchema.index({ status: 1, stampType: 1 });
eStampSchema.index({ department: 1 });
eStampSchema.index({ 'authorizedUsers.userId': 1 });
eStampSchema.index({ createdBy: 1 });
eStampSchema.index({ validUntil: 1 });

/* ─── Pre-save: Check expiry ─────────────────────────────────────────────── */
eStampSchema.pre('save', function (next) {
  if (
    this.isExpirable &&
    this.validUntil &&
    new Date() > this.validUntil &&
    this.status === 'active'
  ) {
    this.status = 'expired';
    this.auditTrail.push({
      action: 'expired',
      details: 'انتهت صلاحية الختم تلقائياً',
      timestamp: new Date(),
    });
  }
  next();
});

/* ─── Methods ────────────────────────────────────────────────────────────── */
eStampSchema.methods.addAuditEntry = function (action, user, details) {
  this.auditTrail.push({
    action,
    performedBy: user?._id || user?.id,
    performerName: user?.name || user?.fullName || 'النظام',
    details,
    timestamp: new Date(),
  });
  return this;
};

eStampSchema.methods.generateVerificationCode = function () {
  const code = `STAMP-${this.stampId}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  return code;
};

eStampSchema.methods.generateApplicationHash = function (documentId) {
  const payload = `${this.stampId}:${documentId}:${this.verificationSecret || this._id}:${Date.now()}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

eStampSchema.methods.isUserAuthorized = function (userId) {
  if (!userId) return false;
  const uid = userId.toString();
  if (this.createdBy?.toString() === uid) return true;
  return this.authorizedUsers.some(
    u => u.userId?.toString() === uid && ['owner', 'admin', 'user'].includes(u.role)
  );
};

/* ─── Statics ────────────────────────────────────────────────────────────── */
eStampSchema.statics.generateStampId = async function () {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await this.countDocuments();
    const seq = String(count + 1 + attempt).padStart(5, '0');
    const id = `STM-${year}-${seq}`;
    const exists = await this.findOne({ stampId: id }).select('_id').lean();
    if (!exists) return id;
  }
  // Fallback: append random hex to guarantee uniqueness
  const rnd = require('crypto').randomBytes(3).toString('hex');
  return `STM-${year}-${rnd}`;
};

module.exports = mongoose.models.EStamp || mongoose.model('EStamp', eStampSchema);
