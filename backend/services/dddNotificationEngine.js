/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Notification Engine — Phase 21 · Communication & Messaging
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Multi-channel notification delivery (SMS, email, push, in-app, WhatsApp),
 * notification rules, preferences, escalation, and delivery tracking.
 *
 * Aggregates
 *   DDDNotificationChannel     — configured delivery channel
 *   DDDNotificationRule        — trigger-based notification rules
 *   DDDNotificationDelivery    — delivery record per notification
 *   DDDNotificationPreference  — user notification preferences
 *
 * Canonical links
 *   recipientId  → User
 *   staffId      → DDDStaffProfile (dddStaffManager)
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

const CHANNEL_TYPES = [
  'email',
  'sms',
  'push_notification',
  'in_app',
  'whatsapp',
  'slack',
  'teams',
  'webhook',
  'voice_call',
  'fax',
  'pager',
  'telegram',
];

const CHANNEL_STATUSES = [
  'active',
  'inactive',
  'maintenance',
  'error',
  'rate_limited',
  'suspended',
  'testing',
  'deprecated',
];

const DELIVERY_STATUSES = [
  'queued',
  'sending',
  'sent',
  'delivered',
  'read',
  'failed',
  'bounced',
  'rejected',
  'expired',
  'retrying',
];

const RULE_TRIGGERS = [
  'appointment_created',
  'appointment_reminder',
  'session_completed',
  'assessment_due',
  'goal_achieved',
  'plan_updated',
  'billing_generated',
  'payment_received',
  'leave_approved',
  'shift_changed',
  'emergency_alert',
  'system_event',
];

const NOTIFICATION_CATEGORIES = [
  'clinical',
  'administrative',
  'billing',
  'scheduling',
  'system',
  'security',
  'compliance',
  'training',
  'hr',
  'facility',
  'emergency',
  'marketing',
];

const ESCALATION_LEVELS = [
  'none',
  'supervisor',
  'department_head',
  'director',
  'emergency_team',
  'admin',
];

