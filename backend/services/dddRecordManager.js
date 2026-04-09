/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Record Manager — Phase 22 · Document Management & Digital Records
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Clinical and administrative record lifecycle management, retention
 * policies, record categorisation, and compliance-ready audit logging.
 *
 * Aggregates
 *   DDDClinicalRecord    — a single managed record entry
 *   DDDRecordCategory    — classification taxonomy for records
 *   DDDRecordRetention   — retention rule / schedule
 *   DDDRecordAuditLog    — immutable audit trail for record operations
 *
 * Canonical links
 *   beneficiaryId → Beneficiary
 *   createdBy     → User
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

const RECORD_TYPES = [
  'clinical_note',
  'assessment_record',
  'treatment_plan',
  'session_record',
  'referral_record',
  'discharge_record',
  'lab_record',
  'imaging_record',
  'medication_record',
  'incident_report',
  'consent_record',
  'administrative_record',
];

const RECORD_STATUSES = [
  'active',
  'finalized',
  'amended',
  'appended',
  'archived',
  'locked',
  'pending_review',
  'reviewed',
  'expired',
  'voided',
];

const RETENTION_PERIODS = [
  '30_days',
  '90_days',
  '6_months',
  '1_year',
  '3_years',
  '5_years',
  '7_years',
  '10_years',
  '25_years',
  'permanent',
];

const RECORD_SOURCES = [
  'manual_entry',
  'imported',
  'scanned',
  'ehr_sync',
  'lab_interface',
  'radiology_interface',
  'pharmacy_interface',
  'device_upload',
  'patient_portal',
  'mobile_app',
  'api_integration',
  'batch_import',
];

const AUDIT_ACTION_TYPES = [
  'created',
  'viewed',
  'updated',
  'deleted',
  'exported',
  'printed',
  'shared',
  'locked',
  'amended',
  'restored',
];

const SENSITIVITY_LEVELS = [
  'normal',
  'sensitive',
  'highly_sensitive',
  'restricted',
  'confidential',
  'legal_protected',
];

