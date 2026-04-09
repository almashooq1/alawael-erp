/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Contract Manager — Phase 26 · Legal & Contract Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Contract lifecycle, templates, versions, renewals, obligations tracking.
 *
 * Aggregates
 *   DDDContract           — contract record
 *   DDDContractTemplate   — reusable template
 *   DDDContractAmendment  — amendment / addendum
 *   DDDContractObligation — obligation tracking
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

const CONTRACT_TYPES = [
  'service_agreement',
  'employment',
  'vendor',
  'lease',
  'licensing',
  'partnership',
  'nda',
  'mou',
  'consulting',
  'maintenance',
  'insurance',
  'procurement',
];

const CONTRACT_STATUSES = [
  'draft',
  'pending_review',
  'under_negotiation',
  'approved',
  'active',
  'suspended',
  'expired',
  'terminated',
  'renewed',
  'archived',
];

const OBLIGATION_TYPES = [
  'payment',
  'delivery',
  'reporting',
  'compliance',
  'performance',
  'confidentiality',
  'indemnification',
  'insurance',
  'audit',
  'renewal_notice',
  'termination_notice',
  'regulatory',
];

const OBLIGATION_STATUSES = [
  'pending',
  'in_progress',
  'fulfilled',
  'overdue',
  'waived',
  'breached',
  'escalated',
  'cancelled',
  'partially_fulfilled',
  'under_review',
];

const AMENDMENT_TYPES = [
  'addendum',
  'modification',
  'extension',
  'renewal',
  'scope_change',
  'price_adjustment',
  'term_change',
  'party_change',
  'schedule_change',
  'compliance_update',
];

const TEMPLATE_CATEGORIES = [
  'service_level',
  'employment',
  'vendor_supply',
  'lease_rental',
  'partnership',
  'research',
  'consulting',
  'maintenance',
  'insurance',
  'procurement',
  'confidentiality',
  'regulatory',
];

