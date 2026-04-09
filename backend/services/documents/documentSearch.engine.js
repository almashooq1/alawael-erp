'use strict';

/**
 * Advanced Document Search Engine — محرك البحث المتقدم للمستندات
 * ═══════════════════════════════════════════════════════════════
 * بحث متقدم مع فلاتر ذكية، ترتيب حسب الأهمية، بحث بالتشابه،
 * بحث في المحتوى المستخرج (OCR)، والبحث بالفلاتر المتعددة
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// ─────────────────────────────────────────────
// تكوين البحث
// ─────────────────────────────────────────────

const SEARCH_CONFIG = {
  // أقصى عدد نتائج
  maxResults: 500,
  defaultLimit: 20,
  // حد أدنى لطول البحث
  minQueryLength: 1,
  // وزن الحقول في الترتيب
  fieldWeights: {
    title: 10,
    tags: 8,
    description: 5,
    category: 4,
    extractedText: 3,
    searchKeywords: 2,
    originalFileName: 6,
  },
  // الكلمات المتوقفة (stop words) العربية
  arabicStopWords: new Set([
    'في',
    'من',
    'إلى',
    'على',
    'عن',
    'مع',
    'هذا',
    'هذه',
    'ذلك',
    'تلك',
    'التي',
    'الذي',
    'التي',
    'هو',
    'هي',
    'هم',
    'هن',
    'نحن',
    'أنا',
    'أنت',
    'كان',
    'كانت',
    'يكون',
    'تكون',
    'قد',
    'لقد',
    'إن',
    'أن',
    'لا',
    'لم',
    'لن',
    'ما',
    'بعد',
    'قبل',
    'كل',
    'بعض',
    'أي',
    'أو',
    'و',
    'ف',
    'ب',
    'ل',
    'ك',
    'عند',
    'حتى',
    'منذ',
    'لكن',
    'بل',
    'إذا',
    'اذا',
    'ثم',
  ]),
  // الكلمات المتوقفة الإنجليزية
  englishStopWords: new Set([
    'the',
    'is',
    'at',
    'which',
    'on',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'with',
    'to',
    'for',
    'of',
    'not',
    'no',
    'can',
    'had',
    'has',
    'have',
    'was',
    'were',
    'be',
    'been',
    'being',
    'this',
    'that',
    'it',
    'its',
    'from',
    'as',
    'are',
    'by',
    'will',
    'would',
    'could',
    'should',
  ]),
};

/**
 * فلتر بحث محفوظ
 */
const SavedSearchSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    nameEn: String,
    description: String,
    query: String,
    filters: {
      categories: [String],
      fileTypes: [String],
      statuses: [String],
      tags: [String],
      dateRange: {
        from: Date,
        to: Date,
      },
      sizeRange: {
        min: Number,
        max: Number,
      },
      uploadedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      securityLevel: String,
      hasExpiry: Boolean,
      isShared: Boolean,
      isEncrypted: Boolean,
    },
    sortBy: { type: String, default: 'relevance' },
    isDefault: { type: Boolean, default: false },
    useCount: { type: Number, default: 0 },
    lastUsed: Date,
  },
  {
    timestamps: true,
    collection: 'saved_searches',
  }
);

SavedSearchSchema.index({ userId: 1, isDefault: 1 });

const SavedSearch = mongoose.models.SavedSearch || mongoose.model('SavedSearch', SavedSearchSchema);

// ─────────────────────────────────────────────
// محرك البحث
// ─────────────────────────────────────────────

class DocumentSearchEngine {
  constructor() {
    this.searchHistoryCache = new Map();
    this.HISTORY_LIMIT = 100;
  }

