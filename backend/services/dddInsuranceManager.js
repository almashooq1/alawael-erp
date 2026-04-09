/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Insurance Manager — Phase 16 · Financial & Billing Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Insurance provider management, policy verification, coverage rules,
 * pre-authorization workflows, co-pay calculations, and provider network
 * management for rehabilitation services.
 *
 * Aggregates
 *   DDDInsuranceProvider — insurance company master record
 *   DDDInsurancePolicy   — beneficiary's active policy/coverage
 *   DDDPreAuthorization   — pre-auth requests and approvals
 *   DDDCoverageRule       — service-level coverage/exclusion rules
 *
 * Canonical links
 *   beneficiaryId → Beneficiary Core
 *   billingAccountId → DDDBillingAccount
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Router } = require('express');

/** Lightweight base so every DDD module has .log() */
class BaseDomainModule {
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;
  }
  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }
}

/* ── helper ────────────────────────────────────────────────────────────────── */
const model = name => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const PROVIDER_TYPES = [
  'government',
  'private',
  'cooperative',
  'self_insured',
  'international',
  'military',
  'workers_comp',
  'charity',
  'social_affairs',
  'employer_group',
];

const POLICY_STATUSES = [
  'active',
  'pending',
  'suspended',
  'expired',
  'cancelled',
  'exhausted',
  'under_review',
];

const COVERAGE_TYPES = [
  'full',
  'partial',
  'co_pay',
  'co_insurance',
  'deductible',
  'out_of_pocket_max',
  'excluded',
  'pre_auth_required',
  'case_by_case',
];

const PREAUTH_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'partially_approved',
  'denied',
  'expired',
  'appealed',
  'cancelled',
];

const NETWORK_TIERS = ['in_network', 'out_of_network', 'preferred', 'restricted'];

const BENEFIT_CATEGORIES = [
  'physical_therapy',
  'occupational_therapy',
  'speech_therapy',
  'psychological',
  'assistive_devices',
  'diagnostics',
  'tele_rehab',
  'home_care',
  'inpatient_rehab',
  'day_program',
  'group_therapy',
  'medication',
];

const PREAUTH_URGENCY = ['routine', 'urgent', 'emergency', 'retrospective'];

