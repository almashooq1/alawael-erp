'use strict';
/**
 * DDD Advocacy Program Service
 * ─────────────────────────────
 * Phase 36 – Community Engagement & Outreach (Module 4/4)
 *
 * Manages disability advocacy campaigns, policy tracking, rights education,
 * self-advocacy training, legislative monitoring, and stakeholder engagement.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const ADVOCACY_AREAS = [
  'accessibility',
  'education_rights',
  'employment',
  'healthcare_access',
  'housing',
  'transportation',
  'technology_access',
  'legal_rights',
  'social_inclusion',
  'financial_support',
  'caregiver_rights',
  'research_funding',
];

const CAMPAIGN_TYPES = [
  'legislative',
  'awareness',
  'petition',
  'media',
  'grassroots',
  'coalition',
  'legal_action',
  'public_comment',
  'testimony',
  'rally',
];

const POLICY_STATUSES = [
  'monitoring',
  'proposed',
  'committee_review',
  'floor_vote',
  'passed',
  'enacted',
  'vetoed',
  'expired',
  'amended',
  'repealed',
];

const STAKEHOLDER_TYPES = [
  'legislator',
  'government_official',
  'media_representative',
  'corporate_leader',
  'ngo_director',
  'academic',
  'community_leader',
  'beneficiary_advocate',
  'legal_advisor',
  'international_body',
];

const TRAINING_TOPICS = [
  'self_advocacy_basics',
  'know_your_rights',
  'effective_communication',
  'navigating_systems',
  'public_speaking',
  'writing_testimony',
  'media_engagement',
  'coalition_building',
  'policy_analysis',
  'digital_advocacy',
];

const ENGAGEMENT_LEVELS = [
  'awareness',
  'interest',
  'involvement',
  'action',
  'leadership',
  'mentoring',
  'policy_champion',
  'board_member',
  'ambassador',
  'lifetime_advocate',
];

const BUILTIN_ADVOCACY_CONFIGS = [
  {
    code: 'RIGHTS_101',
    label: 'Disability Rights 101',
    area: 'legal_rights',
    type: 'awareness',
    duration: 5,
  },
  {
    code: 'EMPLOY_ADV',
    label: 'Employment Advocacy',
    area: 'employment',
    type: 'legislative',
    duration: 30,
  },
  {
    code: 'ACCESS_NOW',
    label: 'Accessibility Now Campaign',
    area: 'accessibility',
    type: 'petition',
    duration: 60,
  },
  {
    code: 'EDU_RIGHTS',
    label: 'Education Rights Initiative',
    area: 'education_rights',
    type: 'coalition',
    duration: 90,
  },
  {
    code: 'HEALTH_ACC',
    label: 'Healthcare Access Drive',
    area: 'healthcare_access',
    type: 'grassroots',
    duration: 45,
  },
  {
    code: 'TECH_ACCESS',
    label: 'Technology Access Campaign',
    area: 'technology_access',
    type: 'media',
    duration: 30,
  },
  {
    code: 'HOUSING_ADV',
    label: 'Inclusive Housing Advocacy',
    area: 'housing',
    type: 'legislative',
    duration: 120,
  },
  {
    code: 'TRANSPORT',
    label: 'Accessible Transport Campaign',
    area: 'transportation',
    type: 'petition',
    duration: 60,
  },
  {
    code: 'INCLUSION',
    label: 'Social Inclusion Initiative',
    area: 'social_inclusion',
    type: 'awareness',
    duration: 30,
  },
  {
    code: 'RESEARCH_F',
    label: 'Research Funding Advocacy',
    area: 'research_funding',
    type: 'testimony',
    duration: 90,
  },
];

/* ═══════════════════ Schemas ═══════════════════ */
const advocacyCampaignSchema = new Schema(
  {
    title: { type: String, required: true },
    area: { type: String, enum: ADVOCACY_AREAS, required: true },
    campaignType: { type: String, enum: CAMPAIGN_TYPES, required: true },
    status: {
      type: String,
      enum: ['planning', 'active', 'paused', 'completed', 'archived'],
      default: 'planning',
    },
    description: { type: String },
    goals: [{ type: String }],
    targetOutcome: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    leadId: { type: Schema.Types.ObjectId, ref: 'User' },
    supporters: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
advocacyCampaignSchema.index({ area: 1, status: 1 });
advocacyCampaignSchema.index({ campaignType: 1, startDate: -1 });

const policyTrackerSchema = new Schema(
  {
    title: { type: String, required: true },
    policyNumber: { type: String },
    status: { type: String, enum: POLICY_STATUSES, default: 'monitoring' },
    jurisdiction: { type: String },
    area: { type: String, enum: ADVOCACY_AREAS },
    summary: { type: String },
    impactAssessment: { type: String },
    introducedDate: { type: Date },
    lastActionDate: { type: Date },
    campaignId: { type: Schema.Types.ObjectId, ref: 'DDDAdvocacyCampaign' },
    trackedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
policyTrackerSchema.index({ status: 1, area: 1 });
policyTrackerSchema.index({ jurisdiction: 1 });

const selfAdvocacyTrainingSchema = new Schema(
  {
    participantId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    topic: { type: String, enum: TRAINING_TOPICS, required: true },
    facilitatorId: { type: Schema.Types.ObjectId, ref: 'User' },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled',
    },
    preScore: { type: Number },
    postScore: { type: Number },
    feedback: { type: String },
    engagementLevel: { type: String, enum: ENGAGEMENT_LEVELS },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
selfAdvocacyTrainingSchema.index({ participantId: 1, topic: 1 });
selfAdvocacyTrainingSchema.index({ status: 1, scheduledDate: -1 });

const stakeholderEngagementSchema = new Schema(
  {
    stakeholderType: { type: String, enum: STAKEHOLDER_TYPES, required: true },
    name: { type: String, required: true },
    organization: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },
    campaignId: { type: Schema.Types.ObjectId, ref: 'DDDAdvocacyCampaign' },
    engagementDate: { type: Date },
    engagementType: {
      type: String,
      enum: ['meeting', 'call', 'email', 'event', 'testimony', 'media', 'letter'],
    },
    outcome: { type: String },
    followUpDate: { type: Date },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
stakeholderEngagementSchema.index({ stakeholderType: 1, campaignId: 1 });
stakeholderEngagementSchema.index({ engagementDate: -1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDAdvocacyCampaign =
  mongoose.models.DDDAdvocacyCampaign ||
  mongoose.model('DDDAdvocacyCampaign', advocacyCampaignSchema);
const DDDPolicyTracker =
  mongoose.models.DDDPolicyTracker || mongoose.model('DDDPolicyTracker', policyTrackerSchema);
const DDDSelfAdvocacyTraining =
  mongoose.models.DDDSelfAdvocacyTraining ||
  mongoose.model('DDDSelfAdvocacyTraining', selfAdvocacyTrainingSchema);
const DDDStakeholderEngagement =
  mongoose.models.DDDStakeholderEngagement ||
  mongoose.model('DDDStakeholderEngagement', stakeholderEngagementSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class AdvocacyProgram {
  async createCampaign(data) {
    return DDDAdvocacyCampaign.create(data);
  }
  async listCampaigns(filter = {}, page = 1, limit = 20) {
    return DDDAdvocacyCampaign.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateCampaign(id, data) {
    return DDDAdvocacyCampaign.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async createPolicy(data) {
    return DDDPolicyTracker.create(data);
  }
  async listPolicies(filter = {}, page = 1, limit = 20) {
    return DDDPolicyTracker.find(filter)
      .sort({ lastActionDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async scheduleTraining(data) {
    return DDDSelfAdvocacyTraining.create(data);
  }
  async listTraining(filter = {}, page = 1, limit = 20) {
    return DDDSelfAdvocacyTraining.find(filter)
      .sort({ scheduledDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async logEngagement(data) {
    return DDDStakeholderEngagement.create(data);
  }
  async listEngagements(filter = {}, page = 1, limit = 20) {
    return DDDStakeholderEngagement.find(filter)
      .sort({ engagementDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async getAdvocacyStats() {
    const [campaigns, activePolicies, trainings, engagements] = await Promise.all([
      DDDAdvocacyCampaign.countDocuments({ status: 'active' }),
      DDDPolicyTracker.countDocuments({ status: 'monitoring' }),
      DDDSelfAdvocacyTraining.countDocuments({ status: 'completed' }),
      DDDStakeholderEngagement.countDocuments(),
    ]);
    return {
      activeCampaigns: campaigns,
      monitoredPolicies: activePolicies,
      completedTrainings: trainings,
      totalEngagements: engagements,
    };
  }

  async healthCheck() {
    const [campaigns, policies, training, engagements] = await Promise.all([
      DDDAdvocacyCampaign.countDocuments(),
      DDDPolicyTracker.countDocuments(),
      DDDSelfAdvocacyTraining.countDocuments(),
      DDDStakeholderEngagement.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'AdvocacyProgram',
      counts: { campaigns, policies, training, engagements },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createAdvocacyProgramRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new AdvocacyProgram();

  router.get('/advocacy-program/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/advocacy-program/campaigns', async (req, res) => {
    try {
      res.status(201).json(await svc.createCampaign(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/advocacy-program/campaigns', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listCampaigns(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/advocacy-program/campaigns/:id', async (req, res) => {
    try {
      res.json(await svc.updateCampaign(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/advocacy-program/policies', async (req, res) => {
    try {
      res.status(201).json(await svc.createPolicy(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/advocacy-program/policies', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listPolicies(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/advocacy-program/training', async (req, res) => {
    try {
      res.status(201).json(await svc.scheduleTraining(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/advocacy-program/training', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listTraining(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/advocacy-program/engagements', async (req, res) => {
    try {
      res.status(201).json(await svc.logEngagement(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/advocacy-program/engagements', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listEngagements(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/advocacy-program/stats', async (_req, res) => {
    try {
      res.json(await svc.getAdvocacyStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  ADVOCACY_AREAS,
  CAMPAIGN_TYPES,
  POLICY_STATUSES,
  STAKEHOLDER_TYPES,
  TRAINING_TOPICS,
  ENGAGEMENT_LEVELS,
  BUILTIN_ADVOCACY_CONFIGS,
  DDDAdvocacyCampaign,
  DDDPolicyTracker,
  DDDSelfAdvocacyTraining,
  DDDStakeholderEngagement,
  AdvocacyProgram,
  createAdvocacyProgramRouter,
};
