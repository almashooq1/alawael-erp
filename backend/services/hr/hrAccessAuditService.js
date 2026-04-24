/**
 * hrAccessAuditService.js — Phase 11 Commit 6 (4.0.23).
 *
 * Thin, purpose-built wrapper over the canonical `AuditLog` model for
 * HR-domain access events. Satisfies PDPL Art. 30 (record of
 * processing + access-event retention) for every HR route that
 * returns employee data.
 *
 * Three events we log:
 *
 *   logHrAccess            — a caller successfully read HR data.
 *                            Maps to AuditEventTypes.DATA_READ.
 *   logHrAccessDenied      — a caller attempted but was rejected
 *                            (wrong role, suspended user, etc).
 *                            Maps to SECURITY_ACCESS_DENIED.
 *   logHrExport            — a caller exported HR data off-system
 *                            (CSV/XLSX/PDF). Stronger signal than
 *                            plain read — DATA_EXPORTED event.
 *
 * Also exposes:
 *
 *   countRecentAccesses    — for anomaly detection: how many HR
 *                            DATA_READ events did this actor fire
 *                            in the last N minutes? Consumers can
 *                            gate/rate-limit or raise a flag.
 *
 *   recentAccessesFor      — for DSAR fulfillment: list every HR
 *                            access event touching a given
 *                            employeeId in the last N days.
 *
 * Design decisions:
 *
 *   1. Fire-and-forget logging. Every method catches its own errors
 *      and logs to stderr (or the injected logger) so a misconfigured
 *      audit stack NEVER breaks the caller's response. HR data
 *      delivery trumps logging reliability — we're not going to
 *      refuse to serve a user's profile because Mongo-audit is down.
 *
 *   2. All writes include: actorUserId, actorRole, entityType,
 *      entityId (if single-record), action verb, ipAddress (when
 *      provided by caller), isSelfAccess flag, redactedFieldsCount.
 *      Minimum-necessary set — no raw record contents.
 *
 *   3. AuditLog.eventType is enum-locked to the canonical set; we
 *      map HR-specific actions onto the existing DATA_* and
 *      SECURITY_* vocabulary rather than extending the enum.
 *
 *   4. DEPENDENCY-INJECTED model. Tests substitute a fake AuditLog
 *      exposing .create + .find + .countDocuments; production wires
 *      the real model. No module-level requires.
 */

'use strict';

const MS_PER_MIN = 60 * 1000;

