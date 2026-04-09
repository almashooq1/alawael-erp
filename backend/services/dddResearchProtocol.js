/**
 * ██████████████████████████████████████████████████████████████
 * ██  DDD Research Protocol — Phase 28                        ██
 * ██  Manage research protocols, IRB approvals & study designs██
 * ██████████████████████████████████████████████████████████████
 */

const mongoose = require('mongoose');
const express = require('express');

/* ─── Constants ─── */
const PROTOCOL_TYPES = [
  'randomized_controlled',
  'observational',
  'cohort',
  'case_control',
  'cross_sectional',
  'qualitative',
  'mixed_methods',
  'meta_analysis',
  'systematic_review',
  'single_case_design',
  'pilot_study',
  'feasibility',
];

const PROTOCOL_STATUSES = [
  'draft',
  'submitted',
  'irb_review',
  'approved',
  'active',
  'enrolling',
  'closed_to_enrollment',
  'completed',
  'suspended',
  'terminated',
];

const IRB_STATUSES = [
  'not_submitted',
  'pending_review',
  'revisions_required',
  'conditionally_approved',
  'approved',
  'expired',
  'suspended',
  'revoked',
  'exempt',
  'withdrawn',
];

const STUDY_PHASES = [
  'pre_clinical',
  'phase_1',
  'phase_2',
  'phase_3',
  'phase_4',
  'pilot',
  'exploratory',
  'confirmatory',
  'post_market',
  'translational',
];

const RISK_LEVELS = [
  'minimal',
  'low',
  'moderate',
  'high',
  'significant',
  'exempt',
  'expedited',
  'full_board',
  'continuing_review',
  'not_assessed',
];

const FUNDING_TYPES = [
  'government_grant',
  'private_foundation',
  'industry_sponsored',
  'institutional',
  'crowdfunded',
  'self_funded',
  'fellowship',
  'cooperative_agreement',
  'contract',
  'endowment',
  'international_agency',
  'philanthropic',
];

const BUILTIN_PROTOCOL_TEMPLATES = [
  'rehab_outcome_rct',
  'assistive_tech_evaluation',
  'tele_rehab_effectiveness',
  'early_intervention_cohort',
  'disability_prevalence_survey',
  'quality_of_life_study',
  'caregiver_burden_assessment',
  'community_integration_trial',
  'pain_management_protocol',
  'neuroplasticity_observation',
];

