/**
 * ██████████████████████████████████████████████████████████████
 * ██  DDD Publication Tracker — Phase 28                      ██
 * ██  Track research publications, citations & impact         ██
 * ██████████████████████████████████████████████████████████████
 */

const mongoose = require('mongoose');
const express = require('express');

/* ─── Constants ─── */
const PUBLICATION_TYPES = [
  'journal_article',
  'conference_paper',
  'book_chapter',
  'thesis',
  'technical_report',
  'systematic_review',
  'meta_analysis',
  'case_report',
  'editorial',
  'letter',
  'poster',
  'abstract',
];

const PUBLICATION_STATUSES = [
  'idea',
  'in_progress',
  'draft_complete',
  'internal_review',
  'submitted',
  'under_review',
  'revision_requested',
  'accepted',
  'published',
  'rejected',
];

const JOURNAL_TIERS = [
  'q1_top',
  'q2_high',
  'q3_moderate',
  'q4_entry',
  'indexed',
  'non_indexed',
  'preprint',
  'open_access',
  'institutional',
  'regional',
];

const AUTHOR_ROLES = [
  'first_author',
  'corresponding_author',
  'co_author',
  'senior_author',
  'contributing_author',
  'statistician',
  'methodologist',
  'reviewer',
  'editor',
  'supervisor',
  'research_assistant',
  'data_analyst',
];

const IMPACT_METRICS = [
  'citations',
  'h_index',
  'impact_factor',
  'altmetric_score',
  'downloads',
  'views',
  'social_shares',
  'media_mentions',
  'policy_citations',
  'clinical_guideline_citations',
  'patent_citations',
  'practice_change',
];

const DISSEMINATION_CHANNELS = [
  'peer_reviewed_journal',
  'conference_presentation',
  'workshop',
  'webinar',
  'social_media',
  'press_release',
  'institutional_report',
  'policy_brief',
  'patient_education',
  'community_outreach',
  'professional_network',
  'open_repository',
];

const BUILTIN_JOURNAL_LIST = [
  'rehabilitation_medicine',
  'disability_and_health',
  'physical_therapy',
  'occupational_therapy',
  'speech_pathology',
  'assistive_technology',
  'clinical_rehabilitation',
  'neurorehabilitation',
  'pediatric_rehabilitation',
  'community_health',
];

/* ─── Schemas ─── */
const publicationSchema = new mongoose.Schema(
  {
    publicationId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: PUBLICATION_TYPES, required: true },
    status: { type: String, enum: PUBLICATION_STATUSES, default: 'idea' },
    authors: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        role: { type: String, enum: AUTHOR_ROLES },
        affiliation: String,
        order: Number,
      },
    ],
    abstract: { type: String },
    keywords: [String],
    journal: { name: String, tier: { type: String, enum: JOURNAL_TIERS }, impactFactor: Number },
    doi: { type: String },
    publishedDate: { type: Date },
    submittedDate: { type: Date },
    protocolId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDResearchProtocol' },
    trialId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDClinicalTrial' },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

publicationSchema.index({ publicationId: 1 }, { unique: true });
publicationSchema.index({ type: 1, status: 1 });
publicationSchema.index({ 'authors.userId': 1 });