/* ── Built-in record categories ─────────────────────────────────────────── */
const BUILTIN_RECORD_CATEGORIES = [
  {
    code: 'RCAT-CLINICAL',
    name: 'Clinical Records',
    nameAr: 'السجلات السريرية',
    retentionDefault: '10_years',
  },
  {
    code: 'RCAT-THERAPY',
    name: 'Therapy Records',
    nameAr: 'سجلات العلاج',
    retentionDefault: '7_years',
  },
  { code: 'RCAT-ASSESS', name: 'Assessments', nameAr: 'التقييمات', retentionDefault: '7_years' },
  { code: 'RCAT-ADMIN', name: 'Administrative', nameAr: 'إداري', retentionDefault: '5_years' },
  {
    code: 'RCAT-CONSENT',
    name: 'Consent Forms',
    nameAr: 'نماذج الموافقة',
    retentionDefault: '25_years',
  },
  { code: 'RCAT-LAB', name: 'Lab Results', nameAr: 'نتائج المختبر', retentionDefault: '10_years' },
  { code: 'RCAT-IMAGING', name: 'Imaging', nameAr: 'التصوير', retentionDefault: '10_years' },
  {
    code: 'RCAT-INCIDENT',
    name: 'Incident Reports',
    nameAr: 'تقارير الحوادث',
    retentionDefault: 'permanent',
  },
  { code: 'RCAT-REFERRAL', name: 'Referrals', nameAr: 'الإحالات', retentionDefault: '5_years' },
  {
    code: 'RCAT-LEGAL',
    name: 'Legal Documents',
    nameAr: 'الوثائق القانونية',
    retentionDefault: 'permanent',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Clinical Record ───────────────────────────────────────────────────── */
const clinicalRecordSchema = new Schema(
  {
    recordCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: RECORD_TYPES, required: true },
    status: { type: String, enum: RECORD_STATUSES, default: 'active' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'DDDRecordCategory' },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    episodeId: { type: Schema.Types.ObjectId },
    content: { type: String },
    structuredData: { type: Map, of: Schema.Types.Mixed },
    source: { type: String, enum: RECORD_SOURCES, default: 'manual_entry' },
    sensitivity: { type: String, enum: SENSITIVITY_LEVELS, default: 'normal' },
    attachmentIds: [{ type: Schema.Types.ObjectId }],
    version: { type: Number, default: 1 },
    amendments: [
      {
        version: Number,
        content: String,
        amendedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        amendedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    lockedAt: { type: Date },
    lockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    retentionDate: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

clinicalRecordSchema.index({ beneficiaryId: 1, type: 1 });
clinicalRecordSchema.index({ status: 1, createdAt: -1 });
clinicalRecordSchema.index({ categoryId: 1 });

const DDDClinicalRecord =
  mongoose.models.DDDClinicalRecord || mongoose.model('DDDClinicalRecord', clinicalRecordSchema);

/* ── Record Category ───────────────────────────────────────────────────── */
const recordCategorySchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    parentId: { type: Schema.Types.ObjectId, ref: 'DDDRecordCategory', default: null },
    retentionDefault: { type: String, enum: RETENTION_PERIODS },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDRecordCategory =
  mongoose.models.DDDRecordCategory || mongoose.model('DDDRecordCategory', recordCategorySchema);

/* ── Record Retention ──────────────────────────────────────────────────── */
const recordRetentionSchema = new Schema(
  {
    retentionCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'DDDRecordCategory' },
    period: { type: String, enum: RETENTION_PERIODS, required: true },
    action: {
      type: String,
      enum: ['archive', 'delete', 'review', 'anonymize'],
      default: 'archive',
    },
    isAutomatic: { type: Boolean, default: false },
    notifyBefore: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDRecordRetention =
  mongoose.models.DDDRecordRetention || mongoose.model('DDDRecordRetention', recordRetentionSchema);

/* ── Record Audit Log ──────────────────────────────────────────────────── */
const recordAuditLogSchema = new Schema(
  {
    recordId: { type: Schema.Types.ObjectId, ref: 'DDDClinicalRecord', required: true },
    action: { type: String, enum: AUDIT_ACTION_TYPES, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    previousData: { type: Map, of: Schema.Types.Mixed },
    newData: { type: Map, of: Schema.Types.Mixed },
    reason: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

recordAuditLogSchema.index({ recordId: 1, createdAt: -1 });
recordAuditLogSchema.index({ userId: 1, action: 1 });

const DDDRecordAuditLog =
  mongoose.models.DDDRecordAuditLog || mongoose.model('DDDRecordAuditLog', recordAuditLogSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class RecordManager extends BaseDomainModule {
  constructor() {
    super('RecordManager', {
      description: 'Clinical & administrative record lifecycle management',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedCategories();
    this.log('Record Manager initialised ✓');
    return true;
  }

  async _seedCategories() {
    for (const c of BUILTIN_RECORD_CATEGORIES) {
      const exists = await DDDRecordCategory.findOne({ code: c.code }).lean();
      if (!exists) await DDDRecordCategory.create(c);
    }
  }

  /* ── Records ── */
  async listRecords(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.categoryId) q.categoryId = filters.categoryId;
    return DDDClinicalRecord.find(q).sort({ createdAt: -1 }).limit(100).lean();
  }
  async getRecord(id) {
    return DDDClinicalRecord.findById(id).lean();
  }
  async createRecord(data) {
    if (!data.recordCode) data.recordCode = `REC-${Date.now()}`;
    return DDDClinicalRecord.create(data);
  }
  async updateRecord(id, data) {
    return DDDClinicalRecord.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async amendRecord(id, amendment) {
    const record = await DDDClinicalRecord.findById(id);
    if (!record) return null;
    record.amendments.push({ ...amendment, version: record.version + 1 });
    record.version += 1;
    record.status = 'amended';
    return record.save();
  }
  async lockRecord(id, userId) {
    return DDDClinicalRecord.findByIdAndUpdate(
      id,
      { status: 'locked', lockedAt: new Date(), lockedBy: userId },
      { new: true }
    );
  }
  async searchRecords(query) {
    return DDDClinicalRecord.find({ title: { $regex: query, $options: 'i' } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
  }

  /* ── Categories ── */
  async listCategories() {
    return DDDRecordCategory.find({ isActive: true }).sort({ name: 1 }).lean();
  }
  async createCategory(data) {
    return DDDRecordCategory.create(data);
  }

  /* ── Retention ── */
  async listRetentions() {
    return DDDRecordRetention.find({ isActive: true }).lean();
  }
  async createRetention(data) {
    if (!data.retentionCode) data.retentionCode = `RET-${Date.now()}`;
    return DDDRecordRetention.create(data);
  }
  async updateRetention(id, data) {
    return DDDRecordRetention.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Audit Log ── */
  async listAuditLogs(recordId) {
    return DDDRecordAuditLog.find({ recordId }).sort({ createdAt: -1 }).lean();
  }
  async logAudit(data) {
    return DDDRecordAuditLog.create(data);
  }

  /* ── Analytics ── */
  async getRecordAnalytics() {
    const [records, categories, retentions, auditLogs] = await Promise.all([
      DDDClinicalRecord.countDocuments(),
      DDDRecordCategory.countDocuments(),
      DDDRecordRetention.countDocuments(),
      DDDRecordAuditLog.countDocuments(),
    ]);
    return { records, categories, retentions, auditLogs };
  }

  async healthCheck() {
    const [records, categories] = await Promise.all([
      DDDClinicalRecord.countDocuments(),
      DDDRecordCategory.countDocuments(),
    ]);
    return { status: 'healthy', records, categories };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createRecordManagerRouter() {
  const router = Router();
  const svc = new RecordManager();

  /* Records */
  router.get('/records/clinical', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRecords(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/records/clinical/search', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.searchRecords(req.query.q || '') });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/records/clinical/:id', async (req, res) => {
    try {
      const d = await svc.getRecord(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/records/clinical', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRecord(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/records/clinical/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateRecord(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/records/clinical/:id/amend', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.amendRecord(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/records/clinical/:id/lock', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.lockRecord(req.params.id, req.body.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Categories */
  router.get('/records/categories', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listCategories() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/records/categories', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCategory(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Retention */
  router.get('/records/retentions', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listRetentions() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/records/retentions', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRetention(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Audit */
  router.get('/records/audit/:recordId', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAuditLogs(req.params.recordId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/records/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getRecordAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/records/health', async (_req, res) => {
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
  RecordManager,
  DDDClinicalRecord,
  DDDRecordCategory,
  DDDRecordRetention,
  DDDRecordAuditLog,
  RECORD_TYPES,
  RECORD_STATUSES,
  RETENTION_PERIODS,
  RECORD_SOURCES,
  AUDIT_ACTION_TYPES,
  SENSITIVITY_LEVELS,
  BUILTIN_RECORD_CATEGORIES,
  createRecordManagerRouter,
};
