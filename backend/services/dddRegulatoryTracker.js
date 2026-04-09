/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Regulatory Tracker — Phase 26 · Legal & Contract Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Regulatory requirements, compliance audits, certifications,
 * licensing management, and regulatory change tracking.
 *
 * Aggregates
 *   DDDRegulatoryRequirement — requirement / regulation
 *   DDDComplianceAudit       — audit record
 *   DDDCertification         — certification / license
 *   DDDRegulatoryChange      — regulation change tracking
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

const REQUIREMENT_TYPES = [
  'statutory',
  'regulatory',
  'accreditation',
  'licensing',
  'industry_standard',
  'contractual',
  'internal_policy',
  'international',
  'local_ordinance',
  'professional_standard',
  'environmental',
  'safety',
];

const REQUIREMENT_STATUSES = [
  'identified',
  'assessed',
  'compliant',
  'non_compliant',
  'partially_compliant',
  'under_remediation',
  'waived',
  'expired',
  'pending_review',
  'archived',
];

const AUDIT_TYPES = [
  'internal',
  'external',
  'regulatory',
  'accreditation',
  'surprise',
  'routine',
  'follow_up',
  'pre_certification',
  'surveillance',
  'special_purpose',
  'mock_survey',
  'peer_review',
];

const AUDIT_STATUSES = [
  'planned',
  'scheduled',
  'in_progress',
  'fieldwork',
  'reporting',
  'completed',
  'follow_up',
  'closed',
  'cancelled',
  'deferred',
];

const CERTIFICATION_TYPES = [
  'jci',
  'cbahi',
  'iso_9001',
  'iso_27001',
  'iso_45001',
  'carf',
  'cap',
  'himss_emram',
  'medical_license',
  'facility_license',
  'professional_license',
  'specialty_accreditation',
];

const CERTIFICATION_STATUSES = [
  'applied',
  'under_review',
  'site_visit_scheduled',
  'approved',
  'active',
  'conditional',
  'expired',
  'revoked',
  'renewal_pending',
  'suspended',
];

const CHANGE_IMPACT_LEVELS = [
  'critical',
  'high',
  'medium',
  'low',
  'negligible',
  'positive',
  'neutral',
  'unknown',
  'requires_assessment',
  'under_review',
];

const REGULATORY_BODIES = [
  'moh',
  'sfda',
  'cbahi',
  'jci',
  'iso',
  'osha',
  'hipaa',
  'gdpr',
  'nca',
  'carf',
  'who',
  'local_municipality',
];