  /**
   * بحث متقدم وذكي في المستندات
   */
  async search(query, filters = {}, options = {}) {
    try {
      const startTime = Date.now();
      const Document = mongoose.model('Document');

      // تنظيف الاستعلام
      const cleanQuery = this._cleanQuery(query);
      const tokens = this._tokenize(cleanQuery);

      // بناء فلتر MongoDB
      const mongoFilter = this._buildFilter(tokens, filters, options);

      // بناء ترتيب النتائج
      const sort = this._buildSort(options.sortBy, tokens);

      // تنفيذ البحث
      const page = Math.max(1, parseInt(options.page) || 1);
      const limit = Math.min(
        SEARCH_CONFIG.maxResults,
        Math.max(1, parseInt(options.limit) || SEARCH_CONFIG.defaultLimit)
      );
      const skip = (page - 1) * limit;

      const [results, total] = await Promise.all([
        Document.find(mongoFilter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('uploadedBy', 'name email')
          .lean(),
        Document.countDocuments(mongoFilter),
      ]);

      // حساب الأهمية (relevance scoring)
      const scored = results.map(doc => ({
        ...doc,
        _relevanceScore: this._calculateRelevance(doc, tokens),
      }));

      // ترتيب حسب الأهمية إذا كان البحث نصياً
      if (cleanQuery && options.sortBy === 'relevance') {
        scored.sort((a, b) => b._relevanceScore - a._relevanceScore);
      }

      // استخراج الفلاتر المتاحة (facets)
      const facets = await this._extractFacets(mongoFilter, Document);

      const duration = Date.now() - startTime;

      return {
        success: true,
        query: cleanQuery,
        tokens,
        results: scored,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
        facets,
        duration: `${duration}ms`,
        suggestions: total === 0 ? this._generateSuggestions(cleanQuery) : [],
      };
    } catch (err) {
      logger.error(`[Search] خطأ في البحث: ${err.message}`);
      throw err;
    }
  }

  /**
   * بحث فوري (autocomplete)
   */
  async quickSearch(query, userId, limit = 8) {
    try {
      if (!query || query.length < SEARCH_CONFIG.minQueryLength) {
        return { results: [], suggestions: [] };
      }

      const Document = mongoose.model('Document');
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const results = await Document.find({
        status: { $ne: 'محذوف' },
        $or: [
          { title: { $regex: escapedQuery, $options: 'i' } },
          { tags: { $regex: escapedQuery, $options: 'i' } },
          { originalFileName: { $regex: escapedQuery, $options: 'i' } },
        ],
      })
        .select('title category fileType fileName originalFileName tags createdAt')
        .sort({ viewCount: -1, downloadCount: -1 })
        .limit(limit)
        .lean();

      return {
        results: results.map(doc => ({
          id: doc._id,
          title: doc.title,
          category: doc.category,
          fileType: doc.fileType,
          fileName: doc.originalFileName || doc.fileName,
          tags: doc.tags?.slice(0, 3),
          createdAt: doc.createdAt,
        })),
        suggestions: this._generateAutocompleteSuggestions(query),
      };
    } catch (err) {
      logger.error(`[Search] خطأ في البحث الفوري: ${err.message}`);
      return { results: [], suggestions: [] };
    }
  }

  /**
   * البحث في المحتوى المستخرج (Full-text search)
   */
  async searchContent(text, filters = {}, options = {}) {
    try {
      const Document = mongoose.model('Document');

      const mongoFilter = {
        extractedText: { $exists: true, $ne: '' },
        status: { $ne: 'محذوف' },
      };

      if (text) {
        mongoFilter.$text = { $search: text };
      }

      if (filters.category) mongoFilter.category = filters.category;
      if (filters.fileType) mongoFilter.fileType = filters.fileType;

      const page = parseInt(options.page) || 1;
      const limit = Math.min(50, parseInt(options.limit) || 20);

      const results = await Document.find(mongoFilter, {
        score: { $meta: 'textScore' },
      })
        .sort({ score: { $meta: 'textScore' } })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('title description category fileType extractedText createdAt uploadedBy')
        .populate('uploadedBy', 'name email')
        .lean();

      const total = await Document.countDocuments(mongoFilter);

      // تمييز النتائج (highlighting)
      const highlighted = results.map(doc => ({
        ...doc,
        _highlight: this._highlightMatches(doc.extractedText, text),
        _snippet: this._extractSnippet(doc.extractedText, text, 200),
      }));

      return {
        success: true,
        results: highlighted,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    } catch (err) {
      logger.error(`[Search] خطأ في بحث المحتوى: ${err.message}`);
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  البحث المحفوظ
  // ═══════════════════════════════════════════════════════════

  /**
   * حفظ فلتر بحث
   */
  async saveSearch(userId, searchData) {
    const saved = new SavedSearch({
      userId,
      name: searchData.name,
      nameEn: searchData.nameEn || '',
      description: searchData.description || '',
      query: searchData.query || '',
      filters: searchData.filters || {},
      sortBy: searchData.sortBy || 'relevance',
    });

    await saved.save();
    return { success: true, savedSearch: saved };
  }

  /**
   * جلب عمليات البحث المحفوظة
   */
  async getSavedSearches(userId) {
    return SavedSearch.find({ userId }).sort({ lastUsed: -1, useCount: -1 }).lean();
  }

  /**
   * حذف بحث محفوظ
   */
  async deleteSavedSearch(userId, searchId) {
    const result = await SavedSearch.deleteOne({ _id: searchId, userId });
    return { success: result.deletedCount > 0 };
  }

  /**
   * تنفيذ بحث محفوظ
   */
  async executeSavedSearch(userId, searchId, options = {}) {
    const saved = await SavedSearch.findOne({ _id: searchId, userId });
    if (!saved) throw new Error('البحث المحفوظ غير موجود');

    // تحديث الاستخدام
    saved.useCount++;
    saved.lastUsed = new Date();
    await saved.save();

    return this.search(saved.query, saved.filters, { ...options, sortBy: saved.sortBy });
  }

  // ═══════════════════════════════════════════════════════════
  //  الأدوات الداخلية
  // ═══════════════════════════════════════════════════════════

  /**
   * تنظيف الاستعلام
   */
  _cleanQuery(query) {
    if (!query) return '';
    return query
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[<>{}]/g, '')
      .substring(0, 500);
  }

  /**
   * تقسيم الاستعلام إلى tokens
   */
  _tokenize(query) {
    if (!query) return [];

    return query.split(/\s+/).filter(word => {
      if (word.length < 2) return false;
      if (SEARCH_CONFIG.arabicStopWords.has(word)) return false;
      if (SEARCH_CONFIG.englishStopWords.has(word.toLowerCase())) return false;
      return true;
    });
  }

  /**
   * بناء فلتر MongoDB
   */
  _buildFilter(tokens, filters, options) {
    const mongoFilter = {};
    const conditions = [];

    // فلتر الحالة الافتراضي
    mongoFilter.status = { $ne: 'محذوف' };

    // بحث نصي
    if (tokens.length > 0) {
      const textConditions = [];
      for (const token of tokens) {
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        textConditions.push(
          { title: { $regex: escaped, $options: 'i' } },
          { description: { $regex: escaped, $options: 'i' } },
          { tags: { $regex: escaped, $options: 'i' } },
          { originalFileName: { $regex: escaped, $options: 'i' } },
          { extractedText: { $regex: escaped, $options: 'i' } },
          { searchKeywords: { $regex: escaped, $options: 'i' } }
        );
      }
      conditions.push({ $or: textConditions });
    }

    // فلتر الفئة
    if (filters.category) {
      mongoFilter.category = Array.isArray(filters.category)
        ? { $in: filters.category }
        : filters.category;
    }
    if (filters.categories?.length) {
      mongoFilter.category = { $in: filters.categories };
    }

    // فلتر نوع الملف
    if (filters.fileType) {
      mongoFilter.fileType = Array.isArray(filters.fileType)
        ? { $in: filters.fileType }
        : filters.fileType;
    }
    if (filters.fileTypes?.length) {
      mongoFilter.fileType = { $in: filters.fileTypes };
    }

    // فلتر الحالة
    if (filters.status) {
      mongoFilter.status = filters.status;
    }
    if (filters.statuses?.length) {
      mongoFilter.status = { $in: filters.statuses };
    }

    // فلتر الوسوم
    if (filters.tags?.length) {
      mongoFilter.tags = { $in: filters.tags };
    }

    // فلتر التاريخ
    if (filters.dateRange?.from || filters.dateRange?.to) {
      mongoFilter.createdAt = {};
      if (filters.dateRange.from) mongoFilter.createdAt.$gte = new Date(filters.dateRange.from);
      if (filters.dateRange.to) mongoFilter.createdAt.$lte = new Date(filters.dateRange.to);
    }
    if (filters.dateFrom) {
      if (!mongoFilter.createdAt) mongoFilter.createdAt = {};
      mongoFilter.createdAt.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      if (!mongoFilter.createdAt) mongoFilter.createdAt = {};
      mongoFilter.createdAt.$lte = new Date(filters.dateTo);
    }

    // فلتر الحجم
    if (filters.sizeRange?.min || filters.sizeRange?.max) {
      mongoFilter.fileSize = {};
      if (filters.sizeRange.min) mongoFilter.fileSize.$gte = filters.sizeRange.min;
      if (filters.sizeRange.max) mongoFilter.fileSize.$lte = filters.sizeRange.max;
    }

    // فلتر المرفوع بواسطة
    if (filters.uploadedBy) {
      mongoFilter.uploadedBy = Array.isArray(filters.uploadedBy)
        ? { $in: filters.uploadedBy.map(id => new mongoose.Types.ObjectId(id)) }
        : new mongoose.Types.ObjectId(filters.uploadedBy);
    }

    // فلتر المشاركة
    if (filters.isShared !== undefined) {
      if (filters.isShared) {
        mongoFilter['sharedWith.0'] = { $exists: true };
      } else {
        mongoFilter.sharedWith = { $size: 0 };
      }
    }

    // فلتر التشفير
    if (filters.isEncrypted !== undefined) {
      mongoFilter.isEncrypted = filters.isEncrypted;
    }

    // فلتر انتهاء الصلاحية
    if (filters.hasExpiry !== undefined) {
      if (filters.hasExpiry) {
        mongoFilter.expiryDate = { $exists: true, $ne: null };
      } else {
        mongoFilter.expiryDate = { $in: [null, undefined] };
      }
    }

    // فلتر المجلد
    if (filters.folder) {
      mongoFilter.folder = filters.folder;
    }

    // فلتر الوصول للمستخدم
    if (options.userId && !options.isAdmin) {
      const userObjectId = new mongoose.Types.ObjectId(options.userId);
      conditions.push({
        $or: [
          { uploadedBy: userObjectId },
          { 'sharedWith.userId': userObjectId },
          { isPublic: true },
        ],
      });
    }

    if (conditions.length > 0) {
      mongoFilter.$and = conditions;
    }

    return mongoFilter;
  }

  /**
   * بناء ترتيب النتائج
   */
  _buildSort(sortBy) {
    const sortOptions = {
      relevance: { viewCount: -1, downloadCount: -1, createdAt: -1 },
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      nameAsc: { title: 1 },
      nameDesc: { title: -1 },
      sizeAsc: { fileSize: 1 },
      sizeDesc: { fileSize: -1 },
      mostViewed: { viewCount: -1 },
      mostDownloaded: { downloadCount: -1 },
      lastModified: { lastModified: -1 },
    };

    return sortOptions[sortBy] || sortOptions.newest;
  }

  /**
   * حساب أهمية (relevance score) للنتيجة
   */
  _calculateRelevance(doc, tokens) {
    if (!tokens || tokens.length === 0) return 0;

    let score = 0;

    for (const token of tokens) {
      const lower = token.toLowerCase();
      const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');

      // العنوان
      if (doc.title && regex.test(doc.title)) {
        score += SEARCH_CONFIG.fieldWeights.title;
        // مكافأة التطابق التام
        if (doc.title.toLowerCase().includes(lower)) score += 5;
      }

      // الوسوم
      if (doc.tags?.some(t => regex.test(t))) {
        score += SEARCH_CONFIG.fieldWeights.tags;
      }

      // اسم الملف
      if (doc.originalFileName && regex.test(doc.originalFileName)) {
        score += SEARCH_CONFIG.fieldWeights.originalFileName;
      }

      // الوصف
      if (doc.description && regex.test(doc.description)) {
        score += SEARCH_CONFIG.fieldWeights.description;
      }

      // النص المستخرج
      if (doc.extractedText && regex.test(doc.extractedText)) {
        score += SEARCH_CONFIG.fieldWeights.extractedText;
      }
    }

    // مكافأة للمستندات الحديثة
    if (doc.createdAt) {
      const ageDays = (Date.now() - new Date(doc.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays < 7) score *= 1.3;
      else if (ageDays < 30) score *= 1.1;
    }

    // مكافأة للمستندات الشائعة
    score += (doc.viewCount || 0) * 0.01;
    score += (doc.downloadCount || 0) * 0.02;

    return Math.round(score * 100) / 100;
  }

  /**
   * استخراج الفلاتر المتاحة (Facets)
   */
  async _extractFacets(baseFilter, Document) {
    try {
      const [categories, types, statuses, folders] = await Promise.all([
        Document.aggregate([
          { $match: { ...baseFilter, category: { $exists: true } } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Document.aggregate([
          { $match: { ...baseFilter, fileType: { $exists: true } } },
          { $group: { _id: '$fileType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Document.aggregate([
          { $match: baseFilter },
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Document.aggregate([
          { $match: { ...baseFilter, folder: { $exists: true } } },
          { $group: { _id: '$folder', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ]),
      ]);

      return {
        categories: categories.map(c => ({ value: c._id, count: c.count })),
        fileTypes: types.map(t => ({ value: t._id, count: t.count })),
        statuses: statuses.map(s => ({ value: s._id, count: s.count })),
        folders: folders.map(f => ({ value: f._id, count: f.count })),
      };
    } catch (err) {
      logger.warn(`[Search] فشل استخراج Facets: ${err.message}`);
      return { categories: [], fileTypes: [], statuses: [], folders: [] };
    }
  }

  /**
   * تمييز الكلمات المطابقة في النص
   */
  _highlightMatches(text, query) {
    if (!text || !query) return text;
    const words = query.split(/\s+/).filter(w => w.length > 1);
    let result = text;
    for (const word of words) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(`(${escaped})`, 'gi'), '**$1**');
    }
    return result;
  }

  /**
   * استخراج مقتطف (snippet) حول الكلمة المطابقة
   */
  _extractSnippet(text, query, maxLength = 200) {
    if (!text || !query) return '';
    const words = query.split(/\s+/).filter(w => w.length > 1);
    const firstWord = words[0];
    if (!firstWord) return text.substring(0, maxLength);

    const index = text.toLowerCase().indexOf(firstWord.toLowerCase());
    if (index === -1) return text.substring(0, maxLength);

    const start = Math.max(0, index - maxLength / 2);
    const end = Math.min(text.length, start + maxLength);
    let snippet = text.substring(start, end);

    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    return snippet;
  }

  /**
   * اقتراحات عند عدم وجود نتائج
   */
  _generateSuggestions(query) {
    if (!query) return [];

    return [
      {
        type: 'tip',
        icon: '💡',
        message: 'حاول استخدام كلمات أقل أو أكثر عمومية',
        messageEn: 'Try using fewer or more general words',
      },
      {
        type: 'tip',
        icon: '🔍',
        message: 'تأكد من صحة الإملاء أو جرب مرادفات أخرى',
        messageEn: 'Check spelling or try synonyms',
      },
      {
        type: 'tip',
        icon: '📂',
        message: 'جرب البحث بدون فلاتر لتوسيع النتائج',
        messageEn: 'Try searching without filters to broaden results',
      },
    ];
  }

  /**
   * اقتراحات الإكمال التلقائي
   */
  _generateAutocompleteSuggestions(query) {
    const suggestions = [];
    const lower = query.toLowerCase();

    const commonSearches = [
      'تقرير شهري',
      'عقد توظيف',
      'فاتورة',
      'سياسة',
      'شهادة',
      'خطاب رسمي',
      'محضر اجتماع',
      'ميزانية',
      'خطة عمل',
    ];

    for (const s of commonSearches) {
      if (s.includes(lower) && s !== lower) {
        suggestions.push(s);
      }
    }

    return suggestions.slice(0, 5);
  }
}

module.exports = new DocumentSearchEngine();
module.exports.SavedSearch = SavedSearch;
module.exports.SEARCH_CONFIG = SEARCH_CONFIG;
