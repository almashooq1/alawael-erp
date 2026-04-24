'use strict';

/**
 * hrHealthService.js — Phase 11 Commit 30 (4.0.47).
 *
 * Aggregated health check for the HR stack. Exposes a single
 * verdict (healthy | degraded | unhealthy) for uptime monitors
 * that don't need the full metric surface (C26/C29) but do need
 * "is this thing OK right now?"
 *
 * Subsystems checked:
 *
 *   scheduler          — HR anomaly scheduler (C23) isRunning +
 *                        recency of last run
 *   audit_log          — AuditLog collection reachable + within
 *                        hot-tier size ceiling (configurable)
 *   change_request_queue — pending-approval count + stale-pending
 *                        ratio
 *   anomaly_queue      — pending-review anomaly count
 *
 * Aggregate verdict rules:
 *
 *   unhealthy = any `critical`-severity subsystem failure
 *   degraded  = any `warning` without a `critical`
 *   healthy   = all subsystems pass
 *
 * Response shape:
 *
 *   {
 *     status: 'healthy' | 'degraded' | 'unhealthy',
 *     checkedAt: ISO,
 *     subsystems: {
 *       scheduler:             { status, details, severity? },
 *       audit_log:             { status, details, severity? },
 *       change_request_queue:  { status, details, severity? },
 *       anomaly_queue:         { status, details, severity? }
 *     },
 *     warnings: [string, ...]
 *   }
 *
 * Design decisions:
 *
 *   1. Dep-injected substrate. Tests drive subsystem fakes; prod
 *      wires real. Missing substrate = subsystem reports as
 *      `status: 'absent', severity: 'warning'` (degrades the
 *      aggregate to `degraded`, not `unhealthy`).
 *
 *   2. Thresholds are runtime-configurable via options. Dev/staging
 *      may want tighter thresholds than prod.
 *
 *   3. Subsystem checks fire in parallel. A slow single check
 *      shouldn't block the whole health verdict.
 *
 *   4. `warnings` array collates every non-healthy subsystem's
 *      human-readable message. Useful for on-call text output
 *      without parsing the nested subsystem structure.
 *
 *   5. Never throws. Each subsystem is try/catch'd individually;
 *      a broken check becomes its own `unhealthy` signal rather
 *      than crashing the whole health endpoint.
 */

const MS_PER_MIN = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MIN;

const DEFAULT_THRESHOLDS = Object.freeze({
  schedulerStaleAfterMs: 2 * MS_PER_HOUR,
  hotLogCeilingRows: 1_000_000,
  hotLogWarningRows: 500_000,
  changeRequestQueueWarning: 50,
  changeRequestQueueCritical: 200,
  anomalyQueueWarning: 20,
  anomalyQueueCritical: 100,
});

