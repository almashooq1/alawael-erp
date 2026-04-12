'use strict';
/**
 * DddActivityFeed Model
 * Auto-extracted from services/dddActivityFeed.js
 */
const mongoose = require('mongoose');

const dddActivitySchema = new mongoose.Schema(
  {
    activityId: { type: String, required: true, unique: true },
    actor: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String,
      role: String,
    },
    verb: { type: String, required: true },
    verbAr: { type: String },
    object: {
      entityType: { type: String, required: true },
      entityId: { type: mongoose.Schema.Types.ObjectId },
      displayName: String,
      displayNameAr: String,
      url: String,
    },
    target: {
      entityType: String,
      entityId: { type: mongoose.Schema.Types.ObjectId },
      displayName: String,
    },
    domain: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'clinical',
        'administrative',
        'communication',
        'workflow',
        'system',
        'security',
        'quality',
        'research',
        'training',
        'collaboration',
      ],
      default: 'clinical',
    },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
    visibility: {
      type: String,
      enum: ['public', 'team', 'department', 'private', 'role-based'],
      default: 'team',
    },
    visibleTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    visibleToRoles: [String],
    isRead: { type: Map, of: Boolean },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

dddActivitySchema.index({ 'actor.userId': 1, createdAt: -1 });
dddActivitySchema.index({ domain: 1, createdAt: -1 });
dddActivitySchema.index({ 'object.entityType': 1, 'object.entityId': 1, createdAt: -1 });
dddActivitySchema.index({ category: 1, createdAt: -1 });
dddActivitySchema.index({ visibleTo: 1, createdAt: -1 });

const DDDActivity = mongoose.models.DDDActivity || mongoose.model('DDDActivity', dddActivitySchema);

const dddSubscriptionSchema = new mongoose.Schema(
  {
    subscriptionId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['entity', 'domain', 'category', 'user', 'role', 'keyword'],
      required: true,
    },
    target: {
      entityType: String,
      entityId: { type: mongoose.Schema.Types.ObjectId },
      domain: String,
      category: String,
      userId: { type: mongoose.Schema.Types.ObjectId },
      role: String,
      keyword: String,
    },
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
    },
    frequency: {
      type: String,
      enum: ['realtime', 'hourly', 'daily', 'weekly'],
      default: 'realtime',
    },
    isActive: { type: Boolean, default: true },
    mutedUntil: Date,
  },
  { timestamps: true }
);

dddSubscriptionSchema.index({ userId: 1, isActive: 1 });
dddSubscriptionSchema.index({ 'target.entityType': 1, 'target.entityId': 1 });
dddSubscriptionSchema.index({ 'target.domain': 1 });

const DDDSubscription =
  mongoose.models.DDDSubscription || mongoose.model('DDDSubscription', dddSubscriptionSchema);

const dddDigestSchema = new mongoose.Schema(
  {
    digestId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    period: { type: String, enum: ['hourly', 'daily', 'weekly'], required: true },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    activities: [{ type: String }],
    summary: {
      totalActivities: Number,
      byCategory: { type: Map, of: Number },
      byDomain: { type: Map, of: Number },
      highlights: [String],
    },
    sentAt: Date,
    channel: { type: String, enum: ['email', 'push', 'in-app'], default: 'email' },
  },
  { timestamps: true }
);

const DDDDigest = mongoose.models.DDDDigest || mongoose.model('DDDDigest', dddDigestSchema);

/* ═══════════════════════════════════════════════════════════════
   Activity Verb Definitions (≥20)
   ═══════════════════════════════════════════════════════════════ */

