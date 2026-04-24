'use strict';

/**
 * notificationDispatch.service.js — Phase 16 Commit 8 (4.0.73).
 *
 * Intelligent layer on top of the Phase-15 `notificationRouter`.
 * Answers "how and when to deliver" given a priority, a recipient,
 * and the recipient's preferences / availability.
 *
 * Four surfaces:
 *
 *   getOrDefaultPrefs(userId)
 *     — upsert a preferences doc; returns it.
 *
 *   updatePrefs(userId, patch, { actorId })
 *     — partial update with shallow merging of nested objects.
 *
 *   planDispatch({ priority, recipient, payload })
 *     — pure decision function. Returns
 *         { channels[], deferred, reason, digestBucket, planAt }
 *       Channels are ordered (primary first, fallbacks next).
 *       `deferred=true` means don't send now; honour reason.
 *
 *   sendWithFallback({ plan, content, channelAdapters })
 *     — dispatch loop; walks channels in order until one succeeds
 *       or all fail. Returns per-channel attempt records.
 *
 *   queueForDigest({ recipient, policyId, eventName, priority,
 *                    subject, body, payload })
 *     — write to the digest queue.
 *
 *   flushDigests({ now })
 *     — periodic sweeper: for every user whose preferred
 *       sendHour matches the current hour and has pending
 *       items, collect + bundle + emit a single digest email.
 *
 * Design invariants:
 *
 *   1. **Critical always sends.** BYPASS_PRIORITIES ignore quiet
 *      hours, DND, and digest.
 *
 *   2. **Plan is pure.** `planDispatch` depends only on its
 *      inputs + the registry — no DB reads from inside the pure
 *      path, callers preload prefs. Makes it trivially testable.
 *
 *   3. **Fallback is first-success.** The dispatch loop tries
 *      channels in order and stops at the first success. Only
 *      channel-level throws count as failure; partial delivery
 *      (email accepted but SMS rejected) doesn't retry.
 *
 *   4. **Digest is idempotent.** Flushing the same hour twice
 *      produces the same set of sent items; a second call finds
 *      them already `sent` and no-ops.
 */

const registry = require('../../config/notificationDispatch.registry');

class NotFoundError extends Error {
  constructor(msg) {
    super(msg);
    this.code = 'NOT_FOUND';
  }
}

