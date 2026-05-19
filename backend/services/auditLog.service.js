/**
 * auditLog.service.js — minimal audit-log forwarder.
 *
 * History (2026-05-19): app.js try/catch-loaded this file three times
 * (mfa challenge service, access-review attestation, care-plan
 * bootstrap) and degraded gracefully when it didn't exist. The
 * OPTIONAL_REQUIRES_ALLOWLIST in __tests__/no-broken-requires.test.js
 * documented those entry points. This minimal implementation activates
 * the hook without coupling to the full AuditLog Mongoose schema —
 * that schema has a fixed eventType enum which doesn't fit the
 * freeform `action` strings (e.g. "beneficiary.lifecycle.transition")
 * that the 13+ in-tree callers actually pass.
 *
 * Contract (matches the call sites — see e.g. governance.service.js:191):
 *   auditLogService.log({
 *     action,             // freeform string, REQUIRED
 *     actorUserId,        // ObjectId-ish or null
 *     actorRole,          // string or null
 *     entityType,         // string or null
 *     entityId,           // string|ObjectId or null
 *     resource,           // composite key, usually `${entityType}#${entityId}`
 *     ipAddress,          // string or null
 *     metadata,           // freeform object
 *   })
 *
 * Behavior:
 *   - Emits one structured `audit: ...` line to the project logger at
 *     `info` level. The line includes all fields for grep-ability.
 *   - Returns a resolved Promise so callers using `await` don't hang.
 *   - Throws nothing on bad input — bad inputs are coerced/dropped.
 *
 * P1 follow-up: persist to AuditLog Mongoose model. Requires schema work
 * (widen eventType enum OR add a passthrough field that doesn't validate)
 * + per-test rollback strategy so test runs don't bloat the mock DB.
 *
 * Test impact: zero. Callers all check `typeof auditLogService.log === 'function'`
 * before assigning, then catch errors from `await auditLogger.log(...)`
 * inside try blocks. Existing tests that pass `auditLogger: null` are
 * unaffected; tests that pass a mock can keep their mocks. Boot-wired
 * sites in app.js now get a real audit trail in logs instead of silent
 * no-op.
 */

'use strict';

const logger = require('../utils/logger');

const auditLogService = {
  /**
   * Forward a single audit event to the project logger.
   * @param {{action: string, [k: string]: any}} input
   * @returns {Promise<void>}
   */
  async log(input) {
    // Coerce to a plain object even if a caller passes a non-object.
    const event = input && typeof input === 'object' ? input : { action: String(input) };

    // Stable shape for log parsers. Keep keys short to reduce log volume
    // — every line is one JSON-friendly chunk.
    const line = {
      action: event.action || 'unknown',
      actorUserId: event.actorUserId != null ? String(event.actorUserId) : null,
      actorRole: event.actorRole || null,
      entityType: event.entityType || null,
      entityId: event.entityId != null ? String(event.entityId) : null,
      resource: event.resource || null,
      ipAddress: event.ipAddress || null,
      metadata: event.metadata || null,
    };

    // logger.info quietly drops in CI when LOG_LEVEL=error. That's fine —
    // an audit MISS at WARN+ would be invisible anyway. info is the
    // right floor for routine actions.
    if (logger && typeof logger.info === 'function') {
      logger.info(`audit: ${line.action}`, line);
    }
  },
};

module.exports = {
  auditLogService,
};
