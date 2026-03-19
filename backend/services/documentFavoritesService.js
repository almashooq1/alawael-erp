/**
 * Document Favorites Service — خدمة المستندات المفضلة
 *
 * Features:
 * - Add/remove documents from favorites
 * - Organize favorites into collections
 * - Quick access to frequently used documents
 * - Favorites analytics and suggestions
 */

const EventEmitter = require('events');

class DocumentFavoritesService extends EventEmitter {
  constructor() {
    super();
    // In-memory store (production: MongoDB collection)
    this.favorites = new Map(); // userId -> Map<docId, favoriteInfo>
    this.collections = new Map(); // userId -> Map<collectionId, collectionInfo>
  }

  /**
   * Add document to favorites — إضافة مستند للمفضلة
   */
  async addFavorite(userId, documentId, options = {}) {
    if (!this.favorites.has(userId)) {
      this.favorites.set(userId, new Map());
    }

    const userFavorites = this.favorites.get(userId);

    if (userFavorites.has(documentId)) {
      return { success: false, message: 'المستند موجود بالفعل في المفضلة' };
    }

    const favorite = {
      documentId,
      userId,
      addedAt: new Date(),
      note: options.note || '',
      collectionId: options.collectionId || null,
      priority: options.priority || 'normal', // low, normal, high, urgent
      color: options.color || null,
      tags: options.tags || [],
      reminder: options.reminder || null,
      accessCount: 0,
      lastAccessedAt: null,
    };

    userFavorites.set(documentId, favorite);
    this.emit('favoriteAdded', { userId, documentId, favorite });

    return { success: true, data: favorite, message: 'تمت الإضافة للمفضلة بنجاح' };
  }

  /**
   * Remove document from favorites — إزالة مستند من المفضلة
   */
  async removeFavorite(userId, documentId) {
    const userFavorites = this.favorites.get(userId);
    if (!userFavorites || !userFavorites.has(documentId)) {
      return { success: false, message: 'المستند غير موجود في المفضلة' };
    }

    userFavorites.delete(documentId);
    this.emit('favoriteRemoved', { userId, documentId });

    return { success: true, message: 'تمت الإزالة من المفضلة بنجاح' };
  }

  /**
   * Toggle favorite status — تبديل حالة المفضلة
   */
  async toggleFavorite(userId, documentId, options = {}) {
    const userFavorites = this.favorites.get(userId);
    if (userFavorites && userFavorites.has(documentId)) {
      return this.removeFavorite(userId, documentId);
    }
    return this.addFavorite(userId, documentId, options);
  }

