'use strict';
/**
 * DddPublicationTracker Model
 * Auto-extracted from services/dddPublicationTracker.js
 * Schemas, constants, and Mongoose model registrations.
 */
const mongoose = require('mongoose');

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

module.exports = {
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
};
