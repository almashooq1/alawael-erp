'use strict';

/**
 * notify-channel-email.service.js — Wave 519 (email notification channel).
 *
 * Second concrete channel for the W516 notification surface. Subscribes
 * to `notification.measure_alert.reassigned.alert` and sends an email
 * to each recipient via the existing `services/email` manager.
 *
 * Pattern matches W517 in-app channel — same recipient fan-out, same
 * dedupe key encoding (key changed to `email-reassign:` namespace),
 * same fire-and-forget safety. Difference is the side-effect: email
 * delivery via emailManager.send() instead of Notification.create().
 *
 * Graceful degradation
 *   If `services/email` is not loadable (CI without SMTP), the channel
 *   logs once and becomes a structured no-op — receives events,
 *   increments `stats.skipped`, never throws. Same pattern used by
 *   integration/crossModuleSubscribers.js.
 *
 * Email dedupe
 *   The W517 in-app channel uses the Notification model's
 *   notificationId unique-sparse index. Email has no such persistent
 *   layer here, so dedupe is best-effort in-memory:
 *     - `_sentInWindow` Set with TTL pruning (~24h)
 *     - Re-fires within the window are silently skipped
 *   Production deployments wanting hard dedupe should attach a real
 *   queue (Redis SET + EXPIRE) before this subscriber. Current
 *   in-memory dedupe is enough to prevent duplicate sends from
 *   benign bus replay during a single worker lifetime.
 *
 * Public surface:
 *   wireEmailNotificationChannel({ integrationBus, logger,
 *                                  sendEmail?, getUserById? })
 *     returns { unsubscribe, ranSinceBoot, EVENT_PATTERN }
 *
 *   `sendEmail` and `getUserById` injectable for tests + alternate
 *   transport in-the-future. Defaults pull from services/email +
 *   models/User.
 */

const mongoose = require('mongoose');

const EVENT_PATTERN = 'notification.measure_alert.reassigned.alert';
const SOURCE_TAG = 'measure_alert_reassigned';

// In-memory dedupe window. Re-firing the same email within this window
// is a no-op. Keys are pruned lazily on insert if Set exceeds soft cap.
const DEFAULT_DEDUPE_WINDOW_MS = 24 * 3600 * 1000; // 24h
const DEDUPE_SOFT_CAP = 10_000;

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

function _loadDefaultSendEmail() {
  try {
    const email = require('./email');
    return typeof email.sendEmail === 'function' ? email.sendEmail : null;
  } catch {
    return null;
  }
}

function _defaultGetUserById(userId) {
  const User = _modelOrNull('User', '../models/User');
  if (!User) return Promise.resolve(null);
  return User.findById(userId)
    .select('_id email firstName_ar lastName_ar firstName lastName')
    .lean();
}