const BUILTIN_REQUIREMENTS = [
  {
    code: 'REQ-CBAHI',
    name: 'CBAHI Accreditation Standards',
    nameAr: 'معايير اعتماد سباهي',
    type: 'accreditation',
    body: 'cbahi',
  },
  {
    code: 'REQ-MOH',
    name: 'MOH Licensing Requirements',
    nameAr: 'متطلبات ترخيص وزارة الصحة',
    type: 'licensing',
    body: 'moh',
  },
  {
    code: 'REQ-SFDA',
    name: 'SFDA Medical Device Regulations',
    nameAr: 'أنظمة هيئة الغذاء والدواء',
    type: 'regulatory',
    body: 'sfda',
  },
  {
    code: 'REQ-ISO9',
    name: 'ISO 9001 Quality Management',
    nameAr: 'نظام إدارة الجودة ISO 9001',
    type: 'industry_standard',
    body: 'iso',
  },
  {
    code: 'REQ-ISO27',
    name: 'ISO 27001 Information Security',
    nameAr: 'أمن المعلومات ISO 27001',
    type: 'industry_standard',
    body: 'iso',
  },
  {
    code: 'REQ-PRIV',
    name: 'Data Privacy & Protection',
    nameAr: 'حماية البيانات والخصوصية',
    type: 'statutory',
    body: 'nca',
  },
  {
    code: 'REQ-FIRE',
    name: 'Fire Safety Compliance',
    nameAr: 'الامتثال لمتطلبات السلامة من الحريق',
    type: 'safety',
    body: 'local_municipality',
  },
  {
    code: 'REQ-WASTE',
    name: 'Medical Waste Management',
    nameAr: 'إدارة النفايات الطبية',
    type: 'environmental',
    body: 'moh',
  },
  {
    code: 'REQ-PROF',
    name: 'Professional Staff Licensing',
    nameAr: 'ترخيص الكادر المهني',
    type: 'professional_standard',
    body: 'moh',
  },
  {
    code: 'REQ-EMER',
    name: 'Emergency Preparedness Standards',
    nameAr: 'معايير الاستعداد للطوارئ',
    type: 'accreditation',
    body: 'cbahi',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

const regulatoryRequirementSchema = new Schema(
  {
    requirementCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: REQUIREMENT_TYPES, required: true },
    status: { type: String, enum: REQUIREMENT_STATUSES, default: 'identified' },
    regulatoryBody: { type: String, enum: REGULATORY_BODIES },
    description: { type: String },
    reference: { type: String },
    effectiveDate: { type: Date },
    complianceDeadline: { type: Date },
    lastAssessedDate: { type: Date },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

regulatoryRequirementSchema.index({ type: 1, status: 1 });
regulatoryRequirementSchema.index({ regulatoryBody: 1 });

const DDDRegulatoryRequirement =
  mongoose.models.DDDRegulatoryRequirement ||
  mongoose.model('DDDRegulatoryRequirement', regulatoryRequirementSchema);

const complianceAuditSchema = new Schema(
  {
    auditCode: { type: String, required: true, unique: true },
    type: { type: String, enum: AUDIT_TYPES, required: true },
    status: { type: String, enum: AUDIT_STATUSES, default: 'planned' },
    title: { type: String, required: true },
    scope: { type: String },
    leadAuditorId: { type: Schema.Types.ObjectId, ref: 'User' },
    scheduledDate: { type: Date },
    startDate: { type: Date },
    endDate: { type: Date },
    findings: [{ description: String, severity: String, status: String }],
    score: { type: Number },
    reportUrl: { type: String },
    requirementIds: [{ type: Schema.Types.ObjectId, ref: 'DDDRegulatoryRequirement' }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

complianceAuditSchema.index({ type: 1, status: 1 });

const DDDComplianceAudit =
  mongoose.models.DDDComplianceAudit || mongoose.model('DDDComplianceAudit', complianceAuditSchema);

const certificationSchema = new Schema(
  {
    certificationCode: { type: String, required: true, unique: true },
    type: { type: String, enum: CERTIFICATION_TYPES, required: true },
    status: { type: String, enum: CERTIFICATION_STATUSES, default: 'applied' },
    name: { type: String, required: true },
    issuedBy: { type: String },
    issuedDate: { type: Date },
    expiryDate: { type: Date },
    renewalDate: { type: Date },
    certificateUrl: { type: String },
    scope: { type: String },
    conditions: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

certificationSchema.index({ type: 1, status: 1 });
certificationSchema.index({ expiryDate: 1 });

const DDDCertification =
  mongoose.models.DDDCertification || mongoose.model('DDDCertification', certificationSchema);

const regulatoryChangeSchema = new Schema(
  {
    changeCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    regulatoryBody: { type: String, enum: REGULATORY_BODIES },
    impactLevel: { type: String, enum: CHANGE_IMPACT_LEVELS, default: 'medium' },
    description: { type: String },
    effectiveDate: { type: Date },
    identifiedDate: { type: Date, default: Date.now },
    assessmentComplete: { type: Boolean, default: false },
    actionRequired: { type: Boolean, default: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    relatedRequirementIds: [{ type: Schema.Types.ObjectId, ref: 'DDDRegulatoryRequirement' }],
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

regulatoryChangeSchema.index({ impactLevel: 1 });
regulatoryChangeSchema.index({ regulatoryBody: 1 });

const DDDRegulatoryChange =
  mongoose.models.DDDRegulatoryChange ||
  mongoose.model('DDDRegulatoryChange', regulatoryChangeSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class RegulatoryTracker extends BaseDomainModule {
  constructor() {
    super('RegulatoryTracker', {
      description: 'Regulatory requirements, audits & certifications',
      version: '1.0.0',
    });
  }

  async initialize() {
    for (const r of BUILTIN_REQUIREMENTS) {
      const exists = await DDDRegulatoryRequirement.findOne({ requirementCode: r.code }).lean();
      if (!exists)
        await DDDRegulatoryRequirement.create({
          requirementCode: r.code,
          name: r.name,
          nameAr: r.nameAr,
          type: r.type,
          regulatoryBody: r.body,
        });
    }
    this.log('Regulatory Tracker initialised ✓');
    return true;
  }

  /* Requirements */
  async listRequirements(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.regulatoryBody) q.regulatoryBody = filters.regulatoryBody;
    return DDDRegulatoryRequirement.find(q).sort({ name: 1 }).lean();
  }
  async getRequirement(id) {
    return DDDRegulatoryRequirement.findById(id).lean();
  }
  async createRequirement(data) {
    if (!data.requirementCode) data.requirementCode = `REQ-${Date.now()}`;
    return DDDRegulatoryRequirement.create(data);
  }
  async updateRequirement(id, data) {
    return DDDRegulatoryRequirement.findByIdAndUpdate(id, data, { new: true });
  }

  /* Audits */
  async listAudits(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDComplianceAudit.find(q).sort({ scheduledDate: -1 }).lean();
  }
  async scheduleAudit(data) {
    if (!data.auditCode) data.auditCode = `AUD-${Date.now()}`;
    return DDDComplianceAudit.create(data);
  }
  async updateAudit(id, data) {
    return DDDComplianceAudit.findByIdAndUpdate(id, data, { new: true });
  }

  /* Certifications */
  async listCertifications(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDCertification.find(q).sort({ expiryDate: 1 }).lean();
  }
  async addCertification(data) {
    if (!data.certificationCode) data.certificationCode = `CERT-${Date.now()}`;
    return DDDCertification.create(data);
  }

  /* Regulatory Changes */
  async listChanges(filters = {}) {
    const q = {};
    if (filters.impactLevel) q.impactLevel = filters.impactLevel;
    return DDDRegulatoryChange.find(q).sort({ identifiedDate: -1 }).lean();
  }
  async trackChange(data) {
    if (!data.changeCode) data.changeCode = `RCHG-${Date.now()}`;
    return DDDRegulatoryChange.create(data);
  }

  /* Analytics */
  async getRegulatoryAnalytics() {
    const [requirements, audits, certifications, changes] = await Promise.all([
      DDDRegulatoryRequirement.countDocuments(),
      DDDComplianceAudit.countDocuments(),
      DDDCertification.countDocuments(),
      DDDRegulatoryChange.countDocuments(),
    ]);
    const compliant = await DDDRegulatoryRequirement.countDocuments({ status: 'compliant' });
    const nonCompliant = await DDDRegulatoryRequirement.countDocuments({ status: 'non_compliant' });
    const activeCerts = await DDDCertification.countDocuments({ status: 'active' });
    return {
      requirements,
      compliant,
      nonCompliant,
      audits,
      certifications,
      activeCertifications: activeCerts,
      pendingChanges: changes,
    };
  }

  async healthCheck() {
    const [nonCompliant, expiring] = await Promise.all([
      DDDRegulatoryRequirement.countDocuments({ status: 'non_compliant' }),
      DDDCertification.countDocuments({
        status: 'active',
        expiryDate: { $lte: new Date(Date.now() + 90 * 86400000) },
      }),
    ]);
    return {
      status: 'healthy',
      nonCompliantRequirements: nonCompliant,
      expiringCertifications: expiring,
    };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createRegulatoryTrackerRouter() {
  const router = Router();
  const svc = new RegulatoryTracker();

  router.get('/regulatory/requirements', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRequirements(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/regulatory/requirements/:id', async (req, res) => {
    try {
      const d = await svc.getRequirement(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/regulatory/requirements', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRequirement(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/regulatory/audits', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAudits(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/regulatory/audits', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.scheduleAudit(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/regulatory/certifications', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listCertifications(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/regulatory/certifications', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addCertification(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/regulatory/changes', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listChanges(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/regulatory/changes', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.trackChange(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/regulatory/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getRegulatoryAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/regulatory/health', async (_req, res) => {
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
  RegulatoryTracker,
  DDDRegulatoryRequirement,
  DDDComplianceAudit,
  DDDCertification,
  DDDRegulatoryChange,
  REQUIREMENT_TYPES,
  REQUIREMENT_STATUSES,
  AUDIT_TYPES,
  AUDIT_STATUSES,
  CERTIFICATION_TYPES,
  CERTIFICATION_STATUSES,
  CHANGE_IMPACT_LEVELS,
  REGULATORY_BODIES,
  BUILTIN_REQUIREMENTS,
  createRegulatoryTrackerRouter,
};
