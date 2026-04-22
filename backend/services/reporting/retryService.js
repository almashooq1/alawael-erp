/**
 * retryService.js — exponential-backoff retry for FAILED deliveries.
 *
 * Phase 10 Commit 6.
 *
 * Pipeline:
 *   - `findRetryable(DeliveryModel, now, maxAttempts)` pulls FAILED
 *     rows whose `failedAt` is older than the delay for their next
 *     attempt number. Rows that already used their retry budget are
 *     left for the escalation sweep.
 *   - `retryOne(delivery, engine)` re-runs the engine for that
 *     delivery's (reportId, periodKey, scopeKey). The engine will
 *     skip already-SENT rows and re-dispatch only the FAILED one —
 *     the C6 engine tweak makes this safe.
 *   - `runRetrySweep(deps)` glues the above.
 *
 * Backoff schedule (minutes): 0.5, 5, 30, 120. After attempt 4 the row
 * is handed to the escalation sweep.
 */

'use strict';

const BACKOFF_MINUTES = Object.freeze([0.5, 5, 30, 120]);
const DEFAULT_MAX_ATTEMPTS = 4;

/**
 * Returns the Date when the given row becomes eligible for retry. If
 * it already exceeded the budget, returns null (caller should hand it
 * to the escalation sweep instead).
 */
function nextAttemptDueAt(delivery, { maxAttempts = DEFAULT_MAX_ATTEMPTS } = {}) {
  if (!delivery) return null;
  const attempts = Math.max(0, Number(delivery.attempts || 0));
  if (attempts >= maxAttempts) return null;
  const mins = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)];
  const minutes = attempts === 0 ? BACKOFF_MINUTES[0] : mins;
  const base = delivery.failedAt || delivery.updatedAt || new Date();
  return new Date(new Date(base).getTime() + minutes * 60 * 1000);
}

function isDueNow(delivery, { now = new Date(), maxAttempts } = {}) {
  const due = nextAttemptDueAt(delivery, { maxAttempts });
  return !!(due && due.getTime() <= new Date(now).getTime());
}

/**
 * @param {Object} DeliveryModel — model proxy (.model getter) or the model directly
 * @param {Object} [opts]
 * @param {Date}   [opts.now]
 * @param {number} [opts.maxAttempts]
 * @param {number} [opts.limit]       cap rows scanned per pass (default 500)
 * @returns {Promise<Array>}           candidate deliveries to retry
 */
async function findRetryable(
  DeliveryModel,
  { now = new Date(), maxAttempts = DEFAULT_MAX_ATTEMPTS, limit = 500 } = {}
) {
  const Model = DeliveryModel.model || DeliveryModel;
  // Cheapest filter we can do server-side: FAILED + attempts < max.
  // Time-window filter is applied per-row via nextAttemptDueAt, since
  // the correct threshold varies by `attempts`.
  const rows = await Model.find({
    status: 'FAILED',
    attempts: { $lt: maxAttempts },
  })
    .sort({ failedAt: 1 })
    .limit(limit);
  const ready = [];
  for (const r of rows || []) {
    if (isDueNow(r, { now, maxAttempts })) ready.push(r);
  }
  return ready;
}

/**
 * Flip the row to RETRYING, then ask the engine to redispatch this
 * instance. The engine re-runs the builder + renderer + channel, then
 * upserts the existing row (our tweaked idempotency check skips SENT
 * but allows RETRYING through to send).
 *
 * @returns {Promise<{ status, deliveryId, instanceKey, errors }>}
 */
async function retryOne(delivery, { engine, logger = console } = {}) {
  if (!delivery || !engine) {
    return { status: 'invalid', errors: ['delivery+engine required'] };
  }
  try {
    if (typeof delivery.markRetrying === 'function') delivery.markRetrying();
    if (typeof delivery.save === 'function') await delivery.save();
  } catch (err) {
    // markRetrying throws if not in FAILED — benign for our sweep.
    logger.warn && logger.warn(`retryService: markRetrying: ${err.message}`);
  }
  try {
    const res = await engine.runInstance({
      reportId: delivery.reportId,
      periodKey: delivery.periodKey,
      scopeKey: delivery.scopeKey || undefined,
    });
    return {
      status: res.status,
      deliveryId: String(delivery._id || delivery.id),
      instanceKey: res.instanceKey,
      errors: res.errors || [],
    };
  } catch (err) {
    logger.warn && logger.warn(`retryService: engine.runInstance: ${err.message}`);
    return {
      status: 'engine_crash',
      deliveryId: String(delivery._id || delivery.id),
      errors: [err.message],
    };
  }
}

/**
 * Single-pass retry sweep.
 *
 * @param {Object} deps
 * @param {Object} deps.DeliveryModel
 * @param {Object} deps.engine
 * @param {Object} [deps.eventBus]
 * @param {Object} [deps.logger]
 * @param {Date}   [deps.now]
 * @param {number} [deps.maxAttempts]
 * @param {number} [deps.limit]
 * @returns {Promise<{ scanned: number, retried: number, errors: string[] }>}
 */
async function runRetrySweep({
  DeliveryModel,
  engine,
  eventBus,
  logger = console,
  now,
  maxAttempts,
  limit,
} = {}) {
  if (!DeliveryModel || !engine) {
    throw new Error('runRetrySweep: DeliveryModel + engine required');
  }
  const summary = { scanned: 0, retried: 0, errors: [] };
  const candidates = await findRetryable(DeliveryModel, { now, maxAttempts, limit });
  summary.scanned = candidates.length;
  for (const d of candidates) {
    const res = await retryOne(d, { engine, logger });
    if (res.errors && res.errors.length) {
      summary.errors.push(`${res.deliveryId}: ${res.errors.join('; ')}`);
    } else {
      summary.retried++;
      if (eventBus && typeof eventBus.emit === 'function') {
        eventBus.emit('report.delivery.retried', {
          deliveryId: res.deliveryId,
          instanceKey: res.instanceKey,
        });
      }
    }
  }
  return summary;
}

module.exports = {
  BACKOFF_MINUTES,
  DEFAULT_MAX_ATTEMPTS,
  nextAttemptDueAt,
  isDueNow,
  findRetryable,
  retryOne,
  runRetrySweep,
};
