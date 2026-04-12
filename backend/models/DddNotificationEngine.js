'use strict';
/**
 * DddNotificationEngine — Mongoose Models & Constants
 * Auto-extracted from services/dddNotificationEngine.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

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

/* ═══════════════════ Schemas ═══════════════════ */

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


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  CHANNEL_TYPES,
  CHANNEL_STATUSES,
  DELIVERY_STATUSES,
  RULE_TRIGGERS,
  NOTIFICATION_CATEGORIES,
  ESCALATION_LEVELS,
  BUILTIN_CHANNELS,
  DDDNotificationChannel,
  DDDNotificationRule,
  DDDNotificationDelivery,
  DDDNotificationPreference,
};
