/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Safety Manager — Phase 23 · Emergency & Incident Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Safety inspections, hazard tracking, safety policies, compliance,
 * and safety training management for rehabilitation facilities.
 *
 * Aggregates
 *   DDDSafetyInspection  — scheduled / completed safety inspection
 *   DDDHazardReport      — reported hazard with risk assessment
 *   DDDSafetyPolicy      — safety policy / procedure documentation
 *   DDDSafetyTraining    — safety training record / session
 *
 * Canonical links
 *   inspectorId → User
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

const HAZARD_TYPES = [
  'physical',
  'chemical',
  'biological',
  'ergonomic',
  'electrical',
  'fire_hazard',
  'slip_trip_fall',
  'radiation',
  'noise',
  'temperature',
  'structural',
  'equipment',
];

const HAZARD_STATUSES = [
  'reported',
  'under_review',
  'confirmed',
  'mitigated',
  'resolved',
  'monitoring',
  'escalated',
  'closed',
  'reopened',
  'accepted_risk',
];

const INSPECTION_TYPES = [
  'routine',
  'annual',
  'surprise',
  'follow_up',
  'pre_occupancy',
  'post_incident',
  'regulatory',
  'equipment',
  'fire_safety',
  'accessibility',
];

const RISK_LEVELS = [
  'negligible',
  'low',
  'moderate',
  'high',
  'very_high',
  'critical',
  'extreme',
  'imminent_danger',
  'under_assessment',
  'mitigated',
];

const SAFETY_CATEGORIES = [
  'fire_safety',
  'electrical_safety',
  'chemical_safety',
  'infection_control',
  'patient_safety',
  'workplace_safety',
  'equipment_safety',
  'environmental_safety',
  'emergency_preparedness',
  'accessibility_compliance',
];

const TRAINING_TYPES = [
  'orientation',
  'annual_refresher',
  'specialised',
  'drill_based',
  'online_course',
  'hands_on',
  'certification',
  'competency_assessment',
];

