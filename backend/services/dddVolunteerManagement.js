'use strict';
/**
 * DDD Volunteer Management Service
 * ──────────────────────────────────
 * Phase 36 – Community Engagement & Outreach (Module 1/4)
 *
 * Manages volunteer recruitment, onboarding, scheduling, hours tracking,
 * skills matching, recognition programs, and volunteer retention analytics.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const VOLUNTEER_ROLES = [
  'therapy_assistant',
  'activity_facilitator',
  'transport_aide',
  'administrative_support',
  'peer_mentor',
  'interpreter',
  'event_coordinator',
  'reception_greeter',
  'tech_support',
  'fundraiser',
  'advocacy_champion',
  'research_assistant',
];

const VOLUNTEER_STATUSES = [
  'applicant',
  'screening',
  'background_check',
  'onboarding',
  'active',
  'on_leave',
  'suspended',
  'inactive',
  'alumni',
  'terminated',
];

const SKILL_CATEGORIES = [
  'clinical_support',
  'communication',
  'technology',
  'creative_arts',
  'physical_activity',
  'sign_language',
  'braille',
  'counseling',
  'administration',
  'event_planning',
  'fundraising',
  'teaching',
];

const SHIFT_TYPES = [
  'morning',
  'afternoon',
  'evening',
  'weekend_morning',
  'weekend_afternoon',
  'holiday',
  'on_call',
  'special_event',
  'remote',
  'flexible',
];

const RECOGNITION_TYPES = [
  'hours_milestone',
  'service_award',
  'peer_nomination',
  'excellence_award',
  'innovation_award',
  'leadership_award',
  'long_service',
  'community_impact',
  'department_star',
  'annual_gala',
];

const TRAINING_MODULES = [
  'orientation',
  'disability_awareness',
  'safety_protocols',
  'communication_skills',
  'confidentiality',
  'first_aid',
  'de_escalation',
  'cultural_competency',
  'infection_control',
  'emergency_procedures',
];

const BUILTIN_VOLUNTEER_CONFIGS = [
  {
    code: 'VOL_THERAPY',
    label: 'Therapy Assistant Volunteer',
    role: 'therapy_assistant',
    minHours: 4,
    requiredTraining: ['orientation', 'safety_protocols'],
  },
  {
    code: 'VOL_MENTOR',
    label: 'Peer Mentor',
    role: 'peer_mentor',
    minHours: 2,
    requiredTraining: ['orientation', 'communication_skills'],
  },
  {
    code: 'VOL_ADMIN',
    label: 'Administrative Volunteer',
    role: 'administrative_support',
    minHours: 3,
    requiredTraining: ['orientation', 'confidentiality'],
  },
  {
    code: 'VOL_EVENT',
    label: 'Event Coordinator',
    role: 'event_coordinator',
    minHours: 6,
    requiredTraining: ['orientation', 'safety_protocols'],
  },
  {
    code: 'VOL_TRANS',
    label: 'Transport Aide',
    role: 'transport_aide',
    minHours: 4,
    requiredTraining: ['orientation', 'first_aid'],
  },
  {
    code: 'VOL_TECH',
    label: 'Tech Support Volunteer',
    role: 'tech_support',
    minHours: 2,
    requiredTraining: ['orientation'],
  },
  {
    code: 'VOL_INTERP',
    label: 'Interpreter Volunteer',
    role: 'interpreter',
    minHours: 2,
    requiredTraining: ['orientation', 'confidentiality'],
  },
  {
    code: 'VOL_FUND',
    label: 'Fundraiser Volunteer',
    role: 'fundraiser',
    minHours: 4,
    requiredTraining: ['orientation'],
  },
  {
    code: 'VOL_RECEP',
    label: 'Reception Greeter',
    role: 'reception_greeter',
    minHours: 3,
    requiredTraining: ['orientation', 'disability_awareness'],
  },
  {
    code: 'VOL_RESEARCH',
    label: 'Research Assistant',
    role: 'research_assistant',
    minHours: 4,
    requiredTraining: ['orientation', 'confidentiality'],
  },
];

/* ═══════════════════ Schemas ═══════════════════ */
const volunteerProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    role: { type: String, enum: VOLUNTEER_ROLES },
    status: { type: String, enum: VOLUNTEER_STATUSES, default: 'applicant' },
    skills: [{ type: String, enum: SKILL_CATEGORIES }],
    availability: [{ type: String, enum: SHIFT_TYPES }],
    startDate: { type: Date },
    backgroundCheckDate: { type: Date },
    backgroundCheckStatus: { type: String, enum: ['pending', 'cleared', 'flagged', 'expired'] },
    emergencyContact: { name: String, phone: String, relationship: String },
    totalHours: { type: Number, default: 0 },
    departmentId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
volunteerProfileSchema.index({ status: 1, role: 1 });
volunteerProfileSchema.index({ email: 1 });

