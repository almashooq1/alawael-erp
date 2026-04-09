/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Policy Governance — Phase 26 · Legal & Contract Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Organisational policies, governance framework, approval workflows,
 * policy versioning and compliance acknowledgement.
 *
 * Aggregates
 *   DDDOrganizationalPolicy — policy document
 *   DDDPolicyVersion        — version history
 *   DDDPolicyAcknowledgment — staff acknowledgment
 *   DDDGovernanceCommittee  — governance committee / board
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

const POLICY_TYPES = [
  'operational',
  'clinical',
  'hr',
  'financial',
  'safety',
  'privacy',
  'it_security',
  'environmental',
  'quality',
  'compliance',
  'ethics',
  'procurement',
];

const POLICY_STATUSES = [
  'draft',
  'under_review',
  'pending_approval',
  'approved',
  'published',
  'active',
  'under_revision',
  'superseded',
  'retired',
  'archived',
];

const GOVERNANCE_LEVELS = [
  'board',
  'executive',
  'department',
  'unit',
  'team',
  'committee',
  'council',
  'working_group',
  'advisory',
  'regulatory',
];

const ACKNOWLEDGMENT_STATUSES = [
  'pending',
  'acknowledged',
  'declined',
  'expired',
  'reminded',
  'overdue',
  'exempted',
  'waived',
  'in_progress',
  'completed',
];

const COMMITTEE_TYPES = [
  'board_of_directors',
  'executive_committee',
  'audit_committee',
  'compliance_committee',
  'ethics_committee',
  'quality_committee',
  'risk_committee',
  'safety_committee',
  'clinical_governance',
  'it_governance',
  'research_committee',
  'finance_committee',
];

const REVIEW_FREQUENCIES = [
  'monthly',
  'quarterly',
  'semi_annual',
  'annual',
  'biennial',
  'as_needed',
  'continuous',
  'triggered',
];

