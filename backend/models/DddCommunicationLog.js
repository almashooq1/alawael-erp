'use strict';
/**
 * DddCommunicationLog — Mongoose Models & Constants
 * Auto-extracted from services/dddCommunicationLog.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const ENTRY_TYPES = [
  'email_sent',
  'email_received',
  'sms_sent',
  'sms_received',
  'call_outbound',
  'call_inbound',
  'voicemail',
  'fax_sent',
  'in_app_message',
  'push_sent',
  'whatsapp_sent',
  'letter_sent',
];

const ENTRY_STATUSES = [
  'initiated',
  'processing',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'failed',
  'spam',
  'unsubscribed',
];

const DELIVERY_METHODS = [
  'email',
  'sms',
  'push',
  'in_app',
  'whatsapp',
  'voice',
  'fax',
  'postal',
  'slack',
  'teams',
  'webhook',
  'telegram',
];

const TRACKING_STATUSES = [
  'pending',
  'queued',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'deferred',
  'dropped',
  'unsubscribed',
];

const REPORT_TYPES = [
  'daily_summary',
  'weekly_digest',
  'monthly_overview',
  'channel_performance',
  'delivery_rate',
  'engagement_metrics',
  'compliance_audit',
  'bounce_report',
  'unsubscribe_report',
  'cost_analysis',
];

const COMPLIANCE_FLAGS = [
  'hipaa_compliant',
  'consent_obtained',
  'opt_in_verified',
  'data_encrypted',
  'audit_logged',
  'retention_set',
  'pii_masked',
  'gdpr_compliant',
];

/* ── Built-in comm channels ─────────────────────────────────────────────── */
const BUILTIN_COMM_CHANNELS = [
  {
    code: 'COMM-EMAIL-PRI',
    name: 'Primary Email',
    method: 'email',
    direction: 'outbound',
    isActive: true,
  },
  {
    code: 'COMM-SMS-PRI',
    name: 'Primary SMS',
    method: 'sms',
    direction: 'outbound',
    isActive: true,
  },
  {
    code: 'COMM-PUSH-FCM',
    name: 'Firebase Push',
    method: 'push',
    direction: 'outbound',
    isActive: true,
  },
  {
    code: 'COMM-INAPP',
    name: 'In-App Messages',
    method: 'in_app',
    direction: 'both',
    isActive: true,
  },
  {
    code: 'COMM-WA-BIZ',
    name: 'WhatsApp Business',
    method: 'whatsapp',
    direction: 'both',
    isActive: true,
  },
  {
    code: 'COMM-VOICE-TWI',
    name: 'Twilio Voice',
    method: 'voice',
    direction: 'outbound',
    isActive: false,
  },
  { code: 'COMM-FAX', name: 'eFax Service', method: 'fax', direction: 'outbound', isActive: false },
  {
    code: 'COMM-SLACK',
    name: 'Slack Notifications',
    method: 'slack',
    direction: 'outbound',
    isActive: false,
  },
  {
    code: 'COMM-TEAMS',
    name: 'MS Teams Messages',
    method: 'teams',
    direction: 'outbound',
    isActive: false,
  },
  {
    code: 'COMM-WEBHOOK',
    name: 'Webhook Relay',
    method: 'webhook',
    direction: 'outbound',
    isActive: true,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Communication Entry ───────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const communicationEntrySchema = new Schema(
  {
    entryCode: { type: String, required: true, unique: true },
    type: { type: String, enum: ENTRY_TYPES, required: true },
    status: { type: String, enum: ENTRY_STATUSES, default: 'initiated' },
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    recipientId: { type: Schema.Types.ObjectId },
    recipientType: { type: String, enum: ['user', 'staff', 'beneficiary', 'family', 'external'] },
    recipientAddress: { type: String },
    method: { type: String, enum: DELIVERY_METHODS, required: true },
    subject: { type: String },
    body: { type: String },
    bodySummary: { type: String },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    channelId: { type: Schema.Types.ObjectId, ref: 'DDDCommChannel' },
    relatedEntityId: { type: Schema.Types.ObjectId },
    relatedEntityType: { type: String },
    complianceFlags: [{ type: String, enum: COMPLIANCE_FLAGS }],
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    openedAt: { type: Date },
    cost: { type: Number, default: 0 },
    externalId: { type: String },
    errorMessage: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

communicationEntrySchema.index({ recipientId: 1, type: 1 });
communicationEntrySchema.index({ status: 1, sentAt: -1 });
communicationEntrySchema.index({ method: 1, direction: 1 });

const DDDCommunicationEntry =
  mongoose.models.DDDCommunicationEntry ||
  mongoose.model('DDDCommunicationEntry', communicationEntrySchema);

/* ── Delivery Tracking ─────────────────────────────────────────────────── */
const deliveryTrackingSchema = new Schema(
  {
    entryId: { type: Schema.Types.ObjectId, ref: 'DDDCommunicationEntry', required: true },
    recipientAddress: { type: String, required: true },
    method: { type: String, enum: DELIVERY_METHODS, required: true },
    status: { type: String, enum: TRACKING_STATUSES, default: 'pending' },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date },
    deliveredAt: { type: Date },
    openedAt: { type: Date },
    clickedAt: { type: Date },
    bouncedAt: { type: Date },
    bounceReason: { type: String },
    userAgent: { type: String },
    ipAddress: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

deliveryTrackingSchema.index({ entryId: 1, status: 1 });
deliveryTrackingSchema.index({ status: 1, lastAttemptAt: -1 });

const DDDDeliveryTracking =
  mongoose.models.DDDDeliveryTracking ||
  mongoose.model('DDDDeliveryTracking', deliveryTrackingSchema);

/* ── Comm Channel ──────────────────────────────────────────────────────── */
const commChannelSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    method: { type: String, enum: DELIVERY_METHODS, required: true },
    direction: { type: String, enum: ['inbound', 'outbound', 'both'], default: 'outbound' },
    provider: { type: String },
    config: { type: Map, of: Schema.Types.Mixed },
    isActive: { type: Boolean, default: true },
    dailyLimit: { type: Number },
    monthlyBudget: { type: Number },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

commChannelSchema.index({ method: 1, isActive: 1 });

const DDDCommChannel =
  mongoose.models.DDDCommChannel || mongoose.model('DDDCommChannel', commChannelSchema);

/* ── Communication Report ──────────────────────────────────────────────── */
const communicationReportSchema = new Schema(
  {
    reportCode: { type: String, required: true, unique: true },
    type: { type: String, enum: REPORT_TYPES, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    totalSent: { type: Number, default: 0 },
    totalDelivered: { type: Number, default: 0 },
    totalOpened: { type: Number, default: 0 },
    totalFailed: { type: Number, default: 0 },
    totalBounced: { type: Number, default: 0 },
    deliveryRate: { type: Number, default: 0 },
    openRate: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    channelBreakdown: [{ method: String, sent: Number, delivered: Number, failed: Number }],
    generatedAt: { type: Date, default: Date.now },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

communicationReportSchema.index({ type: 1, periodStart: -1 });

const DDDCommunicationReport =
  mongoose.models.DDDCommunicationReport ||
  mongoose.model('DDDCommunicationReport', communicationReportSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  ENTRY_TYPES,
  ENTRY_STATUSES,
  DELIVERY_METHODS,
  TRACKING_STATUSES,
  REPORT_TYPES,
  COMPLIANCE_FLAGS,
  BUILTIN_COMM_CHANNELS,
  DDDCommunicationEntry,
  DDDDeliveryTracking,
  DDDCommChannel,
  DDDCommunicationReport,
};
