'use strict';
/**
 * DddAnnouncementManager — Mongoose Models & Constants
 * Auto-extracted from services/dddAnnouncementManager.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

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

/* ═══════════════════ Schemas ═══════════════════ */

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


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  ANNOUNCEMENT_TYPES,
  ANNOUNCEMENT_STATUSES,
  AUDIENCE_SCOPES,
  BULLETIN_TYPES,
  REACTION_TYPES,
  DISPLAY_PRIORITIES,
  BUILTIN_CATEGORIES,
  DDDAnnouncement,
  DDDBulletinBoard,
  DDDAnnouncementCategory,
  DDDAnnouncementReaction,
};
