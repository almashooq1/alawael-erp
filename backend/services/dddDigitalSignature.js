'use strict';
/**
 * DigitalSignature Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddDigitalSignature.js
 */

const {
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
} = require('../models/DddDigitalSignature');

const BaseCrudService = require('./base/BaseCrudService');

class DigitalSignature extends BaseCrudService {
  constructor() {
    super('DigitalSignature', {
      description: 'Electronic signature workflows, certificates & verification',
      version: '1.0.0',
    }, {
      signatureRequests: DDDSignatureRequest,
      signatureTemplates: DDDSignatureTemplate,
      certificates: DDDCertificate,
      signatureAudits: DDDSignatureAudit,
    })
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
  async getRequest(id) { return this._getById(DDDSignatureRequest, id); }
  async createRequest(data) {
    if (!data.requestCode) data.requestCode = `SIG-${Date.now()}`;
    return DDDSignatureRequest.create(data);
  }
  async updateRequest(id, data) { return this._update(DDDSignatureRequest, id, data, { runValidators: true }); }
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
  async listTemplates() { return this._list(DDDSignatureTemplate, { isActive: true }, { sort: { name: 1 } }); }
  async createTemplate(data) { return this._create(DDDSignatureTemplate, data); }
  async updateTemplate(id, data) { return this._update(DDDSignatureTemplate, id, data); }

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
    ).lean();
  }

  /* ── Audit ── */
  async listAudit(requestId) {
    return DDDSignatureAudit.find({ requestId }).sort({ createdAt: -1 }).lean();
  }
  async logAudit(data) { return this._create(DDDSignatureAudit, data); }

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
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new DigitalSignature();