const BUILTIN_POLICIES = [
  {
    code: 'POL-PVY',
    name: 'Privacy & Data Protection',
    nameAr: 'الخصوصية وحماية البيانات',
    type: 'privacy',
    level: 'board',
  },
  {
    code: 'POL-SAF',
    name: 'Patient Safety',
    nameAr: 'سلامة المرضى',
    type: 'safety',
    level: 'executive',
  },
  {
    code: 'POL-ETH',
    name: 'Code of Ethics',
    nameAr: 'مدونة الأخلاقيات',
    type: 'ethics',
    level: 'board',
  },
  {
    code: 'POL-QAL',
    name: 'Quality Assurance',
    nameAr: 'ضمان الجودة',
    type: 'quality',
    level: 'executive',
  },
  {
    code: 'POL-HRS',
    name: 'HR Policy Manual',
    nameAr: 'دليل سياسات الموارد البشرية',
    type: 'hr',
    level: 'executive',
  },
  {
    code: 'POL-ITS',
    name: 'IT Security Policy',
    nameAr: 'سياسة أمن المعلومات',
    type: 'it_security',
    level: 'executive',
  },
  {
    code: 'POL-FIN',
    name: 'Financial Controls',
    nameAr: 'الضوابط المالية',
    type: 'financial',
    level: 'board',
  },
  {
    code: 'POL-CMP',
    name: 'Compliance Framework',
    nameAr: 'إطار الامتثال',
    type: 'compliance',
    level: 'board',
  },
  {
    code: 'POL-CLN',
    name: 'Clinical Governance',
    nameAr: 'الحوكمة السريرية',
    type: 'clinical',
    level: 'executive',
  },
  {
    code: 'POL-ENV',
    name: 'Environmental Policy',
    nameAr: 'السياسة البيئية',
    type: 'environmental',
    level: 'department',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

const organizationalPolicySchema = new Schema(
  {
    policyCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: POLICY_TYPES, required: true },
    status: { type: String, enum: POLICY_STATUSES, default: 'draft' },
    level: { type: String, enum: GOVERNANCE_LEVELS },
    version: { type: Number, default: 1 },
    content: { type: String },
    summary: { type: String },
    effectiveDate: { type: Date },
    expiryDate: { type: Date },
    nextReviewDate: { type: Date },
    reviewFrequency: { type: String, enum: REVIEW_FREQUENCIES },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    tags: [{ type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

organizationalPolicySchema.index({ type: 1, status: 1 });

const DDDOrganizationalPolicy =
  mongoose.models.DDDOrganizationalPolicy ||
  mongoose.model('DDDOrganizationalPolicy', organizationalPolicySchema);

const policyVersionSchema = new Schema(
  {
    policyId: { type: Schema.Types.ObjectId, ref: 'DDDOrganizationalPolicy', required: true },
    versionNumber: { type: Number, required: true },
    content: { type: String },
    changes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    effectiveDate: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

policyVersionSchema.index({ policyId: 1, versionNumber: -1 });

const DDDPolicyVersion =
  mongoose.models.DDDPolicyVersion || mongoose.model('DDDPolicyVersion', policyVersionSchema);

const policyAcknowledgmentSchema = new Schema(
  {
    policyId: { type: Schema.Types.ObjectId, ref: 'DDDOrganizationalPolicy', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ACKNOWLEDGMENT_STATUSES, default: 'pending' },
    acknowledgedAt: { type: Date },
    dueDate: { type: Date },
    reminderCount: { type: Number, default: 0 },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

policyAcknowledgmentSchema.index({ policyId: 1, userId: 1 });
policyAcknowledgmentSchema.index({ status: 1 });

const DDDPolicyAcknowledgment =
  mongoose.models.DDDPolicyAcknowledgment ||
  mongoose.model('DDDPolicyAcknowledgment', policyAcknowledgmentSchema);

const governanceCommitteeSchema = new Schema(
  {
    committeeCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: COMMITTEE_TYPES, required: true },
    chairId: { type: Schema.Types.ObjectId, ref: 'User' },
    members: [{ userId: Schema.Types.ObjectId, role: String, joinedAt: Date }],
    meetingFrequency: { type: String },
    isActive: { type: Boolean, default: true },
    mandate: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDGovernanceCommittee =
  mongoose.models.DDDGovernanceCommittee ||
  mongoose.model('DDDGovernanceCommittee', governanceCommitteeSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class PolicyGovernance extends BaseDomainModule {
  constructor() {
    super('PolicyGovernance', {
      description: 'Organisational policy & governance management',
      version: '1.0.0',
    });
  }

  async initialize() {
    for (const p of BUILTIN_POLICIES) {
      const exists = await DDDOrganizationalPolicy.findOne({ policyCode: p.code }).lean();
      if (!exists)
        await DDDOrganizationalPolicy.create({
          policyCode: p.code,
          name: p.name,
          nameAr: p.nameAr,
          type: p.type,
          level: p.level,
        });
    }
    this.log('Policy Governance initialised ✓');
    return true;
  }

  /* Policies */
  async listPolicies(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDOrganizationalPolicy.find(q).sort({ name: 1 }).lean();
  }
  async getPolicy(id) {
    return DDDOrganizationalPolicy.findById(id).lean();
  }
  async createPolicy(data) {
    if (!data.policyCode) data.policyCode = `POL-${Date.now()}`;
    return DDDOrganizationalPolicy.create(data);
  }
  async updatePolicy(id, data) {
    return DDDOrganizationalPolicy.findByIdAndUpdate(id, data, { new: true });
  }

  /* Versions */
  async listVersions(policyId) {
    return DDDPolicyVersion.find({ policyId }).sort({ versionNumber: -1 }).lean();
  }
  async createVersion(data) {
    return DDDPolicyVersion.create(data);
  }

  /* Acknowledgments */
  async listAcknowledgments(policyId) {
    return DDDPolicyAcknowledgment.find({ policyId }).lean();
  }
  async requestAcknowledgment(data) {
    return DDDPolicyAcknowledgment.create(data);
  }
  async acknowledge(id) {
    return DDDPolicyAcknowledgment.findByIdAndUpdate(
      id,
      { status: 'acknowledged', acknowledgedAt: new Date() },
      { new: true }
    );
  }

  /* Committees */
  async listCommittees() {
    return DDDGovernanceCommittee.find({ isActive: true }).lean();
  }
  async createCommittee(data) {
    if (!data.committeeCode) data.committeeCode = `CMT-${Date.now()}`;
    return DDDGovernanceCommittee.create(data);
  }

  /* Analytics */
  async getPolicyAnalytics() {
    const [policies, versions, acknowledgments, committees] = await Promise.all([
      DDDOrganizationalPolicy.countDocuments(),
      DDDPolicyVersion.countDocuments(),
      DDDPolicyAcknowledgment.countDocuments(),
      DDDGovernanceCommittee.countDocuments(),
    ]);
    const active = await DDDOrganizationalPolicy.countDocuments({
      status: { $in: ['published', 'active'] },
    });
    const pendingAck = await DDDPolicyAcknowledgment.countDocuments({ status: 'pending' });
    return {
      policies,
      activePolicies: active,
      versions,
      acknowledgments,
      pendingAcknowledgments: pendingAck,
      committees,
    };
  }

  async healthCheck() {
    const [active, pendingAck] = await Promise.all([
      DDDOrganizationalPolicy.countDocuments({ status: { $in: ['published', 'active'] } }),
      DDDPolicyAcknowledgment.countDocuments({ status: 'pending' }),
    ]);
    return { status: 'healthy', activePolicies: active, pendingAcknowledgments: pendingAck };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createPolicyGovernanceRouter() {
  const router = Router();
  const svc = new PolicyGovernance();

  router.get('/policies', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPolicies(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/policies/:id', async (req, res) => {
    try {
      const d = await svc.getPolicy(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/policies', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPolicy(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/policies/:policyId/versions', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listVersions(req.params.policyId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/policies/:policyId/acknowledgments', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAcknowledgments(req.params.policyId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/policies/:policyId/acknowledgments', async (req, res) => {
    try {
      res
        .status(201)
        .json({
          success: true,
          data: await svc.requestAcknowledgment({ ...req.body, policyId: req.params.policyId }),
        });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/governance/committees', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listCommittees() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/governance/committees', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCommittee(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/policies/analytics/summary', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getPolicyAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/policies/health', async (_req, res) => {
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
  PolicyGovernance,
  DDDOrganizationalPolicy,
  DDDPolicyVersion,
  DDDPolicyAcknowledgment,
  DDDGovernanceCommittee,
  POLICY_TYPES,
  POLICY_STATUSES,
  GOVERNANCE_LEVELS,
  ACKNOWLEDGMENT_STATUSES,
  COMMITTEE_TYPES,
  REVIEW_FREQUENCIES,
  BUILTIN_POLICIES,
  createPolicyGovernanceRouter,
};
