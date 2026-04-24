'use strict';

/**
 * hr-config-inspector.test.js — Phase 11 Commit 32 (4.0.49).
 *
 * Pure unit + supertest route coverage for the HR config
 * inspector. No DB.
 */

const express = require('express');
const request = require('supertest');

const { createHrConfigService } = require('../services/hr/hrConfigService');
const { createHrOpsRouter } = require('../routes/hr/hr-ops.routes');
const { ROLES } = require('../config/rbac.config');

// Helper to isolate env mutations per-test
function withEnv(overrides, fn) {
  const saved = {};
  for (const key of Object.keys(overrides)) {
    saved[key] = process.env[key];
    if (overrides[key] === undefined) delete process.env[key];
    else process.env[key] = overrides[key];
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

// ─── Service — shape + defaults ─────────────────────────────────

describe('hrConfigService — baseline shape', () => {
  it('returns a frozen getConfig function', () => {
    const svc = createHrConfigService();
    expect(typeof svc.getConfig).toBe('function');
    expect(() => {
      svc.getConfig = null;
    }).toThrow();
  });

  it('has sections: anomaly_detection, retention, health, approval', () => {
    const cfg = createHrConfigService().getConfig();
    expect(cfg.sections.anomaly_detection).toBeDefined();
    expect(cfg.sections.retention).toBeDefined();
    expect(cfg.sections.health).toBeDefined();
    expect(cfg.sections.approval).toBeDefined();
  });

  it('generated_at is an ISO timestamp', () => {
    const cfg = createHrConfigService().getConfig();
    expect(new Date(cfg.generated_at).toISOString()).toBe(cfg.generated_at);
  });

  it('build section surfaces NODE_ENV', () => {
    const cfg = createHrConfigService().getConfig();
    expect(cfg.build.node_env).toBeDefined();
  });
});

// ─── Anomaly detection defaults ─────────────────────────────────

describe('anomaly_detection defaults', () => {
  it('reports defaults when no env override', async () => {
    await withEnv(
      {
        HR_ANOMALY_SCHEDULER_ENABLED: undefined,
        HR_ANOMALY_INTERVAL_MS: undefined,
        HR_ANOMALY_WINDOW_MINUTES: undefined,
        HR_ANOMALY_READS_PER_HOUR: undefined,
        HR_ANOMALY_EXPORTS_PER_DAY: undefined,
        HR_ANOMALY_COOLDOWN_MINUTES: undefined,
      },
      () => {
        const a = createHrConfigService().getConfig().sections.anomaly_detection;
        expect(a.scheduler_enabled.value).toBe(true);
        expect(a.scheduler_enabled.source).toBe('default');
        expect(a.interval_ms.value).toBe(15 * 60 * 1000);
        expect(a.interval_ms.source).toBe('default');
        expect(a.window_minutes.value).toBe(60);
        expect(a.reads_per_hour_threshold.value).toBe(100);
        expect(a.exports_per_day_threshold.value).toBe(5);
        expect(a.cooldown_minutes.value).toBe(60);
      }
    );
  });

  it('env overrides flip source to env + parse values', async () => {
    await withEnv(
      {
        HR_ANOMALY_INTERVAL_MS: '300000',
        HR_ANOMALY_READS_PER_HOUR: '50',
      },
      () => {
        const a = createHrConfigService().getConfig().sections.anomaly_detection;
        expect(a.interval_ms.value).toBe(300000);
        expect(a.interval_ms.source).toBe('env');
        expect(a.interval_ms.raw).toBe('300000');
        expect(a.reads_per_hour_threshold.value).toBe(50);
        expect(a.reads_per_hour_threshold.source).toBe('env');
      }
    );
  });

  it('HR_ANOMALY_SCHEDULER_ENABLED=false disables scheduler flag', async () => {
    await withEnv({ HR_ANOMALY_SCHEDULER_ENABLED: 'false' }, () => {
      const a = createHrConfigService().getConfig().sections.anomaly_detection;
      expect(a.scheduler_enabled.value).toBe(false);
      expect(a.scheduler_enabled.source).toBe('env');
    });
  });

  it('falls back to default value + keeps raw when env value cannot be parsed', async () => {
    await withEnv({ HR_ANOMALY_READS_PER_HOUR: 'not-a-number' }, () => {
      const a = createHrConfigService().getConfig().sections.anomaly_detection;
      expect(a.reads_per_hour_threshold.value).toBe(100);
      expect(a.reads_per_hour_threshold.source).toBe('default');
      expect(a.reads_per_hour_threshold.raw).toBe('not-a-number');
    });
  });
});

// ─── Retention ──────────────────────────────────────────────────

describe('retention', () => {
  it('defaults + env overrides', async () => {
    await withEnv(
      {
        HR_AUDIT_ARCHIVE_AFTER_DAYS: undefined,
        HR_AUDIT_PURGE_AFTER_DAYS: '730',
      },
      () => {
        const r = createHrConfigService().getConfig().sections.retention;
        expect(r.archive_after_days.value).toBe(365);
        expect(r.archive_after_days.source).toBe('default');
        expect(r.purge_after_days.value).toBe(730);
        expect(r.purge_after_days.source).toBe('env');
      }
    );
  });

  it('adaptive sub-section exposes floor + thresholds', () => {
    const r = createHrConfigService().getConfig().sections.retention;
    expect(r.adaptive.baseline_archive_after_days).toBe(365);
    expect(r.adaptive.warning_threshold_rows).toBe(500_000);
    expect(r.adaptive.ceiling_threshold_rows).toBe(1_000_000);
    expect(r.adaptive.floor_days).toBe(180);
    expect(r.adaptive.tighten_warning_factor).toBe(0.8);
    expect(r.adaptive.tighten_ceiling_factor).toBe(0.6);
    expect(r.adaptive.source).toBe('default');
  });
});

// ─── Health + Approval ──────────────────────────────────────────

describe('health + approval sections', () => {
  it('health thresholds surface with source=default', () => {
    const h = createHrConfigService().getConfig().sections.health;
    expect(h.hot_log_ceiling_rows.value).toBe(1_000_000);
    expect(h.hot_log_warning_rows.value).toBe(500_000);
    expect(h.change_request_queue_warning.value).toBe(50);
    expect(h.change_request_queue_critical.value).toBe(200);
    expect(h.anomaly_queue_warning.value).toBe(20);
    expect(h.anomaly_queue_critical.value).toBe(100);
    expect(h.scheduler_stale_after_ms.value).toBe(2 * 60 * 60 * 1000);
  });

  it('approval section lists all rule ids', () => {
    const a = createHrConfigService().getConfig().sections.approval;
    expect(a.rules_count).toBeGreaterThanOrEqual(7);
    expect(a.rule_ids).toEqual(
      expect.arrayContaining([
        'salary.increase_gt_15pct',
        'employment.termination',
        'employment.branch_transfer',
      ])
    );
    expect(a.source).toBe('code');
  });
});

// ─── Route layer ────────────────────────────────────────────────

describe('GET /hr/ops/config route', () => {
  function buildApp({ user, service }) {
    const app = express();
    app.use(express.json());
    if (user) {
      app.use((req, _res, next) => {
        req.user = user;
        next();
      });
    }
    app.use(
      createHrOpsRouter({
        resolveScheduler: () => null,
        configService: service,
      })
    );
    return app;
  }

  it('401 without auth', async () => {
    const res = await request(buildApp({ service: createHrConfigService() })).get('/ops/config');
    expect(res.status).toBe(401);
  });

  it('403 for non-manager role', async () => {
    const res = await request(
      buildApp({
        user: { id: 'u', role: ROLES.HR_OFFICER },
        service: createHrConfigService(),
      })
    ).get('/ops/config');
    expect(res.status).toBe(403);
  });

  it('503 when config service not wired', async () => {
    const res = await request(
      buildApp({ user: { id: 'u', role: ROLES.HR_MANAGER }, service: null })
    ).get('/ops/config');
    expect(res.status).toBe(503);
  });

  it('200 returns full config payload for MANAGER tier', async () => {
    const res = await request(
      buildApp({
        user: { id: 'u', role: ROLES.HR_MANAGER },
        service: createHrConfigService(),
      })
    ).get('/ops/config');
    expect(res.status).toBe(200);
    expect(res.body.sections.anomaly_detection).toBeDefined();
    expect(res.body.sections.retention).toBeDefined();
    expect(res.body.sections.health).toBeDefined();
    expect(res.body.sections.approval).toBeDefined();
    expect(res.body.build).toBeDefined();
    expect(res.body.generated_at).toBeDefined();
  });

  it('supports SUPER_ADMIN + COMPLIANCE_OFFICER + GROUP_CHRO', async () => {
    for (const role of [
      ROLES.SUPER_ADMIN,
      ROLES.HEAD_OFFICE_ADMIN,
      ROLES.COMPLIANCE_OFFICER,
      ROLES.GROUP_CHRO,
      ROLES.HR_SUPERVISOR,
    ]) {
      const res = await request(
        buildApp({ user: { id: 'u', role }, service: createHrConfigService() })
      ).get('/ops/config');
      expect(res.status).toBe(200);
    }
  });
});
