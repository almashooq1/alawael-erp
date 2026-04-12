'use strict';
/**
 * DddPatientCommunity — Mongoose Models & Constants
 * Auto-extracted from services/dddPatientCommunity.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const COMMUNITY_TYPES = [
  'peer_support',
  'condition_specific',
  'family_caregiver',
  'recovery_group',
  'wellness_circle',
  'mentorship',
  'therapy_alumni',
  'cultural',
  'age_group',
  'regional',
  'professional',
  'interest_based',
];

const COMMUNITY_STATUSES = [
  'active',
  'inactive',
  'pending_approval',
  'archived',
  'suspended',
  'private',
  'open',
  'invite_only',
  'moderated',
  'read_only',
];

const POST_TYPES = [
  'discussion',
  'question',
  'success_story',
  'resource_share',
  'event',
  'poll',
  'announcement',
  'journal_entry',
  'tip',
  'introduction',
  'milestone',
  'request_for_help',
];

const MODERATION_ACTIONS = [
  'approve',
  'reject',
  'flag',
  'remove',
  'warn',
  'mute',
  'ban',
  'unban',
  'pin',
  'lock',
];

const MEMBER_ROLES = [
  'member',
  'moderator',
  'admin',
  'facilitator',
  'mentor',
  'peer_leader',
  'guest',
  'observer',
  'clinician_advisor',
  'family_rep',
];

const ENGAGEMENT_LEVELS = [
  'lurker',
  'newcomer',
  'contributor',
  'active',
  'power_user',
  'community_leader',
  'ambassador',
  'champion',
  'veteran',
  'inactive',
];

const BUILTIN_COMMUNITY_TEMPLATES = [
  {
    code: 'STROKE_RECOVERY',
    name: 'Stroke Recovery Support',
    type: 'condition_specific',
    visibility: 'open',
  },
  {
    code: 'AUTISM_FAMILIES',
    name: 'Autism Family Network',
    type: 'family_caregiver',
    visibility: 'moderated',
  },
  {
    code: 'SPINAL_PEERS',
    name: 'Spinal Cord Injury Peers',
    type: 'peer_support',
    visibility: 'open',
  },
  { code: 'CP_PARENTS', name: 'CP Parents Circle', type: 'family_caregiver', visibility: 'open' },
  {
    code: 'TBI_SURVIVORS',
    name: 'TBI Survivors Network',
    type: 'recovery_group',
    visibility: 'moderated',
  },
  {
    code: 'CARDIAC_REHAB',
    name: 'Cardiac Rehab Alumni',
    type: 'therapy_alumni',
    visibility: 'open',
  },
  {
    code: 'MENTAL_WELL',
    name: 'Mental Wellness Circle',
    type: 'wellness_circle',
    visibility: 'private',
  },
  { code: 'YOUTH_CONNECT', name: 'Youth Connect', type: 'age_group', visibility: 'moderated' },
  {
    code: 'CAREGIVER_HUB',
    name: 'Caregiver Support Hub',
    type: 'family_caregiver',
    visibility: 'open',
  },
  {
    code: 'PAIN_MGMT',
    name: 'Pain Management Community',
    type: 'condition_specific',
    visibility: 'moderated',
  },
];

/* ═══════════════════ Schemas ═══════════════════ */

/* ═══════════════════ Schemas ═══════════════════ */

const communityGroupSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: COMMUNITY_TYPES, required: true },
    status: { type: String, enum: COMMUNITY_STATUSES, default: 'active' },
    description: { type: String },
    rules: [{ type: String }],
    tags: [{ type: String }],
    memberCount: { type: Number, default: 0 },
    maxMembers: { type: Number },
    coverImage: { type: String },
    facilitatorId: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
communityGroupSchema.index({ type: 1, status: 1 });
communityGroupSchema.index({ name: 'text', description: 'text' });

const communityPostSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'DDDCommunityGroup', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    postType: { type: String, enum: POST_TYPES, default: 'discussion' },
    title: { type: String },
    content: { type: String, required: true },
    attachments: [{ url: String, type: String, name: String }],
    likeCount: { type: Number, default: 0 },
    replyCount: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
    isAnonymous: { type: Boolean, default: false },
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'flagged'],
      default: 'approved',
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
communityPostSchema.index({ communityId: 1, createdAt: -1 });
communityPostSchema.index({ authorId: 1 });

const communityMemberSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'DDDCommunityGroup', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: MEMBER_ROLES, default: 'member' },
    engagement: { type: String, enum: ENGAGEMENT_LEVELS, default: 'newcomer' },
    joinedAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date },
    postCount: { type: Number, default: 0 },
    isMuted: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
communityMemberSchema.index({ communityId: 1, userId: 1 }, { unique: true });
communityMemberSchema.index({ role: 1 });

const moderationLogSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'DDDCommunityGroup', required: true },
    targetType: { type: String, enum: ['post', 'member', 'community'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, enum: MODERATION_ACTIONS, required: true },
    reason: { type: String, required: true },
    moderatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    details: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
moderationLogSchema.index({ communityId: 1, action: 1 });
moderationLogSchema.index({ targetId: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDCommunityGroup =
  mongoose.models.DDDCommunityGroup || mongoose.model('DDDCommunityGroup', communityGroupSchema);
const DDDCommunityPost =
  mongoose.models.DDDCommunityPost || mongoose.model('DDDCommunityPost', communityPostSchema);
const DDDCommunityMember =
  mongoose.models.DDDCommunityMember || mongoose.model('DDDCommunityMember', communityMemberSchema);
const DDDModerationLog =
  mongoose.models.DDDModerationLog || mongoose.model('DDDModerationLog', moderationLogSchema);

/* ═══════════════════ Domain Class ═══════════════════ */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  COMMUNITY_TYPES,
  COMMUNITY_STATUSES,
  POST_TYPES,
  MODERATION_ACTIONS,
  MEMBER_ROLES,
  ENGAGEMENT_LEVELS,
  BUILTIN_COMMUNITY_TEMPLATES,
  DDDCommunityGroup,
  DDDCommunityPost,
  DDDCommunityMember,
  DDDModerationLog,
};
