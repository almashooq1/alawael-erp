/**
 * ██████████████████████████████████████████████████████████████
 * ██  DDD Evidence Library — Phase 28                         ██
 * ██  Evidence-based practice library & guideline management  ██
 * ██████████████████████████████████████████████████████████████
 */

const mongoose = require('mongoose');
const express = require('express');

/* ─── Constants ─── */
const EVIDENCE_LEVELS = [
  'level_1a_systematic_review',
  'level_1b_rct',
  'level_2a_cohort',
  'level_2b_outcomes_research',
  'level_3_case_control',
  'level_4_case_series',
  'level_5_expert_opinion',
  'clinical_guideline',
  'consensus_statement',
  'best_practice',
  'emerging_evidence',
  'traditional_practice',
];

const EVIDENCE_STATUSES = [
  'draft',
  'under_review',
  'approved',
  'published',
  'archived',
  'superseded',
  'retracted',
  'pending_update',
  'in_translation',
  'active',
];

const PRACTICE_DOMAINS = [
  'physical_therapy',
  'occupational_therapy',
  'speech_therapy',
  'psychology',
  'social_work',
  'nursing',
  'assistive_technology',
  'early_intervention',
  'vocational_rehab',
  'pain_management',
  'neurological_rehab',
  'pediatric_rehab',
];

const RECOMMENDATION_GRADES = [
  'grade_a_strong',
  'grade_b_moderate',
  'grade_c_weak',
  'grade_d_against',
  'grade_i_insufficient',
  'good_practice_point',
  'expert_consensus',
  'conditional',
  'strong_for',
  'strong_against',
];

const GUIDELINE_TYPES = [
  'clinical_practice',
  'treatment_protocol',
  'assessment_guideline',
  'care_pathway',
  'discharge_criteria',
  'safety_guideline',
  'prevention_guideline',
  'screening_tool',
  'outcome_measure',
  'quality_standard',
  'ethical_guideline',
  'documentation_standard',
];

const SOURCE_TYPES = [
  'pubmed',
  'cochrane',
  'pedro',
  'cinahl',
  'embase',
  'web_of_science',
  'scopus',
  'google_scholar',
  'clinical_trials_gov',
  'who',
  'nice',
  'internal',
];

const BUILTIN_EVIDENCE_CATEGORIES = [
  'stroke_rehabilitation',
  'spinal_cord_injury',
  'traumatic_brain_injury',
  'cerebral_palsy',
  'autism_spectrum',
  'intellectual_disability',
  'musculoskeletal',
  'chronic_pain',
  'mental_health_rehab',
  'geriatric_rehabilitation',
];

