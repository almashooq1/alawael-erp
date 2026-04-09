/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Archive Manager — Phase 22 · Document Management & Digital Records
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Document archival lifecycle, retention policies, legal holds,
 * disposal requests, and long-term records preservation.
 *
 * Aggregates
 *   DDDArchiveRecord     — archived document / record entry
 *   DDDRetentionPolicy   — retention rule attached to categories
 *   DDDLegalHold         — legal hold preventing disposal
 *   DDDDisposalRequest   — request to destroy / purge records
 *
 * Canonical links
 *   sourceDocumentId → DDDVaultDocument / DDDClinicalRecord
 *   archivedBy       → User
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

const ARCHIVE_TYPES = [
  'clinical_archive',
  'administrative_archive',
  'financial_archive',
  'legal_archive',
  'research_archive',
  'hr_archive',
  'correspondence_archive',
  'media_archive',
  'audit_archive',
  'compliance_archive',
  'incident_archive',
  'general_archive',
];

const ARCHIVE_STATUSES = [
  'pending_archive',
  'archived',
  'on_hold',
  'pending_disposal',
  'disposed',
  'restored',
  'migration_pending',
  'migrated',
  'corrupted',
  'verified',
];

const RETENTION_CATEGORIES = [
  'clinical_records',
  'financial_records',
  'hr_records',
  'legal_compliance',
  'research_data',
  'incident_reports',
  'administrative',
  'correspondence',
  'audit_logs',
  'patient_consent',
];

const HOLD_TYPES = [
  'litigation_hold',
  'regulatory_hold',
  'investigation_hold',
  'audit_hold',
  'compliance_hold',
  'insurance_hold',
  'research_hold',
  'preservation_order',
  'tax_hold',
  'indefinite_hold',
];

const DISPOSAL_METHODS = [
  'secure_delete',
  'physical_shred',
  'degaussing',
  'incineration',
  'overwrite',
  'crypto_erase',
  'anonymization',
  'certified_destruction',
];

const ARCHIVE_PRIORITIES = ['critical', 'high', 'medium', 'low', 'routine', 'deferred'];

