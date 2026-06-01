/**
 * WhatsAppConversation — نموذج محادثات واتساب
 * ═══════════════════════════════════════════════════════════════════════════
 * Stores each unique WhatsApp conversation thread between a family member
 * and the rehabilitation center, along with all AI-enriched message events.
 *
 * One document per phone number (conversation thread).
 * Messages are embedded sub-documents to keep read performance optimal.
 * Large conversations (>500 messages) should be archived via TTL + archive.
 *
 * @module models/WhatsAppConversation
 */

'use strict';

const mongoose = require('mongoose');

// ─── Message Sub-Schema ──────────────────────────────────────────────────────
const messageSchema = new mongoose.Schema(
  {
    direction: {
      type: String,
      enum: ['incoming', 'outgoing'],
      required: true,
    },
    type: {
      type: String,
      enum: [
        'text',
        'image',
        'document',
        'audio',
        'video',
        'location',
        'interactive',
        'template',
        'sticker',
      ],
      default: 'text',
    },
    text: { type: String, maxlength: 4096 },
    mediaType: String,
    mediaId: String, // Meta media object ID
    mediaUrl: String, // resolved download URL (after fetch)
    filename: String,
    location: {
      latitude: Number,
      longitude: Number,
      name: String,
    },

    // Provider tracking
    providerMessageId: { type: String, index: true },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'received'],
      default: 'pending',
    },
    statusUpdatedAt: Date,
    errorCode: String,

    // AI enrichment (incoming messages only)
    intent: {
      type: String,
      enum: [
        'session_inquiry',
        'progress_inquiry',
        'complaint',
        'homework_feedback',
        'absent_notification',
        'emergency',
        'positive_feedback',
        'document_request',
        'general_question',
      ],
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', 'urgent'],
    },
    confidence: { type: Number, min: 0, max: 1 },
    entities: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Reply metadata
    isAutoReply: { type: Boolean, default: false },
    isTemplate: { type: Boolean, default: false },
    templateName: String,
    repliedToMessageId: String, // threaded replies
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    timestamp: { type: Date, default: Date.now, index: true },
  },
  { _id: true }
);

// ─── AI Insight Sub-Schema ────────────────────────────────────────────────────
const insightSchema = new mongoose.Schema(
  {
    type: { type: String }, // 'weekly_summary', 'engagement_alert', 'complaint_trend'
    generatedAt: { type: Date, default: Date.now },
    summary: String,
    keyPoints: [String],
    actionItems: [String],
    engagementScore: Number,
    flags: [{ type: mongoose.Schema.Types.Mixed }],
    source: { type: String, enum: ['llm', 'rules', 'fallback'] },
  },
  { _id: false }
);

// ─── Main Schema ─────────────────────────────────────────────────────────────
const whatsappConversationSchema = new mongoose.Schema(
  {
    // Identification
    phone: { type: String, required: true, index: true }, // E.164 format
    senderName: String,
    businessPhoneId: String, // our WHATSAPP_PHONE_ID

    // Linked entities
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      index: true,
    },
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EpisodeOfCare',
    },
    familyMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyMember',
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },

    // Conversation state
    status: {
      type: String,
      enum: ['active', 'resolved', 'pending_review', 'escalated', 'archived'],
      default: 'active',
      index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    unreadCount: { type: Number, default: 0, min: 0 },

    // AI state
    lastIntent: String,
    lastSentiment: String,
    requiresHumanReview: { type: Boolean, default: false, index: true },
    // Why the bot handed this conversation to a human (set on escalation).
    // Surfaces in the staff pending-review queue so the reason is actionable
    // without re-deriving it from the message log.
    escalationReason: String,
    escalatedAt: Date,
    urgencyLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
      index: true,
    },
    autoReplyEnabled: { type: Boolean, default: true },

    // Timestamps
    lastMessageAt: { type: Date, index: true },
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolutionNote: String,

    // Embedded data
    messages: [messageSchema],
    latestInsight: insightSchema,

    // Soft delete
    isDeleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    collection: 'whatsapp_conversations',
  }
);

// ─── Compound indexes ─────────────────────────────────────────────────────────
whatsappConversationSchema.index({ phone: 1, beneficiaryId: 1 }, { unique: true, sparse: true });
whatsappConversationSchema.index({ requiresHumanReview: 1, status: 1, lastMessageAt: -1 });
whatsappConversationSchema.index({ urgencyLevel: 1, status: 1 });
whatsappConversationSchema.index({ organizationId: 1, lastMessageAt: -1 });
whatsappConversationSchema.index({ assignedTo: 1, status: 1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────────
whatsappConversationSchema.virtual('messageCount').get(function () {
  return this.messages?.length || 0;
});

whatsappConversationSchema.virtual('latestMessage').get(function () {
  if (!this.messages?.length) return null;
  return this.messages[this.messages.length - 1];
});

// ─── Statics ─────────────────────────────────────────────────────────────────
// Rank order for the pending-review queue. urgencyLevel is a string enum, so a
// plain Mongo `.sort({ urgencyLevel: 1 })` orders it LEXICALLY
// (critical, high, low, medium) — which wrongly ranks `low` above `medium` and
// `high`. Rank explicitly so the most urgent surfaces first, ties broken by
// most-recent activity. Pure + side-effect free so it is unit-testable.
const URGENCY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
function sortPendingReview(rows) {
  return (rows || []).slice().sort((a, b) => {
    const r = (URGENCY_RANK[a?.urgencyLevel] ?? 9) - (URGENCY_RANK[b?.urgencyLevel] ?? 9);
    if (r !== 0) return r;
    return new Date(b?.lastMessageAt || 0).getTime() - new Date(a?.lastMessageAt || 0).getTime();
  });
}

whatsappConversationSchema.statics.findByPhone = function (phone) {
  return this.findOne({ phone, isDeleted: false });
};

whatsappConversationSchema.statics.findPendingReview = function (orgId) {
  const q = { requiresHumanReview: true, status: { $ne: 'resolved' }, isDeleted: false };
  if (orgId) q.organizationId = orgId;
  return this.find(q)
    .populate('beneficiaryId', 'personalInfo.firstName personalInfo.lastName fileNumber')
    .populate('familyMemberId', 'firstName lastName relationship')
    .lean()
    .then(sortPendingReview);
};

whatsappConversationSchema.statics.getAnalytics = function (orgId, startDate, endDate) {
  const match = { isDeleted: false };
  if (orgId) match.organizationId = new mongoose.Types.ObjectId(orgId);
  if (startDate || endDate) {
    match.lastMessageAt = {};
    if (startDate) match.lastMessageAt.$gte = new Date(startDate);
    if (endDate) match.lastMessageAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalConversations: { $sum: 1 },
        totalMessages: { $sum: { $size: '$messages' } },
        avgUnread: { $avg: '$unreadCount' },
        criticalCount: { $sum: { $cond: [{ $eq: ['$urgencyLevel', 'critical'] }, 1, 0] } },
        resolvedCount: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        pendingReview: { $sum: { $cond: ['$requiresHumanReview', 1, 0] } },
        byIntent: { $push: '$lastIntent' },
        bySentiment: { $push: '$lastSentiment' },
      },
    },
  ]);
};

module.exports =
  mongoose.models.WhatsAppConversation ||
  mongoose.model('WhatsAppConversation', whatsappConversationSchema);

// Pure helper exported for unit tests (the queue sort logic must stay correct).
module.exports.sortPendingReview = sortPendingReview;
