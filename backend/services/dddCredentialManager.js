'use strict';
/**
 * DDD Credential Manager Service
 * ───────────────────────────────
 * Phase 29 – Workforce & Professional Development (Module 2/4)
 *
 * Manages professional credentials, licenses, accreditations,
 * continuing education units (CEUs), and compliance requirements.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const CREDENTIAL_TYPES = [
  'license',
  'certification',
  'accreditation',
  'registration',
  'diploma',
  'degree',
  'fellowship',
  'board_certification',
  'ceu_course',
  'specialization',
  'endorsement',
  'permit',
];

const CREDENTIAL_STATUSES = [
  'active',
  'pending',
  'expired',
  'revoked',
  'suspended',
  'renewal_due',
  'under_review',
  'provisionally_approved',
  'lapsed',
  'denied',
];

const ISSUING_BODIES = [
  'ministry_of_health',
  'scfhs',
  'medical_council',
  'therapy_board',
  'nursing_council',
  'psychology_board',
  'social_work_board',
  'education_authority',
  'international_body',
  'hospital_credentialing',
  'professional_association',
  'accreditation_agency',
];

const CEU_CATEGORIES = [
  'clinical_practice',
  'ethics',
  'safety',
  'leadership',
  'research',
  'technology',
  'cultural_competence',
  'supervision',
  'documentation',
  'quality',
];

const VERIFICATION_METHODS = [
  'primary_source',
  'database_check',
  'document_review',
  'online_verification',
  'phone_verification',
  'notarized_copy',
  'digital_badge',
  'blockchain_verified',
  'peer_attestation',
  'self_reported',
];

const RENEWAL_FREQUENCIES = [
  'annual',
  'biennial',
  'triennial',
  'quadrennial',
  'quinquennial',
  'one_time',
  'continuous',
  'upon_request',
  'competency_based',
  'variable',
];

const BUILTIN_CREDENTIAL_TEMPLATES = [
  { code: 'MOH_LICENSE', name: 'MOH Professional License', renewalMonths: 12 },
  { code: 'SCFHS_REG', name: 'SCFHS Registration', renewalMonths: 24 },
  { code: 'BLS_CERT', name: 'Basic Life Support', renewalMonths: 24 },
  { code: 'ACLS_CERT', name: 'Advanced Cardiac Life Support', renewalMonths: 24 },
  { code: 'CPR_CERT', name: 'CPR Certification', renewalMonths: 12 },
  { code: 'HAND_THERAPY', name: 'Certified Hand Therapist', renewalMonths: 60 },
  { code: 'NDT_CERT', name: 'NDT/Bobath Certification', renewalMonths: 36 },
  { code: 'SENSORY_INT', name: 'Sensory Integration Certification', renewalMonths: 36 },
  { code: 'ABA_CERT', name: 'Board Certified Behavior Analyst', renewalMonths: 24 },
  { code: 'INFECTION_CTL', name: 'Infection Control Certificate', renewalMonths: 12 },
];

/* ═══════════════════ Schemas ═══════════════════ */
const credentialSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile', required: true },
    type: { type: String, enum: CREDENTIAL_TYPES, required: true },
    status: { type: String, enum: CREDENTIAL_STATUSES, default: 'pending' },
    name: { type: String, required: true },
    issuingBody: { type: String, enum: ISSUING_BODIES },
    credentialNumber: { type: String },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    renewalFrequency: { type: String, enum: RENEWAL_FREQUENCIES },
    verificationMethod: { type: String, enum: VERIFICATION_METHODS },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    documentUrl: { type: String },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
credentialSchema.index({ staffId: 1, type: 1 });
credentialSchema.index({ expiryDate: 1, status: 1 });

const ceuRecordSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile', required: true },
    credentialId: { type: Schema.Types.ObjectId, ref: 'DDDCredential' },
    category: { type: String, enum: CEU_CATEGORIES, required: true },
    title: { type: String, required: true },
    provider: { type: String },
    hoursEarned: { type: Number, required: true, min: 0 },
    completionDate: { type: Date, required: true },
    certificateUrl: { type: String },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
ceuRecordSchema.index({ staffId: 1, completionDate: -1 });
ceuRecordSchema.index({ category: 1 });

