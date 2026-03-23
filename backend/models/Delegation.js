/**
 * Delegation.js — التفويضات الإدارية
 * Delegation management model for authority delegation tracking.
 */
const mongoose = require('mongoose');

/* ═══ Sub-schemas ════════════════════════════════════════════════════════════ */

const scopeItemSchema = new mongoose.Schema(
  {
    area: { type: String, required: true }, // e.g. 'financial', 'hr', 'operational'
    description: String,
    maxAmount: Number, // للتفويضات المالية
    limitations: String, // قيود
  },
  { _id: false }
);

const auditEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'created',
        'activated',
        'deactivated',
        'extended',
        'revoked',
        'expired',
        'used',
        'updated',
        'transferred',
      ],
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performerName: String,
    details: String,
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const usageLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    description: String,
    documentRef: String,
    usedAt: { type: Date, default: Date.now },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    usedByName: String,
  },
  { _id: true }
);

/* ═══ Main Schema ════════════════════════════════════════════════════════════ */

const delegationSchema = new mongoose.Schema(
  {
    // ── Identification ─────────────────────────────────────────────────────
    delegationNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // ── Type ───────────────────────────────────────────────────────────────
    delegationType: {
      type: String,
      required: true,
      enum: [
        'full', // تفويض كامل
        'partial', // تفويض جزئي
        'temporary', // تفويض مؤقت
        'emergency', // تفويض طوارئ
        'financial', // تفويض مالي
        'signature', // تفويض توقيع
        'operational', // تفويض تشغيلي
      ],
      index: true,
    },

    // ── Parties ────────────────────────────────────────────────────────────
    // المفوِّض (الشخص الذي يمنح التفويض)
    delegator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    delegatorName: { type: String, required: true },
    delegatorTitle: String,
    delegatorDept: String,

    // المفوَّض (الشخص الذي يتلقى التفويض)
    delegatee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    delegateeName: { type: String, required: true },
    delegateeTitle: String,
    delegateeDept: String,

    // مفوَّض بديل (اختياري)
    alternateDelegatee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    alternateDelegateeName: String,

    // ── Content ────────────────────────────────────────────────────────────
    title: { type: String, required: true },
    description: String,
    reason: String, // سبب التفويض

    // ── Scope ──────────────────────────────────────────────────────────────
    scope: [scopeItemSchema],
    restrictions: String, // قيود عامة
    maxTransactionAmount: Number, // الحد الأقصى للمعاملات المالية

    // ── Status ─────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'active', 'suspended', 'expired', 'revoked', 'completed'],
      default: 'draft',
      index: true,
    },

    // ── Approval ───────────────────────────────────────────────────────────
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverName: String,
    approvedAt: Date,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectorName: String,
    rejectionReason: String,

    // ── Validity ───────────────────────────────────────────────────────────
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    autoRenew: { type: Boolean, default: false },
    renewalCount: { type: Number, default: 0 },

    // ── Organization ───────────────────────────────────────────────────────
    department: String,
    branch: String,

    // ── Tracking ───────────────────────────────────────────────────────────
    usageCount: { type: Number, default: 0 },
    lastUsedAt: Date,
    usageLogs: [usageLogSchema],
    auditTrail: [auditEntrySchema],

    // ── Relations ──────────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: String,
    linkedDecisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminDecision' },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    tags: [String],

    // ── Notifications ──────────────────────────────────────────────────────
    notifyBeforeExpiry: { type: Number, default: 7 }, // days
    notifyOnUsage: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/* ━━━ Indexes ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
delegationSchema.index({ delegator: 1, status: 1 });
delegationSchema.index({ delegatee: 1, status: 1 });
delegationSchema.index({ endDate: 1 });
delegationSchema.index({ department: 1 });

/* ━━━ Methods ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
delegationSchema.methods.addAuditEntry = function (action, performerId, performerName, details) {
  this.auditTrail.push({ action, performedBy: performerId, performerName, details });
};

delegationSchema.methods.isActive = function () {
  const now = new Date();
  return this.status === 'active' && this.startDate <= now && this.endDate >= now;
};

/* ━━━ Statics ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
delegationSchema.statics.generateDelegationNumber = async function () {
  const year = new Date().getFullYear();
  const count = await this.countDocuments({
    createdAt: { $gte: new Date(`${year}-01-01`), $lt: new Date(`${year + 1}-01-01`) },
  });
  return `DLG-${year}-${String(count + 1).padStart(4, '0')}`;
};

/* ━━━ Pre-save ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
delegationSchema.pre('save', function (next) {
  if (this.status === 'active' && this.endDate < new Date()) {
    this.status = 'expired';
  }
  next();
});

module.exports = mongoose.models.Delegation || mongoose.model('Delegation', delegationSchema);
