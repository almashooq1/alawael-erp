'use strict';

/**
 * notify-channel-in-app.service.js — Wave 517 (in-app notification channel).
 *
 * First concrete channel implementation for the W516 notification bus.
 * Subscribes to `notification.measure_alert.reassigned.alert` (and is
 * trivially extendable to other notification events down the line) and
 * creates one `Notification` doc per recipient.
 *
 * Why in-app first
 *   - Zero external dependencies (no SMTP / Slack / FCM creds needed)
 *   - Works against the existing Notification model + the bell-icon
 *     UI surface in web-admin
 *   - Channel-agnostic recipients pattern proven now; email/SMS/push
 *     subscribers in future waves follow the same shape
 *
 * Idempotency
 *   Same-event re-fires (re-deliveries by the bus, replay after worker
 *   crash, etc.) MUST NOT create duplicate Notification docs. Each
 *   downstream payload carries `alertId` — we encode the dedupe key
 *   as `notificationId = 'reassign:' + alertId + ':' + recipientId`
 *   and rely on the Notification schema's `unique sparse` index on
 *   `notificationId` to drop duplicates atomically.
 *
 * Public surface:
 *   wireInAppNotificationChannel({ integrationBus, logger })
 *     returns { unsubscribe, ranSinceBoot, EVENT_PATTERN }
 */

const mongoose = require('mongoose');

const EVENT_PATTERN = 'notification.measure_alert.reassigned.alert';

function _modelOrNull(name, fallbackPath) {
  try {
    return mongoose.model(name);
  } catch {
    try {
      require(fallbackPath);
      return mongoose.model(name);
    } catch {
      return null;
    }
  }
}

// Per-recipient title + message helpers. We render in Arabic since the
// dashboard is Arabic-first; the message body carries the salient fields
// so the recipient knows what changed without opening the link.
function _renderForRecipient({ payload, recipientId, isFrom, isTo }) {
  const direction = isFrom
    ? 'تم نقل حالة من قائمتك'
    : isTo
      ? 'استلمت حالة جديدة'
      : 'إعادة تعيين حالة';
  const otherId = isFrom ? payload.toTherapistId : payload.fromTherapistId;
  const otherShort = otherId ? String(otherId).slice(-8) : 'غير محدد';
  const title = direction;
  const message =
    `${direction} (${otherShort}). ` +
    `النوع: ${payload.alertType || 'تنبيه قياس'}. ` +
    `الخطورة: ${payload.severity || 'متوسطة'}.` +
    (payload.reason ? ` السبب: ${payload.reason}.` : '');
  // Deep-link to the smart inbox where the moved item lives now.
  const link = '/smart-inbox';
  return { title, message, link };
}

/**
 * Build the per-recipient Notification document shape. Uses
 * `notificationId` dedupe key so retries don't duplicate.
 */
function _buildNotificationDoc({ payload, recipientId, isFrom, isTo }) {
  const { title, message, link } = _renderForRecipient({
    payload,
    recipientId,
    isFrom,
    isTo,
  });
  return {
    notificationId: `reassign:${String(payload.alertId)}:${String(recipientId)}`,
    recipientId,
    userId: recipientId,
    recipient: recipientId,
    title,
    message,
    body: message,
    type: 'alert',
    category: 'caseload_reassignment',
    priority: payload.severity === 'critical' ? 'critical' : 'medium',
    channel: 'in-app',
    link,
    actionUrl: link,
    metadata: {
      source: 'medical.measure_alert.reassigned',
      alertId: payload.alertId,
      beneficiaryId: payload.beneficiaryId,
      branchId: payload.branchId,
      fromTherapistId: payload.fromTherapistId,
      toTherapistId: payload.toTherapistId,
      actorId: payload.actorId,
      alertType: payload.alertType,
      severity: payload.severity,
      role: isFrom ? 'from' : isTo ? 'to' : 'other',
    },
    status: 'sent',
  };
}

/**
 * Create one Notification doc per recipient. Atomic dedupe via
 * `notificationId` partial-unique index in the schema — duplicate
 * `notificationId` values trigger E11000 which we silently swallow
 * (the document already exists, no-op is the correct outcome).
 */
async function _writeNotifications({ Notification, payload, logger }) {
  const recipients = Array.isArray(payload.recipients) ? payload.recipients : [];
  if (recipients.length === 0) return { created: 0, skipped: 0 };

  let created = 0;
  let skipped = 0;
  for (const recipientId of recipients) {
    if (!recipientId) continue;
    const isFrom = String(recipientId) === String(payload.fromTherapistId);
    const isTo = String(recipientId) === String(payload.toTherapistId);
    const doc = _buildNotificationDoc({ payload, recipientId, isFrom, isTo });
    try {
      await Notification.create(doc);
      created++;
    } catch (err) {
      // E11000 on notificationId = idempotent retry, drop silently.
      if (err && err.code === 11000) {
        skipped++;
        continue;
      }
      // Any other error: log + count as skipped (don't throw — must not
      // break the bus or block the other recipient's notification).
      logger.warn?.(
        `[notify-in-app] create failed for recipient=${recipientId}: ${err.message || err}`
      );
      skipped++;
    }
  }
  return { created, skipped };
}

function wireInAppNotificationChannel({ integrationBus, logger = console } = {}) {
  if (!integrationBus || typeof integrationBus.subscribe !== 'function') {
    throw new Error(
      'wireInAppNotificationChannel: integrationBus with .subscribe(pattern, handler) required'
    );
  }

  const stats = {
    received: 0,
    created: 0,
    skipped: 0,
    errored: 0,
    lastError: null,
  };

  const handler = async event => {
    stats.received++;
    const payload = event?.payload || event || {};
    const Notification = _modelOrNull('Notification', '../models/Notification');
    if (!Notification) {
      stats.skipped++;
      return;
    }
    if (!payload.alertId || !Array.isArray(payload.recipients)) {
      stats.skipped++;
      return;
    }
    try {
      const r = await _writeNotifications({ Notification, payload, logger });
      stats.created += r.created;
      stats.skipped += r.skipped;
    } catch (err) {
      stats.errored++;
      stats.lastError = err?.message || String(err);
      logger.error?.(`[notify-in-app] handler failed alert=${payload.alertId}: ${stats.lastError}`);
    }
  };

  const unsubscribe = integrationBus.subscribe(EVENT_PATTERN, handler);
  logger.info?.(`[notify-in-app] W517 wired — subscribing to '${EVENT_PATTERN}'`);

  return {
    unsubscribe: typeof unsubscribe === 'function' ? unsubscribe : () => {},
    ranSinceBoot: () => ({ ...stats }),
    EVENT_PATTERN,
  };
}

module.exports = {
  wireInAppNotificationChannel,
  // Exported for tests
  _renderForRecipient,
  _buildNotificationDoc,
  _writeNotifications,
  EVENT_PATTERN,
};
