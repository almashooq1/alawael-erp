/**
 * layout-policy-wave24.test.js — Wave 24 (Cognitive Load Framework).
 *
 *   1. Registry shape — dashboards + sections + elements
 *   2. scoreElement — pass/fail with each contract rule
 *   3. validateDashboard — per-rule violations:
 *      • position 0 must be critical-signals
 *      • tier-1 budget enforced per density
 *      • cross-registry refs (KPI + alert surface) resolve
 *      • section task fields present
 *      • auto-save profile names resolve
 *   4. ALL shipped dashboards pass validation (the live drift guard)
 *   5. getLayoutForRole — smart-default substitution + role gating
 *   6. Routes — endpoint contract
 */

'use strict';

const express = require('express');
const request = require('supertest');

const layoutRegistry = require('../intelligence/layout-policy.registry');
const { createLayoutPolicyService } = require('../intelligence/layout-policy.service');
const { createLayoutPolicyRouter } = require('../routes/layout-policy.routes');

// ─── 1. Registry shape ─────────────────────────────────────────

describe('layout-policy.registry — shape', () => {
  const keys = layoutRegistry.listDashboardKeys();

  test('exports ≥ 6 dashboards', () => {
    expect(keys.length).toBeGreaterThanOrEqual(6);
  });

  test.each(keys)('%s — has required top-level fields', k => {
    const d = layoutRegistry.getDashboard(k);
    expect(d).toBeTruthy();
    expect(typeof d.titleAr).toBe('string');
    expect(typeof d.titleEn).toBe('string');
    expect(Array.isArray(d.targetRoleGroups)).toBe(true);
    expect(['low', 'medium', 'medium-high', 'high']).toContain(d.density);
    expect(Array.isArray(d.sections)).toBe(true);
    expect(d.sections.length).toBeGreaterThan(0);
    expect(typeof d.smartDefaults).toBe('object');
    expect(typeof d.autoSave).toBe('object');
  });

  test('TIERS, ELEMENT_KINDS, SECTION_KINDS, REVEAL_ON are frozen', () => {
    expect(Object.isFrozen(layoutRegistry.TIERS)).toBe(true);
    expect(Object.isFrozen(layoutRegistry.ELEMENT_KINDS)).toBe(true);
    expect(Object.isFrozen(layoutRegistry.SECTION_KINDS)).toBe(true);
    expect(Object.isFrozen(layoutRegistry.REVEAL_ON)).toBe(true);
  });

  test('DENSITY_BUDGETS covers all 4 density tiers', () => {
    expect(layoutRegistry.DENSITY_BUDGETS.low).toBeTruthy();
    expect(layoutRegistry.DENSITY_BUDGETS.medium).toBeTruthy();
    expect(layoutRegistry.DENSITY_BUDGETS['medium-high']).toBeTruthy();
    expect(layoutRegistry.DENSITY_BUDGETS.high).toBeTruthy();
  });

  test('AUTOSAVE_PROFILES has dashboard_filters, edit_draft, sensitive_form', () => {
    expect(layoutRegistry.getAutosaveProfile('dashboard_filters')).toBeTruthy();
    expect(layoutRegistry.getAutosaveProfile('edit_draft')).toBeTruthy();
    expect(layoutRegistry.getAutosaveProfile('sensitive_form')).toBeTruthy();
    expect(layoutRegistry.getAutosaveProfile('sensitive_form').commitTrigger).toBe('submit');
    expect(layoutRegistry.getAutosaveProfile('sensitive_form').draftMs).toBe(null);
  });
});

// ─── 2. scoreElement contract ──────────────────────────────────