/* ─── Schemas ─── */
const protocolSchema = new mongoose.Schema(
  {
    protocolId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: PROTOCOL_TYPES, required: true },
    status: { type: String, enum: PROTOCOL_STATUSES, default: 'draft' },
    phase: { type: String, enum: STUDY_PHASES },
    principalInvestigator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    coInvestigators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    abstract: { type: String },
    objectives: [String],
    methodology: { type: String },
    sampleSize: { type: Number },
    duration: { estimatedMonths: Number, startDate: Date, endDate: Date },
    funding: { type: String, enum: FUNDING_TYPES },
    fundingAmount: { type: Number },
    riskLevel: { type: String, enum: RISK_LEVELS, default: 'not_assessed' },
    keywords: [String],
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

protocolSchema.index({ protocolId: 1 }, { unique: true });
protocolSchema.index({ type: 1, status: 1 });
protocolSchema.index({ principalInvestigator: 1 });

const irbSubmissionSchema = new mongoose.Schema(
  {
    submissionId: { type: String, required: true, unique: true },
    protocolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DDDResearchProtocol',
      required: true,
    },
    status: { type: String, enum: IRB_STATUSES, default: 'not_submitted' },
    submittedAt: { type: Date },
    reviewDate: { type: Date },
    approvalDate: { type: Date },
    expirationDate: { type: Date },
    reviewComments: [{ reviewer: String, comment: String, date: Date }],
    conditions: [String],
    amendments: [{ description: String, submittedAt: Date, approvedAt: Date }],
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

irbSubmissionSchema.index({ submissionId: 1 }, { unique: true });
irbSubmissionSchema.index({ protocolId: 1, status: 1 });

const researchTeamSchema = new mongoose.Schema(
  {
    teamId: { type: String, required: true, unique: true },
    protocolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DDDResearchProtocol',
      required: true,
    },
    members: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: String,
        department: String,
        effort: Number,
        joinedAt: Date,
      },
    ],
    name: { type: String, required: true },
    department: { type: String },
    active: { type: Boolean, default: true },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

researchTeamSchema.index({ teamId: 1 }, { unique: true });
researchTeamSchema.index({ protocolId: 1 });

const dataCollectionSchema = new mongoose.Schema(
  {
    collectionId: { type: String, required: true, unique: true },
    protocolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DDDResearchProtocol',
      required: true,
    },
    method: { type: String, required: true },
    instruments: [{ name: String, type: String, validated: Boolean }],
    schedule: [{ timepoint: String, description: String, daysFromBaseline: Number }],
    variables: [{ name: String, type: String, unit: String, description: String }],
    targetN: { type: Number },
    collectedN: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

dataCollectionSchema.index({ collectionId: 1 }, { unique: true });
dataCollectionSchema.index({ protocolId: 1 });

/* ─── Models ─── */
const DDDResearchProtocol =
  mongoose.models.DDDResearchProtocol || mongoose.model('DDDResearchProtocol', protocolSchema);
const DDDIRBSubmission =
  mongoose.models.DDDIRBSubmission || mongoose.model('DDDIRBSubmission', irbSubmissionSchema);
const DDDResearchTeam =
  mongoose.models.DDDResearchTeam || mongoose.model('DDDResearchTeam', researchTeamSchema);
const DDDDataCollection =
  mongoose.models.DDDDataCollection || mongoose.model('DDDDataCollection', dataCollectionSchema);

/* ─── Domain Module ─── */
class ResearchProtocol {
  constructor() {
    this.name = 'ResearchProtocol';
  }

  async listProtocols(filter = {}) {
    return DDDResearchProtocol.find(filter).sort({ createdAt: -1 }).lean();
  }
  async getProtocol(id) {
    return DDDResearchProtocol.findById(id).lean();
  }
  async createProtocol(data) {
    data.protocolId = data.protocolId || `RP-${Date.now()}`;
    return DDDResearchProtocol.create(data);
  }
  async updateProtocol(id, data) {
    return DDDResearchProtocol.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async listIRBSubmissions(filter = {}) {
    return DDDIRBSubmission.find(filter).sort({ createdAt: -1 }).lean();
  }
  async submitToIRB(data) {
    data.submissionId = data.submissionId || `IRB-${Date.now()}`;
    data.submittedAt = new Date();
    return DDDIRBSubmission.create(data);
  }
  async updateIRBStatus(id, data) {
    return DDDIRBSubmission.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async listTeams(filter = {}) {
    return DDDResearchTeam.find(filter).sort({ createdAt: -1 }).lean();
  }
  async createTeam(data) {
    data.teamId = data.teamId || `RT-${Date.now()}`;
    return DDDResearchTeam.create(data);
  }

  async listDataCollections(filter = {}) {
    return DDDDataCollection.find(filter).sort({ createdAt: -1 }).lean();
  }
  async createDataCollection(data) {
    data.collectionId = data.collectionId || `DC-${Date.now()}`;
    return DDDDataCollection.create(data);
  }

  async getProtocolAnalytics(filter = {}) {
    const [protocols, irbs, teams, collections] = await Promise.all([
      DDDResearchProtocol.countDocuments(filter),
      DDDIRBSubmission.countDocuments(),
      DDDResearchTeam.countDocuments(),
      DDDDataCollection.countDocuments(),
    ]);
    return {
      totalProtocols: protocols,
      totalIRBs: irbs,
      totalTeams: teams,
      totalCollections: collections,
    };
  }

  async healthCheck() {
    const [p, i, t, d] = await Promise.all([
      DDDResearchProtocol.countDocuments(),
      DDDIRBSubmission.countDocuments(),
      DDDResearchTeam.countDocuments(),
      DDDDataCollection.countDocuments(),
    ]);
    return {
      status: 'ok',
      counts: { protocols: p, irbSubmissions: i, teams: t, dataCollections: d },
    };
  }
}

/* ─── Router Factory ─── */
function createResearchProtocolRouter() {
  const r = express.Router();
  const svc = new ResearchProtocol();

  r.get('/research-protocol/protocols', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listProtocols(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.get('/research-protocol/protocols/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getProtocol(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/research-protocol/protocols', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createProtocol(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.put('/research-protocol/protocols/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateProtocol(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/research-protocol/irb', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listIRBSubmissions(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/research-protocol/irb', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.submitToIRB(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.put('/research-protocol/irb/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateIRBStatus(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/research-protocol/teams', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTeams(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/research-protocol/teams', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createTeam(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/research-protocol/data-collections', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDataCollections(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/research-protocol/data-collections', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createDataCollection(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/research-protocol/analytics', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getProtocolAnalytics(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.get('/research-protocol/health', async (_req, res) => {
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
  ResearchProtocol,
  DDDResearchProtocol,
  DDDIRBSubmission,
  DDDResearchTeam,
  DDDDataCollection,
  PROTOCOL_TYPES,
  PROTOCOL_STATUSES,
  IRB_STATUSES,
  STUDY_PHASES,
  RISK_LEVELS,
  FUNDING_TYPES,
  BUILTIN_PROTOCOL_TEMPLATES,
  createResearchProtocolRouter,
};