/* ── Built-in safety policies ───────────────────────────────────────────── */
const BUILTIN_SAFETY_POLICIES = [
  {
    code: 'SPOL-FIRE',
    name: 'Fire Safety Policy',
    nameAr: 'سياسة السلامة من الحريق',
    category: 'fire_safety',
  },
  {
    code: 'SPOL-ELEC',
    name: 'Electrical Safety Policy',
    nameAr: 'سياسة السلامة الكهربائية',
    category: 'electrical_safety',
  },
  {
    code: 'SPOL-CHEM',
    name: 'Chemical Safety Policy',
    nameAr: 'سياسة السلامة الكيميائية',
    category: 'chemical_safety',
  },
  {
    code: 'SPOL-INF',
    name: 'Infection Control Policy',
    nameAr: 'سياسة مكافحة العدوى',
    category: 'infection_control',
  },
  {
    code: 'SPOL-PAT',
    name: 'Patient Safety Policy',
    nameAr: 'سياسة سلامة المرضى',
    category: 'patient_safety',
  },
  {
    code: 'SPOL-WORK',
    name: 'Workplace Safety Policy',
    nameAr: 'سياسة السلامة المهنية',
    category: 'workplace_safety',
  },
  {
    code: 'SPOL-EQUIP',
    name: 'Equipment Safety Policy',
    nameAr: 'سياسة سلامة المعدات',
    category: 'equipment_safety',
  },
  {
    code: 'SPOL-ENV',
    name: 'Environmental Safety Policy',
    nameAr: 'سياسة السلامة البيئية',
    category: 'environmental_safety',
  },
  {
    code: 'SPOL-EMRG',
    name: 'Emergency Preparedness Policy',
    nameAr: 'سياسة الاستعداد للطوارئ',
    category: 'emergency_preparedness',
  },
  {
    code: 'SPOL-ACC',
    name: 'Accessibility Compliance Policy',
    nameAr: 'سياسة الامتثال لإمكانية الوصول',
    category: 'accessibility_compliance',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Safety Inspection ─────────────────────────────────────────────────── */
const safetyInspectionSchema = new Schema(
  {
    inspectionCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: INSPECTION_TYPES, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'follow_up_required'],
      default: 'scheduled',
    },
    category: { type: String, enum: SAFETY_CATEGORIES },
    locationId: { type: Schema.Types.ObjectId },
    locationDescription: { type: String },
    inspectorId: { type: Schema.Types.ObjectId, ref: 'User' },
    scheduledDate: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    checklist: [
      {
        item: { type: String },
        status: { type: String, enum: ['pass', 'fail', 'na', 'needs_attention'] },
        notes: { type: String },
      },
    ],
    findings: [{ area: String, observation: String, riskLevel: String, recommendation: String }],
    overallScore: { type: Number, min: 0, max: 100 },
    nextInspectionDate: { type: Date },
    attachments: [{ name: String, url: String, type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

safetyInspectionSchema.index({ type: 1, status: 1 });
safetyInspectionSchema.index({ scheduledDate: 1 });

const DDDSafetyInspection =
  mongoose.models.DDDSafetyInspection ||
  mongoose.model('DDDSafetyInspection', safetyInspectionSchema);

/* ── Hazard Report ─────────────────────────────────────────────────────── */
const hazardReportSchema = new Schema(
  {
    hazardCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: HAZARD_TYPES, required: true },
    status: { type: String, enum: HAZARD_STATUSES, default: 'reported' },
    riskLevel: { type: String, enum: RISK_LEVELS },
    locationId: { type: Schema.Types.ObjectId },
    locationDescription: { type: String },
    description: { type: String },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reportedAt: { type: Date, default: Date.now },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    mitigationPlan: { type: String },
    mitigatedAt: { type: Date },
    resolvedAt: { type: Date },
    rootCause: { type: String },
    correctiveActions: [
      { action: String, responsible: String, dueDate: Date, completedDate: Date, status: String },
    ],
    attachments: [{ name: String, url: String, type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

hazardReportSchema.index({ type: 1, status: 1 });
hazardReportSchema.index({ riskLevel: 1 });

const DDDHazardReport =
  mongoose.models.DDDHazardReport || mongoose.model('DDDHazardReport', hazardReportSchema);

/* ── Safety Policy ─────────────────────────────────────────────────────── */
const safetyPolicySchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    category: { type: String, enum: SAFETY_CATEGORIES, required: true },
    content: { type: String },
    procedures: [{ step: Number, title: String, description: String }],
    version: { type: Number, default: 1 },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    effectiveDate: { type: Date },
    nextReviewDate: { type: Date },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDSafetyPolicy =
  mongoose.models.DDDSafetyPolicy || mongoose.model('DDDSafetyPolicy', safetyPolicySchema);

/* ── Safety Training ───────────────────────────────────────────────────── */
const safetyTrainingSchema = new Schema(
  {
    trainingCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: TRAINING_TYPES, required: true },
    category: { type: String, enum: SAFETY_CATEGORIES },
    description: { type: String },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    status: {
      type: String,
      enum: ['planned', 'scheduled', 'in_progress', 'completed', 'cancelled'],
    },
    instructor: { type: String },
    participants: [{ userId: Schema.Types.ObjectId, name: String, passed: Boolean, score: Number }],
    maxParticipants: { type: Number },
    duration: { type: Number },
    passingScore: { type: Number, default: 70 },
    materials: [{ name: String, url: String }],
    certificationRequired: { type: Boolean, default: false },
    validityMonths: { type: Number, default: 12 },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

safetyTrainingSchema.index({ type: 1, status: 1 });
safetyTrainingSchema.index({ scheduledDate: 1 });

const DDDSafetyTraining =
  mongoose.models.DDDSafetyTraining || mongoose.model('DDDSafetyTraining', safetyTrainingSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class SafetyManager extends BaseDomainModule {
  constructor() {
    super('SafetyManager', {
      description: 'Safety inspections, hazard tracking & policy management',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedPolicies();
    this.log('Safety Manager initialised ✓');
    return true;
  }

  async _seedPolicies() {
    for (const p of BUILTIN_SAFETY_POLICIES) {
      const exists = await DDDSafetyPolicy.findOne({ code: p.code }).lean();
      if (!exists) await DDDSafetyPolicy.create(p);
    }
  }

  /* ── Inspections ── */
  async listInspections(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDSafetyInspection.find(q).sort({ scheduledDate: -1 }).lean();
  }
  async getInspection(id) {
    return DDDSafetyInspection.findById(id).lean();
  }
  async scheduleInspection(data) {
    if (!data.inspectionCode) data.inspectionCode = `INSP-${Date.now()}`;
    return DDDSafetyInspection.create(data);
  }
  async updateInspection(id, data) {
    return DDDSafetyInspection.findByIdAndUpdate(id, data, { new: true });
  }
  async completeInspection(id, results) {
    return DDDSafetyInspection.findByIdAndUpdate(
      id,
      { ...results, status: 'completed', completedAt: new Date() },
      { new: true }
    );
  }

  /* ── Hazards ── */
  async listHazards(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.riskLevel) q.riskLevel = filters.riskLevel;
    return DDDHazardReport.find(q).sort({ reportedAt: -1 }).lean();
  }
  async reportHazard(data) {
    if (!data.hazardCode) data.hazardCode = `HAZ-${Date.now()}`;
    return DDDHazardReport.create(data);
  }
  async updateHazard(id, data) {
    return DDDHazardReport.findByIdAndUpdate(id, data, { new: true });
  }
  async resolveHazard(id, rootCause) {
    return DDDHazardReport.findByIdAndUpdate(
      id,
      { status: 'resolved', resolvedAt: new Date(), rootCause },
      { new: true }
    );
  }

  /* ── Policies ── */
  async listPolicies(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDSafetyPolicy.find(q).sort({ name: 1 }).lean();
  }
  async getPolicy(id) {
    return DDDSafetyPolicy.findById(id).lean();
  }
  async createPolicy(data) {
    return DDDSafetyPolicy.create(data);
  }
  async updatePolicy(id, data) {
    return DDDSafetyPolicy.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Training ── */
  async listTrainings(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDSafetyTraining.find(q).sort({ scheduledDate: -1 }).lean();
  }
  async scheduleTraining(data) {
    if (!data.trainingCode) data.trainingCode = `STRAIN-${Date.now()}`;
    return DDDSafetyTraining.create(data);
  }
  async updateTraining(id, data) {
    return DDDSafetyTraining.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Analytics ── */
  async getSafetyAnalytics() {
    const [inspections, hazards, policies, trainings] = await Promise.all([
      DDDSafetyInspection.countDocuments(),
      DDDHazardReport.countDocuments(),
      DDDSafetyPolicy.countDocuments(),
      DDDSafetyTraining.countDocuments(),
    ]);
    const openHazards = await DDDHazardReport.countDocuments({
      status: { $in: ['reported', 'under_review', 'confirmed'] },
    });
    const criticalHazards = await DDDHazardReport.countDocuments({
      riskLevel: { $in: ['critical', 'extreme', 'imminent_danger'] },
    });
    return { inspections, hazards, openHazards, criticalHazards, policies, trainings };
  }

  async healthCheck() {
    const [activePolicies, openHazards] = await Promise.all([
      DDDSafetyPolicy.countDocuments({ isActive: true }),
      DDDHazardReport.countDocuments({
        status: { $in: ['reported', 'under_review', 'confirmed', 'escalated'] },
      }),
    ]);
    return { status: 'healthy', activePolicies, openHazards };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createSafetyManagerRouter() {
  const router = Router();
  const svc = new SafetyManager();

  /* Inspections */
  router.get('/safety/inspections', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listInspections(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/safety/inspections/:id', async (req, res) => {
    try {
      const d = await svc.getInspection(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/safety/inspections', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.scheduleInspection(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/safety/inspections/:id/complete', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.completeInspection(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Hazards */
  router.get('/safety/hazards', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listHazards(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/safety/hazards', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.reportHazard(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/safety/hazards/:id/resolve', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.resolveHazard(req.params.id, req.body.rootCause) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Policies */
  router.get('/safety/policies', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPolicies(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/safety/policies/:id', async (req, res) => {
    try {
      const d = await svc.getPolicy(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/safety/policies', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPolicy(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Training */
  router.get('/safety/trainings', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTrainings(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/safety/trainings', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.scheduleTraining(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/safety/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getSafetyAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/safety/health', async (_req, res) => {
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
  SafetyManager,
  DDDSafetyInspection,
  DDDHazardReport,
  DDDSafetyPolicy,
  DDDSafetyTraining,
  HAZARD_TYPES,
  HAZARD_STATUSES,
  INSPECTION_TYPES,
  RISK_LEVELS,
  SAFETY_CATEGORIES,
  TRAINING_TYPES,
  BUILTIN_SAFETY_POLICIES,
  createSafetyManagerRouter,
};