function createHrAccessAuditService(deps = {}) {
  const AuditLog = deps.auditLogModel;
  const logger = deps.logger || {
    warn: (...args) => {
      // Fall back to stderr so audit failures stay visible but
      // never throw past the caller.
      process.stderr.write(`[HrAccessAudit] ${args.join(' ')}\n`);
    },
  };

  if (AuditLog == null) {
    throw new Error('hrAccessAuditService: auditLogModel is required');
  }

  async function writeEvent(payload) {
    try {
      await AuditLog.create(payload);
      return { logged: true };
    } catch (err) {
      logger.warn('write failed:', err && err.message);
      return { logged: false, error: err && err.message };
    }
  }

  // Map HR-specific fields onto the canonical AuditLog schema shape.
  // The canonical schema has a flat `resource` string and a `metadata.custom`
  // bag for structured extras — we stamp entity + id + action into
  // resource ("hr:employee:<id>:view") and tuck the rest under
  // metadata.custom so downstream queries by userId + entityType
  // still work via the resource prefix match.
  function baseDoc({
    eventType,
    eventCategory,
    severity,
    status,
    actorUserId,
    actorRole,
    entityType,
    entityId,
    action,
    message,
    ipAddress,
    metadata,
  }) {
    const resourceParts = ['hr', entityType];
    if (entityId) resourceParts.push(String(entityId));
    if (action) resourceParts.push(action);
    return {
      eventType,
      eventCategory,
      severity,
      status,
      userId: actorUserId,
      userRole: actorRole,
      resource: resourceParts.join(':'),
      message,
      ipAddress: ipAddress || null,
      metadata: {
        custom: {
          entityType: `hr:${entityType}`,
          entityId: entityId ? String(entityId) : null,
          action,
          ...(metadata || {}),
        },
      },
      tags: ['hr', `hr:${entityType}`],
    };
  }

  /**
   * Log a successful HR-data read.
   *
   *   actorUserId         — the user who made the request
   *   actorRole           — their canonical role
   *   entityType          — 'employee' | 'employment_contract' | 'leave' | 'dashboard'
   *   entityId            — single-record id (optional for list/dashboard)
   *   action              — free-form verb ('view', 'list', 'dashboard_snapshot')
   *   redactedCount       — how many fields were masked (derived from
   *                         hrDataMaskingService.redactedFields)
   *   isSelfAccess        — true when the caller was viewing their own data
   *   ipAddress, metadata — optional contextual info
   */
  async function logHrAccess({
    actorUserId,
    actorRole,
    entityType,
    entityId = null,
    action = 'view',
    redactedCount = 0,
    isSelfAccess = false,
    ipAddress = null,
    metadata = {},
  } = {}) {
    return writeEvent(
      baseDoc({
        eventType: 'data.read',
        eventCategory: 'data',
        severity: 'info',
        status: 'success',
        actorUserId,
        actorRole,
        entityType,
        entityId,
        action,
        message: `HR ${entityType} ${action}${isSelfAccess ? ' (self)' : ''}`,
        ipAddress,
        metadata: {
          ...metadata,
          redactedCount,
          isSelfAccess,
        },
      })
    );
  }

  /**
   * Log an access attempt that was REJECTED. Signals possible
   * privilege-escalation attempts and feeds SECURITY dashboards.
   */
  async function logHrAccessDenied({
    actorUserId,
    actorRole,
    entityType,
    entityId = null,
    action = 'view',
    reason = 'insufficient_privilege',
    ipAddress = null,
    metadata = {},
  } = {}) {
    return writeEvent(
      baseDoc({
        eventType: 'security.access_denied',
        eventCategory: 'security',
        severity: 'medium',
        status: 'failure',
        actorUserId,
        actorRole,
        entityType,
        entityId,
        action,
        message: `HR ${entityType} ${action} denied: ${reason}`,
        ipAddress,
        metadata: { ...metadata, reason },
      })
    );
  }

  /**
   * Log an HR data export. Exports leave the system and deserve a
   * stronger signal than plain read.
   */
  async function logHrExport({
    actorUserId,
    actorRole,
    entityType,
    entityId = null,
    action = 'export',
    recordCount = 0,
    format = 'unknown',
    ipAddress = null,
    metadata = {},
  } = {}) {
    return writeEvent(
      baseDoc({
        eventType: 'data.exported',
        eventCategory: 'data',
        severity: 'high',
        status: 'success',
        actorUserId,
        actorRole,
        entityType,
        entityId,
        action,
        message: `HR ${entityType} exported (${format}, ${recordCount} records)`,
        ipAddress,
        metadata: { ...metadata, recordCount, format },
      })
    );
  }

  /**
   * Count HR DATA_READ events fired by a single actor in the last
   * `windowMinutes` (default 60). Anomaly threshold for a future
   * red-flag observer ("this user queried 500 HR records in 10
   * minutes — possible data harvesting").
   */
  async function countRecentAccesses({ actorUserId, windowMinutes = 60 } = {}) {
    if (!actorUserId) return 0;
    const since = new Date(Date.now() - windowMinutes * MS_PER_MIN);
    try {
      return await AuditLog.countDocuments({
        userId: actorUserId,
        eventType: 'data.read',
        resource: { $regex: '^hr:' },
        createdAt: { $gte: since },
      });
    } catch (err) {
      logger.warn('count failed:', err && err.message);
      return 0;
    }
  }

  /**
   * Return recent HR access events touching the given employee,
   * sorted newest-first. Consumed by DSAR fulfilment: when the
   * employee asks "who has viewed my data in the last 90 days?",
   * this is the answer.
   */
  async function recentAccessesFor({
    employeeId,
    windowDays = 90,
    limit = 200,
    includeArchived = false,
  } = {}) {
    if (!employeeId) return [];
    const since = new Date(Date.now() - windowDays * 24 * 60 * MS_PER_MIN);
    const filter = {
      resource: { $regex: `^hr:[^:]+:${String(employeeId)}:` },
      eventType: { $in: ['data.read', 'data.exported'] },
      createdAt: { $gte: since },
    };
    // Phase 11 C28 — retention-aware DSAR. Default: hot window only
    // (rows where `flags.isArchived` is not set or explicitly false).
    // `includeArchived: true` drops the filter so regulator-initiated
    // DSARs spanning the 365-1095 day archive tier can surface.
    if (!includeArchived) {
      filter['flags.isArchived'] = { $ne: true };
    }
    try {
      return await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    } catch (err) {
      logger.warn('recentAccessesFor failed:', err && err.message);
      return [];
    }
  }

  return Object.freeze({
    logHrAccess,
    logHrAccessDenied,
    logHrExport,
    countRecentAccesses,
    recentAccessesFor,
  });
}

module.exports = { createHrAccessAuditService };
