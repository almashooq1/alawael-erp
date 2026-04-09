'use strict';
/**
 * DDD Inspection Tracker Service
 * ───────────────────────────────
 * Phase 30 – Regulatory Compliance & Accreditation (Module 2/4)
 *
 * Tracks regulatory inspections, government audits, facility walkthroughs,
 * compliance rounds, and follow-up action management.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const INSPECTION_TYPES = [
  'regulatory',
  'government',
  'internal_audit',
  'external_audit',
  'fire_safety',
  'infection_control',
  'pharmacy',
  'environment_of_care',
  'food_safety',
  'radiation_safety',
  'laboratory',
  'mock_inspection',
];

const INSPECTION_STATUSES = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'postponed',
  'follow_up_required',
  'closed',
  'partially_complete',
  'overdue',
  'rescheduled',
];

const INSPECTOR_TYPES = [
  'government_official',
  'accreditation_surveyor',
  'internal_auditor',
  'external_consultant',
  'regulatory_body',
  'fire_department',
  'health_authority',
  'environmental_agency',
  'insurance_inspector',
  'peer_reviewer',
];

const COMPLIANCE_LEVELS = [
  'full_compliance',
  'substantial_compliance',
  'partial_compliance',
  'non_compliance',
  'critical_non_compliance',
  'not_applicable',
  'exceeds_requirements',
  'pending_review',
  'conditionally_compliant',
  'improvement_needed',
];

const AREA_CATEGORIES = [
  'clinical_areas',
  'patient_rooms',
  'operating_rooms',
  'emergency_department',
  'pharmacy',
  'laboratory',
  'kitchen_cafeteria',
  'storage',
  'administrative',
  'common_areas',
  'mechanical_rooms',
  'outdoor',
];

const FOLLOW_UP_PRIORITIES = [
  'immediate',
  'urgent',
  'high',
  'medium',
  'low',
  'routine',
  'scheduled',
  'monitoring',
  'informational',
  'deferred',
];

const BUILTIN_INSPECTION_TEMPLATES = [
  { code: 'FIRE_SAFETY', name: 'Fire Safety Inspection', frequency: 'monthly' },
  { code: 'INFECTION_CTL', name: 'Infection Control Rounds', frequency: 'weekly' },
  { code: 'ENV_CARE', name: 'Environment of Care Rounds', frequency: 'monthly' },
  { code: 'PHARMACY_INS', name: 'Pharmacy Inspection', frequency: 'quarterly' },
  { code: 'FOOD_SAFETY', name: 'Food Safety Audit', frequency: 'monthly' },
  { code: 'RAD_SAFETY', name: 'Radiation Safety Inspection', frequency: 'annual' },
  { code: 'WASTE_MGMT', name: 'Waste Management Audit', frequency: 'quarterly' },
  { code: 'EQUIP_SAFETY', name: 'Equipment Safety Check', frequency: 'monthly' },
  { code: 'PATIENT_SAFE', name: 'Patient Safety Walkthrough', frequency: 'weekly' },
  { code: 'GOV_INSPECT', name: 'Government Regulatory Inspection', frequency: 'annual' },
];

/* ═══════════════════ Schemas ═══════════════════ */
const inspectionSchema = new Schema(
  {
    type: { type: String, enum: INSPECTION_TYPES, required: true },
    status: { type: String, enum: INSPECTION_STATUSES, default: 'scheduled' },
    title: { type: String, required: true },
    scheduledDate: { type: Date, required: true },
    actualDate: { type: Date },
    completedDate: { type: Date },
    inspectorType: { type: String, enum: INSPECTOR_TYPES },
    inspectorName: { type: String },
    inspectorOrg: { type: String },
    department: { type: String },
    areaCategory: { type: String, enum: AREA_CATEGORIES },
    overallResult: { type: String, enum: COMPLIANCE_LEVELS },
    score: { type: Number, min: 0, max: 100 },
    leaderId: { type: Schema.Types.ObjectId, ref: 'User' },
    reportUrl: { type: String },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
inspectionSchema.index({ type: 1, status: 1 });
inspectionSchema.index({ scheduledDate: 1 });

const inspectionItemSchema = new Schema(
  {
    inspectionId: { type: Schema.Types.ObjectId, ref: 'DDDInspection', required: true },
    standardRef: { type: String },
    checklistItem: { type: String, required: true },
    complianceLevel: { type: String, enum: COMPLIANCE_LEVELS },
    observation: { type: String },
    evidenceUrls: [{ type: String }],
    requiresAction: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
inspectionItemSchema.index({ inspectionId: 1 });

const followUpActionSchema = new Schema(
  {
    inspectionId: { type: Schema.Types.ObjectId, ref: 'DDDInspection', required: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'DDDInspectionItem' },
    priority: { type: String, enum: FOLLOW_UP_PRIORITIES, default: 'medium' },
    description: { type: String, required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'overdue', 'cancelled'],
      default: 'open',
    },
    completedDate: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    evidence: [{ type: String }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
followUpActionSchema.index({ inspectionId: 1, status: 1 });
followUpActionSchema.index({ dueDate: 1, status: 1 });

const inspectionScheduleSchema = new Schema(
  {
    templateCode: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, enum: INSPECTION_TYPES },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semi_annual', 'annual'],
    },
    nextDueDate: { type: Date },
    department: { type: String },
    areaCategory: { type: String, enum: AREA_CATEGORIES },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    lastCompleted: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
inspectionScheduleSchema.index({ isActive: 1, nextDueDate: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDInspection =
  mongoose.models.DDDInspection || mongoose.model('DDDInspection', inspectionSchema);
const DDDInspectionItem =
  mongoose.models.DDDInspectionItem || mongoose.model('DDDInspectionItem', inspectionItemSchema);
const DDDFollowUpAction =
  mongoose.models.DDDFollowUpAction || mongoose.model('DDDFollowUpAction', followUpActionSchema);
const DDDInspectionSchedule =
  mongoose.models.DDDInspectionSchedule ||
  mongoose.model('DDDInspectionSchedule', inspectionScheduleSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class InspectionTracker {
  /* ── Inspections ── */
  async createInspection(data) {
    return DDDInspection.create(data);
  }
  async listInspections(filter = {}, page = 1, limit = 20) {
    return DDDInspection.find(filter)
      .sort({ scheduledDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async getInspectionById(id) {
    return DDDInspection.findById(id).lean();
  }
  async updateInspection(id, data) {
    return DDDInspection.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  /* ── Items ── */
  async createItem(data) {
    return DDDInspectionItem.create(data);
  }
  async listItems(inspectionId) {
    return DDDInspectionItem.find({ inspectionId }).lean();
  }

  /* ── Follow-Up Actions ── */
  async createFollowUp(data) {
    return DDDFollowUpAction.create(data);
  }
  async listFollowUps(filter = {}, page = 1, limit = 20) {
    return DDDFollowUpAction.find(filter)
      .sort({ dueDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateFollowUp(id, data) {
    return DDDFollowUpAction.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  /* ── Schedules ── */
  async createSchedule(data) {
    return DDDInspectionSchedule.create(data);
  }
  async listSchedules(filter = {}) {
    return DDDInspectionSchedule.find(filter).sort({ nextDueDate: 1 }).lean();
  }

  /* ── Analytics ── */
  async getComplianceSummary() {
    return DDDInspection.aggregate([
      { $match: { overallResult: { $ne: null } } },
      { $group: { _id: '$overallResult', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }
  async getOverdueFollowUps() {
    return DDDFollowUpAction.find({
      status: { $in: ['open', 'in_progress'] },
      dueDate: { $lt: new Date() },
    })
      .sort({ dueDate: 1 })
      .lean();
  }

  /* ── Health ── */
  async healthCheck() {
    const [inspections, items, followUps, schedules] = await Promise.all([
      DDDInspection.countDocuments(),
      DDDInspectionItem.countDocuments(),
      DDDFollowUpAction.countDocuments(),
      DDDInspectionSchedule.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'InspectionTracker',
      counts: { inspections, items, followUps, schedules },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createInspectionTrackerRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new InspectionTracker();

  router.get('/inspection-tracker/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/inspection-tracker/inspections', async (req, res) => {
    try {
      res.status(201).json(await svc.createInspection(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/inspection-tracker/inspections', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listInspections(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/inspection-tracker/inspections/:id', async (req, res) => {
    try {
      res.json(await svc.getInspectionById(req.params.id));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/inspection-tracker/inspections/:id', async (req, res) => {
    try {
      res.json(await svc.updateInspection(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/inspection-tracker/items', async (req, res) => {
    try {
      res.status(201).json(await svc.createItem(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/inspection-tracker/inspections/:id/items', async (req, res) => {
    try {
      res.json(await svc.listItems(req.params.id));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/inspection-tracker/follow-ups', async (req, res) => {
    try {
      res.status(201).json(await svc.createFollowUp(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/inspection-tracker/follow-ups', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listFollowUps(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/inspection-tracker/follow-ups/:id', async (req, res) => {
    try {
      res.json(await svc.updateFollowUp(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/inspection-tracker/schedules', async (req, res) => {
    try {
      res.status(201).json(await svc.createSchedule(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/inspection-tracker/schedules', async (req, res) => {
    try {
      res.json(await svc.listSchedules(req.query));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/inspection-tracker/stats', async (_req, res) => {
    try {
      res.json(await svc.getComplianceSummary());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/inspection-tracker/overdue', async (_req, res) => {
    try {
      res.json(await svc.getOverdueFollowUps());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  INSPECTION_TYPES,
  INSPECTION_STATUSES,
  INSPECTOR_TYPES,
  COMPLIANCE_LEVELS,
  AREA_CATEGORIES,
  FOLLOW_UP_PRIORITIES,
  BUILTIN_INSPECTION_TEMPLATES,
  DDDInspection,
  DDDInspectionItem,
  DDDFollowUpAction,
  DDDInspectionSchedule,
  InspectionTracker,
  createInspectionTrackerRouter,
};