describe('layout-policy.service — scoreElement', () => {
  const svc = createLayoutPolicyService();

  test('passes a well-formed tier-1 element', () => {
    const r = svc.scoreElement({
      id: 'x',
      kind: 'kpi',
      intentAr: 'مراقبة شيء',
      intentEn: 'Monitor something',
      tier: 1,
      aboveTheFold: true,
      revealOn: 'always',
    });
    expect(r.pass).toBe(true);
  });

  test('fails on missing intentAr', () => {
    const r = svc.scoreElement({
      id: 'x',
      kind: 'kpi',
      intentEn: 'x',
      tier: 1,
      aboveTheFold: true,
    });
    expect(r.pass).toBe(false);
    expect(r.reasons).toContain('MISSING_INTENT_AR');
  });

  test('fails on missing intentEn', () => {
    const r = svc.scoreElement({
      id: 'x',
      kind: 'kpi',
      intentAr: 'x',
      tier: 1,
      aboveTheFold: true,
    });
    expect(r.pass).toBe(false);
    expect(r.reasons).toContain('MISSING_INTENT_EN');
  });

  test('fails on invalid tier', () => {
    const r = svc.scoreElement({
      id: 'x',
      kind: 'kpi',
      intentAr: 'x',
      intentEn: 'x',
      tier: 7,
      aboveTheFold: true,
    });
    expect(r.reasons).toContain('INVALID_TIER');
  });

  test('fails when tier=1 but not aboveTheFold', () => {
    const r = svc.scoreElement({
      id: 'x',
      kind: 'kpi',
      intentAr: 'x',
      intentEn: 'x',
      tier: 1,
      aboveTheFold: false,
    });
    expect(r.reasons).toContain('TIER1_MUST_BE_ABOVE_THE_FOLD');
  });

  test('fails when tier=3 but revealOn=always', () => {
    const r = svc.scoreElement({
      id: 'x',
      kind: 'chart',
      intentAr: 'x',
      intentEn: 'x',
      tier: 3,
      aboveTheFold: false,
      revealOn: 'always',
    });
    expect(r.reasons).toContain('TIER3_MUST_DECLARE_REVEAL_ON');
  });

  test('passes tier=3 with valid revealOn', () => {
    const r = svc.scoreElement({
      id: 'x',
      kind: 'chart',
      intentAr: 'x',
      intentEn: 'x',
      tier: 3,
      aboveTheFold: false,
      revealOn: 'drawer',
    });
    expect(r.pass).toBe(true);
  });

  test('fails on invalid kind', () => {
    const r = svc.scoreElement({
      id: 'x',
      kind: 'invented-thing',
      intentAr: 'x',
      intentEn: 'x',
      tier: 1,
      aboveTheFold: true,
    });
    expect(r.reasons).toContain('INVALID_KIND');
  });

  test('fails on missing element entirely', () => {
    expect(svc.scoreElement(null).pass).toBe(false);
    expect(svc.scoreElement(undefined).pass).toBe(false);
  });
});

// ─── 3. validateDashboard ──────────────────────────────────────

