/**
 * ██████████████████████████████████████████████████████████████
 * ██  DDD Patient Experience — Phase 27                       ██
 * ██  Patient journey mapping, touchpoints & experience mgmt  ██
 * ██████████████████████████████████████████████████████████████
 */

const mongoose = require('mongoose');
const express = require('express');

/* ─── Constants ─── */
const JOURNEY_STAGES = [
  'awareness',
  'referral',
  'registration',
  'initial_assessment',
  'plan_development',
  'active_treatment',
  'progress_review',
  'transition',
  'discharge_planning',
  'discharge',
  'follow_up',
  'reengagement',
];

const JOURNEY_STATUSES = [
  'not_started',
  'in_progress',
  'completed',
  'on_hold',
  'abandoned',
  'transferred',
  'paused',
  'delayed',
  'optimized',
  'archived',
];

const TOUCHPOINT_TYPES = [
  'reception',
  'phone_call',
  'appointment',
  'therapy_session',
  'assessment',
  'consultation',
  'digital_interaction',
  'group_session',
  'family_meeting',
  'tele_session',
  'self_service',
  'discharge',
];

const TOUCHPOINT_CHANNELS = [
  'in_person',
  'phone',
  'video',
  'email',
  'sms',
  'app',
  'portal',
  'chat',
  'social_media',
  'kiosk',
  'mail',
  'fax',
];

const EMOTION_RATINGS = [
  'delighted',
  'happy',
  'satisfied',
  'neutral',
  'disappointed',
  'frustrated',
  'anxious',
  'confused',
  'relieved',
  'grateful',
];

const EXPERIENCE_DIMENSIONS = [
  'ease_of_access',
  'wait_times',
  'staff_empathy',
  'communication_clarity',
  'environment_comfort',
  'treatment_effectiveness',
  'involvement_in_decisions',
  'privacy_respect',
  'cultural_sensitivity',
  'follow_up_quality',
  'overall_experience',
  'value_for_effort',
];

const BUILTIN_JOURNEY_TEMPLATES = [
  'standard_rehab_journey',
  'pediatric_pathway',
  'geriatric_pathway',
  'intensive_program',
  'outpatient_pathway',
  'tele_rehab_journey',
  'community_based',
  'vocational_rehab',
  'early_intervention',
  'chronic_management',
];

