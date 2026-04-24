/**
 * alertNotificationDispatcher.service.js — bridges the dashboard
 * alert coordinator to `unifiedNotifier.notify()`.
 *
 * Phase 18 Commit 8.1.
 *
 * The coordinator hands the dispatcher a `{ decision, policy,
 * snapshot, scope }` on every fire or escalate. The dispatcher:
 *
 *   1. Looks up the escalation ladder step that matches
 *      `decision.escalationStep`.
 *   2. Resolves the step's roles into individual recipients via an
 *      injected `resolveRecipients(roles)` function.
 *   3. Builds a concise bilingual message from the policy + the
 *      snapshot (value, delta, classification).
 *   4. Fans out through `notifier.notify()` — one call per
 *      recipient. Per-recipient failures are logged + swallowed so
 *      one flaky channel never blocks the rest.
 *
 * The dispatcher is framework-agnostic. Operators wire the user
 * resolver + the notifier at `app.js` boot; tests inject fakes.
 *
 * Every send carries a `templateKey: `alert.${severity}.${policyId}``
 * and a `metadata: { correlationKey, escalationStep, kpiId }`
 * block so the `NotificationLog` collection gives incident
 * responders a clean filter path back to the originating alert.
 */

'use strict';

const { ladderFor } = require('../config/alert.registry');

function formatDelta(delta) {
  if (typeof delta !== 'number' || Number.isNaN(delta)) return null;
  const pct = delta * 100;
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function defaultRenderMessage({ decision, policy, snapshot }) {
  const headlineAr = decision.headlineAr || policy.headlineAr || 'تنبيه لوحة';
  const headlineEn = decision.headlineEn || policy.headlineEn || 'Dashboard alert';
  const valueBit =
    snapshot && typeof snapshot.value === 'number' ? ` (قيمة: ${snapshot.value})` : '';
  const deltaBit = snapshot ? formatDelta(snapshot.delta) : null;
  const deltaClause = deltaBit ? ` — التغير ${deltaBit}` : '';
  const stepClause =
    decision.action === 'escalate' ? ` [تصعيد: الخطوة ${decision.escalationStep}]` : '';
  return {
    subject: `[${policy.severity.toUpperCase()}] ${headlineEn}`,
    body: `${headlineAr}${valueBit}${deltaClause}${stepClause}\n---\n${headlineEn}. Please review the dashboard alert.`,
  };
}

function pickRecipientAddress(recipient) {
  if (!recipient || typeof recipient !== 'object') return null;
  if (recipient.email || recipient.phone) {
    return {
      email: recipient.email || '',
      phone: recipient.phone || '',
    };
  }
  return null;
}

function buildAlertNotificationDispatcher({
  notifier,
  resolveRecipients,
  logger = console,
  renderMessage = defaultRenderMessage,
} = {}) {
  if (!notifier || typeof notifier.notify !== 'function') {
    throw new Error('alertNotificationDispatcher: notifier.notify is required');
  }
  if (typeof resolveRecipients !== 'function') {
    throw new Error('alertNotificationDispatcher: resolveRecipients is required');
  }

  async function dispatch({ decision, policy, snapshot, scope } = {}) {
    if (!policy || !decision) return { sent: 0, skipped: true, reason: 'missing-context' };
    const ladder = ladderFor(policy) || [];
    const step = ladder[decision.escalationStep || 0];
    if (!step) {
      return { sent: 0, skipped: true, reason: 'no-ladder-step' };
    }

    let recipients;
    try {
      recipients = await resolveRecipients(step.roles || [], { scope });
    } catch (err) {
      if (logger && logger.warn) {
        logger.warn(`[alertDispatcher] resolveRecipients failed: ${err.message}`);
      }
      return { sent: 0, skipped: true, reason: 'resolver-error' };
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return { sent: 0, skipped: true, reason: 'no-recipients' };
    }

    const message = renderMessage({ decision, policy, snapshot });
    const channels = step.channels && step.channels.length ? step.channels : ['email'];
    const priority =
      policy.severity === 'emergency'
        ? 'urgent'
        : policy.severity === 'critical'
          ? 'high'
          : policy.severity === 'warning'
            ? 'normal'
            : 'low';

    let sent = 0;
    let failed = 0;
    for (const recipient of recipients) {
      const address = pickRecipientAddress(recipient);
      if (!address) {
        failed += 1;
        continue;
      }
      try {
        await notifier.notify({
          to: address,
          channels,
          subject: message.subject,
          body: message.body,
          priority,
          templateKey: `alert.${policy.severity}.${policy.id}`,
          userId: recipient.userId || null,
          metadata: {
            correlationKey: decision.correlationKey,
            escalationStep: decision.escalationStep,
            policyId: policy.id,
            kpiId: snapshot && snapshot.id,
            action: decision.action,
          },
        });
        sent += 1;
      } catch (err) {
        failed += 1;
        if (logger && logger.warn) {
          logger.warn(
            `[alertDispatcher] notify failed for ${recipient.userId || address.email || address.phone}: ${err.message}`
          );
        }
      }
    }

    return {
      sent,
      failed,
      skipped: false,
      recipients: recipients.length,
      channels,
      priority,
    };
  }

  return { dispatch, _internals: { defaultRenderMessage, pickRecipientAddress } };
}

module.exports = { buildAlertNotificationDispatcher };