function createNotificationDispatchService({
  preferencesModel,
  digestModel = null,
  dispatcher = null, // optional bus for emitting ops.notif.* events
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!preferencesModel) {
    throw new Error('notificationDispatch: preferencesModel required');
  }
  registry.validate();

  async function _emit(name, payload) {
    if (!dispatcher || typeof dispatcher.emit !== 'function') return;
    try {
      await dispatcher.emit(name, payload);
    } catch (err) {
      logger.warn(`[NotifDispatch] emit ${name} failed: ${err.message}`);
    }
  }

  // ── preferences ────────────────────────────────────────────────

  async function getOrDefaultPrefs(userId) {
    if (!userId) throw new Error('getOrDefaultPrefs: userId required');
    let doc = await preferencesModel.findOne({ userId });
    if (!doc) {
      doc = await preferencesModel.create({ userId });
    }
    return doc;
  }

  async function updatePrefs(userId, patch, { actorId = null } = {}) {
    if (!userId) throw new Error('updatePrefs: userId required');
    let doc = await preferencesModel.findOne({ userId });
    if (!doc) doc = await preferencesModel.create({ userId });
    if (patch && typeof patch === 'object') {
      for (const [k, v] of Object.entries(patch)) {
        if (k === '_id' || k === 'userId') continue;
        // shallow merge for nested preference groups
        if (
          ['quietHours', 'digest', 'channelPreferences'].includes(k) &&
          typeof v === 'object' &&
          v !== null
        ) {
          doc[k] = { ...(doc[k] || {}), ...v };
        } else {
          doc[k] = v;
        }
      }
    }
    if (actorId) doc.updatedBy = actorId;
    await doc.save();
    return doc;
  }

  // ── planDispatch (pure path) ──────────────────────────────────

  /**
   * Decide how to deliver.
   *
   * @param {object} args
   * @param {string} args.priority         — critical / high / normal / low
   * @param {object} args.prefs            — NotificationPreferences doc (or null)
   * @param {Date}   [args.referenceTime]  — defaults to now()
   * @returns {{ channels:string[], deferred:boolean, reason?:string,
   *            digestBucket:boolean, planAt:Date }}
   */
  function planDispatch({ priority = 'normal', prefs = null, referenceTime = null } = {}) {
    const at = referenceTime || now();
    const isBypass = registry.bypassesQuietHours(priority);

    // Start from the priority matrix.
    let channels = [...registry.channelsForPriority(priority)];

    // Apply user channel opt-ins.
    if (prefs) {
      channels = registry.filterEnabledChannels(channels, prefs);
    }

    // Critical always fires immediately on whatever channels remain.
    if (isBypass) {
      return {
        channels,
        deferred: channels.length === 0,
        reason: channels.length === 0 ? 'no_channel_available' : null,
        digestBucket: false,
        planAt: at,
      };
    }

    // Hard DND window?
    if (prefs && prefs.dndUntil && at < prefs.dndUntil) {
      return {
        channels: [],
        deferred: true,
        reason: 'dnd_active',
        digestBucket: false,
        planAt: at,
      };
    }

    // In a meeting / session? Same treatment — defer.
    if (
      prefs &&
      ((prefs.inMeetingUntil && at < prefs.inMeetingUntil) ||
        (prefs.inSessionUntil && at < prefs.inSessionUntil))
    ) {
      return {
        channels: [],
        deferred: true,
        reason: 'in_meeting',
        digestBucket: registry.isDigestEligible(priority),
        planAt: at,
      };
    }

    // Digest opt-in? Low + normal go to digest bucket.
    if (
      prefs &&
      prefs.digest &&
      prefs.digest.enabled &&
      registry.isDigestEligible(priority) &&
      (prefs.digest.includePriorities || ['low', 'normal']).includes(priority)
    ) {
      return {
        channels: [],
        deferred: true,
        reason: 'digest_queued',
        digestBucket: true,
        planAt: at,
      };
    }

    // Quiet hours check.
    const qh = prefs?.quietHours || registry.DEFAULT_QUIET_HOURS;
    const hour = _hourInZone(at, qh.timezone || 'Asia/Riyadh');
    if (registry.isInQuietHours(hour, qh)) {
      return {
        channels: [],
        deferred: true,
        reason: 'quiet_hours',
        digestBucket: registry.isDigestEligible(priority),
        planAt: at,
      };
    }

    if (channels.length === 0) {
      return {
        channels: [],
        deferred: true,
        reason: 'no_channel_available',
        digestBucket: false,
        planAt: at,
      };
    }

    return {
      channels,
      deferred: false,
      reason: null,
      digestBucket: false,
      planAt: at,
    };
  }

  // ── sendWithFallback ──────────────────────────────────────────

  /**
   * Walk the plan's channels in order; first success wins.
   *
   * @param {object} args
   * @param {object} args.plan             — output of planDispatch
   * @param {object} args.content          — { subject, body, metadata }
   * @param {object} args.channelAdapters  — { email: { send(message) }, ... }
   * @param {object} [args.recipient]      — { userId, email, phone, ... }
   *
   * @returns {{ success:boolean, chosenChannel:string|null, attempts:[...] }}
   */
  async function sendWithFallback({ plan, content, channelAdapters = {}, recipient = {} }) {
    const attempts = [];
    if (!plan || plan.deferred || !plan.channels || plan.channels.length === 0) {
      return { success: false, chosenChannel: null, attempts };
    }
    for (const channel of plan.channels) {
      const adapter = channelAdapters[channel];
      if (!adapter || typeof adapter.send !== 'function') {
        attempts.push({
          channel,
          success: false,
          error: 'no_adapter',
        });
        continue;
      }
      const message = {
        channel,
        recipient,
        subject: content.subject,
        body: content.body,
        metadata: content.metadata || {},
      };
      try {
        const res = await adapter.send(message);
        if (res && res.success) {
          attempts.push({ channel, success: true });
          await _emit('ops.notif.sent', {
            channel,
            userId: recipient.userId ? String(recipient.userId) : null,
            priority: plan.priority || null,
          });
          return { success: true, chosenChannel: channel, attempts };
        }
        attempts.push({
          channel,
          success: false,
          error: res?.error || 'send_returned_false',
        });
      } catch (err) {
        attempts.push({ channel, success: false, error: err.message });
      }
    }
    await _emit('ops.notif.all_channels_failed', {
      userId: recipient.userId ? String(recipient.userId) : null,
      attemptedChannels: plan.channels,
    });
    return { success: false, chosenChannel: null, attempts };
  }

  // ── digest queue ──────────────────────────────────────────────

  async function queueForDigest({
    recipient,
    policyId,
    eventName,
    priority,
    subject,
    body = null,
    payload = {},
  }) {
    if (!digestModel) return null;
    if (!recipient || !recipient.userId) return null;
    return digestModel.create({
      userId: recipient.userId,
      policyId,
      eventName,
      priority,
      subject,
      body,
      payload,
      status: 'pending',
      queuedAt: now(),
    });
  }

  /**
   * Sweep all users with pending items whose digest sendHour has
   * arrived. Idempotent — items that were already `sent` aren't
   * re-sent.
   *
   * @param {object} args
   * @param {object} args.channelAdapters — must include `email`
   */
  async function flushDigests({ channelAdapters = {} } = {}) {
    if (!digestModel) return { scanned: 0, sent: 0, errors: 0 };
    const email = channelAdapters.email;
    const report = { scanned: 0, sent: 0, errors: 0 };
    const nowDate = now();
    const nowHour = _hourInZone(nowDate, 'Asia/Riyadh');

    let pending = [];
    try {
      pending = await digestModel.find({ status: 'pending' });
    } catch (err) {
      logger.warn(`[NotifDispatch] digest fetch failed: ${err.message}`);
      return report;
    }

    // Group by userId.
    const byUser = new Map();
    for (const item of pending) {
      const key = String(item.userId);
      if (!byUser.has(key)) byUser.set(key, []);
      byUser.get(key).push(item);
    }

    for (const [userId, items] of byUser.entries()) {
      report.scanned += items.length;
      try {
        const prefs = await preferencesModel.findOne({ userId });
        if (!prefs || !prefs.digest?.enabled) continue;
        const sendHour = prefs.digest.sendHour ?? registry.DEFAULT_DIGEST_HOUR;
        if (nowHour !== sendHour) continue;

        // Idempotency: if lastDigestSentAt is today and within the
        // hour, skip — we already sent this bucket.
        if (prefs.lastDigestSentAt) {
          const last = new Date(prefs.lastDigestSentAt);
          if (
            last.getUTCFullYear() === nowDate.getUTCFullYear() &&
            last.getUTCMonth() === nowDate.getUTCMonth() &&
            last.getUTCDate() === nowDate.getUTCDate() &&
            _hourInZone(last, 'Asia/Riyadh') === sendHour
          ) {
            continue;
          }
        }

        const digestId = `DIG-${Date.now()}-${userId.slice(-6)}`;
        const subject = `Daily digest — ${items.length} notification${
          items.length === 1 ? '' : 's'
        }`;
        const body = items.map((i, idx) => `${idx + 1}. [${i.priority}] ${i.subject}`).join('\n');
        const recipient = {
          userId,
          email: prefs.channelPreferences?.email?.address || null,
        };

        let result = { success: false };
        if (email && typeof email.send === 'function') {
          try {
            result = await email.send({
              channel: 'email',
              recipient,
              subject,
              body,
              metadata: { digestId, itemCount: items.length },
            });
          } catch (err) {
            result = { success: false, error: err.message };
          }
        } else {
          // No adapter — mark as sent but without a dispatch
          result = { success: true, error: null };
        }

        if (result.success) {
          for (const item of items) {
            item.status = 'sent';
            item.sentAt = nowDate;
            item.sentDigestId = digestId;
            await item.save();
          }
          prefs.lastDigestSentAt = nowDate;
          await prefs.save();
          report.sent += items.length;
          await _emit('ops.notif.digest_sent', {
            userId,
            itemCount: items.length,
            digestId,
          });
        } else {
          report.errors++;
          logger.warn(`[NotifDispatch] digest send failed for user ${userId}: ${result.error}`);
        }
      } catch (err) {
        report.errors++;
        logger.warn(`[NotifDispatch] digest user ${userId} failed: ${err.message}`);
      }
    }
    return report;
  }

  // ── admin / telemetry ─────────────────────────────────────────

  async function listPendingDigest({ userId = null, limit = 500 } = {}) {
    if (!digestModel) return [];
    const filter = { status: 'pending' };
    if (userId) filter.userId = userId;
    return digestModel.find(filter).sort({ queuedAt: 1 }).limit(limit);
  }

  // ── internals ─────────────────────────────────────────────────

  function _hourInZone(date, timezone) {
    // Best-effort hour extraction. Node's Intl gives us the local
    // hour in the requested IANA zone without a heavy DST library.
    try {
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone || 'Asia/Riyadh',
        hour: '2-digit',
        hour12: false,
      });
      const parts = fmt.formatToParts(date);
      const hourPart = parts.find(p => p.type === 'hour');
      if (hourPart) {
        const h = Number(hourPart.value);
        if (!Number.isNaN(h)) return h === 24 ? 0 : h; // Intl may return "24"
      }
    } catch {
      /* fall through */
    }
    return date.getHours(); // fallback to local
  }

  return {
    getOrDefaultPrefs,
    updatePrefs,
    planDispatch,
    sendWithFallback,
    queueForDigest,
    flushDigests,
    listPendingDigest,
    // exposed for tests
    _hourInZone,
  };
}

module.exports = {
  createNotificationDispatchService,
  NotFoundError,
};
