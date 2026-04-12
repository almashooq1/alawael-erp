'use strict';
/**
 * NotificationEngine Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddNotificationEngine.js
 */

const {
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
} = require('../models/DddNotificationEngine');

const BaseCrudService = require('./base/BaseCrudService');

class NotificationEngine extends BaseCrudService {
  constructor() {
    super('NotificationEngine', {
      description: 'Multi-channel notification delivery & rules engine',
      version: '1.0.0',
    }, {
      notificationChannels: DDDNotificationChannel,
      notificationRules: DDDNotificationRule,
      notificationDeliverys: DDDNotificationDelivery,
      notificationPreferences: DDDNotificationPreference,
    })
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
  async createChannel(data) { return this._create(DDDNotificationChannel, data); }
  async updateChannel(id, data) { return this._update(DDDNotificationChannel, id, data, { runValidators: true }); }

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
  async updateRule(id, data) { return this._update(DDDNotificationRule, id, data, { runValidators: true }); }
  async toggleRule(id, isActive) {
    return DDDNotificationRule.findByIdAndUpdate(id, { isActive }, { new: true }).lean();
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
    ).lean();
  }
  async markFailed(id, reason) {
    return DDDNotificationDelivery.findByIdAndUpdate(
      id,
      { status: 'failed', failedAt: new Date(), failureReason: reason },
      { new: true }
    ).lean();
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
    ).lean();
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
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new NotificationEngine();