const ACTIVITY_VERBS = {
  created: { label: 'Created', labelAr: 'أنشأ', icon: 'add_circle', past: 'created' },
  updated: { label: 'Updated', labelAr: 'حدّث', icon: 'edit', past: 'updated' },
  deleted: { label: 'Deleted', labelAr: 'حذف', icon: 'delete', past: 'deleted' },
  completed: { label: 'Completed', labelAr: 'أكمل', icon: 'check_circle', past: 'completed' },
  assigned: { label: 'Assigned', labelAr: 'أسند', icon: 'person_add', past: 'assigned' },
  commented: { label: 'Commented', labelAr: 'علّق', icon: 'comment', past: 'commented on' },
  approved: { label: 'Approved', labelAr: 'وافق', icon: 'thumb_up', past: 'approved' },
  rejected: { label: 'Rejected', labelAr: 'رفض', icon: 'thumb_down', past: 'rejected' },
  scheduled: { label: 'Scheduled', labelAr: 'جدول', icon: 'event', past: 'scheduled' },
  started: { label: 'Started', labelAr: 'بدأ', icon: 'play_arrow', past: 'started' },
  paused: { label: 'Paused', labelAr: 'أوقف مؤقتاً', icon: 'pause', past: 'paused' },
  resumed: { label: 'Resumed', labelAr: 'استأنف', icon: 'play_arrow', past: 'resumed' },
  escalated: { label: 'Escalated', labelAr: 'صعّد', icon: 'arrow_upward', past: 'escalated' },
  transferred: { label: 'Transferred', labelAr: 'نقل', icon: 'swap_horiz', past: 'transferred' },
  discharged: { label: 'Discharged', labelAr: 'أخرج', icon: 'exit_to_app', past: 'discharged' },
  reviewed: { label: 'Reviewed', labelAr: 'راجع', icon: 'rate_review', past: 'reviewed' },
  signed: { label: 'Signed', labelAr: 'وقّع', icon: 'draw', past: 'signed' },
  shared: { label: 'Shared', labelAr: 'شارك', icon: 'share', past: 'shared' },
  mentioned: { label: 'Mentioned', labelAr: 'ذكر', icon: 'alternate_email', past: 'mentioned' },
  flagged: { label: 'Flagged', labelAr: 'وسم', icon: 'flag', past: 'flagged' },
  archived: { label: 'Archived', labelAr: 'أرشف', icon: 'archive', past: 'archived' },
  restored: { label: 'Restored', labelAr: 'استعاد', icon: 'restore', past: 'restored' },
};

/* ═══════════════════════════════════════════════════════════════
   Activity Categories
   ═══════════════════════════════════════════════════════════════ */

const ACTIVITY_CATEGORIES = {
  clinical: { label: 'Clinical', labelAr: 'سريري', color: '#2196f3' },
  administrative: { label: 'Administrative', labelAr: 'إداري', color: '#ff9800' },
  communication: { label: 'Communication', labelAr: 'تواصل', color: '#4caf50' },
  workflow: { label: 'Workflow', labelAr: 'سير عمل', color: '#9c27b0' },
  system: { label: 'System', labelAr: 'نظام', color: '#607d8b' },
  security: { label: 'Security', labelAr: 'أمن', color: '#f44336' },
  quality: { label: 'Quality', labelAr: 'جودة', color: '#00bcd4' },
  research: { label: 'Research', labelAr: 'بحث', color: '#795548' },
  training: { label: 'Training', labelAr: 'تدريب', color: '#e91e63' },
  collaboration: { label: 'Collaboration', labelAr: 'تعاون', color: '#3f51b5' },
};

/* ═══════════════════════════════════════════════════════════════
   Core Functions
   ═══════════════════════════════════════════════════════════════ */