describe('layout-policy.service — validateDashboard', () => {
  const svc = createLayoutPolicyService();

  test('returns DASHBOARD_NOT_FOUND for unknown key', () => {
    const r = svc.validateDashboard('does.not.exist');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('DASHBOARD_NOT_FOUND');
  });

  test('detects when position 0 is not critical-signals', () => {
    const badLayout = {
      DASHBOARDS: {
        bad: {
          titleAr: 'سيء',
          titleEn: 'Bad',
          targetRoleGroups: ['branch_manager'],
          density: 'medium',
          smartDefaults: {},
          autoSave: {},
          sections: [
            {
              id: 's1',
              kind: 'operational-pulse',
              position: 0,
              taskAr: 'مهمة',
              taskEn: 'Task',
              elements: [
                {
                  id: 'el',
                  kind: 'kpi',
                  intentAr: 'م',
                  intentEn: 'M',
                  tier: 1,
                  aboveTheFold: true,
                  revealOn: 'always',
                  refKpiId: 'kpi.beneficiary.active_count',
                },
              ],
            },
          ],
        },
      },
      TIERS: layoutRegistry.TIERS,
      ELEMENT_KINDS: layoutRegistry.ELEMENT_KINDS,
      SECTION_KINDS: layoutRegistry.SECTION_KINDS,
      REVEAL_ON: layoutRegistry.REVEAL_ON,
      DENSITY_BUDGETS: layoutRegistry.DENSITY_BUDGETS,
      AUTOSAVE_PROFILES: layoutRegistry.AUTOSAVE_PROFILES,
      listDashboardKeys: () => ['bad'],
      getDashboard: () => badLayout.DASHBOARDS.bad,
      getAutosaveProfile: name => layoutRegistry.AUTOSAVE_PROFILES[name] || null,
    };
    const localSvc = createLayoutPolicyService({ layoutRegistry: badLayout });
    const r = localSvc.validateDashboard('bad');
    expect(r.ok).toBe(false);
    expect(r.budgetViolations.some(v => v.rule === 'POSITION_0_MUST_BE_CRITICAL_SIGNALS')).toBe(
      true
    );
  });

  test('detects tier-1 budget exceeded', () => {
    // Build a dashboard with 15 tier-1 elements at density=low (budget=6)
    const tooMany = Array.from({ length: 15 }, (_, i) => ({
      id: `el${i}`,
      kind: 'kpi',
      intentAr: 'م',
      intentEn: 'M',
      tier: 1,
      aboveTheFold: true,
      revealOn: 'always',
      refKpiId: 'kpi.beneficiary.active_count',
    }));
    const fakeReg = {
      ...layoutRegistry,
      listDashboardKeys: () => ['fat'],
      getDashboard: () => ({
        titleAr: 'سمين',
        titleEn: 'Fat',
        targetRoleGroups: ['executive_leadership'],
        density: 'low',
        smartDefaults: {},
        autoSave: {},
        sections: [
          {
            id: 's0',
            kind: 'critical-signals',
            position: 0,
            taskAr: 'م',
            taskEn: 'M',
            elements: [
              {
                id: 'al',
                kind: 'alert-stream',
                intentAr: 'x',
                intentEn: 'x',
                tier: 1,
                aboveTheFold: true,
                revealOn: 'always',
                refAlertSurface: 'executive',
              },
            ],
          },
          {
            id: 's1',
            kind: 'operational-pulse',
            position: 1,
            taskAr: 'م',
            taskEn: 'M',
            elements: tooMany,
          },
        ],
      }),
      getAutosaveProfile: layoutRegistry.getAutosaveProfile,
    };
    const localSvc = createLayoutPolicyService({ layoutRegistry: fakeReg });
    const r = localSvc.validateDashboard('fat');
    expect(r.ok).toBe(false);
    expect(r.budgetViolations.some(v => v.rule === 'TIER1_BUDGET_EXCEEDED')).toBe(true);
  });

  test('detects unknown KPI reference', () => {
    const fakeReg = {
      ...layoutRegistry,
      listDashboardKeys: () => ['x'],
      getDashboard: () => ({
        titleAr: 'م',
        titleEn: 'M',
        targetRoleGroups: ['branch_manager'],
        density: 'medium',
        smartDefaults: {},
        autoSave: {},
        sections: [
          {
            id: 's0',
            kind: 'critical-signals',
            position: 0,
            taskAr: 'م',
            taskEn: 'M',
            elements: [
              {
                id: 'al',
                kind: 'alert-stream',
                intentAr: 'x',
                intentEn: 'x',
                tier: 1,
                aboveTheFold: true,
                revealOn: 'always',
                refAlertSurface: 'branch',
              },
            ],
          },
          {
            id: 's1',
            kind: 'operational-pulse',
            position: 1,
            taskAr: 'م',
            taskEn: 'M',
            elements: [
              {
                id: 'bad-kpi',
                kind: 'kpi',
                intentAr: 'x',
                intentEn: 'x',
                tier: 1,
                aboveTheFold: true,
                revealOn: 'always',
                refKpiId: 'kpi.does.not.exist',
              },
            ],
          },
        ],
      }),
      getAutosaveProfile: layoutRegistry.getAutosaveProfile,
    };
    const localSvc = createLayoutPolicyService({ layoutRegistry: fakeReg });
    const r = localSvc.validateDashboard('x');
    expect(r.crossRefErrors.some(e => e.kind === 'kpi-not-in-drilldown-registry')).toBe(true);
  });

  test('detects unknown alert surface', () => {
    const fakeReg = {
      ...layoutRegistry,
      listDashboardKeys: () => ['x'],
      getDashboard: () => ({
        titleAr: 'م',
        titleEn: 'M',
        targetRoleGroups: ['branch_manager'],
        density: 'medium',
        smartDefaults: {},
        autoSave: {},
        sections: [
          {
            id: 's0',
            kind: 'critical-signals',
            position: 0,
            taskAr: 'م',
            taskEn: 'M',
            elements: [
              {
                id: 'al',
                kind: 'alert-stream',
                intentAr: 'x',
                intentEn: 'x',
                tier: 1,
                aboveTheFold: true,
                revealOn: 'always',
                refAlertSurface: 'not-a-real-surface',
              },
            ],
          },
        ],
      }),
      getAutosaveProfile: layoutRegistry.getAutosaveProfile,
    };
    const localSvc = createLayoutPolicyService({ layoutRegistry: fakeReg });
    const r = localSvc.validateDashboard('x');
    expect(r.crossRefErrors.some(e => e.kind === 'alert-surface-unknown')).toBe(true);
  });

  test('detects unknown auto-save profile name', () => {
    const fakeReg = {
      ...layoutRegistry,
      listDashboardKeys: () => ['x'],
      getDashboard: () => ({
        titleAr: 'م',
        titleEn: 'M',
        targetRoleGroups: ['branch_manager'],
        density: 'medium',
        smartDefaults: {},
        autoSave: { something: 'not_a_real_profile' },
        sections: [
          {
            id: 's0',
            kind: 'critical-signals',
            position: 0,
            taskAr: 'م',
            taskEn: 'M',
            elements: [
              {
                id: 'al',
                kind: 'alert-stream',
                intentAr: 'x',
                intentEn: 'x',
                tier: 1,
                aboveTheFold: true,
                revealOn: 'always',
                refAlertSurface: 'branch',
              },
            ],
          },
        ],
      }),
      getAutosaveProfile: name => layoutRegistry.AUTOSAVE_PROFILES[name] || null,
    };
    const localSvc = createLayoutPolicyService({ layoutRegistry: fakeReg });
    const r = localSvc.validateDashboard('x');
    expect(r.unknownAutosaveProfiles.length).toBe(1);
  });
});

