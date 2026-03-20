/**
 * Blockchain Certificate Model — نموذج شهادات البلوكتشين
 *
 * Schemas:
 *   BlockchainCertificate — Immutable certificate records
 *   CertificateTemplate   — Reusable certificate templates
 *   VerificationLog       — Certificate verification audit trail
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ═══════════════════════════════════════════════════════════════════════════
// CERTIFICATE TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════

const CertificateTemplateSchema = new Schema(
  {
    templateNumber: {
      type: String,
      unique: true,
      default: () =>
        `TPL-${String(Date.now()).slice(-5)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    },
    name: {
      ar: { type: String, required: true },
      en: { type: String },
    },
    description: String,
    category: {
      type: String,
      enum: [
        'academic',
        'professional',
        'training',
        'rehabilitation',
        'attendance',
        'achievement',
        'compliance',
        'accreditation',
      ],
      required: true,
    },
    fields: [
      {
        name: { type: String, required: true },
        label: { ar: String, en: String },
        type: { type: String, enum: ['text', 'date', 'number', 'select'], default: 'text' },
        required: { type: Boolean, default: false },
      },
    ],
    signatories: [
      {
        role: String,
        name: String,
        title: String,
      },
    ],
    validityDuration: { type: Number }, // days, null = permanent
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKCHAIN CERTIFICATE
// ═══════════════════════════════════════════════════════════════════════════

const BlockchainCertificateSchema = new Schema(
  {
    certificateNumber: {
      type: String,
      unique: true,
      default: () =>
        `CERT-${String(Date.now()).slice(-6)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    },
    template: { type: Schema.Types.ObjectId, ref: 'CertificateTemplate' },
    recipient: {
      name: { ar: { type: String, required: true }, en: String },
      nationalId: String,
      email: String,
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    issuer: {
      organizationName: { type: String, default: 'مراكز الأوائل للرعاية النهارية' },
      department: String,
      issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    title: {
      ar: { type: String, required: true },
      en: String,
    },
    description: String,
    category: {
      type: String,
      enum: [
        'academic',
        'professional',
        'training',
        'rehabilitation',
        'attendance',
        'achievement',
        'compliance',
        'accreditation',
      ],
    },
    data: { type: Schema.Types.Mixed }, // Custom fields from template
    issueDate: { type: Date, default: Date.now },
    expiryDate: Date,

    // Blockchain fields
    blockchain: {
      network: {
        type: String,
        default: 'internal',
        enum: ['internal', 'ethereum', 'polygon', 'hyperledger'],
      },
      transactionHash: String,
      blockNumber: Number,
      contractAddress: String,
      tokenId: String,
      timestamp: Date,
      gasUsed: Number,
    },

    // Integrity
    hash: { type: String, required: true },
    previousHash: String,
    nonce: { type: Number, default: 0 },
    merkleRoot: String,

    // QR verification
    qrCode: String,
    verificationUrl: String,

    // Status
    status: {
      type: String,
      enum: ['draft', 'issued', 'verified', 'revoked', 'expired'],
      default: 'draft',
    },
    revocation: {
      revokedAt: Date,
      revokedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: String,
    },

    // Signatures
    signatures: [
      {
        signer: { type: Schema.Types.ObjectId, ref: 'User' },
        signerName: String,
        signerTitle: String,
        signature: String, // digital signature (hash)
        signedAt: { type: Date, default: Date.now },
      },
    ],

    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

BlockchainCertificateSchema.index({ certificateNumber: 1 });
BlockchainCertificateSchema.index({ 'recipient.nationalId': 1, category: 1 });
BlockchainCertificateSchema.index({ 'blockchain.transactionHash': 1 });
BlockchainCertificateSchema.index({ hash: 1 });
BlockchainCertificateSchema.index({ status: 1, issueDate: -1 });

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICATION LOG
// ═══════════════════════════════════════════════════════════════════════════

const VerificationLogSchema = new Schema(
  {
    certificate: { type: Schema.Types.ObjectId, ref: 'BlockchainCertificate', required: true },
    certificateNumber: String,
    verifiedBy: {
      ip: String,
      userAgent: String,
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    method: {
      type: String,
      enum: ['qr_scan', 'manual_lookup', 'api_call', 'blockchain_verify'],
      default: 'manual_lookup',
    },
    result: {
      type: String,
      enum: ['valid', 'invalid', 'expired', 'revoked', 'not_found'],
      required: true,
    },
    hashMatch: { type: Boolean },
    blockchainMatch: { type: Boolean },
    details: String,
  },
  { timestamps: true }
);

VerificationLogSchema.index({ certificate: 1, createdAt: -1 });

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

const BlockchainCertificate =
  mongoose.models.BlockchainCertificate ||
  mongoose.model('BlockchainCertificate', BlockchainCertificateSchema);
const CertificateTemplate =
  mongoose.models.CertificateTemplate ||
  mongoose.model('CertificateTemplate', CertificateTemplateSchema);
const VerificationLog =
  mongoose.models.VerificationLog || mongoose.model('VerificationLog', VerificationLogSchema);

module.exports = { BlockchainCertificate, CertificateTemplate, VerificationLog };
