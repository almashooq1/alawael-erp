'use strict';
/**
 * ops-schedulers.routes.js — Wave 310
 *
 * Operator-facing scheduler health overview. One read endpoint:
 *
 *   GET /api/ops/schedulers
 *     → { items: [{ key, nameAr, envFlag, enabled, defaults, notes }] }
 *
 * The response is *declarative* — it lists the schedulers the codebase
 * knows about and reports whether their ENABLE_* env flag is set in the
 * current process. It does NOT call into the scheduler internals (some
 * are not introspectable yet); that's a follow-up.
 *
 * Pairs with the W310 frontend CronStatusPage which renders this list
 * + cross-references the W302 /api/v1/hr/ops/metrics counters to show
 * recent activity.
 */

const express = require('express');

function bool(envValue) {
  return envValue === '1' || envValue === 'true' || envValue === 'TRUE';
}

function createOpsSchedulersRouter() {
  const router = express.Router();

  router.get('/schedulers', (_req, res) => {
    const env = process.env;
    // W315 — pull live last-run telemetry from the central registry. Schedulers
    // that haven't opted in (haven't called schedulerRegistry.register) simply
    // get `liveStatus: null` and the UI degrades gracefully.
    let liveByKey = {};
    // W319 — also surface a derived health verdict per entry so the UI can
    // render a single-glance traffic light without re-deriving thresholds.
    let healthByKey = {};
    try {
      const schedulerRegistry = require('../intelligence/scheduler-registry');
      schedulerRegistry.getAll().forEach(entry => {
        liveByKey[entry.key] = entry;
        healthByKey[entry.key] = schedulerRegistry.health(entry);
      });
    } catch {
      liveByKey = {};
      healthByKey = {};
    }

    const items = [
      {
        key: 'audit-chain-archiver',
        nameAr: 'مؤرشف سلسلة التدقيق',
        nameEn: 'Audit Chain Archiver',
        envFlag: 'ENABLE_AUDIT_CHAIN_ARCHIVE',
        enabled: bool(env.ENABLE_AUDIT_CHAIN_ARCHIVE),
        defaults: {
          retentionDays: parseInt(env.AUDIT_CHAIN_ARCHIVE_DAYS || '1825', 10),
          deleteAfterArchive: bool(env.AUDIT_CHAIN_ARCHIVE_DELETE),
          schedule: 'daily @ 02:00 Asia/Riyadh',
        },
        notes: 'W303 — archives PlanReviewAck rows older than retention to blob storage',
      },
      {
        key: 'risk-sweeper',
        nameAr: 'كاسح المخاطر',
        nameEn: 'Risk Sweeper',
        envFlag: 'ENABLE_RISK_SWEEP_CRON',
        enabled: bool(env.ENABLE_RISK_SWEEP_CRON),
        defaults: {
          schedule: 'hourly',
        },
        notes: 'W290-W297 — auto-opens CRITICAL plan reviews on risk signals',
      },
      {
        key: 'mudad-wps',
        nameAr: 'تحميل ودي شهري',
        nameEn: 'Mudad WPS Monthly Upload',
        envFlag: 'ENABLE_MUDAD_CRON',
        enabled: bool(env.ENABLE_MUDAD_CRON),
        defaults: {
          schedule: 'monthly day 25 @ 02:30 Asia/Riyadh',
          branches: (env.MUDAD_BRANCH_IDS || '').split(',').filter(Boolean),
        },
        notes: 'W282b — submits WPS salary information file to SAMA Mudad',
      },
      {
        key: 'disability-authority-monthly',
        nameAr: 'تقرير الهيئة الشهري',
        nameEn: 'Disability Authority Monthly Report',
        envFlag: 'ENABLE_DA_PERIODIC_CRON',
        enabled: bool(env.ENABLE_DA_PERIODIC_CRON),
        defaults: {
          schedule: 'monthly day 5 @ 04:00 Asia/Riyadh',
          branches: (env.DA_REPORTING_BRANCH_IDS || '').split(',').filter(Boolean),
        },
        notes: 'W286 — submits periodic report to Authority of People with Disabilities',
      },
      {
        key: 'speech-retention-sweeper',
        nameAr: 'كاسح حفظ التسجيلات الصوتية',
        nameEn: 'Speech Retention Sweeper',
        envFlag: 'ENABLE_SPEECH_RETENTION_CRON',
        enabled: bool(env.ENABLE_SPEECH_RETENTION_CRON),
        defaults: {
          schedule: 'daily @ 03:00 Asia/Riyadh',
        },
        notes: 'W284c — purges expired speech-session recordings from S3 + Mongo',
      },
      {
        key: 'hr-anomaly-scheduler',
        nameAr: 'كاشف الشذوذ للموارد البشرية',
        nameEn: 'HR Anomaly Scheduler',
        envFlag: 'HR_ANOMALY_SCHEDULER_ENABLED',
        // Opt-out flag: ON by default unless explicitly set to "false".
        enabled: env.HR_ANOMALY_SCHEDULER_ENABLED !== 'false',
        defaults: {
          schedule: 'every N minutes (configurable)',
        },
        notes: 'Phase 11 C24 — also exposes /api/v1/hr/ops/anomaly-scheduler for live status',
      },
    ];

    res.json({
      generatedAt: new Date().toISOString(),
      total: items.length,
      enabled: items.filter(i => i.enabled).length,
      items: items.map(i => ({
        ...i,
        liveStatus: liveByKey[i.key]
          ? {
              lastRunAt: liveByKey[i.key].lastRunAt,
              lastStatus: liveByKey[i.key].lastStatus,
              lastError: liveByKey[i.key].lastError,
              lastDurationMs: liveByKey[i.key].lastDurationMs,
              runs: liveByKey[i.key].runs,
              failures: liveByKey[i.key].failures,
              health: healthByKey[i.key] || 'never-run',
            }
          : null,
      })),
    });
  });

  // W321 — uptime-monitor hook. Returns HTTP 200 when every *enabled+registered*
  // scheduler is `ok` or `never-run`, HTTP 503 if any is `failed` or `stale`.
  // Designed for a Pingdom/UptimeRobot-style HEAD/GET probe: small payload,
  // single status code, no auth (mount behind ops-only path if needed).
  router.get('/schedulers/health', (_req, res) => {
    let entries = [];
    try {
      const schedulerRegistry = require('../intelligence/scheduler-registry');
      entries = schedulerRegistry.getAll().map(e => ({
        key: e.key,
        health: schedulerRegistry.health(e),
      }));
    } catch {
      entries = [];
    }
    const degraded = entries.filter(e => e.health === 'failed' || e.health === 'stale');
    const status = degraded.length === 0 ? 'ok' : 'degraded';
    res.status(degraded.length === 0 ? 200 : 503).json({
      status,
      checkedAt: new Date().toISOString(),
      total: entries.length,
      degraded: degraded.length,
      entries,
    });
  });

  return router;
}

module.exports = { createOpsSchedulersRouter };
