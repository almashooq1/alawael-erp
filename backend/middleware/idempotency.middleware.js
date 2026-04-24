/**
 * Idempotency Middleware — Express middleware that honours the
 * `Idempotency-Key` header on mutating requests.
 *
 * Flow:
 *   1. If the header is absent, the request passes through untouched.
 *   2. If the key has a completed response cached, return it verbatim.
 *   3. If the key is in-flight on another worker, return 409 IN_PROGRESS.
 *   4. Otherwise reserve the key, let the handler run, and record the final
 *      response (status + JSON body) so a subsequent retry gets the same
 *      outcome.
 *
 * Scope of application: apply to mutating routes on integration surfaces
 * (payment creation, claim submission, adapter calls). Read-only GETs should
 * not use this middleware.
 *
 * Tuning:
 *   methods — defaults to POST/PUT/PATCH/DELETE
 *   ttlMs   — how long a response is cached (default 24h)
 *   scope   — optional fn(req) → string used to namespace keys per tenant/user
 */

'use strict';

const { getStore, DEFAULT_TTL_MS, recordOutcome } = require('../infrastructure/idempotencyStore');

const DEFAULT_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function idempotency(options = {}) {
  const methods = options.methods
    ? new Set(options.methods.map(m => m.toUpperCase()))
    : DEFAULT_METHODS;
  const ttlMs = options.ttlMs || DEFAULT_TTL_MS;
  const scope = typeof options.scope === 'function' ? options.scope : null;

  return async function idempotencyMiddleware(req, res, next) {
    if (!methods.has(req.method)) return next();

    const rawKey = req.get('Idempotency-Key') || req.get('idempotency-key');
    if (!rawKey) return next();
    const routeLabel = `${req.method} ${req.baseUrl || ''}${req.path}`;
    if (typeof rawKey !== 'string' || rawKey.length < 8 || rawKey.length > 255) {
      recordOutcome(routeLabel, 'invalid_key');
      return res.status(400).json({
        error: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key must be a string between 8 and 255 chars',
      });
    }

    const namespace = scope ? scope(req) : 'global';
    const key = `${namespace}:${req.method}:${req.baseUrl || ''}${req.path}:${rawKey}`;
    const store = getStore();

    try {
      const cached = await store.get(key);
      if (cached) {
        recordOutcome(routeLabel, 'hit');
        res.setHeader('Idempotent-Replay', 'true');
        if (cached.headers && typeof cached.headers === 'object') {
          for (const [h, v] of Object.entries(cached.headers)) {
            if (h.toLowerCase() === 'content-length') continue;
            res.setHeader(h, v);
          }
        }
        return res.status(cached.status).json(cached.body);
      }

      const reservation = await store.reserve(key, ttlMs);
      if (reservation === 'pending') {
        recordOutcome(routeLabel, 'pending_reject');
        return res.status(409).json({
          error: 'IDEMPOTENT_REQUEST_IN_PROGRESS',
          message: 'A request with this Idempotency-Key is still being processed',
        });
      }
      recordOutcome(routeLabel, 'miss');
      if (reservation === 'done') {
        // Rare race: reserve saw a completed entry right after we did not — refetch
        const fresh = await store.get(key);
        if (fresh) {
          res.setHeader('Idempotent-Replay', 'true');
          return res.status(fresh.status).json(fresh.body);
        }
      }
    } catch (err) {
      // Never fail a request because the idempotency layer is degraded; just bypass.
      req.log && req.log.warn
        ? req.log.warn({ err }, 'idempotency store failure, bypassing')
        : null;
      return next();
    }

    // Capture res.json so we can persist the final response body.
    const originalJson = res.json.bind(res);
    let persisted = false;
    res.json = function patchedJson(body) {
      if (!persisted) {
        persisted = true;
        const status = res.statusCode || 200;
        // Only cache successful and client-error (4xx) results — 5xx should be retryable.
        if (status < 500) {
          const headersSnapshot = {};
          for (const [h, v] of Object.entries(res.getHeaders())) {
            if (typeof v === 'string' || typeof v === 'number') headersSnapshot[h] = v;
          }
          store
            .put(key, { status, body, headers: headersSnapshot, completedAt: Date.now() }, ttlMs)
            .catch(() => {
              /* storage failure must not break the response */
            });
        } else {
          store.release && store.release(key).catch(() => {});
        }
      }
      return originalJson(body);
    };

    next();
  };
}

module.exports = idempotency;
module.exports.default = idempotency;
