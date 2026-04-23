'use strict';

/**
 * notificationRouter.service.js — Phase 15 Commit 1 (4.0.64).
 *
 * Subscribes to the QualityEventBus and dispatches matched
 * events through registered channels (email, console, …). Every
 * dispatch (sent / failed / skipped / deduplicated) is recorded
 * in `NotificationLog` for audit + ops visibility.
 *
 * Responsibilities, in order:
 *
 *   1. Resolve policies that match the event name from the
 *      `notification-policies.registry`.
 *   2. For each policy, resolve recipients — combine:
 *        • org-role lookup (via `resolveRoleRecipients` DI)
 *        • explicit `users` list in the policy
 *        • `fallbackFromPayload` field (e.g. ownerUserId)
 *   3. Apply `outcomeFilter` if the policy has one.
 *   4. Render subject+body via templates.
 *   5. For each (policy, recipient, channel), dedup against
 *      `NotificationLog` within `dedupWindowMs`, dispatch via
 *      the channel, record the result.
 *
 * The router is designed to be:
 *
 *   • Non-blocking — fires on bus.on() but doesn't block the
 *     emitter (listeners complete async, logged via bus.flush).
 *   • Resilient — a thrown channel never propagates to the bus.
 *   • Dedup-honest — `NotificationLog` is the source of truth;
 *     in-memory dedup layers would be wrong under multi-instance.
 */

const { resolvePolicies } = require('../../../config/notification-policies.registry');
const { render } = require('./templates');

const DEFAULT_CHANNELS = Object.freeze({
  console: {
    async send(message) {
      const logger = message._logger || console;
      (logger.info || console.log)(`[notify:console] ${message.subject}\n${message.body}`);
      return { success: true };
    },
  },
});

