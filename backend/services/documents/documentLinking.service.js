'use strict';

/**
 * Document Linking & Relationships Service — خدمة ربط المستندات
 * ══════════════════════════════════════════════════════════════
 * إنشاء وإدارة العلاقات بين المستندات (مرجع، تعديل، ملحق، يحل محل، أب-ابن)
 *
 * @module documentLinking.service
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// ─── نموذج الربط ────────────────────────────────────
const documentLinkSchema = new mongoose.Schema(
  {
    sourceDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    targetDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    linkType: {
      type: String,
      enum: [
        'reference',
        'amendment',
        'attachment',
        'supersedes',
        'related',
        'parent_child',
        'dependency',
        'copy',
        'translation',
      ],
      required: true,
    },
    direction: {
      type: String,
      enum: ['unidirectional', 'bidirectional'],
      default: 'bidirectional',
    },
    metadata: {
      description: String,
      descriptionAr: String,
      strength: { type: String, enum: ['strong', 'normal', 'weak'], default: 'normal' },
      autoDetected: { type: Boolean, default: false },
      confidence: Number,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
    deactivatedAt: Date,
    deactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'document_links',
  }
);

documentLinkSchema.index({ sourceDocument: 1, targetDocument: 1, linkType: 1 }, { unique: true });
documentLinkSchema.index({ linkType: 1, isActive: 1 });
documentLinkSchema.index({ createdBy: 1 });

const DocumentLink =
  mongoose.models.DocumentLink || mongoose.model('DocumentLink', documentLinkSchema);

// ─── أنواع الروابط مع التسميات العربية ─────────────────
const LINK_TYPES = {
  reference: {
    labelAr: 'مرجع',
    labelEn: 'Reference',
    icon: '📎',
    description: 'يشير إلى مستند آخر كمرجع',
  },
  amendment: {
    labelAr: 'تعديل',
    labelEn: 'Amendment',
    icon: '✏️',
    description: 'تعديل أو ملحق لمستند أصلي',
  },
  attachment: {
    labelAr: 'مرفق',
    labelEn: 'Attachment',
    icon: '📋',
    description: 'مرفق أو ملحق بمستند',
  },
  supersedes: {
    labelAr: 'يحل محل',
    labelEn: 'Supersedes',
    icon: '🔄',
    description: 'يحل محل نسخة سابقة',
  },
  related: {
    labelAr: 'ذو صلة',
    labelEn: 'Related',
    icon: '🔗',
    description: 'مستند ذو صلة بالموضوع',
  },
  parent_child: {
    labelAr: 'أب — ابن',
    labelEn: 'Parent-Child',
    icon: '🌳',
    description: 'علاقة هرمية بين المستندات',
  },
  dependency: {
    labelAr: 'تبعية',
    labelEn: 'Dependency',
    icon: '⛓️',
    description: 'مستند يعتمد على آخر',
  },
  copy: { labelAr: 'نسخة', labelEn: 'Copy', icon: '📄', description: 'نسخة من مستند أصلي' },
  translation: {
    labelAr: 'ترجمة',
    labelEn: 'Translation',
    icon: '🌐',
    description: 'ترجمة لمستند بلغة أخرى',
  },
};

class DocumentLinkingService {
  // ══════════════════════════════════════════
  //  إنشاء رابط
  // ══════════════════════════════════════════
  async createLink(sourceDocId, targetDocId, linkType, userId, metadata = {}) {
    try {
      if (String(sourceDocId) === String(targetDocId)) {
        return { success: false, error: 'لا يمكن ربط المستند بنفسه' };
      }
      if (!LINK_TYPES[linkType]) {
        return { success: false, error: 'نوع الرابط غير صالح' };
      }

      // التحقق من عدم وجود دورة (للروابط الهرمية)
      if (['parent_child', 'dependency'].includes(linkType)) {
        const hasCycle = await this._detectCycle(sourceDocId, targetDocId, linkType);
        if (hasCycle) return { success: false, error: 'تم اكتشاف دورة — لا يمكن إنشاء هذا الرابط' };
      }

      const existing = await DocumentLink.findOne({
        sourceDocument: sourceDocId,
        targetDocument: targetDocId,
        linkType,
        isActive: true,
      });
      if (existing) return { success: false, error: 'الرابط موجود بالفعل' };

      const link = await DocumentLink.create({
        sourceDocument: sourceDocId,
        targetDocument: targetDocId,
        linkType,
        createdBy: userId,
        metadata: { ...metadata },
      });

      logger.info(`[DocumentLinking] Link created: ${sourceDocId} → ${targetDocId} (${linkType})`);
      return { success: true, link };
    } catch (err) {
      logger.error('[DocumentLinking] createLink error:', err);
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  إزالة رابط
  // ══════════════════════════════════════════
  async removeLink(linkId, userId) {
    try {
      const link = await DocumentLink.findByIdAndUpdate(
        linkId,
        {
          isActive: false,
          deactivatedAt: new Date(),
          deactivatedBy: userId,
        },
        { new: true }
      );

      if (!link) return { success: false, error: 'الرابط غير موجود' };
      logger.info(`[DocumentLinking] Link removed: ${linkId}`);
      return { success: true, link };
    } catch (err) {
      logger.error('[DocumentLinking] removeLink error:', err);
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  جلب المستندات المرتبطة
  // ══════════════════════════════════════════
  async getLinkedDocuments(documentId, options = {}) {
    try {
      const { direction = 'both', linkType, activeOnly = true } = options;
      const filter = {};
      if (activeOnly) filter.isActive = true;
      if (linkType) filter.linkType = linkType;

      let links = [];

      if (direction === 'outbound' || direction === 'both') {
        const outbound = await DocumentLink.find({ ...filter, sourceDocument: documentId })
          .populate('targetDocument', 'title name fileType category status createdAt')
          .populate('createdBy', 'name email')
          .sort({ createdAt: -1 })
          .lean();
        links.push(...outbound.map(l => ({ ...l, relDirection: 'outbound' })));
      }

      if (direction === 'inbound' || direction === 'both') {
        const inbound = await DocumentLink.find({ ...filter, targetDocument: documentId })
          .populate('sourceDocument', 'title name fileType category status createdAt')
          .populate('createdBy', 'name email')
          .sort({ createdAt: -1 })
          .lean();
        links.push(...inbound.map(l => ({ ...l, relDirection: 'inbound' })));
      }

      // إزالة التكرارات
      const seen = new Set();
      links = links.filter(l => {
        const key = String(l._id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return {
        success: true,
        documentId,
        totalLinks: links.length,
        links: links.map(l => ({
          ...l,
          typeInfo: LINK_TYPES[l.linkType],
        })),
      };
    } catch (err) {
      logger.error('[DocumentLinking] getLinkedDocuments error:', err);
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  شجرة العلاقات (Graph traversal)
  // ══════════════════════════════════════════
  async getDocumentGraph(documentId, maxDepth = 3) {
    try {
      const visited = new Set();
      const nodes = [];
      const edges = [];

      const traverse = async (docId, depth) => {
        const docKey = String(docId);
        if (visited.has(docKey) || depth > maxDepth) return;
        visited.add(docKey);

        const links = await DocumentLink.find({
          isActive: true,
          $or: [{ sourceDocument: docId }, { targetDocument: docId }],
        })
          .populate('sourceDocument', 'title name category')
          .populate('targetDocument', 'title name category')
          .lean();

        for (const link of links) {
          edges.push({
            id: String(link._id),
            source: String(link.sourceDocument._id || link.sourceDocument),
            target: String(link.targetDocument._id || link.targetDocument),
            type: link.linkType,
            typeInfo: LINK_TYPES[link.linkType],
          });

          const srcDoc = link.sourceDocument;
          const tgtDoc = link.targetDocument;

          if (srcDoc._id && !visited.has(String(srcDoc._id))) {
            nodes.push({
              id: String(srcDoc._id),
              title: srcDoc.title || srcDoc.name,
              category: srcDoc.category,
            });
            await traverse(srcDoc._id, depth + 1);
          }
          if (tgtDoc._id && !visited.has(String(tgtDoc._id))) {
            nodes.push({
              id: String(tgtDoc._id),
              title: tgtDoc.title || tgtDoc.name,
              category: tgtDoc.category,
            });
            await traverse(tgtDoc._id, depth + 1);
          }
        }
      };

      // إضافة العقدة الجذرية
      nodes.push({ id: String(documentId), isRoot: true });
      await traverse(documentId, 0);

      // إزالة التكرار
      const uniqueNodes = [...new Map(nodes.map(n => [n.id, n])).values()];
      const uniqueEdges = [...new Map(edges.map(e => [e.id, e])).values()];

      return {
        success: true,
        graph: { nodes: uniqueNodes, edges: uniqueEdges, depth: maxDepth },
        stats: { nodeCount: uniqueNodes.length, edgeCount: uniqueEdges.length },
      };
    } catch (err) {
      logger.error('[DocumentLinking] getDocumentGraph error:', err);
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  ربط مجموعة مستندات (bulk)
  // ══════════════════════════════════════════
  async bulkLink(sourceDocId, targetDocIds, linkType, userId, metadata = {}) {
    try {
      const results = { created: 0, skipped: 0, errors: [] };

      for (const targetId of targetDocIds) {
        const res = await this.createLink(sourceDocId, targetId, linkType, userId, metadata);
        if (res.success) results.created++;
        else results.skipped++;
      }

      return { success: true, results };
    } catch (err) {
      logger.error('[DocumentLinking] bulkLink error:', err);
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  أنواع الروابط المتاحة
  // ══════════════════════════════════════════
  getLinkTypes() {
    return {
      success: true,
      types: Object.entries(LINK_TYPES).map(([key, val]) => ({ key, ...val })),
    };
  }

  // ══════════════════════════════════════════
  //  البحث عن المستندات اليتيمة (بدون روابط)
  // ══════════════════════════════════════════
  async findOrphans(filters = {}) {
    try {
      const Document = mongoose.model('Document');
      const { category, limit = 50 } = filters;

      const linkedDocIds = await DocumentLink.distinct('sourceDocument', { isActive: true });
      const targetDocIds = await DocumentLink.distinct('targetDocument', { isActive: true });
      const allLinkedIds = [...new Set([...linkedDocIds, ...targetDocIds].map(String))];

      const query = { _id: { $nin: allLinkedIds.map(id => new mongoose.Types.ObjectId(id)) } };
      if (category) query.category = category;

      const orphans = await Document.find(query)
        .select('title name category fileType createdAt')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return { success: true, count: orphans.length, orphans };
    } catch (err) {
      logger.error('[DocumentLinking] findOrphans error:', err);
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  اقتراحات ربط ذكية (AI-based)
  // ══════════════════════════════════════════
  async suggestLinks(documentId, options = {}) {
    try {
      const Document = mongoose.model('Document');
      const doc = await Document.findById(documentId).lean();
      if (!doc) return { success: false, error: 'المستند غير موجود' };

      const { limit = 10 } = options;
      const suggestions = [];

      // 1. نفس التصنيف
      const sameCategory = await Document.find({
        _id: { $ne: documentId },
        category: doc.category,
      })
        .select('title name category fileType')
        .limit(limit)
        .lean();

      for (const d of sameCategory) {
        const alreadyLinked = await DocumentLink.exists({
          isActive: true,
          $or: [
            { sourceDocument: documentId, targetDocument: d._id },
            { sourceDocument: d._id, targetDocument: documentId },
          ],
        });
        if (!alreadyLinked) {
          suggestions.push({
            document: d,
            suggestedType: 'related',
            reason: 'نفس التصنيف',
            confidence: 0.6,
          });
        }
      }

      // 2. تشابه العنوان
      if (doc.title) {
        const titleWords = doc.title.split(/\s+/).filter(w => w.length > 2);
        if (titleWords.length > 0) {
          const titleRegex = new RegExp(titleWords.slice(0, 3).join('|'), 'i');
          const titleMatches = await Document.find({
            _id: { $ne: documentId },
            $or: [{ title: titleRegex }, { name: titleRegex }],
          })
            .select('title name category fileType')
            .limit(5)
            .lean();

          for (const d of titleMatches) {
            if (!suggestions.find(s => String(s.document._id) === String(d._id))) {
              suggestions.push({
                document: d,
                suggestedType: 'related',
                reason: 'تشابه في العنوان',
                confidence: 0.75,
              });
            }
          }
        }
      }

      // 3. نفس الكلمات المفتاحية (tags)
      if (doc.tags && doc.tags.length > 0) {
        const tagMatches = await Document.find({
          _id: { $ne: documentId },
          tags: { $in: doc.tags },
        })
          .select('title name category fileType tags')
          .limit(5)
          .lean();

        for (const d of tagMatches) {
          const overlap = d.tags.filter(t => doc.tags.includes(t)).length;
          if (!suggestions.find(s => String(s.document._id) === String(d._id))) {
            suggestions.push({
              document: d,
              suggestedType: 'related',
              reason: `${overlap} كلمات مفتاحية مشتركة`,
              confidence: Math.min(0.5 + overlap * 0.15, 0.95),
            });
          }
        }
      }

      // ترتيب بالثقة
      suggestions.sort((a, b) => b.confidence - a.confidence);

      return { success: true, documentId, suggestions: suggestions.slice(0, limit) };
    } catch (err) {
      logger.error('[DocumentLinking] suggestLinks error:', err);
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  إحصائيات الروابط
  // ══════════════════════════════════════════
  async getStats(documentId) {
    try {
      const matchFilter = { isActive: true };
      if (documentId) {
        matchFilter.$or = [
          { sourceDocument: new mongoose.Types.ObjectId(documentId) },
          { targetDocument: new mongoose.Types.ObjectId(documentId) },
        ];
      }

      const [byType, totalLinks, recentLinks] = await Promise.all([
        DocumentLink.aggregate([
          { $match: matchFilter },
          { $group: { _id: '$linkType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        DocumentLink.countDocuments(matchFilter),
        DocumentLink.find(matchFilter)
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('sourceDocument', 'title name')
          .populate('targetDocument', 'title name')
          .lean(),
      ]);

      const byTypeMap = {};
      byType.forEach(t => {
        byTypeMap[t._id] = { count: t.count, ...LINK_TYPES[t._id] };
      });

      return {
        success: true,
        stats: {
          totalLinks,
          byType: byTypeMap,
          recentLinks: recentLinks.map(l => ({
            id: l._id,
            source: l.sourceDocument?.title || l.sourceDocument?.name,
            target: l.targetDocument?.title || l.targetDocument?.name,
            type: l.linkType,
            date: l.createdAt,
          })),
        },
      };
    } catch (err) {
      logger.error('[DocumentLinking] getStats error:', err);
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  كشف الدورات (لمنع الحلقات)
  // ══════════════════════════════════════════
  async _detectCycle(sourceId, targetId, linkType) {
    const visited = new Set();

    const dfs = async currentId => {
      const key = String(currentId);
      if (key === String(sourceId)) return true; // دورة!
      if (visited.has(key)) return false;
      visited.add(key);

      const childLinks = await DocumentLink.find({
        sourceDocument: currentId,
        linkType,
        isActive: true,
      })
        .select('targetDocument')
        .lean();

      for (const link of childLinks) {
        if (await dfs(link.targetDocument)) return true;
      }
      return false;
    };

    return dfs(targetId);
  }
}

module.exports = new DocumentLinkingService();