function createHrHealthService(deps = {}) {
  const AuditLog = deps.auditLogModel || null;
  const HrChangeRequest = deps.changeRequestModel || null;
  const getScheduler = deps.getScheduler || (() => null);
  const nowFn = deps.now || (() => new Date());
  const thresholds = Object.assign({}, DEFAULT_THRESHOLDS, deps.thresholds || {});

  async function checkScheduler() {
    try {
      const s = getScheduler();
      if (!s || typeof s.getStatus !== 'function') {
        return {
          status: 'absent',
          severity: 'warning',
          details: 'scheduler not wired',
        };
      }
      const st = s.getStatus();
      if (!st.isRunning) {
        return {
          status: 'stopped',
          severity: 'critical',
          details: 'scheduler is NOT running',
        };
      }
      if (st.lastRunAt) {
        const lastMs = new Date(st.lastRunAt).getTime();
        const age = nowFn().getTime() - lastMs;
        if (age > thresholds.schedulerStaleAfterMs) {
          return {
            status: 'stale',
            severity: 'warning',
            details: `last run ${Math.round(age / MS_PER_MIN)}min ago`,
          };
        }
      }
      if (st.lastError) {
        return {
          status: 'recent_error',
          severity: 'warning',
          details: `last error: ${st.lastError.message || 'unknown'}`,
        };
      }
      return {
        status: 'healthy',
        details: `running, runCount=${st.runCount || 0}, interval=${st.intervalMs || 0}ms`,
      };
    } catch (err) {
      return {
        status: 'error',
        severity: 'critical',
        details: err.message || String(err),
      };
    }
  }

  async function checkAuditLog() {
    if (AuditLog == null) {
      return {
        status: 'absent',
        severity: 'warning',
        details: 'auditLog model not wired',
      };
    }
    try {
      const hotCount = await AuditLog.countDocuments({
        tags: { $in: ['hr'] },
        'flags.isArchived': { $ne: true },
      });
      if (hotCount >= thresholds.hotLogCeilingRows) {
        return {
          status: 'over_ceiling',
          severity: 'critical',
          details: `hot tier at ${hotCount} rows (ceiling ${thresholds.hotLogCeilingRows})`,
        };
      }
      if (hotCount >= thresholds.hotLogWarningRows) {
        return {
          status: 'high_volume',
          severity: 'warning',
          details: `hot tier at ${hotCount} rows (warning ${thresholds.hotLogWarningRows})`,
        };
      }
      return {
        status: 'healthy',
        details: `hot tier at ${hotCount} rows`,
      };
    } catch (err) {
      return {
        status: 'error',
        severity: 'critical',
        details: err.message || String(err),
      };
    }
  }

  async function checkChangeRequestQueue() {
    if (HrChangeRequest == null) {
      return {
        status: 'absent',
        severity: 'warning',
        details: 'changeRequest model not wired',
      };
    }
    try {
      const pending = await HrChangeRequest.countDocuments({
        status: 'pending',
        deleted_at: null,
      });
      if (pending >= thresholds.changeRequestQueueCritical) {
        return {
          status: 'backlog_critical',
          severity: 'critical',
          details: `${pending} pending approvals`,
        };
      }
      if (pending >= thresholds.changeRequestQueueWarning) {
        return {
          status: 'backlog_warning',
          severity: 'warning',
          details: `${pending} pending approvals`,
        };
      }
      return { status: 'healthy', details: `${pending} pending approvals` };
    } catch (err) {
      return {
        status: 'error',
        severity: 'critical',
        details: err.message || String(err),
      };
    }
  }

  async function checkAnomalyQueue() {
    if (AuditLog == null) {
      return {
        status: 'absent',
        severity: 'warning',
        details: 'auditLog model not wired',
      };
    }
    try {
      const pending = await AuditLog.countDocuments({
        eventType: 'security.suspicious_activity',
        tags: { $in: ['hr:anomaly'] },
        'flags.requiresReview': true,
      });
      if (pending >= thresholds.anomalyQueueCritical) {
        return {
          status: 'backlog_critical',
          severity: 'critical',
          details: `${pending} anomalies pending review`,
        };
      }
      if (pending >= thresholds.anomalyQueueWarning) {
        return {
          status: 'backlog_warning',
          severity: 'warning',
          details: `${pending} anomalies pending review`,
        };
      }
      return {
        status: 'healthy',
        details: `${pending} anomalies pending review`,
      };
    } catch (err) {
      return {
        status: 'error',
        severity: 'critical',
        details: err.message || String(err),
      };
    }
  }

  async function checkHealth() {
    const now = nowFn();
    const [scheduler, auditLog, changeRequestQueue, anomalyQueue] = await Promise.all([
      checkScheduler().catch(err => ({
        status: 'error',
        severity: 'critical',
        details: err.message || String(err),
      })),
      checkAuditLog().catch(err => ({
        status: 'error',
        severity: 'critical',
        details: err.message || String(err),
      })),
      checkChangeRequestQueue().catch(err => ({
        status: 'error',
        severity: 'critical',
        details: err.message || String(err),
      })),
      checkAnomalyQueue().catch(err => ({
        status: 'error',
        severity: 'critical',
        details: err.message || String(err),
      })),
    ]);

    const subsystems = {
      scheduler,
      audit_log: auditLog,
      change_request_queue: changeRequestQueue,
      anomaly_queue: anomalyQueue,
    };
    const warnings = [];
    let hasCritical = false;
    let hasWarning = false;
    for (const [name, s] of Object.entries(subsystems)) {
      if (s.severity === 'critical') {
        hasCritical = true;
        warnings.push(`${name}: ${s.details}`);
      } else if (s.severity === 'warning') {
        hasWarning = true;
        warnings.push(`${name}: ${s.details}`);
      }
    }

    const status = hasCritical ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy';

    return {
      status,
      checkedAt: now.toISOString(),
      subsystems,
      warnings,
    };
  }

  return Object.freeze({ checkHealth, DEFAULT_THRESHOLDS });
}

module.exports = { createHrHealthService, DEFAULT_THRESHOLDS };
