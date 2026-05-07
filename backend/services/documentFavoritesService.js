'use strict';

/**
 * documentFavoritesService — in-memory singleton (EventEmitter)
 * Used by documentAdvanced.routes.js for favorites management.
 * Flat-path barrel kept alongside the Mongoose-based canonical service
 * at services/documents/documentFavorites.service.js.
 */

const EventEmitter = require('events');
const { randomUUID } = require('crypto');

class DocumentFavoritesService extends EventEmitter {
  constructor() {
    super();
    // Map<userId, Map<docId, favoriteEntry>>
    this._favorites = new Map();
    // Map<userId, Map<colId, collectionEntry>>
    this._collections = new Map();
  }

  _userFavs(userId) {
    if (!this._favorites.has(userId)) this._favorites.set(userId, new Map());
    return this._favorites.get(userId);
  }

  _userCols(userId) {
    if (!this._collections.has(userId)) this._collections.set(userId, new Map());
    return this._collections.get(userId);
  }

  // ── addFavorite ──────────────────────────────────────────────────────────
  async addFavorite(userId, documentId, opts = {}) {
    const favs = this._userFavs(userId);
    if (favs.has(documentId)) {
      return { success: false, message: 'Already in favorites' };
    }
    const entry = {
      documentId,
      userId,
      priority: opts.priority || 'normal',
      note: opts.note || null,
      tags: opts.tags || [],
      collectionId: opts.collectionId || null,
      accessCount: 0,
      addedAt: new Date(),
      updatedAt: new Date(),
    };
    favs.set(documentId, entry);
    this.emit('favoriteAdded', { ...entry });
    return { success: true, data: { ...entry } };
  }

  // ── removeFavorite ───────────────────────────────────────────────────────
  async removeFavorite(userId, documentId) {
    const favs = this._userFavs(userId);
    if (!favs.has(documentId)) {
      return { success: false, message: 'Not in favorites' };
    }
    favs.delete(documentId);
    this.emit('favoriteRemoved', { userId, documentId });
    return { success: true };
  }

  // ── toggleFavorite ───────────────────────────────────────────────────────
  async toggleFavorite(userId, documentId, opts = {}) {
    const favs = this._userFavs(userId);
    if (favs.has(documentId)) {
      return this.removeFavorite(userId, documentId);
    }
    return this.addFavorite(userId, documentId, opts);
  }

  // ── getFavorites ─────────────────────────────────────────────────────────
  async getFavorites(userId, opts = {}) {
    const favs = this._userFavs(userId);
    let list = Array.from(favs.values());

    if (opts.priority) list = list.filter(f => f.priority === opts.priority);
    if (opts.tag) list = list.filter(f => f.tags && f.tags.includes(opts.tag));
    if (opts.collectionId) list = list.filter(f => f.collectionId === opts.collectionId);

    const total = list.length;
    const limit = opts.limit || total || 1;
    const page = opts.page || 1;
    const start = (page - 1) * limit;
    const pages = Math.ceil(total / limit);
    const data = list.slice(start, start + limit).map(f => ({ ...f }));

    return { success: true, total, data, pages, page };
  }

  // ── isFavorited ──────────────────────────────────────────────────────────
  async isFavorited(userId, documentId) {
    const favs = this._userFavs(userId);
    return { isFavorited: favs.has(documentId) };
  }

  // ── updateFavorite ───────────────────────────────────────────────────────
  async updateFavorite(userId, documentId, updates = {}) {
    const favs = this._userFavs(userId);
    if (!favs.has(documentId)) {
      return { success: false, message: 'Not in favorites' };
    }
    const entry = favs.get(documentId);
    Object.assign(entry, updates, { updatedAt: new Date() });
    return { success: true, data: { ...entry } };
  }

  // ── recordAccess ─────────────────────────────────────────────────────────
  async recordAccess(userId, documentId) {
    const favs = this._userFavs(userId);
    if (favs.has(documentId)) {
      favs.get(documentId).accessCount += 1;
    }
    return { success: true };
  }

  // ── Collections ──────────────────────────────────────────────────────────
  async createCollection(userId, opts = {}) {
    const cols = this._userCols(userId);
    const id = `col_${randomUUID()}`;
    const entry = {
      id,
      userId,
      name: opts.name || 'Untitled',
      description: opts.description || null,
      createdAt: new Date(),
    };
    cols.set(id, entry);
    return { success: true, data: { ...entry } };
  }

  async getCollections(userId) {
    const cols = this._userCols(userId);
    const favs = this._userFavs(userId);
    const data = Array.from(cols.values()).map(col => {
      const documentsCount = Array.from(favs.values()).filter(
        f => f.collectionId === col.id
      ).length;
      return { ...col, documentsCount };
    });
    return { success: true, data };
  }

  async deleteCollection(userId, collectionId) {
    const cols = this._userCols(userId);
    if (!cols.has(collectionId)) {
      return { success: false, message: 'Collection not found' };
    }
    cols.delete(collectionId);
    // unlink favorites from this collection
    const favs = this._userFavs(userId);
    for (const fav of favs.values()) {
      if (fav.collectionId === collectionId) fav.collectionId = null;
    }
    return { success: true };
  }

  // ── getStatistics ────────────────────────────────────────────────────────
  async getStatistics(userId) {
    const favs = this._userFavs(userId);
    const cols = this._userCols(userId);
    const list = Array.from(favs.values());

    const byPriority = {};
    for (const f of list) {
      byPriority[f.priority] = (byPriority[f.priority] || 0) + 1;
    }

    const topAccessed = [...list]
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 5)
      .map(f => ({ documentId: f.documentId, accessCount: f.accessCount }));

    return {
      success: true,
      data: {
        totalFavorites: list.length,
        totalCollections: cols.size,
        byPriority,
        topAccessed,
      },
    };
  }
}

module.exports = new DocumentFavoritesService();
