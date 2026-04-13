/**
 * Consolidated Notification Service — خدمة الإشعارات الموحدة
 * ══════════════════════════════════════════════════════════════════════════
 * Single source of truth for all notification operations.
 * Replaces 13 fragmented files:
 *   notificationService, notifications.service, notificationCenter.service,
 *   notificationServer, notificationSystem, smartNotificationService,
 *   smartNotifications.service, unifiedNotification.service,
 *   unifiedNotificationManager, alertNotificationService, AlertService,
 *   notificationAnalyticsSystem, advancedMessagingAlertSystem
 *
 * Architecture:
 *   Core → Channels → Templates → Preferences → Rules → Analytics
 *
 * @module domains/notifications/services/notificationService
 * @version 3.0.0
 */

const mongoose = require('mongoose');
const logger = require('../../../utils/logger');

// ─── Lazy-load models to avoid circular deps ──────────────────────────────
let Notification, NotificationTemplate, NotificationPreference, AlertRule;

const getModels = () => {
  if (!Notification) {
    try {
      Notification = mongoose.model('Notification');
    } catch {
      Notification = require('../../../models/Notification');
    }
  }
  if (!NotificationTemplate) {
    try {
      NotificationTemplate = mongoose.model('NotificationTemplate');
    } catch {
      NotificationTemplate = null; // Optional model
    }
  }
  if (!NotificationPreference) {
    try {
      NotificationPreference = mongoose.model('NotificationPreference');
    } catch {
      NotificationPreference = null;
    }
  }
  if (!AlertRule) {
    try {
      AlertRule = mongoose.model('AlertRule');
    } catch {
      AlertRule = null;
    }
  }
  return { Notification, NotificationTemplate, NotificationPreference, AlertRule };
};

// ─── Channel Adapters (Strategy Pattern) ───────────────────────────────────

