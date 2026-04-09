/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Announcement Manager — Phase 21 · Communication & Messaging
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Organisation-wide announcements, bulletin boards, news feeds, targeted
 * broadcasts, and internal communications management.
 *
 * Aggregates
 *   DDDAnnouncement         — org-wide announcement / news item
 *   DDDBulletinBoard        — thematic bulletin board container
 *   DDDAnnouncementCategory — category taxonomy for announcements
 *   DDDAnnouncementReaction — staff reactions & acknowledgements
 *
 * Canonical links
 *   authorId     → User / DDDStaffProfile
 *   departmentId → DDDDepartment (dddStaffManager)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Router } = require('express');

class BaseDomainModule {
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;
  }
  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const ANNOUNCEMENT_TYPES = [
  'news',
  'policy_update',
  'event',
  'training',
  'maintenance',
  'emergency',
  'recognition',
  'vacancy',
  'research',
  'compliance',
  'social',
  'general',
];

const ANNOUNCEMENT_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'published',
  'pinned',
  'archived',
  'expired',
  'recalled',
  'rejected',
  'scheduled',
];

const AUDIENCE_SCOPES = [
  'all_staff',
  'department',
  'role',
  'position_level',
  'building',
  'clinical_team',
  'specific_users',
  'patients',
  'families',
  'external',
];

const BULLETIN_TYPES = [
  'general',
  'clinical_updates',
  'policy',
  'training',
  'events',
  'recognition',
  'safety',
  'research',
  'community',
  'technology',
];

const REACTION_TYPES = [
  'acknowledged',
  'liked',
  'helpful',
  'important',
  'question',
  'disagree',
  'celebrate',
  'support',
];

const DISPLAY_PRIORITIES = ['low', 'normal', 'high', 'urgent', 'pinned', 'banner'];