/* ── Built-in insurance providers ───────────────────────────────────────── */
const BUILTIN_PROVIDERS = [
  {
    code: 'CCHI-GOV',
    name: 'Council of Cooperative Health Insurance',
    nameAr: 'مجلس الضمان الصحي',
    type: 'government',
    country: 'SA',
  },
  { code: 'BUPA-SA', name: 'Bupa Arabia', nameAr: 'بوبا العربية', type: 'private', country: 'SA' },
  {
    code: 'MEDGULF',
    name: 'MedGulf Insurance',
    nameAr: 'ميدغلف للتأمين',
    type: 'private',
    country: 'SA',
  },
  { code: 'TAWUNIYA', name: 'Tawuniya', nameAr: 'التعاونية', type: 'cooperative', country: 'SA' },
  {
    code: 'WALAA',
    name: 'Walaa Insurance',
    nameAr: 'ولاء للتأمين',
    type: 'cooperative',
    country: 'SA',
  },
  {
    code: 'MALATH',
    name: 'Malath Insurance',
    nameAr: 'ملاذ للتأمين',
    type: 'private',
    country: 'SA',
  },
  {
    code: 'SOCIAL-AFF',
    name: 'Ministry of Social Affairs',
    nameAr: 'وزارة الشؤون الاجتماعية',
    type: 'social_affairs',
    country: 'SA',
  },
  {
    code: 'MILITARY-MED',
    name: 'Military Medical Services',
    nameAr: 'الخدمات الطبية العسكرية',
    type: 'military',
    country: 'SA',
  },
  {
    code: 'MOH-COVER',
    name: 'MOH Coverage Program',
    nameAr: 'برنامج تغطية وزارة الصحة',
    type: 'government',
    country: 'SA',
  },
  {
    code: 'SELF-PAY',
    name: 'Self-Pay / Uninsured',
    nameAr: 'دفع ذاتي / غير مؤمن',
    type: 'self_insured',
    country: 'SA',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Insurance Provider ────────────────────────────────────────────────── */
const insuranceProviderSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: PROVIDER_TYPES, required: true },
    country: { type: String, default: 'SA' },
    isActive: { type: Boolean, default: true },
    contact: {
      phone: { type: String },
      email: { type: String },
      fax: { type: String },
      website: { type: String },
      address: { type: String },
    },
    claimsPortal: {
      url: { type: String },
      apiKey: { type: String },
      format: { type: String, enum: ['HL7', 'NPHIES', 'custom', 'manual'], default: 'NPHIES' },
    },
    networkTier: { type: String, enum: NETWORK_TIERS, default: 'in_network' },
    paymentTermsDays: { type: Number, default: 45 },
    contractStart: { type: Date },
    contractEnd: { type: Date },
    serviceCategories: [{ type: String, enum: BENEFIT_CATEGORIES }],
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDInsuranceProvider =
  mongoose.models.DDDInsuranceProvider ||
  mongoose.model('DDDInsuranceProvider', insuranceProviderSchema);

/* ── Insurance Policy ──────────────────────────────────────────────────── */
const benefitLimitSchema = new Schema(
  {
    category: { type: String, enum: BENEFIT_CATEGORIES },
    coverageType: { type: String, enum: COVERAGE_TYPES, default: 'co_pay' },
    maxSessions: { type: Number },
    maxAmount: { type: Number },
    usedSessions: { type: Number, default: 0 },
    usedAmount: { type: Number, default: 0 },
    coPayPercent: { type: Number, default: 20 },
    coPayFixed: { type: Number },
    deductible: { type: Number, default: 0 },
    deductibleMet: { type: Number, default: 0 },
    preAuthRequired: { type: Boolean, default: false },
    notes: { type: String },
  },
  { _id: true }
);

const insurancePolicySchema = new Schema(
  {
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true, index: true },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'DDDInsuranceProvider',
      required: true,
      index: true,
    },
    policyNumber: { type: String, required: true },
    memberNumber: { type: String },
    groupNumber: { type: String },
    status: { type: String, enum: POLICY_STATUSES, default: 'active' },
    isPrimary: { type: Boolean, default: true },
    effectiveDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    planName: { type: String },
    planClass: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'VIP', 'economy', 'standard', 'premium'],
    },
    networkTier: { type: String, enum: NETWORK_TIERS, default: 'in_network' },
    annualLimit: { type: Number },
    lifetimeLimit: { type: Number },
    usedAnnual: { type: Number, default: 0 },
    usedLifetime: { type: Number, default: 0 },
    deductible: { type: Number, default: 0 },
    deductibleMet: { type: Number, default: 0 },
    outOfPocketMax: { type: Number },
    outOfPocketUsed: { type: Number, default: 0 },
    benefits: [benefitLimitSchema],
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verificationNotes: { type: String },
    subscriber: {
      name: { type: String },
      relationship: { type: String, enum: ['self', 'spouse', 'child', 'parent', 'other'] },
      nationalId: { type: String },
    },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

insurancePolicySchema.index({ policyNumber: 1, providerId: 1 });
insurancePolicySchema.index({ status: 1, expiryDate: 1 });

const DDDInsurancePolicy =
  mongoose.models.DDDInsurancePolicy || mongoose.model('DDDInsurancePolicy', insurancePolicySchema);

