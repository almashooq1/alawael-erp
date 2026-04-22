/**
 * escalationService.js — moves FAILED-past-retry-budget deliveries to
 * ESCALATED and notifies the catalog's `escalateTo` role in-app.
 *
 * Phase 10 Commit 6.
 *
 * Two escalation triggers:
 *   1. retry-exhausted: `status === 'FAILED' && attempts >= maxAttempts`
 *   2. sla-breach:      a delivery that was SENT but no READ receipt
 *                        arrived within `catalog.slaHours`
 *
 * Escalations emit an in-app notification to every user whose role
 * matches `report.escalateTo`. We reuse the existing
 * recipientResolver's role queries — no parallel code path.
 *
 * Downstream (future): the ops dashboard consumes the
 * `report.delivery.escalated` event and pins escalations to the top
 * of the reporting-ops view.
 */

'use strict';

const { DEFAULT_MAX_ATTEMPTS } = require('./retryService');

/**
 * A FAILED row has exhausted its retry budget.
 */
function isRetryExhausted(delivery, maxAttempts = DEFAULT_MAX_ATTEMPTS) {
  return !!(
    delivery &&
    delivery.status === 'FAILED' &&
    Number(delivery.attempts || 0) >= maxAttempts
  );
}

/**
 * A SENT/DELIVERED row breached the SLA without a READ receipt.
 */
function isSlaBreach(delivery, slaHours, { now = new Date() } = {}) {
  if (!delivery || !slaHours) return false;
  if (!['SENT', 'DELIVERED'].includes(delivery.status)) return false;
  if (delivery.readAt) return false;
  const anchor = delivery.sentAt || delivery.createdAt;
  if (!anchor) return false;
  const ageMs = new Date(now).getTime() - new Date(anchor).getTime();
  return ageMs >= slaHours * 3600 * 1000;
}

/**
 * Collect escalation candidates. Two queries, merged:
 *   - FAILED where attempts >= maxAttempts
 *   - SENT/DELIVERED where now - sentAt >= slaHours (per-report slaHours
 *     can only be known by joining with the catalog; we pull both sets
 *     and filter in-app).
 */
async function findEscalationCandidates(
  DeliveryModel,
  catalog,
  { now = new Date(), maxAttempts = DEFAULT_MAX_ATTEMPTS, limit = 500 } = {}
) {
  const Model = DeliveryModel.model || DeliveryModel;
  const failed = await Model.find({
    status: 'FAILED',
    attempts: { $gte: maxAttempts },
  })
    .sort({ failedAt: 1 })
    .limit(limit);
  const watchable = await Model.find({
    status: { $in: ['SENT', 'DELIVERED'] },
    readAt: null,
  })
    .sort({ sentAt: 1 })
    .limit(limit);

  const candidates = [];
  for (const d of failed || []) candidates.push({ delivery: d, reason: 'retry_exhausted' });
  for (const d of watchable || []) {
    const report = catalog && catalog.byId && catalog.byId(d.reportId);
    const sla = report && report.slaHours;
    if (isSlaBreach(d, sla, { now })) {
      candidates.push({ delivery: d, reason: 'sla_breach' });
    }
  }
  return candidates;
}

/**
 * Push an in-app notification to every user holding the escalateTo
 * role for the given delivery's catalog entry. Falls back to the
 * report's `owner` when `escalateTo` is empty.
 */
async function notifyEscalatees(
  delivery,
  report,
  { recipientResolver, channels, logger = console } = {}
) {
  if (!report) return { notified: 0, errors: ['no catalog entry'] };
  const roleKey = report.escalateTo || report.owner;
  if (!roleKey) return { notified: 0, errors: ['no escalateTo or owner'] };
  if (!recipientResolver || !channels || !channels.in_app) {
    return { notified: 0, errors: ['recipientResolver + in_app channel required'] };
  }
  let users = [];
  try {
    users = (await recipientResolver.resolve(roleKey, null)) || [];
  } catch (err) {
    return { notified: 0, errors: [`resolver: ${err.message}`] };
  }
  if (!users.length) return { notified: 0, errors: [`no users for role ${roleKey}`] };

  const payload = {
    subject: `Report delivery escalated: ${delivery.reportId}`,
    bodyText: `Delivery ${delivery._id || delivery.id} for ${delivery.reportId} (${delivery.channel}) failed past retry budget and has been escalated.`,
    bodyHtml: `<p>Delivery <code>${delivery._id || delivery.id}</code> for <strong>${delivery.reportId}</strong> via <strong>${delivery.channel}</strong> failed past retry budget.</p>`,
    reportId: delivery.reportId,
    instanceKey: delivery.instanceKey,
    confidentiality: 'internal',
    locale: 'ar',
  };
  try {
    const res = await channels.in_app.send(payload, users);
    if (res && res.success) return { notified: (res.results || users).length, errors: [] };
    return { notified: 0, errors: [res && res.error ? String(res.error) : 'in_app failed'] };
  } catch (err) {
    logger.warn && logger.warn(`escalation notify failed: ${err.message}`);
    return { notified: 0, errors: [err.message] };
  }
}

/**
 * Escalate one delivery: set status = ESCALATED, notify the owning role.
 */
async function escalateOne(
  { delivery, reason },
  { catalog, recipientResolver, channels, eventBus, logger = console } = {}
) {
  if (!delivery) return { status: 'invalid' };
  const report = catalog && catalog.byId && catalog.byId(delivery.reportId);
  const roleKey = (report && (report.escalateTo || report.owner)) || null;

  if (typeof delivery.markEscalated === 'function') {
    try {
      delivery.markEscalated(roleKey);
      if (typeof delivery.save === 'function') await delivery.save();
    } catch (err) {
      return { status: 'mark_failed', error: err.message };
    }
  }
  const notif = await notifyEscalatees(delivery, report, { recipientResolver, channels, logger });
  if (eventBus && typeof eventBus.emit === 'function') {
    eventBus.emit('report.delivery.escalated', {
      deliveryId: String(delivery._id || delivery.id),
      reportId: delivery.reportId,
      reason,
      escalatedTo: roleKey,
      notified: notif.notified,
    });
  }
  return {
    status: 'escalated',
    deliveryId: String(delivery._id || delivery.id),
    reason,
    escalatedTo: roleKey,
    notified: notif.notified,
    errors: notif.errors,
  };
}

async function runEscalationSweep({
  DeliveryModel,
  catalog,
  recipientResolver,
  channels,
  eventBus,
  logger = console,
  now,
  maxAttempts,
  limit,
} = {}) {
  if (!DeliveryModel || !catalog) {
    throw new Error('runEscalationSweep: DeliveryModel + catalog required');
  }
  const summary = { scanned: 0, escalated: 0, errors: [] };
  const candidates = await findEscalationCandidates(DeliveryModel, catalog, {
    now,
    maxAttempts,
    limit,
  });
  summary.scanned = candidates.length;
  for (const c of candidates) {
    const res = await escalateOne(c, { catalog, recipientResolver, channels, eventBus, logger });
    if (res.status === 'escalated') summary.escalated++;
    if (res.errors && res.errors.length) {
      summary.errors.push(`${res.deliveryId}: ${res.errors.join('; ')}`);
    } else if (res.error) {
      summary.errors.push(`${res.deliveryId}: ${res.error}`);
    }
  }
  return summary;
}

module.exports = {
  isRetryExhausted,
  isSlaBreach,
  findEscalationCandidates,
  notifyEscalatees,
  escalateOne,
  runEscalationSweep,
};
