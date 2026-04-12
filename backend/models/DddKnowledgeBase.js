'use strict';
/**
 * DddKnowledgeBase — Mongoose Models & Constants
 * Auto-extracted from services/dddKnowledgeBase.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const ARTICLE_CATEGORIES = [
  'clinical_guidelines',
  'treatment_protocols',
  'assessment_tools',
  'best_practices',
  'procedures',
  'policies',
  'safety',
  'equipment_guides',
  'patient_education',
  'staff_orientation',
  'research_summaries',
  'case_studies',
  'regulatory',
  'technology',
  'administrative',
];

const ARTICLE_STATUSES = [
  'draft',
  'in_review',
  'approved',
  'published',
  'needs_update',
  'archived',
  'deprecated',
  'rejected',
];

const ARTICLE_TYPES = [
  'article',
  'protocol',
  'guideline',
  'manual',
  'quick_reference',
  'checklist',
  'template',
  'video_guide',
  'infographic',
  'decision_tree',
  'flowchart',
  'reference_card',
];

const PROTOCOL_LEVELS = [
  'institutional',
  'departmental',
  'unit_specific',
  'national',
  'international',
  'specialty',
];

const EVIDENCE_LEVELS = [
  'level_1a',
  'level_1b',
  'level_2a',
  'level_2b',
  'level_3',
  'level_4',
  'level_5',
  'expert_opinion',
  'consensus',
  'best_practice',
];

const FAQ_CATEGORIES = [
  'general',
  'clinical',
  'administrative',
  'technical',
  'billing',
  'insurance',
  'scheduling',
  'safety',
  'equipment',
  'policies',
  'training',
  'patient_portal',
];

const AUDIENCE_TYPES = [
  'all_staff',
  'physicians',
  'therapists',
  'nurses',
  'administrators',
  'technicians',
  'students',
  'supervisors',
  'patients',
  'families',
];

/* ── Built-in article categories ────────────────────────────────────────── */
const BUILTIN_CATEGORIES = [
  {
    code: 'CAT-CLIN',
    name: 'Clinical Guidelines',
    nameAr: 'الإرشادات السريرية',
    parentCode: null,
    order: 1,
  },
  {
    code: 'CAT-TREAT',
    name: 'Treatment Protocols',
    nameAr: 'بروتوكولات العلاج',
    parentCode: 'CAT-CLIN',
    order: 2,
  },
  {
    code: 'CAT-ASSESS',
    name: 'Assessment Tools',
    nameAr: 'أدوات التقييم',
    parentCode: 'CAT-CLIN',
    order: 3,
  },
  {
    code: 'CAT-SAFE',
    name: 'Safety & Compliance',
    nameAr: 'السلامة والامتثال',
    parentCode: null,
    order: 4,
  },
  {
    code: 'CAT-EQUIP',
    name: 'Equipment & Technology',
    nameAr: 'المعدات والتقنية',
    parentCode: null,
    order: 5,
  },
  {
    code: 'CAT-ADMIN',
    name: 'Administrative Procedures',
    nameAr: 'الإجراءات الإدارية',
    parentCode: null,
    order: 6,
  },
  {
    code: 'CAT-PATED',
    name: 'Patient Education',
    nameAr: 'تثقيف المريض',
    parentCode: null,
    order: 7,
  },
  {
    code: 'CAT-RESEARCH',
    name: 'Research & Evidence',
    nameAr: 'البحث والأدلة',
    parentCode: null,
    order: 8,
  },
  {
    code: 'CAT-ORIENT',
    name: 'Staff Orientation',
    nameAr: 'تهيئة الموظفين',
    parentCode: null,
    order: 9,
  },
  {
    code: 'CAT-QUALITY',
    name: 'Quality Improvement',
    nameAr: 'تحسين الجودة',
    parentCode: null,
    order: 10,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Article Category ──────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const articleCategorySchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    parentCode: { type: String, default: null },
    order: { type: Number, default: 0 },
    icon: { type: String },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDArticleCategory =
  mongoose.models.DDDArticleCategory || mongoose.model('DDDArticleCategory', articleCategorySchema);

/* ── Article ───────────────────────────────────────────────────────────── */
const articleSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    content: { type: String, required: true },
    contentAr: { type: String },
    summary: { type: String },
    summaryAr: { type: String },
    category: { type: String, enum: ARTICLE_CATEGORIES, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'DDDArticleCategory' },
    type: { type: String, enum: ARTICLE_TYPES, default: 'article' },
    status: { type: String, enum: ARTICLE_STATUSES, default: 'draft' },
    audience: [{ type: String, enum: AUDIENCE_TYPES }],
    tags: [{ type: String }],
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    version: { type: Number, default: 1 },
    previousVersions: [
      {
        version: Number,
        content: String,
        updatedAt: Date,
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        changeNotes: String,
      },
    ],
    publishedAt: { type: Date },
    reviewedAt: { type: Date },
    lastUpdatedAt: { type: Date },
    nextReviewDate: { type: Date },
    viewCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    attachments: [{ name: String, url: String, type: String, size: Number }],
    relatedArticles: [{ type: Schema.Types.ObjectId, ref: 'DDDArticle' }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

articleSchema.index({ category: 1, status: 1 });
articleSchema.index({ slug: 1 });
articleSchema.index({ tags: 1 });
articleSchema.index({ title: 'text', content: 'text', summary: 'text' });

const protocolSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    content: { type: String, required: true },
    contentAr: { type: String },
    level: { type: String, enum: PROTOCOL_LEVELS, required: true },
    evidenceLevel: { type: String, enum: EVIDENCE_LEVELS },
    status: { type: String, enum: ARTICLE_STATUSES, default: 'draft' },
    category: { type: String, enum: ARTICLE_CATEGORIES, default: 'treatment_protocols' },
    applicableTo: [{ type: String }],
    contraindications: [{ type: String }],
    steps: [
      {
        order: { type: Number },
        title: { type: String },
        titleAr: { type: String },
        description: { type: String },
        descriptionAr: { type: String },
        isRequired: { type: Boolean, default: true },
        duration: { type: Number },
        warnings: [{ type: String }],
      },
    ],
    references: [
      {
        citation: { type: String },
        url: { type: String },
        type: { type: String },
      },
    ],
    version: { type: Number, default: 1 },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date },
    effectiveFrom: { type: Date },
    nextReviewDate: { type: Date },
    retiredAt: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

protocolSchema.index({ level: 1, status: 1 });
protocolSchema.index({ code: 1 });

const faqSchema = new Schema(
  {
    question: { type: String, required: true },
    questionAr: { type: String },
    answer: { type: String, required: true },
    answerAr: { type: String },
    category: { type: String, enum: FAQ_CATEGORIES, required: true },
    audience: [{ type: String, enum: AUDIENCE_TYPES }],
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    helpfulCount: { type: Number, default: 0 },
    notHelpfulCount: { type: Number, default: 0 },
    tags: [{ type: String }],
    authorId: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

faqSchema.index({ category: 1, isPublished: 1, order: 1 });
faqSchema.index({ question: 'text', answer: 'text' });


/* ═══════════════════ Models ═══════════════════ */

const DDDArticle = mongoose.models.DDDArticle || mongoose.model('DDDArticle', articleSchema);

/* ── Protocol ──────────────────────────────────────────────────────────── */
const DDDProtocol = mongoose.models.DDDProtocol || mongoose.model('DDDProtocol', protocolSchema);

/* ── FAQ ───────────────────────────────────────────────────────────────── */
const DDDFAQ = mongoose.models.DDDFAQ || mongoose.model('DDDFAQ', faqSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  ARTICLE_CATEGORIES,
  ARTICLE_STATUSES,
  ARTICLE_TYPES,
  PROTOCOL_LEVELS,
  EVIDENCE_LEVELS,
  FAQ_CATEGORIES,
  AUDIENCE_TYPES,
  BUILTIN_CATEGORIES,
  DDDArticleCategory,
  DDDArticle,
  DDDProtocol,
  DDDFAQ,
};