// ─── 4. All shipped dashboards pass validation (live drift guard) ────

describe('layout-policy — shipped dashboards pass validation', () => {
  const svc = createLayoutPolicyService();

  test.each(layoutRegistry.listDashboardKeys())('%s — validation report is OK', dashboardKey => {
    const r = svc.validateDashboard(dashboardKey);
    // If failing, surface the reasons in the assertion message so we
    // can see WHY in the CI log.
    if (!r.ok) {
      throw new Error(
        `Dashboard "${dashboardKey}" failed validation:\n` +
          JSON.stringify(
            {
              failingElements: r.failingElements,
              budgetViolations: r.budgetViolations,
              crossRefErrors: r.crossRefErrors,
              unknownAutosaveProfiles: r.unknownAutosaveProfiles,
            },
            null,
            2
          )
      );
    }
    expect(r.ok).toBe(true);
  });

  test('validateAll() reports all OK', () => {
    const reports = svc.validateAll();
    const failing = reports.filter(r => !r.ok);
    if (failing.length > 0) {
      throw new Error(`Failing: ${failing.map(f => f.dashboardKey).join(', ')}`);
    }
    expect(failing).toEqual([]);
  });
});

// ─── 5. getLayoutForRole ────────────────────────────────────────

describe('layout-policy.service — getLayoutForRole', () => {
  const svc = createLayoutPolicyService();

  test('returns DASHBOARD_NOT_FOUND on unknown key', () => {
    expect(svc.getLayoutForRole('nope', 'branch_manager').reason).toBe('DASHBOARD_NOT_FOUND');
  });

  test('rejects when role not in targetRoleGroups', () => {
    const r = svc.getLayoutForRole('executive', 'reception');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ROLE_NOT_ALLOWED_FOR_DASHBOARD');
  });

  test('returns layout for matching role', () => {
    const r = svc.getLayoutForRole('branch', 'branch_manager', { branchId: 'B-1' });
    expect(r.ok).toBe(true);
    expect(r.sections.length).toBeGreaterThan(0);
    expect(r.sections[0].kind).toBe('critical-signals');
    expect(r.smartDefaults.branchScope).toBe('B-1');
  });

  test('leaves :branchId placeholder when not supplied', () => {
    const r = svc.getLayoutForRole('branch', 'branch_manager', {});
    expect(r.smartDefaults.branchScope).toBe(':branchId');
  });

  test('inlines auto-save profile bodies', () => {
    const r = svc.getLayoutForRole('care', 'clinical_supervisor', { branchId: 'B-1' });
    expect(r.autoSave.signature.commitTrigger).toBe('submit'); // sensitive_form
    expect(r.autoSave.signature.draftMs).toBe(null);
  });

  test('sections are returned in position order', () => {
    const r = svc.getLayoutForRole('branch', 'branch_manager', { branchId: 'B-1' });
    for (let i = 1; i < r.sections.length; i++) {
      expect(r.sections[i].position).toBeGreaterThan(r.sections[i - 1].position);
    }
  });

  test('roleGroupKey=null bypasses the target-role gate (admin/debug)', () => {
    const r = svc.getLayoutForRole('executive', null);
    expect(r.ok).toBe(true);
  });
});