/* ─── Schemas ─── */
const journeyMapSchema = new mongoose.Schema(
  {
    journeyId: { type: String, required: true, unique: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode' },
    currentStage: { type: String, enum: JOURNEY_STAGES, default: 'awareness' },
    status: { type: String, enum: JOURNEY_STATUSES, default: 'not_started' },
    stages: [
      {
        stage: { type: String, enum: JOURNEY_STAGES },
        enteredAt: Date,
        exitedAt: Date,
        duration: Number,
        rating: { type: Number, min: 1, max: 5 },
        notes: String,
      },
    ],
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    overallRating: { type: Number, min: 1, max: 5 },
    template: { type: String },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

journeyMapSchema.index({ journeyId: 1 }, { unique: true });
journeyMapSchema.index({ beneficiaryId: 1, startDate: -1 });
journeyMapSchema.index({ currentStage: 1, status: 1 });

const touchpointSchema = new mongoose.Schema(
  {
    touchpointId: { type: String, required: true, unique: true },
    journeyId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDJourneyMap', required: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    type: { type: String, enum: TOUCHPOINT_TYPES, required: true },
    channel: { type: String, enum: TOUCHPOINT_CHANNELS, required: true },
    stage: { type: String, enum: JOURNEY_STAGES },
    description: { type: String },
    emotion: { type: String, enum: EMOTION_RATINGS },
    rating: { type: Number, min: 1, max: 5 },
    staffInvolved: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    occurredAt: { type: Date, default: Date.now },
    duration: { type: Number },
    painPoints: [String],
    highlights: [String],
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

touchpointSchema.index({ touchpointId: 1 }, { unique: true });
touchpointSchema.index({ journeyId: 1, occurredAt: -1 });
touchpointSchema.index({ type: 1, channel: 1 });

const experienceScoreSchema = new mongoose.Schema(
  {
    scoreId: { type: String, required: true, unique: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    journeyId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDJourneyMap' },
    dimension: { type: String, enum: EXPERIENCE_DIMENSIONS, required: true },
    score: { type: Number, required: true, min: 1, max: 10 },
    comment: { type: String },
    collectedAt: { type: Date, default: Date.now },
    collectionMethod: { type: String },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

experienceScoreSchema.index({ scoreId: 1 }, { unique: true });
experienceScoreSchema.index({ beneficiaryId: 1, dimension: 1 });
experienceScoreSchema.index({ dimension: 1, collectedAt: -1 });

const experienceInsightSchema = new mongoose.Schema(
  {
    insightId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    dimension: { type: String, enum: EXPERIENCE_DIMENSIONS },
    insightType: {
      type: String,
      enum: ['trend', 'anomaly', 'recommendation', 'benchmark', 'alert'],
    },
    severity: { type: String, enum: ['critical', 'high', 'medium', 'low', 'info'] },
    dataPoints: { type: Number, default: 0 },
    confidence: { type: Number, min: 0, max: 1 },
    actionItems: [{ action: String, priority: String, assignedTo: String }],
    generatedAt: { type: Date, default: Date.now },
    validUntil: { type: Date },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

experienceInsightSchema.index({ insightId: 1 }, { unique: true });
experienceInsightSchema.index({ dimension: 1, generatedAt: -1 });

/* ─── Models ─── */
const DDDJourneyMap =
  mongoose.models.DDDJourneyMap || mongoose.model('DDDJourneyMap', journeyMapSchema);
const DDDTouchpoint =
  mongoose.models.DDDTouchpoint || mongoose.model('DDDTouchpoint', touchpointSchema);
const DDDExperienceScore =
  mongoose.models.DDDExperienceScore || mongoose.model('DDDExperienceScore', experienceScoreSchema);
const DDDExperienceInsight =
  mongoose.models.DDDExperienceInsight ||
  mongoose.model('DDDExperienceInsight', experienceInsightSchema);

/* ─── Domain Module ─── */
class PatientExperience {
  constructor() {
    this.name = 'PatientExperience';
  }

  /* Journey Maps */
  async listJourneys(filter = {}) {
    return DDDJourneyMap.find(filter).sort({ startDate: -1 }).lean();
  }
  async getJourney(id) {
    return DDDJourneyMap.findById(id).lean();
  }
  async createJourney(data) {
    data.journeyId = data.journeyId || `JRN-${Date.now()}`;
    return DDDJourneyMap.create(data);
  }
  async updateJourney(id, data) {
    return DDDJourneyMap.findByIdAndUpdate(id, data, { new: true }).lean();
  }
  async advanceStage(id, stage) {
    const journey = await DDDJourneyMap.findById(id);
    if (!journey) throw new Error('Journey not found');
    journey.stages.push({ stage, enteredAt: new Date() });
    journey.currentStage = stage;
    return journey.save();
  }

  /* Touchpoints */
  async listTouchpoints(filter = {}) {
    return DDDTouchpoint.find(filter).sort({ occurredAt: -1 }).lean();
  }
  async recordTouchpoint(data) {
    data.touchpointId = data.touchpointId || `TP-${Date.now()}`;
    return DDDTouchpoint.create(data);
  }
  async updateTouchpoint(id, data) {
    return DDDTouchpoint.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  /* Experience Scores */
  async listExperienceScores(filter = {}) {
    return DDDExperienceScore.find(filter).sort({ collectedAt: -1 }).lean();
  }
  async recordExperienceScore(data) {
    data.scoreId = data.scoreId || `EXS-${Date.now()}`;
    return DDDExperienceScore.create(data);
  }

  /* Insights */
  async listInsights(filter = {}) {
    return DDDExperienceInsight.find(filter).sort({ generatedAt: -1 }).lean();
  }
  async generateInsight(data) {
    data.insightId = data.insightId || `INS-${Date.now()}`;
    return DDDExperienceInsight.create(data);
  }

  /* Analytics */
  async getExperienceAnalytics(filter = {}) {
    const [journeys, touchpoints, scores, insights] = await Promise.all([
      DDDJourneyMap.countDocuments(filter),
      DDDTouchpoint.countDocuments(),
      DDDExperienceScore.countDocuments(),
      DDDExperienceInsight.countDocuments(),
    ]);
    return {
      totalJourneys: journeys,
      totalTouchpoints: touchpoints,
      totalScores: scores,
      totalInsights: insights,
    };
  }

  /* Health */
  async healthCheck() {
    const [jm, tp, es, ei] = await Promise.all([
      DDDJourneyMap.countDocuments(),
      DDDTouchpoint.countDocuments(),
      DDDExperienceScore.countDocuments(),
      DDDExperienceInsight.countDocuments(),
    ]);
    return { status: 'ok', counts: { journeys: jm, touchpoints: tp, scores: es, insights: ei } };
  }
}

/* ─── Router Factory ─── */
function createPatientExperienceRouter() {
  const r = express.Router();
  const svc = new PatientExperience();

  /* Journeys */
  r.get('/patient-experience/journeys', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listJourneys(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.get('/patient-experience/journeys/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getJourney(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/patient-experience/journeys', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createJourney(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.put('/patient-experience/journeys/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateJourney(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/patient-experience/journeys/:id/advance', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.advanceStage(req.params.id, req.body.stage) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Touchpoints */
  r.get('/patient-experience/touchpoints', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTouchpoints(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/patient-experience/touchpoints', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordTouchpoint(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.put('/patient-experience/touchpoints/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateTouchpoint(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Experience Scores */
  r.get('/patient-experience/scores', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listExperienceScores(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/patient-experience/scores', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordExperienceScore(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Insights */
  r.get('/patient-experience/insights', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listInsights(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/patient-experience/insights', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.generateInsight(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics */
  r.get('/patient-experience/analytics', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getExperienceAnalytics(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Health */
  r.get('/patient-experience/health', async (_req, res) => {
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
  PatientExperience,
  DDDJourneyMap,
  DDDTouchpoint,
  DDDExperienceScore,
  DDDExperienceInsight,
  JOURNEY_STAGES,
  JOURNEY_STATUSES,
  TOUCHPOINT_TYPES,
  TOUCHPOINT_CHANNELS,
  EMOTION_RATINGS,
  EXPERIENCE_DIMENSIONS,
  BUILTIN_JOURNEY_TEMPLATES,
  createPatientExperienceRouter,
};
