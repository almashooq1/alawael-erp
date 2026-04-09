/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Competency Tracker — Phase 17 · Learning Management & Training
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Staff competency frameworks, skills assessment, credentialing, proficiency
 * tracking, competency gaps analysis, and professional development mapping
 * for rehabilitation teams.
 *
 * Aggregates
 *   DDDCompetencyFramework — organizational competency framework
 *   DDDCompetency          — individual competency / skill definition
 *   DDDStaffCompetency     — staff member's competency record & assessments
 *   DDDCredential          — professional credentials / licenses
 *
 * Canonical links
 *   userId       → User / Staff
 *   courseId     → DDDCourse (dddLearningManagement)
 *   departmentId → Organization structure
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

const COMPETENCY_DOMAINS = [
  'clinical_skills',
  'technical_skills',
  'communication',
  'leadership',
  'research',
  'ethics',
  'safety',
  'cultural_competence',
  'technology',
  'teamwork',
  'documentation',
  'patient_education',
  'critical_thinking',
  'evidence_based_practice',
  'quality_improvement',
];

const PROFICIENCY_LEVELS = ['novice', 'advanced_beginner', 'competent', 'proficient', 'expert'];

const ASSESSMENT_METHODS = [
  'self_assessment',
  'supervisor_assessment',
  'peer_review',
  'practical_exam',
  'written_exam',
  'portfolio',
  'observation',
  'simulation',
  'case_study',
  'patient_feedback',
  '360_review',
];

const CREDENTIAL_TYPES = [
  'license',
  'certification',
  'registration',
  'accreditation',
  'specialty',
  'fellowship',
  'diploma',
  'degree',
  'permit',
  'endorsement',
];

const CREDENTIAL_STATUSES = [
  'active',
  'pending',
  'expired',
  'suspended',
  'revoked',
  'renewal_due',
  'under_review',
  'inactive',
];

const COMPETENCY_STATUSES = [
  'not_assessed',
  'developing',
  'meets_expectations',
  'exceeds_expectations',
  'needs_improvement',
  'critical_gap',
];

