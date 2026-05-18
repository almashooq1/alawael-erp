'use strict';

/**
 * hikvision-anomaly-detector.service.js — Wave 113.
 *
 * Waves 111-112 gave us observability (per-branch + org-wide
 * snapshots). This wave gives us alerting — detection rules that
 * scan the same signals and surface anomalies operators need to
 * act on.
 *
 * Read-only. No new model. Pure rule application over existing
 * service queries. Output is a deterministic list of anomalies
 * keyed by a stable dedup string so re-running the detector
 * returns the same id for the same underlying issue.
 *
 * Rule catalogue (8):
 *
 *   1. CIRCUIT_OPEN_CLUSTER     ≥ N stream clients in circuit-open
 *                               (default N=3). severity=critical.
 *   2. STREAM_ERRORS_SPIKE      any single device with ≥ N parse
 *                               errors (default N=25). severity=
 *                               warning.
 *   3. SYNC_DRIFT_HIGH          ≥ X% of libraries have drift
 *                               (default 50%). severity=warning.
 *   4. FRAUD_CRITICAL           any employee in band=critical.
 *                               severity=critical (per-employee
 *                               anomaly so they show as a list).
 *   5. REVIEW_QUEUE_STALE       oldest open review older than N
 *                               hours (default 24h). severity=
 *                               warning.
 *   6. RECONCILIATION_BACKLOG   ≥ N open reconciliation cases.
 *                               severity=warning.
 *   7. SCHEDULER_FAILURE        any scheduler job latest=failed.
 *                               severity=warning.
 *   8. NO_STREAM_DEVICES        supervisor running but 0 devices
 *                               attached. severity=info (config
 *                               issue, not an outage).
 *
 * Public API:
 *   detect()  →  { ok, generatedAt, items: [Anomaly] }
 *
 *   Anomaly = {
 *     id,                       deterministic stable dedup key
 *     kind,                     ANOMALY_KIND
 *     severity,                 ANOMALY_SEVERITY
 *     summaryAr,                short Arabic summary for ops
 *     details,                  rule-specific shape
 *     suggestedAction,          short Arabic operator hint
 *     deepLink,                 path the UI links to
 *     detectedAt,               ISO timestamp
 *   }
 *
 * Caches the result for 30s to make rapid polling cheap.
 */

const reg = require('./hikvision.registry');

