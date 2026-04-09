/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Volunteer Manager — Phase 25 · Volunteer & Community Engagement
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Volunteer registration, shift scheduling, skill tracking,
 * recognition programs, and volunteer analytics.
 *
 * Aggregates
 *   DDDVolunteer          — registered volunteer profile
 *   DDDVolunteerShift     — scheduled / completed volunteer shift
 *   DDDVolunteerSkill     — volunteer skill / competency record
 *   DDDVolunteerRecognition — recognition / award for volunteer
 *
 * Canonical links
 *   userId → User
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

const VOLUNTEER_STATUSES = [
  'applicant',
  'screening',
  'approved',
  'active',
  'on_leave',
  'inactive',
  'suspended',
  'alumni',
  'pending_training',
  'retired',
];

const VOLUNTEER_CATEGORIES = [
  'clinical_support',
  'administrative',
  'therapy_assistant',
  'transport_escort',
  'event_support',
  'fundraising',
  'community_outreach',
  'mentoring',
  'translation',
  'recreational',
  'educational',
  'technical',
];

const SHIFT_STATUSES = [
  'scheduled',
  'confirmed',
  'checked_in',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
  'pending_approval',
  'swapped',
];

const SKILL_LEVELS = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
  'certified',
  'master',
  'in_training',
  'refresher_needed',
  'expired',
  'pending_verification',
];

const RECOGNITION_TYPES = [
  'hours_milestone',
  'excellence_award',
  'innovation_award',
  'service_anniversary',
  'leadership_award',
  'community_impact',
  'patient_appreciation',
  'team_player',
  'mentor_award',
  'outstanding_commitment',
  'special_recognition',
  'certificate',
];

const AVAILABILITY_PATTERNS = [
  'weekday_morning',
  'weekday_afternoon',
  'weekday_evening',
  'weekend_morning',
  'weekend_afternoon',
  'weekend_evening',
  'flexible',
  'on_call',
  'seasonal',
  'event_based',
];

