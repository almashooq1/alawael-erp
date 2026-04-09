/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Legal Case Tracker — Phase 26 · Legal & Contract Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Legal case management, litigation tracking, legal opinions, compliance issues.
 *
 * Aggregates
 *   DDDLegalCase       — legal case / matter
 *   DDDLegalDocument   — legal document (filings, evidence, correspondence)
 *   DDDLegalParty      — party involved in case
 *   DDDLegalMilestone  — key dates / deadlines
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

const CASE_TYPES = [
  'litigation',
  'arbitration',
  'mediation',
  'regulatory_action',
  'employment_dispute',
  'malpractice',
  'contract_dispute',
  'insurance_claim',
  'intellectual_property',
  'compliance_violation',
  'patient_complaint',
  'administrative',
];

const CASE_STATUSES = [
  'open',
  'under_review',
  'investigation',
  'pre_litigation',
  'active_litigation',
  'discovery',
  'trial',
  'appeal',
  'settled',
  'closed',
  'dismissed',
  'archived',
];

const CASE_PRIORITIES = [
  'critical',
  'high',
  'medium',
  'low',
  'routine',
  'urgent',
  'emergency',
  'deferred',
  'monitoring',
  'escalated',
];

const DOCUMENT_TYPES = [
  'filing',
  'motion',
  'brief',
  'evidence',
  'correspondence',
  'contract',
  'opinion',
  'order',
  'settlement',
  'deposition',
  'affidavit',
  'subpoena',
];

const PARTY_ROLES = [
  'plaintiff',
  'defendant',
  'witness',
  'expert_witness',
  'counsel',
  'judge',
  'mediator',
  'arbitrator',
  'co_defendant',
  'third_party',
  'intervenor',
  'amicus',
];

const MILESTONE_TYPES = [
  'filing_deadline',
  'hearing_date',
  'trial_date',
  'deposition',
  'discovery_deadline',
  'motion_deadline',
  'settlement_conference',
  'appeal_deadline',
  'mediation_date',
  'status_conference',
];