const volunteerShiftSchema = new Schema(
  {
    volunteerId: { type: Schema.Types.ObjectId, ref: 'DDDVolunteerProfile', required: true },
    shiftType: { type: String, enum: SHIFT_TYPES, required: true },
    scheduledDate: { type: Date, required: true },
    startTime: { type: String },
    endTime: { type: String },
    actualStart: { type: Date },
    actualEnd: { type: Date },
    hoursWorked: { type: Number },
    status: {
      type: String,
      enum: ['scheduled', 'checked_in', 'completed', 'no_show', 'cancelled'],
      default: 'scheduled',
    },
    departmentId: { type: Schema.Types.ObjectId },
    supervisorId: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
volunteerShiftSchema.index({ volunteerId: 1, scheduledDate: -1 });
volunteerShiftSchema.index({ status: 1, scheduledDate: 1 });

const volunteerTrainingSchema = new Schema(
  {
    volunteerId: { type: Schema.Types.ObjectId, ref: 'DDDVolunteerProfile', required: true },
    module: { type: String, enum: TRAINING_MODULES, required: true },
    completedAt: { type: Date },
    expiresAt: { type: Date },
    score: { type: Number },
    status: {
      type: String,
      enum: ['assigned', 'in_progress', 'completed', 'expired', 'waived'],
      default: 'assigned',
    },
    trainerId: { type: Schema.Types.ObjectId, ref: 'User' },
    certificateUrl: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
volunteerTrainingSchema.index({ volunteerId: 1, module: 1 });

const volunteerRecognitionSchema = new Schema(
  {
    volunteerId: { type: Schema.Types.ObjectId, ref: 'DDDVolunteerProfile', required: true },
    type: { type: String, enum: RECOGNITION_TYPES, required: true },
    title: { type: String, required: true },
    description: { type: String },
    awardedAt: { type: Date, default: Date.now },
    awardedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    hoursAtAward: { type: Number },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
volunteerRecognitionSchema.index({ volunteerId: 1, type: 1 });
volunteerRecognitionSchema.index({ awardedAt: -1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDVolunteerProfile =
  mongoose.models.DDDVolunteerProfile ||
  mongoose.model('DDDVolunteerProfile', volunteerProfileSchema);
const DDDVolunteerShift =
  mongoose.models.DDDVolunteerShift || mongoose.model('DDDVolunteerShift', volunteerShiftSchema);
const DDDVolunteerTraining =
  mongoose.models.DDDVolunteerTraining ||
  mongoose.model('DDDVolunteerTraining', volunteerTrainingSchema);
const DDDVolunteerRecognition =
  mongoose.models.DDDVolunteerRecognition ||
  mongoose.model('DDDVolunteerRecognition', volunteerRecognitionSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class VolunteerManagement {
  async createVolunteer(data) {
    return DDDVolunteerProfile.create(data);
  }
  async listVolunteers(filter = {}, page = 1, limit = 20) {
    return DDDVolunteerProfile.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateVolunteer(id, data) {
    return DDDVolunteerProfile.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async createShift(data) {
    return DDDVolunteerShift.create(data);
  }
  async listShifts(filter = {}, page = 1, limit = 20) {
    return DDDVolunteerShift.find(filter)
      .sort({ scheduledDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async assignTraining(data) {
    return DDDVolunteerTraining.create(data);
  }
  async listTraining(filter = {}, page = 1, limit = 20) {
    return DDDVolunteerTraining.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async giveRecognition(data) {
    return DDDVolunteerRecognition.create(data);
  }
  async listRecognitions(filter = {}, page = 1, limit = 20) {
    return DDDVolunteerRecognition.find(filter)
      .sort({ awardedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async getVolunteerStats() {
    const [total, active, hoursThisMonth, recognitions] = await Promise.all([
      DDDVolunteerProfile.countDocuments(),
      DDDVolunteerProfile.countDocuments({ status: 'active' }),
      DDDVolunteerShift.countDocuments({ status: 'completed' }),
      DDDVolunteerRecognition.countDocuments(),
    ]);
    return {
      totalVolunteers: total,
      activeVolunteers: active,
      completedShifts: hoursThisMonth,
      totalRecognitions: recognitions,
    };
  }

  async healthCheck() {
    const [profiles, shifts, training, recognitions] = await Promise.all([
      DDDVolunteerProfile.countDocuments(),
      DDDVolunteerShift.countDocuments(),
      DDDVolunteerTraining.countDocuments(),
      DDDVolunteerRecognition.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'VolunteerManagement',
      counts: { profiles, shifts, training, recognitions },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createVolunteerManagementRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new VolunteerManagement();

  router.get('/volunteer-management/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/volunteer-management/volunteers', async (req, res) => {
    try {
      res.status(201).json(await svc.createVolunteer(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/volunteer-management/volunteers', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listVolunteers(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/volunteer-management/volunteers/:id', async (req, res) => {
    try {
      res.json(await svc.updateVolunteer(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/volunteer-management/shifts', async (req, res) => {
    try {
      res.status(201).json(await svc.createShift(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/volunteer-management/shifts', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listShifts(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/volunteer-management/training', async (req, res) => {
    try {
      res.status(201).json(await svc.assignTraining(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/volunteer-management/training', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listTraining(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/volunteer-management/recognitions', async (req, res) => {
    try {
      res.status(201).json(await svc.giveRecognition(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/volunteer-management/recognitions', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listRecognitions(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/volunteer-management/stats', async (_req, res) => {
    try {
      res.json(await svc.getVolunteerStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  VOLUNTEER_ROLES,
  VOLUNTEER_STATUSES,
  SKILL_CATEGORIES,
  SHIFT_TYPES,
  RECOGNITION_TYPES,
  TRAINING_MODULES,
  BUILTIN_VOLUNTEER_CONFIGS,
  DDDVolunteerProfile,
  DDDVolunteerShift,
  DDDVolunteerTraining,
  DDDVolunteerRecognition,
  VolunteerManagement,
  createVolunteerManagementRouter,
};
