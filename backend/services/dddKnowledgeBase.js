'use strict';
/**
 * KnowledgeBase Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddKnowledgeBase.js
 */

const {
  DDDArticleCategory,
  DDDArticle,
  DDDProtocol,
  DDDFAQ,
  ARTICLE_CATEGORIES,
  ARTICLE_STATUSES,
  ARTICLE_TYPES,
  PROTOCOL_LEVELS,
  EVIDENCE_LEVELS,
  FAQ_CATEGORIES,
  AUDIENCE_TYPES,
  BUILTIN_CATEGORIES,
} = require('../models/DddKnowledgeBase');

const BaseCrudService = require('./base/BaseCrudService');

class KnowledgeBase extends BaseCrudService {
  constructor() {
    super('KnowledgeBase', {
      description: 'Knowledge articles, clinical protocols, best practices & FAQs',
      version: '1.0.0',
    }, {
      articleCategorys: DDDArticleCategory,
      articles: DDDArticle,
      protocols: DDDProtocol,
    })
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
  async getCategory(id) { return this._getById(DDDArticleCategory, id); }
  async createCategory(data) { return this._create(DDDArticleCategory, data); }
  async updateCategory(id, data) { return this._update(DDDArticleCategory, id, data, { runValidators: true }); }

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
  async getArticle(id) { return this._getById(DDDArticle, id); }
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
    ).lean();
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
  async getProtocol(id) { return this._getById(DDDProtocol, id); }
  async createProtocol(data) { return this._create(DDDProtocol, data); }
  async updateProtocol(id, data) { return this._update(DDDProtocol, id, data, { runValidators: true }); }
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
    ).lean();
  }

  /* ── FAQ CRUD ── */
  async listFAQs(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.isPublished !== undefined) q.isPublished = filters.isPublished;
    if (filters.audience) q.audience = filters.audience;
    return DDDFAQ.find(q).sort({ category: 1, order: 1 }).lean();
  }
  async getFAQ(id) { return this._getById(DDDFAQ, id); }
  async createFAQ(data) { return this._create(DDDFAQ, data); }
  async updateFAQ(id, data) { return this._update(DDDFAQ, id, data, { runValidators: true }); }

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
    return DDDFAQ.findByIdAndUpdate(faqId, { $inc: { [field]: 1 } }, { new: true }).lean();
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

}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new KnowledgeBase();
