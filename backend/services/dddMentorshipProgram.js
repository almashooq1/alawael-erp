'use strict';
/**
 * DDD Mentorship Program Service
 * ───────────────────────────────
 * Phase 29 – Workforce & Professional Development (Module 3/4)
 *
 * Manages mentorship pairings, mentoring plans, progress tracking,
 * feedback cycles, and mentorship program analytics.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const MENTORSHIP_TYPES = [
  'clinical',
  'peer',
  'leadership',
  'onboarding',
  'research',
  'career_development',
  'cross_functional',
  'reverse_mentoring',
  'group_mentoring',
  'virtual',
  'skill_based',
  'project_based',
];

const MENTORSHIP_STATUSES = [
  'proposed',
  'matched',
  'active',
  'paused',
  'completed',
  'cancelled',
  'extended',
  'under_review',
  'graduated',
  'terminated',
];

const GOAL_STATUSES = [
  'not_started',
  'in_progress',
  'on_track',
  'at_risk',
  'behind',
  'completed',
  'deferred',
  'exceeded',
  'cancelled',
  'modified',
];

const MEETING_FORMATS = [
  'in_person',
  'video_call',
  'phone',
  'hybrid',
  'shadowing',
  'observation',
  'co_treatment',
  'case_review',
  'workshop',
  'informal',
];

const FEEDBACK_TYPES = [
  'mentor_to_mentee',
  'mentee_to_mentor',
  'self_assessment',
  'peer_feedback',
  'supervisor_feedback',
  'program_feedback',
  'mid_term_review',
  'final_evaluation',
  'anonymous',
  'structured',
];

const COMPETENCY_DOMAINS = [
  'clinical_skills',
  'communication',
  'professionalism',
  'critical_thinking',
  'leadership',
  'teamwork',
  'evidence_based_practice',
  'patient_education',
  'documentation',
  'time_management',
  'cultural_sensitivity',
  'technology',
];

const BUILTIN_PROGRAM_TEMPLATES = [
  { code: 'NEW_HIRE_90D', name: '90-Day New Hire Mentorship', durationMonths: 3 },
  { code: 'CLINICAL_ADV', name: 'Clinical Advancement Program', durationMonths: 12 },
  { code: 'LEADERSHIP_DEV', name: 'Leadership Development Track', durationMonths: 6 },
  { code: 'RESEARCH_MENTR', name: 'Research Mentorship Program', durationMonths: 12 },
  { code: 'PEER_SUPPORT', name: 'Peer Support Network', durationMonths: 6 },
  { code: 'SPECIALIST_TRK', name: 'Specialist Training Track', durationMonths: 18 },
  { code: 'CROSS_DEPT', name: 'Cross-Department Mentoring', durationMonths: 4 },
  { code: 'INTERN_PROG', name: 'Internship Mentorship', durationMonths: 3 },
  { code: 'SUCCESSION_PLN', name: 'Succession Planning Mentorship', durationMonths: 12 },
  { code: 'WELLNESS_MENTR', name: 'Staff Wellness Mentoring', durationMonths: 6 },
];

/* ═══════════════════ Schemas ═══════════════════ */
const mentorshipPairSchema = new Schema(
  {
    mentorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    menteeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: MENTORSHIP_TYPES, required: true },
    status: { type: String, enum: MENTORSHIP_STATUSES, default: 'proposed' },
    programName: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    goals: [
      {
        title: String,
        description: String,
        status: { type: String, enum: GOAL_STATUSES, default: 'not_started' },
        targetDate: Date,
        completedDate: Date,
      },
    ],
    competencyFocus: [{ type: String, enum: COMPETENCY_DOMAINS }],
    meetingFrequency: { type: String, default: 'biweekly' },
    totalMeetings: { type: Number, default: 0 },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
mentorshipPairSchema.index({ mentorId: 1, status: 1 });
mentorshipPairSchema.index({ menteeId: 1, status: 1 });

const mentorMeetingSchema = new Schema(
  {
    pairId: { type: Schema.Types.ObjectId, ref: 'DDDMentorshipPair', required: true },
    date: { type: Date, required: true },
    format: { type: String, enum: MEETING_FORMATS, default: 'in_person' },
    durationMinutes: { type: Number, default: 60 },
    agendaTopics: [{ type: String }],
    keyDiscussions: { type: String },
    actionItems: [{ item: String, assignedTo: String, dueDate: Date, completed: Boolean }],
    menteeProgress: { type: String },
    competenciesAddressed: [{ type: String, enum: COMPETENCY_DOMAINS }],
    nextMeetingDate: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
mentorMeetingSchema.index({ pairId: 1, date: -1 });

const mentorFeedbackSchema = new Schema(
  {
    pairId: { type: Schema.Types.ObjectId, ref: 'DDDMentorshipPair', required: true },
    type: { type: String, enum: FEEDBACK_TYPES, required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    ratings: [
      {
        domain: { type: String, enum: COMPETENCY_DOMAINS },
        score: { type: Number, min: 1, max: 5 },
      },
    ],
    overallRating: { type: Number, min: 1, max: 5 },
    strengths: { type: String },
    areasForGrowth: { type: String },
    comments: { type: String },
    isAnonymous: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
mentorFeedbackSchema.index({ pairId: 1, type: 1 });

const mentorshipProgramSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, unique: true },
    description: { type: String },
    type: { type: String, enum: MENTORSHIP_TYPES },
    durationMonths: { type: Number },
    maxPairs: { type: Number, default: 20 },
    activePairs: { type: Number, default: 0 },
    coordinatorId: { type: Schema.Types.ObjectId, ref: 'User' },
    eligibilityCriteria: { type: String },
    objectives: [{ type: String }],
    isActive: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
mentorshipProgramSchema.index({ isActive: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDMentorshipPair =
  mongoose.models.DDDMentorshipPair || mongoose.model('DDDMentorshipPair', mentorshipPairSchema);
const DDDMentorMeeting =
  mongoose.models.DDDMentorMeeting || mongoose.model('DDDMentorMeeting', mentorMeetingSchema);
const DDDMentorFeedback =
  mongoose.models.DDDMentorFeedback || mongoose.model('DDDMentorFeedback', mentorFeedbackSchema);
const DDDMentorshipProgram =
  mongoose.models.DDDMentorshipProgram ||
  mongoose.model('DDDMentorshipProgram', mentorshipProgramSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class MentorshipProgram {
  /* ── Pairs ── */
  async createPair(data) {
    return DDDMentorshipPair.create(data);
  }
  async listPairs(filter = {}, page = 1, limit = 20) {
    return DDDMentorshipPair.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async getPairById(id) {
    return DDDMentorshipPair.findById(id).lean();
  }
  async updatePair(id, data) {
    return DDDMentorshipPair.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  /* ── Meetings ── */
  async createMeeting(data) {
    const meeting = await DDDMentorMeeting.create(data);
    await DDDMentorshipPair.findByIdAndUpdate(data.pairId, { $inc: { totalMeetings: 1 } });
    return meeting;
  }
  async listMeetings(filter = {}, page = 1, limit = 20) {
    return DDDMentorMeeting.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  /* ── Feedback ── */
  async createFeedback(data) {
    return DDDMentorFeedback.create(data);
  }
  async listFeedback(filter = {}, page = 1, limit = 20) {
    return DDDMentorFeedback.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  /* ── Programs ── */
  async createProgram(data) {
    return DDDMentorshipProgram.create(data);
  }
  async listPrograms(filter = {}) {
    return DDDMentorshipProgram.find(filter).sort({ createdAt: -1 }).lean();
  }
  async updateProgram(id, data) {
    return DDDMentorshipProgram.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  /* ── Analytics ── */
  async getProgramStats() {
    const [totalPairs, active, completed, programs] = await Promise.all([
      DDDMentorshipPair.countDocuments(),
      DDDMentorshipPair.countDocuments({ status: 'active' }),
      DDDMentorshipPair.countDocuments({ status: 'completed' }),
      DDDMentorshipProgram.countDocuments({ isActive: true }),
    ]);
    return { totalPairs, active, completed, activePrograms: programs };
  }

  async getMentorLoad(mentorId) {
    return DDDMentorshipPair.countDocuments({ mentorId, status: 'active' });
  }

  /* ── Health ── */
  async healthCheck() {
    const [pairs, meetings, feedback, programs] = await Promise.all([
      DDDMentorshipPair.countDocuments(),
      DDDMentorMeeting.countDocuments(),
      DDDMentorFeedback.countDocuments(),
      DDDMentorshipProgram.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'MentorshipProgram',
      counts: { pairs, meetings, feedback, programs },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createMentorshipProgramRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new MentorshipProgram();

  router.get('/mentorship-program/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* Pairs */
  router.post('/mentorship-program/pairs', async (req, res) => {
    try {
      res.status(201).json(await svc.createPair(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/mentorship-program/pairs', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filter } = req.query;
      res.json(await svc.listPairs(filter, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/mentorship-program/pairs/:id', async (req, res) => {
    try {
      res.json(await svc.getPairById(req.params.id));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/mentorship-program/pairs/:id', async (req, res) => {
    try {
      res.json(await svc.updatePair(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* Meetings */
  router.post('/mentorship-program/meetings', async (req, res) => {
    try {
      res.status(201).json(await svc.createMeeting(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/mentorship-program/meetings', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filter } = req.query;
      res.json(await svc.listMeetings(filter, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* Feedback */
  router.post('/mentorship-program/feedback', async (req, res) => {
    try {
      res.status(201).json(await svc.createFeedback(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/mentorship-program/feedback', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filter } = req.query;
      res.json(await svc.listFeedback(filter, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* Programs */
  router.post('/mentorship-program/programs', async (req, res) => {
    try {
      res.status(201).json(await svc.createProgram(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/mentorship-program/programs', async (req, res) => {
    try {
      res.json(await svc.listPrograms(req.query));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* Analytics */
  router.get('/mentorship-program/stats', async (_req, res) => {
    try {
      res.json(await svc.getProgramStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  MENTORSHIP_TYPES,
  MENTORSHIP_STATUSES,
  GOAL_STATUSES,
  MEETING_FORMATS,
  FEEDBACK_TYPES,
  COMPETENCY_DOMAINS,
  BUILTIN_PROGRAM_TEMPLATES,
  DDDMentorshipPair,
  DDDMentorMeeting,
  DDDMentorFeedback,
  DDDMentorshipProgram,
  MentorshipProgram,
  createMentorshipProgramRouter,
};
