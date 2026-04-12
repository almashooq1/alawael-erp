'use strict';
/**
 * DddDigitalSignature — Mongoose Models & Constants
 * Auto-extracted from services/dddDigitalSignature.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const SIGNATURE_TYPES = [
  'simple_electronic',
  'advanced_electronic',
  'qualified_electronic',
  'digital_certificate',
  'biometric',
  'otp_verified',
  'handwritten_capture',
  'click_to_sign',
  'email_verified',
  'sms_verified',
  'multi_factor',
  'witness_required',
];

const SIGNATURE_STATUSES = [
  'draft',
  'pending',
  'sent',
  'viewed',
  'signed',
  'declined',
  'expired',
  'cancelled',
  'voided',
  'completed',
];

const SIGNER_ROLES = [
  'primary_signer',
  'co_signer',
  'witness',
  'approver',
  'reviewer',
  'notary',
  'guardian',
  'legal_representative',
  'clinician',
  'administrator',
];

const CERTIFICATE_STATUSES = [
  'active',
  'expired',
  'revoked',
  'suspended',
  'pending_activation',
  'pending_renewal',
  'archived',
  'compromised',
];

const VERIFICATION_METHODS = [
  'certificate_chain',
  'timestamp_authority',
  'ocsp_check',
  'crl_check',
  'biometric_match',
  'otp_validation',
  'email_confirmation',
  'knowledge_based',
];

const SIGNING_ALGORITHMS = [
  'RSA-SHA256',
  'RSA-SHA512',
  'ECDSA-P256',
  'ECDSA-P384',
  'Ed25519',
  'HMAC-SHA256',
];

/* ── Built-in signature templates ───────────────────────────────────────── */
const BUILTIN_SIGNATURE_TEMPLATES = [
  {
    code: 'STPL-CONSENT',
    name: 'Patient Consent',
    nameAr: 'موافقة المريض',
    requiredSigners: 2,
    signatureType: 'advanced_electronic',
  },
  {
    code: 'STPL-CAREPLAN',
    name: 'Care Plan Approval',
    nameAr: 'اعتماد خطة الرعاية',
    requiredSigners: 3,
    signatureType: 'digital_certificate',
  },
  {
    code: 'STPL-DISCHARGE',
    name: 'Discharge Summary',
    nameAr: 'ملخص الخروج',
    requiredSigners: 2,
    signatureType: 'advanced_electronic',
  },
  {
    code: 'STPL-REFERRAL',
    name: 'Referral Letter',
    nameAr: 'خطاب الإحالة',
    requiredSigners: 1,
    signatureType: 'simple_electronic',
  },
  {
    code: 'STPL-CONTRACT',
    name: 'Staff Contract',
    nameAr: 'عقد الموظف',
    requiredSigners: 2,
    signatureType: 'qualified_electronic',
  },
  {
    code: 'STPL-POLICY',
    name: 'Policy Acknowledgement',
    nameAr: 'إقرار سياسة',
    requiredSigners: 1,
    signatureType: 'click_to_sign',
  },
  {
    code: 'STPL-INCIDENT',
    name: 'Incident Report',
    nameAr: 'تقرير حادثة',
    requiredSigners: 2,
    signatureType: 'advanced_electronic',
  },
  {
    code: 'STPL-RESEARCH',
    name: 'Research Consent',
    nameAr: 'موافقة بحثية',
    requiredSigners: 3,
    signatureType: 'qualified_electronic',
  },
  {
    code: 'STPL-PRESCRIPTION',
    name: 'Prescription',
    nameAr: 'وصفة طبية',
    requiredSigners: 1,
    signatureType: 'digital_certificate',
  },
  {
    code: 'STPL-NDA',
    name: 'Non-Disclosure Agreement',
    nameAr: 'اتفاقية عدم إفشاء',
    requiredSigners: 2,
    signatureType: 'advanced_electronic',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Signature Request ─────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const signatureRequestSchema = new Schema(
  {
    requestCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    signatureType: { type: String, enum: SIGNATURE_TYPES, required: true },
    status: { type: String, enum: SIGNATURE_STATUSES, default: 'draft' },
    documentId: { type: Schema.Types.ObjectId },
    documentType: { type: String },
    templateId: { type: Schema.Types.ObjectId, ref: 'DDDSignatureTemplate' },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    signers: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: SIGNER_ROLES },
        email: { type: String },
        name: { type: String },
        order: { type: Number, default: 1 },
        status: { type: String, enum: SIGNATURE_STATUSES, default: 'pending' },
        signedAt: { type: Date },
        declinedAt: { type: Date },
        declineReason: { type: String },
        signatureData: { type: String },
        ipAddress: { type: String },
        userAgent: { type: String },
      },
    ],
    expiresAt: { type: Date },
    completedAt: { type: Date },
    reminderCount: { type: Number, default: 0 },
    lastReminderAt: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

signatureRequestSchema.index({ status: 1, createdAt: -1 });
signatureRequestSchema.index({ requestedBy: 1 });
signatureRequestSchema.index({ 'signers.userId': 1, 'signers.status': 1 });

const DDDSignatureRequest =
  mongoose.models.DDDSignatureRequest ||
  mongoose.model('DDDSignatureRequest', signatureRequestSchema);

/* ── Signature Template ────────────────────────────────────────────────── */
const signatureTemplateSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    signatureType: { type: String, enum: SIGNATURE_TYPES, required: true },
    requiredSigners: { type: Number, default: 1 },
    signerRoles: [
      { role: { type: String, enum: SIGNER_ROLES }, order: Number, isRequired: Boolean },
    ],
    expirationDays: { type: Number, default: 30 },
    reminderDays: [{ type: Number }],
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDSignatureTemplate =
  mongoose.models.DDDSignatureTemplate ||
  mongoose.model('DDDSignatureTemplate', signatureTemplateSchema);

/* ── Certificate ───────────────────────────────────────────────────────── */
const certificateSchema = new Schema(
  {
    certCode: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    issuer: { type: String, required: true },
    subject: { type: String },
    serialNumber: { type: String },
    algorithm: { type: String, enum: SIGNING_ALGORITHMS },
    publicKey: { type: String },
    fingerprint: { type: String },
    status: { type: String, enum: CERTIFICATE_STATUSES, default: 'active' },
    issuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    revokedAt: { type: Date },
    revokeReason: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

certificateSchema.index({ userId: 1, status: 1 });
certificateSchema.index({ status: 1, expiresAt: 1 });

const DDDCertificate =
  mongoose.models.DDDCertificate || mongoose.model('DDDCertificate', certificateSchema);

/* ── Signature Audit ───────────────────────────────────────────────────── */
const signatureAuditSchema = new Schema(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'DDDSignatureRequest', required: true },
    action: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    ipAddress: { type: String },
    userAgent: { type: String },
    details: { type: String },
    verificationMethod: { type: String, enum: VERIFICATION_METHODS },
    isValid: { type: Boolean },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

signatureAuditSchema.index({ requestId: 1, createdAt: -1 });

const DDDSignatureAudit =
  mongoose.models.DDDSignatureAudit || mongoose.model('DDDSignatureAudit', signatureAuditSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  SIGNATURE_TYPES,
  SIGNATURE_STATUSES,
  SIGNER_ROLES,
  CERTIFICATE_STATUSES,
  VERIFICATION_METHODS,
  SIGNING_ALGORITHMS,
  BUILTIN_SIGNATURE_TEMPLATES,
  DDDSignatureRequest,
  DDDSignatureTemplate,
  DDDCertificate,
  DDDSignatureAudit,
};
