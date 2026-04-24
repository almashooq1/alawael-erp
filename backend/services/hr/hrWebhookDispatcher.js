'use strict';

/**
 * hrWebhookDispatcher.js — Phase 11 Commit 35 (4.0.52).
 *
 * Pushes HR events to subscribed external URLs. Designed as a
 * platform layer: future commits wire it into the anomaly detector,
 * change-request workflow, etc. Today it exposes `dispatch(eventType,
 * payload)` which handles filtering + signing + POST + subscription
 * status updates.
 *
 * Design decisions:
 *
 *   1. Fire-and-forget at the caller boundary. `dispatch()` returns
 *      a Promise that resolves to per-subscription results, but
 *      the caller never awaits it in production — integration
 *      sites use `.catch(() => {})`. A slow/broken webhook target
 *      must not block the HR request that triggered it.
 *
 *   2. HTTP client is dependency-injected. Tests pass a fake
 *      returning a Promise<{ ok, status }>; production wires
 *      `fetch` or `node-fetch`. No hard dep on axios.
 *
 *   3. HMAC-SHA256 signature in `X-HR-Signature` header. Format:
 *      `sha256=<hex>`. Receivers re-sign the payload with their
 *      shared secret to verify authenticity.
 *
 *   4. Retry is OUT OF SCOPE for this commit. A transient failure
 *      marks `last_status: 'failed'` + increments `failure_count`.
 *      A future commit can add a dead-letter queue + background
 *      retry worker. Keeping MVP tight.
 *
 *   5. Event type filter: `subscription.event_types` is an array.
 *      Empty/missing → subscribes to ALL hr.* events.
 *      Populated → only events whose type is in the array.
 *
 *   6. The service layer updates subscription status BEST-EFFORT.
 *      A status-update DB error is swallowed + logged; the
 *      dispatch result still reflects the actual HTTP outcome.
 *
 *   7. URLs MUST be https in production — dispatcher does NOT
 *      enforce this (tests use http://localhost). Validation
 *      belongs to the future admin UI / route that creates
 *      subscriptions.
 */

const crypto = require('crypto');

const DEFAULT_TIMEOUT_MS = 5000;

function createHrWebhookDispatcher(deps = {}) {
  const HrWebhookSubscription = deps.subscriptionModel;
  const httpClient = deps.httpClient; // (url, init) → Promise<{ ok, status, text? }>
  const logger = deps.logger || {
    warn: () => {},
    error: () => {},
    info: () => {},
  };
  const nowFn = deps.now || (() => new Date());
  const timeoutMs = deps.timeoutMs || DEFAULT_TIMEOUT_MS;

  if (HrWebhookSubscription == null) {
    throw new Error('hrWebhookDispatcher: subscriptionModel is required');
  }
  if (typeof httpClient !== 'function') {
    throw new Error('hrWebhookDispatcher: httpClient function is required');
  }

  function sign(body, secret) {
    return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  function matchesEvent(subscription, eventType) {
    if (!subscription.event_types || subscription.event_types.length === 0) {
      return true;
    }
    return subscription.event_types.includes(eventType);
  }

  async function updateSubscriptionStatus(id, { status, error }) {
    try {
      const update = {
        last_fired_at: nowFn(),
        last_status: status,
        last_error: error || null,
        $inc: { fire_count: 1 },
      };
      if (status === 'failed') {
        update.$inc.failure_count = 1;
      }
      // Mongoose doesn't allow mixing top-level $set and $inc keys; split.
      const { $inc, ...topLevel } = update;
      await HrWebhookSubscription.updateOne({ _id: id }, { $set: topLevel, $inc });
    } catch (err) {
      logger.warn && logger.warn('[HrWebhookDispatcher] status update failed:', err.message || err);
    }
  }

  async function loadActiveSubscriptions(eventType) {
    // Candidate: active + not deleted. Event-type filter applied
    // in-memory so an empty event_types array (= subscribe to all)
    // is honored without $or tricks.
    return HrWebhookSubscription.find({
      is_active: true,
      deleted_at: null,
    })
      .lean()
      .then(list => list.filter(s => matchesEvent(s, eventType)));
  }

  /**
   * Dispatch an event. Returns a per-subscription result array.
   * Never throws — each dispatch failure is captured in the
   * corresponding result entry.
   */
  async function dispatch(eventType, payload) {
    if (!eventType || typeof eventType !== 'string') {
      throw new Error('hrWebhookDispatcher.dispatch: eventType is required');
    }
    const now = nowFn();
    const envelope = {
      event_type: eventType,
      fired_at: now.toISOString(),
      payload: payload || null,
    };
    const body = JSON.stringify(envelope);

    const subs = await loadActiveSubscriptions(eventType);
    if (subs.length === 0) {
      return { dispatched: 0, results: [] };
    }

    const results = [];
    await Promise.all(
      subs.map(async sub => {
        const signature = sign(body, sub.hmac_secret);
        const headers = {
          'Content-Type': 'application/json',
          'X-HR-Signature': signature,
          'X-HR-Event-Type': eventType,
          'User-Agent': 'alawael-hr-webhook/1.0',
        };
        try {
          const res = await Promise.race([
            httpClient(sub.target_url, { method: 'POST', body, headers }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
          ]);
          const ok = res && res.ok === true;
          await updateSubscriptionStatus(sub._id, {
            status: ok ? 'success' : 'failed',
            error: ok ? null : `http_${res && res.status ? res.status : 'unknown'}`,
          });
          results.push({
            subscription_id: String(sub._id),
            target_url: sub.target_url,
            status: ok ? 'success' : 'failed',
            http_status: res && res.status ? res.status : null,
          });
        } catch (err) {
          await updateSubscriptionStatus(sub._id, {
            status: 'failed',
            error: err.message || String(err),
          });
          results.push({
            subscription_id: String(sub._id),
            target_url: sub.target_url,
            status: 'failed',
            error: err.message || String(err),
          });
        }
      })
    );

    return {
      dispatched: results.length,
      succeeded: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    };
  }

  return Object.freeze({ dispatch, sign });
}

module.exports = { createHrWebhookDispatcher };
