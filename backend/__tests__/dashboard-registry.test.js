/**
 * dashboard-registry.test.js — Phase 18 Commit 1.
 *
 * Drift + shape invariants over the canonical dashboard catalogue
 * (config/dashboard.registry.js). Pure-data tests — no DB, no I/O.
 *
 * The registry feeds three downstream layers: the aggregator, the
 * narrative service, and the HTTP route. If any cross-reference
 * here breaks (a heroKpiId that no longer exists, a widgetId that
 * was removed, an audience role that was retired), every one of
 * those layers silently degrades. Catching that at test time keeps
 * the platform honest.
 */

'use strict';

const {
  DASHBOARDS,
  DASHBOARD_LEVELS,
  ALERT_FLOORS,
  FILTER_KEYS,
  byId,
  byLevel,
  visibleTo,
  referencedKpiIds,
  referencedWidgetIds,
} = require('../config/dashboard.registry');
const { byId: kpiById } = require('../config/kpi.registry');
const { byCode: widgetByCode } = require('../config/widget.catalog');
const { ROLES } = require('../config/rbac.config');

const ROLE_SET = new Set(Object.values(ROLES));
const LEVEL_SET = new Set(DASHBOARD_LEVELS);
const FLOOR_SET = new Set(ALERT_FLOORS);
const FILTER_SET = new Set(FILTER_KEYS);

describe('dashboard registry — sanity', () => {
  it('seeds the 4 blueprint levels', () => {
    const levels = new Set(DASHBOARDS.map(d => d.level));
    expect(levels.has('executive')).toBe(true);
    expect(levels.has('branch-ops')).toBe(true);
    expect(levels.has('clinical')).toBe(true);
    expect(levels.has('functional')).toBe(true);
  });

  it('registry is frozen', () => {
    expect(Object.isFrozen(DASHBOARDS)).toBe(true);
    expect(Object.isFrozen(DASHBOARD_LEVELS)).toBe(true);
    expect(Object.isFrozen(ALERT_FLOORS)).toBe(true);
    expect(Object.isFrozen(FILTER_KEYS)).toBe(true);
  });

  it('every id is unique', () => {
    const seen = new Set();
    for (const d of DASHBOARDS) {
      expect(seen.has(d.id)).toBe(false);
      seen.add(d.id);
    }
  });
});

describe('dashboard registry — per-entry shape', () => {
  it.each(DASHBOARDS.map(d => [d.id, d]))('%s has required string fields', (_, d) => {
    for (const field of ['id', 'level', 'titleEn', 'titleAr', 'narrativeTemplate']) {
      expect(typeof d[field]).toBe('string');
      expect(d[field].length).toBeGreaterThan(0);
    }
  });

  it.each(DASHBOARDS.map(d => [d.id, d]))('%s has well-typed arrays', (_, d) => {
    for (const field of ['audience', 'heroKpiIds', 'widgetIds', 'filters', 'drillPaths']) {
      expect(Array.isArray(d[field])).toBe(true);
      expect(d[field].length).toBeGreaterThan(0);
    }
  });

  it.each(DASHBOARDS.map(d => [d.id, d]))('%s has refresh interval within sane bounds', (_, d) => {
    expect(typeof d.refreshIntervalSeconds).toBe('number');
    expect(d.refreshIntervalSeconds).toBeGreaterThanOrEqual(30);
    expect(d.refreshIntervalSeconds).toBeLessThanOrEqual(3600);
  });
});

describe('dashboard registry — taxonomy invariants', () => {
  it('every level is from DASHBOARD_LEVELS', () => {
    for (const d of DASHBOARDS) expect(LEVEL_SET.has(d.level)).toBe(true);
  });

  it('every alertSeverityFloor is from ALERT_FLOORS', () => {
    for (const d of DASHBOARDS) expect(FLOOR_SET.has(d.alertSeverityFloor)).toBe(true);
  });

  it('every filter key is from FILTER_KEYS', () => {
    for (const d of DASHBOARDS) {
      for (const f of d.filters) expect(FILTER_SET.has(f)).toBe(true);
    }
  });

  it('every audience role resolves to an RBAC role', () => {
    for (const d of DASHBOARDS) {
      for (const r of d.audience) expect(ROLE_SET.has(r)).toBe(true);
    }
  });
});

describe('dashboard registry — cross-references', () => {
  it('every heroKpiId resolves to a kpi.registry entry', () => {
    for (const d of DASHBOARDS) {
      for (const kpiId of d.heroKpiIds) {
        const kpi = kpiById(kpiId);
        expect(kpi).toBeTruthy();
        expect(kpi.id).toBe(kpiId);
      }
    }
  });

  it('every widgetId resolves to a widget.catalog entry', () => {
    for (const d of DASHBOARDS) {
      for (const code of d.widgetIds) {
        const w = widgetByCode(code);
        expect(w).toBeTruthy();
        expect(w.code).toBe(code);
      }
    }
  });
});

describe('dashboard registry — helpers', () => {
  it('byId returns null for unknown id', () => {
    expect(byId('does-not-exist')).toBeNull();
  });

  it('byId returns the dashboard when id is known', () => {
    const d = byId('executive');
    expect(d).toBeTruthy();
    expect(d.level).toBe('executive');
  });

  it('byLevel returns only dashboards of that level', () => {
    const functional = byLevel('functional');
    expect(functional.length).toBeGreaterThanOrEqual(4); // HR, Finance, Quality, CRM
    for (const d of functional) expect(d.level).toBe('functional');
  });

  it('visibleTo filters by audience membership', () => {
    const forCfo = visibleTo('group_cfo');
    const ids = forCfo.map(d => d.id);
    expect(ids).toContain('executive');
    expect(ids).toContain('functional.finance');
  });

  it('visibleTo returns empty array for unknown role', () => {
    expect(visibleTo('not_a_role')).toEqual([]);
    expect(visibleTo(null)).toEqual([]);
    expect(visibleTo(undefined)).toEqual([]);
  });

  it('referencedKpiIds returns distinct ids', () => {
    const ids = referencedKpiIds();
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(6);
  });

  it('referencedWidgetIds returns distinct codes', () => {
    const codes = referencedWidgetIds();
    const set = new Set(codes);
    expect(set.size).toBe(codes.length);
    expect(codes).toContain('W-KPI-CARD');
    expect(codes).toContain('W-NARRATIVE');
  });
});

describe('dashboard registry — Phase 18 new KPIs are surfaced', () => {
  const PHASE_18_KPIS = [
    'crm.nps.score',
    'finance.ar.dso.days',
    'quality.capa.ontime_closure.pct',
    'hr.workforce.attrition.pct',
    'clinical.red_flags.active.count',
    'gov-integrations.integration_health.index',
  ];

  it('every new Phase 18 KPI is referenced by at least one dashboard', () => {
    const refs = new Set(referencedKpiIds());
    for (const id of PHASE_18_KPIS) {
      expect(refs.has(id)).toBe(true);
    }
  });

  it('every new Phase 18 KPI exists in the kpi registry', () => {
    for (const id of PHASE_18_KPIS) {
      expect(kpiById(id)).toBeTruthy();
    }
  });
});