/* ── Built-in volunteer roles ───────────────────────────────────────────── */
const BUILTIN_VOLUNTEER_ROLES = [
  {
    code: 'VROL-THER',
    name: 'Therapy Assistant',
    nameAr: 'مساعد علاج',
    category: 'clinical_support',
    minHoursWeek: 4,
  },
  {
    code: 'VROL-ADMIN',
    name: 'Administrative Helper',
    nameAr: 'مساعد إداري',
    category: 'administrative',
    minHoursWeek: 3,
  },
  {
    code: 'VROL-ESCORT',
    name: 'Patient Escort',
    nameAr: 'مرافق مريض',
    category: 'transport_escort',
    minHoursWeek: 4,
  },
  {
    code: 'VROL-EVENT',
    name: 'Event Coordinator',
    nameAr: 'منسق فعاليات',
    category: 'event_support',
    minHoursWeek: 2,
  },
  {
    code: 'VROL-FUND',
    name: 'Fundraiser',
    nameAr: 'جامع تبرعات',
    category: 'fundraising',
    minHoursWeek: 2,
  },
  {
    code: 'VROL-OUTREACH',
    name: 'Community Ambassador',
    nameAr: 'سفير مجتمع',
    category: 'community_outreach',
    minHoursWeek: 3,
  },
  {
    code: 'VROL-MENTOR',
    name: 'Peer Mentor',
    nameAr: 'مرشد أقران',
    category: 'mentoring',
    minHoursWeek: 2,
  },
  {
    code: 'VROL-TRANS',
    name: 'Translator',
    nameAr: 'مترجم',
    category: 'translation',
    minHoursWeek: 2,
  },
  {
    code: 'VROL-REC',
    name: 'Recreation Leader',
    nameAr: 'قائد ترفيه',
    category: 'recreational',
    minHoursWeek: 4,
  },
  {
    code: 'VROL-TECH',
    name: 'Tech Support',
    nameAr: 'دعم تقني',
    category: 'technical',
    minHoursWeek: 3,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Volunteer ─────────────────────────────────────────────────────────── */
const volunteerSchema = new Schema(
  {
    volunteerCode: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    nameAr: { type: String },
    email: { type: String },
    phone: { type: String },
    status: { type: String, enum: VOLUNTEER_STATUSES, default: 'applicant' },
    category: { type: String, enum: VOLUNTEER_CATEGORIES },
    dateOfBirth: { type: Date },
    address: { type: String },
    availability: [{ type: String, enum: AVAILABILITY_PATTERNS }],
    startDate: { type: Date },
    totalHours: { type: Number, default: 0 },
    backgroundCheckDate: { type: Date },
    backgroundCheckStatus: { type: String, enum: ['pending', 'cleared', 'flagged', 'expired'] },
    emergencyContact: { name: String, phone: String, relation: String },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

volunteerSchema.index({ status: 1, category: 1 });

const DDDVolunteer =
  mongoose.models.DDDVolunteer || mongoose.model('DDDVolunteer', volunteerSchema);

/* ── Volunteer Shift ───────────────────────────────────────────────────── */
const volunteerShiftSchema = new Schema(
  {
    shiftCode: { type: String, required: true, unique: true },
    volunteerId: { type: Schema.Types.ObjectId, ref: 'DDDVolunteer', required: true },
    title: { type: String, required: true },
    status: { type: String, enum: SHIFT_STATUSES, default: 'scheduled' },
    department: { type: String },
    location: { type: String },
    scheduledDate: { type: Date, required: true },
    startTime: { type: String },
    endTime: { type: String },
    actualStartTime: { type: Date },
    actualEndTime: { type: Date },
    hoursWorked: { type: Number, default: 0 },
    supervisor: { type: Schema.Types.ObjectId, ref: 'User' },
    tasks: [{ task: String, completed: Boolean, notes: String }],
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

volunteerShiftSchema.index({ volunteerId: 1, scheduledDate: -1 });
volunteerShiftSchema.index({ status: 1, scheduledDate: 1 });

const DDDVolunteerShift =
  mongoose.models.DDDVolunteerShift || mongoose.model('DDDVolunteerShift', volunteerShiftSchema);

/* ── Volunteer Skill ───────────────────────────────────────────────────── */
const volunteerSkillSchema = new Schema(
  {
    volunteerId: { type: Schema.Types.ObjectId, ref: 'DDDVolunteer', required: true },
    skillName: { type: String, required: true },
    category: { type: String },
    level: { type: String, enum: SKILL_LEVELS, default: 'beginner' },
    certifiedDate: { type: Date },
    expiryDate: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    trainingHours: { type: Number, default: 0 },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

volunteerSkillSchema.index({ volunteerId: 1 });

const DDDVolunteerSkill =
  mongoose.models.DDDVolunteerSkill || mongoose.model('DDDVolunteerSkill', volunteerSkillSchema);

/* ── Volunteer Recognition ─────────────────────────────────────────────── */
const volunteerRecognitionSchema = new Schema(
  {
    recognitionCode: { type: String, required: true, unique: true },
    volunteerId: { type: Schema.Types.ObjectId, ref: 'DDDVolunteer', required: true },
    type: { type: String, enum: RECOGNITION_TYPES, required: true },
    title: { type: String, required: true },
    description: { type: String },
    awardedDate: { type: Date, default: Date.now },
    awardedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    hoursAtAward: { type: Number },
    certificateUrl: { type: String },
    isPublic: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

volunteerRecognitionSchema.index({ volunteerId: 1, awardedDate: -1 });

const DDDVolunteerRecognition =
  mongoose.models.DDDVolunteerRecognition ||
  mongoose.model('DDDVolunteerRecognition', volunteerRecognitionSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class VolunteerManager extends BaseDomainModule {
  constructor() {
    super('VolunteerManager', {
      description: 'Volunteer registration, scheduling & recognition',
      version: '1.0.0',
    });
  }

  async initialize() {
    this.log('Volunteer Manager initialised ✓');
    return true;
  }

  /* ── Volunteers ── */
  async listVolunteers(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.category) q.category = filters.category;
    return DDDVolunteer.find(q).sort({ name: 1 }).lean();
  }
  async getVolunteer(id) {
    return DDDVolunteer.findById(id).lean();
  }
  async registerVolunteer(data) {
    if (!data.volunteerCode) data.volunteerCode = `VOL-${Date.now()}`;
    return DDDVolunteer.create(data);
  }
  async updateVolunteer(id, data) {
    return DDDVolunteer.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Shifts ── */
  async listShifts(filters = {}) {
    const q = {};
    if (filters.volunteerId) q.volunteerId = filters.volunteerId;
    if (filters.status) q.status = filters.status;
    return DDDVolunteerShift.find(q).sort({ scheduledDate: -1 }).limit(200).lean();
  }
  async scheduleShift(data) {
    if (!data.shiftCode) data.shiftCode = `VSHIFT-${Date.now()}`;
    return DDDVolunteerShift.create(data);
  }
  async completeShift(id, details) {
    return DDDVolunteerShift.findByIdAndUpdate(
      id,
      { ...details, status: 'completed', actualEndTime: new Date() },
      { new: true }
    );
  }

  /* ── Skills ── */
  async listSkills(volunteerId) {
    return DDDVolunteerSkill.find({ volunteerId }).lean();
  }
  async addSkill(data) {
    return DDDVolunteerSkill.create(data);
  }

  /* ── Recognition ── */
  async listRecognitions(volunteerId) {
    const q = volunteerId ? { volunteerId } : {};
    return DDDVolunteerRecognition.find(q).sort({ awardedDate: -1 }).lean();
  }
  async grantRecognition(data) {
    if (!data.recognitionCode) data.recognitionCode = `VREC-${Date.now()}`;
    return DDDVolunteerRecognition.create(data);
  }

  /* ── Analytics ── */
  async getVolunteerAnalytics() {
    const [volunteers, shifts, skills, recognitions] = await Promise.all([
      DDDVolunteer.countDocuments(),
      DDDVolunteerShift.countDocuments(),
      DDDVolunteerSkill.countDocuments(),
      DDDVolunteerRecognition.countDocuments(),
    ]);
    const activeVolunteers = await DDDVolunteer.countDocuments({
      status: 'active',
      isActive: true,
    });
    return { volunteers, shifts, skills, recognitions, activeVolunteers };
  }

  async healthCheck() {
    const [total, active] = await Promise.all([
      DDDVolunteer.countDocuments(),
      DDDVolunteer.countDocuments({ status: 'active' }),
    ]);
    return { status: 'healthy', totalVolunteers: total, activeVolunteers: active };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createVolunteerManagerRouter() {
  const router = Router();
  const svc = new VolunteerManager();

  router.get('/volunteers', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listVolunteers(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/volunteers/:id', async (req, res) => {
    try {
      const d = await svc.getVolunteer(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/volunteers', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.registerVolunteer(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/volunteers/shifts/list', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listShifts(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/volunteers/shifts', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.scheduleShift(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/volunteers/:id/skills', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listSkills(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/volunteers/skills', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addSkill(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/volunteers/recognitions/list', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRecognitions(req.query.volunteerId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/volunteers/recognitions', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.grantRecognition(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/volunteers/analytics/summary', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getVolunteerAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/volunteers/health/check', async (_req, res) => {
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
  VolunteerManager,
  DDDVolunteer,
  DDDVolunteerShift,
  DDDVolunteerSkill,
  DDDVolunteerRecognition,
  VOLUNTEER_STATUSES,
  VOLUNTEER_CATEGORIES,
  SHIFT_STATUSES,
  SKILL_LEVELS,
  RECOGNITION_TYPES,
  AVAILABILITY_PATTERNS,
  BUILTIN_VOLUNTEER_ROLES,
  createVolunteerManagerRouter,
};
