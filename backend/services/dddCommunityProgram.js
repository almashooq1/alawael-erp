/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Community Program — Phase 25 · Volunteer & Community Engagement
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Community programs, enrollments, activities, and outcome tracking
 * for rehabilitation-focused community engagement.
 *
 * Aggregates
 *   DDDProgram           — community program definition
 *   DDDProgramEnrollment — participant enrollment in a program
 *   DDDProgramActivity   — scheduled activity within a program
 *   DDDProgramOutcome    — measured outcome / impact record
 *
 * Canonical links
 *   beneficiaryId → Beneficiary
 *   coordinatorId → User
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

const PROGRAM_TYPES = [
  'support_group',
  'skills_workshop',
  'awareness_campaign',
  'family_program',
  'peer_mentoring',
  'advocacy_program',
  'social_integration',
  'vocational_training',
  'recreational',
  'wellness_program',
  'educational',
  'research_study',
];

const PROGRAM_STATUSES = [
  'planning',
  'approved',
  'open_enrollment',
  'active',
  'in_progress',
  'completed',
  'suspended',
  'cancelled',
  'archived',
  'evaluation',
];

const ENROLLMENT_STATUSES = [
  'applied',
  'waitlisted',
  'enrolled',
  'active',
  'on_hold',
  'withdrew',
  'completed',
  'graduated',
  'dropped',
  'transferred',
];

const ACTIVITY_TYPES = [
  'workshop',
  'seminar',
  'field_trip',
  'group_session',
  'one_on_one',
  'online_session',
  'assessment',
  'celebration',
  'orientation',
  'guest_speaker',
  'skill_practice',
  'evaluation',
];

const OUTCOME_TYPES = [
  'skill_acquisition',
  'behavior_change',
  'social_integration',
  'independence_gain',
  'employment_outcome',
  'education_achievement',
  'health_improvement',
  'quality_of_life',
  'family_satisfaction',
  'community_participation',
  'self_advocacy',
  'goal_attainment',
];

const FUNDING_SOURCES = [
  'government_grant',
  'corporate_sponsorship',
  'individual_donation',
  'foundation_grant',
  'insurance',
  'fee_for_service',
  'endowment',
  'crowdfunding',
  'in_kind',
  'volunteer_hours',
];

