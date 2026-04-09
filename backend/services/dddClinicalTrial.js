/**
 * ██████████████████████████████████████████████████████████████
 * ██  DDD Clinical Trial — Phase 28                           ██
 * ██  Clinical trial management, enrollment & monitoring      ██
 * ██████████████████████████████████████████████████████████████
 */

const mongoose = require('mongoose');
const express = require('express');

/* ─── Constants ─── */
const TRIAL_TYPES = [
  'interventional',
  'observational',
  'expanded_access',
  'registry',
  'prevention',
  'diagnostic',
  'treatment',
  'supportive_care',
  'screening',
  'health_services',
  'basic_science',
  'device',
];

const TRIAL_STATUSES = [
  'planning',
  'not_yet_recruiting',
  'recruiting',
  'active_not_recruiting',
  'completed',
  'suspended',
  'terminated',
  'withdrawn',
  'enrolling_by_invitation',
  'approved_for_marketing',
];

const ENROLLMENT_STATUSES = [
  'screened',
  'eligible',
  'consented',
  'enrolled',
  'randomized',
  'active',
  'completed',
  'withdrawn',
  'lost_to_followup',
  'screen_failed',
];

const MONITORING_TYPES = [
  'site_visit',
  'remote_monitoring',
  'central_monitoring',
  'risk_based',
  'triggered_visit',
  'interim_analysis',
  'data_review',
  'safety_review',
  'protocol_deviation',
  'adverse_event',
];

const ADVERSE_EVENT_GRADES = [
  'grade_1_mild',
  'grade_2_moderate',
  'grade_3_severe',
  'grade_4_life_threatening',
  'grade_5_death',
  'not_applicable',
  'expected',
  'unexpected',
  'related',
  'unrelated',
];

const RANDOMIZATION_METHODS = [
  'simple',
  'block',
  'stratified',
  'cluster',
  'adaptive',
  'minimization',
  'biased_coin',
  'urn',
  'response_adaptive',
  'bayesian_adaptive',
  'covariate_adaptive',
  'sequential',
];

const BUILTIN_TRIAL_TEMPLATES = [
  'rehab_intervention_rct',
  'device_evaluation',
  'tele_rehab_trial',
  'pediatric_intervention',
  'group_therapy_comparison',
  'assistive_tech_trial',
  'pain_intervention',
  'cognitive_rehab_trial',
  'community_based_trial',
  'long_term_followup',
];

