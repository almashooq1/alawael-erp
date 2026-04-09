/**
 * ██████████████████████████████████████████████████████████████
 * ██  DDD Complaint Manager — Phase 27                        ██
 * ██  Handle complaints, grievances & resolution tracking     ██
 * ██████████████████████████████████████████████████████████████
 */

const mongoose = require('mongoose');
const express = require('express');

/* ─── Constants ─── */
const COMPLAINT_TYPES = [
  'service_quality',
  'staff_behavior',
  'wait_time',
  'facility_condition',
  'billing_dispute',
  'privacy_breach',
  'accessibility',
  'communication',
  'treatment_outcome',
  'scheduling',
  'equipment',
  'policy',
];

const COMPLAINT_STATUSES = [
  'received',
  'acknowledged',
  'investigating',
  'in_resolution',
  'resolved',
  'closed',
  'escalated',
  'reopened',
  'withdrawn',
  'rejected',
];

const COMPLAINT_PRIORITIES = [
  'critical',
  'high',
  'medium',
  'low',
  'informational',
  'urgent',
  'safety_related',
  'regulatory',
  'routine',
  'monitoring',
];

const RESOLUTION_TYPES = [
  'apology',
  'corrective_action',
  'policy_change',
  'staff_training',
  'refund',
  'service_recovery',
  'mediation',
  'investigation_finding',
  'no_action_required',
  'referral',
  'compensation',
  'process_improvement',
];

const ESCALATION_LEVELS = [
  'level_1_frontline',
  'level_2_supervisor',
  'level_3_manager',
  'level_4_director',
  'level_5_executive',
  'external_ombudsman',
  'regulatory_body',
  'legal',
  'board_level',
  'ministerial',
];

const GRIEVANCE_CATEGORIES = [
  'clinical_care',
  'administrative',
  'environmental',
  'interpersonal',
  'financial',
  'rights_violation',
  'discrimination',
  'safety',
  'confidentiality',
  'informed_consent',
  'cultural_sensitivity',
  'accessibility',
];

const BUILTIN_RESOLUTION_TEMPLATES = [
  'standard_apology',
  'service_recovery_protocol',
  'billing_adjustment',
  'staff_retraining_plan',
  'facility_improvement_order',
  'accessibility_enhancement',
  'policy_review_action',
  'mediation_referral',
  'external_investigation',
  'patient_advocacy_liaison',
];