/* ── Built-in programs ──────────────────────────────────────────────────── */
const BUILTIN_PROGRAMS = [
  {
    code: 'CPROG-SOCIAL',
    name: 'Social Skills Program',
    nameAr: 'برنامج المهارات الاجتماعية',
    type: 'skills_workshop',
    maxParticipants: 15,
  },
  {
    code: 'CPROG-FAMILY',
    name: 'Family Support Circle',
    nameAr: 'حلقة دعم الأسرة',
    type: 'family_program',
    maxParticipants: 20,
  },
  {
    code: 'CPROG-PEER',
    name: 'Peer Mentoring Network',
    nameAr: 'شبكة إرشاد الأقران',
    type: 'peer_mentoring',
    maxParticipants: 30,
  },
  {
    code: 'CPROG-VOCAT',
    name: 'Vocational Ready Program',
    nameAr: 'برنامج الاستعداد المهني',
    type: 'vocational_training',
    maxParticipants: 12,
  },
  {
    code: 'CPROG-WELL',
    name: 'Community Wellness',
    nameAr: 'العافية المجتمعية',
    type: 'wellness_program',
    maxParticipants: 25,
  },
  {
    code: 'CPROG-REC',
    name: 'Adaptive Recreation',
    nameAr: 'الترفيه التكيفي',
    type: 'recreational',
    maxParticipants: 20,
  },
  {
    code: 'CPROG-ADV',
    name: 'Self-Advocacy Training',
    nameAr: 'تدريب المناصرة الذاتية',
    type: 'advocacy_program',
    maxParticipants: 15,
  },
  {
    code: 'CPROG-AWARE',
    name: 'Disability Awareness',
    nameAr: 'التوعية بالإعاقة',
    type: 'awareness_campaign',
    maxParticipants: 50,
  },
  {
    code: 'CPROG-EDU',
    name: 'Continuing Education',
    nameAr: 'التعليم المستمر',
    type: 'educational',
    maxParticipants: 20,
  },
  {
    code: 'CPROG-INTEG',
    name: 'Community Integration',
    nameAr: 'الاندماج المجتمعي',
    type: 'social_integration',
    maxParticipants: 18,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Program ───────────────────────────────────────────────────────────── */
const programSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    type: { type: String, enum: PROGRAM_TYPES, required: true },
    status: { type: String, enum: PROGRAM_STATUSES, default: 'planning' },
    coordinatorId: { type: Schema.Types.ObjectId, ref: 'User' },
    startDate: { type: Date },
    endDate: { type: Date },
    maxParticipants: { type: Number },
    currentEnrolled: { type: Number, default: 0 },
    location: { type: String },
    fundingSource: { type: String, enum: FUNDING_SOURCES },
    budget: { type: Number },
    goals: [{ goal: String, targetDate: Date, achieved: Boolean }],
    eligibilityRequirements: { type: String },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

programSchema.index({ type: 1, status: 1 });

const DDDProgram = mongoose.models.DDDProgram || mongoose.model('DDDProgram', programSchema);

/* ── Program Enrollment ────────────────────────────────────────────────── */
const programEnrollmentSchema = new Schema(
  {
    enrollmentCode: { type: String, required: true, unique: true },
    programId: { type: Schema.Types.ObjectId, ref: 'DDDProgram', required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    participantName: { type: String },
    status: { type: String, enum: ENROLLMENT_STATUSES, default: 'applied' },
    enrolledAt: { type: Date },
    completedAt: { type: Date },
    attendanceRate: { type: Number, min: 0, max: 100 },
    progressNotes: [{ date: Date, note: String, recordedBy: Schema.Types.ObjectId }],
    finalAssessment: { type: String },
    satisfactionScore: { type: Number, min: 1, max: 5 },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

programEnrollmentSchema.index({ programId: 1, status: 1 });
programEnrollmentSchema.index({ beneficiaryId: 1 });

const DDDProgramEnrollment =
  mongoose.models.DDDProgramEnrollment ||
  mongoose.model('DDDProgramEnrollment', programEnrollmentSchema);

/* ── Program Activity ──────────────────────────────────────────────────── */
const programActivitySchema = new Schema(
  {
    activityCode: { type: String, required: true, unique: true },
    programId: { type: Schema.Types.ObjectId, ref: 'DDDProgram', required: true },
    title: { type: String, required: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    scheduledDate: { type: Date },
    startTime: { type: String },
    endTime: { type: String },
    location: { type: String },
    facilitator: { type: Schema.Types.ObjectId, ref: 'User' },
    maxAttendees: { type: Number },
    actualAttendees: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['planned', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    },
    materials: [{ name: String, url: String }],
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

programActivitySchema.index({ programId: 1, scheduledDate: 1 });

const DDDProgramActivity =
  mongoose.models.DDDProgramActivity || mongoose.model('DDDProgramActivity', programActivitySchema);

/* ── Program Outcome ───────────────────────────────────────────────────── */
const programOutcomeSchema = new Schema(
  {
    outcomeCode: { type: String, required: true, unique: true },
    programId: { type: Schema.Types.ObjectId, ref: 'DDDProgram', required: true },
    enrollmentId: { type: Schema.Types.ObjectId, ref: 'DDDProgramEnrollment' },
    type: { type: String, enum: OUTCOME_TYPES, required: true },
    description: { type: String },
    baselineValue: { type: Number },
    targetValue: { type: Number },
    actualValue: { type: Number },
    measureDate: { type: Date, default: Date.now },
    measuredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    achievementPercent: { type: Number, min: 0, max: 100 },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

programOutcomeSchema.index({ programId: 1, type: 1 });

const DDDProgramOutcome =
  mongoose.models.DDDProgramOutcome || mongoose.model('DDDProgramOutcome', programOutcomeSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class CommunityProgram extends BaseDomainModule {
  constructor() {
    super('CommunityProgram', {
      description: 'Community programs, enrollments & outcome tracking',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedPrograms();
    this.log('Community Program initialised ✓');
    return true;
  }

  async _seedPrograms() {
    for (const p of BUILTIN_PROGRAMS) {
      const exists = await DDDProgram.findOne({ code: p.code }).lean();
      if (!exists) await DDDProgram.create(p);
    }
  }

  /* ── Programs ── */
  async listPrograms(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDProgram.find(q).sort({ name: 1 }).lean();
  }
  async getProgram(id) {
    return DDDProgram.findById(id).lean();
  }
  async createProgram(data) {
    return DDDProgram.create(data);
  }
  async updateProgram(id, data) {
    return DDDProgram.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Enrollments ── */
  async listEnrollments(filters = {}) {
    const q = {};
    if (filters.programId) q.programId = filters.programId;
    if (filters.status) q.status = filters.status;
    return DDDProgramEnrollment.find(q).sort({ enrolledAt: -1 }).lean();
  }
  async enrollParticipant(data) {
    if (!data.enrollmentCode) data.enrollmentCode = `ENRL-${Date.now()}`;
    data.enrolledAt = new Date();
    data.status = 'enrolled';
    return DDDProgramEnrollment.create(data);
  }
  async updateEnrollment(id, data) {
    return DDDProgramEnrollment.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Activities ── */
  async listActivities(programId) {
    const q = programId ? { programId } : {};
    return DDDProgramActivity.find(q).sort({ scheduledDate: 1 }).lean();
  }
  async createActivity(data) {
    if (!data.activityCode) data.activityCode = `PACT-${Date.now()}`;
    return DDDProgramActivity.create(data);
  }

  /* ── Outcomes ── */
  async listOutcomes(programId) {
    const q = programId ? { programId } : {};
    return DDDProgramOutcome.find(q).sort({ measureDate: -1 }).lean();
  }
  async recordOutcome(data) {
    if (!data.outcomeCode) data.outcomeCode = `POUT-${Date.now()}`;
    if (data.baselineValue && data.targetValue && data.actualValue) {
      data.achievementPercent = Math.min(
        100,
        Math.round(
          ((data.actualValue - data.baselineValue) / (data.targetValue - data.baselineValue)) * 100
        )
      );
    }
    return DDDProgramOutcome.create(data);
  }

  /* ── Analytics ── */
  async getProgramAnalytics() {
    const [programs, enrollments, activities, outcomes] = await Promise.all([
      DDDProgram.countDocuments(),
      DDDProgramEnrollment.countDocuments(),
      DDDProgramActivity.countDocuments(),
      DDDProgramOutcome.countDocuments(),
    ]);
    const activePrograms = await DDDProgram.countDocuments({
      status: { $in: ['active', 'in_progress'] },
    });
    return { programs, enrollments, activities, outcomes, activePrograms };
  }

  async healthCheck() {
    const [total, active] = await Promise.all([
      DDDProgram.countDocuments(),
      DDDProgram.countDocuments({ status: { $in: ['active', 'in_progress', 'open_enrollment'] } }),
    ]);
    return { status: 'healthy', totalPrograms: total, activePrograms: active };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createCommunityProgramRouter() {
  const router = Router();
  const svc = new CommunityProgram();

  router.get('/community/programs', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPrograms(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/community/programs/:id', async (req, res) => {
    try {
      const d = await svc.getProgram(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/community/programs', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createProgram(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/community/enrollments', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEnrollments(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/community/enrollments', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.enrollParticipant(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/community/activities', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listActivities(req.query.programId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/community/activities', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createActivity(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/community/outcomes', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listOutcomes(req.query.programId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/community/outcomes', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordOutcome(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/community/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getProgramAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/community/health', async (_req, res) => {
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
  CommunityProgram,
  DDDProgram,
  DDDProgramEnrollment,
  DDDProgramActivity,
  DDDProgramOutcome,
  PROGRAM_TYPES,
  PROGRAM_STATUSES,
  ENROLLMENT_STATUSES,
  ACTIVITY_TYPES,
  OUTCOME_TYPES,
  FUNDING_SOURCES,
  BUILTIN_PROGRAMS,
  createCommunityProgramRouter,
};