/* ─── Schemas ─── */
const trialSchema = new mongoose.Schema(
  {
    trialId: { type: String, required: true, unique: true },
    protocolId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDResearchProtocol' },
    title: { type: String, required: true },
    type: { type: String, enum: TRIAL_TYPES, required: true },
    status: { type: String, enum: TRIAL_STATUSES, default: 'planning' },
    phase: { type: String },
    sponsor: { type: String },
    registrationNumber: { type: String },
    targetEnrollment: { type: Number },
    actualEnrollment: { type: Number, default: 0 },
    sites: [{ name: String, location: String, principalInvestigator: String, active: Boolean }],
    arms: [{ name: String, description: String, intervention: String, enrollmentTarget: Number }],
    inclusionCriteria: [String],
    exclusionCriteria: [String],
    startDate: { type: Date },
    endDate: { type: Date },
    randomization: { type: String, enum: RANDOMIZATION_METHODS },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

trialSchema.index({ trialId: 1 }, { unique: true });
trialSchema.index({ type: 1, status: 1 });

const participantSchema = new mongoose.Schema(
  {
    participantId: { type: String, required: true, unique: true },
    trialId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDClinicalTrial', required: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    status: { type: String, enum: ENROLLMENT_STATUSES, default: 'screened' },
    arm: { type: String },
    consentDate: { type: Date },
    enrollmentDate: { type: Date },
    completionDate: { type: Date },
    withdrawalReason: { type: String },
    visits: [{ visitNumber: Number, scheduledDate: Date, actualDate: Date, completed: Boolean }],
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

participantSchema.index({ participantId: 1 }, { unique: true });
participantSchema.index({ trialId: 1, status: 1 });

const monitoringEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    trialId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDClinicalTrial', required: true },
    type: { type: String, enum: MONITORING_TYPES, required: true },
    date: { type: Date, default: Date.now },
    monitor: { type: String },
    findings: [{ category: String, description: String, severity: String, resolved: Boolean }],
    actionItems: [{ action: String, responsible: String, deadline: Date, completed: Boolean }],
    outcome: { type: String },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

monitoringEventSchema.index({ eventId: 1 }, { unique: true });
monitoringEventSchema.index({ trialId: 1, type: 1 });

const adverseEventSchema = new mongoose.Schema(
  {
    aeId: { type: String, required: true, unique: true },
    trialId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDClinicalTrial', required: true },
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDTrialParticipant' },
    grade: { type: String, enum: ADVERSE_EVENT_GRADES, required: true },
    description: { type: String, required: true },
    onsetDate: { type: Date },
    resolvedDate: { type: Date },
    serious: { type: Boolean, default: false },
    causality: { type: String },
    action: { type: String },
    outcome: { type: String },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reportedAt: { type: Date, default: Date.now },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

adverseEventSchema.index({ aeId: 1 }, { unique: true });
adverseEventSchema.index({ trialId: 1, grade: 1 });

/* ─── Models ─── */
const DDDClinicalTrial =
  mongoose.models.DDDClinicalTrial || mongoose.model('DDDClinicalTrial', trialSchema);
const DDDTrialParticipant =
  mongoose.models.DDDTrialParticipant || mongoose.model('DDDTrialParticipant', participantSchema);
const DDDMonitoringEvent =
  mongoose.models.DDDMonitoringEvent || mongoose.model('DDDMonitoringEvent', monitoringEventSchema);
const DDDAdverseEvent =
  mongoose.models.DDDAdverseEvent || mongoose.model('DDDAdverseEvent', adverseEventSchema);

/* ─── Domain Module ─── */
class ClinicalTrial {
  constructor() {
    this.name = 'ClinicalTrial';
  }

  async listTrials(filter = {}) {
    return DDDClinicalTrial.find(filter).sort({ createdAt: -1 }).lean();
  }
  async getTrial(id) {
    return DDDClinicalTrial.findById(id).lean();
  }
  async createTrial(data) {
    data.trialId = data.trialId || `CT-${Date.now()}`;
    return DDDClinicalTrial.create(data);
  }
  async updateTrial(id, data) {
    return DDDClinicalTrial.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async listParticipants(filter = {}) {
    return DDDTrialParticipant.find(filter).sort({ createdAt: -1 }).lean();
  }
  async enrollParticipant(data) {
    data.participantId = data.participantId || `TP-${Date.now()}`;
    data.enrollmentDate = new Date();
    return DDDTrialParticipant.create(data);
  }
  async updateParticipant(id, data) {
    return DDDTrialParticipant.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async listMonitoringEvents(filter = {}) {
    return DDDMonitoringEvent.find(filter).sort({ date: -1 }).lean();
  }
  async recordMonitoringEvent(data) {
    data.eventId = data.eventId || `ME-${Date.now()}`;
    return DDDMonitoringEvent.create(data);
  }

  async listAdverseEvents(filter = {}) {
    return DDDAdverseEvent.find(filter).sort({ reportedAt: -1 }).lean();
  }
  async reportAdverseEvent(data) {
    data.aeId = data.aeId || `AE-${Date.now()}`;
    return DDDAdverseEvent.create(data);
  }

  async getTrialAnalytics(filter = {}) {
    const [trials, participants, monitoring, adverse] = await Promise.all([
      DDDClinicalTrial.countDocuments(filter),
      DDDTrialParticipant.countDocuments(),
      DDDMonitoringEvent.countDocuments(),
      DDDAdverseEvent.countDocuments(),
    ]);
    return {
      totalTrials: trials,
      totalParticipants: participants,
      totalMonitoring: monitoring,
      totalAdverseEvents: adverse,
    };
  }

  async healthCheck() {
    const [t, p, m, a] = await Promise.all([
      DDDClinicalTrial.countDocuments(),
      DDDTrialParticipant.countDocuments(),
      DDDMonitoringEvent.countDocuments(),
      DDDAdverseEvent.countDocuments(),
    ]);
    return {
      status: 'ok',
      counts: { trials: t, participants: p, monitoring: m, adverseEvents: a },
    };
  }
}

/* ─── Router Factory ─── */
function createClinicalTrialRouter() {
  const r = express.Router();
  const svc = new ClinicalTrial();

  r.get('/clinical-trial/trials', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTrials(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.get('/clinical-trial/trials/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getTrial(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/clinical-trial/trials', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createTrial(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.put('/clinical-trial/trials/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateTrial(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/clinical-trial/participants', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listParticipants(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/clinical-trial/participants', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.enrollParticipant(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.put('/clinical-trial/participants/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateParticipant(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/clinical-trial/monitoring', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listMonitoringEvents(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/clinical-trial/monitoring', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordMonitoringEvent(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/clinical-trial/adverse-events', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAdverseEvents(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/clinical-trial/adverse-events', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.reportAdverseEvent(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/clinical-trial/analytics', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getTrialAnalytics(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.get('/clinical-trial/health', async (_req, res) => {
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
  ClinicalTrial,
  DDDClinicalTrial,
  DDDTrialParticipant,
  DDDMonitoringEvent,
  DDDAdverseEvent,
  TRIAL_TYPES,
  TRIAL_STATUSES,
  ENROLLMENT_STATUSES,
  MONITORING_TYPES,
  ADVERSE_EVENT_GRADES,
  RANDOMIZATION_METHODS,
  BUILTIN_TRIAL_TEMPLATES,
  createClinicalTrialRouter,
};
