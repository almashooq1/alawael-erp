'use strict';

/**
 * hrMetricsService.js — Phase 11 Commit 26 (4.0.43).
 *
 * Prometheus text-exposition format for the HR stack. Enables
 * scraping via Grafana/Prometheus/Datadog/any ops tool that reads
 * the Prometheus 0.0.4 line protocol.
 *
 * Exported metrics:
 *
 *   hr_anomalies_total{reason="..."}              counter — 30d
 *   hr_anomaly_pending_count                       gauge   — right now
 *   hr_anomaly_outcomes_total{outcome="..."}       counter — 30d
 *   hr_anomaly_false_positive_rate_pct             gauge   — 30d
 *   hr_change_requests_total{status="..."}         counter — 30d
 *   hr_change_requests_pending                      gauge   — right now
 *   hr_scheduler_is_running                         gauge   — 0 | 1
 *   hr_scheduler_interval_ms                        gauge   — ms
 *   hr_scheduler_run_count_total                    counter — scheduler-lifetime
 *   hr_scheduler_skip_count_total                   counter — overlap skips
 *   hr_scheduler_last_run_timestamp_seconds         gauge   — unix ts
 *
 * Content-Type: text/plain; version=0.0.4; charset=utf-8
 *
 * Design decisions:
 *
 *   1. Plain-string output, no prom-client dep. The text format is
 *      trivial (~10 lines of escaping) and the project is already
 *      dependency-heavy. Keeping this layer pure means the metrics
 *      surface is unit-testable without a Prometheus mock.
 *
 *   2. DI'd sources: AuditLog model, HrChangeRequest model,
 *      scheduler instance. Any absent → the corresponding metric
 *      block is omitted from the output (NOT emitted as 0). Prometheus
 *      operators prefer "absent" over "fake 0" for alerting-rule
 *      sanity.
 *
 *   3. Label values are escaped per the exposition spec:
 *      backslash, double-quote, newline → escape sequences.
 *
 *   4. Windows intentionally hardcoded to 30d for aggregates — the
 *      /metrics endpoint is a CURRENT state snapshot, not a
 *      configurable query surface. Operators needing historical
 *      query should use the dashboard (C20/C22/C25) instead.
 *
 *   5. Null-safe math. `round1(pct)` on null → null; output
 *      emits `NaN` which Prometheus treats as "no data". Grafana
 *      hides NaN cells which is the desired UX when no decided
 *      outcomes exist yet.
 */

const MS_PER_DAY = 24 * 3600 * 1000;

