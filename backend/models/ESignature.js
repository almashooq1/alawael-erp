/* eslint-disable no-unused-vars */
/**
 * E-Signature Model — Enhanced
 * نموذج التوقيع الإلكتروني — محسّن
 *
 * Supports: canvas drawing, typed, uploaded, stamp signatures
 * Features: audit trail, delegation, batch, verification hash
 */
const mongoose = require('mongoose');
const crypto = require('crypto');

/* ─── Audit Entry ────────────────────────────────────────────────────────── */
const auditEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'created',
        'sent',
        'viewed',
        'signed',
        'rejected',
        'delegated',
        'reminded',
        'expired',
        'cancelled',
        'resent',
        'downloaded',
        'verified',
        'comment_added',
        'field_filled',
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

/* ─── Signer Schema — Enhanced ───────────────────────────────────────────── */
const signerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  nationalId: String,
  department: String,
  jobTitle: String,

  role: {
    type: String,
    enum: ['signer', 'approver', 'witness', 'reviewer', 'cc'],
    default: 'signer',
  },
  order: { type: Number, default: 1 },

  status: {
    type: String,
    enum: ['pending', 'signed', 'rejected', 'expired', 'delegated'],
    default: 'pending',
  },
  signedAt: Date,
  rejectedAt: Date,
  rejectionReason: String,

  // Signature data
  signatureType: {
    type: String,
    enum: ['draw', 'type', 'upload', 'stamp', 'digital_certificate'],
  },
  signatureImage: String, // Base64 image of signature
  signatureText: String, // For typed signatures
  signatureFont: String, // Font family for typed
  signatureHash: String, // SHA-256 hash for verification

  // Delegation
  delegatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  delegatedToName: String,
  delegatedAt: Date,
  delegationReason: String,

  // Security
  otpVerified: { type: Boolean, default: false },
  ipAddress: String,
  userAgent: String,
  geoLocation: { lat: Number, lng: Number },

  // Reminders
  remindersSent: { type: Number, default: 0 },
  lastReminderAt: Date,
  viewedAt: Date,
});

/* ─── Comment Schema ─────────────────────────────────────────────────────── */
const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

/* ─── Field Value Schema ─────────────────────────────────────────────────── */
const fieldValueSchema = new mongoose.Schema({
  fieldName: String,
  value: mongoose.Schema.Types.Mixed,
  filledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  filledAt: { type: Date, default: Date.now },
});

/* ─── Main E-Signature Schema ────────────────────────────────────────────── */
const eSignatureSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true },

    // Document info
    documentTitle: { type: String, required: true, minlength: 3, maxlength: 200 },
    documentType: {
      type: String,
      enum: [
        'contract',
        'agreement',
        'approval',
        'memo',
        'policy',
        'authorization',
        'financial',
        'hr',
        'medical',
        'legal',
        'purchase_order',
        'nda',
        'mou',
        'other',
      ],
      default: 'contract',
    },
    description: { type: String, maxlength: 2000 },
    department: { type: String, index: true },

    // Document content
    documentUrl: String,
    documentHash: String,
    documentSize: Number,
    documentPages: Number,

    // Template reference
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'ESignatureTemplate' },
    templateCode: String,
    fieldValues: [fieldValueSchema],

    // Status
    status: {
      type: String,
      enum: ['draft', 'pending', 'in_progress', 'completed', 'rejected', 'expired', 'cancelled'],
      default: 'draft',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    signers: [signerSchema],

    // Workflow
    workflow: {
      sequential: { type: Boolean, default: true },
      requireAllSigners: { type: Boolean, default: true },
      allowDelegation: { type: Boolean, default: false },
      currentStep: { type: Number, default: 1 },
    },

    // Dates
    sentAt: Date,
    completedAt: Date,
    expiresAt: Date,
    cancelledAt: Date,

    // Security
    verificationCode: String,
    accessCode: String,

    // Batch
    batchId: String,

    // Audit
    auditTrail: [auditEntrySchema],
    comments: [commentSchema],

    // Creator
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: String,

    metadata: mongoose.Schema.Types.Mixed,
    tags: [String],
  },
  { timestamps: true }
);

/* ─── Indexes ────────────────────────────────────────────────────────────── */
eSignatureSchema.index({ status: 1, createdAt: -1 });
eSignatureSchema.index({ 'signers.userId': 1, 'signers.status': 1 });
eSignatureSchema.index({ batchId: 1 });
eSignatureSchema.index({ expiresAt: 1 });
eSignatureSchema.index({ verificationCode: 1 });

/* ─── Pre-save ───────────────────────────────────────────────────────────── */
eSignatureSchema.pre('save', function (next) {
  if (this.expiresAt && new Date() > this.expiresAt && this.status !== 'completed') {
    this.status = 'expired';
    this.signers.forEach(s => {
      if (s.status === 'pending') s.status = 'expired';
    });
  }
  next();
});

/* ─── Methods ────────────────────────────────────────────────────────────── */
eSignatureSchema.methods.addAuditEntry = function (action, userId, name, details, ip, ua) {
  this.auditTrail.push({
    action,
    performedBy: userId,
    performerName: name,
    details,
    ip,
    userAgent: ua,
  });
};

eSignatureSchema.methods.generateVerificationCode = function () {
  this.verificationCode = crypto.randomBytes(8).toString('hex').toUpperCase();
  return this.verificationCode;
};

eSignatureSchema.methods.generateDocumentHash = function () {
  const data = `${this._id}-${this.documentTitle}-${this.createdAt}-${this.signers.length}`;
  this.documentHash = crypto.createHash('sha256').update(data).digest('hex');
  return this.documentHash;
};

/* ─── Statics ────────────────────────────────────────────────────────────── */
eSignatureSchema.statics.generateRequestId = async function () {
  const year = new Date().getFullYear();
  const count = await this.countDocuments({
    createdAt: { $gte: new Date(`${year}-01-01`) },
  });
  return `SIG-${year}-${String(count + 1).padStart(5, '0')}`;
};

module.exports = mongoose.models.ESignature || mongoose.model('ESignature', eSignatureSchema);
