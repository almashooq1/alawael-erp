/**
 * drilldown-wave21.test.js — Wave 21.
 *
 * Tests for the Drill-Down Architecture:
 *
 *   1. Registry shape — every entry has levels/owner/actions/drivers
 *      and the levels are valid + ordered shallow→deep.
 *   2. Service:
 *      • substitutePath does URL-safe replacement of :params
 *      • resolveNextLevel walks the ladder + handles terminal
 *      • resolveLevel jumps to a named level
 *      • resolveOwner walks direct → role → fallback chain
 *      • getActions substitutes :params in deepLinks
 *      • invokeAction calls auditLogger.log
 *   3. Routes:
 *      • GET /              — listed KPIs match registry
 *      • GET /:kpiId        — full bundle returned
 *      • GET /:kpiId/next   — 200 on valid, 404 on unknown KPI, 409 on terminal
 *      • POST /:kpiId/actions/:actionId/invoke — logs to audit + returns deepLink
 *      • Disallowed query params are stripped (no smuggled :placeholder)
 */

'use strict';

const express = require('express');
const request = require('supertest');

const drillRegistry = require('../intelligence/drilldown.registry');
const { createDrilldownService, substitutePath } = require('../intelligence/drilldown.service');
const { createDrilldownRouter } = require('../routes/drilldown.routes');

// ─── 1. Registry shape ─────────────────────────────────────────

describe('drilldown.registry — shape', () => {
  const allKpis = drillRegistry.listRegisteredKpis();

  test('exports ≥ 12 priority KPIs', () => {
    expect(allKpis.length).toBeGreaterThanOrEqual(12);
  });

  test.each(allKpis)('%s — has required fields', kpiId => {
    const m = drillRegistry.getKpiDrillMetadata(kpiId);
    expect(m).toBeTruthy();
    expect(typeof m.titleAr).toBe('string');
    expect(typeof m.titleEn).toBe('string');
    expect(drillRegistry.CATEGORIES).toContain(m.category);
    expect(Array.isArray(m.levels)).toBe(true);
    expect(m.levels.length).toBeGreaterThan(0);
    expect(m.owner && typeof m.owner.role).toBe('string');
    expect(Array.isArray(m.drivers)).toBe(true);
    expect(Array.isArray(m.actions)).toBe(true);
    expect(Array.isArray(m.relatedGeneratorIds)).toBe(true);
  });

  test.each(allKpis)('%s — levels are shallow→deep', kpiId => {
    const levels = drillRegistry.getKpiDrillMetadata(kpiId).levels;
    const order = ['executive', 'branch', 'unit', 'entity-list', 'record'];
    for (let i = 1; i < levels.length; i++) {
      expect(order.indexOf(levels[i].level)).toBeGreaterThan(order.indexOf(levels[i - 1].level));
    }
  });

  test.each(allKpis)('%s — every action has id + titles + severity', kpiId => {
    const actions = drillRegistry.getKpiDrillMetadata(kpiId).actions;
    for (const a of actions) {
      expect(a.id).toBeTruthy();
      expect(a.titleAr).toBeTruthy();
      expect(a.titleEn).toBeTruthy();
      expect(drillRegistry.ACTION_SEVERITIES).toContain(a.severity);
      expect(typeof a.deepLink).toBe('string');
    }
  });
});

// ─── 2. Service — substitutePath ──────────────────────────────

describe('drilldown.service — substitutePath', () => {
  test('substitutes single param', () => {
    expect(substitutePath('/care/360/:beneficiaryId', { beneficiaryId: 'b1' })).toBe(
      '/care/360/b1'
    );
  });

  test('substitutes multiple params', () => {
    expect(
      substitutePath('/dashboards/branch/:branchId/units/:unitId', {
        branchId: 'b1',
        unitId: 'u2',
      })
    ).toBe('/dashboards/branch/b1/units/u2');
  });

  test('URL-encodes unsafe chars', () => {
    expect(substitutePath('/filter/:q', { q: 'a b/c' })).toBe('/filter/a%20b%2Fc');
  });

  test('leaves placeholder when param missing', () => {
    expect(substitutePath('/care/360/:beneficiaryId', {})).toBe('/care/360/:beneficiaryId');
  });

  test('ignores extraneous params', () => {
    expect(substitutePath('/care/360/:id', { id: 'x', other: 'y' })).toBe('/care/360/x');
  });
});