function escapeLabel(v) {
  if (v == null) return '';
  return String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function fmtNumber(v) {
  if (v == null || (typeof v === 'number' && Number.isNaN(v))) return 'NaN';
  return String(v);
}

function createHrMetricsService(deps = {}) {
  const AuditLog = deps.auditLogModel || null;
  const HrChangeRequest = deps.changeRequestModel || null;
  const scheduler = deps.scheduler || null;
  const nowFn = deps.now || (() => new Date());

  async function storageMetrics() {
    if (!AuditLog) return [];
    try {
      const hrFilter = { tags: { $in: ['hr'] } };
      const [total, hot, archived] = await Promise.all([
        AuditLog.countDocuments(hrFilter),
        AuditLog.countDocuments({ ...hrFilter, 'flags.isArchived': { $ne: true } }),
        AuditLog.countDocuments({ ...hrFilter, 'flags.isArchived': true }),
      ]);
      const lines = [];
      lines.push('# HELP hr_audit_log_total_count Total HR-tagged AuditLog rows (hot + archived)');
      lines.push('# TYPE hr_audit_log_total_count gauge');
      lines.push(`hr_audit_log_total_count ${total}`);
      lines.push('');
      lines.push(
        '# HELP hr_audit_log_hot_count HR AuditLog rows NOT yet archived (0-365d hot tier)'
      );
      lines.push('# TYPE hr_audit_log_hot_count gauge');
      lines.push(`hr_audit_log_hot_count ${hot}`);
      lines.push('');
      lines.push(
        '# HELP hr_audit_log_archived_count HR AuditLog rows in the archive tier (365-1095d)'
      );
      lines.push('# TYPE hr_audit_log_archived_count gauge');
      lines.push(`hr_audit_log_archived_count ${archived}`);
      lines.push('');
      return lines;
    } catch {
      return [];
    }
  }

  async function anomalyMetrics(now) {
    if (!AuditLog) return [];
    const since30 = new Date(now.getTime() - 30 * MS_PER_DAY);
    const match = {
      eventType: 'security.suspicious_activity',
      tags: { $in: ['hr:anomaly'] },
      createdAt: { $gte: since30 },
    };
    const [byReason, outcomes, pending] = await Promise.all([
      AuditLog.aggregate([
        { $match: match },
        { $group: { _id: '$metadata.custom.reason', count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              $ifNull: ['$metadata.custom.review.outcome', 'unreviewed'],
            },
            count: { $sum: 1 },
          },
        },
      ]),
      AuditLog.countDocuments({
        eventType: 'security.suspicious_activity',
        tags: { $in: ['hr:anomaly'] },
        'flags.requiresReview': true,
      }),
    ]);

    const outcomeMap = Object.fromEntries(outcomes.map(o => [o._id, o.count]));
    const decided = (outcomeMap.confirmed_breach || 0) + (outcomeMap.false_positive || 0);
    const fpPct =
      decided > 0 ? Math.round(((outcomeMap.false_positive || 0) / decided) * 100 * 10) / 10 : null;

    const lines = [];
    lines.push('# HELP hr_anomalies_total HR anomaly events over last 30 days, by reason');
    lines.push('# TYPE hr_anomalies_total counter');
    if (byReason.length === 0) {
      lines.push('hr_anomalies_total{reason="__none__"} 0');
    } else {
      for (const row of byReason) {
        const reason = row._id || 'unknown';
        lines.push(`hr_anomalies_total{reason="${escapeLabel(reason)}"} ${row.count}`);
      }
    }
    lines.push('');
    lines.push('# HELP hr_anomaly_pending_count Current count of pending-review anomalies');
    lines.push('# TYPE hr_anomaly_pending_count gauge');
    lines.push(`hr_anomaly_pending_count ${pending}`);
    lines.push('');
    lines.push('# HELP hr_anomaly_outcomes_total Review outcomes over last 30 days');
    lines.push('# TYPE hr_anomaly_outcomes_total counter');
    const outcomeKeys = [
      'confirmed_breach',
      'false_positive',
      'needs_investigation',
      'policy_exception',
      'unreviewed',
    ];
    for (const key of outcomeKeys) {
      lines.push(
        `hr_anomaly_outcomes_total{outcome="${escapeLabel(key)}"} ${outcomeMap[key] || 0}`
      );
    }
    lines.push('');
    lines.push(
      '# HELP hr_anomaly_false_positive_rate_pct FP / (confirmed + FP) × 100 over last 30 days'
    );
    lines.push('# TYPE hr_anomaly_false_positive_rate_pct gauge');
    lines.push(`hr_anomaly_false_positive_rate_pct ${fmtNumber(fpPct)}`);
    lines.push('');
    return lines;
  }

  async function changeRequestMetrics() {
    if (!HrChangeRequest) return [];
    const since30 = new Date(nowFn().getTime() - 30 * MS_PER_DAY);
    const [byStatus, pending] = await Promise.all([
      HrChangeRequest.aggregate([
        { $match: { deleted_at: null, createdAt: { $gte: since30 } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      HrChangeRequest.countDocuments({ status: 'pending', deleted_at: null }),
    ]);

    const lines = [];
    lines.push(
      '# HELP hr_change_requests_total Change requests created in last 30 days, by status'
    );
    lines.push('# TYPE hr_change_requests_total counter');
    const statusKeys = ['pending', 'approved', 'rejected', 'applied', 'cancelled'];
    const statusMap = Object.fromEntries(byStatus.map(s => [s._id, s.count]));
    for (const key of statusKeys) {
      lines.push(`hr_change_requests_total{status="${escapeLabel(key)}"} ${statusMap[key] || 0}`);
    }
    lines.push('');
    lines.push('# HELP hr_change_requests_pending Current pending-approval queue depth');
    lines.push('# TYPE hr_change_requests_pending gauge');
    lines.push(`hr_change_requests_pending ${pending}`);
    lines.push('');
    return lines;
  }

  function schedulerMetrics() {
    if (!scheduler || typeof scheduler.getStatus !== 'function') return [];
    const s = scheduler.getStatus();
    const lines = [];
    lines.push(
      '# HELP hr_scheduler_is_running Whether the HR anomaly scheduler is currently running'
    );
    lines.push('# TYPE hr_scheduler_is_running gauge');
    lines.push(`hr_scheduler_is_running ${s.isRunning ? 1 : 0}`);
    lines.push('');
    lines.push('# HELP hr_scheduler_interval_ms Scheduler interval in milliseconds');
    lines.push('# TYPE hr_scheduler_interval_ms gauge');
    lines.push(`hr_scheduler_interval_ms ${s.intervalMs || 0}`);
    lines.push('');
    lines.push('# HELP hr_scheduler_run_count_total Scheduler lifetime run count');
    lines.push('# TYPE hr_scheduler_run_count_total counter');
    lines.push(`hr_scheduler_run_count_total ${s.runCount || 0}`);
    lines.push('');
    lines.push('# HELP hr_scheduler_skip_count_total Scheduler overlap-skip count');
    lines.push('# TYPE hr_scheduler_skip_count_total counter');
    lines.push(`hr_scheduler_skip_count_total ${s.skipCount || 0}`);
    lines.push('');
    if (s.lastRunAt) {
      const ts = Math.floor(new Date(s.lastRunAt).getTime() / 1000);
      lines.push('# HELP hr_scheduler_last_run_timestamp_seconds Unix timestamp of last run');
      lines.push('# TYPE hr_scheduler_last_run_timestamp_seconds gauge');
      lines.push(`hr_scheduler_last_run_timestamp_seconds ${ts}`);
      lines.push('');
    }
    return lines;
  }

  async function buildPrometheusText() {
    const now = nowFn();
    const [anomaly, changeReq, sched, storage] = await Promise.all([
      anomalyMetrics(now),
      changeRequestMetrics(),
      Promise.resolve(schedulerMetrics()),
      storageMetrics(),
    ]);
    return [...anomaly, ...changeReq, ...sched, ...storage].join('\n');
  }

  return Object.freeze({ buildPrometheusText });
}

module.exports = { createHrMetricsService };
