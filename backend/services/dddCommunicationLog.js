'use strict';
/**
 * CommunicationLog Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddCommunicationLog.js
 */

const {
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
} = require('../models/DddCommunicationLog');

const BaseCrudService = require('./base/BaseCrudService');

class CommunicationLog extends BaseCrudService {
  constructor() {
    super('CommunicationLog', {
      description: 'Communication audit trail, delivery tracking & reporting',
      version: '1.0.0',
    }, {
      communicationEntrys: DDDCommunicationEntry,
      deliveryTrackings: DDDDeliveryTracking,
      commChannels: DDDCommChannel,
      communicationReports: DDDCommunicationReport,
    })
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
  async getEntry(id) { return this._getById(DDDCommunicationEntry, id); }
  async logEntry(data) {
    if (!data.entryCode) data.entryCode = `COM-${Date.now()}`;
    return DDDCommunicationEntry.create(data);
  }
  async updateEntryStatus(id, status, extra = {}) {
    return DDDCommunicationEntry.findByIdAndUpdate(id, { status, ...extra }, { new: true }).lean();
  }

  /* ── Delivery Tracking ── */
  async listTracking(entryId) {
    return DDDDeliveryTracking.find({ entryId }).lean();
  }
  async addTracking(data) { return this._create(DDDDeliveryTracking, data); }
  async updateTracking(id, data) { return this._update(DDDDeliveryTracking, id, data); }

  /* ── Channels ── */
  async listChannels(filters = {}) {
    const q = {};
    if (filters.method) q.method = filters.method;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDCommChannel.find(q).sort({ code: 1 }).lean();
  }
  async createChannel(data) { return this._create(DDDCommChannel, data); }
  async updateChannel(id, data) { return this._update(DDDCommChannel, id, data, { runValidators: true }); }

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
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new CommunicationLog();