const citationSchema = new mongoose.Schema(
  {
    citationId: { type: String, required: true, unique: true },
    publicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDPublication', required: true },
    citedBy: { type: String, required: true },
    citedByDoi: { type: String },
    citedByJournal: { type: String },
    citedAt: { type: Date, default: Date.now },
    context: { type: String },
    selfCitation: { type: Boolean, default: false },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

citationSchema.index({ citationId: 1 }, { unique: true });
citationSchema.index({ publicationId: 1, citedAt: -1 });

const impactRecordSchema = new mongoose.Schema(
  {
    recordId: { type: String, required: true, unique: true },
    publicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDPublication' },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metric: { type: String, enum: IMPACT_METRICS, required: true },
    value: { type: Number, required: true },
    period: { type: String },
    measuredAt: { type: Date, default: Date.now },
    source: { type: String },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

impactRecordSchema.index({ recordId: 1 }, { unique: true });
impactRecordSchema.index({ publicationId: 1, metric: 1 });

const disseminationSchema = new mongoose.Schema(
  {
    disseminationId: { type: String, required: true, unique: true },
    publicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDPublication' },
    channel: { type: String, enum: DISSEMINATION_CHANNELS, required: true },
    title: { type: String, required: true },
    description: { type: String },
    audience: { type: String },
    date: { type: Date, default: Date.now },
    reach: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    attachments: [{ name: String, url: String }],
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

disseminationSchema.index({ disseminationId: 1 }, { unique: true });
disseminationSchema.index({ publicationId: 1, channel: 1 });

/* ─── Models ─── */
const DDDPublication =
  mongoose.models.DDDPublication || mongoose.model('DDDPublication', publicationSchema);
const DDDCitation = mongoose.models.DDDCitation || mongoose.model('DDDCitation', citationSchema);
const DDDImpactRecord =
  mongoose.models.DDDImpactRecord || mongoose.model('DDDImpactRecord', impactRecordSchema);
const DDDDissemination =
  mongoose.models.DDDDissemination || mongoose.model('DDDDissemination', disseminationSchema);

/* ─── Domain Module ─── */
class PublicationTracker {
  constructor() {
    this.name = 'PublicationTracker';
  }

  async listPublications(filter = {}) {
    return DDDPublication.find(filter).sort({ createdAt: -1 }).lean();
  }
  async getPublication(id) {
    return DDDPublication.findById(id).lean();
  }
  async createPublication(data) {
    data.publicationId = data.publicationId || `PUB-${Date.now()}`;
    return DDDPublication.create(data);
  }
  async updatePublication(id, data) {
    return DDDPublication.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async listCitations(filter = {}) {
    return DDDCitation.find(filter).sort({ citedAt: -1 }).lean();
  }
  async addCitation(data) {
    data.citationId = data.citationId || `CIT-${Date.now()}`;
    return DDDCitation.create(data);
  }

  async listImpactRecords(filter = {}) {
    return DDDImpactRecord.find(filter).sort({ measuredAt: -1 }).lean();
  }
  async recordImpact(data) {
    data.recordId = data.recordId || `IMP-${Date.now()}`;
    return DDDImpactRecord.create(data);
  }

  async listDisseminations(filter = {}) {
    return DDDDissemination.find(filter).sort({ date: -1 }).lean();
  }
  async createDissemination(data) {
    data.disseminationId = data.disseminationId || `DIS-${Date.now()}`;
    return DDDDissemination.create(data);
  }

  async getPublicationAnalytics(filter = {}) {
    const [pubs, cites, impacts, dissem] = await Promise.all([
      DDDPublication.countDocuments(filter),
      DDDCitation.countDocuments(),
      DDDImpactRecord.countDocuments(),
      DDDDissemination.countDocuments(),
    ]);
    return {
      totalPublications: pubs,
      totalCitations: cites,
      totalImpactRecords: impacts,
      totalDisseminations: dissem,
    };
  }

  async healthCheck() {
    const [p, c, i, d] = await Promise.all([
      DDDPublication.countDocuments(),
      DDDCitation.countDocuments(),
      DDDImpactRecord.countDocuments(),
      DDDDissemination.countDocuments(),
    ]);
    return {
      status: 'ok',
      counts: { publications: p, citations: c, impactRecords: i, disseminations: d },
    };
  }
}

/* ─── Router Factory ─── */
function createPublicationTrackerRouter() {
  const r = express.Router();
  const svc = new PublicationTracker();

  r.get('/publication-tracker/publications', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPublications(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.get('/publication-tracker/publications/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getPublication(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/publication-tracker/publications', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPublication(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.put('/publication-tracker/publications/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updatePublication(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/publication-tracker/citations', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listCitations(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/publication-tracker/citations', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addCitation(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/publication-tracker/impact', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listImpactRecords(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/publication-tracker/impact', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordImpact(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/publication-tracker/disseminations', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDisseminations(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.post('/publication-tracker/disseminations', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createDissemination(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/publication-tracker/analytics', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getPublicationAnalytics(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  r.get('/publication-tracker/health', async (_req, res) => {
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
  PublicationTracker,
  DDDPublication,
  DDDCitation,
  DDDImpactRecord,
  DDDDissemination,
  PUBLICATION_TYPES,
  PUBLICATION_STATUSES,
  JOURNAL_TIERS,
  AUTHOR_ROLES,
  IMPACT_METRICS,
  DISSEMINATION_CHANNELS,
  BUILTIN_JOURNAL_LIST,
  createPublicationTrackerRouter,
};
