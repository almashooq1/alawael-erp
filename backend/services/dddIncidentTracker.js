/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Incident Tracker — Phase 23 · Emergency & Incident Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Incident reporting, classification, investigation, root cause analysis,
 * corrective actions, and trend analytics for all safety & clinical incidents.
 *
 * Aggregates
 *   DDDIncident           — reported incident with full lifecycle
 *   DDDIncidentCategory   — incident classification taxonomy
 *   DDDInvestigation      — formal investigation linked to incident
 *   DDDCorrectiveActionPlan — corrective / preventive actions
 *
 * Canonical links
 *   reportedBy    → User
 *   beneficiaryId → Beneficiary
 *   locationId    → DDDRoom / DDDBuilding
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

const INCIDENT_TYPES = [
  'patient_fall',
  'medication_error',
  'equipment_failure',
  'workplace_injury',
  'clinical_error',
  'security_breach',
  'fire_alarm',
  'utility_failure',
  'behavioral_incident',
  'elopement',
  'near_miss',
  'adverse_event',
];

const INCIDENT_STATUSES = [
  'reported',
  'acknowledged',
  'under_investigation',
  'investigation_complete',
  'corrective_action',
  'resolved',
  'closed',
  'reopened',
  'escalated',
  'archived',
];

const SEVERITY_LEVELS = [
  'insignificant',
  'minor',
  'moderate',
  'major',
  'severe',
  'critical',
  'catastrophic',
  'sentinel',
  'near_miss',
  'no_harm',
  'temporary_harm',
  'permanent_harm',
];

const INVESTIGATION_STATUSES = [
  'not_started',
  'in_progress',
  'evidence_gathering',
  'analysis',
  'findings_drafted',
  'review',
  'completed',
  'approved',
  'rejected',
  'closed',
];

const CORRECTIVE_ACTION_STATUSES = [
  'proposed',
  'approved',
  'in_progress',
  'implemented',
  'verified',
  'effective',
  'ineffective',
  'closed',
  'deferred',
  'cancelled',
];

const ROOT_CAUSE_CATEGORIES = [
  'human_factor',
  'process_failure',
  'equipment_malfunction',
  'communication_breakdown',
  'training_gap',
  'environmental_factor',
  'policy_gap',
  'resource_shortage',
  'system_error',
  'supervision_lapse',
  'documentation_error',
  'medication_related',
];

