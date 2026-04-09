/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Emergency Response — Phase 23 · Emergency & Incident Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Emergency protocols, response plans, team assignments, drill management,
 * and real-time coordination during emergency situations.
 *
 * Aggregates
 *   DDDEmergencyPlan     — documented emergency response plan
 *   DDDEmergencyEvent    — active / historical emergency event
 *   DDDResponseTeam      — designated emergency response team
 *   DDDEmergencyDrill    — scheduled / completed drill exercise
 *
 * Canonical links
 *   activatedBy → User
 *   locationId  → DDDBuilding / DDDRoom
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

const EMERGENCY_TYPES = [
  'fire',
  'medical_emergency',
  'natural_disaster',
  'active_threat',
  'hazmat_spill',
  'power_outage',
  'water_leak',
  'gas_leak',
  'bomb_threat',
  'pandemic',
  'structural_damage',
  'severe_weather',
];

const EMERGENCY_STATUSES = [
  'standby',
  'activated',
  'responding',
  'contained',
  'resolved',
  'all_clear',
  'deactivated',
  'post_incident_review',
  'archived',
  'drill_active',
];

const RESPONSE_LEVELS = [
  'level_1_minor',
  'level_2_moderate',
  'level_3_major',
  'level_4_severe',
  'level_5_catastrophic',
  'code_blue',
  'code_red',
  'code_silver',
  'code_orange',
  'code_green',
  'lockdown',
  'evacuation',
];

const TEAM_ROLES = [
  'incident_commander',
  'operations_chief',
  'planning_chief',
  'logistics_chief',
  'safety_officer',
  'public_information_officer',
  'medical_lead',
  'evacuation_coordinator',
  'communications_lead',
  'security_lead',
  'facilities_lead',
  'triage_officer',
];

const DRILL_TYPES = [
  'tabletop_exercise',
  'walkthrough',
  'full_scale_drill',
  'functional_exercise',
  'evacuation_drill',
  'fire_drill',
  'lockdown_drill',
  'medical_emergency_drill',
  'hazmat_drill',
  'communication_test',
];

const DRILL_STATUSES = [
  'planned',
  'scheduled',
  'in_progress',
  'completed',
  'evaluated',
  'cancelled',
  'postponed',
  'remediation',
];

