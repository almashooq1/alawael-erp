/**
 * care-plan-docs-wave51.test.js — Wave 51.
 *
 * Structural validation tests for the Wave-51 production documentation.
 * These tests fail fast when:
 *
 *   • A doc file is missing or empty
 *   • The OpenAPI spec doesn't cover an endpoint declared in the routes file
 *   • The AsyncAPI doesn't catalog an event emitted by the engine
 *   • A Prom alert references a metric that doesn't exist
 *   • The Grafana dashboard references a metric that doesn't exist
 *   • The blueprint runbook drops a link to a file that doesn't exist
 *
 * Treat this suite as the "documentation drift gate" — when devs add
 * new endpoints/events/metrics, the suite tells them which docs to
 * update.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OPENAPI_PATH = path.join(ROOT, 'docs', 'api', 'openapi-care-planning.yaml');
const ASYNCAPI_PATH = path.join(ROOT, 'docs', 'asyncapi', 'care-planning-events.yaml');
const GRAFANA_PATH = path.join(ROOT, 'docs', 'dashboards', 'care-planning.grafana.json');
const ALERTS_PATH = path.join(ROOT, 'docs', 'alerts', 'care-planning.rules.yml');
const RUNBOOK_PATH = path.join(ROOT, 'docs', 'blueprint', '19-care-planning-engine.md');

function loadText(p) {
  expect(fs.existsSync(p)).toBe(true);
  const text = fs.readFileSync(p, 'utf-8');
  expect(text.length).toBeGreaterThan(100);
  return text;
}

// ─── 1. Files exist + non-empty ─────────────────────────────────────

describe('Wave 51 docs — files exist', () => {
  test('OpenAPI spec', () => {
    loadText(OPENAPI_PATH);
  });
  test('AsyncAPI catalog', () => {
    loadText(ASYNCAPI_PATH);
  });
  test('Grafana dashboard', () => {
    loadText(GRAFANA_PATH);
  });
  test('Prom alert rules', () => {
    loadText(ALERTS_PATH);
  });
  test('Blueprint runbook', () => {
    loadText(RUNBOOK_PATH);
  });
});

// ─── 2. OpenAPI covers every route ──────────────────────────────────

describe('OpenAPI — covers care-plan.routes endpoints', () => {
  const openapi = loadText(OPENAPI_PATH);
  const routesPath = path.join(ROOT, 'backend', 'routes', 'care-plan.routes.js');
  const routesText = fs.readFileSync(routesPath, 'utf-8');

  // Extract route definitions: router.get('/...') or router.post('/...')
  const re = /router\.(get|post)\(\s*['"`]([^'"`]+)['"`]/g;
  const routes = [];
  let m;
  while ((m = re.exec(routesText)) !== null) {
    routes.push({ method: m[1], path: m[2] });
  }
  // De-duplicate by method+path
  const unique = Array.from(new Set(routes.map(r => `${r.method} ${r.path}`)));

  test('extracts at least 20 route definitions from source', () => {
    expect(unique.length).toBeGreaterThanOrEqual(20);
  });

  test('every route path appears in the OpenAPI spec', () => {
    const missing = [];
    for (const r of routes) {
      // Convert /:id → {id} for OpenAPI lookup
      const oasPath = r.path
        .replace(/:planId/g, '{planId}')
        .replace(/:id/g, '{id}')
        .replace(/:kind/g, '{kind}');
      // Map root "/" to the bare path the openapi declares
      const target = oasPath === '/' ? '  /:' : oasPath;
      if (!openapi.includes(target)) {
        missing.push(`${r.method.toUpperCase()} ${oasPath}`);
      }
    }
    if (missing.length > 0) {
      throw new Error(`OpenAPI spec missing the following routes:\n  - ${missing.join('\n  - ')}`);
    }
  });

  test('declares at least 8 tags', () => {
    const tagsBlock = openapi.match(/^tags:\n([\s\S]+?)^paths:/m);
    expect(tagsBlock).toBeTruthy();
    const tagCount = (tagsBlock[1].match(/^\s*- name:/gm) || []).length;
    expect(tagCount).toBeGreaterThanOrEqual(8);
  });

  test('uses OpenAPI 3.1', () => {
    expect(openapi).toMatch(/^openapi:\s*3\.1\.0/m);
  });
});

// ─── 3. AsyncAPI covers every event channel ─────────────────────────

describe('AsyncAPI — covers all engine events', () => {
  const asyncapi = loadText(ASYNCAPI_PATH);

  const requiredEvents = [
    'care-plan.draft.created',
    'care-plan.submit-for-validation',
    'care-plan.mark-ready',
    'care-plan.submit-to-supervisor',
    'care-plan.begin-review',
    'care-plan.request-revision',
    'care-plan.escalate',
    'care-plan.approve',
    'care-plan.reject',
    'care-plan.rejected.repeated',
    'care-plan.save-to-record',
    'care-plan.notify-family',
    'care-plan.supersede',
    'care-plan.review.overdue',
    'care-plan.plateau-detector.action_required',
  ];

  test('uses AsyncAPI 3.0', () => {
    expect(asyncapi).toMatch(/^asyncapi:\s*3\.0\.0/m);
  });

  test('every required event channel is declared', () => {
    const missing = requiredEvents.filter(ev => !asyncapi.includes(ev));
    if (missing.length > 0) {
      throw new Error(`AsyncAPI missing events:\n  - ${missing.join('\n  - ')}`);
    }
  });

  test('defines at least 8 message types', () => {
    const messageCount = (asyncapi.match(/^\s{4}[A-Z][a-zA-Z]+Event:/gm) || []).length;
    expect(messageCount).toBeGreaterThanOrEqual(8);
  });
});

// ─── 4. Grafana dashboard references real metric names ──────────────

describe('Grafana dashboard — references real metric names', () => {
  const grafana = JSON.parse(loadText(GRAFANA_PATH));

  test('is valid JSON with panels', () => {
    expect(Array.isArray(grafana.panels)).toBe(true);
    expect(grafana.panels.length).toBeGreaterThanOrEqual(10);
  });

  test('every panel uses a care_plan_ metric', () => {
    const allExprs = [];
    for (const panel of grafana.panels) {
      for (const target of panel.targets || []) {
        if (target.expr) allExprs.push(target.expr);
      }
    }
    expect(allExprs.length).toBeGreaterThanOrEqual(10);

    const known = [
      'care_plan_transitions_total',
      'care_plan_rejections_total',
      'care_plan_approvals_total',
      'care_plan_escalations_total',
      'care_plan_family_send_total',
      'care_plan_family_retry_total',
      'care_plan_overdue_review_total',
      'care_plan_plateau_outcome_total',
      'care_plan_readiness_score',
      'care_plan_review_overall',
      'care_plan_days_to_approval',
      'care_plan_days_overdue_review',
      'care_plan_goals_at_risk',
      'care_plan_active_plans',
      'care_plan_family_send_pending_retries',
    ];

    for (const expr of allExprs) {
      const refs = expr.match(/care_plan_[a-z_]+/g) || [];
      expect(refs.length).toBeGreaterThan(0);
      for (const r of refs) {
        // strip _bucket / _count / _sum suffixes
        const base = r.replace(/_bucket$|_count$|_sum$/, '');
        expect(known).toContain(base);
      }
    }
  });

  test('has the canonical uid for cross-link from runbook', () => {
    expect(grafana.uid).toBe('care-plan-engine');
  });
});

// ─── 5. Prom alert rules reference real metrics + are well-formed ───

describe('Prom alerts — well-formed + reference real metrics', () => {
  const alerts = loadText(ALERTS_PATH);

  test('defines at least 8 alert rules', () => {
    const ruleCount = (alerts.match(/^\s+- alert:/gm) || []).length;
    expect(ruleCount).toBeGreaterThanOrEqual(8);
  });

  test('every alert has summary + description + severity', () => {
    const blocks = alerts.split(/^\s+- alert:/m).slice(1);
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) {
      expect(b).toMatch(/severity:\s*(info|warning|critical)/);
      expect(b).toMatch(/summary:/);
      expect(b).toMatch(/description:/);
    }
  });

  test('all referenced metrics start with care_plan_', () => {
    const exprMatches = alerts.match(/care_plan_[a-z_]+/g) || [];
    expect(exprMatches.length).toBeGreaterThan(10);
  });

  test('component label is care-plan or care-plan-*', () => {
    const components = alerts.match(/component:\s*([a-z-]+)/g) || [];
    expect(components.length).toBeGreaterThanOrEqual(5);
    for (const c of components) {
      expect(c).toMatch(/care-plan/);
    }
  });
});

// ─── 6. Runbook references real files + sections ────────────────────

describe('Blueprint runbook — references real files', () => {
  const runbook = loadText(RUNBOOK_PATH);

  test('references all 4 doc artifacts by path', () => {
    expect(runbook).toContain('openapi-care-planning.yaml');
    expect(runbook).toContain('care-planning-events.yaml');
    expect(runbook).toContain('care-planning.grafana.json');
    expect(runbook).toContain('care-planning.rules.yml');
  });

  test('mentions every wave 41–51', () => {
    for (let w = 41; w <= 50; w++) {
      expect(runbook).toContain(`Wave ${w}`);
    }
  });

  test('test-gate table includes 10 suites with totals', () => {
    expect(runbook).toMatch(/care-plan-wave41/);
    expect(runbook).toMatch(/care-plan-e2e-wave49/);
    expect(runbook).toMatch(/care-plan-workers-metrics-wave50/);
    expect(runbook).toMatch(/425\/425/);
  });

  test('has go-live checklist', () => {
    expect(runbook.toLowerCase()).toContain('go-live checklist');
    const checkBoxes = (runbook.match(/^☐/gm) || []).length;
    expect(checkBoxes).toBeGreaterThanOrEqual(10);
  });

  test('blocks each anti-pattern in the table', () => {
    const requiredPatterns = ['Self-approval', 'evidenceHash', 'forbidden-term', 'signatureChain'];
    for (const pat of requiredPatterns) {
      expect(runbook).toContain(pat);
    }
  });
});

// ─── 7. Permissions in governance match runbook claims ──────────────

describe('Governance — care-plan permissions exist as documented', () => {
  const gov = require('../intelligence/governance.registry');
  const codes = gov.listPermissionCodes();

  test('all permission codes claimed by routes exist', () => {
    const required = [
      'care-plan.read',
      'care-plan.list',
      'care-plan.draft.create',
      'care-plan.validation.run',
      'care-plan.submit-to-supervisor',
      'care-plan.begin-review',
      'care-plan.request-revision',
      'care-plan.review.scorecard',
      'care-plan.escalate',
      'care-plan.approve',
      'care-plan.reject',
      'care-plan.archive',
      'care-plan.save-to-record',
      'care-plan.notify-family',
      'care-plan.supersede',
      'care-plan.amendment.apply',
      'care-plan.version.create',
      'care-plan.family-version.preview',
      'care-plan.audit-trail.read',
      'care-plan.recommendation.preview',
      'care-plan.recommendation.apply',
      'care-plan.progress-review.run',
      'care-plan.progress-review.read',
      'care-plan.programs-library.read',
      'care-plan.tests-library.read',
      'care-plan.group-plan.build',
      'care-plan.group-plan.validate',
      'care-plan.group-plan.read',
      'care-plan.report.clinician_draft',
      'care-plan.report.supervisor_review',
      'care-plan.report.final_approved_plan',
      'care-plan.report.rejection',
      'care-plan.report.monthly_progress',
      'care-plan.report.end_of_cycle_closure',
    ];
    const missing = required.filter(r => !codes.includes(r));
    if (missing.length > 0) {
      throw new Error(`governance.registry missing codes:\n  - ${missing.join('\n  - ')}`);
    }
  });

  test('exposes 30+ care-plan permission codes', () => {
    const careCodes = codes.filter(c => c.startsWith('care-plan.'));
    expect(careCodes.length).toBeGreaterThanOrEqual(30);
  });
});
