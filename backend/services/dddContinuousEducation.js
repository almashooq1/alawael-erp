/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Continuous Education — Phase 17 · Learning Management & Training
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Continuing Education Unit (CEU) tracking, professional development planning,
 * accreditation management, license renewal tracking, and CE compliance
 * for rehabilitation professionals.
 *
 * Aggregates
 *   DDDCEURecord          — individual CEU credit record
 *   DDDProfDevPlan        — professional development plan
 *   DDDAccreditedProvider — accredited CE provider
 *   DDDCEURequirement     — role/license-based CEU requirements
 *
 * Canonical links
 *   userId       → User / Staff
 *   courseId     → DDDCourse (dddLearningManagement)
 *   credentialId → DDDCredential (dddCompetencyTracker)
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

const CEU_CATEGORIES = [
  'clinical_practice',
  'professional_ethics',
  'patient_safety',
  'evidence_based_practice',
  'cultural_competence',
  'supervision',
  'leadership',
  'research',
  'technology',
  'specialty_area',
  'interprofessional',
  'quality_improvement',
  'regulatory_compliance',
  'mental_health',
  'disability_studies',
];

const CEU_ACTIVITY_TYPES = [
  'course_completion',
  'conference',
  'workshop',
  'seminar',
  'webinar',
  'self_study',
  'journal_article',
  'publication',
  'presentation',
  'mentoring',
  'clinical_supervision',
  'research_project',
  'committee_service',
  'volunteer_work',
];

const CEU_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'expired',
  'under_review',
  'needs_documentation',
  'archived',
];

const DEV_PLAN_STATUSES = [
  'draft',
  'active',
  'in_review',
  'completed',
  'on_hold',
  'cancelled',
  'expired',
];

const DEV_GOAL_STATUSES = ['not_started', 'in_progress', 'completed', 'deferred', 'cancelled'];

const ACCREDITATION_TYPES = [
  'national',
  'international',
  'regional',
  'specialty',
  'institutional',
  'programmatic',
  'professional_body',
  'governmental',
];

const RENEWAL_CYCLES = ['annual', 'biennial', 'triennial', 'quadrennial', 'custom'];

