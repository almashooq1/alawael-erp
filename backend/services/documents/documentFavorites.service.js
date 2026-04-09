'use strict';

/**
 * Document Favorites & Bookmarks Service — خدمة المفضلة والإشارات المرجعية
 * ═══════════════════════════════════════════════════════════════════════════
 * المفضلة، الإشارات المرجعية، المجموعات المخصصة،
 * المستندات الأخيرة، والوصول السريع
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// ─────────────────────────────────────────────
// مخطط المجموعة (Collection)
// ─────────────────────────────────────────────

const DocumentCollectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    icon: { type: String, default: '📁' },
    color: { type: String, default: '#2196F3' },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    documents: [
      {
        documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
        addedAt: { type: Date, default: Date.now },
        note: String,
      },
    ],

    isDefault: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },
    documentCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'document_collections',
  }
);

DocumentCollectionSchema.index({ userId: 1, name: 1 });

const DocumentCollection =
  mongoose.models.DocumentCollection ||
  mongoose.model('DocumentCollection', DocumentCollectionSchema);

// ─────────────────────────────────────────────
// مخطط الإشارة المرجعية
// ─────────────────────────────────────────────

const BookmarkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ['favorite', 'bookmark', 'pinned', 'quick_access'],
      default: 'favorite',
    },

    // موقع الإشارة (صفحة/موقع)
    position: {
      pageNumber: Number,
      scrollPosition: Number,
      label: String,
    },

    note: String,
    color: { type: String, default: '#FFD700' },
    tags: [String],

    collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentCollection' },
  },
  {
    timestamps: true,
    collection: 'document_bookmarks',
  }
);

BookmarkSchema.index({ userId: 1, documentId: 1, type: 1 }, { unique: true });
BookmarkSchema.index({ userId: 1, type: 1, createdAt: -1 });

const Bookmark =
  mongoose.models.DocumentBookmark || mongoose.model('DocumentBookmark', BookmarkSchema);

// ─────────────────────────────────────────────
// سجل الوصول الأخير
// ─────────────────────────────────────────────

const RecentAccessSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    accessType: {
      type: String,
      enum: ['view', 'edit', 'download', 'comment'],
      default: 'view',
    },
    lastAccessedAt: { type: Date, default: Date.now },
    accessCount: { type: Number, default: 1 },
  },
  { timestamps: true, collection: 'document_recent_access' }
);

RecentAccessSchema.index({ userId: 1, lastAccessedAt: -1 });
RecentAccessSchema.index({ userId: 1, documentId: 1 }, { unique: true });

const RecentAccess =
  mongoose.models.DocumentRecentAccess ||
  mongoose.model('DocumentRecentAccess', RecentAccessSchema);

// ─────────────────────────────────────────────
// خدمة المفضلة
// ─────────────────────────────────────────────

class DocumentFavoritesService {
  // ═══ المفضلة والإشارات المرجعية ═══

  /**
   * إضافة/إزالة من المفضلة (toggle)
   */
  async toggleFavorite(userId, documentId) {
    try {
      const existing = await Bookmark.findOne({ userId, documentId, type: 'favorite' });

      if (existing) {
        await Bookmark.findByIdAndDelete(existing._id);
        return { success: true, isFavorite: false, message: 'تمت الإزالة من المفضلة' };
      }

      await new Bookmark({ userId, documentId, type: 'favorite' }).save();
      return { success: true, isFavorite: true, message: 'تمت الإضافة للمفضلة' };
    } catch (err) {
      // duplicate key = already toggled
      if (err.code === 11000) {
        await Bookmark.findOneAndDelete({ userId, documentId, type: 'favorite' });
        return { success: true, isFavorite: false };
      }
      logger.error(`[Favorites] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * إضافة إشارة مرجعية
   */
  async addBookmark(userId, documentId, data = {}) {
    try {
      const bookmark = await Bookmark.findOneAndUpdate(
        { userId, documentId, type: data.type || 'bookmark' },
        {
          $set: {
            position: data.position,
            note: data.note || '',
            color: data.color || '#FFD700',
            tags: data.tags || [],
            collectionId: data.collectionId || null,
          },
          $setOnInsert: { userId, documentId, type: data.type || 'bookmark' },
        },
        { upsert: true, new: true }
      );

      return { success: true, bookmark: this._formatBookmark(bookmark.toObject()) };
    } catch (err) {
      logger.error(`[Favorites] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * إزالة إشارة مرجعية
   */
  async removeBookmark(bookmarkId, userId) {
    try {
      await Bookmark.findOneAndDelete({ _id: bookmarkId, userId });
      return { success: true, message: 'تمت الإزالة' };
    } catch (err) {
      logger.error(`[Favorites] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب المفضلة
   */
  async getFavorites(userId, options = {}) {
    try {
      const query = { userId, type: options.type || 'favorite' };
      if (options.tags?.length) query.tags = { $in: options.tags };

      const bookmarks = await Bookmark.find(query)
        .populate('documentId', 'title description category fileType fileSize createdAt tags')
        .populate('collectionId', 'name icon color')
        .sort({ createdAt: -1 })
        .limit(options.limit || 100)
        .lean();

      return {
        success: true,
        favorites: bookmarks.filter(b => b.documentId).map(b => this._formatBookmark(b)),
        total: bookmarks.length,
      };
    } catch (err) {
      logger.error(`[Favorites] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * التحقق إذا كان المستند مفضلاً
   */
  async isFavorite(userId, documentId) {
    try {
      const exists = await Bookmark.findOne({ userId, documentId, type: 'favorite' });
      return { success: true, isFavorite: !!exists };
    } catch (err) {
      return { success: true, isFavorite: false };
    }
  }

  // ═══ المجموعات ═══

  /**
   * إنشاء مجموعة
   */
  async createCollection(userId, data) {
    try {
      const collection = new DocumentCollection({
        name: data.name,
        description: data.description || '',
        icon: data.icon || '📁',
        color: data.color || '#2196F3',
        userId,
        isPublic: data.isPublic || false,
      });

      await collection.save();
      return { success: true, collection: this._formatCollection(collection.toObject()) };
    } catch (err) {
      logger.error(`[Favorites] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب مجموعات المستخدم
   */
  async getCollections(userId) {
    try {
      const collections = await DocumentCollection.find({ userId })
        .sort({ isDefault: -1, name: 1 })
        .lean();

      return {
        success: true,
        collections: collections.map(c => this._formatCollection(c)),
      };
    } catch (err) {
      logger.error(`[Favorites] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * إضافة مستند لمجموعة
   */
  async addToCollection(collectionId, documentId, userId, note = '') {
    try {
      const collection = await DocumentCollection.findOne({ _id: collectionId, userId });
      if (!collection) throw new Error('المجموعة غير موجودة');

      const exists = collection.documents.some(
        d => d.documentId.toString() === documentId.toString()
      );
      if (exists) return { success: true, message: 'المستند موجود بالفعل' };

      collection.documents.push({ documentId, note, addedAt: new Date() });
      collection.documentCount = collection.documents.length;
      await collection.save();

      return { success: true, message: 'تمت الإضافة' };
    } catch (err) {
      logger.error(`[Favorites] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * إزالة مستند من مجموعة
   */
  async removeFromCollection(collectionId, documentId, userId) {
    try {
      const collection = await DocumentCollection.findOne({ _id: collectionId, userId });
      if (!collection) throw new Error('المجموعة غير موجودة');

      collection.documents = collection.documents.filter(
        d => d.documentId.toString() !== documentId.toString()
      );
      collection.documentCount = collection.documents.length;
      await collection.save();

      return { success: true, message: 'تمت الإزالة' };
    } catch (err) {
      logger.error(`[Favorites] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب مستندات مجموعة
   */
  async getCollectionDocuments(collectionId, userId) {
    try {
      const collection = await DocumentCollection.findOne({ _id: collectionId, userId })
        .populate(
          'documents.documentId',
          'title description category fileType fileSize createdAt tags'
        )
        .lean();

      if (!collection) throw new Error('المجموعة غير موجودة');

      return {
        success: true,
        collection: this._formatCollection(collection),
        documents: (collection.documents || [])
          .filter(d => d.documentId)
          .map(d => ({
            ...d,
            document: d.documentId,
          })),
      };
    } catch (err) {
      logger.error(`[Favorites] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * حذف مجموعة
   */
  async deleteCollection(collectionId, userId) {
    try {
      const result = await DocumentCollection.findOneAndDelete({
        _id: collectionId,
        userId,
        isDefault: false,
      });
      if (!result) throw new Error('لا يمكن حذف المجموعة');
      return { success: true, message: 'تم حذف المجموعة' };
    } catch (err) {
      logger.error(`[Favorites] خطأ: ${err.message}`);
      throw err;
    }
  }

  // ═══ المستندات الأخيرة ═══

  /**
   * تسجيل وصول (يُستدعى تلقائياً)
   */
  async recordAccess(userId, documentId, accessType = 'view') {
    try {
      await RecentAccess.findOneAndUpdate(
        { userId, documentId },
        {
          $set: { lastAccessedAt: new Date(), accessType },
          $inc: { accessCount: 1 },
          $setOnInsert: { userId, documentId },
        },
        { upsert: true }
      );
      return { success: true };
    } catch (err) {
      logger.warn(`[Favorites] خطأ تسجيل: ${err.message}`);
      return { success: false };
    }
  }

  /**
   * جلب المستندات الأخيرة
   */
  async getRecentDocuments(userId, options = {}) {
    try {
      const limit = options.limit || 20;
      const records = await RecentAccess.find({ userId })
        .populate('documentId', 'title description category fileType fileSize createdAt tags')
        .sort({ lastAccessedAt: -1 })
        .limit(limit)
        .lean();

      return {
        success: true,
        documents: records
          .filter(r => r.documentId)
          .map(r => ({
            document: r.documentId,
            lastAccessedAt: r.lastAccessedAt,
            accessCount: r.accessCount,
            accessType: r.accessType,
          })),
      };
    } catch (err) {
      logger.error(`[Favorites] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * الأكثر استخداماً
   */
  async getMostAccessed(userId, options = {}) {
    try {
      const records = await RecentAccess.find({ userId })
        .populate('documentId', 'title description category fileType')
        .sort({ accessCount: -1 })
        .limit(options.limit || 10)
        .lean();

      return {
        success: true,
        documents: records
          .filter(r => r.documentId)
          .map(r => ({
            document: r.documentId,
            accessCount: r.accessCount,
          })),
      };
    } catch (err) {
      logger.error(`[Favorites] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * مسح السجل الأخير
   */
  async clearRecentHistory(userId) {
    try {
      await RecentAccess.deleteMany({ userId });
      return { success: true, message: 'تم مسح السجل' };
    } catch (err) {
      logger.error(`[Favorites] خطأ: ${err.message}`);
      throw err;
    }
  }

  // ═══ إحصائيات ═══

  async getStats(userId) {
    try {
      const [favCount, bookmarkCount, collectionsCount, recentCount] = await Promise.all([
        Bookmark.countDocuments({ userId, type: 'favorite' }),
        Bookmark.countDocuments({ userId, type: 'bookmark' }),
        DocumentCollection.countDocuments({ userId }),
        RecentAccess.countDocuments({ userId }),
      ]);

      return {
        success: true,
        stats: { favCount, bookmarkCount, collectionsCount, recentCount },
      };
    } catch (err) {
      logger.error(`[Favorites] خطأ: ${err.message}`);
      throw err;
    }
  }

  _formatBookmark(b) {
    return {
      id: b._id,
      documentId: b.documentId?._id || b.documentId,
      document: b.documentId?.title
        ? {
            id: b.documentId._id,
            title: b.documentId.title,
            category: b.documentId.category,
            fileType: b.documentId.fileType,
            fileSize: b.documentId.fileSize,
            tags: b.documentId.tags,
          }
        : null,
      type: b.type,
      position: b.position,
      note: b.note,
      color: b.color,
      tags: b.tags,
      collection: b.collectionId
        ? {
            id: b.collectionId._id || b.collectionId,
            name: b.collectionId.name,
            icon: b.collectionId.icon,
            color: b.collectionId.color,
          }
        : null,
      createdAt: b.createdAt,
    };
  }

  _formatCollection(c) {
    return {
      id: c._id,
      name: c.name,
      description: c.description,
      icon: c.icon,
      color: c.color,
      documentCount: c.documentCount || (c.documents || []).length,
      isDefault: c.isDefault,
      isPublic: c.isPublic,
      createdAt: c.createdAt,
    };
  }
}

module.exports = new DocumentFavoritesService();
module.exports.Bookmark = Bookmark;
module.exports.DocumentCollection = DocumentCollection;
module.exports.RecentAccess = RecentAccess;