/* ── Built-in incident categories ───────────────────────────────────────── */
const BUILTIN_INCIDENT_CATEGORIES = [
  {
    code: 'ICAT-FALL',
    name: 'Patient Falls',
    nameAr: 'سقوط المرضى',
    severity: 'major',
    requiresInvestigation: true,
  },
  {
    code: 'ICAT-MED',
    name: 'Medication Events',
    nameAr: 'أحداث الأدوية',
    severity: 'major',
    requiresInvestigation: true,
  },
  {
    code: 'ICAT-EQUIP',
    name: 'Equipment Failures',
    nameAr: 'أعطال المعدات',
    severity: 'moderate',
    requiresInvestigation: false,
  },
  {
    code: 'ICAT-WORK',
    name: 'Workplace Injuries',
    nameAr: 'إصابات العمل',
    severity: 'major',
    requiresInvestigation: true,
  },
  {
    code: 'ICAT-CLINICAL',
    name: 'Clinical Errors',
    nameAr: 'أخطاء سريرية',
    severity: 'severe',
    requiresInvestigation: true,
  },
  {
    code: 'ICAT-SECURITY',
    name: 'Security Incidents',
    nameAr: 'حوادث أمنية',
    severity: 'moderate',
    requiresInvestigation: true,
  },
  {
    code: 'ICAT-BEHAVIOR',
    name: 'Behavioral Incidents',
    nameAr: 'حوادث سلوكية',
    severity: 'moderate',
    requiresInvestigation: false,
  },
  {
    code: 'ICAT-ELOP',
    name: 'Elopement / Wandering',
    nameAr: 'هروب / تجول',
    severity: 'severe',
    requiresInvestigation: true,
  },
  {
    code: 'ICAT-NEAR',
    name: 'Near Misses',
    nameAr: 'حوادث وشيكة',
    severity: 'minor',
    requiresInvestigation: false,
  },
  {
    code: 'ICAT-ENV',
    name: 'Environmental Hazards',
    nameAr: 'مخاطر بيئية',
    severity: 'moderate',
    requiresInvestigation: false,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Incident ──────────────────────────────────────────────────────────── */
const incidentSchema = new Schema(
  {
    incidentCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: INCIDENT_TYPES, required: true },
    status: { type: String, enum: INCIDENT_STATUSES, default: 'reported' },
    severity: { type: String, enum: SEVERITY_LEVELS, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'DDDIncidentCategory' },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportedAt: { type: Date, default: Date.now },
    occurredAt: { type: Date, required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    locationId: { type: Schema.Types.ObjectId },
    locationType: { type: String, enum: ['room', 'building', 'floor', 'external'] },
    locationDescription: { type: String },
    witnesses: [{ userId: Schema.Types.ObjectId, name: String, statement: String }],
    immediateActions: { type: String },
    rootCauses: [{ type: String, enum: ROOT_CAUSE_CATEGORIES }],
    attachments: [{ fileName: String, filePath: String, uploadedAt: Date }],
    investigationId: { type: Schema.Types.ObjectId, ref: 'DDDInvestigation' },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isAnonymous: { type: Boolean, default: false },
    isNotifiable: { type: Boolean, default: false },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

incidentSchema.index({ type: 1, status: 1 });
incidentSchema.index({ severity: 1, reportedAt: -1 });
incidentSchema.index({ beneficiaryId: 1 });

const DDDIncident = mongoose.models.DDDIncident || mongoose.model('DDDIncident', incidentSchema);

/* ── Incident Category ─────────────────────────────────────────────────── */
const incidentCategorySchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    severity: { type: String, enum: SEVERITY_LEVELS },
    requiresInvestigation: { type: Boolean, default: false },
    parentId: { type: Schema.Types.ObjectId, ref: 'DDDIncidentCategory', default: null },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDIncidentCategory =
  mongoose.models.DDDIncidentCategory ||
  mongoose.model('DDDIncidentCategory', incidentCategorySchema);

/* ── Investigation ─────────────────────────────────────────────────────── */
const investigationSchema = new Schema(
  {
    investigationCode: { type: String, required: true, unique: true },
    incidentId: { type: Schema.Types.ObjectId, ref: 'DDDIncident', required: true },
    status: { type: String, enum: INVESTIGATION_STATUSES, default: 'not_started' },
    leadInvestigator: { type: Schema.Types.ObjectId, ref: 'User' },
    teamMembers: [{ userId: Schema.Types.ObjectId, role: String }],
    methodology: {
      type: String,
      enum: [
        'root_cause_analysis',
        'fishbone',
        'five_whys',
        'fault_tree',
        'swiss_cheese',
        'timeline_analysis',
      ],
    },
    findings: { type: String },
    rootCauses: [{ category: String, description: String, evidence: String }],
    recommendations: [
      { action: String, priority: String, assignee: Schema.Types.ObjectId, deadline: Date },
    ],
    startedAt: { type: Date },
    completedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

investigationSchema.index({ incidentId: 1 });
investigationSchema.index({ status: 1 });

const DDDInvestigation =
  mongoose.models.DDDInvestigation || mongoose.model('DDDInvestigation', investigationSchema);

/* ── Corrective Action Plan ────────────────────────────────────────────── */
const correctiveActionPlanSchema = new Schema(
  {
    actionCode: { type: String, required: true, unique: true },
    incidentId: { type: Schema.Types.ObjectId, ref: 'DDDIncident' },
    investigationId: { type: Schema.Types.ObjectId, ref: 'DDDInvestigation' },
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ['corrective', 'preventive', 'both'], default: 'corrective' },
    status: { type: String, enum: CORRECTIVE_ACTION_STATUSES, default: 'proposed' },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: { type: Date },
    implementedAt: { type: Date },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    effectivenessReview: { type: String },
    effectivenessDate: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

correctiveActionPlanSchema.index({ incidentId: 1 });
correctiveActionPlanSchema.index({ status: 1, dueDate: 1 });

const DDDCorrectiveActionPlan =
  mongoose.models.DDDCorrectiveActionPlan ||
  mongoose.model('DDDCorrectiveActionPlan', correctiveActionPlanSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class IncidentTracker extends BaseDomainModule {
  constructor() {
    super('IncidentTracker', {
      description: 'Incident reporting, investigation & corrective actions',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedCategories();
    this.log('Incident Tracker initialised ✓');
    return true;
  }

  async _seedCategories() {
    for (const c of BUILTIN_INCIDENT_CATEGORIES) {
      const exists = await DDDIncidentCategory.findOne({ code: c.code }).lean();
      if (!exists) await DDDIncidentCategory.create(c);
    }
  }

  /* ── Incidents ── */
  async listIncidents(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.severity) q.severity = filters.severity;
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    return DDDIncident.find(q).sort({ reportedAt: -1 }).limit(100).lean();
  }
  async getIncident(id) {
    return DDDIncident.findById(id).lean();
  }
  async reportIncident(data) {
    if (!data.incidentCode) data.incidentCode = `INC-${Date.now()}`;
    return DDDIncident.create(data);
  }
  async updateIncident(id, data) {
    return DDDIncident.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async resolveIncident(id, userId) {
    return DDDIncident.findByIdAndUpdate(
      id,
      { status: 'resolved', resolvedAt: new Date(), resolvedBy: userId },
      { new: true }
    );
  }
  async searchIncidents(query) {
    return DDDIncident.find({ title: { $regex: query, $options: 'i' } })
      .sort({ reportedAt: -1 })
      .limit(50)
      .lean();
  }

  /* ── Categories ── */
  async listCategories() {
    return DDDIncidentCategory.find({ isActive: true }).sort({ name: 1 }).lean();
  }
  async createCategory(data) {
    return DDDIncidentCategory.create(data);
  }

  /* ── Investigations ── */
  async listInvestigations(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.incidentId) q.incidentId = filters.incidentId;
    return DDDInvestigation.find(q).sort({ createdAt: -1 }).lean();
  }
  async createInvestigation(data) {
    if (!data.investigationCode) data.investigationCode = `INV-${Date.now()}`;
    return DDDInvestigation.create(data);
  }
  async updateInvestigation(id, data) {
    return DDDInvestigation.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Corrective Actions ── */
  async listCorrectiveActions(filters = {}) {
    const q = {};
    if (filters.incidentId) q.incidentId = filters.incidentId;
    if (filters.status) q.status = filters.status;
    return DDDCorrectiveActionPlan.find(q).sort({ dueDate: 1 }).lean();
  }
  async createCorrectiveAction(data) {
    if (!data.actionCode) data.actionCode = `CAP-${Date.now()}`;
    return DDDCorrectiveActionPlan.create(data);
  }
  async updateCorrectiveAction(id, data) {
    return DDDCorrectiveActionPlan.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Analytics ── */
  async getIncidentAnalytics() {
    const [incidents, investigations, actions, categories] = await Promise.all([
      DDDIncident.countDocuments(),
      DDDInvestigation.countDocuments(),
      DDDCorrectiveActionPlan.countDocuments(),
      DDDIncidentCategory.countDocuments(),
    ]);
    const open = await DDDIncident.countDocuments({
      status: { $nin: ['resolved', 'closed', 'archived'] },
    });
    return {
      incidents,
      openIncidents: open,
      investigations,
      correctiveActions: actions,
      categories,
    };
  }

  async healthCheck() {
    const [incidents, openIncidents] = await Promise.all([
      DDDIncident.countDocuments(),
      DDDIncident.countDocuments({ status: { $nin: ['resolved', 'closed', 'archived'] } }),
    ]);
    return { status: 'healthy', incidents, openIncidents };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createIncidentTrackerRouter() {
  const router = Router();
  const svc = new IncidentTracker();

  /* Incidents */
  router.get('/incidents', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listIncidents(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/incidents/search', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.searchIncidents(req.query.q || '') });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/incidents/:id', async (req, res) => {
    try {
      const d = await svc.getIncident(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/incidents', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.reportIncident(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/incidents/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateIncident(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/incidents/:id/resolve', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.resolveIncident(req.params.id, req.body.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Categories */
  router.get('/incidents/categories', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listCategories() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Investigations */
  router.get('/incidents/investigations', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listInvestigations(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/incidents/investigations', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createInvestigation(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/incidents/investigations/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateInvestigation(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Corrective Actions */
  router.get('/incidents/corrective-actions', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listCorrectiveActions(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/incidents/corrective-actions', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCorrectiveAction(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/incidents/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getIncidentAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/incidents/health', async (_req, res) => {
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
  IncidentTracker,
  DDDIncident,
  DDDIncidentCategory,
  DDDInvestigation,
  DDDCorrectiveActionPlan,
  INCIDENT_TYPES,
  INCIDENT_STATUSES,
  SEVERITY_LEVELS,
  INVESTIGATION_STATUSES,
  CORRECTIVE_ACTION_STATUSES,
  ROOT_CAUSE_CATEGORIES,
  BUILTIN_INCIDENT_CATEGORIES,
  createIncidentTrackerRouter,
};