/* ── Built-in CEU requirements ──────────────────────────────────────────── */
const BUILTIN_CEU_REQUIREMENTS = [
  {
    code: 'REQ-PT',
    role: 'Physical Therapist',
    totalCredits: 40,
    cycle: 'biennial',
    categories: ['clinical_practice', 'professional_ethics', 'patient_safety'],
    minEthics: 4,
  },
  {
    code: 'REQ-OT',
    role: 'Occupational Therapist',
    totalCredits: 36,
    cycle: 'biennial',
    categories: ['clinical_practice', 'professional_ethics', 'cultural_competence'],
    minEthics: 4,
  },
  {
    code: 'REQ-SLP',
    role: 'Speech-Language Pathologist',
    totalCredits: 30,
    cycle: 'biennial',
    categories: ['clinical_practice', 'professional_ethics', 'evidence_based_practice'],
    minEthics: 3,
  },
  {
    code: 'REQ-PSY',
    role: 'Clinical Psychologist',
    totalCredits: 40,
    cycle: 'biennial',
    categories: ['clinical_practice', 'professional_ethics', 'supervision'],
    minEthics: 6,
  },
  {
    code: 'REQ-NURSE',
    role: 'Rehabilitation Nurse',
    totalCredits: 30,
    cycle: 'annual',
    categories: ['clinical_practice', 'patient_safety', 'quality_improvement'],
    minEthics: 2,
  },
  {
    code: 'REQ-AT',
    role: 'Assistive Technology Specialist',
    totalCredits: 24,
    cycle: 'biennial',
    categories: ['technology', 'clinical_practice', 'disability_studies'],
    minEthics: 2,
  },
  {
    code: 'REQ-SW',
    role: 'Social Worker',
    totalCredits: 36,
    cycle: 'biennial',
    categories: [
      'clinical_practice',
      'professional_ethics',
      'cultural_competence',
      'mental_health',
    ],
    minEthics: 6,
  },
  {
    code: 'REQ-LEAD',
    role: 'Clinical Leader',
    totalCredits: 20,
    cycle: 'annual',
    categories: ['leadership', 'quality_improvement', 'regulatory_compliance'],
    minEthics: 2,
  },
  {
    code: 'REQ-SUPER',
    role: 'Clinical Supervisor',
    totalCredits: 30,
    cycle: 'biennial',
    categories: ['supervision', 'professional_ethics', 'evidence_based_practice'],
    minEthics: 4,
  },
  {
    code: 'REQ-RES',
    role: 'Clinical Researcher',
    totalCredits: 20,
    cycle: 'annual',
    categories: ['research', 'professional_ethics', 'evidence_based_practice'],
    minEthics: 3,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── CEU Record ────────────────────────────────────────────────────────── */
const ceuRecordSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    category: { type: String, enum: CEU_CATEGORIES, required: true },
    activityType: { type: String, enum: CEU_ACTIVITY_TYPES, required: true },
    credits: { type: Number, required: true, min: 0 },
    status: { type: String, enum: CEU_STATUSES, default: 'pending' },
    provider: { type: String },
    providerId: { type: Schema.Types.ObjectId, ref: 'DDDAccreditedProvider' },
    courseId: { type: Schema.Types.ObjectId, ref: 'DDDCourse' },
    activityDate: { type: Date, required: true },
    completionDate: { type: Date },
    expiryDate: { type: Date },
    certificateUrl: { type: String },
    certificateNumber: { type: String },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String },
    attachments: [{ name: String, url: String, type: String }],
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ceuRecordSchema.index({ category: 1, status: 1, activityDate: -1 });
ceuRecordSchema.index({ userId: 1, status: 1 });

const DDDCEURecord =
  mongoose.models.DDDCEURecord || mongoose.model('DDDCEURecord', ceuRecordSchema);

/* ── Professional Development Plan ─────────────────────────────────────── */
const devGoalSchema = new Schema(
  {
    title: { type: String, required: true },
    titleAr: { type: String },
    description: { type: String },
    category: { type: String, enum: CEU_CATEGORIES },
    targetDate: { type: Date },
    status: { type: String, enum: DEV_GOAL_STATUSES, default: 'not_started' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    activities: [{ type: String }],
    resources: [{ type: String }],
    completedAt: { type: Date },
    notes: { type: String },
  },
  { _id: true }
);

const profDevPlanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    status: { type: String, enum: DEV_PLAN_STATUSES, default: 'draft' },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    goals: [devGoalSchema],
    overallProgress: { type: Number, default: 0, min: 0, max: 100 },
    supervisorId: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: { type: String },
    approvedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

profDevPlanSchema.index({ status: 1, periodEnd: 1 });

const DDDProfDevPlan =
  mongoose.models.DDDProfDevPlan || mongoose.model('DDDProfDevPlan', profDevPlanSchema);

/* ── Accredited Provider ───────────────────────────────────────────────── */
const accreditedProviderSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: ACCREDITATION_TYPES, required: true },
    accreditingBody: { type: String },
    accreditationNumber: { type: String },
    isActive: { type: Boolean, default: true },
    country: { type: String, default: 'SA' },
    contact: { phone: String, email: String, website: String },
    categories: [{ type: String, enum: CEU_CATEGORIES }],
    accreditedFrom: { type: Date },
    accreditedTo: { type: Date },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDAccreditedProvider =
  mongoose.models.DDDAccreditedProvider ||
  mongoose.model('DDDAccreditedProvider', accreditedProviderSchema);

/* ── CEU Requirement ───────────────────────────────────────────────────── */
const ceuRequirementSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    role: { type: String, required: true },
    roleAr: { type: String },
    totalCredits: { type: Number, required: true },
    cycle: { type: String, enum: RENEWAL_CYCLES, default: 'biennial' },
    cycleDays: { type: Number },
    categories: [{ type: String, enum: CEU_CATEGORIES }],
    minEthics: { type: Number, default: 0 },
    minClinical: { type: Number, default: 0 },
    minSpecialty: { type: Number, default: 0 },
    maxSelfStudy: { type: Number },
    maxOnline: { type: Number },
    isActive: { type: Boolean, default: true },
    regulatoryBody: { type: String },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDCEURequirement =
  mongoose.models.DDDCEURequirement || mongoose.model('DDDCEURequirement', ceuRequirementSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class ContinuousEducation extends BaseDomainModule {
  constructor() {
    super('ContinuousEducation', {
      description: 'CEU tracking, professional development plans, accreditation & CE compliance',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedRequirements();
    this.log('Continuous Education initialised ✓');
    return true;
  }

  async _seedRequirements() {
    for (const r of BUILTIN_CEU_REQUIREMENTS) {
      const exists = await DDDCEURequirement.findOne({ code: r.code }).lean();
      if (!exists) await DDDCEURequirement.create(r);
    }
  }

  /* ── CEU Record CRUD ── */
  async listCEURecords(filters = {}) {
    const q = {};
    if (filters.userId) q.userId = filters.userId;
    if (filters.category) q.category = filters.category;
    if (filters.status) q.status = filters.status;
    if (filters.activityType) q.activityType = filters.activityType;
    if (filters.from || filters.to) {
      q.activityDate = {};
      if (filters.from) q.activityDate.$gte = new Date(filters.from);
      if (filters.to) q.activityDate.$lte = new Date(filters.to);
    }
    return DDDCEURecord.find(q).sort({ activityDate: -1 }).lean();
  }
  async getCEURecord(id) {
    return DDDCEURecord.findById(id).lean();
  }
  async createCEURecord(data) {
    return DDDCEURecord.create(data);
  }
  async updateCEURecord(id, data) {
    return DDDCEURecord.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async approveCEURecord(id, userId) {
    return DDDCEURecord.findByIdAndUpdate(
      id,
      { status: 'approved', verifiedAt: new Date(), verifiedBy: userId },
      { new: true }
    );
  }
  async rejectCEURecord(id, reason) {
    return DDDCEURecord.findByIdAndUpdate(
      id,
      { status: 'rejected', rejectionReason: reason },
      { new: true }
    );
  }

  /* ── CEU Compliance ── */
  async getCEUCompliance(userId, requirementCode) {
    const req = await DDDCEURequirement.findOne({ code: requirementCode }).lean();
    if (!req) throw new Error('CEU requirement not found');

    const records = await DDDCEURecord.find({ userId, status: 'approved' }).lean();
    const totalEarned = records.reduce((s, r) => s + (r.credits || 0), 0);
    const ethicsEarned = records
      .filter(r => r.category === 'professional_ethics')
      .reduce((s, r) => s + (r.credits || 0), 0);
    const byCategory = {};
    for (const r of records) {
      byCategory[r.category] = (byCategory[r.category] || 0) + r.credits;
    }

    return {
      requirement: req,
      totalRequired: req.totalCredits,
      totalEarned,
      remaining: Math.max(0, req.totalCredits - totalEarned),
      ethicsRequired: req.minEthics,
      ethicsEarned,
      ethicsRemaining: Math.max(0, req.minEthics - ethicsEarned),
      compliant: totalEarned >= req.totalCredits && ethicsEarned >= req.minEthics,
      byCategory,
      records,
    };
  }

  /* ── Professional Dev Plan CRUD ── */
  async listDevPlans(filters = {}) {
    const q = {};
    if (filters.userId) q.userId = filters.userId;
    if (filters.status) q.status = filters.status;
    return DDDProfDevPlan.find(q).sort({ createdAt: -1 }).lean();
  }
  async getDevPlan(id) {
    return DDDProfDevPlan.findById(id).lean();
  }

  async createDevPlan(data) {
    data.overallProgress = 0;
    return DDDProfDevPlan.create(data);
  }

  async updateDevPlan(id, data) {
    return DDDProfDevPlan.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async updateGoalProgress(planId, goalId, progressData) {
    const plan = await DDDProfDevPlan.findById(planId);
    if (!plan) throw new Error('Plan not found');
    const goal = plan.goals.id(goalId);
    if (!goal) throw new Error('Goal not found');
    Object.assign(goal, progressData);
    if (goal.progress >= 100) {
      goal.status = 'completed';
      goal.completedAt = new Date();
    } else if (goal.progress > 0) {
      goal.status = 'in_progress';
    }
    // Recalculate overall
    const total = plan.goals.length || 1;
    plan.overallProgress = Math.round(plan.goals.reduce((s, g) => s + g.progress, 0) / total);
    if (plan.goals.every(g => g.status === 'completed' || g.status === 'cancelled')) {
      plan.status = 'completed';
    }
    await plan.save();
    return plan;
  }

  async approveDevPlan(id, userId, notes) {
    return DDDProfDevPlan.findByIdAndUpdate(
      id,
      {
        status: 'active',
        approvedAt: new Date(),
        approvedBy: userId,
        reviewNotes: notes,
      },
      { new: true }
    );
  }

  /* ── Accredited Provider CRUD ── */
  async listProviders(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDAccreditedProvider.find(q).sort({ name: 1 }).lean();
  }
  async getProvider(id) {
    return DDDAccreditedProvider.findById(id).lean();
  }
  async createProvider(data) {
    return DDDAccreditedProvider.create(data);
  }
  async updateProvider(id, data) {
    return DDDAccreditedProvider.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── CEU Requirement CRUD ── */
  async listRequirements(filters = {}) {
    const q = {};
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDCEURequirement.find(q).sort({ role: 1 }).lean();
  }
  async getRequirement(id) {
    return DDDCEURequirement.findById(id).lean();
  }
  async createRequirement(data) {
    return DDDCEURequirement.create(data);
  }
  async updateRequirement(id, data) {
    return DDDCEURequirement.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Analytics ── */
  async getCEUDashboard(userId) {
    const records = await DDDCEURecord.find({ userId, status: 'approved' }).lean();
    const plans = await DDDProfDevPlan.find({
      userId,
      status: { $in: ['active', 'completed'] },
    }).lean();
    const totalCredits = records.reduce((s, r) => s + (r.credits || 0), 0);
    const byCategory = {};
    for (const r of records) {
      byCategory[r.category] = (byCategory[r.category] || 0) + r.credits;
    }
    const byYear = {};
    for (const r of records) {
      const y = new Date(r.activityDate).getFullYear();
      byYear[y] = (byYear[y] || 0) + r.credits;
    }
    return {
      userId,
      totalCredits,
      byCategory,
      byYear,
      totalRecords: records.length,
      activePlans: plans.filter(p => p.status === 'active').length,
    };
  }

  /** Health check */
  async healthCheck() {
    const [records, plans, providers, requirements] = await Promise.all([
      DDDCEURecord.countDocuments(),
      DDDProfDevPlan.countDocuments(),
      DDDAccreditedProvider.countDocuments(),
      DDDCEURequirement.countDocuments(),
    ]);
    return {
      status: 'healthy',
      ceuRecords: records,
      devPlans: plans,
      accreditedProviders: providers,
      requirements,
    };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createContinuousEducationRouter() {
  const router = Router();
  const ce = new ContinuousEducation();

  /* ── CEU Records ── */
  router.get('/continuing-education/records', async (req, res) => {
    try {
      res.json({ success: true, data: await ce.listCEURecords(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/continuing-education/records/:id', async (req, res) => {
    try {
      const d = await ce.getCEURecord(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/continuing-education/records', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await ce.createCEURecord(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/continuing-education/records/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await ce.updateCEURecord(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/continuing-education/records/:id/approve', async (req, res) => {
    try {
      res.json({ success: true, data: await ce.approveCEURecord(req.params.id, req.body.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/continuing-education/records/:id/reject', async (req, res) => {
    try {
      res.json({ success: true, data: await ce.rejectCEURecord(req.params.id, req.body.reason) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Compliance ── */
  router.get('/continuing-education/compliance/:userId', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await ce.getCEUCompliance(req.params.userId, req.query.requirementCode),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Dev Plans ── */
  router.get('/continuing-education/plans', async (req, res) => {
    try {
      res.json({ success: true, data: await ce.listDevPlans(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/continuing-education/plans/:id', async (req, res) => {
    try {
      const d = await ce.getDevPlan(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/continuing-education/plans', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await ce.createDevPlan(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/continuing-education/plans/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await ce.updateDevPlan(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/continuing-education/plans/:id/approve', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await ce.approveDevPlan(req.params.id, req.body.userId, req.body.notes),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/continuing-education/plans/:id/goals/:goalId', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await ce.updateGoalProgress(req.params.id, req.params.goalId, req.body),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Accredited Providers ── */
  router.get('/continuing-education/providers', async (req, res) => {
    try {
      res.json({ success: true, data: await ce.listProviders(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/continuing-education/providers/:id', async (req, res) => {
    try {
      const d = await ce.getProvider(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/continuing-education/providers', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await ce.createProvider(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/continuing-education/providers/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await ce.updateProvider(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Requirements ── */
  router.get('/continuing-education/requirements', async (req, res) => {
    try {
      res.json({ success: true, data: await ce.listRequirements(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/continuing-education/requirements/:id', async (req, res) => {
    try {
      const d = await ce.getRequirement(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/continuing-education/requirements', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await ce.createRequirement(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/continuing-education/requirements/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await ce.updateRequirement(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Dashboard ── */
  router.get('/continuing-education/dashboard/:userId', async (req, res) => {
    try {
      res.json({ success: true, data: await ce.getCEUDashboard(req.params.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Health ── */
  router.get('/continuing-education/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await ce.healthCheck() });
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
  ContinuousEducation,
  DDDCEURecord,
  DDDProfDevPlan,
  DDDAccreditedProvider,
  DDDCEURequirement,
  CEU_CATEGORIES,
  CEU_ACTIVITY_TYPES,
  CEU_STATUSES,
  DEV_PLAN_STATUSES,
  DEV_GOAL_STATUSES,
  ACCREDITATION_TYPES,
  RENEWAL_CYCLES,
  BUILTIN_CEU_REQUIREMENTS,
  createContinuousEducationRouter,
};
