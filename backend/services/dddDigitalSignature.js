/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Digital Signature — Phase 22 · Document Management & Digital Records
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Electronic signature requests, signing workflows, certificate management,
 * verification, and full audit trail for all signed documents.
 *
 * Aggregates
 *   DDDSignatureRequest   — request for one or more signers
 *   DDDSignatureTemplate  — reusable signing workflow template
 *   DDDCertificate        — signing certificate / credential
 *   DDDSignatureAudit     — immutable audit for every signing action
 *
 * Canonical links
 *   requestedBy → User
 *   documentId  → DDDVaultDocument / DDDClinicalRecord
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Router } = require('express');

class BaseDomainModule {
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;
  }
  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

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

class DigitalSignature extends BaseDomainModule {
  constructor() {
    super('DigitalSignature', {
      description: 'Electronic signature workflows, certificates & verification',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedTemplates();
    this.log('Digital Signature initialised ✓');
    return true;
  }

  async _seedTemplates() {
    for (const t of BUILTIN_SIGNATURE_TEMPLATES) {
      const exists = await DDDSignatureTemplate.findOne({ code: t.code }).lean();
      if (!exists) await DDDSignatureTemplate.create(t);
    }
  }

  /* ── Requests ── */
  async listRequests(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.requestedBy) q.requestedBy = filters.requestedBy;
    if (filters.signatureType) q.signatureType = filters.signatureType;
    return DDDSignatureRequest.find(q).sort({ createdAt: -1 }).limit(100).lean();
  }
  async getRequest(id) {
    return DDDSignatureRequest.findById(id).lean();
  }
  async createRequest(data) {
    if (!data.requestCode) data.requestCode = `SIG-${Date.now()}`;
    return DDDSignatureRequest.create(data);
  }
  async updateRequest(id, data) {
    return DDDSignatureRequest.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async signDocument(requestId, signerId, signatureData) {
    const req = await DDDSignatureRequest.findById(requestId);
    if (!req) return null;
    const signer = req.signers.find(s => s.userId?.toString() === signerId);
    if (!signer) return null;
    signer.status = 'signed';
    signer.signedAt = new Date();
    signer.signatureData = signatureData;
    const allSigned = req.signers.every(s => s.status === 'signed');
    if (allSigned) {
      req.status = 'completed';
      req.completedAt = new Date();
    } else {
      req.status = 'signed';
    }
    return req.save();
  }
  async declineSignature(requestId, signerId, reason) {
    const req = await DDDSignatureRequest.findById(requestId);
    if (!req) return null;
    const signer = req.signers.find(s => s.userId?.toString() === signerId);
    if (!signer) return null;
    signer.status = 'declined';
    signer.declinedAt = new Date();
    signer.declineReason = reason;
    req.status = 'declined';
    return req.save();
  }

  /* ── Templates ── */
  async listTemplates() {
    return DDDSignatureTemplate.find({ isActive: true }).sort({ name: 1 }).lean();
  }
  async createTemplate(data) {
    return DDDSignatureTemplate.create(data);
  }
  async updateTemplate(id, data) {
    return DDDSignatureTemplate.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Certificates ── */
  async listCertificates(filters = {}) {
    const q = {};
    if (filters.userId) q.userId = filters.userId;
    if (filters.status) q.status = filters.status;
    return DDDCertificate.find(q).sort({ issuedAt: -1 }).lean();
  }
  async issueCertificate(data) {
    if (!data.certCode) data.certCode = `CERT-${Date.now()}`;
    return DDDCertificate.create(data);
  }
  async revokeCertificate(id, reason) {
    return DDDCertificate.findByIdAndUpdate(
      id,
      { status: 'revoked', revokedAt: new Date(), revokeReason: reason },
      { new: true }
    );
  }

  /* ── Audit ── */
  async listAudit(requestId) {
    return DDDSignatureAudit.find({ requestId }).sort({ createdAt: -1 }).lean();
  }
  async logAudit(data) {
    return DDDSignatureAudit.create(data);
  }

  /* ── Analytics ── */
  async getSignatureAnalytics() {
    const [requests, templates, certificates, audits] = await Promise.all([
      DDDSignatureRequest.countDocuments(),
      DDDSignatureTemplate.countDocuments(),
      DDDCertificate.countDocuments(),
      DDDSignatureAudit.countDocuments(),
    ]);
    const completed = await DDDSignatureRequest.countDocuments({ status: 'completed' });
    return { requests, completed, templates, certificates, audits };
  }

  async healthCheck() {
    const [requests, certificates] = await Promise.all([
      DDDSignatureRequest.countDocuments(),
      DDDCertificate.countDocuments(),
    ]);
    return { status: 'healthy', requests, certificates };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createDigitalSignatureRouter() {
  const router = Router();
  const svc = new DigitalSignature();

  /* Requests */
  router.get('/signatures/requests', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRequests(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/signatures/requests/:id', async (req, res) => {
    try {
      const d = await svc.getRequest(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/signatures/requests', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRequest(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/signatures/requests/:id/sign', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.signDocument(req.params.id, req.body.signerId, req.body.signatureData),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/signatures/requests/:id/decline', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.declineSignature(req.params.id, req.body.signerId, req.body.reason),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Templates */
  router.get('/signatures/templates', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listTemplates() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/signatures/templates', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createTemplate(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Certificates */
  router.get('/signatures/certificates', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listCertificates(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/signatures/certificates', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.issueCertificate(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/signatures/certificates/:id/revoke', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.revokeCertificate(req.params.id, req.body.reason),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Audit */
  router.get('/signatures/audit/:requestId', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAudit(req.params.requestId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/signatures/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getSignatureAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/signatures/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  EXPORTS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  DigitalSignature,
  DDDSignatureRequest,
  DDDSignatureTemplate,
  DDDCertificate,
  DDDSignatureAudit,
  SIGNATURE_TYPES,
  SIGNATURE_STATUSES,
  SIGNER_ROLES,
  CERTIFICATE_STATUSES,
  VERIFICATION_METHODS,
  SIGNING_ALGORITHMS,
  BUILTIN_SIGNATURE_TEMPLATES,
  createDigitalSignatureRouter,
};
