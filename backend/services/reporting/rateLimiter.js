/**
 * rateLimiter.js — per-recipient daily cap on report notifications.
 *
 * Phase 10 Commit 6.
 *
 * Default caps (per 24h rolling window):
 *   guardian / beneficiary / therapist : 20
 *   supervisor / branch_manager        : 40
 *   executive / quality / finance / hr : 80
 *
 * The limiter is a thin count-based guard, not a token bucket — at
 * this cadence (a handful of reports per day), a point-in-time count
 * is accurate enough and cheap (single indexed query).
 *
 * Usage from the engine's _dispatch: pass the recipient + role to
 * `check()`; a `false` result means "skip this recipient, enqueue a
 * digest entry" (digest logic is a future commit — today, over-limit
 * recipients simply don't get the notification and a
 * `report.delivery.rate_limited` event is emitted for ops visibility).
 */

'use strict';

const DEFAULT_LIMITS = Object.freeze({
  guardian: 20,
  beneficiary: 20,
  therapist: 20,
  supervisor: 40,
  branch_manager: 40,
  executive: 80,
  quality: 80,
  finance: 80,
  hr: 80,
});

function limitFor(role, overrides = {}) {
  if (role && Object.prototype.hasOwnProperty.call(overrides, role)) return overrides[role];
  if (role && Object.prototype.hasOwnProperty.call(DEFAULT_LIMITS, role))
    return DEFAULT_LIMITS[role];
  return 20;
}

/**
 * @param {Object} DeliveryModel
 * @param {string|ObjectId} recipientId
 * @param {Object} [opts]
 * @param {Date}   [opts.since]    — rolling window start (default: now - 24h)
 * @param {Date}   [opts.now]
 * @returns {Promise<number>}
 */
async function countRecentDeliveries(DeliveryModel, recipientId, { since, now = new Date() } = {}) {
  const Model = DeliveryModel.model || DeliveryModel;
  const windowStart = since || new Date(new Date(now).getTime() - 24 * 3600 * 1000);
  if (typeof Model.countDocuments === 'function') {
    return Model.countDocuments({
      recipientId,
      createdAt: { $gte: windowStart },
    });
  }
  // Fallback for fakes that only expose .find().then()
  const rows = await Model.find({ recipientId, createdAt: { $gte: windowStart } });
  return Array.isArray(rows) ? rows.length : (rows || []).length || 0;
}

function createRateLimiter({ DeliveryModel, overrides = {}, eventBus, logger = console } = {}) {
  if (!DeliveryModel) throw new Error('rateLimiter: DeliveryModel required');
  return {
    /**
     * @returns {Promise<{ allowed: boolean, current: number, limit: number }>}
     */
    async check({ recipientId, role, now = new Date() } = {}) {
      if (!recipientId) return { allowed: true, current: 0, limit: Infinity };
      const limit = limitFor(role, overrides);
      const current = await countRecentDeliveries(DeliveryModel, recipientId, { now });
      const allowed = current < limit;
      if (!allowed && eventBus && typeof eventBus.emit === 'function') {
        eventBus.emit('report.delivery.rate_limited', {
          recipientId: String(recipientId),
          role,
          current,
          limit,
        });
      }
      if (!allowed && logger.info) {
        logger.info(
          `[rateLimiter] over limit: recipient=${recipientId} role=${role} ${current}/${limit}`
        );
      }
      return { allowed, current, limit };
    },
    limits: { ...DEFAULT_LIMITS, ...overrides },
  };
}

module.exports = {
  DEFAULT_LIMITS,
  limitFor,
  countRecentDeliveries,
  createRateLimiter,
};