const channelAdapters = {
  async email(notification) {
    try {
      const emailService = require('../../../services/emailService');
      await emailService.sendEmail({
        to: notification.recipientEmail,
        subject: notification.title,
        html: notification.body,
      });
      return { success: true, channel: 'email' };
    } catch (err) {
      logger.error('[Notification] Email channel error:', err.message);
      return { success: false, channel: 'email', error: err.message };
    }
  },

  async sms(notification) {
    try {
      const smsService = require('../../../services/smsService');
      await smsService.send({
        to: notification.recipientPhone,
        message: notification.body,
      });
      return { success: true, channel: 'sms' };
    } catch (err) {
      logger.error('[Notification] SMS channel error:', err.message);
      return { success: false, channel: 'sms', error: err.message };
    }
  },

  async push(notification) {
    try {
      const pushService = require('../../../services/pushService');
      await pushService.send({
        userId: notification.recipientId,
        title: notification.title,
        body: notification.body,
        data: notification.metadata,
      });
      return { success: true, channel: 'push' };
    } catch (err) {
      logger.error('[Notification] Push channel error:', err.message);
      return { success: false, channel: 'push', error: err.message };
    }
  },

  async inApp(notification) {
    const { Notification: Model } = getModels();
    if (!Model)
      return { success: false, channel: 'inApp', error: 'Notification model not available' };
    try {
      const doc = await Model.create({
        recipient: notification.recipientId,
        sender: notification.senderId,
        title: notification.title,
        message: notification.body,
        type: notification.type || 'info',
        category: notification.category,
        priority: notification.priority || 'normal',
        metadata: notification.metadata,
        read: false,
      });
      return { success: true, channel: 'inApp', id: doc._id };
    } catch (err) {
      logger.error('[Notification] InApp channel error:', err.message);
      return { success: false, channel: 'inApp', error: err.message };
    }
  },

  async whatsapp(notification) {
    try {
      const waService = require('../../../services/whatsapp-integration.service');
      await waService.sendMessage({
        to: notification.recipientPhone,
        message: notification.body,
      });
      return { success: true, channel: 'whatsapp' };
    } catch (err) {
      logger.error('[Notification] WhatsApp channel error:', err.message);
      return { success: false, channel: 'whatsapp', error: err.message };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 1. CORE SEND — إرسال الإشعارات
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send a notification through one or more channels.
 * Respects user preferences and applies templates.
 *
 * @param {Object} opts
 * @param {string} opts.recipientId — User ID
 * @param {string} [opts.senderId] — Sender user ID
 * @param {string} opts.title — Notification title
 * @param {string} opts.body — Notification body
 * @param {string} [opts.type='info'] — info|warning|error|success|alert
 * @param {string} [opts.category] — Domain category
 * @param {string} [opts.priority='normal'] — low|normal|high|urgent
 * @param {string[]} [opts.channels=['inApp']] — Channels to use
 * @param {string} [opts.templateId] — Template ID for rendering
 * @param {Object} [opts.templateData] — Variables for template
 * @param {Object} [opts.metadata] — Extra metadata
 * @param {string} [opts.recipientEmail]
 * @param {string} [opts.recipientPhone]
 * @param {Date} [opts.scheduledAt] — Schedule for later
 * @returns {Promise<Object>} — Results per channel
 */
async function send(opts) {
  const {
    recipientId,
    senderId,
    title,
    body,
    type = 'info',
    category,
    priority = 'normal',
    channels = ['inApp'],
    templateId,
    templateData,
    metadata,
    recipientEmail,
    recipientPhone,
    scheduledAt,
  } = opts;

  // Apply template if specified
  let resolvedTitle = title;
  let resolvedBody = body;
  if (templateId) {
    const rendered = await renderTemplate(templateId, templateData || {});
    if (rendered) {
      resolvedTitle = rendered.title || title;
      resolvedBody = rendered.body || body;
    }
  }

  // Check user preferences
  const effectiveChannels = await filterByPreferences(recipientId, channels, category);

  // Schedule for later if needed
  if (scheduledAt && new Date(scheduledAt) > new Date()) {
    return scheduleNotification({
      ...opts,
      title: resolvedTitle,
      body: resolvedBody,
      channels: effectiveChannels,
    });
  }

  // Dispatch to each channel
  const notification = {
    recipientId,
    senderId,
    title: resolvedTitle,
    body: resolvedBody,
    type,
    category,
    priority,
    metadata,
    recipientEmail,
    recipientPhone,
  };

  const results = {};
  const promises = effectiveChannels.map(async channel => {
    const adapter = channelAdapters[channel];
    if (!adapter) {
      results[channel] = { success: false, error: `Unknown channel: ${channel}` };
      return;
    }
    results[channel] = await adapter(notification);
  });
  await Promise.allSettled(promises);

  logger.info(
    `[Notification] Sent to ${recipientId}: ${effectiveChannels.join(',')} — ${type}/${priority}`
  );
  return { success: true, channels: results };
}

/**
 * Send to multiple recipients
 */
async function sendBulk(recipientIds, opts) {
  const results = await Promise.allSettled(
    recipientIds.map(id => send({ ...opts, recipientId: id }))
  );
  return results.map((r, i) => ({
    recipientId: recipientIds[i],
    ...(r.value || { success: false, error: r.reason?.message }),
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. READ STATE — حالة القراءة
// ═══════════════════════════════════════════════════════════════════════════

async function markAsRead(notificationId, userId) {
  const { Notification: Model } = getModels();
  if (!Model) return null;
  return Model.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { read: true, readAt: new Date() },
    { new: true }
  );
}

async function markAllAsRead(userId) {
  const { Notification: Model } = getModels();
  if (!Model) return { modifiedCount: 0 };
  return Model.updateMany({ recipient: userId, read: false }, { read: true, readAt: new Date() });
}

async function getUnreadCount(userId) {
  const { Notification: Model } = getModels();
  if (!Model) return 0;
  return Model.countDocuments({ recipient: userId, read: false });
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. CRUD — العمليات الأساسية
// ═══════════════════════════════════════════════════════════════════════════

async function getNotifications(userId, { page = 1, limit = 20, type, category, read } = {}) {
  const { Notification: Model } = getModels();
  if (!Model) return { data: [], total: 0 };
  const filter = { recipient: userId };
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (read !== undefined) filter.read = read;

  const [data, total] = await Promise.all([
    Model.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Model.countDocuments(filter),
  ]);
  return { data, total, page, limit, pages: Math.ceil(total / limit) };
}

async function deleteNotification(notificationId, userId) {
  const { Notification: Model } = getModels();
  if (!Model) return null;
  return Model.findOneAndDelete({ _id: notificationId, recipient: userId });
}

async function deleteAllNotifications(userId) {
  const { Notification: Model } = getModels();
  if (!Model) return { deletedCount: 0 };
  return Model.deleteMany({ recipient: userId });
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. PREFERENCES — تفضيلات المستخدم
// ═══════════════════════════════════════════════════════════════════════════

async function getPreferences(userId) {
  const { NotificationPreference: Model } = getModels();
  if (!Model) return { channels: ['inApp', 'email'], quiet: { enabled: false } };
  const prefs = await Model.findOne({ userId }).lean();
  return prefs || { channels: ['inApp', 'email'], quiet: { enabled: false } };
}

async function updatePreferences(userId, preferences) {
  const { NotificationPreference: Model } = getModels();
  if (!Model) return preferences;
  return Model.findOneAndUpdate(
    { userId },
    { ...preferences, userId },
    { upsert: true, new: true }
  );
}

async function filterByPreferences(userId, requestedChannels, _category) {
  const prefs = await getPreferences(userId);
  if (!prefs?.channels?.length) return requestedChannels;

  // Respect quiet hours
  if (prefs.quiet?.enabled) {
    const now = new Date();
    const hour = now.getHours();
    const start = parseInt(prefs.quiet.startHour || 22, 10);
    const end = parseInt(prefs.quiet.endHour || 7, 10);
    if (
      (start > end && (hour >= start || hour < end)) ||
      (start <= end && hour >= start && hour < end)
    ) {
      // During quiet hours, only inApp
      return requestedChannels.filter(c => c === 'inApp');
    }
  }

  return requestedChannels.filter(c => prefs.channels.includes(c));
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. TEMPLATES — قوالب الإشعارات
// ═══════════════════════════════════════════════════════════════════════════

async function renderTemplate(templateId, data) {
  const { NotificationTemplate: Model } = getModels();
  if (!Model) return null;
  const template = await Model.findById(templateId).lean();
  if (!template) return null;

  let title = template.titleTemplate || '';
  let body = template.bodyTemplate || '';

  for (const [key, val] of Object.entries(data)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    title = title.replace(placeholder, String(val));
    body = body.replace(placeholder, String(val));
  }
  return { title, body };
}

async function getTemplates({ category, language } = {}) {
  const { NotificationTemplate: Model } = getModels();
  if (!Model) return [];
  const filter = {};
  if (category) filter.category = category;
  if (language) filter.language = language;
  return Model.find(filter).lean();
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. SCHEDULING — جدولة الإشعارات
// ═══════════════════════════════════════════════════════════════════════════

async function scheduleNotification(opts) {
  const { Notification: Model } = getModels();
  if (!Model) return null;
  return Model.create({
    recipient: opts.recipientId,
    sender: opts.senderId,
    title: opts.title,
    message: opts.body,
    type: opts.type || 'info',
    category: opts.category,
    priority: opts.priority || 'normal',
    channels: opts.channels,
    metadata: opts.metadata,
    scheduledAt: opts.scheduledAt,
    status: 'scheduled',
    read: false,
  });
}

async function processScheduled() {
  const { Notification: Model } = getModels();
  if (!Model) return 0;
  const due = await Model.find({
    status: 'scheduled',
    scheduledAt: { $lte: new Date() },
  });
  let processed = 0;
  for (const n of due) {
    await send({
      recipientId: n.recipient,
      senderId: n.sender,
      title: n.title,
      body: n.message,
      type: n.type,
      category: n.category,
      priority: n.priority,
      channels: n.channels || ['inApp'],
      metadata: n.metadata,
    });
    await Model.findByIdAndUpdate(n._id, { status: 'sent' });
    processed++;
  }
  return processed;
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. ANALYTICS — تحليلات الإشعارات
// ═══════════════════════════════════════════════════════════════════════════

async function getStats({ startDate, endDate, type, channel } = {}) {
  const { Notification: Model } = getModels();
  if (!Model) return {};
  const match = {};
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  if (type) match.type = type;

  const [byType, byChannel, readRate] = await Promise.all([
    Model.aggregate([{ $match: match }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
    Model.aggregate([{ $match: match }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
    Model.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          read: { $sum: { $cond: ['$read', 1, 0] } },
        },
      },
    ]),
  ]);

  return {
    byType: byType.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
    byCategory: byChannel.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
    readRate: readRate[0] ? ((readRate[0].read / readRate[0].total) * 100).toFixed(1) : 0,
    total: readRate[0]?.total || 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. ALERT RULES — قواعد التنبيه
// ═══════════════════════════════════════════════════════════════════════════

async function createAlertRule(rule) {
  const { AlertRule: Model } = getModels();
  if (!Model) return rule;
  return Model.create(rule);
}

async function evaluateAlertRules(event) {
  const { AlertRule: Model } = getModels();
  if (!Model) return [];
  const rules = await Model.find({ enabled: true, eventType: event.type }).lean();
  const triggered = [];
  for (const rule of rules) {
    if (matchesConditions(rule.conditions, event)) {
      await send({
        recipientId: rule.recipientId,
        title: rule.alertTitle || `Alert: ${event.type}`,
        body: rule.alertBody || JSON.stringify(event.data),
        type: 'alert',
        priority: rule.priority || 'high',
        channels: rule.channels || ['inApp', 'email'],
        metadata: { ruleId: rule._id, event },
      });
      triggered.push(rule._id);
    }
  }
  return triggered;
}

function matchesConditions(conditions, event) {
  if (!conditions || !Array.isArray(conditions)) return true;
  return conditions.every(c => {
    const val = event.data?.[c.field];
    switch (c.operator) {
      case 'eq':
        return val === c.value;
      case 'gt':
        return val > c.value;
      case 'lt':
        return val < c.value;
      case 'gte':
        return val >= c.value;
      case 'lte':
        return val <= c.value;
      case 'contains':
        return String(val).includes(c.value);
      case 'in':
        return Array.isArray(c.value) ? c.value.includes(val) : false;
      default:
        return true;
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Core
  send,
  sendBulk,
  // Aliases for backward compatibility
  sendNotification: send,
  sendBulkNotification: sendBulk,

  // Read state
  markAsRead,
  markAllAsRead,
  getUnreadCount,

  // CRUD
  getNotifications,
  getUserNotifications: getNotifications,
  deleteNotification,
  deleteAllNotifications,

  // Preferences
  getPreferences,
  updatePreferences,

  // Templates
  renderTemplate,
  getTemplates,

  // Scheduling
  scheduleNotification,
  processScheduled,

  // Analytics
  getStats,
  getNotificationStats: getStats,

  // Alert rules
  createAlertRule,
  evaluateAlertRules,

  // Channel adapters (for extension)
  channelAdapters,
};