  /**
   * Get all favorites for a user — جلب جميع المفضلات
   */
  async getFavorites(userId, filters = {}) {
    const userFavorites = this.favorites.get(userId);
    if (!userFavorites) return { success: true, data: [], total: 0 };

    let favorites = Array.from(userFavorites.values());

    // Filter by collection
    if (filters.collectionId) {
      favorites = favorites.filter(f => f.collectionId === filters.collectionId);
    }

    // Filter by priority
    if (filters.priority) {
      favorites = favorites.filter(f => f.priority === filters.priority);
    }

    // Filter by tags
    if (filters.tag) {
      favorites = favorites.filter(f => f.tags.includes(filters.tag));
    }

    // Sort
    const sortBy = filters.sortBy || 'addedAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    favorites.sort((a, b) => {
      if (sortBy === 'accessCount') return (b.accessCount - a.accessCount) * sortOrder;
      if (sortBy === 'priority') {
        const priorities = { urgent: 4, high: 3, normal: 2, low: 1 };
        return (priorities[b.priority] - priorities[a.priority]) * sortOrder;
      }
      return (new Date(b[sortBy]) - new Date(a[sortBy])) * sortOrder;
    });

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const start = (page - 1) * limit;
    const paginatedFavorites = favorites.slice(start, start + limit);

    return {
      success: true,
      data: paginatedFavorites,
      total: favorites.length,
      page,
      pages: Math.ceil(favorites.length / limit),
    };
  }

  /**
   * Check if document is favorited — هل المستند مفضل؟
   */
  async isFavorited(userId, documentId) {
    const userFavorites = this.favorites.get(userId);
    return { isFavorited: userFavorites ? userFavorites.has(documentId) : false };
  }

  /**
   * Update favorite details — تحديث تفاصيل المفضلة
   */
  async updateFavorite(userId, documentId, updates) {
    const userFavorites = this.favorites.get(userId);
    if (!userFavorites || !userFavorites.has(documentId)) {
      return { success: false, message: 'المستند غير موجود في المفضلة' };
    }

    const favorite = userFavorites.get(documentId);
    Object.assign(favorite, {
      ...updates,
      updatedAt: new Date(),
    });

    return { success: true, data: favorite, message: 'تم تحديث المفضلة بنجاح' };
  }

  /**
   * Record access to a favorite — تسجيل الوصول للمفضلة
   */
  async recordAccess(userId, documentId) {
    const userFavorites = this.favorites.get(userId);
    if (userFavorites && userFavorites.has(documentId)) {
      const favorite = userFavorites.get(documentId);
      favorite.accessCount++;
      favorite.lastAccessedAt = new Date();
    }
  }

  // ── Collections Management (مجموعات المفضلة) ──────────────────────────

  /**
   * Create a collection — إنشاء مجموعة
   */
  async createCollection(userId, data) {
    if (!this.collections.has(userId)) {
      this.collections.set(userId, new Map());
    }

    const collectionId = `col_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const collection = {
      id: collectionId,
      userId,
      name: data.name,
      description: data.description || '',
      icon: data.icon || '📁',
      color: data.color || '#1976d2',
      isPrivate: data.isPrivate !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.collections.get(userId).set(collectionId, collection);
    this.emit('collectionCreated', { userId, collection });

    return { success: true, data: collection, message: 'تم إنشاء المجموعة بنجاح' };
  }

  /**
   * Get user collections — جلب مجموعات المستخدم
   */
  async getCollections(userId) {
    const userCollections = this.collections.get(userId);
    if (!userCollections) return { success: true, data: [] };

    const collections = Array.from(userCollections.values()).map(col => {
      // Count documents in collection
      const userFavorites = this.favorites.get(userId);
      const docsCount = userFavorites
        ? Array.from(userFavorites.values()).filter(f => f.collectionId === col.id).length
        : 0;
      return { ...col, documentsCount: docsCount };
    });

    return { success: true, data: collections };
  }

  /**
   * Delete a collection — حذف مجموعة
   */
  async deleteCollection(userId, collectionId) {
    const userCollections = this.collections.get(userId);
    if (!userCollections || !userCollections.has(collectionId)) {
      return { success: false, message: 'المجموعة غير موجودة' };
    }

    // Unlink favorites from this collection
    const userFavorites = this.favorites.get(userId);
    if (userFavorites) {
      for (const [, fav] of userFavorites) {
        if (fav.collectionId === collectionId) {
          fav.collectionId = null;
        }
      }
    }

    userCollections.delete(collectionId);
    return { success: true, message: 'تم حذف المجموعة بنجاح' };
  }

  /**
   * Get favorites statistics — إحصائيات المفضلة
   */
  async getStatistics(userId) {
    const userFavorites = this.favorites.get(userId);
    const userCollections = this.collections.get(userId);

    if (!userFavorites) {
      return {
        success: true,
        data: {
          totalFavorites: 0,
          totalCollections: 0,
          byPriority: {},
          topAccessed: [],
          recentlyAdded: [],
        },
      };
    }

    const favorites = Array.from(userFavorites.values());

    const byPriority = {};
    favorites.forEach(f => {
      byPriority[f.priority] = (byPriority[f.priority] || 0) + 1;
    });

    const topAccessed = [...favorites].sort((a, b) => b.accessCount - a.accessCount).slice(0, 10);

    const recentlyAdded = [...favorites]
      .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
      .slice(0, 10);

    return {
      success: true,
      data: {
        totalFavorites: favorites.length,
        totalCollections: userCollections ? userCollections.size : 0,
        byPriority,
        topAccessed,
        recentlyAdded,
      },
    };
  }
}

module.exports = new DocumentFavoritesService();