const BUILTIN_CONTRACT_TEMPLATES = [
  {
    code: 'TPL-SLA',
    name: 'Service Level Agreement',
    nameAr: 'اتفاقية مستوى الخدمة',
    category: 'service_level',
  },
  { code: 'TPL-EMP', name: 'Employment Contract', nameAr: 'عقد عمل', category: 'employment' },
  { code: 'TPL-VND', name: 'Vendor Agreement', nameAr: 'اتفاقية مورد', category: 'vendor_supply' },
  { code: 'TPL-LSE', name: 'Lease Agreement', nameAr: 'عقد إيجار', category: 'lease_rental' },
  {
    code: 'TPL-NDA',
    name: 'Non-Disclosure Agreement',
    nameAr: 'اتفاقية عدم إفشاء',
    category: 'confidentiality',
  },
  {
    code: 'TPL-PRT',
    name: 'Partnership Agreement',
    nameAr: 'اتفاقية شراكة',
    category: 'partnership',
  },
  { code: 'TPL-CNS', name: 'Consulting Agreement', nameAr: 'عقد استشارات', category: 'consulting' },
  { code: 'TPL-MNT', name: 'Maintenance Contract', nameAr: 'عقد صيانة', category: 'maintenance' },
  { code: 'TPL-INS', name: 'Insurance Agreement', nameAr: 'عقد تأمين', category: 'insurance' },
  { code: 'TPL-PRC', name: 'Procurement Contract', nameAr: 'عقد شراء', category: 'procurement' },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

const contractSchema = new Schema(
  {
    contractCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    type: { type: String, enum: CONTRACT_TYPES, required: true },
    status: { type: String, enum: CONTRACT_STATUSES, default: 'draft' },
    partyA: { type: String, required: true },
    partyB: { type: String, required: true },
    value: { type: Number },
    currency: { type: String, default: 'SAR' },
    startDate: { type: Date },
    endDate: { type: Date },
    signedDate: { type: Date },
    renewalDate: { type: Date },
    autoRenew: { type: Boolean, default: false },
    templateId: { type: Schema.Types.ObjectId, ref: 'DDDContractTemplate' },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String }],
    description: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

contractSchema.index({ type: 1, status: 1 });
contractSchema.index({ endDate: 1 });

const DDDContract = mongoose.models.DDDContract || mongoose.model('DDDContract', contractSchema);

const contractTemplateSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    category: { type: String, enum: TEMPLATE_CATEGORIES, required: true },
    content: { type: String },
    clauses: [{ title: String, text: String, required: Boolean }],
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDContractTemplate =
  mongoose.models.DDDContractTemplate ||
  mongoose.model('DDDContractTemplate', contractTemplateSchema);

const contractAmendmentSchema = new Schema(
  {
    amendmentCode: { type: String, required: true, unique: true },
    contractId: { type: Schema.Types.ObjectId, ref: 'DDDContract', required: true },
    type: { type: String, enum: AMENDMENT_TYPES, required: true },
    description: { type: String },
    effectiveDate: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'applied'],
      default: 'draft',
    },
    changes: { type: Map, of: Schema.Types.Mixed },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

contractAmendmentSchema.index({ contractId: 1 });

const DDDContractAmendment =
  mongoose.models.DDDContractAmendment ||
  mongoose.model('DDDContractAmendment', contractAmendmentSchema);

const contractObligationSchema = new Schema(
  {
    obligationCode: { type: String, required: true, unique: true },
    contractId: { type: Schema.Types.ObjectId, ref: 'DDDContract', required: true },
    type: { type: String, enum: OBLIGATION_TYPES, required: true },
    status: { type: String, enum: OBLIGATION_STATUSES, default: 'pending' },
    description: { type: String },
    dueDate: { type: Date },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
    reminderSent: { type: Boolean, default: false },
    escalated: { type: Boolean, default: false },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

contractObligationSchema.index({ contractId: 1, status: 1 });
contractObligationSchema.index({ dueDate: 1 });

const DDDContractObligation =
  mongoose.models.DDDContractObligation ||
  mongoose.model('DDDContractObligation', contractObligationSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class ContractManager extends BaseDomainModule {
  constructor() {
    super('ContractManager', { description: 'Contract lifecycle management', version: '1.0.0' });
  }

  async initialize() {
    for (const t of BUILTIN_CONTRACT_TEMPLATES) {
      const exists = await DDDContractTemplate.findOne({ code: t.code }).lean();
      if (!exists) await DDDContractTemplate.create(t);
    }
    this.log('Contract Manager initialised ✓');
    return true;
  }

  /* Contracts */
  async listContracts(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDContract.find(q).sort({ createdAt: -1 }).limit(200).lean();
  }
  async getContract(id) {
    return DDDContract.findById(id).lean();
  }
  async createContract(data) {
    if (!data.contractCode) data.contractCode = `CTR-${Date.now()}`;
    return DDDContract.create(data);
  }
  async updateContract(id, data) {
    return DDDContract.findByIdAndUpdate(id, data, { new: true });
  }

  /* Templates */
  async listTemplates(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    return DDDContractTemplate.find(q).sort({ name: 1 }).lean();
  }
  async createTemplate(data) {
    return DDDContractTemplate.create(data);
  }

  /* Amendments */
  async listAmendments(contractId) {
    return DDDContractAmendment.find({ contractId }).sort({ createdAt: -1 }).lean();
  }
  async createAmendment(data) {
    if (!data.amendmentCode) data.amendmentCode = `AMND-${Date.now()}`;
    return DDDContractAmendment.create(data);
  }

  /* Obligations */
  async listObligations(contractId) {
    const q = contractId ? { contractId } : {};
    return DDDContractObligation.find(q).sort({ dueDate: 1 }).lean();
  }
  async createObligation(data) {
    if (!data.obligationCode) data.obligationCode = `OBL-${Date.now()}`;
    return DDDContractObligation.create(data);
  }
  async fulfillObligation(id) {
    return DDDContractObligation.findByIdAndUpdate(
      id,
      { status: 'fulfilled', completedAt: new Date() },
      { new: true }
    );
  }

  /* Analytics */
  async getContractAnalytics() {
    const [contracts, templates, amendments, obligations] = await Promise.all([
      DDDContract.countDocuments(),
      DDDContractTemplate.countDocuments(),
      DDDContractAmendment.countDocuments(),
      DDDContractObligation.countDocuments(),
    ]);
    const active = await DDDContract.countDocuments({ status: 'active' });
    const overdue = await DDDContractObligation.countDocuments({ status: 'overdue' });
    return { contracts, active, templates, amendments, obligations, overdueObligations: overdue };
  }

  async healthCheck() {
    const [active, expiring] = await Promise.all([
      DDDContract.countDocuments({ status: 'active' }),
      DDDContract.countDocuments({
        status: 'active',
        endDate: { $lte: new Date(Date.now() + 30 * 86400000) },
      }),
    ]);
    return { status: 'healthy', activeContracts: active, expiringSoon: expiring };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createContractManagerRouter() {
  const router = Router();
  const svc = new ContractManager();

  router.get('/contracts', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listContracts(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/contracts/:id', async (req, res) => {
    try {
      const d = await svc.getContract(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/contracts', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createContract(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/contracts/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateContract(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/contracts/templates/list', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTemplates(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/contracts/templates', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createTemplate(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/contracts/:contractId/amendments', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAmendments(req.params.contractId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/contracts/:contractId/amendments', async (req, res) => {
    try {
      res
        .status(201)
        .json({
          success: true,
          data: await svc.createAmendment({ ...req.body, contractId: req.params.contractId }),
        });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/contracts/obligations/all', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listObligations(req.query.contractId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/contracts/obligations', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createObligation(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/contracts/analytics/summary', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getContractAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/contracts/health', async (_req, res) => {
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
  ContractManager,
  DDDContract,
  DDDContractTemplate,
  DDDContractAmendment,
  DDDContractObligation,
  CONTRACT_TYPES,
  CONTRACT_STATUSES,
  OBLIGATION_TYPES,
  OBLIGATION_STATUSES,
  AMENDMENT_TYPES,
  TEMPLATE_CATEGORIES,
  BUILTIN_CONTRACT_TEMPLATES,
  createContractManagerRouter,
};