/* ── Built-in competency frameworks ─────────────────────────────────────── */
const BUILTIN_FRAMEWORKS = [
  {
    code: 'CF-REHAB-CORE',
    name: 'Rehabilitation Core Competencies',
    nameAr: 'الكفاءات الأساسية للتأهيل',
    domains: ['clinical_skills', 'communication', 'ethics', 'safety', 'teamwork'],
  },
  {
    code: 'CF-PT',
    name: 'Physical Therapy Competency Framework',
    nameAr: 'إطار كفاءات العلاج الطبيعي',
    domains: ['clinical_skills', 'evidence_based_practice', 'patient_education'],
  },
  {
    code: 'CF-OT',
    name: 'Occupational Therapy Competency Framework',
    nameAr: 'إطار كفاءات العلاج الوظيفي',
    domains: ['clinical_skills', 'critical_thinking', 'cultural_competence'],
  },
  {
    code: 'CF-SLP',
    name: 'Speech-Language Competency Framework',
    nameAr: 'إطار كفاءات النطق واللغة',
    domains: ['clinical_skills', 'communication', 'research'],
  },
  {
    code: 'CF-PSY',
    name: 'Psychology Competency Framework',
    nameAr: 'إطار كفاءات علم النفس',
    domains: ['clinical_skills', 'ethics', 'research', 'cultural_competence'],
  },
  {
    code: 'CF-NURSE',
    name: 'Nursing Competency Framework',
    nameAr: 'إطار كفاءات التمريض',
    domains: ['clinical_skills', 'safety', 'documentation', 'patient_education'],
  },
  {
    code: 'CF-LEAD',
    name: 'Leadership Competency Framework',
    nameAr: 'إطار كفاءات القيادة',
    domains: ['leadership', 'communication', 'quality_improvement', 'teamwork'],
  },
  {
    code: 'CF-TECH',
    name: 'Health Technology Competency',
    nameAr: 'كفاءات التقنية الصحية',
    domains: ['technology', 'documentation', 'safety'],
  },
  {
    code: 'CF-RESEARCH',
    name: 'Clinical Research Competency',
    nameAr: 'كفاءات البحث السريري',
    domains: ['research', 'evidence_based_practice', 'ethics', 'critical_thinking'],
  },
  {
    code: 'CF-QI',
    name: 'Quality Improvement Competency',
    nameAr: 'كفاءات تحسين الجودة',
    domains: ['quality_improvement', 'documentation', 'leadership'],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Competency Framework ──────────────────────────────────────────────── */
const competencyFrameworkSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    domains: [{ type: String, enum: COMPETENCY_DOMAINS }],
    targetRoles: [{ type: String }],
    version: { type: String, default: '1.0' },
    status: { type: String, enum: ['draft', 'active', 'archived', 'retired'], default: 'draft' },
    publishedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDCompetencyFramework =
  mongoose.models.DDDCompetencyFramework ||
  mongoose.model('DDDCompetencyFramework', competencyFrameworkSchema);

/* ── Competency ────────────────────────────────────────────────────────── */
const competencySchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    domain: { type: String, enum: COMPETENCY_DOMAINS, required: true },
    frameworkId: { type: Schema.Types.ObjectId, ref: 'DDDCompetencyFramework', index: true },
    requiredLevel: { type: String, enum: PROFICIENCY_LEVELS, default: 'competent' },
    assessmentMethods: [{ type: String, enum: ASSESSMENT_METHODS }],
    indicators: [
      {
        level: { type: String, enum: PROFICIENCY_LEVELS },
        description: { type: String },
        descriptionAr: { type: String },
      },
    ],
    relatedCourses: [{ type: Schema.Types.ObjectId, ref: 'DDDCourse' }],
    isCore: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

competencySchema.index({ domain: 1, frameworkId: 1 });

const DDDCompetency =
  mongoose.models.DDDCompetency || mongoose.model('DDDCompetency', competencySchema);

/* ── Staff Competency ──────────────────────────────────────────────────── */
const assessmentRecordSchema = new Schema(
  {
    method: { type: String, enum: ASSESSMENT_METHODS, required: true },
    assessorId: { type: Schema.Types.ObjectId, ref: 'User' },
    assessorName: { type: String },
    level: { type: String, enum: PROFICIENCY_LEVELS },
    score: { type: Number, min: 0, max: 100 },
    date: { type: Date, default: Date.now },
    evidence: { type: String },
    notes: { type: String },
    attachments: [{ name: String, url: String }],
  },
  { _id: true }
);

const staffCompetencySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    competencyId: {
      type: Schema.Types.ObjectId,
      ref: 'DDDCompetency',
      required: true,
      index: true,
    },
    frameworkId: { type: Schema.Types.ObjectId, ref: 'DDDCompetencyFramework' },
    currentLevel: { type: String, enum: PROFICIENCY_LEVELS, default: 'novice' },
    targetLevel: { type: String, enum: PROFICIENCY_LEVELS, default: 'competent' },
    status: { type: String, enum: COMPETENCY_STATUSES, default: 'not_assessed' },
    assessments: [assessmentRecordSchema],
    lastAssessedAt: { type: Date },
    nextAssessmentDue: { type: Date },
    developmentPlan: { type: String },
    courseCompletions: [
      {
        courseId: { type: Schema.Types.ObjectId },
        completedAt: { type: Date },
        score: { type: Number },
      },
    ],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

staffCompetencySchema.index({ userId: 1, competencyId: 1 }, { unique: true });
staffCompetencySchema.index({ status: 1, currentLevel: 1 });

const DDDStaffCompetency =
  mongoose.models.DDDStaffCompetency || mongoose.model('DDDStaffCompetency', staffCompetencySchema);

/* ── Credential ────────────────────────────────────────────────────────── */
const credentialSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: CREDENTIAL_TYPES, required: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    issuingBody: { type: String, required: true },
    issuingBodyAr: { type: String },
    credentialNumber: { type: String },
    status: { type: String, enum: CREDENTIAL_STATUSES, default: 'active' },
    issuedDate: { type: Date, required: true },
    expiryDate: { type: Date },
    renewalDate: { type: Date },
    country: { type: String, default: 'SA' },
    specialization: { type: String },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    attachments: [{ name: String, url: String, type: String }],
    renewalHistory: [
      {
        renewedAt: { type: Date },
        expiryDate: { type: Date },
        notes: { type: String },
      },
    ],
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

credentialSchema.index({ type: 1, status: 1 });
credentialSchema.index({ expiryDate: 1 });

const DDDCredential =
  mongoose.models.DDDCredential || mongoose.model('DDDCredential', credentialSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class CompetencyTracker extends BaseDomainModule {
  constructor() {
    super('CompetencyTracker', {
      description: 'Staff competencies, skills assessment, credentialing & proficiency tracking',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedFrameworks();
    this.log('Competency Tracker initialised ✓');
    return true;
  }

  async _seedFrameworks() {
    for (const f of BUILTIN_FRAMEWORKS) {
      const exists = await DDDCompetencyFramework.findOne({ code: f.code }).lean();
      if (!exists) await DDDCompetencyFramework.create(f);
    }
  }

  /* ── Framework CRUD ── */
  async listFrameworks(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    return DDDCompetencyFramework.find(q).sort({ name: 1 }).lean();
  }
  async getFramework(id) {
    return DDDCompetencyFramework.findById(id).lean();
  }
  async createFramework(data) {
    return DDDCompetencyFramework.create(data);
  }
  async updateFramework(id, data) {
    return DDDCompetencyFramework.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Competency CRUD ── */
  async listCompetencies(filters = {}) {
    const q = {};
    if (filters.domain) q.domain = filters.domain;
    if (filters.frameworkId) q.frameworkId = filters.frameworkId;
    if (filters.isCore !== undefined) q.isCore = filters.isCore;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDCompetency.find(q).sort({ domain: 1, name: 1 }).lean();
  }
  async getCompetency(id) {
    return DDDCompetency.findById(id).lean();
  }
  async createCompetency(data) {
    return DDDCompetency.create(data);
  }
  async updateCompetency(id, data) {
    return DDDCompetency.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Staff Competency CRUD ── */
  async listStaffCompetencies(filters = {}) {
    const q = {};
    if (filters.userId) q.userId = filters.userId;
    if (filters.competencyId) q.competencyId = filters.competencyId;
    if (filters.frameworkId) q.frameworkId = filters.frameworkId;
    if (filters.status) q.status = filters.status;
    return DDDStaffCompetency.find(q)
      .populate('competencyId', 'name nameAr domain code')
      .sort({ createdAt: -1 })
      .lean();
  }
  async getStaffCompetency(id) {
    return DDDStaffCompetency.findById(id).populate('competencyId').lean();
  }

  async assignCompetency(data) {
    return DDDStaffCompetency.create(data);
  }

  async recordAssessment(staffCompId, assessmentData) {
    const sc = await DDDStaffCompetency.findById(staffCompId);
    if (!sc) throw new Error('Staff competency record not found');
    sc.assessments.push(assessmentData);
    sc.currentLevel = assessmentData.level || sc.currentLevel;
    sc.lastAssessedAt = new Date();

    // Determine status
    const levels = PROFICIENCY_LEVELS;
    const currentIdx = levels.indexOf(sc.currentLevel);
    const targetIdx = levels.indexOf(sc.targetLevel);
    if (currentIdx >= targetIdx)
      sc.status = currentIdx > targetIdx ? 'exceeds_expectations' : 'meets_expectations';
    else if (currentIdx === targetIdx - 1) sc.status = 'developing';
    else sc.status = 'needs_improvement';

    await sc.save();
    return sc;
  }

  /* ── Credential CRUD ── */
  async listCredentials(filters = {}) {
    const q = {};
    if (filters.userId) q.userId = filters.userId;
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDCredential.find(q).sort({ expiryDate: 1 }).lean();
  }
  async getCredential(id) {
    return DDDCredential.findById(id).lean();
  }
  async createCredential(data) {
    return DDDCredential.create(data);
  }
  async updateCredential(id, data) {
    return DDDCredential.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async renewCredential(id, renewalData) {
    const cred = await DDDCredential.findById(id);
    if (!cred) throw new Error('Credential not found');
    cred.renewalHistory.push({
      renewedAt: new Date(),
      expiryDate: renewalData.newExpiryDate,
      notes: renewalData.notes,
    });
    cred.expiryDate = renewalData.newExpiryDate;
    cred.status = 'active';
    cred.renewalDate = renewalData.nextRenewalDate;
    await cred.save();
    return cred;
  }

  async getExpiringCredentials(withinDays = 90) {
    const future = new Date();
    future.setDate(future.getDate() + withinDays);
    return DDDCredential.find({ status: 'active', expiryDate: { $lte: future, $gte: new Date() } })
      .sort({ expiryDate: 1 })
      .lean();
  }

  /* ── Gap Analysis ── */
  async getCompetencyGapAnalysis(userId, frameworkId) {
    const competencies = await DDDCompetency.find({ frameworkId, isActive: true }).lean();
    const staffComps = await DDDStaffCompetency.find({ userId, frameworkId }).lean();
    const gaps = [];
    for (const comp of competencies) {
      const sc = staffComps.find(s => String(s.competencyId) === String(comp._id));
      const currentLevel = sc ? sc.currentLevel : 'novice';
      const targetLevel = comp.requiredLevel;
      const levels = PROFICIENCY_LEVELS;
      const gap = levels.indexOf(targetLevel) - levels.indexOf(currentLevel);
      gaps.push({
        competencyId: comp._id,
        name: comp.name,
        nameAr: comp.nameAr,
        domain: comp.domain,
        currentLevel,
        targetLevel,
        gap,
        status: sc ? sc.status : 'not_assessed',
      });
    }
    return {
      userId,
      frameworkId,
      gaps: gaps.sort((a, b) => b.gap - a.gap),
      totalGaps: gaps.filter(g => g.gap > 0).length,
    };
  }

  async getStaffProfile(userId) {
    const competencies = await DDDStaffCompetency.find({ userId })
      .populate('competencyId', 'name nameAr domain')
      .lean();
    const credentials = await DDDCredential.find({ userId }).lean();
    const byDomain = {};
    for (const sc of competencies) {
      const domain = sc.competencyId?.domain || 'unknown';
      if (!byDomain[domain]) byDomain[domain] = [];
      byDomain[domain].push(sc);
    }
    return {
      userId,
      competencies,
      credentials,
      byDomain,
      totalCompetencies: competencies.length,
      totalCredentials: credentials.length,
    };
  }

  /** Health check */
  async healthCheck() {
    const [frameworks, competencies, staffComps, credentials] = await Promise.all([
      DDDCompetencyFramework.countDocuments(),
      DDDCompetency.countDocuments(),
      DDDStaffCompetency.countDocuments(),
      DDDCredential.countDocuments(),
    ]);
    return {
      status: 'healthy',
      frameworks,
      competencies,
      staffCompetencies: staffComps,
      credentials,
    };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createCompetencyTrackerRouter() {
  const router = Router();
  const tracker = new CompetencyTracker();

  /* ── Frameworks ── */
  router.get('/competency/frameworks', async (req, res) => {
    try {
      res.json({ success: true, data: await tracker.listFrameworks(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/competency/frameworks/:id', async (req, res) => {
    try {
      const d = await tracker.getFramework(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/competency/frameworks', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await tracker.createFramework(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/competency/frameworks/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await tracker.updateFramework(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Competencies ── */
  router.get('/competency/skills', async (req, res) => {
    try {
      res.json({ success: true, data: await tracker.listCompetencies(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/competency/skills/:id', async (req, res) => {
    try {
      const d = await tracker.getCompetency(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/competency/skills', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await tracker.createCompetency(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/competency/skills/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await tracker.updateCompetency(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Staff Competencies ── */
  router.get('/competency/staff', async (req, res) => {
    try {
      res.json({ success: true, data: await tracker.listStaffCompetencies(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/competency/staff/:id', async (req, res) => {
    try {
      const d = await tracker.getStaffCompetency(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/competency/staff', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await tracker.assignCompetency(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/competency/staff/:id/assess', async (req, res) => {
    try {
      res.json({ success: true, data: await tracker.recordAssessment(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Credentials ── */
  router.get('/competency/credentials', async (req, res) => {
    try {
      res.json({ success: true, data: await tracker.listCredentials(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/competency/credentials/expiring', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await tracker.getExpiringCredentials(Number(req.query.days) || 90),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/competency/credentials/:id', async (req, res) => {
    try {
      const d = await tracker.getCredential(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/competency/credentials', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await tracker.createCredential(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/competency/credentials/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await tracker.updateCredential(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/competency/credentials/:id/renew', async (req, res) => {
    try {
      res.json({ success: true, data: await tracker.renewCredential(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Analysis ── */
  router.get('/competency/gap-analysis/:userId', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await tracker.getCompetencyGapAnalysis(req.params.userId, req.query.frameworkId),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/competency/profile/:userId', async (req, res) => {
    try {
      res.json({ success: true, data: await tracker.getStaffProfile(req.params.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Health ── */
  router.get('/competency/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await tracker.healthCheck() });
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
  CompetencyTracker,
  DDDCompetencyFramework,
  DDDCompetency,
  DDDStaffCompetency,
  DDDCredential,
  COMPETENCY_DOMAINS,
  PROFICIENCY_LEVELS,
  ASSESSMENT_METHODS,
  CREDENTIAL_TYPES,
  CREDENTIAL_STATUSES,
  COMPETENCY_STATUSES,
  BUILTIN_FRAMEWORKS,
  createCompetencyTrackerRouter,
};
