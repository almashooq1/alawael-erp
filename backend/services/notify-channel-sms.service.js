'use strict';

/**
 * notify-channel-sms.service.js — Wave 520 (SMS notification channel).
 *
 * Third concrete channel for the W516 notification surface. Subscribes
 * to `notification.measure_alert.reassigned.alert` and sends an SMS
 * to each recipient via the existing `services/smsService` stub.
 *
 * Pattern matches W519 email channel — same recipient fan-out, same
 * dedupe key concept (different namespace `sms-reassign`), same
 * fire-and-forget safety, same in-memory 24h window dedupe.
 *
 * Graceful degradation built in
 *   The default `services/smsService` is currently a stub that always
 *   returns `{success: false, skipped: true}`. This subscriber WILL
 *   call it on every event, counting the stub's `skipped` result as
 *   a graceful skip (NOT errored). When a real provider lands
 *   (Unifonic / Twilio / Saudi NIC SMS), zero changes needed here —
 *   the stub is replaced atomically by the smsService maintainer.
 *
 * SMS body constraints
 *   Single-segment Arabic SMS ≈ 70 chars; multi-segment up to 459.
 *   The renderer keeps bodies ≤ 140 chars (≈ 2 segments) so recipients
 *   on legacy networks don't drop concatenated parts.
 *
 * Public surface:
 *   wireSmsNotificationChannel({ integrationBus, logger, sendSMS?, getUserById? })
 *     returns { unsubscribe, ranSinceBoot, EVENT_PATTERN }
 */

const mongoose = require('mongoose');

const EVENT_PATTERN = 'notification.measure_alert.reassigned.alert';
const SOURCE_TAG = 'sms_measure_alert_reassigned';

const DEFAULT_DEDUPE_WINDOW_MS = 24 * 3600 * 1000;
const DEDUPE_SOFT_CAP = 10_000;
const SMS_BODY_MAX_CHARS = 140;

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

function _loadDefaultSendSMS() {
  try {
    // smsService exports a callable (and also `.send`); we use the
    // callable form `sendSMS(to, message)`.
    const fn = require('./smsService');
    return typeof fn === 'function' ? fn : typeof fn.send === 'function' ? fn.send : null;
  } catch {
    return null;
  }
}

function _defaultGetUserById(userId) {
  const User = _modelOrNull('User', '../models/User');
  if (!User) return Promise.resolve(null);
  return User.findById(userId)
    .select('_id phone firstName_ar lastName_ar firstName lastName')
    .lean();
}

function _renderSmsBody({ payload, isFrom, isTo }) {
  // Short Arabic message. Truncate to SMS_BODY_MAX_CHARS to stay within
  // 2 SMS segments. The recipient gets a deep-link prompt to open the
  // app for full context.
  const direction = isFrom
    ? 'نُقلت حالة من قائمتك'
    : isTo
      ? 'استلمت حالة جديدة'
      : 'إعادة تعيين حالة';
  const sev = payload.severity ? ` (${payload.severity})` : '';
  const msg = `[العوائل] ${direction}${sev}. افتح التطبيق لمتابعة.`;
  return msg.length > SMS_BODY_MAX_CHARS ? msg.slice(0, SMS_BODY_MAX_CHARS - 1) + '…' : msg;
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

function wireSmsNotificationChannel({
  integrationBus,
  logger = console,
  sendSMS = null,
  getUserById = null,
  dedupeWindowMs = DEFAULT_DEDUPE_WINDOW_MS,
} = {}) {
  if (!integrationBus || typeof integrationBus.subscribe !== 'function') {
    throw new Error(
      'wireSmsNotificationChannel: integrationBus with .subscribe(pattern, handler) required'
    );
  }

  const send = typeof sendSMS === 'function' ? sendSMS : _loadDefaultSendSMS();
  const userLookup = typeof getUserById === 'function' ? getUserById : _defaultGetUserById;

  const stats = {
    received: 0,
    sent: 0,
    skipped: 0,
    providerNotConfigured: 0,
    errored: 0,
    lastError: null,
  };

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
        if (!recipient || !recipient.phone) {
          logger.warn?.(`[notify-sms] recipient=${recipientId} has no phone — skipping`);
          stats.skipped++;
          continue;
        }
        const isFrom = String(recipientId) === String(payload.fromTherapistId);
        const isTo = String(recipientId) === String(payload.toTherapistId);
        const message = _renderSmsBody({ payload, isFrom, isTo });

        const result = await send(recipient.phone, message);
        // smsService stub returns {success: false, skipped: true, reason}.
        // When the real provider lands, it returns {success: true} or
        // throws. Treat skipped as a graceful no-op (NOT errored).
        if (result && result.skipped) {
          stats.providerNotConfigured++;
          // Still mark dedupe so the same alert/recipient doesn't get
          // logged a second time in the same window.
          _sentInWindow.add(key);
          _expiry.set(key, nowMs + dedupeWindowMs);
        } else if (result && result.success === false) {
          stats.errored++;
          stats.lastError = result.error || result.reason || 'sms send failed';
          logger.warn?.(
            `[notify-sms] send failed alert=${payload.alertId} recipient=${recipientId}: ${stats.lastError}`
          );
        } else {
          stats.sent++;
          _sentInWindow.add(key);
          _expiry.set(key, nowMs + dedupeWindowMs);
        }
      } catch (err) {
        stats.errored++;
        stats.lastError = err?.message || String(err);
        logger.error?.(
          `[notify-sms] threw for alert=${payload.alertId} recipient=${recipientId}: ${stats.lastError}`
        );
      }
    }
  };

  const unsubscribe = integrationBus.subscribe(EVENT_PATTERN, handler);
  logger.info?.(`[notify-sms] W520 wired — subscribing to '${EVENT_PATTERN}'`);

  return {
    unsubscribe: typeof unsubscribe === 'function' ? unsubscribe : () => {},
    ranSinceBoot: () => ({ ...stats }),
    EVENT_PATTERN,
    _internals: { _sentInWindow, _expiry },
  };
}

module.exports = {
  wireSmsNotificationChannel,
  // Exported for tests
  _renderSmsBody,
  _dedupeKey,
  EVENT_PATTERN,
  SMS_BODY_MAX_CHARS,
  DEFAULT_DEDUPE_WINDOW_MS,
};
