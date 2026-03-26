/* eslint-disable no-unused-vars */
/**
 * 📚 Knowledge Center Advanced Service — خدمة مركز المعرفة المتقدمة
 * AlAwael ERP — Full CRUD + Categories + Ratings + Comments + Analytics + Bookmarks
 */
const mongoose = require('mongoose');
const {
  KnowledgeArticle,
  KnowledgeCategory,
  KnowledgeSearchLog,
  KnowledgeRating,
} = require('../models/KnowledgeBase');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/sanitize');

// ═══════════════════════════════════════════════════════════════════════════════
// BOOKMARK SCHEMA (new — user bookmarks)
// ═══════════════════════════════════════════════════════════════════════════════
const bookmarkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    article: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeArticle', required: true },
    note: { type: String, maxlength: 500 },
  },
  { timestamps: true, collection: 'knowledge_bookmarks' }
);
bookmarkSchema.index({ user: 1, article: 1 }, { unique: true });

const KnowledgeBookmark =
  mongoose.models.KnowledgeBookmark || mongoose.model('KnowledgeBookmark', bookmarkSchema);

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function generateSlug(title) {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
  return `${base}-${Date.now().toString(36)}`;
}

async function logSearch(userId, query, category, resultsCount, clickedArticle) {
  try {
    await KnowledgeSearchLog.create({
      user: userId,
      query,
      category: category || null,
      resultsCount,
      clickedArticle: clickedArticle || null,
    });
  } catch {
    /* silent */
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════
class KnowledgeCenterService {
  // ─────────────────────────────────────────────────────────────────────────
  // ARTICLES — LIST (paginated, filterable, searchable)
  // ─────────────────────────────────────────────────────────────────────────
  async getArticles(query = {}) {
    const { page = 1, limit = 20, category, status, search, tags, sort = 'latest', author } = query;

    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (status) filter.status = status;
    if (author) filter.author = new mongoose.Types.ObjectId(author);

    if (tags) {
      const tagList = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim().toLowerCase());
      filter.tags = { $in: tagList };
    }

    if (search && search.trim()) {
      const s = search.trim();
      filter.$or = [
        { title: { $regex: escapeRegex(s), $options: 'i' } },
        { description: { $regex: escapeRegex(s), $options: 'i' } },
        { content: { $regex: escapeRegex(s), $options: 'i' } },
        { tags: { $in: [new RegExp(escapeRegex(s), 'i')] } },
        { keywords: { $in: [new RegExp(escapeRegex(s), 'i')] } },
      ];
    }

    const sortMap = {
      latest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      views: { views: -1 },
      rating: { 'ratings.average': -1 },
      title: { title: 1 },
    };
    const sortBy = sortMap[sort] || sortMap.latest;

    const skip = (Math.max(1, +page) - 1) * +limit;

    const [data, total] = await Promise.all([
      KnowledgeArticle.find(filter)
        .populate('author', 'name fullName')
        .populate('lastModifiedBy', 'name fullName')
        .sort(sortBy)
        .skip(skip)
        .limit(+limit)
        .lean(),
      KnowledgeArticle.countDocuments(filter),
    ]);

    return { data, pagination: { page: +page, limit: +limit, total } };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ARTICLES — GET BY ID (with view count increment)
  // ─────────────────────────────────────────────────────────────────────────
  async getArticleById(id, userId) {
    const article = await KnowledgeArticle.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('author', 'name fullName email')
      .populate('lastModifiedBy', 'name fullName')
      .populate('approvedBy', 'name fullName')
      .populate('relatedArticles', 'title slug category')
      .populate('comments.author', 'name fullName')
      .lean();

    if (!article) throw new Error('المقالة غير موجودة');

    // Get user's rating if exists
    let userRating = null;
    if (userId) {
      userRating = await KnowledgeRating.findOne({ article: id, user: userId }).lean();
    }

    // Get user's bookmark
    let isBookmarked = false;
    if (userId) {
      isBookmarked = !!(await KnowledgeBookmark.exists({ article: id, user: userId }));
    }

    // Get related articles if none set
    let related = article.relatedArticles || [];
    if (related.length === 0) {
      related = await KnowledgeArticle.find({
        _id: { $ne: id },
        category: article.category,
        status: 'published',
      })
        .select('title slug category views ratings')
        .limit(4)
        .lean();
    }

    return { article, userRating, isBookmarked, relatedArticles: related };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ARTICLES — CREATE
  // ─────────────────────────────────────────────────────────────────────────
  async createArticle(data, userId) {
    const {
      title,
      description,
      content,
      category,
      subcategory,
      tags,
      keywords,
      sections,
      references,
      status,
      isPublic,
      visibleTo,
    } = data;

    if (!title || !content) throw new Error('العنوان والمحتوى مطلوبان');

    const slug = generateSlug(title);

    const article = await KnowledgeArticle.create({
      title,
      description: description || title.slice(0, 100).padEnd(20, '.'),
      content,
      category: category || 'other',
      subcategory: subcategory || 'general',
      tags: Array.isArray(tags) ? tags.map(t => t.toLowerCase()) : [],
      keywords: Array.isArray(keywords) ? keywords.map(k => k.toLowerCase()) : [],
      sections: sections || [],
      references: references || [],
      author: userId,
      lastModifiedBy: userId,
      status: status || 'published',
      slug,
      isPublic: isPublic ?? false,
      visibleTo: visibleTo || ['admin', 'manager', 'employee'],
    });

    return article;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ARTICLES — UPDATE
  // ─────────────────────────────────────────────────────────────────────────
  async updateArticle(id, data, userId) {
    const allowed = [
      'title',
      'description',
      'content',
      'category',
      'subcategory',
      'tags',
      'keywords',
      'sections',
      'references',
      'status',
      'isPublic',
      'visibleTo',
    ];
    const updates = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    updates.lastModifiedBy = userId;
    updates.updatedAt = new Date();

    if (updates.tags) updates.tags = updates.tags.map(t => t.toLowerCase());
    if (updates.keywords) updates.keywords = updates.keywords.map(k => k.toLowerCase());

    const article = await KnowledgeArticle.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('author', 'name fullName')
      .lean();

    if (!article) throw new Error('المقالة غير موجودة');
    return article;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ARTICLES — DELETE
  // ─────────────────────────────────────────────────────────────────────────
  async deleteArticle(id) {
    const article = await KnowledgeArticle.findByIdAndDelete(id);
    if (!article) throw new Error('المقالة غير موجودة');

    // Cleanup related data
    await Promise.all([
      KnowledgeRating.deleteMany({ article: id }),
      KnowledgeBookmark.deleteMany({ article: id }),
      KnowledgeSearchLog.updateMany({ clickedArticle: id }, { $unset: { clickedArticle: 1 } }),
    ]);

    return { deleted: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ARTICLES — CHANGE STATUS (approval workflow)
  // ─────────────────────────────────────────────────────────────────────────
  async changeStatus(id, newStatus, userId) {
    const validTransitions = {
      draft: ['pending_review'],
      pending_review: ['approved', 'draft'],
      approved: ['published', 'draft'],
      published: ['archived', 'draft'],
      archived: ['draft'],
    };

    const article = await KnowledgeArticle.findById(id);
    if (!article) throw new Error('المقالة غير موجودة');

    const allowed = validTransitions[article.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`لا يمكن تغيير الحالة من ${article.status} إلى ${newStatus}`);
    }

    article.status = newStatus;
    if (newStatus === 'approved') {
      article.approvedBy = userId;
      article.approvalDate = new Date();
    }
    article.lastModifiedBy = userId;
    await article.save();

    return article;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMMENTS
  // ─────────────────────────────────────────────────────────────────────────
  async addComment(articleId, text, userId) {
    if (!text || text.trim().length < 2) throw new Error('التعليق قصير جداً');

    const article = await KnowledgeArticle.findByIdAndUpdate(
      articleId,
      { $push: { comments: { author: userId, text: text.trim(), createdAt: new Date() } } },
      { new: true }
    )
      .populate('comments.author', 'name fullName')
      .lean();

    if (!article) throw new Error('المقالة غير موجودة');
    return article.comments;
  }

  async deleteComment(articleId, commentId, userId) {
    const article = await KnowledgeArticle.findById(articleId);
    if (!article) throw new Error('المقالة غير موجودة');

    const comment = article.comments.id(commentId);
    if (!comment) throw new Error('التعليق غير موجود');

    article.comments.pull(commentId);
    await article.save();
    return article.comments;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RATINGS
  // ─────────────────────────────────────────────────────────────────────────
  async rateArticle(articleId, userId, rating, feedback) {
    if (!rating || rating < 1 || rating > 5) throw new Error('التقييم يجب أن يكون بين 1 و 5');

    // Upsert user rating
    await KnowledgeRating.findOneAndUpdate(
      { article: articleId, user: userId },
      { rating, feedback: feedback || '', helpful: rating >= 4 },
      { upsert: true, new: true }
    );

    // Recalculate aggregate
    const [agg] = await KnowledgeRating.aggregate([
      { $match: { article: new mongoose.Types.ObjectId(articleId) } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    await KnowledgeArticle.findByIdAndUpdate(articleId, {
      'ratings.average': Math.round((agg?.average || 0) * 10) / 10,
      'ratings.count': agg?.count || 0,
    });

    return { rating, average: agg?.average || rating, count: agg?.count || 1 };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOOKMARKS
  // ─────────────────────────────────────────────────────────────────────────
  async toggleBookmark(articleId, userId, note) {
    const exists = await KnowledgeBookmark.findOne({ article: articleId, user: userId });
    if (exists) {
      await KnowledgeBookmark.deleteOne({ _id: exists._id });
      return { bookmarked: false };
    }
    await KnowledgeBookmark.create({ article: articleId, user: userId, note: note || '' });
    return { bookmarked: true };
  }

  async getUserBookmarks(userId) {
    const bookmarks = await KnowledgeBookmark.find({ user: userId })
      .populate({
        path: 'article',
        select: 'title slug category tags views ratings status author',
        populate: { path: 'author', select: 'name fullName' },
      })
      .sort({ createdAt: -1 })
      .lean();
    return bookmarks.filter(b => b.article); // exclude deleted articles
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CATEGORIES
  // ─────────────────────────────────────────────────────────────────────────
  async getCategories() {
    // Merge KnowledgeCategory collection with article counts
    const [categories, articleCounts] = await Promise.all([
      KnowledgeCategory.find().sort({ order: 1 }).lean(),
      KnowledgeArticle.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    ]);

    const countMap = {};
    for (const ac of articleCounts) countMap[ac._id] = ac.count;

    // Ensure all used categories are represented
    const catNames = new Set(categories.map(c => c.name));
    for (const ac of articleCounts) {
      if (!catNames.has(ac._id)) {
        categories.push({ name: ac._id, description: '', icon: '📄', color: '#64748b', order: 99 });
      }
    }

    return categories.map(c => ({ ...c, articleCount: countMap[c.name] || 0 }));
  }

  async createCategory(data) {
    const { name, description, icon, color, order, subcategories } = data;
    if (!name) throw new Error('اسم التصنيف مطلوب');

    const existing = await KnowledgeCategory.findOne({ name });
    if (existing) throw new Error('التصنيف موجود بالفعل');

    return KnowledgeCategory.create({
      name,
      description: description || '',
      icon: icon || '📄',
      color: color || '#64748b',
      order: order ?? 0,
      subcategories: subcategories || [],
    });
  }

  async updateCategory(id, data) {
    const category = await KnowledgeCategory.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!category) throw new Error('التصنيف غير موجود');
    return category;
  }

  async deleteCategory(id) {
    const category = await KnowledgeCategory.findById(id);
    if (!category) throw new Error('التصنيف غير موجود');

    const articleCount = await KnowledgeArticle.countDocuments({ category: category.name });
    if (articleCount > 0) {
      throw new Error(`لا يمكن حذف التصنيف — يحتوي على ${articleCount} مقالة`);
    }

    await KnowledgeCategory.deleteOne({ _id: id });
    return { deleted: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH (server-side with logging)
  // ─────────────────────────────────────────────────────────────────────────
  async search(query, userId) {
    const { q, category, tags, page = 1, limit = 20 } = query;
    if (!q || !q.trim()) return { data: [], pagination: { page: 1, limit: 20, total: 0 } };

    const filter = {};
    const searchTerm = q.trim();

    // Use $text for full-text search if available, with regex fallback
    filter.$or = [
      { title: { $regex: escapeRegex(searchTerm), $options: 'i' } },
      { description: { $regex: escapeRegex(searchTerm), $options: 'i' } },
      { content: { $regex: escapeRegex(searchTerm), $options: 'i' } },
      { tags: { $in: [new RegExp(escapeRegex(searchTerm), 'i')] } },
    ];

    if (category && category !== 'all') filter.category = category;
    if (tags) {
      const tagList = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
      // Merge with existing tags filter
      filter.tags = { ...(filter.tags || {}), $in: tagList };
    }

    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      KnowledgeArticle.find(filter)
        .populate('author', 'name fullName')
        .sort({ views: -1, 'ratings.average': -1 })
        .skip(skip)
        .limit(+limit)
        .lean(),
      KnowledgeArticle.countDocuments(filter),
    ]);

    // Log the search
    await logSearch(userId, searchTerm, category, total);

    return { data, pagination: { page: +page, limit: +limit, total } };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TRENDING & TOP RATED
  // ─────────────────────────────────────────────────────────────────────────
  async getTrending(limit = 10) {
    return KnowledgeArticle.find({ status: 'published' })
      .populate('author', 'name fullName')
      .sort({ views: -1, 'ratings.average': -1 })
      .limit(+limit)
      .lean();
  }

  async getTopRated(limit = 10) {
    return KnowledgeArticle.find({ status: 'published', 'ratings.count': { $gte: 1 } })
      .populate('author', 'name fullName')
      .sort({ 'ratings.average': -1, 'ratings.count': -1 })
      .limit(+limit)
      .lean();
  }

  async getRecent(limit = 10) {
    return KnowledgeArticle.find({ status: 'published' })
      .populate('author', 'name fullName')
      .sort({ createdAt: -1 })
      .limit(+limit)
      .lean();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ANALYTICS (admin)
  // ─────────────────────────────────────────────────────────────────────────
  async getAnalytics(query = {}) {
    const { period = '30d' } = query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 86400000);

    const [
      totalArticles,
      publishedCount,
      draftCount,
      byCategory,
      byStatus,
      topViewed,
      topRated,
      recentSearches,
      searchFrequency,
      totalViews,
      avgRating,
    ] = await Promise.all([
      KnowledgeArticle.countDocuments(),
      KnowledgeArticle.countDocuments({ status: 'published' }),
      KnowledgeArticle.countDocuments({ status: 'draft' }),
      KnowledgeArticle.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 }, totalViews: { $sum: '$views' } } },
        { $sort: { count: -1 } },
      ]),
      KnowledgeArticle.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      KnowledgeArticle.find()
        .select('title category views ratings')
        .sort({ views: -1 })
        .limit(10)
        .lean(),
      KnowledgeArticle.find({ 'ratings.count': { $gte: 1 } })
        .select('title category views ratings')
        .sort({ 'ratings.average': -1 })
        .limit(10)
        .lean(),
      KnowledgeSearchLog.find({ timestamp: { $gte: since } })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean(),
      KnowledgeSearchLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$query', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      KnowledgeArticle.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
      KnowledgeRating.aggregate([
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
    ]);

    return {
      totalArticles,
      publishedCount,
      draftCount,
      pendingReviewCount: await KnowledgeArticle.countDocuments({ status: 'pending_review' }),
      totalViews: totalViews[0]?.total || 0,
      avgRating: Math.round((avgRating[0]?.avg || 0) * 10) / 10,
      totalRatings: avgRating[0]?.count || 0,
      byCategory,
      byStatus,
      topViewed,
      topRated,
      searchFrequency,
      recentSearches: recentSearches.map(s => ({
        query: s.query,
        resultsCount: s.resultsCount,
        timestamp: s.timestamp,
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATS (dashboard summary)
  // ─────────────────────────────────────────────────────────────────────────
  async getStats() {
    const [total, published, draft, pendingReview, archived] = await Promise.all([
      KnowledgeArticle.countDocuments(),
      KnowledgeArticle.countDocuments({ status: 'published' }),
      KnowledgeArticle.countDocuments({ status: 'draft' }),
      KnowledgeArticle.countDocuments({ status: 'pending_review' }),
      KnowledgeArticle.countDocuments({ status: 'archived' }),
    ]);
    return { total, published, draft, pendingReview, archived };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEED DEMO DATA
  // ─────────────────────────────────────────────────────────────────────────
  async seedDemoData() {
    const demoCategories = [
      {
        name: 'therapeutic_protocols',
        description: 'البروتوكولات العلاجية',
        icon: '🏥',
        color: '#2196f3',
        order: 1,
      },
      {
        name: 'case_studies',
        description: 'دراسات الحالة',
        icon: '📋',
        color: '#4caf50',
        order: 2,
      },
      {
        name: 'research_experiments',
        description: 'البحوث والتجارب',
        icon: '🔬',
        color: '#9c27b0',
        order: 3,
      },
      {
        name: 'best_practices',
        description: 'أفضل الممارسات',
        icon: '⭐',
        color: '#ff9800',
        order: 4,
      },
      { name: 'other', description: 'مقالات عامة', icon: '📄', color: '#607d8b', order: 5 },
    ];

    for (const cat of demoCategories) {
      await KnowledgeCategory.findOneAndUpdate({ name: cat.name }, cat, { upsert: true });
    }

    const demoArticles = [
      {
        title: 'بروتوكول العلاج الطبيعي للأطفال ذوي الشلل الدماغي',
        description:
          'دليل شامل لبروتوكول العلاج الطبيعي المعتمد للأطفال المصابين بالشلل الدماغي مع خطوات التقييم والتدخل',
        content: `## مقدمة\nيعد العلاج الطبيعي ركيزة أساسية في برنامج التأهيل الشامل للأطفال ذوي الشلل الدماغي. يهدف هذا البروتوكول إلى توحيد الممارسات العلاجية وضمان أفضل نتائج ممكنة.\n\n## التقييم الأولي\n- تقييم GMFCS (نظام تصنيف الوظائف الحركية الكبرى)\n- تقييم مدى الحركة ونطاقها\n- تقييم القوة العضلية\n- تقييم التوازن والتنسيق\n\n## خطة التدخل\n### المرحلة الأولى (0-3 أشهر)\n- تمارين التمدد والمرونة\n- تحفيز الحركات التطورية\n- العلاج المائي (حسب الحاجة)\n\n### المرحلة الثانية (3-6 أشهر)\n- تعزيز القوة العضلية المتدرج\n- تدريب التوازن\n- تمارين التنسيق الحركي\n\n## المتابعة والتقييم\nيتم إعادة التقييم كل 3 أشهر لقياس التقدم وتعديل الخطة العلاجية.`,
        category: 'therapeutic_protocols',
        tags: ['علاج طبيعي', 'شلل دماغي', 'أطفال', 'تأهيل'],
        keywords: ['physiotherapy', 'cerebral palsy', 'rehabilitation'],
        status: 'published',
      },
      {
        title: 'دراسة حالة: تحسن ملحوظ في مريض إصابات الحبل الشوكي',
        description:
          'عرض لدراسة حالة مريض تعرض لإصابة في الحبل الشوكي وبرنامج التأهيل المطبق والنتائج المحققة',
        content: `## بيانات المريض\n- العمر: 28 سنة\n- التشخيص: إصابة حبل شوكي مستوى T10\n- تاريخ الإصابة: قبل 8 أشهر\n\n## التقييم عند القبول\n- ASIA Scale: Grade B\n- إحساس جزئي أسفل مستوى الإصابة\n- عدم قدرة على المشي\n\n## برنامج التأهيل\n- العلاج الطبيعي: 5 جلسات أسبوعياً\n- العلاج الوظيفي: 3 جلسات أسبوعياً\n- التحفيز الكهربائي الوظيفي\n- تدريب على الأجهزة المساعدة\n\n## النتائج بعد 6 أشهر\n- تحسن إلى ASIA Grade C\n- القدرة على المشي بمساعدة المشاية\n- استقلالية في أنشطة الحياة اليومية بنسبة 70%\n\n## الخلاصة\nيبرز هذا المثال أهمية التأهيل المبكر والمكثف في تحسين مخرجات المرضى.`,
        category: 'case_studies',
        tags: ['إصابات حبل شوكي', 'دراسة حالة', 'تأهيل'],
        status: 'published',
      },
      {
        title: 'أحدث الأبحاث في العلاج بالخلايا الجذعية للتأهيل',
        description:
          'استعراض لأحدث الدراسات والأبحاث العلمية في مجال استخدام الخلايا الجذعية لأغراض التأهيل الطبي',
        content: `## مقدمة\nشهد العقد الأخير تطورات ملحوظة في أبحاث الخلايا الجذعية وتطبيقاتها في مجال إعادة التأهيل.\n\n## أبرز الدراسات\n### 1. إصلاح الأعصاب\nأظهرت دراسات حديثة (2025) أن حقن الخلايا الجذعية السلفية قد يساهم في تجديد الخلايا العصبية التالفة.\n\n### 2. تجديد الغضاريف\nنتائج واعدة في استخدام الخلايا الجذعية لترميم غضاريف المفاصل المتضررة.\n\n### 3. تعزيز الشفاء العضلي\nالخلايا الجذعية الذاتية تسرّع من شفاء الإصابات العضلية الحادة.\n\n## التحديات\n- التكلفة العالية\n- الحاجة لمزيد من التجارب السريرية\n- الجوانب الأخلاقية والتنظيمية\n\n## التوصيات\nمتابعة آخر المستجدات والمشاركة في الدراسات البحثية متعددة المراكز.`,
        category: 'research_experiments',
        tags: ['خلايا جذعية', 'أبحاث', 'تأهيل', 'أعصاب'],
        status: 'published',
      },
      {
        title: 'دليل سياسة الجودة في خدمات التأهيل',
        description:
          'السياسات والمعايير المعتمدة لضبط جودة خدمات التأهيل الطبي في المركز مع مؤشرات الأداء',
        content: `## رؤية الجودة\nنسعى لتقديم خدمات تأهيلية بمعايير عالمية تضمن أفضل النتائج للمستفيدين.\n\n## المعايير الأساسية\n1. **التوثيق الطبي**: توثيق كامل لكل جلسة علاجية\n2. **رضا المستفيدين**: استبيان رضا شهري بنسبة لا تقل عن 85%\n3. **الأمان**: صفر حوادث يمكن تفاديها شهرياً\n4. **التحسين المستمر**: مراجعة دورية للبروتوكولات\n\n## مؤشرات الأداء (KPIs)\n- معدل تحسن المرضى\n- متوسط عدد الجلسات لكل حالة\n- نسبة الالتزام بالمواعيد\n- معدل إعادة التأهيل الناجح\n\n## المراجعة والتحديث\nتتم مراجعة هذه السياسة كل 6 أشهر أو عند ظهور مستجدات تستدعي ذلك.`,
        category: 'best_practices',
        tags: ['جودة', 'سياسات', 'تأهيل', 'معايير'],
        status: 'published',
      },
      {
        title: 'أفضل ممارسات التواصل مع أسر المستفيدين',
        description:
          'إرشادات عملية للتواصل الفعال مع أسر المستفيدين من خدمات التأهيل لتحسين التعاون والنتائج',
        content: `## أهمية التواصل\nالتواصل الفعال مع الأسرة ركن أساسي في نجاح خطة التأهيل.\n\n## أساسيات التواصل\n### 1. الشفافية\n- شرح واضح للتشخيص والخطة العلاجية\n- مشاركة التقارير الدورية\n\n### 2. التعاطف\n- الاستماع الفعال لمخاوف الأسرة\n- مراعاة الحالة النفسية\n\n### 3. التثقيف\n- تدريب الأسرة على التمارين المنزلية\n- توفير مواد تعليمية مبسطة\n\n## الجلسة الأولى مع الأسرة\n1. التعريف بفريق العمل\n2. شرح التقييم الأولي\n3. وضع الأهداف المشتركة\n4. الاتفاق على قنوات التواصل\n\n## المتابعة\n- تقارير شهرية مكتوبة\n- اجتماعات دورية كل 3 أشهر\n- خط ساخن للاستفسارات العاجلة`,
        category: 'best_practices',
        tags: ['تواصل', 'أسر', 'أفضل ممارسات'],
        status: 'published',
      },
      {
        title: 'استخدام التقنيات المساعدة في التأهيل',
        description:
          'دليل شامل حول التقنيات والأجهزة المساعدة المستخدمة في برامج التأهيل وأسس اختيارها',
        content: `## التقنيات المساعدة\nتلعب التقنيات المساعدة دوراً محورياً في تعزيز استقلالية المستفيدين.\n\n## أنواع التقنيات\n### 1. الأجهزة التقويمية\n- جبائر اليد والقدم\n- أحزمة الدعم\n- الكراسي المتحركة المتخصصة\n\n### 2. التقنيات الإلكترونية\n- أجهزة التحفيز الكهربائي\n- أنظمة التواصل البديلة (AAC)\n- تطبيقات التأهيل الذكية\n\n### 3. الواقع الافتراضي\n- تطبيقات VR للتأهيل الحركي\n- الألعاب العلاجية التفاعلية\n\n## معايير الاختيار\n- احتياجات المستفيد الفردية\n- سهولة الاستخدام\n- التكلفة والتوفر\n- الأدلة العلمية على الفعالية`,
        category: 'other',
        tags: ['تقنيات مساعدة', 'تأهيل', 'تكنولوجيا'],
        status: 'published',
      },
      {
        title: 'بروتوكول إعادة التأهيل بعد جراحة استبدال المفصل',
        description:
          'البروتوكول المعتمد لبرنامج التأهيل بعد عمليات استبدال مفصل الركبة أو الورك مع المراحل الزمنية',
        content: `## المرحلة الأولى (1-2 أسبوع بعد الجراحة)\n- تمارين المدى الحركي السلبية\n- التحفيز الكهربائي\n- التحكم في الألم والوذمة\n- المشي بالمشاية\n\n## المرحلة الثانية (2-6 أسابيع)\n- تمارين المدى الحركي النشطة-المساعدة\n- بدء تقوية العضلات\n- تدريب التوازن\n- المشي بالعكاز\n\n## المرحلة الثالثة (6-12 أسبوع)\n- تقوية عضلات متقدمة\n- تمارين وظيفية\n- المشي بدون مساعدة\n- بدء تمارين الدرج\n\n## المرحلة الرابعة (3-6 أشهر)\n- العودة للأنشطة اليومية الكاملة\n- تمارين الرشاقة والتحمل\n- التقييم النهائي\n\n## معايير الانتقال بين المراحل\n- مستوى الألم\n- مدى الحركة المحقق\n- قوة العضلات\n- القدرة الوظيفية`,
        category: 'therapeutic_protocols',
        tags: ['استبدال مفصل', 'تأهيل', 'بروتوكول', 'جراحة'],
        status: 'published',
      },
      {
        title: 'دراسة حالة: تأهيل طفل التوحد باستخدام العلاج بالتكامل الحسي',
        description:
          'عرض تفصيلي لحالة طفل من ذوي طيف التوحد وبرنامج العلاج بالتكامل الحسي المطبق والنتائج',
        content: `## بيانات الحالة\n- العمر: 5 سنوات\n- التشخيص: اضطراب طيف التوحد (المستوى الثاني)\n- المشاكل الحسية: فرط حساسية لمسية وسمعية\n\n## التقييم الحسي\n- Sensory Profile: درجات مرتفعة في تجنب الحس\n- فرط استجابة للأصوات العالية\n- رفض ملمس بعض الأقمشة والأطعمة\n\n## البرنامج العلاجي (6 أشهر)\n- غرفة الحواس 3 جلسات أسبوعياً\n- نشاطات حسية متدرجة\n- برنامج منزلي حسي يومي\n- تعاون مع المعلمة في الروضة\n\n## النتائج\n- تحسن ملحوظ في تحمل اللمس\n- انخفاض نوبات الانزعاج من الأصوات\n- تحسن في المشاركة الاجتماعية\n- تقبل أنواع طعام جديدة`,
        category: 'case_studies',
        tags: ['توحد', 'تكامل حسي', 'أطفال', 'دراسة حالة'],
        status: 'published',
      },
    ];

    let created = 0;
    for (const art of demoArticles) {
      const exists = await KnowledgeArticle.findOne({ title: art.title });
      if (!exists) {
        await KnowledgeArticle.create({
          ...art,
          slug: generateSlug(art.title),
          description: art.description || art.title,
          author: new mongoose.Types.ObjectId('000000000000000000000001'),
          visibleTo: ['admin', 'manager', 'employee', 'user'],
          isPublic: true,
          views: Math.floor(Math.random() * 500) + 50,
          ratings: {
            average: +(Math.random() * 2 + 3).toFixed(1),
            count: Math.floor(Math.random() * 20) + 1,
          },
        });
        created++;
      }
    }

    return { message: `تم إنشاء ${created} مقالة و ${demoCategories.length} تصنيف`, created };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════
const knowledgeCenterService = new KnowledgeCenterService();
module.exports = { KnowledgeCenterService, knowledgeCenterService, KnowledgeBookmark };
