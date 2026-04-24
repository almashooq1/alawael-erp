/**
 * dashboard-aggregator-service.test.js — Phase 18 Commit 1.
 *
 * Behavioural tests for the aggregator:
 *   - dispatches the kpiResolver for each heroKpiId in parallel
 *   - fails soft when the resolver throws (classification='unknown')
 *   - enforces audience-based access (super_admin bypass)
 *   - attaches widgets + narrative + asOf timestamp
 */

'use strict';

const aggregator = require('../services/dashboardAggregator.service');
const { byId: dashboardById } = require('../config/dashboard.registry');

function fakeResolverFactory(valueMap) {
  return jest.fn(async kpi => {
    if (!(kpi.id in valueMap)) return { value: null, delta: null };
    const entry = valueMap[kpi.id];
    if (entry === 'throw') throw new Error('upstream kaboom');
    return entry;
  });
}

describe('aggregator.build — dispatch + classification', () => {
  it('calls the resolver once per heroKpiId', async () => {
    const dash = dashboardById('executive');
    const resolver = fakeResolverFactory({});
    await aggregator.build({
      dashboardId: 'executive',
      role: 'ceo',
      kpiResolver: resolver,
    });
    expect(resolver).toHaveBeenCalledTimes(dash.heroKpiIds.length);
  });

  it('assigns classification based on KPI registry thresholds', async () => {
    const resolver = fakeResolverFactory({
      'finance.ar.dso.days': { value: 95, delta: 0.2 }, // lower_is_better, critical=90
      'crm.nps.score': { value: 55, delta: 0.05 }, // higher_is_better, warning=30
    });
    const r = await aggregator.build({
      dashboardId: 'executive',
      role: 'ceo',
      kpiResolver: resolver,
    });
    const dso = r.heroKpis.find(k => k.id === 'finance.ar.dso.days');
    const nps = r.heroKpis.find(k => k.id === 'crm.nps.score');
    expect(dso.classification).toBe('red');
    expect(nps.classification).toBe('green');
  });

  it('fails soft (unknown classification) when resolver throws', async () => {
    const resolver = fakeResolverFactory({
      'finance.ar.dso.days': 'throw',
    });
    const r = await aggregator.build({
      dashboardId: 'executive',
      role: 'ceo',
      kpiResolver: resolver,
    });
    const dso = r.heroKpis.find(k => k.id === 'finance.ar.dso.days');
    expect(dso.classification).toBe('unknown');
    expect(dso.value).toBeNull();
  });

  it('tolerates a resolver returning null value', async () => {
    const resolver = fakeResolverFactory({
      'finance.ar.dso.days': { value: null, delta: null },
    });
    const r = await aggregator.build({
      dashboardId: 'executive',
      role: 'ceo',
      kpiResolver: resolver,
    });
    const dso = r.heroKpis.find(k => k.id === 'finance.ar.dso.days');
    expect(dso.classification).toBe('unknown');
  });

  it('returns widgets resolved from the widget catalog', async () => {
    const r = await aggregator.build({
      dashboardId: 'executive',
      role: 'ceo',
      kpiResolver: fakeResolverFactory({}),
    });
    expect(r.widgets.length).toBeGreaterThan(0);
    expect(r.widgets[0]).toHaveProperty('code');
    expect(r.widgets[0]).toHaveProperty('dataShape');
  });

  it('includes a narrative block shaped for W-NARRATIVE', async () => {
    const r = await aggregator.build({
      dashboardId: 'executive',
      role: 'ceo',
      kpiResolver: fakeResolverFactory({
        'finance.ar.dso.days': { value: 95, delta: 0.2 },
      }),
    });
    expect(r.narrative).toBeTruthy();
    expect(r.narrative).toHaveProperty('headlineEn');
    expect(r.narrative).toHaveProperty('headlineAr');
    expect(r.narrative).toHaveProperty('confidence');
    expect(r.narrative.rulesFired).toEqual(expect.arrayContaining(['R-RED-KPI']));
  });

  it('attaches an asOf ISO timestamp using the injected clock', async () => {
    const fixed = new Date('2026-04-24T10:00:00Z');
    const r = await aggregator.build({
      dashboardId: 'executive',
      role: 'ceo',
      kpiResolver: fakeResolverFactory({}),
      clock: () => fixed,
    });
    expect(r.asOf).toBe(fixed.toISOString());
  });
});

describe('aggregator.build — authorization', () => {
  it('throws DASHBOARD_NOT_FOUND for unknown ids', async () => {
    await expect(aggregator.build({ dashboardId: 'nope', role: 'ceo' })).rejects.toMatchObject({
      code: 'DASHBOARD_NOT_FOUND',
    });
  });

  it('throws DASHBOARD_FORBIDDEN when role is not in audience', async () => {
    await expect(
      aggregator.build({ dashboardId: 'executive', role: 'therapist' })
    ).rejects.toMatchObject({ code: 'DASHBOARD_FORBIDDEN' });
  });

  it('super_admin bypasses audience check', async () => {
    const r = await aggregator.build({
      dashboardId: 'functional.finance',
      role: 'super_admin',
      kpiResolver: fakeResolverFactory({}),
    });
    expect(r.dashboard.id).toBe('functional.finance');
  });

  it('works when role is undefined (backward-compat anonymous context)', async () => {
    const r = await aggregator.build({
      dashboardId: 'executive',
      kpiResolver: fakeResolverFactory({}),
    });
    expect(r.dashboard.id).toBe('executive');
  });
});

describe('aggregator.listForRole', () => {
  it('returns only dashboards the role can access', () => {
    const list = aggregator.listForRole('group_cfo');
    const ids = list.map(d => d.id);
    expect(ids).toContain('functional.finance');
    expect(ids).toContain('executive');
  });

  it('returns all dashboards for super_admin', () => {
    const list = aggregator.listForRole('super_admin');
    expect(list.length).toBeGreaterThanOrEqual(7);
  });

  it('returns empty array for unknown role', () => {
    expect(aggregator.listForRole('not_a_role')).toEqual([]);
  });
});