/* ── Built-in retention policies ────────────────────────────────────────── */
const BUILTIN_RETENTION_POLICIES = [
  {
    code: 'RPOL-CLINICAL',
    name: 'Clinical Records Retention',
    category: 'clinical_records',
    retentionYears: 10,
    disposalMethod: 'secure_delete',
  },
  {
    code: 'RPOL-FINANCIAL',
    name: 'Financial Records Retention',
    category: 'financial_records',
    retentionYears: 7,
    disposalMethod: 'secure_delete',
  },
  {
    code: 'RPOL-HR',
    name: 'HR Records Retention',
    category: 'hr_records',
    retentionYears: 7,
    disposalMethod: 'secure_delete',
  },
  {
    code: 'RPOL-LEGAL',
    name: 'Legal Compliance Retention',
    category: 'legal_compliance',
    retentionYears: 25,
    disposalMethod: 'certified_destruction',
  },
  {
    code: 'RPOL-RESEARCH',
    name: 'Research Data Retention',
    category: 'research_data',
    retentionYears: 15,
    disposalMethod: 'anonymization',
  },
  {
    code: 'RPOL-INCIDENT',
    name: 'Incident Reports Retention',
    category: 'incident_reports',
    retentionYears: 25,
    disposalMethod: 'certified_destruction',
  },
  {
    code: 'RPOL-ADMIN',
    name: 'Administrative Retention',
    category: 'administrative',
    retentionYears: 5,
    disposalMethod: 'secure_delete',
  },
  {
    code: 'RPOL-CORRESPOND',
    name: 'Correspondence Retention',
    category: 'correspondence',
    retentionYears: 3,
    disposalMethod: 'secure_delete',
  },
  {
    code: 'RPOL-AUDIT',
    name: 'Audit Logs Retention',
    category: 'audit_logs',
    retentionYears: 10,
    disposalMethod: 'secure_delete',
  },
  {
    code: 'RPOL-CONSENT',
    name: 'Patient Consent Retention',
    category: 'patient_consent',
    retentionYears: 25,
    disposalMethod: 'certified_destruction',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Archive Record ────────────────────────────────────────────────────── */
const archiveRecordSchema = new Schema(
  {
    archiveCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: ARCHIVE_TYPES, required: true },
    status: { type: String, enum: ARCHIVE_STATUSES, default: 'pending_archive' },
    priority: { type: String, enum: ARCHIVE_PRIORITIES, default: 'routine' },
    sourceDocumentId: { type: Schema.Types.ObjectId },
    sourceDocumentType: { type: String },
    originalPath: { type: String },
    archivePath: { type: String },
    fileSize: { type: Number, default: 0 },
    checksum: { type: String },
    retentionPolicyId: { type: Schema.Types.ObjectId, ref: 'DDDRetentionPolicy' },
    retainUntil: { type: Date },
    archivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    archivedAt: { type: Date },
    legalHoldId: { type: Schema.Types.ObjectId, ref: 'DDDLegalHold' },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

archiveRecordSchema.index({ type: 1, status: 1 });
archiveRecordSchema.index({ retainUntil: 1 });
archiveRecordSchema.index({ legalHoldId: 1 });

const DDDArchiveRecord =
  mongoose.models.DDDArchiveRecord || mongoose.model('DDDArchiveRecord', archiveRecordSchema);

/* ── Retention Policy ──────────────────────────────────────────────────── */
const retentionPolicySchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    category: { type: String, enum: RETENTION_CATEGORIES, required: true },
    retentionYears: { type: Number, required: true },
    disposalMethod: { type: String, enum: DISPOSAL_METHODS, default: 'secure_delete' },
    requiresApproval: { type: Boolean, default: true },
    autoArchive: { type: Boolean, default: false },
    notifyBefore: { type: Number, default: 90 },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDRetentionPolicy =
  mongoose.models.DDDRetentionPolicy || mongoose.model('DDDRetentionPolicy', retentionPolicySchema);

/* ── Legal Hold ────────────────────────────────────────────────────────── */
const legalHoldSchema = new Schema(
  {
    holdCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: HOLD_TYPES, required: true },
    reason: { type: String, required: true },
    caseReference: { type: String },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    issuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    affectedRecords: [{ type: Schema.Types.ObjectId, ref: 'DDDArchiveRecord' }],
    releasedAt: { type: Date },
    releasedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    releaseReason: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

legalHoldSchema.index({ type: 1, isActive: 1 });

const DDDLegalHold =
  mongoose.models.DDDLegalHold || mongoose.model('DDDLegalHold', legalHoldSchema);

/* ── Disposal Request ──────────────────────────────────────────────────── */
const disposalRequestSchema = new Schema(
  {
    disposalCode: { type: String, required: true, unique: true },
    archiveIds: [{ type: Schema.Types.ObjectId, ref: 'DDDArchiveRecord' }],
    method: { type: String, enum: DISPOSAL_METHODS, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'in_progress', 'completed', 'failed'],
      default: 'pending',
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    completedAt: { type: Date },
    certificate: { type: String },
    totalRecords: { type: Number, default: 0 },
    totalSize: { type: Number, default: 0 },
    reason: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

disposalRequestSchema.index({ status: 1, createdAt: -1 });

const DDDDisposalRequest =
  mongoose.models.DDDDisposalRequest || mongoose.model('DDDDisposalRequest', disposalRequestSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class ArchiveManager extends BaseDomainModule {
  constructor() {
    super('ArchiveManager', {
      description: 'Document archival, retention policies, legal holds & disposal',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedPolicies();
    this.log('Archive Manager initialised ✓');
    return true;
  }

  async _seedPolicies() {
    for (const p of BUILTIN_RETENTION_POLICIES) {
      const exists = await DDDRetentionPolicy.findOne({ code: p.code }).lean();
      if (!exists) await DDDRetentionPolicy.create(p);
    }
  }

  /* ── Archives ── */
  async listArchives(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.priority) q.priority = filters.priority;
    return DDDArchiveRecord.find(q).sort({ archivedAt: -1 }).limit(100).lean();
  }
  async getArchive(id) {
    return DDDArchiveRecord.findById(id).lean();
  }
  async createArchive(data) {
    if (!data.archiveCode) data.archiveCode = `ARC-${Date.now()}`;
    return DDDArchiveRecord.create(data);
  }
  async updateArchive(id, data) {
    return DDDArchiveRecord.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async restoreArchive(id) {
    return DDDArchiveRecord.findByIdAndUpdate(id, { status: 'restored' }, { new: true });
  }

  /* ── Retention Policies ── */
  async listPolicies() {
    return DDDRetentionPolicy.find({ isActive: true }).sort({ name: 1 }).lean();
  }
  async createPolicy(data) {
    return DDDRetentionPolicy.create(data);
  }
  async updatePolicy(id, data) {
    return DDDRetentionPolicy.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Legal Holds ── */
  async listHolds(filters = {}) {
    const q = {};
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    if (filters.type) q.type = filters.type;
    return DDDLegalHold.find(q).sort({ issuedAt: -1 }).lean();
  }
  async createHold(data) {
    if (!data.holdCode) data.holdCode = `HOLD-${Date.now()}`;
    return DDDLegalHold.create(data);
  }
  async releaseHold(id, userId, reason) {
    return DDDLegalHold.findByIdAndUpdate(
      id,
      { isActive: false, releasedAt: new Date(), releasedBy: userId, releaseReason: reason },
      { new: true }
    );
  }

  /* ── Disposal ── */
  async listDisposals(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    return DDDDisposalRequest.find(q).sort({ createdAt: -1 }).lean();
  }
  async createDisposal(data) {
    if (!data.disposalCode) data.disposalCode = `DSP-${Date.now()}`;
    return DDDDisposalRequest.create(data);
  }
  async approveDisposal(id, userId) {
    return DDDDisposalRequest.findByIdAndUpdate(
      id,
      { status: 'approved', approvedBy: userId, approvedAt: new Date() },
      { new: true }
    );
  }

  /* ── Analytics ── */
  async getArchiveAnalytics() {
    const [archives, policies, holds, disposals] = await Promise.all([
      DDDArchiveRecord.countDocuments(),
      DDDRetentionPolicy.countDocuments(),
      DDDLegalHold.countDocuments({ isActive: true }),
      DDDDisposalRequest.countDocuments(),
    ]);
    const pending = await DDDArchiveRecord.countDocuments({ status: 'pending_disposal' });
    return { archives, policies, activeHolds: holds, disposals, pendingDisposal: pending };
  }

  async healthCheck() {
    const [archives, holds] = await Promise.all([
      DDDArchiveRecord.countDocuments(),
      DDDLegalHold.countDocuments({ isActive: true }),
    ]);
    return { status: 'healthy', archives, activeHolds: holds };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createArchiveManagerRouter() {
  const router = Router();
  const svc = new ArchiveManager();

  /* Archives */
  router.get('/archives', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listArchives(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/archives/:id', async (req, res) => {
    try {
      const d = await svc.getArchive(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/archives', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createArchive(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/archives/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateArchive(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/archives/:id/restore', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.restoreArchive(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Retention Policies */
  router.get('/archives/policies', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listPolicies() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/archives/policies', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPolicy(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Legal Holds */
  router.get('/archives/holds', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listHolds(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/archives/holds', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createHold(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/archives/holds/:id/release', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.releaseHold(req.params.id, req.body.userId, req.body.reason),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Disposal */
  router.get('/archives/disposals', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDisposals(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/archives/disposals', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createDisposal(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/archives/disposals/:id/approve', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.approveDisposal(req.params.id, req.body.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/archives/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getArchiveAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/archives/health', async (_req, res) => {
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
  ArchiveManager,
  DDDArchiveRecord,
  DDDRetentionPolicy,
  DDDLegalHold,
  DDDDisposalRequest,
  ARCHIVE_TYPES,
  ARCHIVE_STATUSES,
  RETENTION_CATEGORIES,
  HOLD_TYPES,
  DISPOSAL_METHODS,
  ARCHIVE_PRIORITIES,
  BUILTIN_RETENTION_POLICIES,
  createArchiveManagerRouter,
};