/* ─── Schemas ─── */
const evidenceItemSchema = new mongoose.Schema(
  {
    evidenceId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    level: { type: String, enum: EVIDENCE_LEVELS, required: true },
    status: { type: String, enum: EVIDENCE_STATUSES, default: 'draft' },
    domain: { type: String, enum: PRACTICE_DOMAINS },
    source: { type: String, enum: SOURCE_TYPES },
    citation: { type: String },
    doi: { type: String },
    abstract: { type: String },
    findings: { type: String },
    implications: { type: String },
    keywords: [String],
    authors: [{ name: String, affiliation: String }],
    publishedDate: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

evidenceItemSchema.index({ evidenceId: 1 }, { unique: true });
evidenceItemSchema.index({ level: 1, domain: 1 });
evidenceItemSchema.index({ keywords: 1 });

const guidelineSchema = new mongoose.Schema(
  {
    guidelineId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: GUIDELINE_TYPES, required: true },
    status: { type: String, enum: EVIDENCE_STATUSES, default: 'draft' },
    domain: { type: String, enum: PRACTICE_DOMAINS },
    version: { type: String, default: '1.0' },
    recommendations: [
      {
        text: String,
        grade: { type: String, enum: RECOMMENDATION_GRADES },
        evidenceIds: [String],
        notes: String,
      },
    ],
    targetPopulation: { type: String },
    scope: { type: String },
    developedBy: { type: String },
    approvedDate: { type: Date },
    reviewDate: { type: Date },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

guidelineSchema.index({ guidelineId: 1 }, { unique: true });
guidelineSchema.index({ type: 1, status: 1 });

const evidenceReviewSchema = new mongoose.Schema(
  {
    reviewId: { type: String, required: true, unique: true },
    evidenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDEvidenceItem' },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 10 },
    methodology: { type: Number, min: 1, max: 10 },
    applicability: { type: Number, min: 1, max: 10 },
    comments: { type: String },
    recommendation: { type: String, enum: ['include', 'exclude', 'revise', 'needs_more_info'] },
    reviewedAt: { type: Date, default: Date.now },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

evidenceReviewSchema.index({ reviewId: 1 }, { unique: true });
evidenceReviewSchema.index({ evidenceId: 1 });

const evidenceSummarySchema = new mongoose.Schema(
  {
    summaryId: { type: String, required: true, unique: true },
    topic: { type: String, required: true },
    domain: { type: String, enum: PRACTICE_DOMAINS },
    evidenceCount: { type: Number, default: 0 },
    overallLevel: { type: String, enum: EVIDENCE_LEVELS },
    keyFindings: [String],
    gaps: [String],
    lastUpdated: { type: Date, default: Date.now },
    generatedBy: { type: String },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

evidenceSummarySchema.index({ summaryId: 1 }, { unique: true });
evidenceSummarySchema.index({ domain: 1 });

/* ─── Models ─── */
const DDDEvidenceItem =
  mongoose.models.DDDEvidenceItem || mongoose.model('DDDEvidenceItem', evidenceItemSchema);
const DDDGuideline =
  mongoose.models.DDDGuideline || mongoose.model('DDDGuideline', guidelineSchema);
const DDDEvidenceReview =
  mongoose.models.DDDEvidenceReview || mongoose.model('DDDEvidenceReview', evidenceReviewSchema);
const DDDEvidenceSummary =
  mongoose.models.DDDEvidenceSummary || mongoose.model('DDDEvidenceSummary', evidenceSummarySchema);

/* ─── Domain Module ─── */
class EvidenceLibrary {
  constructor() {
    this.name = 'EvidenceLibrary';
  }

  async listEvidence(filter = {}) {
    return DDDEvidenceItem.find(filter).sort({ publishedDate: -1 }).lean();
  }
  async getEvidence(id) {
    return DDDEvidenceItem.findById(id).lean();
  }
  async addEvidence(data) {
    data.evidenceId = data.evidenceId || `EV-${Date.now()}`;
    return DDDEvidenceItem.create(data);
  }
  async updateEvidence(id, data) {
    return DDDEvidenceItem.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async listGuidelines(filter = {}) {
    return DDDGuideline.find(filter).sort({ createdAt: -1 }).lean();
  }
  async getGuideline(id) {
    return DDDGuideline.findById(id).lean();
  }
  async createGuideline(data) {
    data.guidelineId = data.guidelineId || `GL-${Date.now()}`;
    return DDDGuideline.create(data);
  }
  async updateGuideline(id, data) {
    return DDDGuideline.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async listReviews(filter = {}) {
    return DDDEvidenceReview.find(filter).sort({ reviewedAt: -1 }).lean();
  }
  async submitReview(data) {
    data.reviewId = data.reviewId || `EVR-${Date.now()}`;
    return DDDEvidenceReview.create(data);
  }

  async listSummaries(filter = {}) {
    return DDDEvidenceSummary.find(filter).sort({ lastUpdated: -1 }).lean();
  }
  async generateSummary(data) {
    data.summaryId = data.summaryId || `EVS-${Date.now()}`;
    return DDDEvidenceSummary.create(data);
  }

  async getEvidenceAnalytics(filter = {}) {
    const [items, guidelines, reviews, summaries] = await Promise.all([
      DDDEvidenceItem.countDocuments(filter),
      DDDGuideline.countDocuments(),
      DDDEvidenceReview.countDocuments(),
      DDDEvidenceSummary.countDocuments(),
    ]);
    return {
      totalEvidence: items,
      totalGuidelines: guidelines,
      totalReviews: reviews,
      totalSummaries: summaries,
    };
  }

  async healthCheck() {
    const [e, g, r, s] = await Promise.all([
      DDDEvidenceItem.countDocuments(),
      DDDGuideline.countDocuments(),
      DDDEvidenceReview.countDocuments(),
      DDDEvidenceSummary.countDocuments(),
    ]);
    return { status: 'ok', counts: { evidence: e, guidelines: g, reviews: r, summaries: s } };
  }
}

/* ─── Router Factory ─── */
function createEvidenceLibraryRouter() {
  const r = express.Router();
  const svc = new EvidenceLibrary();

  r.get('/evidence-library/evidence', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEvidence(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.get('/evidence-library/evidence/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getEvidence(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/evidence-library/evidence', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addEvidence(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.put('/evidence-library/evidence/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateEvidence(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/evidence-library/guidelines', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listGuidelines(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.get('/evidence-library/guidelines/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getGuideline(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/evidence-library/guidelines', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createGuideline(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/evidence-library/reviews', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listReviews(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/evidence-library/reviews', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.submitReview(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/evidence-library/summaries', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listSummaries(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/evidence-library/summaries', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.generateSummary(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/evidence-library/analytics', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getEvidenceAnalytics(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.get('/evidence-library/health', async (_req, res) => {
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
  EvidenceLibrary,
  DDDEvidenceItem,
  DDDGuideline,
  DDDEvidenceReview,
  DDDEvidenceSummary,
  EVIDENCE_LEVELS,
  EVIDENCE_STATUSES,
  PRACTICE_DOMAINS,
  RECOMMENDATION_GRADES,
  GUIDELINE_TYPES,
  SOURCE_TYPES,
  BUILTIN_EVIDENCE_CATEGORIES,
  createEvidenceLibraryRouter,
};