// ─── 6. Routes ─────────────────────────────────────────────────

function buildApp({ user = { id: 'u1', role: 'manager', branchId: 'B-1' } } = {}) {
  const svc = createLayoutPolicyService();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use('/api/v1/layout-policy', createLayoutPolicyRouter({ layoutPolicy: svc }));
  return app;
}

describe('layout-policy.routes', () => {
  test('GET / lists dashboards', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/layout-policy');
    expect(res.status).toBe(200);
    expect(res.body.data.dashboards.length).toBeGreaterThanOrEqual(6);
  });

  test('GET /validation returns 0 failing reports for live registry', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/layout-policy/validation');
    expect(res.status).toBe(200);
    expect(res.body.data.failingCount).toBe(0);
  });

  test('GET /autosave-profiles returns the catalog', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/layout-policy/autosave-profiles');
    expect(res.status).toBe(200);
    expect(res.body.data.profiles.find(p => p.name === 'sensitive_form').commitTrigger).toBe(
      'submit'
    );
  });

  test('GET /:dashboardKey returns full layout', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/layout-policy/branch');
    expect(res.status).toBe(200);
    expect(res.body.data.layout.density).toBe('medium-high');
  });

  test('GET /:dashboardKey 404 on unknown', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/layout-policy/nope');
    expect(res.status).toBe(404);
  });

  test('GET /:dashboardKey/validation returns scoring report', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/layout-policy/branch/validation');
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
    expect(res.body.data.tier1Count).toBeGreaterThan(0);
  });

  test('GET /:dashboardKey/for-role/:groupKey returns role-adjusted layout', async () => {
    const app = buildApp();
    const res = await request(app).get(
      '/api/v1/layout-policy/branch/for-role/branch_manager?branchId=B-7'
    );
    expect(res.status).toBe(200);
    expect(res.body.data.smartDefaults.branchScope).toBe('B-7');
  });

  test('GET /:dashboardKey/for-role/:groupKey 403 for unauthorized role', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/layout-policy/executive/for-role/reception');
    expect(res.status).toBe(403);
  });

  test('factory throws when service missing', () => {
    expect(() => createLayoutPolicyRouter({})).toThrow(/layoutPolicy service is required/);
  });
});