const BUILTIN_CASE_CATEGORIES = [
  {
    code: 'CAT-MED',
    name: 'Medical Malpractice',
    nameAr: 'سوء الممارسة الطبية',
    riskLevel: 'high',
  },
  { code: 'CAT-EMP', name: 'Employment Law', nameAr: 'قانون العمل', riskLevel: 'medium' },
  { code: 'CAT-CTR', name: 'Contract Disputes', nameAr: 'نزاعات العقود', riskLevel: 'medium' },
  {
    code: 'CAT-REG',
    name: 'Regulatory Compliance',
    nameAr: 'الامتثال التنظيمي',
    riskLevel: 'high',
  },
  { code: 'CAT-INS', name: 'Insurance Claims', nameAr: 'مطالبات التأمين', riskLevel: 'medium' },
  { code: 'CAT-PTN', name: 'Patient Rights', nameAr: 'حقوق المرضى', riskLevel: 'high' },
  { code: 'CAT-IPR', name: 'Intellectual Property', nameAr: 'الملكية الفكرية', riskLevel: 'low' },
  { code: 'CAT-ADM', name: 'Administrative Actions', nameAr: 'إجراءات إدارية', riskLevel: 'low' },
  { code: 'CAT-PRV', name: 'Privacy & Data', nameAr: 'الخصوصية والبيانات', riskLevel: 'high' },
  { code: 'CAT-ENV', name: 'Environmental', nameAr: 'البيئة', riskLevel: 'medium' },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

const legalCaseSchema = new Schema(
  {
    caseCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    type: { type: String, enum: CASE_TYPES, required: true },
    status: { type: String, enum: CASE_STATUSES, default: 'open' },
    priority: { type: String, enum: CASE_PRIORITIES, default: 'medium' },
    description: { type: String },
    caseNumber: { type: String },
    court: { type: String },
    jurisdiction: { type: String },
    filingDate: { type: Date },
    closedDate: { type: Date },
    estimatedValue: { type: Number },
    actualValue: { type: Number },
    assignedCounselId: { type: Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

legalCaseSchema.index({ type: 1, status: 1 });
legalCaseSchema.index({ priority: 1 });

const DDDLegalCase =
  mongoose.models.DDDLegalCase || mongoose.model('DDDLegalCase', legalCaseSchema);

const legalDocumentSchema = new Schema(
  {
    documentCode: { type: String, required: true, unique: true },
    caseId: { type: Schema.Types.ObjectId, ref: 'DDDLegalCase', required: true },
    type: { type: String, enum: DOCUMENT_TYPES, required: true },
    title: { type: String, required: true },
    fileUrl: { type: String },
    filedDate: { type: Date, default: Date.now },
    filedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isConfidential: { type: Boolean, default: false },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

legalDocumentSchema.index({ caseId: 1 });

const DDDLegalDocument =
  mongoose.models.DDDLegalDocument || mongoose.model('DDDLegalDocument', legalDocumentSchema);

const legalPartySchema = new Schema(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'DDDLegalCase', required: true },
    name: { type: String, required: true },
    role: { type: String, enum: PARTY_ROLES, required: true },
    organization: { type: String },
    email: { type: String },
    phone: { type: String },
    counselName: { type: String },
    isInternal: { type: Boolean, default: false },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

legalPartySchema.index({ caseId: 1 });

const DDDLegalParty =
  mongoose.models.DDDLegalParty || mongoose.model('DDDLegalParty', legalPartySchema);

const legalMilestoneSchema = new Schema(
  {
    milestoneCode: { type: String, required: true, unique: true },
    caseId: { type: Schema.Types.ObjectId, ref: 'DDDLegalCase', required: true },
    type: { type: String, enum: MILESTONE_TYPES, required: true },
    title: { type: String, required: true },
    dueDate: { type: Date, required: true },
    completedDate: { type: Date },
    isCompleted: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

legalMilestoneSchema.index({ caseId: 1, dueDate: 1 });

const DDDLegalMilestone =
  mongoose.models.DDDLegalMilestone || mongoose.model('DDDLegalMilestone', legalMilestoneSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class LegalCaseTracker extends BaseDomainModule {
  constructor() {
    super('LegalCaseTracker', {
      description: 'Legal case & litigation tracking',
      version: '1.0.0',
    });
  }

  async initialize() {
    this.log('Legal Case Tracker initialised ✓');
    return true;
  }

  /* Cases */
  async listCases(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.priority) q.priority = filters.priority;
    return DDDLegalCase.find(q).sort({ createdAt: -1 }).limit(200).lean();
  }
  async getCase(id) {
    return DDDLegalCase.findById(id).lean();
  }
  async openCase(data) {
    if (!data.caseCode) data.caseCode = `CASE-${Date.now()}`;
    return DDDLegalCase.create(data);
  }
  async updateCase(id, data) {
    return DDDLegalCase.findByIdAndUpdate(id, data, { new: true });
  }

  /* Documents */
  async listDocuments(caseId) {
    return DDDLegalDocument.find({ caseId }).sort({ filedDate: -1 }).lean();
  }
  async addDocument(data) {
    if (!data.documentCode) data.documentCode = `LDOC-${Date.now()}`;
    return DDDLegalDocument.create(data);
  }

  /* Parties */
  async listParties(caseId) {
    return DDDLegalParty.find({ caseId }).lean();
  }
  async addParty(data) {
    return DDDLegalParty.create(data);
  }

  /* Milestones */
  async listMilestones(caseId) {
    return DDDLegalMilestone.find({ caseId }).sort({ dueDate: 1 }).lean();
  }
  async addMilestone(data) {
    if (!data.milestoneCode) data.milestoneCode = `LMS-${Date.now()}`;
    return DDDLegalMilestone.create(data);
  }
  async completeMilestone(id) {
    return DDDLegalMilestone.findByIdAndUpdate(
      id,
      { isCompleted: true, completedDate: new Date() },
      { new: true }
    );
  }

  /* Analytics */
  async getCaseAnalytics() {
    const [total, open, active, settled, closed] = await Promise.all([
      DDDLegalCase.countDocuments(),
      DDDLegalCase.countDocuments({ status: 'open' }),
      DDDLegalCase.countDocuments({ status: 'active_litigation' }),
      DDDLegalCase.countDocuments({ status: 'settled' }),
      DDDLegalCase.countDocuments({ status: 'closed' }),
    ]);
    const overdueMilestones = await DDDLegalMilestone.countDocuments({
      isCompleted: false,
      dueDate: { $lt: new Date() },
    });
    return { total, open, activeLitigation: active, settled, closed, overdueMilestones };
  }

  async healthCheck() {
    const [open, urgent] = await Promise.all([
      DDDLegalCase.countDocuments({
        status: { $in: ['open', 'active_litigation', 'investigation'] },
      }),
      DDDLegalCase.countDocuments({ priority: { $in: ['critical', 'urgent'] } }),
    ]);
    return { status: 'healthy', openCases: open, urgentCases: urgent };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createLegalCaseTrackerRouter() {
  const router = Router();
  const svc = new LegalCaseTracker();

  router.get('/legal/cases', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listCases(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/legal/cases/:id', async (req, res) => {
    try {
      const d = await svc.getCase(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/legal/cases', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.openCase(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/legal/cases/:caseId/documents', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDocuments(req.params.caseId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/legal/cases/:caseId/documents', async (req, res) => {
    try {
      res
        .status(201)
        .json({
          success: true,
          data: await svc.addDocument({ ...req.body, caseId: req.params.caseId }),
        });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/legal/cases/:caseId/parties', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listParties(req.params.caseId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/legal/cases/:caseId/milestones', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listMilestones(req.params.caseId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/legal/cases/:caseId/milestones', async (req, res) => {
    try {
      res
        .status(201)
        .json({
          success: true,
          data: await svc.addMilestone({ ...req.body, caseId: req.params.caseId }),
        });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/legal/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getCaseAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/legal/health', async (_req, res) => {
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
  LegalCaseTracker,
  DDDLegalCase,
  DDDLegalDocument,
  DDDLegalParty,
  DDDLegalMilestone,
  CASE_TYPES,
  CASE_STATUSES,
  CASE_PRIORITIES,
  DOCUMENT_TYPES,
  PARTY_ROLES,
  MILESTONE_TYPES,
  BUILTIN_CASE_CATEGORIES,
  createLegalCaseTrackerRouter,
};
