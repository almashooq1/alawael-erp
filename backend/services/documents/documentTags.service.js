'use strict';

/**
 * Tags & Labels Management Service — خدمة إدارة الوسوم والتصنيفات
 * ════════════════════════════════════════════════════════════════════
 * وسوم مُدارة مع ألوان، تصنيفات هرمية، دمج، اقتراحات ذكية، قواعد أتمتة
 *
 * @module documentTags.service
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// ─── نموذج فئة الوسم ─────────────────────────────────
const tagCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    description: String,
    icon: { type: String, default: '🏷️' },
    color: { type: String, default: '#6366f1' },
    isRequired: { type: Boolean, default: false },
    maxTags: { type: Number, default: 5 },
    allowCustom: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'document_tag_categories' }
);

const TagCategory = mongoose.models.TagCategory || mongoose.model('TagCategory', tagCategorySchema);

// ─── نموذج الوسم ─────────────────────────────────
const tagSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    nameAr: { type: String, required: true, index: true },
    slug: { type: String, unique: true, lowercase: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'TagCategory' },
    color: { type: String, default: '#3b82f6' },
    icon: { type: String, default: '' },
    description: String,
    usageCount: { type: Number, default: 0 },
    lastUsedAt: Date,
    synonyms: [String],
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Tag' },
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, collection: 'document_tags' }
);

tagSchema.index({ category: 1, isActive: 1 });
tagSchema.index({ usageCount: -1 });
tagSchema.index({ slug: 1 });

const Tag = mongoose.models.Tag || mongoose.model('Tag', tagSchema);

// ─── نموذج قاعدة الأتمتة ─────────────────────────────
const tagRuleSchema = new mongoose.Schema(
  {
    name: String,
    nameAr: String,
    triggerTag: { type: mongoose.Schema.Types.ObjectId, ref: 'Tag', required: true },
    action: {
      type: String,
      enum: ['set_priority', 'set_category', 'add_tag', 'notify', 'move_folder', 'set_status'],
      required: true,
    },
    actionValue: mongoose.Schema.Types.Mixed,
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'document_tag_rules' }
);

const TagRule = mongoose.models.TagRule || mongoose.model('TagRule', tagRuleSchema);

// ─── ألوان الوسوم الافتراضية ─────────────────────────
const TAG_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#64748b',
];

// ─── فئات افتراضية ─────────────────────────────────
const DEFAULT_CATEGORIES = [
  {
    name: 'Priority',
    nameAr: 'الأولوية',
    icon: '🔥',
    color: '#ef4444',
    isRequired: false,
    maxTags: 1,
  },
  {
    name: 'Department',
    nameAr: 'القسم',
    icon: '🏢',
    color: '#3b82f6',
    isRequired: false,
    maxTags: 3,
  },
  { name: 'Type', nameAr: 'النوع', icon: '📋', color: '#8b5cf6', isRequired: true, maxTags: 2 },
  { name: 'Status', nameAr: 'الحالة', icon: '📊', color: '#22c55e', isRequired: false, maxTags: 1 },
  {
    name: 'Custom',
    nameAr: 'مخصص',
    icon: '🏷️',
    color: '#64748b',
    isRequired: false,
    maxTags: 10,
    allowCustom: true,
  },
];

// ─── وسوم افتراضية ─────────────────────────────────
const DEFAULT_TAGS = [
  { name: 'Urgent', nameAr: 'عاجل', color: '#ef4444', categoryName: 'Priority' },
  { name: 'Important', nameAr: 'مهم', color: '#f97316', categoryName: 'Priority' },
  { name: 'Normal', nameAr: 'عادي', color: '#22c55e', categoryName: 'Priority' },
  { name: 'Low', nameAr: 'منخفض', color: '#64748b', categoryName: 'Priority' },
  { name: 'Confidential', nameAr: 'سري', color: '#dc2626', categoryName: 'Type' },
  { name: 'Internal', nameAr: 'داخلي', color: '#2563eb', categoryName: 'Type' },
  { name: 'External', nameAr: 'خارجي', color: '#7c3aed', categoryName: 'Type' },
  { name: 'Contract', nameAr: 'عقد', color: '#0891b2', categoryName: 'Type' },
  { name: 'Invoice', nameAr: 'فاتورة', color: '#059669', categoryName: 'Type' },
  { name: 'Report', nameAr: 'تقرير', color: '#d97706', categoryName: 'Type' },
  { name: 'Legal', nameAr: 'قانوني', color: '#9333ea', categoryName: 'Type' },
  { name: 'HR', nameAr: 'موارد بشرية', color: '#e11d48', categoryName: 'Department' },
  { name: 'Finance', nameAr: 'مالية', color: '#16a34a', categoryName: 'Department' },
  { name: 'IT', nameAr: 'تقنية المعلومات', color: '#2563eb', categoryName: 'Department' },
  { name: 'Operations', nameAr: 'العمليات', color: '#ea580c', categoryName: 'Department' },
];

class DocumentTagsService {
  // ══════════════════════════════════════════
  //  تهيئة الفئات والوسوم الافتراضية
  // ══════════════════════════════════════════
  async initializeDefaults(userId) {
    try {
      let categoriesCreated = 0;
      let tagsCreated = 0;
      const categoryMap = {};

      for (const cat of DEFAULT_CATEGORIES) {
        const existing = await TagCategory.findOne({ name: cat.name });
        if (!existing) {
          const created = await TagCategory.create({ ...cat, createdBy: userId });
          categoryMap[cat.name] = created._id;
          categoriesCreated++;
        } else {
          categoryMap[cat.name] = existing._id;
        }
      }

      for (const tag of DEFAULT_TAGS) {
        const slug = this._slugify(tag.name);
        const existing = await Tag.findOne({ slug });
        if (!existing) {
          await Tag.create({
            name: tag.name,
            nameAr: tag.nameAr,
            slug,
            color: tag.color,
            category: categoryMap[tag.categoryName],
            isSystem: true,
            createdBy: userId,
          });
          tagsCreated++;
        }
      }

      return { success: true, categoriesCreated, tagsCreated };
    } catch (err) {
      logger.error('[Tags] initializeDefaults error:', err);
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  إدارة الفئات
  // ══════════════════════════════════════════
  async createCategory(data, userId) {
    try {
      const category = await TagCategory.create({ ...data, createdBy: userId });
      return { success: true, category };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async getCategories(activeOnly = true) {
    try {
      const filter = activeOnly ? { isActive: true } : {};
      const categories = await TagCategory.find(filter).sort({ order: 1, nameAr: 1 }).lean();
      // إضافة عدد الوسوم لكل فئة
      for (const cat of categories) {
        cat.tagCount = await Tag.countDocuments({ category: cat._id, isActive: true });
      }
      return { success: true, categories };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async updateCategory(categoryId, updates) {
    try {
      const category = await TagCategory.findByIdAndUpdate(categoryId, updates, { new: true });
      return { success: true, category };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  إنشاء وسم
  // ══════════════════════════════════════════
  async createTag(data, userId) {
    try {
      const slug = this._slugify(data.name || data.nameAr);
      const existing = await Tag.findOne({ slug });
      if (existing) return { success: false, error: 'الوسم موجود بالفعل' };

      const tag = await Tag.create({
        ...data,
        slug,
        color: data.color || TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)],
        createdBy: userId,
      });

      return { success: true, tag };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  تحديث وسم (مع تحديث المستندات)
  // ══════════════════════════════════════════
  async updateTag(tagId, updates, userId) {
    try {
      const oldTag = await Tag.findById(tagId);
      if (!oldTag) return { success: false, error: 'الوسم غير موجود' };

      if (updates.name && updates.name !== oldTag.name) {
        updates.slug = this._slugify(updates.name);
        // تحديث المستندات التي تستخدم الاسم القديم
        try {
          const Document = mongoose.model('Document');
          await Document.updateMany({ tags: oldTag.name }, { $set: { 'tags.$': updates.name } });
        } catch (e) {
          logger.warn('[Tags] Could not propagate tag rename to documents:', e.message);
        }
      }

      const tag = await Tag.findByIdAndUpdate(tagId, updates, { new: true });
      return { success: true, tag };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  حذف وسم مع استبدال اختياري
  // ══════════════════════════════════════════
  async deleteTag(tagId, replacementTagId = null) {
    try {
      const tag = await Tag.findById(tagId);
      if (!tag) return { success: false, error: 'الوسم غير موجود' };
      if (tag.isSystem) return { success: false, error: 'لا يمكن حذف وسم النظام' };

      let docsUpdated = 0;
      try {
        const Document = mongoose.model('Document');
        if (replacementTagId) {
          const replacement = await Tag.findById(replacementTagId);
          if (replacement) {
            const result = await Document.updateMany(
              { tags: tag.name },
              { $set: { 'tags.$': replacement.name } }
            );
            docsUpdated = result.modifiedCount || 0;
            replacement.usageCount += docsUpdated;
            await replacement.save();
          }
        } else {
          const result = await Document.updateMany(
            { tags: tag.name },
            { $pull: { tags: tag.name } }
          );
          docsUpdated = result.modifiedCount || 0;
        }
      } catch (e) {
        logger.warn('[Tags] Could not update documents during tag deletion:', e.message);
      }

      await Tag.findByIdAndDelete(tagId);
      return { success: true, deletedTag: tag.nameAr, docsUpdated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  دمج وسوم
  // ══════════════════════════════════════════
  async mergeTags(sourceTagIds, targetTagId, userId) {
    try {
      const targetTag = await Tag.findById(targetTagId);
      if (!targetTag) return { success: false, error: 'الوسم الهدف غير موجود' };

      let totalMerged = 0;
      const Document = mongoose.model('Document');

      for (const sourceId of sourceTagIds) {
        if (String(sourceId) === String(targetTagId)) continue;
        const sourceTag = await Tag.findById(sourceId);
        if (!sourceTag) continue;

        // استبدال في المستندات
        const result = await Document.updateMany(
          { tags: sourceTag.name },
          { $addToSet: { tags: targetTag.name } }
        );
        await Document.updateMany({ tags: sourceTag.name }, { $pull: { tags: sourceTag.name } });
        totalMerged += result.modifiedCount || 0;

        // نقل استخدامات الوسم المصدر
        targetTag.usageCount += sourceTag.usageCount;
        if (sourceTag.synonyms) {
          targetTag.synonyms = [
            ...new Set([
              ...(targetTag.synonyms || []),
              sourceTag.name,
              sourceTag.nameAr,
              ...sourceTag.synonyms,
            ]),
          ];
        } else {
          targetTag.synonyms = [
            ...new Set([...(targetTag.synonyms || []), sourceTag.name, sourceTag.nameAr]),
          ];
        }

        await Tag.findByIdAndDelete(sourceId);
      }

      await targetTag.save();
      return {
        success: true,
        targetTag: targetTag.nameAr,
        mergedCount: sourceTagIds.length,
        docsUpdated: totalMerged,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  جلب جميع الوسوم
  // ══════════════════════════════════════════
  async getTags(options = {}) {
    try {
      const { categoryId, search, activeOnly = true, sort = 'usageCount', limit = 200 } = options;
      const filter = {};
      if (activeOnly) filter.isActive = true;
      if (categoryId) filter.category = categoryId;
      if (search) {
        const regex = new RegExp(search, 'i');
        filter.$or = [{ name: regex }, { nameAr: regex }, { synonyms: regex }];
      }

      const sortObj =
        sort === 'name'
          ? { nameAr: 1 }
          : sort === 'recent'
            ? { createdAt: -1 }
            : { usageCount: -1 };

      const tags = await Tag.find(filter)
        .populate('category', 'name nameAr icon color')
        .sort(sortObj)
        .limit(limit)
        .lean();

      return { success: true, count: tags.length, tags };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  سحابة الوسوم (Tag Cloud)
  // ══════════════════════════════════════════
  async getTagCloud(options = {}) {
    try {
      const { categoryId, limit = 50 } = options;
      const filter = { isActive: true, usageCount: { $gt: 0 } };
      if (categoryId) filter.category = categoryId;

      const tags = await Tag.find(filter)
        .select('name nameAr color usageCount category')
        .sort({ usageCount: -1 })
        .limit(limit)
        .lean();

      const maxCount = tags.length > 0 ? tags[0].usageCount : 1;
      const cloud = tags.map(t => ({
        ...t,
        weight: Math.ceil((t.usageCount / maxCount) * 5), // 1-5 scale
        size: 12 + Math.ceil((t.usageCount / maxCount) * 24), // 12px-36px
      }));

      return { success: true, cloud };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  اقتراحات وسوم ذكية
  // ══════════════════════════════════════════
  async suggestTags(documentId, options = {}) {
    try {
      const Document = mongoose.model('Document');
      const doc = await Document.findById(documentId).lean();
      if (!doc) return { success: false, error: 'المستند غير موجود' };

      const suggestions = [];
      const existingTags = new Set(doc.tags || []);

      // 1. وسوم شائعة في نفس التصنيف
      if (doc.category) {
        const similarDocs = await Document.find({
          _id: { $ne: documentId },
          category: doc.category,
          tags: { $exists: true, $not: { $size: 0 } },
        })
          .select('tags')
          .limit(50)
          .lean();

        const tagFrequency = {};
        similarDocs.forEach(d => {
          (d.tags || []).forEach(t => {
            if (!existingTags.has(t)) tagFrequency[t] = (tagFrequency[t] || 0) + 1;
          });
        });

        const sorted = Object.entries(tagFrequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        for (const [tagName, freq] of sorted) {
          const tagObj = await Tag.findOne({
            $or: [{ name: tagName }, { nameAr: tagName }],
          }).lean();
          suggestions.push({
            tag: tagObj || { name: tagName, nameAr: tagName },
            reason: 'شائع في نفس التصنيف',
            confidence: Math.min(freq / 10, 0.9),
            source: 'category_frequency',
          });
        }
      }

      // 2. تحليل العنوان
      if (doc.title || doc.name) {
        const text = `${doc.title || ''} ${doc.name || ''}`.toLowerCase();
        const allTags = await Tag.find({ isActive: true }).lean();
        for (const tag of allTags) {
          if (existingTags.has(tag.name) || existingTags.has(tag.nameAr)) continue;
          const names = [
            tag.name.toLowerCase(),
            tag.nameAr,
            ...(tag.synonyms || []).map(s => s.toLowerCase()),
          ];
          if (names.some(n => text.includes(n))) {
            suggestions.push({
              tag,
              reason: 'موجود في العنوان',
              confidence: 0.85,
              source: 'title_match',
            });
          }
        }
      }

      suggestions.sort((a, b) => b.confidence - a.confidence);
      return { success: true, documentId, suggestions: suggestions.slice(0, options.limit || 10) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  تطبيق وسوم بالجملة
  // ══════════════════════════════════════════
  async bulkTag(documentIds, tagNames, operation = 'add') {
    try {
      const Document = mongoose.model('Document');
      let result;

      if (operation === 'add') {
        result = await Document.updateMany(
          { _id: { $in: documentIds } },
          { $addToSet: { tags: { $each: tagNames } } }
        );
      } else if (operation === 'remove') {
        result = await Document.updateMany(
          { _id: { $in: documentIds } },
          { $pullAll: { tags: tagNames } }
        );
      } else if (operation === 'replace') {
        result = await Document.updateMany(
          { _id: { $in: documentIds } },
          { $set: { tags: tagNames } }
        );
      }

      // تحديث عدادات الاستخدام
      for (const tagName of tagNames) {
        const tag = await Tag.findOne({ $or: [{ name: tagName }, { nameAr: tagName }] });
        if (tag) {
          tag.usageCount = await Document.countDocuments({ tags: { $in: [tag.name, tag.nameAr] } });
          tag.lastUsedAt = new Date();
          await tag.save();
        }
      }

      return {
        success: true,
        operation,
        documentsAffected: result?.modifiedCount || 0,
        tags: tagNames,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  المستندات حسب الوسم
  // ══════════════════════════════════════════
  async getDocumentsByTag(tagId, options = {}) {
    try {
      const tag = await Tag.findById(tagId);
      if (!tag) return { success: false, error: 'الوسم غير موجود' };

      const Document = mongoose.model('Document');
      const { page = 1, limit = 20 } = options;

      const query = { tags: { $in: [tag.name, tag.nameAr] } };
      const [documents, total] = await Promise.all([
        Document.find(query)
          .select('title name fileType category status createdAt tags')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Document.countDocuments(query),
      ]);

      return {
        success: true,
        tag: tag.nameAr,
        total,
        page,
        pages: Math.ceil(total / limit),
        documents,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  قواعد الأتمتة
  // ══════════════════════════════════════════
  async createRule(data, userId) {
    try {
      const rule = await TagRule.create({ ...data, createdBy: userId });
      return { success: true, rule };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async getRules(activeOnly = true) {
    try {
      const filter = activeOnly ? { isActive: true } : {};
      const rules = await TagRule.find(filter).populate('triggerTag', 'name nameAr color').lean();
      return { success: true, rules };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async executeRules(documentId, addedTags) {
    try {
      const rules = await TagRule.find({ isActive: true }).populate('triggerTag');
      const actions = [];

      for (const rule of rules) {
        if (
          addedTags.includes(rule.triggerTag?.name) ||
          addedTags.includes(rule.triggerTag?.nameAr)
        ) {
          actions.push({
            rule: rule.nameAr || rule.name,
            action: rule.action,
            value: rule.actionValue,
          });
          // تنفيذ الإجراء
          try {
            const Document = mongoose.model('Document');
            switch (rule.action) {
              case 'set_priority':
                await Document.findByIdAndUpdate(documentId, { priority: rule.actionValue });
                break;
              case 'set_category':
                await Document.findByIdAndUpdate(documentId, { category: rule.actionValue });
                break;
              case 'add_tag':
                await Document.findByIdAndUpdate(documentId, {
                  $addToSet: { tags: rule.actionValue },
                });
                break;
              case 'set_status':
                await Document.findByIdAndUpdate(documentId, { status: rule.actionValue });
                break;
            }
          } catch (e) {
            logger.warn('[Tags] Rule execution error:', e.message);
          }
        }
      }

      return { success: true, actionsExecuted: actions.length, actions };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  تحليلات الوسوم
  // ══════════════════════════════════════════
  async getAnalytics(options = {}) {
    try {
      const { timeRange = 30 } = options;
      const since = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);

      const [totalTags, activeTags, totalCategories, topTags, unusedTags, recentTags] =
        await Promise.all([
          Tag.countDocuments(),
          Tag.countDocuments({ isActive: true, usageCount: { $gt: 0 } }),
          TagCategory.countDocuments({ isActive: true }),
          Tag.find({ isActive: true }).sort({ usageCount: -1 }).limit(10).lean(),
          Tag.find({ isActive: true, usageCount: 0 }).select('name nameAr createdAt').lean(),
          Tag.find({ isActive: true, createdAt: { $gte: since } })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean(),
        ]);

      return {
        success: true,
        analytics: {
          totalTags,
          activeTags,
          totalCategories,
          unusedCount: unusedTags.length,
          topTags: topTags.map(t => ({
            name: t.nameAr || t.name,
            count: t.usageCount,
            color: t.color,
          })),
          unusedTags: unusedTags.map(t => ({ name: t.nameAr || t.name, createdAt: t.createdAt })),
          recentTags: recentTags.map(t => ({
            name: t.nameAr || t.name,
            color: t.color,
            date: t.createdAt,
          })),
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ── Utilities ──────────────────────────────
  _slugify(text) {
    return (
      text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\s\u0600-\u06FF]+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '') || `tag-${Date.now()}`
    );
  }
}

module.exports = new DocumentTagsService();