/* ── Built-in channels ──────────────────────────────────────────────────── */
const BUILTIN_CHANNELS = [
  { code: 'CH-EMAIL', name: 'Email (SMTP)', type: 'email', provider: 'smtp', isDefault: true },
  { code: 'CH-SMS', name: 'SMS Gateway', type: 'sms', provider: 'twilio', isDefault: true },
  {
    code: 'CH-PUSH',
    name: 'Push Notifications',
    type: 'push_notification',
    provider: 'firebase',
    isDefault: true,
  },
  {
    code: 'CH-INAPP',
    name: 'In-App Notifications',
    type: 'in_app',
    provider: 'internal',
    isDefault: true,
  },
  {
    code: 'CH-WA',
    name: 'WhatsApp Business',
    type: 'whatsapp',
    provider: 'whatsapp_business',
    isDefault: false,
  },
  {
    code: 'CH-SLACK',
    name: 'Slack Integration',
    type: 'slack',
    provider: 'slack_api',
    isDefault: false,
  },
  {
    code: 'CH-TEAMS',
    name: 'Microsoft Teams',
    type: 'teams',
    provider: 'ms_graph',
    isDefault: false,
  },
  { code: 'CH-WEBHOOK', name: 'Webhook', type: 'webhook', provider: 'http', isDefault: false },
  {
    code: 'CH-VOICE',
    name: 'Voice Call',
    type: 'voice_call',
    provider: 'twilio_voice',
    isDefault: false,
  },
  {
    code: 'CH-TELEGRAM',
    name: 'Telegram Bot',
    type: 'telegram',
    provider: 'telegram_bot',
    isDefault: false,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Notification Channel ──────────────────────────────────────────────── */
const notificationChannelSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: CHANNEL_TYPES, required: true },
    status: { type: String, enum: CHANNEL_STATUSES, default: 'active' },
    provider: { type: String, required: true },
    config: { type: Map, of: Schema.Types.Mixed },
    isDefault: { type: Boolean, default: false },
    rateLimitPerMinute: { type: Number, default: 60 },
    retryAttempts: { type: Number, default: 3 },
    retryDelayMs: { type: Number, default: 5000 },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

notificationChannelSchema.index({ type: 1, status: 1 });

const DDDNotificationChannel =
  mongoose.models.DDDNotificationChannel ||
  mongoose.model('DDDNotificationChannel', notificationChannelSchema);

/* ── Notification Rule ─────────────────────────────────────────────────── */
const notificationRuleSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    trigger: { type: String, enum: RULE_TRIGGERS, required: true },
    category: { type: String, enum: NOTIFICATION_CATEGORIES, required: true },
    channels: [{ type: String, enum: CHANNEL_TYPES }],
    templateId: { type: Schema.Types.ObjectId },
    conditions: [{ field: String, operator: String, value: Schema.Types.Mixed }],
    recipients: {
      type: String,
      enum: ['patient', 'family', 'therapist', 'supervisor', 'department', 'all', 'custom'],
    },
    escalation: { type: String, enum: ESCALATION_LEVELS, default: 'none' },
    delayMinutes: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

notificationRuleSchema.index({ trigger: 1, isActive: 1 });

const DDDNotificationRule =
  mongoose.models.DDDNotificationRule ||
  mongoose.model('DDDNotificationRule', notificationRuleSchema);

/* ── Notification Delivery ─────────────────────────────────────────────── */
const notificationDeliverySchema = new Schema(
  {
    ruleId: { type: Schema.Types.ObjectId, ref: 'DDDNotificationRule' },
    channelId: { type: Schema.Types.ObjectId, ref: 'DDDNotificationChannel' },
    channelType: { type: String, enum: CHANNEL_TYPES, required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientAddress: { type: String },
    status: { type: String, enum: DELIVERY_STATUSES, default: 'queued' },
    category: { type: String, enum: NOTIFICATION_CATEGORIES },
    subject: { type: String },
    body: { type: String, required: true },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    readAt: { type: Date },
    failedAt: { type: Date },
    failureReason: { type: String },
    attempts: { type: Number, default: 0 },
    nextRetryAt: { type: Date },
    externalId: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

notificationDeliverySchema.index({ recipientId: 1, status: 1 });
notificationDeliverySchema.index({ status: 1, nextRetryAt: 1 });
notificationDeliverySchema.index({ channelType: 1, sentAt: -1 });

const DDDNotificationDelivery =
  mongoose.models.DDDNotificationDelivery ||
  mongoose.model('DDDNotificationDelivery', notificationDeliverySchema);

/* ── Notification Preference ───────────────────────────────────────────── */
const notificationPreferenceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, enum: NOTIFICATION_CATEGORIES, required: true },
    channels: [{ channelType: String, enabled: Boolean }],
    quietHoursStart: { type: String },
    quietHoursEnd: { type: String },
    frequency: {
      type: String,
      enum: ['immediate', 'hourly_digest', 'daily_digest', 'weekly_digest'],
    },
    isEnabled: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

notificationPreferenceSchema.index({ userId: 1, category: 1 }, { unique: true });

const DDDNotificationPreference =
  mongoose.models.DDDNotificationPreference ||
  mongoose.model('DDDNotificationPreference', notificationPreferenceSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class NotificationEngine extends BaseDomainModule {
  constructor() {
    super('NotificationEngine', {
      description: 'Multi-channel notification delivery & rules engine',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedChannels();
    this.log('Notification Engine initialised ✓');
    return true;
  }

  async _seedChannels() {
    for (const ch of BUILTIN_CHANNELS) {
      const exists = await DDDNotificationChannel.findOne({ code: ch.code }).lean();
      if (!exists) await DDDNotificationChannel.create({ ...ch, status: 'active' });
    }
  }

  /* ── Channels ── */
  async listChannels(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDNotificationChannel.find(q).sort({ code: 1 }).lean();
  }
  async createChannel(data) {
    return DDDNotificationChannel.create(data);
  }
  async updateChannel(id, data) {
    return DDDNotificationChannel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Rules ── */
  async listRules(filters = {}) {
    const q = {};
    if (filters.trigger) q.trigger = filters.trigger;
    if (filters.category) q.category = filters.category;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDNotificationRule.find(q).sort({ trigger: 1 }).lean();
  }
  async createRule(data) {
    if (!data.code) data.code = `RULE-${Date.now()}`;
    return DDDNotificationRule.create(data);
  }
  async updateRule(id, data) {
    return DDDNotificationRule.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async toggleRule(id, isActive) {
    return DDDNotificationRule.findByIdAndUpdate(id, { isActive }, { new: true });
  }

  /* ── Deliveries ── */
  async listDeliveries(filters = {}) {
    const q = {};
    if (filters.recipientId) q.recipientId = filters.recipientId;
    if (filters.status) q.status = filters.status;
    if (filters.channelType) q.channelType = filters.channelType;
    return DDDNotificationDelivery.find(q).sort({ createdAt: -1 }).limit(100).lean();
  }
  async send(data) {
    data.status = 'queued';
    return DDDNotificationDelivery.create(data);
  }
  async sendNotification(data) {
    return this.send(data);
  }
  async markDelivered(id) {
    return DDDNotificationDelivery.findByIdAndUpdate(
      id,
      { status: 'delivered', deliveredAt: new Date() },
      { new: true }
    );
  }
  async markFailed(id, reason) {
    return DDDNotificationDelivery.findByIdAndUpdate(
      id,
      { status: 'failed', failedAt: new Date(), failureReason: reason },
      { new: true }
    );
  }

  /* ── Preferences ── */
  async getPreferences(userId) {
    return DDDNotificationPreference.find({ userId }).lean();
  }
  async setPreference(data) {
    return DDDNotificationPreference.findOneAndUpdate(
      { userId: data.userId, category: data.category },
      data,
      { new: true, upsert: true }
    );
  }

  /* ── Analytics ── */
  async getNotificationAnalytics() {
    const [channels, rules, deliveries, preferences] = await Promise.all([
      DDDNotificationChannel.countDocuments(),
      DDDNotificationRule.countDocuments(),
      DDDNotificationDelivery.countDocuments(),
      DDDNotificationPreference.countDocuments(),
    ]);
    const pendingDeliveries = await DDDNotificationDelivery.countDocuments({
      status: { $in: ['queued', 'sending', 'retrying'] },
    });
    const failedDeliveries = await DDDNotificationDelivery.countDocuments({ status: 'failed' });
    return { channels, rules, deliveries, pendingDeliveries, failedDeliveries, preferences };
  }

  async healthCheck() {
    const [channels, rules, deliveries, preferences] = await Promise.all([
      DDDNotificationChannel.countDocuments(),
      DDDNotificationRule.countDocuments(),
      DDDNotificationDelivery.countDocuments(),
      DDDNotificationPreference.countDocuments(),
    ]);
    return { status: 'healthy', channels, rules, deliveries, preferences };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createNotificationEngineRouter() {
  const router = Router();
  const svc = new NotificationEngine();

  /* Channels */
  router.get('/notifications/channels', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listChannels(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/notifications/channels', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createChannel(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/notifications/channels/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateChannel(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Rules */
  router.get('/notifications/rules', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRules(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/notifications/rules', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRule(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/notifications/rules/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateRule(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/notifications/rules/:id/toggle', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.toggleRule(req.params.id, req.body.isActive) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Deliveries */
  router.get('/notifications/deliveries', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDeliveries(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/notifications/send', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.send(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Preferences */
  router.get('/notifications/preferences/:userId', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getPreferences(req.params.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/notifications/preferences', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.setPreference(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/notifications/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getNotificationAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/notifications/health', async (_req, res) => {
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
  NotificationEngine,
  DDDNotificationChannel,
  DDDNotificationRule,
  DDDNotificationDelivery,
  DDDNotificationPreference,
  CHANNEL_TYPES,
  CHANNEL_STATUSES,
  DELIVERY_STATUSES,
  RULE_TRIGGERS,
  NOTIFICATION_CATEGORIES,
  ESCALATION_LEVELS,
  BUILTIN_CHANNELS,
  createNotificationEngineRouter,
};
