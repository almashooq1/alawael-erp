'use strict';
/**
 * DDD Clinical Trials Service
 * ────────────────────────────
 * Phase 35 – Clinical Research & Evidence-Based Practice (Module 2/4)
 *
 * Manages clinical trial lifecycle: phases, enrollment, randomization,
 * adverse event reporting, data monitoring boards, and trial completion.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const TRIAL_PHASES = [
  'pre_clinical',
  'phase_0',
  'phase_1',
  'phase_1b',
  'phase_2',
  'phase_2b',
  'phase_3',
  'phase_3b',
  'phase_4',
  'post_market',
  'observation',
  'feasibility',
];

const TRIAL_STATUSES = [
  'planning',
  'protocol_development',
  'irb_submitted',
  'approved',
  'recruiting',
  'enrollment_complete',
  'intervention',
  'follow_up',
  'data_lock',
  'analysis',
  'completed',
  'terminated',
];

const RANDOMIZATION_METHODS = [
  'simple',
  'block',
  'stratified',
  'cluster',
  'adaptive',
  'minimization',
  'biased_coin',
  'permuted_block',
  'covariate_adaptive',
  'response_adaptive',
];

const BLINDING_TYPES = [
  'open_label',
  'single_blind',
  'double_blind',
  'triple_blind',
  'quadruple_blind',
  'assessor_blind',
  'participant_blind',
  'investigator_blind',
  'unblinded',
  'partial_blind',
];

const ADVERSE_EVENT_GRADES = [
  'grade_1_mild',
  'grade_2_moderate',
  'grade_3_severe',
  'grade_4_life_threatening',
  'grade_5_death',
  'expected',
  'unexpected',
  'related',
  'unrelated',
  'possibly_related',
];

const ENDPOINT_TYPES = [
  'primary',
  'secondary',
  'exploratory',
  'composite',
  'surrogate',
  'safety',
  'efficacy',
  'pharmacokinetic',
  'patient_reported',
  'biomarker',
];

const BUILTIN_TRIAL_TEMPLATES = [
  {
    code: 'REHAB_RCT',
    label: 'Rehabilitation RCT',
    phase: 'phase_3',
    blinding: 'double_blind',
    arms: 2,
  },
  {
    code: 'DEVICE_TRIAL',
    label: 'Medical Device Trial',
    phase: 'phase_2',
    blinding: 'single_blind',
    arms: 2,
  },
  {
    code: 'BEHAV_TRIAL',
    label: 'Behavioral Intervention',
    phase: 'phase_2',
    blinding: 'assessor_blind',
    arms: 3,
  },
  {
    code: 'OBSERV_STUDY',
    label: 'Observational Study',
    phase: 'observation',
    blinding: 'open_label',
    arms: 1,
  },
  {
    code: 'PILOT_TRIAL',
    label: 'Pilot/Feasibility',
    phase: 'feasibility',
    blinding: 'open_label',
    arms: 2,
  },
  {
    code: 'ADAPTIVE',
    label: 'Adaptive Trial Design',
    phase: 'phase_2b',
    blinding: 'double_blind',
    arms: 3,
  },
  {
    code: 'CROSSOVER',
    label: 'Crossover Trial',
    phase: 'phase_3',
    blinding: 'double_blind',
    arms: 2,
  },
  {
    code: 'POST_MARKET',
    label: 'Post-Market Surveillance',
    phase: 'post_market',
    blinding: 'open_label',
    arms: 1,
  },
  {
    code: 'PEDS_TRIAL',
    label: 'Pediatric Trial',
    phase: 'phase_2',
    blinding: 'double_blind',
    arms: 2,
  },
  {
    code: 'TECH_TRIAL',
    label: 'Technology-Assisted Rehab',
    phase: 'phase_3',
    blinding: 'assessor_blind',
    arms: 2,
  },
];

/* ═══════════════════ Schemas ═══════════════════ */
const clinicalTrialSchema = new Schema(
  {
    title: { type: String, required: true },
    registryId: { type: String },
    phase: { type: String, enum: TRIAL_PHASES, required: true },
    status: { type: String, enum: TRIAL_STATUSES, default: 'planning' },
    blindingType: { type: String, enum: BLINDING_TYPES, default: 'open_label' },
    randomization: { type: String, enum: RANDOMIZATION_METHODS },
    studyId: { type: Schema.Types.ObjectId, ref: 'DDDResearchStudy' },
    arms: [{ name: String, description: String, targetSize: Number }],
    targetEnrollment: { type: Number },
    actualEnrollment: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    sponsorId: { type: Schema.Types.ObjectId },
    sites: [{ name: String, location: String, piId: Schema.Types.ObjectId }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
clinicalTrialSchema.index({ phase: 1, status: 1 });
clinicalTrialSchema.index({ registryId: 1 });

const trialEnrollmentSchema = new Schema(
  {
    trialId: { type: Schema.Types.ObjectId, ref: 'DDDClinicalTrial', required: true },
    participantId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    arm: { type: String },
    enrolledAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: [
        'screening',
        'enrolled',
        'randomized',
        'active',
        'completed',
        'withdrawn',
        'lost_to_followup',
        'excluded',
      ],
      default: 'screening',
    },
    consentDate: { type: Date },
    consentVersion: { type: String },
    withdrawalReason: { type: String },
    withdrawalDate: { type: Date },
    siteId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
trialEnrollmentSchema.index({ trialId: 1, status: 1 });
trialEnrollmentSchema.index({ participantId: 1 });

const adverseEventSchema = new Schema(
  {
    trialId: { type: Schema.Types.ObjectId, ref: 'DDDClinicalTrial', required: true },
    participantId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    grade: { type: String, enum: ADVERSE_EVENT_GRADES, required: true },
    description: { type: String, required: true },
    onsetDate: { type: Date },
    resolutionDate: { type: Date },
    isSerious: { type: Boolean, default: false },
    relatedness: {
      type: String,
      enum: ['definite', 'probable', 'possible', 'unlikely', 'unrelated'],
    },
    actionTaken: { type: String },
    outcome: {
      type: String,
      enum: ['recovered', 'recovering', 'not_recovered', 'fatal', 'unknown'],
    },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
adverseEventSchema.index({ trialId: 1, grade: 1 });
adverseEventSchema.index({ isSerious: 1 });

const trialEndpointSchema = new Schema(
  {
    trialId: { type: Schema.Types.ObjectId, ref: 'DDDClinicalTrial', required: true },
    endpointType: { type: String, enum: ENDPOINT_TYPES, required: true },
    name: { type: String, required: true },
    description: { type: String },
    measurementTool: { type: String },
    timepoints: [{ label: String, dayOffset: Number }],
    targetDifference: { type: Number },
    statisticalTest: { type: String },
    result: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['defined', 'collecting', 'analyzed', 'reported'],
      default: 'defined',
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
trialEndpointSchema.index({ trialId: 1, endpointType: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDClinicalTrial =
  mongoose.models.DDDClinicalTrial || mongoose.model('DDDClinicalTrial', clinicalTrialSchema);
const DDDTrialEnrollment =
  mongoose.models.DDDTrialEnrollment || mongoose.model('DDDTrialEnrollment', trialEnrollmentSchema);
const DDDAdverseEvent =
  mongoose.models.DDDAdverseEvent || mongoose.model('DDDAdverseEvent', adverseEventSchema);
const DDDTrialEndpoint =
  mongoose.models.DDDTrialEndpoint || mongoose.model('DDDTrialEndpoint', trialEndpointSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class ClinicalTrials {
  async createTrial(data) {
    return DDDClinicalTrial.create(data);
  }
  async listTrials(filter = {}, page = 1, limit = 20) {
    return DDDClinicalTrial.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateTrial(id, data) {
    return DDDClinicalTrial.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async enrollParticipant(data) {
    return DDDTrialEnrollment.create(data);
  }
  async listEnrollments(filter = {}, page = 1, limit = 20) {
    return DDDTrialEnrollment.find(filter)
      .sort({ enrolledAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async reportAdverseEvent(data) {
    return DDDAdverseEvent.create(data);
  }
  async listAdverseEvents(filter = {}, page = 1, limit = 20) {
    return DDDAdverseEvent.find(filter)
      .sort({ onsetDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async createEndpoint(data) {
    return DDDTrialEndpoint.create(data);
  }
  async listEndpoints(filter = {}, page = 1, limit = 20) {
    return DDDTrialEndpoint.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async getTrialStats() {
    const [total, recruiting, seriousAE, completed] = await Promise.all([
      DDDClinicalTrial.countDocuments(),
      DDDClinicalTrial.countDocuments({ status: 'recruiting' }),
      DDDAdverseEvent.countDocuments({ isSerious: true }),
      DDDClinicalTrial.countDocuments({ status: 'completed' }),
    ]);
    return {
      totalTrials: total,
      recruiting,
      seriousAdverseEvents: seriousAE,
      completedTrials: completed,
    };
  }

  async healthCheck() {
    const [trials, enrollments, adverseEvents, endpoints] = await Promise.all([
      DDDClinicalTrial.countDocuments(),
      DDDTrialEnrollment.countDocuments(),
      DDDAdverseEvent.countDocuments(),
      DDDTrialEndpoint.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'ClinicalTrials',
      counts: { trials, enrollments, adverseEvents, endpoints },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createClinicalTrialsRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new ClinicalTrials();

  router.get('/clinical-trials/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/clinical-trials/trials', async (req, res) => {
    try {
      res.status(201).json(await svc.createTrial(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/clinical-trials/trials', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listTrials(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/clinical-trials/trials/:id', async (req, res) => {
    try {
      res.json(await svc.updateTrial(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/clinical-trials/enrollments', async (req, res) => {
    try {
      res.status(201).json(await svc.enrollParticipant(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/clinical-trials/enrollments', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listEnrollments(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/clinical-trials/adverse-events', async (req, res) => {
    try {
      res.status(201).json(await svc.reportAdverseEvent(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/clinical-trials/adverse-events', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listAdverseEvents(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/clinical-trials/endpoints', async (req, res) => {
    try {
      res.status(201).json(await svc.createEndpoint(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/clinical-trials/endpoints', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listEndpoints(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/clinical-trials/stats', async (_req, res) => {
    try {
      res.json(await svc.getTrialStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  TRIAL_PHASES,
  TRIAL_STATUSES,
  RANDOMIZATION_METHODS,
  BLINDING_TYPES,
  ADVERSE_EVENT_GRADES,
  ENDPOINT_TYPES,
  BUILTIN_TRIAL_TEMPLATES,
  DDDClinicalTrial,
  DDDTrialEnrollment,
  DDDAdverseEvent,
  DDDTrialEndpoint,
  ClinicalTrials,
  createClinicalTrialsRouter,
};