/* ─── Schemas ─── */
const complaintSchema = new mongoose.Schema(
  {
    complaintId: { type: String, required: true, unique: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode' },
    type: { type: String, enum: COMPLAINT_TYPES, required: true },
    status: { type: String, enum: COMPLAINT_STATUSES, default: 'received' },
    priority: { type: String, enum: COMPLAINT_PRIORITIES, default: 'medium' },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: GRIEVANCE_CATEGORIES },
    anonymous: { type: Boolean, default: false },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tags: [String],
    attachments: [{ name: String, url: String, type: String }],
    dueDate: { type: Date },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

complaintSchema.index({ complaintId: 1 }, { unique: true });
complaintSchema.index({ beneficiaryId: 1, createdAt: -1 });
complaintSchema.index({ status: 1, priority: 1 });

const resolutionSchema = new mongoose.Schema(
  {
    resolutionId: { type: String, required: true, unique: true },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDComplaint', required: true },
    type: { type: String, enum: RESOLUTION_TYPES, required: true },
    description: { type: String, required: true },
    actions: [{ action: String, responsible: String, deadline: Date, completed: Boolean }],
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    satisfactionScore: { type: Number, min: 1, max: 5 },
    followUpRequired: { type: Boolean, default: false },
    followUpDate: { type: Date },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

resolutionSchema.index({ resolutionId: 1 }, { unique: true });
resolutionSchema.index({ complaintId: 1 });

const escalationSchema = new mongoose.Schema(
  {
    escalationId: { type: String, required: true, unique: true },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDComplaint', required: true },
    level: { type: String, enum: ESCALATION_LEVELS, required: true },
    reason: { type: String, required: true },
    escalatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    escalatedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    outcome: { type: String },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

escalationSchema.index({ escalationId: 1 }, { unique: true });
escalationSchema.index({ complaintId: 1, level: 1 });

const complaintAnalyticsSchema = new mongoose.Schema(
  {
    analyticsId: { type: String, required: true, unique: true },
    period: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    totalComplaints: { type: Number, default: 0 },
    resolvedCount: { type: Number, default: 0 },
    averageResolutionDays: { type: Number, default: 0 },
    escalationRate: { type: Number, default: 0 },
    complaintsByType: { type: Map, of: Number },
    complaintsByPriority: { type: Map, of: Number },
    satisfactionAfterResolution: { type: Number, default: 0 },
    topCategories: [{ category: String, count: Number }],
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

complaintAnalyticsSchema.index({ analyticsId: 1 }, { unique: true });
complaintAnalyticsSchema.index({ periodStart: 1, periodEnd: 1 });

/* ─── Models ─── */
const DDDComplaint =
  mongoose.models.DDDComplaint || mongoose.model('DDDComplaint', complaintSchema);
const DDDResolution =
  mongoose.models.DDDResolution || mongoose.model('DDDResolution', resolutionSchema);
const DDDEscalation =
  mongoose.models.DDDEscalation || mongoose.model('DDDEscalation', escalationSchema);
const DDDComplaintAnalytics =
  mongoose.models.DDDComplaintAnalytics ||
  mongoose.model('DDDComplaintAnalytics', complaintAnalyticsSchema);

/* ─── Domain Module ─── */
class ComplaintManager {
  constructor() {
    this.name = 'ComplaintManager';
  }

  /* Complaints */
  async listComplaints(filter = {}) {
    return DDDComplaint.find(filter).sort({ createdAt: -1 }).lean();
  }
  async getComplaint(id) {
    return DDDComplaint.findById(id).lean();
  }
  async fileComplaint(data) {
    data.complaintId = data.complaintId || `CMP-${Date.now()}`;
    return DDDComplaint.create(data);
  }
  async updateComplaint(id, data) {
    return DDDComplaint.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  /* Resolutions */
  async listResolutions(filter = {}) {
    return DDDResolution.find(filter).sort({ createdAt: -1 }).lean();
  }
  async createResolution(data) {
    data.resolutionId = data.resolutionId || `RES-${Date.now()}`;
    data.resolvedAt = data.resolvedAt || new Date();
    return DDDResolution.create(data);
  }
  async updateResolution(id, data) {
    return DDDResolution.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  /* Escalations */
  async listEscalations(filter = {}) {
    return DDDEscalation.find(filter).sort({ escalatedAt: -1 }).lean();
  }
  async escalate(data) {
    data.escalationId = data.escalationId || `ESC-${Date.now()}`;
    return DDDEscalation.create(data);
  }
  async resolveEscalation(id, outcome) {
    return DDDEscalation.findByIdAndUpdate(
      id,
      { outcome, resolvedAt: new Date() },
      { new: true }
    ).lean();
  }

  /* Analytics */
  async getComplaintAnalytics(filter = {}) {
    return DDDComplaintAnalytics.find(filter).sort({ periodStart: -1 }).lean();
  }
  async generateAnalytics(data) {
    data.analyticsId = data.analyticsId || `CMAN-${Date.now()}`;
    return DDDComplaintAnalytics.create(data);
  }

  /* Health */
  async healthCheck() {
    const [cm, rs, es, ca] = await Promise.all([
      DDDComplaint.countDocuments(),
      DDDResolution.countDocuments(),
      DDDEscalation.countDocuments(),
      DDDComplaintAnalytics.countDocuments(),
    ]);
    return {
      status: 'ok',
      counts: { complaints: cm, resolutions: rs, escalations: es, analytics: ca },
    };
  }
}

/* ─── Router Factory ─── */
function createComplaintManagerRouter() {
  const r = express.Router();
  const svc = new ComplaintManager();

  /* Complaints */
  r.get('/complaint-manager/complaints', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listComplaints(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.get('/complaint-manager/complaints/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getComplaint(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/complaint-manager/complaints', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.fileComplaint(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.put('/complaint-manager/complaints/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateComplaint(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Resolutions */
  r.get('/complaint-manager/resolutions', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listResolutions(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/complaint-manager/resolutions', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createResolution(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.put('/complaint-manager/resolutions/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateResolution(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Escalations */
  r.get('/complaint-manager/escalations', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEscalations(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/complaint-manager/escalations', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.escalate(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.put('/complaint-manager/escalations/:id/resolve', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.resolveEscalation(req.params.id, req.body.outcome),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics */
  r.get('/complaint-manager/analytics', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getComplaintAnalytics(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Health */
  r.get('/complaint-manager/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return r;
}

/* ─── Exports ─── */
module.exports = {
  ComplaintManager,
  DDDComplaint,
  DDDResolution,
  DDDEscalation,
  DDDComplaintAnalytics,
  COMPLAINT_TYPES,
  COMPLAINT_STATUSES,
  COMPLAINT_PRIORITIES,
  RESOLUTION_TYPES,
  ESCALATION_LEVELS,
  GRIEVANCE_CATEGORIES,
  BUILTIN_RESOLUTION_TEMPLATES,
  createComplaintManagerRouter,
};