// ─── 2. Service — resolveNextLevel / resolveLevel / chain ─────

describe('drilldown.service — level navigation', () => {
  const svc = createDrilldownService();

  test('resolveNextLevel walks one level deeper', () => {
    const r = svc.resolveNextLevel({
      kpiId: 'kpi.goals.stalled_count',
      fromLevel: 'executive',
      params: { branchId: 'b1' },
    });
    expect(r.ok).toBe(true);
    expect(r.level).toBe('branch');
    expect(r.deepLink).toBe('/dashboards/branch/b1');
  });

  test('resolveNextLevel returns 409 on terminal level', () => {
    const r = svc.resolveNextLevel({
      kpiId: 'kpi.goals.stalled_count',
      fromLevel: 'record',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('TERMINAL_LEVEL_REACHED');
  });

  test('resolveNextLevel returns 404 on unknown KPI', () => {
    const r = svc.resolveNextLevel({ kpiId: 'does.not.exist', fromLevel: 'executive' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('KPI_NOT_FOUND');
  });

  test('resolveLevel jumps directly to a named level', () => {
    const r = svc.resolveLevel({
      kpiId: 'kpi.invoices.overdue_count',
      toLevel: 'entity-list',
      params: { branchId: 'b9' },
    });
    expect(r.ok).toBe(true);
    expect(r.deepLink).toBe('/finance/invoices?branch=b9&status=overdue');
  });

  test('getFullChain returns every configured level', () => {
    const r = svc.getFullChain({
      kpiId: 'kpi.goals.stalled_count',
      params: { branchId: 'b1', beneficiaryId: 'p1' },
    });
    expect(r.ok).toBe(true);
    expect(r.chain.map(c => c.level)).toEqual([
      'executive',
      'branch',
      'unit',
      'entity-list',
      'record',
    ]);
    expect(r.chain.find(c => c.level === 'record').deepLink).toBe('/care/360/p1?tab=goals');
  });
});

// ─── 2. Service — resolveOwner ─────────────────────────────────

describe('drilldown.service — resolveOwner', () => {
  const svc = createDrilldownService();

  test('direct assignment wins over role chain', async () => {
    const r = await svc.resolveOwner({
      kpiId: 'kpi.goals.stalled_count',
      ctx: { assignedUserId: 'u-99', assignedUserName: 'Direct Owner' },
    });
    expect(r.role).toBe('directly_assigned');
    expect(r.userId).toBe('u-99');
    expect(r.fallbackUsed).toBe(false);
  });

  test('returns role-only when no resolver is wired', async () => {
    const r = await svc.resolveOwner({
      kpiId: 'kpi.goals.stalled_count',
      ctx: {},
    });
    expect(r.ok).toBe(true);
    expect(r.role).toBe('care_manager');
    expect(r.userId).toBeNull();
    expect(r.resolverMissing).toBe(true);
  });

  test('returns primary-role user when resolver finds one', async () => {
    const r = await svc.resolveOwner({
      kpiId: 'kpi.goals.stalled_count',
      ctx: { branchId: 'b1' },
      resolveUsersForRole: async role => {
        if (role === 'care_manager') return [{ _id: 'u-1', name: 'Care Mgr A' }];
        return [];
      },
    });
    expect(r.role).toBe('care_manager');
    expect(r.userId).toBe('u-1');
    expect(r.fallbackUsed).toBe(false);
  });

  test('walks fallback chain when primary returns 0 users', async () => {
    const r = await svc.resolveOwner({
      kpiId: 'kpi.goals.stalled_count',
      ctx: { branchId: 'b1' },
      resolveUsersForRole: async role => {
        if (role === 'medical_director') return [{ _id: 'md-7', name: 'Dr. Fallback' }];
        return [];
      },
    });
    expect(r.fallbackUsed).toBe(true);
    expect(r.role).toBe('medical_director');
    expect(r.originalRole).toBe('care_manager');
  });

  test('returns noUserFound=true when nothing resolves', async () => {
    const r = await svc.resolveOwner({
      kpiId: 'kpi.goals.stalled_count',
      ctx: {},
      resolveUsersForRole: async () => [],
    });
    expect(r.ok).toBe(true);
    expect(r.userId).toBeNull();
    expect(r.noUserFound).toBe(true);
  });
});

// ─── 2. Service — actions + invoke ────────────────────────────

describe('drilldown.service — actions + invoke', () => {
  const svc = createDrilldownService();

  test('getActions substitutes :params in deepLinks', () => {
    const actions = svc.getActions({
      kpiId: 'kpi.goals.stalled_count',
      params: { goalId: 'g-77', beneficiaryId: 'b-100' },
    });
    const reviewGoal = actions.find(a => a.id === 'review-goal');
    expect(reviewGoal.deepLink).toBe('/smart-goals/g-77');
    const reschedule = actions.find(a => a.id === 'reschedule-intervention');
    expect(reschedule.deepLink).toBe('/appointments/new?beneficiary=b-100');
  });

  test('invokeAction logs to auditLogger when provided', async () => {
    const logs = [];
    const result = await svc.invokeAction({
      kpiId: 'kpi.goals.stalled_count',
      actionId: 'review-goal',
      ctx: { userId: 'u-1', role: 'care_manager', params: { goalId: 'g-1' } },
      auditLogger: { log: async entry => logs.push(entry) },
    });
    expect(result.ok).toBe(true);
    expect(result.actionId).toBe('review-goal');
    expect(result.deepLink).toBe('/smart-goals/g-1');
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('drilldown.action.invoke');
    expect(logs[0].entityId).toBe('kpi.goals.stalled_count');
    expect(logs[0].metadata.actionId).toBe('review-goal');
  });

  test('invokeAction returns ACTION_NOT_FOUND on unknown action', async () => {
    const result = await svc.invokeAction({
      kpiId: 'kpi.goals.stalled_count',
      actionId: 'does-not-exist',
      ctx: {},
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('ACTION_NOT_FOUND');
  });
});

// ─── 3. Routes ─────────────────────────────────────────────────

function buildApp({ resolveUsersForRole = null, auditLogger = null } = {}) {
  const svc = createDrilldownService();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: 'u-1', role: 'manager' };
    next();
  });
  app.use(
    '/api/v1/drilldown',
    createDrilldownRouter({ drilldown: svc, resolveUsersForRole, auditLogger })
  );
  return app;
}

describe('drilldown.routes — endpoints', () => {
  test('GET / returns the registered KPIs', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/drilldown');
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBeGreaterThanOrEqual(12);
    expect(res.body.data.kpis[0].titleAr).toBeTruthy();
  });

  test('GET /:kpiId returns full bundle', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/v1/drilldown/kpi.goals.stalled_count')
      .query({ branchId: 'b1', beneficiaryId: 'p1' });
    expect(res.status).toBe(200);
    expect(res.body.data.kpiId).toBe('kpi.goals.stalled_count');
    expect(res.body.data.chain).toHaveLength(5);
    expect(res.body.data.actions.length).toBeGreaterThan(0);
    expect(res.body.data.owner.role).toBeTruthy();
  });

  test('GET /:kpiId/next walks one level deeper', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/v1/drilldown/kpi.goals.stalled_count/next')
      .query({ fromLevel: 'branch', branchId: 'b1' });
    expect(res.status).toBe(200);
    expect(res.body.data.level).toBe('unit');
  });

  test('GET /:kpiId/next 409 at terminal', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/v1/drilldown/kpi.goals.stalled_count/next')
      .query({ fromLevel: 'record' });
    expect(res.status).toBe(409);
  });

  test('GET /:kpiId/next 404 on unknown KPI', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/v1/drilldown/kpi.does.not.exist/next')
      .query({ fromLevel: 'executive' });
    expect(res.status).toBe(404);
  });

  test('disallowed query params are stripped — no smuggled placeholder', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/api/v1/drilldown/kpi.goals.stalled_count/chain')
      .query({ branchId: 'b1', evil: '../../etc/passwd' });
    expect(res.status).toBe(200);
    // The evil param must NOT have been substituted anywhere.
    const json = JSON.stringify(res.body);
    expect(json).not.toContain('etc/passwd');
  });

  test('POST /:kpiId/actions/:actionId/invoke logs + returns deepLink', async () => {
    const logs = [];
    const app = buildApp({ auditLogger: { log: async e => logs.push(e) } });
    const res = await request(app)
      .post('/api/v1/drilldown/kpi.goals.stalled_count/actions/review-goal/invoke')
      .send({ goalId: 'g-77' });
    expect(res.status).toBe(200);
    expect(res.body.data.deepLink).toBe('/smart-goals/g-77');
    expect(logs).toHaveLength(1);
    expect(logs[0].metadata.actionId).toBe('review-goal');
  });

  test('POST invoke 404 on unknown action', async () => {
    const app = buildApp();
    const res = await request(app).post(
      '/api/v1/drilldown/kpi.goals.stalled_count/actions/does-not-exist/invoke'
    );
    expect(res.status).toBe(404);
  });

  test('GET /:kpiId/owner uses resolveUsersForRole when wired', async () => {
    const app = buildApp({
      resolveUsersForRole: async role => {
        if (role === 'care_manager') return [{ _id: 'mgr-1', name: 'Mgr One' }];
        return [];
      },
    });
    const res = await request(app)
      .get('/api/v1/drilldown/kpi.goals.stalled_count/owner')
      .query({ branchId: 'b1' });
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('care_manager');
    expect(res.body.data.userId).toBe('mgr-1');
  });

  test('factory throws when drilldown service is missing', () => {
    expect(() => createDrilldownRouter({})).toThrow(/drilldown service is required/);
  });
});

