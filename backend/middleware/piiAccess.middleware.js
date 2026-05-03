/**
 * piiAccess.middleware.js — PDPL Article 13 (accountability) + Saudi
 * audit-trail requirement: log every read of sensitive personal data so
 * the DPO can answer "who viewed user X's record on date Y?"
 *
 * Usage:
 *   const logPiiAccess = require('../middleware/piiAccess.middleware');
 *
 *   // Wrap a single route:
 *   router.get('/:id', authenticate, logPiiAccess('Beneficiary'),
 *     handler);
 *
 *   // Or wrap an entire router (logs every 2xx response):
 *   router.use(logPiiAccess('Beneficiary'));
 *
 * Behavior:
 *   • Hooks `res.on('finish')` so the log is written AFTER the
 *     response is sent — no impact on response latency.
 *   • Only logs on 2xx (real reads). 4xx auth failures + 5xx errors
 *     are skipped — they're not "access" events.
 *   • Best-effort: a logger failure NEVER throws back into the
 *     request lifecycle. Errors are warned but swallowed.
 *   • Captures actor (userId), target type + id (when present in
 *     params), method + path, IP, user-agent, timestamp.
 *
 * Storage:
 *   Uses the existing `AuditLog` model with eventType
 *   `pii.access.read` (a new event type — added inline if absent).
 *   No separate collection needed; existing audit retention policies
 *   apply.
 *
 * Why a middleware not a mongoose hook:
 *   Mongoose document hooks fire on every find()/findOne(), including
 *   internal queries the application makes (joins, populates, batch
 *   sweepers). Logging all of those would blow up the audit log with
 *   noise. The HTTP-route boundary is the right place to log "a
 *   human (or external API client) deliberately requested this
 *   record".
 */

'use strict';

const logger = require('../utils/logger');

let cachedAuditLog = null;
function getAuditLog() {
  if (cachedAuditLog) return cachedAuditLog;
  try {
    const mod = require('../models/auditLog.model');
    cachedAuditLog = mod.AuditLog || mod;
  } catch (err) {
    logger.warn('[pii-access] AuditLog model unavailable', { error: err.message });
    cachedAuditLog = null;
  }
  return cachedAuditLog;
}

const DEFAULT_EVENT_TYPE = 'pii.access.read';

function logPiiAccess(targetType, options = {}) {
  const eventType = options.eventType || DEFAULT_EVENT_TYPE;
  const severity = options.severity || 'info';
  const idParam = options.idParam || 'id';
  const skipMethods = new Set(
    (options.skipMethods || ['HEAD', 'OPTIONS']).map(m => m.toUpperCase())
  );

  return function piiAccessMiddleware(req, res, next) {
    if (skipMethods.has(req.method)) return next();

    const start = Date.now();
    res.on('finish', () => {
      // Only log successful reads. 401/403 means the access was blocked,
      // not granted, so it's not a PII *disclosure* — those belong in
      // the auth logs instead.
      if (res.statusCode >= 400) return;

      const AuditLog = getAuditLog();
      if (!AuditLog) return;

      const userId = req.user?._id || req.user?.id || null;
      if (!userId) return; // anonymous access — covered by other layers

      const targetId = req.params?.[idParam] || null;
      const ipAddress =
        req.ip ||
        req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.connection?.remoteAddress ||
        null;

      const entry = {
        eventType,
        severity,
        status: 'success',
        userId,
        ipAddress,
        userAgent: req.headers?.['user-agent'] || null,
        description: `${req.method} ${req.path}`,
        metadata: {
          targetType,
          targetId,
          method: req.method,
          path: req.path,
          query: req.query,
          statusCode: res.statusCode,
          durationMs: Date.now() - start,
        },
        tags: ['pii', 'pdpl', `target:${targetType}`],
      };

      // Use create() rather than new + save() so a missing field never
      // takes the request down. We deliberately do not await this —
      // the response is already sent.
      Promise.resolve()
        .then(() => AuditLog.create(entry))
        .catch(err => {
          logger.warn('[pii-access] failed to log access (best-effort)', {
            error: err.message,
            targetType,
            targetId,
          });
        });
    });

    next();
  };
}

module.exports = logPiiAccess;
module.exports.DEFAULT_EVENT_TYPE = DEFAULT_EVENT_TYPE;