/* ── Built-in categories ────────────────────────────────────────────────── */
const BUILTIN_CATEGORIES = [
  {
    code: 'CAT-NEWS',
    name: 'General News',
    nameAr: 'أخبار عامة',
    icon: 'newspaper',
    color: '#3B82F6',
  },
  {
    code: 'CAT-POLICY',
    name: 'Policy Updates',
    nameAr: 'تحديثات السياسات',
    icon: 'document',
    color: '#8B5CF6',
  },
  { code: 'CAT-EVENT', name: 'Events', nameAr: 'فعاليات', icon: 'calendar', color: '#10B981' },
  {
    code: 'CAT-TRAIN',
    name: 'Training & Development',
    nameAr: 'تدريب وتطوير',
    icon: 'academic-cap',
    color: '#F59E0B',
  },
  {
    code: 'CAT-SAFETY',
    name: 'Safety & Compliance',
    nameAr: 'السلامة والامتثال',
    icon: 'shield',
    color: '#EF4444',
  },
  { code: 'CAT-RECOG', name: 'Recognition', nameAr: 'تقدير', icon: 'star', color: '#F97316' },
  {
    code: 'CAT-MAINT',
    name: 'Facility Maintenance',
    nameAr: 'صيانة المرافق',
    icon: 'wrench',
    color: '#6B7280',
  },
  {
    code: 'CAT-RESEARCH',
    name: 'Research & Innovation',
    nameAr: 'بحث وابتكار',
    icon: 'beaker',
    color: '#06B6D4',
  },
  { code: 'CAT-HR', name: 'HR & Benefits', nameAr: 'موارد بشرية', icon: 'users', color: '#EC4899' },
  {
    code: 'CAT-IT',
    name: 'Technology Updates',
    nameAr: 'تحديثات تقنية',
    icon: 'computer',
    color: '#14B8A6',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Announcement ──────────────────────────────────────────────────────── */
const announcementSchema = new Schema(
  {
    announcementCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    type: { type: String, enum: ANNOUNCEMENT_TYPES, required: true },
    status: { type: String, enum: ANNOUNCEMENT_STATUSES, default: 'draft' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'DDDAnnouncementCategory' },
    bulletinId: { type: Schema.Types.ObjectId, ref: 'DDDBulletinBoard' },
    content: { type: String, required: true },
    contentAr: { type: String },
    summary: { type: String },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    audienceScope: { type: String, enum: AUDIENCE_SCOPES, default: 'all_staff' },
    targetDepartments: [{ type: Schema.Types.ObjectId }],
    targetRoles: [{ type: String }],
    targetUsers: [{ type: Schema.Types.ObjectId }],
    priority: { type: String, enum: DISPLAY_PRIORITIES, default: 'normal' },
    publishDate: { type: Date },
    expiryDate: { type: Date },
    attachments: [{ name: String, url: String, mimeType: String }],
    viewCount: { type: Number, default: 0 },
    acknowledgedCount: { type: Number, default: 0 },
    requiresAcknowledgement: { type: Boolean, default: false },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

announcementSchema.index({ status: 1, publishDate: -1 });
announcementSchema.index({ type: 1, status: 1 });
announcementSchema.index({ audienceScope: 1, status: 1 });

const DDDAnnouncement =
  mongoose.models.DDDAnnouncement || mongoose.model('DDDAnnouncement', announcementSchema);

/* ── Bulletin Board ────────────────────────────────────────────────────── */
const bulletinBoardSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: BULLETIN_TYPES, required: true },
    description: { type: String },
    departmentId: { type: Schema.Types.ObjectId },
    moderators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isPublic: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    postCount: { type: Number, default: 0 },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

bulletinBoardSchema.index({ type: 1, isActive: 1 });

const DDDBulletinBoard =
  mongoose.models.DDDBulletinBoard || mongoose.model('DDDBulletinBoard', bulletinBoardSchema);

/* ── Announcement Category ─────────────────────────────────────────────── */
const announcementCategorySchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    icon: { type: String },
    color: { type: String },
    parentId: { type: Schema.Types.ObjectId, ref: 'DDDAnnouncementCategory' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDAnnouncementCategory =
  mongoose.models.DDDAnnouncementCategory ||
  mongoose.model('DDDAnnouncementCategory', announcementCategorySchema);

/* ── Announcement Reaction ─────────────────────────────────────────────── */
const announcementReactionSchema = new Schema(
  {
    announcementId: { type: Schema.Types.ObjectId, ref: 'DDDAnnouncement', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: REACTION_TYPES, required: true },
    comment: { type: String },
    reactedAt: { type: Date, default: Date.now },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

announcementReactionSchema.index({ announcementId: 1, userId: 1 }, { unique: true });

const DDDAnnouncementReaction =
  mongoose.models.DDDAnnouncementReaction ||
  mongoose.model('DDDAnnouncementReaction', announcementReactionSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class AnnouncementManager extends BaseDomainModule {
  constructor() {
    super('AnnouncementManager', {
      description: 'Organisation announcements, bulletins & broadcasts',
      version: '1.0.0',
    });
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
  async updateAnnouncement(id, data) {
    return DDDAnnouncement.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async publishAnnouncement(id) {
    return DDDAnnouncement.findByIdAndUpdate(
      id,
      { status: 'published', publishDate: new Date() },
      { new: true }
    );
  }
  async archiveAnnouncement(id) {
    return DDDAnnouncement.findByIdAndUpdate(id, { status: 'archived' }, { new: true });
  }
  async pinAnnouncement(id) {
    return DDDAnnouncement.findByIdAndUpdate(
      id,
      { status: 'pinned', priority: 'pinned' },
      { new: true }
    );
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
  async updateBulletin(id, data) {
    return DDDBulletinBoard.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Categories ── */
  async listCategories() {
    return DDDAnnouncementCategory.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
  }
  async createCategory(data) {
    return DDDAnnouncementCategory.create(data);
  }

  /* ── Reactions ── */
  async addReaction(data) {
    const reaction = await DDDAnnouncementReaction.findOneAndUpdate(
      { announcementId: data.announcementId, userId: data.userId },
      data,
      { new: true, upsert: true }
    );
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

  async healthCheck() {
    const [announcements, bulletins, categories, reactions] = await Promise.all([
      DDDAnnouncement.countDocuments(),
      DDDBulletinBoard.countDocuments(),
      DDDAnnouncementCategory.countDocuments(),
      DDDAnnouncementReaction.countDocuments(),
    ]);
    return { status: 'healthy', announcements, bulletins, categories, reactions };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createAnnouncementManagerRouter() {
  const router = Router();
  const svc = new AnnouncementManager();

  /* Announcements */
  router.get('/announcements', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAnnouncements(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/announcements/:id', async (req, res) => {
    try {
      const d = await svc.getAnnouncement(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/announcements', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createAnnouncement(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/announcements/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateAnnouncement(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/announcements/:id/publish', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.publishAnnouncement(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/announcements/:id/archive', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.archiveAnnouncement(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/announcements/:id/pin', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.pinAnnouncement(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Reactions */
  router.post('/announcements/:id/reactions', async (req, res) => {
    try {
      res
        .status(201)
        .json({
          success: true,
          data: await svc.addReaction({ ...req.body, announcementId: req.params.id }),
        });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/announcements/:id/reactions', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listReactions(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Bulletins */
  router.get('/bulletins', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listBulletins(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/bulletins', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createBulletin(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/bulletins/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateBulletin(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Categories */
  router.get('/announcement-categories', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listCategories() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/announcement-categories', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCategory(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/announcements/analytics/summary', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getAnnouncementAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/announcements/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
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
  AnnouncementManager,
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
  createAnnouncementManagerRouter,
};
