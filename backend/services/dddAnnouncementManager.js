'use strict';
/**
 * AnnouncementManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddAnnouncementManager.js
 */

const {
  DDDAnnouncement,
  DDDBulletinBoard,
  DDDAnnouncementCategory,
  DDDAnnouncementReaction,
  ANNOUNCEMENT_TYPES,
  ANNOUNCEMENT_STATUSES,
  AUDIENCE_SCOPES,
  BULLETIN_TYPES,
  REACTION_TYPES,
  DISPLAY_PRIORITIES,
  BUILTIN_CATEGORIES,
} = require('../models/DddAnnouncementManager');

const BaseCrudService = require('./base/BaseCrudService');

class AnnouncementManager extends BaseCrudService {
  constructor() {
    super('AnnouncementManager', {
      description: 'Organisation announcements, bulletins & broadcasts',
      version: '1.0.0',
    }, {
      announcements: DDDAnnouncement,
      bulletinBoards: DDDBulletinBoard,
      announcementCategorys: DDDAnnouncementCategory,
      announcementReactions: DDDAnnouncementReaction,
    })
  }

  async initialize() {
    await this._seedCategories();
    this.log('Announcement Manager initialised ✓');
    return true;
  }

  async _seedCategories() {
    for (const c of BUILTIN_CATEGORIES) {
      const exists = await DDDAnnouncementCategory.findOne({ code: c.code }).lean();
      if (!exists) await DDDAnnouncementCategory.create({ ...c, isActive: true });
    }
  }

  /* ── Announcements ── */
  async listAnnouncements(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.audienceScope) q.audienceScope = filters.audienceScope;
    if (filters.categoryId) q.categoryId = filters.categoryId;
    return DDDAnnouncement.find(q).sort({ publishDate: -1 }).lean();
  }
  async getAnnouncement(id) {
    await DDDAnnouncement.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
    return DDDAnnouncement.findById(id).lean();
  }
  async createAnnouncement(data) {
    if (!data.announcementCode) data.announcementCode = `ANN-${Date.now()}`;
    return DDDAnnouncement.create(data);
  }
  async updateAnnouncement(id, data) { return this._update(DDDAnnouncement, id, data, { runValidators: true }); }
  async publishAnnouncement(id) {
    return DDDAnnouncement.findByIdAndUpdate(
      id,
      { status: 'published', publishDate: new Date() },
      { new: true }
    ).lean();
  }
  async archiveAnnouncement(id) {
    return DDDAnnouncement.findByIdAndUpdate(id, { status: 'archived' }, { new: true }).lean();
  }
  async pinAnnouncement(id) {
    return DDDAnnouncement.findByIdAndUpdate(
      id,
      { status: 'pinned', priority: 'pinned' },
      { new: true }
    ).lean();
  }

  /* ── Bulletins ── */
  async listBulletins(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDBulletinBoard.find(q).sort({ name: 1 }).lean();
  }
  async createBulletin(data) {
    if (!data.code) data.code = `BUL-${Date.now()}`;
    return DDDBulletinBoard.create(data);
  }
  async updateBulletin(id, data) { return this._update(DDDBulletinBoard, id, data, { runValidators: true }); }

  /* ── Categories ── */
  async listCategories() { return this._list(DDDAnnouncementCategory, { isActive: true }, { sort: { sortOrder: 1 } }); }
  async createCategory(data) { return this._create(DDDAnnouncementCategory, data); }

  /* ── Reactions ── */
  async addReaction(data) {
    const reaction = await DDDAnnouncementReaction.findOneAndUpdate(
      { announcementId: data.announcementId, userId: data.userId },
      data,
      { new: true, upsert: true }
    ).lean();
    if (data.type === 'acknowledged') {
      await DDDAnnouncement.findByIdAndUpdate(data.announcementId, {
        $inc: { acknowledgedCount: 1 },
      });
    }
    return reaction;
  }
  async listReactions(announcementId) {
    return DDDAnnouncementReaction.find({ announcementId }).lean();
  }

  /* ── Analytics ── */
  async getAnnouncementAnalytics() {
    const [announcements, bulletins, categories, reactions] = await Promise.all([
      DDDAnnouncement.countDocuments(),
      DDDBulletinBoard.countDocuments(),
      DDDAnnouncementCategory.countDocuments(),
      DDDAnnouncementReaction.countDocuments(),
    ]);
    const published = await DDDAnnouncement.countDocuments({ status: 'published' });
    const pinned = await DDDAnnouncement.countDocuments({ status: 'pinned' });
    return { announcements, published, pinned, bulletins, categories, reactions };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new AnnouncementManager();