function createHikvisionAnomalyDetector({
  orgSummaryService = null, // Wave 112 — primary source
  streamSupervisor = null, // Wave 109 — for per-device error spike
  thresholds = reg.ANOMALY_THRESHOLDS,
  cacheTtlMs = 30_000,
  logger = console,
  now = () => new Date(),
} = {}) {
  let cache = null;

  function _cacheGet() {
    if (!cache) return null;
    if (now().getTime() > cache.expiresAt) {
      cache = null;
      return null;
    }
    return cache.value;
  }

  function _cacheSet(value) {
    cache = { value, expiresAt: now().getTime() + cacheTtlMs };
  }

  function _clearCache() {
    cache = null;
  }

  function _makeAnomaly({
    kind,
    severity,
    summaryAr,
    details,
    suggestedAction,
    deepLink,
    dedupSeed,
  }) {
    return {
      id: `${kind}:${dedupSeed}`,
      kind,
      severity,
      summaryAr,
      details,
      suggestedAction,
      deepLink,
      detectedAt: now().toISOString(),
    };
  }

  // ─── Rules ───────────────────────────────────────────────────

  function _circuitOpenCluster(snapshot) {
    const items = [];
    if (!snapshot.stream || !snapshot.stream.ok) return items;
    const byState = snapshot.stream.byState || {};
    const count =
      (byState[reg.STREAM_STATE.CIRCUIT_OPEN] || 0) + (byState[reg.STREAM_STATE.HALF_OPEN] || 0);
    if (count >= thresholds.CIRCUIT_OPEN_CLUSTER_MIN) {
      items.push(
        _makeAnomaly({
          kind: reg.ANOMALY_KIND.CIRCUIT_OPEN_CLUSTER,
          severity: reg.ANOMALY_SEVERITY.CRITICAL,
          summaryAr: `${count} جهازًا في circuit-open — مجموعة فشل واسعة`,
          details: { affectedDevices: count, threshold: thresholds.CIRCUIT_OPEN_CLUSTER_MIN },
          suggestedAction:
            'تحقق من حالة الشبكة + بيانات الاعتماد. افتح صفحة البث لمعرفة الأجهزة المتأثرة.',
          deepLink: '/hikvision/stream',
          dedupSeed: 'global',
        })
      );
    }
    return items;
  }

  function _streamErrorsSpike() {
    const items = [];
    if (!streamSupervisor || typeof streamSupervisor.getStatus !== 'function') return items;
    let status;
    try {
      status = streamSupervisor.getStatus();
    } catch (err) {
      logger.warn(`[anomaly] streamSupervisor.getStatus threw: ${err.message}`);
      return items;
    }
    for (const it of status.items || []) {
      if ((it.parseErrors || 0) >= thresholds.STREAM_ERRORS_SPIKE_MIN) {
        items.push(
          _makeAnomaly({
            kind: reg.ANOMALY_KIND.STREAM_ERRORS_SPIKE,
            severity: reg.ANOMALY_SEVERITY.WARNING,
            summaryAr: `الجهاز ${it.deviceCode}: ${it.parseErrors} خطأ parse`,
            details: { deviceCode: it.deviceCode, parseErrors: it.parseErrors, state: it.state },
            suggestedAction:
              'افتح الجهاز في صفحة البث، وتحقق من إصدار firmware + ضبط الـ multipart boundary.',
            deepLink: `/hikvision/stream`,
            dedupSeed: String(it.deviceCode || 'unknown'),
          })
        );
      }
    }
    return items;
  }

  function _syncDriftHigh(snapshot) {
    const items = [];
    if (!snapshot.sync || !snapshot.sync.ok) return items;
    const scanned = snapshot.sync.librariesScanned || 0;
    const withDrift = snapshot.sync.withDrift || 0;
    if (scanned === 0) return items;
    const pct = withDrift / scanned;
    if (pct >= thresholds.SYNC_DRIFT_PCT_HIGH) {
      items.push(
        _makeAnomaly({
          kind: reg.ANOMALY_KIND.SYNC_DRIFT_HIGH,
          severity: reg.ANOMALY_SEVERITY.WARNING,
          summaryAr: `${Math.round(pct * 100)}% من المكتبات بها drift (${withDrift} من ${scanned})`,
          details: { scanned, withDrift, pct: Number(pct.toFixed(2)) },
          suggestedAction:
            'شغّل مزامنة فورية على المكتبات المتأثرة من صفحة sync/runner، أو راجع cron schedule.',
          deepLink: '/hikvision/sync/drift',
          dedupSeed: 'global',
        })
      );
    }
    return items;
  }

  function _fraudCritical(snapshot) {
    const items = [];
    if (!snapshot.fraud || !snapshot.fraud.ok) return items;
    const top = snapshot.fraud.topEmployees || [];
    for (const e of top) {
      if (e.band === reg.FRAUD_SEVERITY.CRITICAL) {
        items.push(
          _makeAnomaly({
            kind: reg.ANOMALY_KIND.FRAUD_CRITICAL,
            severity: reg.ANOMALY_SEVERITY.CRITICAL,
            summaryAr: `موظف ${String(e.employeeId).slice(0, 10)}… بدرجة ${e.currentScore} (critical)`,
            details: {
              employeeId: e.employeeId,
              branchId: e.branchId,
              currentScore: e.currentScore,
            },
            suggestedAction:
              'افتح صفحة الموظف وراجع flags النشطة. إذا كانت false-positive، dismiss مع note.',
            deepLink: `/hikvision/fraud/scores/${encodeURIComponent(e.employeeId)}`,
            dedupSeed: String(e.employeeId),
          })
        );
      }
    }
    return items;
  }

  function _reviewQueueStale(snapshot) {
    const items = [];
    if (!snapshot.reviews || !snapshot.reviews.ok) return items;
    const oldestStr = snapshot.reviews.oldestOpenAt;
    if (!oldestStr) return items;
    const oldest = new Date(oldestStr);
    if (Number.isNaN(oldest.getTime())) return items;
    const ageHours = (now().getTime() - oldest.getTime()) / 3_600_000;
    if (ageHours >= thresholds.REVIEW_QUEUE_STALE_HOURS) {
      items.push(
        _makeAnomaly({
          kind: reg.ANOMALY_KIND.REVIEW_QUEUE_STALE,
          severity: reg.ANOMALY_SEVERITY.WARNING,
          summaryAr: `أقدم مراجعة مفتوحة عمرها ${Math.floor(ageHours)} ساعة`,
          details: {
            oldestOpenAt: oldestStr,
            ageHours: Number(ageHours.toFixed(1)),
            totalOpen: snapshot.reviews.totalOpen,
          },
          suggestedAction:
            'وزّع طابور المراجعة على المشرفين أو ارفع المؤجل للأمن. SLA الافتراضي 24 ساعة.',
          deepLink: '/hikvision/reviews',
          dedupSeed: 'global',
        })
      );
    }
    return items;
  }

  function _reconciliationBacklog(snapshot) {
    const items = [];
    if (!snapshot.reconciliation || !snapshot.reconciliation.ok) return items;
    const open = snapshot.reconciliation.totalOpen || 0;
    if (open >= thresholds.RECONCILIATION_BACKLOG_MIN) {
      items.push(
        _makeAnomaly({
          kind: reg.ANOMALY_KIND.RECONCILIATION_BACKLOG,
          severity: reg.ANOMALY_SEVERITY.WARNING,
          summaryAr: `${open} حالة تسوية حضور مفتوحة — backlog كبير`,
          details: { totalOpen: open, threshold: thresholds.RECONCILIATION_BACKLOG_MIN },
          suggestedAction: 'افتح صفحة التسوية وحلّ الحالات أو شغّل override جماعي بعد مراجعة HR.',
          deepLink: '/hikvision/reconciliation',
          dedupSeed: 'global',
        })
      );
    }
    return items;
  }

  function _schedulerFailure(snapshot) {
    const items = [];
    if (!snapshot.scheduler || !snapshot.scheduler.ok) return items;
    const failed = snapshot.scheduler.jobsFailedRecent || 0;
    if (failed > 0) {
      items.push(
        _makeAnomaly({
          kind: reg.ANOMALY_KIND.SCHEDULER_FAILURE,
          severity: reg.ANOMALY_SEVERITY.WARNING,
          summaryAr: `${failed} مهمة scheduler فشلت في آخر تشغيل`,
          details: {
            failedCount: failed,
            jobs: (snapshot.scheduler.items || [])
              .filter(j => j.latest && j.latest.status === reg.JOB_STATUS.FAILED)
              .map(j => ({ id: j.id, labelAr: j.labelAr })),
          },
          suggestedAction: 'افتح صفحة المهام وراجع سبب الفشل، ثم شغّل المهمة يدوياً للتعافي.',
          deepLink: '/hikvision/sync', // jobs status surfaced via sync hub for now
          dedupSeed: 'global',
        })
      );
    }
    return items;
  }

  function _noStreamDevices(snapshot) {
    const items = [];
    if (!snapshot.stream || !snapshot.stream.ok) return items;
    if (!snapshot.stream.running) return items;
    if ((snapshot.stream.totalDevices || 0) === 0) {
      items.push(
        _makeAnomaly({
          kind: reg.ANOMALY_KIND.NO_STREAM_DEVICES,
          severity: reg.ANOMALY_SEVERITY.INFO,
          summaryAr: 'الـ supervisor يعمل لكن لا يوجد أجهزة مرتبطة',
          details: { running: true, totalDevices: 0 },
          suggestedAction:
            'تحقق من HIKVISION_STREAM_DEVICE_FILTER، أو سجّل أجهزة، أو شغّل refresh من صفحة البث.',
          deepLink: '/hikvision/stream',
          dedupSeed: 'global',
        })
      );
    }
    return items;
  }

  // ─── Public ──────────────────────────────────────────────────

  async function detect({ skipCache = false } = {}) {
    if (!skipCache) {
      const hit = _cacheGet();
      if (hit) return hit;
    }
    if (!orgSummaryService || typeof orgSummaryService.snapshot !== 'function') {
      return {
        ok: false,
        reason: reg.REASON.ANOMALY_DETECTOR_UNAVAILABLE,
        message: 'orgSummaryService is required',
      };
    }
    let snapshot;
    try {
      snapshot = await orgSummaryService.snapshot();
    } catch (err) {
      logger.warn(`[anomaly] org-summary failed: ${err.message}`);
      return {
        ok: false,
        reason: reg.REASON.ANOMALY_DETECTOR_UNAVAILABLE,
        message: err.message,
      };
    }

    const items = [
      ..._circuitOpenCluster(snapshot),
      ..._streamErrorsSpike(),
      ..._syncDriftHigh(snapshot),
      ..._fraudCritical(snapshot),
      ..._reviewQueueStale(snapshot),
      ..._reconciliationBacklog(snapshot),
      ..._schedulerFailure(snapshot),
      ..._noStreamDevices(snapshot),
    ];

    // Sort by severity (critical > warning > info), then by kind.
    const sevRank = { critical: 0, warning: 1, info: 2 };
    items.sort((a, b) => {
      const sa = sevRank[a.severity] ?? 99;
      const sb = sevRank[b.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return a.kind.localeCompare(b.kind);
    });

    const value = {
      ok: true,
      generatedAt: now().toISOString(),
      items,
      summary: {
        total: items.length,
        critical: items.filter(a => a.severity === reg.ANOMALY_SEVERITY.CRITICAL).length,
        warning: items.filter(a => a.severity === reg.ANOMALY_SEVERITY.WARNING).length,
        info: items.filter(a => a.severity === reg.ANOMALY_SEVERITY.INFO).length,
      },
    };
    _cacheSet(value);
    return value;
  }

  return { detect, _clearCache };
}

module.exports = { createHikvisionAnomalyDetector };