async function publishActivity(data) {
  const activityId = `act-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  return DDDActivity.create({ ...data, activityId });
}

async function getFeed(userId, options = {}) {
  const { limit = 50, before, domain, category, includePublic = true } = options;

  const query = { $or: [{ visibleTo: userId }] };
  if (includePublic) query.$or.push({ visibility: 'public' });
  query.$or.push({ visibility: 'team' });

  if (before) query.createdAt = { $lt: new Date(before) };
  if (domain) query.domain = domain;
  if (category) query.category = category;

  return DDDActivity.find(query).sort({ createdAt: -1 }).limit(limit).lean();
}

async function getEntityTimeline(entityType, entityId, options = {}) {
  const query = { 'object.entityType': entityType, 'object.entityId': entityId };
  return DDDActivity.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .lean();
}

async function getDomainFeed(domain, options = {}) {
  const query = { domain };
  if (options.category) query.category = options.category;
  return DDDActivity.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .lean();
}

async function markActivityRead(activityId, userId) {
  return DDDActivity.findOneAndUpdate(
    { activityId },
    { $set: { [`isRead.${userId}`]: true } },
    { new: true }
  );
}

async function getUnreadCount(userId) {
  return DDDActivity.countDocuments({
    $or: [{ visibleTo: userId }, { visibility: 'public' }, { visibility: 'team' }],
    [`isRead.${userId}`]: { $ne: true },
  });
}

async function subscribe(userId, subscriptionData) {
  const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  return DDDSubscription.create({ ...subscriptionData, subscriptionId, userId });
}

async function unsubscribe(subscriptionId) {
  return DDDSubscription.findOneAndUpdate(
    { subscriptionId },
    { $set: { isActive: false } },
    { new: true }
  );
}

async function getUserSubscriptions(userId) {
  return DDDSubscription.find({ userId, isActive: true }).lean();
}

async function generateDigest(userId, period = 'daily') {
  const now = new Date();
  const periodMs = period === 'hourly' ? 3600000 : period === 'daily' ? 86400000 : 604800000;
  const from = new Date(now.getTime() - periodMs);

  const activities = await DDDActivity.find({
    $or: [{ visibleTo: userId }, { visibility: 'public' }, { visibility: 'team' }],
    createdAt: { $gte: from, $lte: now },
  })
    .sort({ createdAt: -1 })
    .lean();

  const byCategory = {};
  const byDomain = {};
  for (const act of activities) {
    byCategory[act.category] = (byCategory[act.category] || 0) + 1;
    byDomain[act.domain] = (byDomain[act.domain] || 0) + 1;
  }

  const highlights = activities
    .filter(a => a.priority === 'high' || a.priority === 'urgent')
    .slice(0, 5)
    .map(a => `${a.verb}: ${a.object?.displayName || a.object?.entityType}`);

  const digestId = `dig-${userId}-${period}-${Date.now()}`;
  return DDDDigest.create({
    digestId,
    userId,
    period,
    from,
    to: now,
    activities: activities.map(a => a.activityId),
    summary: {
      totalActivities: activities.length,
      byCategory,
      byDomain,
      highlights,
    },
  });
}

async function getActivityAnalytics(options = {}) {
  const { days = 30 } = options;
  const since = new Date(Date.now() - days * 86400000);

  const pipeline = [
    { $match: { createdAt: { $gte: since } } },
    {
      $facet: {
        byCategory: [
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        byDomain: [{ $group: { _id: '$domain', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        byVerb: [{ $group: { _id: '$verb', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        byDay: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        total: [{ $count: 'n' }],
      },
    },
  ];

  const [result] = await DDDActivity.aggregate(pipeline);
  return {
    total: result.total[0]?.n || 0,
    byCategory: result.byCategory,
    byDomain: result.byDomain,
    byVerb: result.byVerb,
    byDay: result.byDay,
    period: `${days} days`,
  };
}

async function getActivityFeedDashboard() {
  const [activityCount, subscriptionCount, digestCount] = await Promise.all([
    DDDActivity.countDocuments(),
    DDDSubscription.countDocuments({ isActive: true }),
    DDDDigest.countDocuments(),
  ]);

  return {
    service: 'ActivityFeed',
    activities: activityCount,
    subscriptions: subscriptionCount,
    digests: digestCount,
    verbs: Object.keys(ACTIVITY_VERBS).length,
    categories: Object.keys(ACTIVITY_CATEGORIES).length,
  };
}

/* ═══════════════════════════════════════════════════════════════
   Router
   ═══════════════════════════════════════════════════════════════ */

module.exports = {
  DDDActivity,
  DDDSubscription,
  DDDDigest,
};