function _renderEmail({ payload, recipient, isFrom, isTo }) {
  const direction = isFrom
    ? 'تم نقل حالة من قائمتك'
    : isTo
      ? 'استلمت حالة جديدة'
      : 'إعادة تعيين حالة قياس';
  const otherId = isFrom ? payload.toTherapistId : payload.fromTherapistId;
  const otherShort = otherId ? String(otherId).slice(-8) : '—';
  const subject = `[Alawael] ${direction} — ${payload.alertType || 'تنبيه قياس'}`;
  const recipientName =
    [recipient?.firstName_ar, recipient?.lastName_ar].filter(Boolean).join(' ').trim() ||
    [recipient?.firstName, recipient?.lastName].filter(Boolean).join(' ').trim() ||
    'الزميل/ة';
  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;">
      <p>مرحباً ${escapeHtml(recipientName)},</p>
      <p><strong>${escapeHtml(direction)}</strong></p>
      <ul>
        <li>المعالج الآخر: ${escapeHtml(otherShort)}</li>
        <li>نوع التنبيه: ${escapeHtml(payload.alertType || 'غير محدد')}</li>
        <li>الخطورة: ${escapeHtml(payload.severity || 'متوسطة')}</li>
        ${payload.reason ? `<li>السبب: ${escapeHtml(payload.reason)}</li>` : ''}
      </ul>
      <p>افتح صندوق العمل لمتابعة الحالة في النظام.</p>
    </div>
  `;
  return { subject, html };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _dedupeKey({ alertId, recipientId }) {
  return `${SOURCE_TAG}:${String(alertId)}:${String(recipientId)}`;
}

function _pruneIfFull(_sentInWindow, _expiry, nowMs) {
  if (_sentInWindow.size < DEDUPE_SOFT_CAP) return;
  for (const key of _sentInWindow) {
    const exp = _expiry.get(key);
    if (typeof exp === 'number' && exp < nowMs) {
      _sentInWindow.delete(key);
      _expiry.delete(key);
    }
  }
}

function wireEmailNotificationChannel({
  integrationBus,
  logger = console,
  sendEmail = null,
  getUserById = null,
  dedupeWindowMs = DEFAULT_DEDUPE_WINDOW_MS,
} = {}) {
  if (!integrationBus || typeof integrationBus.subscribe !== 'function') {
    throw new Error(
      'wireEmailNotificationChannel: integrationBus with .subscribe(pattern, handler) required'
    );
  }

  const send = typeof sendEmail === 'function' ? sendEmail : _loadDefaultSendEmail();
  const userLookup = typeof getUserById === 'function' ? getUserById : _defaultGetUserById;

  if (!send) {
    logger.warn?.(
      '[notify-email] W519 services/email not loadable — channel will receive events but skip sends (logged once)'
    );
  }

  const stats = {
    received: 0,
    sent: 0,
    skipped: 0,
    errored: 0,
    lastError: null,
  };

  // In-memory dedupe state.
  const _sentInWindow = new Set();
  const _expiry = new Map();

  const handler = async event => {
    stats.received++;
    const payload = event?.payload || event || {};
    if (!payload.alertId || !Array.isArray(payload.recipients) || payload.recipients.length === 0) {
      stats.skipped++;
      return;
    }
    if (!send) {
      // Channel intentionally degraded — surface the event in logs but
      // do not increment errored (this is correct behaviour, not failure).
      stats.skipped += payload.recipients.length;
      return;
    }

    const nowMs = Date.now();
    _pruneIfFull(_sentInWindow, _expiry, nowMs);

    for (const recipientId of payload.recipients) {
      if (!recipientId) continue;
      const key = _dedupeKey({ alertId: payload.alertId, recipientId });
      if (_sentInWindow.has(key)) {
        stats.skipped++;
        continue;
      }

      try {
        const recipient = await userLookup(recipientId);
        if (!recipient || !recipient.email) {
          // No email on file — log + skip. Operator can later wire SMS
          // channel or manual outreach.
          logger.warn?.(`[notify-email] recipient=${recipientId} has no email — skipping`);
          stats.skipped++;
          continue;
        }
        const isFrom = String(recipientId) === String(payload.fromTherapistId);
        const isTo = String(recipientId) === String(payload.toTherapistId);
        const { subject, html } = _renderEmail({ payload, recipient, isFrom, isTo });
        await send(recipient.email, subject, html, {
          category: 'caseload_reassignment',
          // Carry traceable metadata for downstream queue logging.
          headers: {
            'X-Alawael-Source': 'medical.measure_alert.reassigned',
            'X-Alawael-Alert-Id': String(payload.alertId),
            'X-Alawael-Recipient-Role': isFrom ? 'from' : isTo ? 'to' : 'other',
          },
        });
        stats.sent++;
        _sentInWindow.add(key);
        _expiry.set(key, nowMs + dedupeWindowMs);
      } catch (err) {
        stats.errored++;
        stats.lastError = err?.message || String(err);
        logger.error?.(
          `[notify-email] send failed alert=${payload.alertId} recipient=${recipientId}: ${stats.lastError}`
        );
      }
    }
  };

  const unsubscribe = integrationBus.subscribe(EVENT_PATTERN, handler);
  logger.info?.(`[notify-email] W519 wired — subscribing to '${EVENT_PATTERN}'`);

  return {
    unsubscribe: typeof unsubscribe === 'function' ? unsubscribe : () => {},
    ranSinceBoot: () => ({ ...stats }),
    EVENT_PATTERN,
    // Exposed for tests
    _internals: { _sentInWindow, _expiry },
  };
}

module.exports = {
  wireEmailNotificationChannel,
  // Exported for tests
  _renderEmail,
  _dedupeKey,
  escapeHtml,
  EVENT_PATTERN,
  DEFAULT_DEDUPE_WINDOW_MS,
};
