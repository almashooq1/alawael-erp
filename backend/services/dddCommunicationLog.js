/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Communication Log — Phase 21 · Communication & Messaging
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Communication audit trail, delivery tracking across all channels,
 * compliance logging, reporting, and analytics for all outbound/inbound
 * communications.
 *
 * Aggregates
 *   DDDCommunicationEntry   — logged communication record
 *   DDDDeliveryTracking     — per-recipient delivery status
 *   DDDCommChannel          — registered communication channel
 *   DDDCommunicationReport  — aggregated communication report
 *
 * Canonical links
 *   senderId     → User
 *   recipientId  → User / DDDStaffProfile / Beneficiary
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

class CommunicationLog extends BaseDomainModule {
  constructor() {
    super('CommunicationLog', {
      description: 'Communication audit trail, delivery tracking & reporting',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedChannels();
    this.log('Communication Log initialised ✓');
    return true;
  }

  async _seedChannels() {
    for (const ch of BUILTIN_COMM_CHANNELS) {
      const exists = await DDDCommChannel.findOne({ code: ch.code }).lean();
      if (!exists) await DDDCommChannel.create(ch);
    }
  }

  /* ── Entries ── */
  async listEntries(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.method) q.method = filters.method;
    if (filters.direction) q.direction = filters.direction;
    if (filters.recipientId) q.recipientId = filters.recipientId;
    return DDDCommunicationEntry.find(q).sort({ createdAt: -1 }).limit(100).lean();
  }
  async getEntry(id) {
    return DDDCommunicationEntry.findById(id).lean();
  }
  async logEntry(data) {
    if (!data.entryCode) data.entryCode = `COM-${Date.now()}`;
    return DDDCommunicationEntry.create(data);
  }
  async updateEntryStatus(id, status, extra = {}) {
    return DDDCommunicationEntry.findByIdAndUpdate(id, { status, ...extra }, { new: true });
  }

  /* ── Delivery Tracking ── */
  async listTracking(entryId) {
    return DDDDeliveryTracking.find({ entryId }).lean();
  }
  async addTracking(data) {
    return DDDDeliveryTracking.create(data);
  }
  async updateTracking(id, data) {
    return DDDDeliveryTracking.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Channels ── */
  async listChannels(filters = {}) {
    const q = {};
    if (filters.method) q.method = filters.method;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDCommChannel.find(q).sort({ code: 1 }).lean();
  }
  async createChannel(data) {
    return DDDCommChannel.create(data);
  }
  async updateChannel(id, data) {
    return DDDCommChannel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Reports ── */
  async listReports(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    return DDDCommunicationReport.find(q).sort({ periodStart: -1 }).lean();
  }
  async generateReport(data) {
    if (!data.reportCode) data.reportCode = `RPT-${Date.now()}`;
    return DDDCommunicationReport.create(data);
  }

  /* ── Analytics ── */
  async getCommunicationAnalytics() {
    const [entries, tracking, channels, reports] = await Promise.all([
      DDDCommunicationEntry.countDocuments(),
      DDDDeliveryTracking.countDocuments(),
      DDDCommChannel.countDocuments(),
      DDDCommunicationReport.countDocuments(),
    ]);
    const failedEntries = await DDDCommunicationEntry.countDocuments({ status: 'failed' });
    const bouncedEntries = await DDDCommunicationEntry.countDocuments({ status: 'bounced' });
    return { entries, failedEntries, bouncedEntries, tracking, channels, reports };
  }

  async healthCheck() {
    const [entries, tracking, channels, reports] = await Promise.all([
      DDDCommunicationEntry.countDocuments(),
      DDDDeliveryTracking.countDocuments(),
      DDDCommChannel.countDocuments(),
      DDDCommunicationReport.countDocuments(),
    ]);
    return { status: 'healthy', entries, tracking, channels, reports };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createCommunicationLogRouter() {
  const router = Router();
  const svc = new CommunicationLog();

  /* Entries */
  router.get('/communication/entries', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEntries(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/communication/entries/:id', async (req, res) => {
    try {
      const d = await svc.getEntry(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/communication/entries', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.logEntry(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/communication/entries/:id/status', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.updateEntryStatus(req.params.id, req.body.status, req.body),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Tracking */
  router.get('/communication/tracking/:entryId', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTracking(req.params.entryId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/communication/tracking', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addTracking(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Channels */
  router.get('/communication/channels', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listChannels(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/communication/channels', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createChannel(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/communication/channels/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateChannel(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Reports */
  router.get('/communication/reports', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listReports(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/communication/reports', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.generateReport(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/communication/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getCommunicationAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/communication/health', async (_req, res) => {
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
  CommunicationLog,
  DDDCommunicationEntry,
  DDDDeliveryTracking,
  DDDCommChannel,
  DDDCommunicationReport,
  ENTRY_TYPES,
  ENTRY_STATUSES,
  DELIVERY_METHODS,
  TRACKING_STATUSES,
  REPORT_TYPES,
  COMPLIANCE_FLAGS,
  BUILTIN_COMM_CHANNELS,
  createCommunicationLogRouter,
};
