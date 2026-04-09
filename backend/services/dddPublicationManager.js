'use strict';
/**
 * DDD Publication Manager Service
 * ────────────────────────────────
 * Phase 35 – Clinical Research & Evidence-Based Practice (Module 4/4)
 *
 * Manages research publications, manuscript preparation, peer review,
 * citation tracking, conference presentations, and knowledge dissemination.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const PUBLICATION_TYPES = [
  'journal_article',
  'conference_paper',
  'book_chapter',
  'thesis',
  'case_report',
  'systematic_review',
  'meta_analysis',
  'editorial',
  'letter',
  'poster',
  'technical_report',
  'white_paper',
];

const PUBLICATION_STATUSES = [
  'idea',
  'outline',
  'drafting',
  'internal_review',
  'submitted',
  'under_review',
  'revision_requested',
  'revised',
  'accepted',
  'in_press',
  'published',
  'rejected',
];

const JOURNAL_TIERS = [
  'q1_top',
  'q1',
  'q2',
  'q3',
  'q4',
  'indexed',
  'peer_reviewed',
  'open_access',
  'predatory_warning',
  'not_indexed',
];

const AUTHOR_ROLES = [
  'first_author',
  'corresponding_author',
  'co_author',
  'senior_author',
  'contributing_author',
  'statistician',
  'research_assistant',
  'supervisor',
  'technical_writer',
  'editor',
];

const DISSEMINATION_CHANNELS = [
  'journal',
  'conference_oral',
  'conference_poster',
  'webinar',
  'workshop',
  'social_media',
  'press_release',
  'institutional_repository',
  'preprint_server',
  'podcast',
];

const CITATION_DATABASES = [
  'pubmed',
  'scopus',
  'web_of_science',
  'google_scholar',
  'crossref',
  'semantic_scholar',
  'dimensions',
  'cinahl',
  'pedro',
  'cochrane',
];

const BUILTIN_PUBLICATION_TEMPLATES = [
  {
    code: 'ORIG_RESEARCH',
    label: 'Original Research Article',
    type: 'journal_article',
    sections: ['intro', 'methods', 'results', 'discussion'],
  },
  {
    code: 'CASE_RPT',
    label: 'Case Report',
    type: 'case_report',
    sections: ['intro', 'case_description', 'discussion'],
  },
  {
    code: 'SYS_REV',
    label: 'Systematic Review',
    type: 'systematic_review',
    sections: ['intro', 'methods', 'results', 'discussion'],
  },
  {
    code: 'CONF_POSTER',
    label: 'Conference Poster',
    type: 'poster',
    sections: ['background', 'methods', 'results', 'conclusions'],
  },
  {
    code: 'CONF_ORAL',
    label: 'Conference Oral Presentation',
    type: 'conference_paper',
    sections: ['intro', 'methods', 'results', 'implications'],
  },
  {
    code: 'BOOK_CHAP',
    label: 'Book Chapter',
    type: 'book_chapter',
    sections: ['intro', 'body', 'summary'],
  },
  {
    code: 'TECH_RPT',
    label: 'Technical Report',
    type: 'technical_report',
    sections: ['executive_summary', 'methods', 'findings', 'recommendations'],
  },
  {
    code: 'META_ANAL',
    label: 'Meta-Analysis',
    type: 'meta_analysis',
    sections: ['intro', 'methods', 'results', 'discussion'],
  },
  {
    code: 'EDITORIAL',
    label: 'Editorial/Commentary',
    type: 'editorial',
    sections: ['perspective', 'argument', 'conclusion'],
  },
  {
    code: 'WHITE_PAPER',
    label: 'White Paper',
    type: 'white_paper',
    sections: ['problem', 'analysis', 'solution', 'implementation'],
  },
];

/* ═══════════════════ Schemas ═══════════════════ */
const manuscriptSchema = new Schema(
  {
    title: { type: String, required: true },
    publicationType: { type: String, enum: PUBLICATION_TYPES, required: true },
    status: { type: String, enum: PUBLICATION_STATUSES, default: 'idea' },
    studyId: { type: Schema.Types.ObjectId, ref: 'DDDResearchStudy' },
    abstract: { type: String },
    keywords: [{ type: String }],
    targetJournal: { type: String },
    journalTier: { type: String, enum: JOURNAL_TIERS },
    submittedAt: { type: Date },
    acceptedAt: { type: Date },
    publishedAt: { type: Date },
    doi: { type: String },
    wordCount: { type: Number },
    revisionCount: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
manuscriptSchema.index({ publicationType: 1, status: 1 });
manuscriptSchema.index({ studyId: 1 });

const authorshipSchema = new Schema(
  {
    manuscriptId: { type: Schema.Types.ObjectId, ref: 'DDDManuscript', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: AUTHOR_ROLES, required: true },
    position: { type: Number },
    affiliation: { type: String },
    orcid: { type: String },
    contributionDesc: { type: String },
    hasConsented: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
authorshipSchema.index({ manuscriptId: 1, position: 1 });
authorshipSchema.index({ userId: 1 });

const citationRecordSchema = new Schema(
  {
    manuscriptId: { type: Schema.Types.ObjectId, ref: 'DDDManuscript', required: true },
    database: { type: String, enum: CITATION_DATABASES, required: true },
    citationCount: { type: Number, default: 0 },
    hIndex: { type: Number },
    recordedAt: { type: Date, default: Date.now },
    externalId: { type: String },
    impactFactor: { type: Number },
    altmetricScore: { type: Number },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
citationRecordSchema.index({ manuscriptId: 1, database: 1 });
citationRecordSchema.index({ recordedAt: -1 });

const disseminationEventSchema = new Schema(
  {
    manuscriptId: { type: Schema.Types.ObjectId, ref: 'DDDManuscript' },
    studyId: { type: Schema.Types.ObjectId, ref: 'DDDResearchStudy' },
    channel: { type: String, enum: DISSEMINATION_CHANNELS, required: true },
    title: { type: String, required: true },
    eventDate: { type: Date },
    venue: { type: String },
    audience: { type: String },
    attendees: { type: Number },
    presentedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    url: { type: String },
    feedback: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
disseminationEventSchema.index({ channel: 1, eventDate: -1 });
disseminationEventSchema.index({ manuscriptId: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDManuscript =
  mongoose.models.DDDManuscript || mongoose.model('DDDManuscript', manuscriptSchema);
const DDDAuthorship =
  mongoose.models.DDDAuthorship || mongoose.model('DDDAuthorship', authorshipSchema);
const DDDCitationRecord =
  mongoose.models.DDDCitationRecord || mongoose.model('DDDCitationRecord', citationRecordSchema);
const DDDDisseminationEvent =
  mongoose.models.DDDDisseminationEvent ||
  mongoose.model('DDDDisseminationEvent', disseminationEventSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class PublicationManager {
  async createManuscript(data) {
    return DDDManuscript.create(data);
  }
  async listManuscripts(filter = {}, page = 1, limit = 20) {
    return DDDManuscript.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateManuscript(id, data) {
    return DDDManuscript.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async addAuthorship(data) {
    return DDDAuthorship.create(data);
  }
  async listAuthorships(filter = {}, page = 1, limit = 20) {
    return DDDAuthorship.find(filter)
      .sort({ position: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async recordCitation(data) {
    return DDDCitationRecord.create(data);
  }
  async listCitations(filter = {}, page = 1, limit = 20) {
    return DDDCitationRecord.find(filter)
      .sort({ recordedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async createDissemination(data) {
    return DDDDisseminationEvent.create(data);
  }
  async listDisseminations(filter = {}, page = 1, limit = 20) {
    return DDDDisseminationEvent.find(filter)
      .sort({ eventDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async getPublicationStats() {
    const [manuscripts, published, totalCitations, events] = await Promise.all([
      DDDManuscript.countDocuments(),
      DDDManuscript.countDocuments({ status: 'published' }),
      DDDCitationRecord.aggregate([{ $group: { _id: null, total: { $sum: '$citationCount' } } }]),
      DDDDisseminationEvent.countDocuments(),
    ]);
    return {
      totalManuscripts: manuscripts,
      publishedCount: published,
      totalCitations: totalCitations[0]?.total || 0,
      disseminationEvents: events,
    };
  }

  async healthCheck() {
    const [manuscripts, authorships, citations, disseminations] = await Promise.all([
      DDDManuscript.countDocuments(),
      DDDAuthorship.countDocuments(),
      DDDCitationRecord.countDocuments(),
      DDDDisseminationEvent.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'PublicationManager',
      counts: { manuscripts, authorships, citations, disseminations },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createPublicationManagerRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new PublicationManager();

  router.get('/publication-manager/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/publication-manager/manuscripts', async (req, res) => {
    try {
      res.status(201).json(await svc.createManuscript(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/publication-manager/manuscripts', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listManuscripts(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/publication-manager/manuscripts/:id', async (req, res) => {
    try {
      res.json(await svc.updateManuscript(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/publication-manager/authorships', async (req, res) => {
    try {
      res.status(201).json(await svc.addAuthorship(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/publication-manager/authorships', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listAuthorships(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/publication-manager/citations', async (req, res) => {
    try {
      res.status(201).json(await svc.recordCitation(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/publication-manager/citations', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listCitations(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/publication-manager/disseminations', async (req, res) => {
    try {
      res.status(201).json(await svc.createDissemination(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/publication-manager/disseminations', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listDisseminations(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/publication-manager/stats', async (_req, res) => {
    try {
      res.json(await svc.getPublicationStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  PUBLICATION_TYPES,
  PUBLICATION_STATUSES,
  JOURNAL_TIERS,
  AUTHOR_ROLES,
  DISSEMINATION_CHANNELS,
  CITATION_DATABASES,
  BUILTIN_PUBLICATION_TEMPLATES,
  DDDManuscript,
  DDDAuthorship,
  DDDCitationRecord,
  DDDDisseminationEvent,
  PublicationManager,
  createPublicationManagerRouter,
};