/* ── Built-in emergency plans ───────────────────────────────────────────── */
const BUILTIN_EMERGENCY_PLANS = [
  {
    code: 'EPLAN-FIRE',
    name: 'Fire Emergency Plan',
    nameAr: 'خطة طوارئ الحريق',
    type: 'fire',
    responseLevel: 'code_red',
  },
  {
    code: 'EPLAN-MED',
    name: 'Medical Emergency Plan',
    nameAr: 'خطة الطوارئ الطبية',
    type: 'medical_emergency',
    responseLevel: 'code_blue',
  },
  {
    code: 'EPLAN-EVAC',
    name: 'Building Evacuation Plan',
    nameAr: 'خطة إخلاء المبنى',
    type: 'natural_disaster',
    responseLevel: 'evacuation',
  },
  {
    code: 'EPLAN-THREAT',
    name: 'Active Threat Plan',
    nameAr: 'خطة التهديد النشط',
    type: 'active_threat',
    responseLevel: 'code_silver',
  },
  {
    code: 'EPLAN-HAZMAT',
    name: 'Hazmat Response Plan',
    nameAr: 'خطة استجابة المواد الخطرة',
    type: 'hazmat_spill',
    responseLevel: 'code_orange',
  },
  {
    code: 'EPLAN-POWER',
    name: 'Power Failure Plan',
    nameAr: 'خطة انقطاع الكهرباء',
    type: 'power_outage',
    responseLevel: 'level_2_moderate',
  },
  {
    code: 'EPLAN-PANDEMIC',
    name: 'Pandemic Response Plan',
    nameAr: 'خطة استجابة الجائحة',
    type: 'pandemic',
    responseLevel: 'level_3_major',
  },
  {
    code: 'EPLAN-WEATHER',
    name: 'Severe Weather Plan',
    nameAr: 'خطة الطقس القاسي',
    type: 'severe_weather',
    responseLevel: 'level_2_moderate',
  },
  {
    code: 'EPLAN-BOMB',
    name: 'Bomb Threat Plan',
    nameAr: 'خطة تهديد القنابل',
    type: 'bomb_threat',
    responseLevel: 'lockdown',
  },
  {
    code: 'EPLAN-STRUCT',
    name: 'Structural Damage Plan',
    nameAr: 'خطة الأضرار الإنشائية',
    type: 'structural_damage',
    responseLevel: 'level_3_major',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Emergency Plan ────────────────────────────────────────────────────── */
const emergencyPlanSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    type: { type: String, enum: EMERGENCY_TYPES, required: true },
    responseLevel: { type: String, enum: RESPONSE_LEVELS },
    procedures: [{ step: Number, title: String, description: String, responsible: String }],
    evacuationRoutes: [{ routeId: String, description: String, assemblyPoint: String }],
    contactList: [{ name: String, role: String, phone: String, email: String }],
    resources: [{ name: String, quantity: Number, location: String }],
    version: { type: Number, default: 1 },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    nextReviewDate: { type: Date },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDEmergencyPlan =
  mongoose.models.DDDEmergencyPlan || mongoose.model('DDDEmergencyPlan', emergencyPlanSchema);

/* ── Emergency Event ───────────────────────────────────────────────────── */
const emergencyEventSchema = new Schema(
  {
    eventCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: EMERGENCY_TYPES, required: true },
    status: { type: String, enum: EMERGENCY_STATUSES, default: 'activated' },
    responseLevel: { type: String, enum: RESPONSE_LEVELS },
    planId: { type: Schema.Types.ObjectId, ref: 'DDDEmergencyPlan' },
    activatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    activatedAt: { type: Date, default: Date.now },
    locationId: { type: Schema.Types.ObjectId },
    locationDescription: { type: String },
    affectedAreas: [{ type: String }],
    affectedPersons: { type: Number, default: 0 },
    timeline: [
      { timestamp: Date, action: String, performedBy: Schema.Types.ObjectId, notes: String },
    ],
    resolvedAt: { type: Date },
    deactivatedAt: { type: Date },
    deactivatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    afterActionReport: { type: String },
    lessonsLearned: [{ type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

emergencyEventSchema.index({ type: 1, status: 1 });
emergencyEventSchema.index({ activatedAt: -1 });

const DDDEmergencyEvent =
  mongoose.models.DDDEmergencyEvent || mongoose.model('DDDEmergencyEvent', emergencyEventSchema);

/* ── Response Team ─────────────────────────────────────────────────────── */
const responseTeamSchema = new Schema(
  {
    teamCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    emergencyTypes: [{ type: String, enum: EMERGENCY_TYPES }],
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: TEAM_ROLES },
        name: { type: String },
        phone: { type: String },
        isLeader: { type: Boolean, default: false },
        isBackup: { type: Boolean, default: false },
      },
    ],
    isActive: { type: Boolean, default: true },
    lastDrillDate: { type: Date },
    certifications: [{ name: String, expiresAt: Date }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDResponseTeam =
  mongoose.models.DDDResponseTeam || mongoose.model('DDDResponseTeam', responseTeamSchema);

/* ── Emergency Drill ───────────────────────────────────────────────────── */
const emergencyDrillSchema = new Schema(
  {
    drillCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: DRILL_TYPES, required: true },
    status: { type: String, enum: DRILL_STATUSES, default: 'planned' },
    planId: { type: Schema.Types.ObjectId, ref: 'DDDEmergencyPlan' },
    teamId: { type: Schema.Types.ObjectId, ref: 'DDDResponseTeam' },
    scheduledDate: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    duration: { type: Number },
    participants: { type: Number, default: 0 },
    scenario: { type: String },
    objectives: [{ type: String }],
    results: { type: String },
    score: { type: Number, min: 0, max: 100 },
    findings: [{ area: String, observation: String, recommendation: String }],
    conductedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

emergencyDrillSchema.index({ type: 1, status: 1 });
emergencyDrillSchema.index({ scheduledDate: 1 });

const DDDEmergencyDrill =
  mongoose.models.DDDEmergencyDrill || mongoose.model('DDDEmergencyDrill', emergencyDrillSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class EmergencyResponse extends BaseDomainModule {
  constructor() {
    super('EmergencyResponse', {
      description: 'Emergency protocols, response teams & drill management',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedPlans();
    this.log('Emergency Response initialised ✓');
    return true;
  }

  async _seedPlans() {
    for (const p of BUILTIN_EMERGENCY_PLANS) {
      const exists = await DDDEmergencyPlan.findOne({ code: p.code }).lean();
      if (!exists) await DDDEmergencyPlan.create(p);
    }
  }

  /* ── Plans ── */
  async listPlans(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDEmergencyPlan.find(q).sort({ name: 1 }).lean();
  }
  async getPlan(id) {
    return DDDEmergencyPlan.findById(id).lean();
  }
  async createPlan(data) {
    return DDDEmergencyPlan.create(data);
  }
  async updatePlan(id, data) {
    return DDDEmergencyPlan.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Events ── */
  async listEvents(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDEmergencyEvent.find(q).sort({ activatedAt: -1 }).limit(100).lean();
  }
  async activateEmergency(data) {
    if (!data.eventCode) data.eventCode = `EMR-${Date.now()}`;
    data.status = 'activated';
    data.activatedAt = new Date();
    return DDDEmergencyEvent.create(data);
  }
  async updateEvent(id, data) {
    return DDDEmergencyEvent.findByIdAndUpdate(id, data, { new: true });
  }
  async deactivateEmergency(id, userId) {
    return DDDEmergencyEvent.findByIdAndUpdate(
      id,
      { status: 'deactivated', deactivatedAt: new Date(), deactivatedBy: userId },
      { new: true }
    );
  }

  /* ── Teams ── */
  async listTeams() {
    return DDDResponseTeam.find({ isActive: true }).sort({ name: 1 }).lean();
  }
  async createTeam(data) {
    if (!data.teamCode) data.teamCode = `TEAM-${Date.now()}`;
    return DDDResponseTeam.create(data);
  }
  async updateTeam(id, data) {
    return DDDResponseTeam.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Drills ── */
  async listDrills(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDEmergencyDrill.find(q).sort({ scheduledDate: -1 }).lean();
  }
  async scheduleDrill(data) {
    if (!data.drillCode) data.drillCode = `DRILL-${Date.now()}`;
    return DDDEmergencyDrill.create(data);
  }
  async updateDrill(id, data) {
    return DDDEmergencyDrill.findByIdAndUpdate(id, data, { new: true });
  }
  async completeDrill(id, results) {
    return DDDEmergencyDrill.findByIdAndUpdate(
      id,
      { ...results, status: 'completed', completedAt: new Date() },
      { new: true }
    );
  }

  /* ── Analytics ── */
  async getEmergencyAnalytics() {
    const [plans, events, teams, drills] = await Promise.all([
      DDDEmergencyPlan.countDocuments(),
      DDDEmergencyEvent.countDocuments(),
      DDDResponseTeam.countDocuments(),
      DDDEmergencyDrill.countDocuments(),
    ]);
    const activeEvents = await DDDEmergencyEvent.countDocuments({
      status: { $in: ['activated', 'responding', 'contained'] },
    });
    return { plans, events, activeEvents, teams, drills };
  }

  async healthCheck() {
    const [plans, activeEvents] = await Promise.all([
      DDDEmergencyPlan.countDocuments({ isActive: true }),
      DDDEmergencyEvent.countDocuments({ status: { $in: ['activated', 'responding'] } }),
    ]);
    return { status: 'healthy', activePlans: plans, activeEvents };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createEmergencyResponseRouter() {
  const router = Router();
  const svc = new EmergencyResponse();

  /* Plans */
  router.get('/emergency/plans', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPlans(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/emergency/plans/:id', async (req, res) => {
    try {
      const d = await svc.getPlan(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/emergency/plans', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPlan(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Events */
  router.get('/emergency/events', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEvents(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/emergency/events/activate', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.activateEmergency(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/emergency/events/:id/deactivate', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.deactivateEmergency(req.params.id, req.body.userId),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Teams */
  router.get('/emergency/teams', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listTeams() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/emergency/teams', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createTeam(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Drills */
  router.get('/emergency/drills', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDrills(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/emergency/drills', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.scheduleDrill(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/emergency/drills/:id/complete', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.completeDrill(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/emergency/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getEmergencyAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/emergency/health', async (_req, res) => {
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
  EmergencyResponse,
  DDDEmergencyPlan,
  DDDEmergencyEvent,
  DDDResponseTeam,
  DDDEmergencyDrill,
  EMERGENCY_TYPES,
  EMERGENCY_STATUSES,
  RESPONSE_LEVELS,
  TEAM_ROLES,
  DRILL_TYPES,
  DRILL_STATUSES,
  BUILTIN_EMERGENCY_PLANS,
  createEmergencyResponseRouter,
};