// ─── 4. Coverage drift guard (registry vs. generators) ────────

describe('drilldown.registry — generator references resolve', () => {
  test('every relatedGeneratorIds entry matches an existing generator file', () => {
    const fs = require('fs');
    const path = require('path');
    const genDir = path.resolve(__dirname, '..', 'intelligence', 'generators');
    const present = new Set();
    for (const f of fs.readdirSync(genDir)) {
      if (!f.endsWith('.generator.js')) continue;
      const mod = require(path.join(genDir, f));
      if (mod && mod.id) present.add(mod.id);
    }

    const missing = [];
    for (const kpiId of drillRegistry.listRegisteredKpis()) {
      const meta = drillRegistry.getKpiDrillMetadata(kpiId);
      for (const gid of meta.relatedGeneratorIds || []) {
        if (!present.has(gid)) missing.push({ kpiId, generatorId: gid });
      }
    }

    // The trend-deviation, anomaly, and care-gap generators exist
    // today. Other gids (e.g. branch-underperform.v1) are forward
    // references — we expect SOME missing, but ALL of them should be
    // documented in the design as Wave 22+. Drift test asserts that
    // the missing list is at LEAST every gid not in {anomaly.v1,
    // trend-deviation.v1, care-gap.v1}.
    const KNOWN_FORWARD = new Set(['branch-underperform.v1']);
    for (const m of missing) {
      expect(KNOWN_FORWARD.has(m.generatorId)).toBe(true);
    }
  });
});
