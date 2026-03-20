/**
 * AdminDecision.js — القرارات الإدارية
 * Administrative Decisions model for organizational decisions, memos, and circulars.
 */
const mongoose = require('mongoose');

/* ═══ Sub-schemas ════════════════════════════════════════════════════════════ */

const recipientSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    department: String,
    role: String,
    acknowledged: { type: Boolean, default: false },
    acknowledgedAt: Date,
    readAt: Date,
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: String,
  },
  { _id: true }
);

const auditEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'created',
        'updated',
        'submitted',
        'approved',
        'rejected',
        'published',
        'archived',
        'revoked',
        'acknowledged',
        'commented',
        'forwarded',
        'escalated',
      ],
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performerName: String,
    details: String,
    timestamp: { type: Date, default: Date.now },
    ipAddress: String,
  },
  { _id: false }
);

const commentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

/* ═══ Main Schema ════════════════════════════════════════════════════════════ */

const adminDecisionSchema = new mongoose.Schema(
  {
    // ── Identification ─────────────────────────────────────────────────────
    decisionNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // ── Type ───────────────────────────────────────────────────────────────
    documentType: {
      type: String,
      required: true,
      enum: [
        'decision', // قرار إداري
        'memo', // مذكرة داخلية
        'circular', // تعميم
        'directive', // توجيه
        'announcement', // إعلان
        'policy', // سياسة
        'procedure', // إجراء
        'minutes', // محضر اجتماع
      ],
      index: true,
    },

    // ── Content ────────────────────────────────────────────────────────────
    title: { type: String, required: true },
    title_en: String,
    subject: { type: String, required: true },
    body: { type: String, required: true }, // HTML / rich-text
    summary: String, // ملخص

    // ── Classification ─────────────────────────────────────────────────────
    category: {
      type: String,
      enum: [
        'administrative',
        'financial',
        'hr',
        'operational',
        'medical',
        'legal',
        'technical',
        'academic',
        'general',
      ],
      default: 'administrative',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent', 'critical'],
      default: 'medium',
    },
    confidentiality: {
      type: String,
      enum: ['public', 'internal', 'confidential', 'top_secret'],
      default: 'internal',
    },

    // ── Organization ───────────────────────────────────────────────────────
    department: String,
    issuingAuthority: String, // الجهة المصدرة
    referenceNumber: String, // مرجع القرار السابق

    // ── Status & Workflow ──────────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'draft',
        'under_review',
        'pending_approval',
        'approved',
        'published',
        'archived',
        'revoked',
      ],
      default: 'draft',
      index: true,
    },

    // Workflow
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewerName: String,
    reviewedAt: Date,
    reviewNotes: String,

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverName: String,
    approvedAt: Date,

    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectorName: String,
    rejectedAt: Date,
    rejectionReason: String,

    publishedAt: Date,
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    publisherName: String,

    revokedAt: Date,
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    revokerName: String,
    revocationReason: String,

    // ── Validity ───────────────────────────────────────────────────────────
    effectiveDate: { type: Date, default: Date.now },
    expiryDate: Date,
    isExpirable: { type: Boolean, default: false },

    // ── Recipients / Distribution ──────────────────────────────────────────
    recipients: [recipientSchema],
    sendToAll: { type: Boolean, default: false },
    targetDepartments: [String],

    // ── Relations ──────────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: String,
    attachments: [attachmentSchema],
    comments: [commentSchema],
    auditTrail: [auditEntrySchema],

    // ── Linked Documents ───────────────────────────────────────────────────
    linkedDecisions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AdminDecision' }],
    eSignatureId: { type: mongoose.Schema.Types.ObjectId, ref: 'ESignature' },
    eStampId: { type: mongoose.Schema.Types.ObjectId, ref: 'EStamp' },

    // ── Tags / Search ─────────────────────────────────────────────────────
    tags: [String],
    keywords: [String],

    // ── Read Tracking ──────────────────────────────────────────────────────
    totalRecipients: { type: Number, default: 0 },
    acknowledgedCount: { type: Number, default: 0 },
    readCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* ━━━ Indexes ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
adminDecisionSchema.index({ documentType: 1, status: 1 });
adminDecisionSchema.index({ department: 1 });
adminDecisionSchema.index({ createdBy: 1 });
adminDecisionSchema.index({ effectiveDate: -1 });
adminDecisionSchema.index({ 'recipients.userId': 1 });
adminDecisionSchema.index({ title: 'text', subject: 'text', body: 'text', tags: 'text' });

/* ━━━ Methods ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
adminDecisionSchema.methods.addAuditEntry = function (action, performerId, performerName, details) {
  this.auditTrail.push({ action, performedBy: performerId, performerName, details });
};

/* ━━━ Statics ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
adminDecisionSchema.statics.generateDecisionNumber = async function (type) {
  const year = new Date().getFullYear();
  const prefix =
    {
      decision: 'QRR',
      memo: 'MZK',
      circular: 'TWM',
      directive: 'TWJ',
      announcement: 'ELN',
      policy: 'SYS',
      procedure: 'EJR',
      minutes: 'MHD',
    }[type] || 'ADM';

  const count = await this.countDocuments({
    documentType: type,
    createdAt: { $gte: new Date(`${year}-01-01`), $lt: new Date(`${year + 1}-01-01`) },
  });
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
};

module.exports = mongoose.model('AdminDecision', adminDecisionSchema);