/* ── Pre-Authorization ─────────────────────────────────────────────────── */
const preAuthSchema = new Schema(
  {
    authNumber: { type: String, unique: true, required: true },
    policyId: {
      type: Schema.Types.ObjectId,
      ref: 'DDDInsurancePolicy',
      required: true,
      index: true,
    },
    providerId: { type: Schema.Types.ObjectId, ref: 'DDDInsuranceProvider', required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true, index: true },
    episodeId: { type: Schema.Types.ObjectId, index: true },
    status: { type: String, enum: PREAUTH_STATUSES, default: 'draft' },
    urgency: { type: String, enum: PREAUTH_URGENCY, default: 'routine' },
    requestedServices: [
      {
        category: { type: String, enum: BENEFIT_CATEGORIES },
        description: { type: String },
        sessions: { type: Number },
        estimatedCost: { type: Number },
        approvedSessions: { type: Number },
        approvedAmount: { type: Number },
      },
    ],
    diagnosis: [
      {
        code: { type: String },
        system: { type: String, default: 'ICD-10' },
        description: { type: String },
      },
    ],
    clinicalJustification: { type: String },
    attachments: [{ name: String, url: String, type: String }],
    submittedAt: { type: Date },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewedBy: { type: String },
    approvedAt: { type: Date },
    deniedAt: { type: Date },
    denialReason: { type: String },
    validFrom: { type: Date },
    validTo: { type: Date },
    appealDeadline: { type: Date },
    history: [
      {
        action: { type: String },
        date: { type: Date, default: Date.now },
        actor: { type: String },
        notes: { type: String },
      },
    ],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

preAuthSchema.index({ status: 1, urgency: 1 });

const DDDPreAuthorization =
  mongoose.models.DDDPreAuthorization || mongoose.model('DDDPreAuthorization', preAuthSchema);

/* ── Coverage Rule ─────────────────────────────────────────────────────── */
const coverageRuleSchema = new Schema(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'DDDInsuranceProvider',
      required: true,
      index: true,
    },
    planClass: { type: String },
    category: { type: String, enum: BENEFIT_CATEGORIES, required: true },
    coverageType: { type: String, enum: COVERAGE_TYPES, required: true },
    coPayPercent: { type: Number },
    coPayFixed: { type: Number },
    maxSessions: { type: Number },
    maxAmountPerSession: { type: Number },
    maxAmountAnnual: { type: Number },
    preAuthRequired: { type: Boolean, default: false },
    waitingPeriodDays: { type: Number, default: 0 },
    exclusions: [{ type: String }],
    conditions: [{ type: String }],
    isActive: { type: Boolean, default: true },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

coverageRuleSchema.index({ category: 1, coverageType: 1 });

const DDDCoverageRule =
  mongoose.models.DDDCoverageRule || mongoose.model('DDDCoverageRule', coverageRuleSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class InsuranceManager extends BaseDomainModule {
  constructor() {
    super('InsuranceManager', {
      description: 'Insurance verification, coverage rules, pre-authorization & provider network',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedProviders();
    this.log('Insurance Manager initialised ✓');
    return true;
  }

  async _seedProviders() {
    for (const p of BUILTIN_PROVIDERS) {
      const exists = await DDDInsuranceProvider.findOne({ code: p.code }).lean();
      if (!exists) await DDDInsuranceProvider.create(p);
    }
  }

  async _nextAuthNumber() {
    const count = await DDDPreAuthorization.countDocuments();
    return `PA-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }

  /* ── Provider CRUD ── */
  async listProviders(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDInsuranceProvider.find(q).sort({ name: 1 }).lean();
  }
  async getProvider(id) {
    return DDDInsuranceProvider.findById(id).lean();
  }
  async createProvider(data) {
    return DDDInsuranceProvider.create(data);
  }
  async updateProvider(id, data) {
    return DDDInsuranceProvider.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Policy CRUD ── */
  async listPolicies(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.providerId) q.providerId = filters.providerId;
    if (filters.status) q.status = filters.status;
    return DDDInsurancePolicy.find(q)
      .populate('providerId', 'name nameAr code')
      .sort({ effectiveDate: -1 })
      .lean();
  }
  async getPolicy(id) {
    return DDDInsurancePolicy.findById(id).populate('providerId').lean();
  }
  async createPolicy(data) {
    return DDDInsurancePolicy.create(data);
  }
  async updatePolicy(id, data) {
    return DDDInsurancePolicy.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async verifyPolicy(id, userId, notes) {
    return DDDInsurancePolicy.findByIdAndUpdate(
      id,
      {
        verifiedAt: new Date(),
        verifiedBy: userId,
        verificationNotes: notes,
      },
      { new: true }
    );
  }

  /** Check coverage eligibility for a service */
  async checkCoverage(policyId, serviceCategory) {
    const policy = await DDDInsurancePolicy.findById(policyId).lean();
    if (!policy) return { eligible: false, reason: 'Policy not found' };
    if (policy.status !== 'active')
      return { eligible: false, reason: `Policy status: ${policy.status}` };
    if (new Date() > new Date(policy.expiryDate))
      return { eligible: false, reason: 'Policy expired' };

    const benefit = (policy.benefits || []).find(b => b.category === serviceCategory);
    if (!benefit)
      return {
        eligible: true,
        coverageType: 'full',
        coPayPercent: 0,
        notes: 'No specific limits found',
      };

    if (benefit.maxSessions && benefit.usedSessions >= benefit.maxSessions) {
      return { eligible: false, reason: 'Session limit exhausted' };
    }
    if (benefit.maxAmount && benefit.usedAmount >= benefit.maxAmount) {
      return { eligible: false, reason: 'Benefit amount exhausted' };
    }

    return {
      eligible: true,
      coverageType: benefit.coverageType,
      coPayPercent: benefit.coPayPercent || 0,
      coPayFixed: benefit.coPayFixed || 0,
      remainingSessions: benefit.maxSessions ? benefit.maxSessions - benefit.usedSessions : null,
      remainingAmount: benefit.maxAmount ? benefit.maxAmount - benefit.usedAmount : null,
      preAuthRequired: benefit.preAuthRequired || false,
    };
  }

  /** Calculate patient share for a service */
  calculatePatientShare(totalAmount, coverageResult) {
    if (!coverageResult.eligible) return { patientShare: totalAmount, insuranceShare: 0 };
    if (coverageResult.coverageType === 'full')
      return { patientShare: 0, insuranceShare: totalAmount };
    if (coverageResult.coverageType === 'excluded')
      return { patientShare: totalAmount, insuranceShare: 0 };

    let patientShare = 0;
    if (coverageResult.coPayFixed) {
      patientShare = coverageResult.coPayFixed;
    } else if (coverageResult.coPayPercent) {
      patientShare = totalAmount * (coverageResult.coPayPercent / 100);
    }
    patientShare = Math.min(patientShare, totalAmount);
    return {
      patientShare: Math.round(patientShare * 100) / 100,
      insuranceShare: Math.round((totalAmount - patientShare) * 100) / 100,
    };
  }

  /* ── Pre-Authorization CRUD ── */
  async listPreAuths(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.policyId) q.policyId = filters.policyId;
    if (filters.status) q.status = filters.status;
    if (filters.urgency) q.urgency = filters.urgency;
    return DDDPreAuthorization.find(q).sort({ createdAt: -1 }).lean();
  }
  async getPreAuth(id) {
    return DDDPreAuthorization.findById(id).lean();
  }

  async createPreAuth(data) {
    data.authNumber = data.authNumber || (await this._nextAuthNumber());
    data.history = [{ action: 'created', date: new Date(), actor: 'system' }];
    return DDDPreAuthorization.create(data);
  }

  async submitPreAuth(id, userId) {
    return DDDPreAuthorization.findByIdAndUpdate(
      id,
      {
        status: 'submitted',
        submittedAt: new Date(),
        submittedBy: userId,
        $push: { history: { action: 'submitted', date: new Date(), actor: String(userId) } },
      },
      { new: true }
    );
  }

  async approvePreAuth(id, reviewer, approvals) {
    const update = {
      status: 'approved',
      approvedAt: new Date(),
      reviewedAt: new Date(),
      reviewedBy: reviewer,
      $push: { history: { action: 'approved', date: new Date(), actor: reviewer } },
    };
    if (approvals) update['requestedServices'] = approvals;
    return DDDPreAuthorization.findByIdAndUpdate(id, update, { new: true });
  }

  async denyPreAuth(id, reviewer, reason) {
    return DDDPreAuthorization.findByIdAndUpdate(
      id,
      {
        status: 'denied',
        deniedAt: new Date(),
        denialReason: reason,
        reviewedAt: new Date(),
        reviewedBy: reviewer,
        $push: { history: { action: 'denied', date: new Date(), actor: reviewer, notes: reason } },
      },
      { new: true }
    );
  }

  /* ── Coverage Rules CRUD ── */
  async listCoverageRules(filters = {}) {
    const q = {};
    if (filters.providerId) q.providerId = filters.providerId;
    if (filters.category) q.category = filters.category;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDCoverageRule.find(q).sort({ category: 1 }).lean();
  }
  async getCoverageRule(id) {
    return DDDCoverageRule.findById(id).lean();
  }
  async createCoverageRule(data) {
    return DDDCoverageRule.create(data);
  }
  async updateCoverageRule(id, data) {
    return DDDCoverageRule.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Expiring Policies ── */
  async getExpiringPolicies(withinDays = 30) {
    const future = new Date();
    future.setDate(future.getDate() + withinDays);
    return DDDInsurancePolicy.find({
      status: 'active',
      expiryDate: { $lte: future, $gte: new Date() },
    })
      .populate('providerId', 'name nameAr code')
      .sort({ expiryDate: 1 })
      .lean();
  }

  /** Health check */
  async healthCheck() {
    const [providers, policies, preAuths, rules] = await Promise.all([
      DDDInsuranceProvider.countDocuments(),
      DDDInsurancePolicy.countDocuments(),
      DDDPreAuthorization.countDocuments(),
      DDDCoverageRule.countDocuments(),
    ]);
    return { status: 'healthy', providers, policies, preAuths, coverageRules: rules };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createInsuranceManagerRouter() {
  const router = Router();
  const mgr = new InsuranceManager();

  /* ── Providers ── */
  router.get('/insurance/providers', async (req, res) => {
    try {
      res.json({ success: true, data: await mgr.listProviders(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/insurance/providers/:id', async (req, res) => {
    try {
      const d = await mgr.getProvider(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/insurance/providers', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await mgr.createProvider(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/insurance/providers/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await mgr.updateProvider(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Policies ── */
  router.get('/insurance/policies', async (req, res) => {
    try {
      res.json({ success: true, data: await mgr.listPolicies(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/insurance/policies/expiring', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await mgr.getExpiringPolicies(Number(req.query.days) || 30),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/insurance/policies/:id', async (req, res) => {
    try {
      const d = await mgr.getPolicy(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/insurance/policies', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await mgr.createPolicy(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/insurance/policies/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await mgr.updatePolicy(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/insurance/policies/:id/verify', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await mgr.verifyPolicy(req.params.id, req.body.userId, req.body.notes),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/insurance/policies/:id/check-coverage', async (req, res) => {
    try {
      res.json({ success: true, data: await mgr.checkCoverage(req.params.id, req.body.category) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Pre-Authorizations ── */
  router.get('/insurance/pre-authorizations', async (req, res) => {
    try {
      res.json({ success: true, data: await mgr.listPreAuths(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/insurance/pre-authorizations/:id', async (req, res) => {
    try {
      const d = await mgr.getPreAuth(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/insurance/pre-authorizations', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await mgr.createPreAuth(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/insurance/pre-authorizations/:id/submit', async (req, res) => {
    try {
      res.json({ success: true, data: await mgr.submitPreAuth(req.params.id, req.body.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/insurance/pre-authorizations/:id/approve', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await mgr.approvePreAuth(req.params.id, req.body.reviewer, req.body.approvals),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/insurance/pre-authorizations/:id/deny', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await mgr.denyPreAuth(req.params.id, req.body.reviewer, req.body.reason),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Coverage Rules ── */
  router.get('/insurance/coverage-rules', async (req, res) => {
    try {
      res.json({ success: true, data: await mgr.listCoverageRules(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/insurance/coverage-rules/:id', async (req, res) => {
    try {
      const d = await mgr.getCoverageRule(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/insurance/coverage-rules', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await mgr.createCoverageRule(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/insurance/coverage-rules/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await mgr.updateCoverageRule(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Health ── */
  router.get('/insurance/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await mgr.healthCheck() });
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
  InsuranceManager,
  DDDInsuranceProvider,
  DDDInsurancePolicy,
  DDDPreAuthorization,
  DDDCoverageRule,
  PROVIDER_TYPES,
  POLICY_STATUSES,
  COVERAGE_TYPES,
  PREAUTH_STATUSES,
  NETWORK_TIERS,
  BENEFIT_CATEGORIES,
  PREAUTH_URGENCY,
  BUILTIN_PROVIDERS,
  createInsuranceManagerRouter,
};