function createNotificationRouter({
  bus, // QualityEventBus (required)
  logModel, // NotificationLog Mongoose model (required)
  channels = {}, // additional channels override/extend DEFAULT_CHANNELS
  resolveRoleRecipients = async () => [], // async (role, branchId) => [{ userId, email, label }]
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!bus || typeof bus.on !== 'function') {
    throw new Error('notificationRouter: bus with .on() required');
  }
  if (!logModel) throw new Error('notificationRouter: logModel required');

  const allChannels = { ...DEFAULT_CHANNELS, ...channels };
  let _unsub = null;

  function eventKey(eventName, payload) {
    // Best-effort stable key for dedup. Uses common id fields from
    // Phase 13 events when available, falling back to the name.
    const p = payload || {};
    return (
      p.eventId ||
      p.reviewId ||
      p.evidenceId ||
      p.actionId ||
      p.capaId ||
      p.riskId ||
      p.controlId ||
      p.code ||
      p.ncrId ||
      eventName
    );
  }

  async function _resolveRecipients(policy, eventName, payload) {
    const recipients = [];
    const branchId = payload && payload.branchId ? payload.branchId : null;

    // 1. Explicit users list.
    for (const userId of policy.recipients?.users || []) {
      recipients.push({ userId, email: null, role: null, label: String(userId) });
    }

    // 2. Role-based lookup.
    for (const role of policy.recipients?.roles || []) {
      try {
        const rows = await resolveRoleRecipients(role, branchId);
        for (const r of rows || []) {
          recipients.push({
            userId: r.userId || null,
            email: r.email || null,
            role,
            label: r.label || r.email || String(r.userId || ''),
          });
        }
      } catch (err) {
        logger.warn(`[notify] role lookup failed for ${role}: ${err.message}`);
      }
    }

    // 3. Payload fallback (e.g. ownerUserId for an assigned action).
    if (policy.recipients?.fallbackFromPayload && recipients.length === 0) {
      const uid = payload && payload[policy.recipients.fallbackFromPayload];
      if (uid) {
        recipients.push({
          userId: uid,
          email: null,
          role: 'owner',
          label: String(uid),
        });
      }
    }

    // Dedupe by email||userId within the recipient list itself.
    const seen = new Set();
    return recipients.filter(r => {
      const key = (r.email || r.userId || r.label || '').toString();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function _shouldDedup(policyId, key, recipientKey, channel, windowMs) {
    if (!windowMs || windowMs <= 0) return false;
    try {
      const since = new Date(now().getTime() - windowMs);
      const existing = await logModel
        .findOne({
          policyId,
          eventKey: key,
          channel,
          'recipient.email': recipientKey || null,
          createdAt: { $gte: since },
          status: { $in: ['sent', 'pending'] },
        })
        .lean();
      return !!existing;
    } catch (err) {
      logger.warn(`[notify] dedup check failed: ${err.message}`);
      return false;
    }
  }

  async function _dispatchOne({ policy, eventName, key, recipient, channel, rendered, payload }) {
    const recipientKey = recipient.email || null;
    const duplicate = await _shouldDedup(
      policy.id,
      key,
      recipientKey,
      channel,
      policy.dedupWindowMs
    );
    if (duplicate) {
      await _record({
        eventName,
        key,
        policy,
        recipient,
        channel,
        rendered,
        payload,
        status: 'deduplicated',
      });
      return { status: 'deduplicated' };
    }

    const fn = allChannels[channel];
    if (!fn || typeof fn.send !== 'function') {
      await _record({
        eventName,
        key,
        policy,
        recipient,
        channel,
        rendered,
        payload,
        status: 'skipped',
        error: `no channel handler for "${channel}"`,
      });
      return { status: 'skipped' };
    }

    try {
      const result = await fn.send({
        to: recipient.email,
        userId: recipient.userId,
        subject: rendered.subject,
        body: rendered.body,
        html: rendered.body.replace(/\n/g, '<br/>'),
        priority: policy.priority,
        _logger: logger,
      });
      await _record({
        eventName,
        key,
        policy,
        recipient,
        channel,
        rendered,
        payload,
        status: result && result.success ? 'sent' : 'skipped',
        error: result && !result.success ? result.error || result.reason : null,
      });
      return { status: 'sent' };
    } catch (err) {
      await _record({
        eventName,
        key,
        policy,
        recipient,
        channel,
        rendered,
        payload,
        status: 'failed',
        error: err.message,
      });
      logger.warn(`[notify] channel ${channel} failed: ${err.message}`);
      return { status: 'failed', error: err.message };
    }
  }

  async function _record({
    eventName,
    key,
    policy,
    recipient,
    channel,
    rendered,
    payload,
    status,
    error,
  }) {
    try {
      await logModel.create({
        eventName,
        eventKey: key,
        policyId: policy.id,
        priority: policy.priority,
        recipient,
        channel,
        status,
        subject: rendered.subject,
        bodyPreview: (rendered.body || '').slice(0, 280),
        payloadSummary: payload && {
          // Strip nested mongoose docs; keep only scalar-ish summary.
          reviewNumber: payload.reviewNumber,
          code: payload.code,
          type: payload.type,
          severity: payload.severity,
          actionId: payload.actionId,
          controlId: payload.controlId,
          riskNumber: payload.riskNumber,
          incidentId: payload.incidentId,
          ncrId: payload.ncrId,
          daysLeft: payload.daysLeft,
          daysOverdue: payload.daysOverdue,
        },
        error: error || null,
        sentAt: status === 'sent' ? now() : null,
        branchId: payload && payload.branchId ? payload.branchId : null,
      });
    } catch (err) {
      // Log-only failure — we don't want a missing log row to cause
      // the caller to retry a successful send.
      logger.warn(`[notify] log record failed: ${err.message}`);
    }
  }

  /**
   * Handle one event. Exposed so tests can bypass the bus.
   */
  async function handleEvent(eventName, payload) {
    const policies = resolvePolicies(eventName);
    if (!policies.length) return { dispatched: 0 };

    const key = eventKey(eventName, payload);
    let total = 0;

    for (const policy of policies) {
      // Apply outcomeFilter if present (e.g. "only fail/partial control tests").
      if (policy.outcomeFilter) {
        const outcome = payload && payload.outcome;
        if (!policy.outcomeFilter.includes(outcome)) continue;
      }

      let rendered;
      try {
        rendered = render(policy.template, payload, eventName);
      } catch (err) {
        logger.warn(`[notify] template ${policy.template} failed: ${err.message}`);
        continue;
      }

      const recipients = await _resolveRecipients(policy, eventName, payload);

      // Console channel is a special case — it fires once per
      // policy (not per recipient) so the log stays readable.
      for (const channel of policy.channels) {
        if (channel === 'console') {
          await _dispatchOne({
            policy,
            eventName,
            key,
            recipient: { email: null, userId: null, label: 'console', role: null },
            channel,
            rendered,
            payload,
          });
          total++;
          continue;
        }
        for (const recipient of recipients) {
          await _dispatchOne({
            policy,
            eventName,
            key,
            recipient,
            channel,
            rendered,
            payload,
          });
          total++;
        }
      }
    }

    return { dispatched: total };
  }

  function start() {
    if (_unsub) return;
    _unsub = bus.on('*', async (payload, eventName) => {
      try {
        await handleEvent(eventName, payload);
      } catch (err) {
        logger.warn(`[notify] handler error: ${err.message}`);
      }
    });
    logger.info('[notify] router listening on all quality/compliance events');
  }

  function stop() {
    if (_unsub) {
      _unsub();
      _unsub = null;
    }
  }

  return { handleEvent, start, stop, _resolveRecipients };
}

// ── built-in email channel ────────────────────────────────────────

function buildEmailChannel() {
  let emailService;
  try {
    emailService = require('../../emailService');
  } catch {
    emailService = null;
  }

  return {
    async send({ to, subject, body, html }) {
      if (!to) return { success: false, reason: 'no_recipient_email' };
      if (!emailService) {
        return { success: false, reason: 'email_service_unavailable' };
      }
      const sender =
        typeof emailService === 'function'
          ? emailService
          : emailService.sendEmail || emailService.send;
      if (!sender) return { success: false, reason: 'email_sender_not_callable' };
      try {
        const res = await sender({ to, subject, body, html });
        return res || { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
  };
}

module.exports = {
  createNotificationRouter,
  buildEmailChannel,
};