const verificationLogSchema = new Schema(
  {
    credentialId: { type: Schema.Types.ObjectId, ref: 'DDDCredential', required: true },
    method: { type: String, enum: VERIFICATION_METHODS, required: true },
    result: { type: String, enum: ['verified', 'failed', 'inconclusive', 'pending'] },
    verifiedAt: { type: Date, default: Date.now },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    evidenceUrl: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
verificationLogSchema.index({ credentialId: 1, verifiedAt: -1 });

const complianceRequirementSchema = new Schema(
  {
    department: { type: String },
    role: { type: String },
    credentialType: { type: String, enum: CREDENTIAL_TYPES, required: true },
    credentialName: { type: String, required: true },
    isRequired: { type: Boolean, default: true },
    ceuHoursRequired: { type: Number, default: 0 },
    renewalPeriodMonths: { type: Number },
    description: { type: String },
    effectiveDate: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
complianceRequirementSchema.index({ department: 1, role: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDCredential =
  mongoose.models.DDDCredential || mongoose.model('DDDCredential', credentialSchema);
const DDDCEURecord =
  mongoose.models.DDDCEURecord || mongoose.model('DDDCEURecord', ceuRecordSchema);
const DDDVerificationLog =
  mongoose.models.DDDVerificationLog || mongoose.model('DDDVerificationLog', verificationLogSchema);
const DDDComplianceRequirement =
  mongoose.models.DDDComplianceRequirement ||
  mongoose.model('DDDComplianceRequirement', complianceRequirementSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class CredentialManager {
  /* ── Credentials ── */
  async createCredential(data) {
    return DDDCredential.create(data);
  }
  async listCredentials(filter = {}, page = 1, limit = 20) {
    return DDDCredential.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async getCredentialById(id) {
    return DDDCredential.findById(id).lean();
  }
  async updateCredential(id, data) {
    return DDDCredential.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  /* ── CEU Records ── */
  async createCEURecord(data) {
    return DDDCEURecord.create(data);
  }
  async listCEURecords(filter = {}, page = 1, limit = 20) {
    return DDDCEURecord.find(filter)
      .sort({ completionDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async getStaffCEUSummary(staffId) {
    return DDDCEURecord.aggregate([
      { $match: { staffId: new mongoose.Types.ObjectId(staffId) } },
      { $group: { _id: '$category', totalHours: { $sum: '$hoursEarned' }, count: { $sum: 1 } } },
      { $sort: { totalHours: -1 } },
    ]);
  }

  /* ── Verification ── */
  async createVerificationLog(data) {
    return DDDVerificationLog.create(data);
  }
  async listVerificationLogs(credentialId) {
    return DDDVerificationLog.find({ credentialId }).sort({ verifiedAt: -1 }).lean();
  }

  /* ── Compliance ── */
  async createRequirement(data) {
    return DDDComplianceRequirement.create(data);
  }
  async listRequirements(filter = {}) {
    return DDDComplianceRequirement.find(filter).sort({ createdAt: -1 }).lean();
  }

  /* ── Expiring Credentials ── */
  async getExpiringCredentials(daysAhead = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return DDDCredential.find({ expiryDate: { $lte: cutoff }, status: 'active' })
      .sort({ expiryDate: 1 })
      .lean();
  }

  /* ── Analytics ── */
  async getComplianceStats() {
    const [total, active, expired, pending] = await Promise.all([
      DDDCredential.countDocuments(),
      DDDCredential.countDocuments({ status: 'active' }),
      DDDCredential.countDocuments({ status: 'expired' }),
      DDDCredential.countDocuments({ status: 'pending' }),
    ]);
    return {
      total,
      active,
      expired,
      pending,
      complianceRate: total ? ((active / total) * 100).toFixed(1) : 0,
    };
  }

  /* ── Health ── */
  async healthCheck() {
    const [credentials, ceuRecords, verifications, requirements] = await Promise.all([
      DDDCredential.countDocuments(),
      DDDCEURecord.countDocuments(),
      DDDVerificationLog.countDocuments(),
      DDDComplianceRequirement.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'CredentialManager',
      counts: { credentials, ceuRecords, verifications, requirements },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createCredentialManagerRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new CredentialManager();

  router.get('/credential-manager/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* Credentials */
  router.post('/credential-manager/credentials', async (req, res) => {
    try {
      res.status(201).json(await svc.createCredential(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/credential-manager/credentials', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filter } = req.query;
      res.json(await svc.listCredentials(filter, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/credential-manager/credentials/expiring', async (req, res) => {
    try {
      res.json(await svc.getExpiringCredentials(+(req.query.days || 30)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/credential-manager/credentials/:id', async (req, res) => {
    try {
      res.json(await svc.updateCredential(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* CEU Records */
  router.post('/credential-manager/ceu', async (req, res) => {
    try {
      res.status(201).json(await svc.createCEURecord(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/credential-manager/ceu', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filter } = req.query;
      res.json(await svc.listCEURecords(filter, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/credential-manager/ceu/staff/:staffId/summary', async (req, res) => {
    try {
      res.json(await svc.getStaffCEUSummary(req.params.staffId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* Verification */
  router.post('/credential-manager/verification', async (req, res) => {
    try {
      res.status(201).json(await svc.createVerificationLog(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* Compliance */
  router.post('/credential-manager/requirements', async (req, res) => {
    try {
      res.status(201).json(await svc.createRequirement(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/credential-manager/requirements', async (req, res) => {
    try {
      res.json(await svc.listRequirements(req.query));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* Analytics */
  router.get('/credential-manager/stats', async (_req, res) => {
    try {
      res.json(await svc.getComplianceStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  CREDENTIAL_TYPES,
  CREDENTIAL_STATUSES,
  ISSUING_BODIES,
  CEU_CATEGORIES,
  VERIFICATION_METHODS,
  RENEWAL_FREQUENCIES,
  BUILTIN_CREDENTIAL_TEMPLATES,
  DDDCredential,
  DDDCEURecord,
  DDDVerificationLog,
  DDDComplianceRequirement,
  CredentialManager,
  createCredentialManagerRouter,
};
