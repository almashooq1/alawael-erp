/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Knowledge Base — Phase 17 · Learning Management & Training
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Knowledge articles, clinical protocols, best practices library, FAQs,
 * clinical guidelines, procedure manuals, and institutional knowledge
 * management for rehabilitation teams.
 *
 * Aggregates
 *   DDDArticle          — knowledge base article
 *   DDDProtocol         — clinical protocol / guideline
 *   DDDFAQ              — frequently asked questions
 *   DDDArticleCategory  — hierarchical category taxonomy
 *
 * Canonical links
 *   authorId     → User / Staff
 *   departmentId → Organization structure
 *   courseId     → DDDCourse (dddLearningManagement)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Router } = require('express');

/** Lightweight base so every DDD module has .log() */
class BaseDomainModule {
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;
  }
  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }
}

/* ── helper ────────────────────────────────────────────────────────────────── */
const model = name => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

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

const DDDArticle = mongoose.models.DDDArticle || mongoose.model('DDDArticle', articleSchema);

/* ── Protocol ──────────────────────────────────────────────────────────── */
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

const DDDProtocol = mongoose.models.DDDProtocol || mongoose.model('DDDProtocol', protocolSchema);

/* ── FAQ ───────────────────────────────────────────────────────────────── */
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

const DDDFAQ = mongoose.models.DDDFAQ || mongoose.model('DDDFAQ', faqSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class KnowledgeBase extends BaseDomainModule {
  constructor() {
    super('KnowledgeBase', {
      description: 'Knowledge articles, clinical protocols, best practices & FAQs',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedCategories();
    this.log('Knowledge Base initialised ✓');
    return true;
  }

  async _seedCategories() {
    for (const c of BUILTIN_CATEGORIES) {
      const exists = await DDDArticleCategory.findOne({ code: c.code }).lean();
      if (!exists) await DDDArticleCategory.create(c);
    }
  }

  /* ── Category CRUD ── */
  async listCategories(filters = {}) {
    const q = {};
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    if (filters.parentCode !== undefined) q.parentCode = filters.parentCode;
    return DDDArticleCategory.find(q).sort({ order: 1 }).lean();
  }
  async getCategory(id) {
    return DDDArticleCategory.findById(id).lean();
  }
  async createCategory(data) {
    return DDDArticleCategory.create(data);
  }
  async updateCategory(id, data) {
    return DDDArticleCategory.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Article CRUD ── */
  async listArticles(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.authorId) q.authorId = filters.authorId;
    if (filters.audience) q.audience = filters.audience;
    if (filters.tags) q.tags = { $in: Array.isArray(filters.tags) ? filters.tags : [filters.tags] };
    return DDDArticle.find(q).sort({ publishedAt: -1, createdAt: -1 }).lean();
  }
  async getArticle(id) {
    return DDDArticle.findById(id).lean();
  }
  async getArticleBySlug(slug) {
    return DDDArticle.findOne({ slug }).lean();
  }

  async createArticle(data) {
    if (!data.slug)
      data.slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return DDDArticle.create(data);
  }

  async updateArticle(id, data, userId) {
    const article = await DDDArticle.findById(id);
    if (!article) throw new Error('Article not found');
    // Version history
    article.previousVersions.push({
      version: article.version,
      content: article.content,
      updatedAt: new Date(),
      updatedBy: userId,
      changeNotes: data.changeNotes || '',
    });
    article.version += 1;
    article.lastUpdatedAt = new Date();
    Object.assign(article, data);
    await article.save();
    return article;
  }

  async publishArticle(id, userId) {
    return DDDArticle.findByIdAndUpdate(
      id,
      {
        status: 'published',
        publishedAt: new Date(),
        approvedBy: userId,
      },
      { new: true }
    );
  }

  async incrementViewCount(id) {
    return DDDArticle.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
  }

  async searchArticles(query) {
    return DDDArticle.find(
      { $text: { $search: query }, status: 'published' },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(50)
      .lean();
  }

  /* ── Protocol CRUD ── */
  async listProtocols(filters = {}) {
    const q = {};
    if (filters.level) q.level = filters.level;
    if (filters.status) q.status = filters.status;
    if (filters.category) q.category = filters.category;
    return DDDProtocol.find(q).sort({ code: 1 }).lean();
  }
  async getProtocol(id) {
    return DDDProtocol.findById(id).lean();
  }
  async createProtocol(data) {
    return DDDProtocol.create(data);
  }
  async updateProtocol(id, data) {
    return DDDProtocol.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async publishProtocol(id, userId) {
    return DDDProtocol.findByIdAndUpdate(
      id,
      {
        status: 'published',
        publishedAt: new Date(),
        approvedBy: userId,
        effectiveFrom: new Date(),
      },
      { new: true }
    );
  }

  /* ── FAQ CRUD ── */
  async listFAQs(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.isPublished !== undefined) q.isPublished = filters.isPublished;
    if (filters.audience) q.audience = filters.audience;
    return DDDFAQ.find(q).sort({ category: 1, order: 1 }).lean();
  }
  async getFAQ(id) {
    return DDDFAQ.findById(id).lean();
  }
  async createFAQ(data) {
    return DDDFAQ.create(data);
  }
  async updateFAQ(id, data) {
    return DDDFAQ.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async searchFAQs(query) {
    return DDDFAQ.find(
      { $text: { $search: query }, isPublished: true },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(30)
      .lean();
  }

  async recordFeedback(faqId, helpful) {
    const field = helpful ? 'helpfulCount' : 'notHelpfulCount';
    return DDDFAQ.findByIdAndUpdate(faqId, { $inc: { [field]: 1 } }, { new: true });
  }

  /* ── Analytics ── */
  async getKBAnalytics() {
    const [articles, protocols, faqs, categories] = await Promise.all([
      DDDArticle.countDocuments(),
      DDDProtocol.countDocuments(),
      DDDFAQ.countDocuments(),
      DDDArticleCategory.countDocuments(),
    ]);
    const published = await DDDArticle.countDocuments({ status: 'published' });
    const needsUpdate = await DDDArticle.countDocuments({ status: 'needs_update' });
    const topViewed = await DDDArticle.find({ status: 'published' })
      .sort({ viewCount: -1 })
      .limit(10)
      .select('title slug viewCount category')
      .lean();
    return { articles, published, needsUpdate, protocols, faqs, categories, topViewed };
  }

  /** Health check */
  async healthCheck() {
    const [articles, protocols, faqs, categories] = await Promise.all([
      DDDArticle.countDocuments(),
      DDDProtocol.countDocuments(),
      DDDFAQ.countDocuments(),
      DDDArticleCategory.countDocuments(),
    ]);
    return { status: 'healthy', articles, protocols, faqs, categories };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createKnowledgeBaseRouter() {
  const router = Router();
  const kb = new KnowledgeBase();

  /* ── Categories ── */
  router.get('/knowledge/categories', async (req, res) => {
    try {
      res.json({ success: true, data: await kb.listCategories(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/knowledge/categories/:id', async (req, res) => {
    try {
      const d = await kb.getCategory(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/knowledge/categories', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await kb.createCategory(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/knowledge/categories/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await kb.updateCategory(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Articles ── */
  router.get('/knowledge/articles', async (req, res) => {
    try {
      res.json({ success: true, data: await kb.listArticles(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/knowledge/articles/search', async (req, res) => {
    try {
      res.json({ success: true, data: await kb.searchArticles(req.query.q) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/knowledge/articles/slug/:slug', async (req, res) => {
    try {
      const d = await kb.getArticleBySlug(req.params.slug);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/knowledge/articles/:id', async (req, res) => {
    try {
      const d = await kb.getArticle(req.params.id);
      if (d) {
        await kb.incrementViewCount(req.params.id);
        res.json({ success: true, data: d });
      } else res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/knowledge/articles', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await kb.createArticle(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/knowledge/articles/:id', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await kb.updateArticle(req.params.id, req.body, req.body.userId),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/knowledge/articles/:id/publish', async (req, res) => {
    try {
      res.json({ success: true, data: await kb.publishArticle(req.params.id, req.body.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Protocols ── */
  router.get('/knowledge/protocols', async (req, res) => {
    try {
      res.json({ success: true, data: await kb.listProtocols(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/knowledge/protocols/:id', async (req, res) => {
    try {
      const d = await kb.getProtocol(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/knowledge/protocols', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await kb.createProtocol(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/knowledge/protocols/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await kb.updateProtocol(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/knowledge/protocols/:id/publish', async (req, res) => {
    try {
      res.json({ success: true, data: await kb.publishProtocol(req.params.id, req.body.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── FAQs ── */
  router.get('/knowledge/faqs', async (req, res) => {
    try {
      res.json({ success: true, data: await kb.listFAQs(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/knowledge/faqs/search', async (req, res) => {
    try {
      res.json({ success: true, data: await kb.searchFAQs(req.query.q) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/knowledge/faqs/:id', async (req, res) => {
    try {
      const d = await kb.getFAQ(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/knowledge/faqs', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await kb.createFAQ(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/knowledge/faqs/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await kb.updateFAQ(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/knowledge/faqs/:id/feedback', async (req, res) => {
    try {
      res.json({ success: true, data: await kb.recordFeedback(req.params.id, req.body.helpful) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Analytics ── */
  router.get('/knowledge/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await kb.getKBAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Health ── */
  router.get('/knowledge/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await kb.healthCheck() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  EXPORTS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  KnowledgeBase,
  DDDArticle,
  DDDProtocol,
  DDDFAQ,
  DDDArticleCategory,
  ARTICLE_CATEGORIES,
  ARTICLE_STATUSES,
  ARTICLE_TYPES,
  PROTOCOL_LEVELS,
  EVIDENCE_LEVELS,
  FAQ_CATEGORIES,
  AUDIENCE_TYPES,
  BUILTIN_CATEGORIES,
  createKnowledgeBaseRouter,
};
