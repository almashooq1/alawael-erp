/**
 * dashboard-narrative-service.test.js — Phase 18 Commit 1.
 *
 * Rule-based narrative generator tests. No mocks required — the
 * generator is pure: input snapshots → output narrative.
 */

'use strict';

const narrative = require('../services/dashboardNarrative.service');

function snap(overrides) {
  return Object.assign(
    { id: 'crm.nps.score', value: 50, classification: 'green', delta: 0.02 },
    overrides
  );
}

describe('narrative — degraded input handling', () => {
  it('returns low-confidence insufficient-data when snapshots array is empty', () => {
    const r = narrative.generate({ dashboardId: 'executive', kpiSnapshots: [] });
    expect(r.confidence).toBe('low');
    expect(r.rulesFired).toEqual([]);
    expect(r.refs).toEqual([]);
    expect(r.headlineEn).toMatch(/insufficient/i);
  });

  it('returns neutral narrative when no rules fire', () => {
    const r = narrative.generate({
      dashboardId: 'executive',
      kpiSnapshots: [snap({ classification: 'green', delta: 0.01 })],
    });
    expect(r.rulesFired).toEqual([]);
    expect(r.paragraphsEn.length).toBeGreaterThanOrEqual(1);
    expect(r.paragraphsAr.length).toBeGreaterThanOrEqual(1);
  });

  it('handles missing dashboardId gracefully', () => {
    const r = narrative.generate({ kpiSnapshots: [snap({ classification: 'red', delta: -0.2 })] });
    expect(r.rulesFired).toContain('R-RED-KPI');
    expect(r.dashboardLevel).toBeNull();
  });
});

describe('narrative — core rules', () => {
  it('fires R-RED-KPI when any snapshot is red', () => {
    const r = narrative.generate({
      dashboardId: 'executive',
      kpiSnapshots: [
        snap({ id: 'finance.ar.dso.days', value: 95, classification: 'red', delta: 0.2 }),
        snap({ id: 'crm.nps.score', value: 50, classification: 'green', delta: 0.03 }),
      ],
    });
    expect(r.rulesFired).toContain('R-RED-KPI');
    expect(r.headlineEn).toMatch(/Red breach/i);
    expect(r.refs).toContain('finance.ar.dso.days');
  });

  it('fires R-AMBER-DRIFT when worst is amber with material delta', () => {
    const r = narrative.generate({
      dashboardId: 'executive',
      kpiSnapshots: [
        snap({ id: 'crm.nps.score', value: 35, classification: 'amber', delta: -0.08 }),
      ],
    });
    expect(r.rulesFired).toContain('R-AMBER-DRIFT');
    expect(r.headlineEn).toMatch(/Amber/i);
  });

  it('does NOT fire R-AMBER-DRIFT on tiny delta', () => {
    const r = narrative.generate({
      dashboardId: 'executive',
      kpiSnapshots: [
        snap({ id: 'crm.nps.score', value: 35, classification: 'amber', delta: 0.01 }),
      ],
    });
    expect(r.rulesFired).not.toContain('R-AMBER-DRIFT');
  });

  it('fires R-POSITIVE-LIFT when a green KPI moved up materially', () => {
    const r = narrative.generate({
      dashboardId: 'executive',
      kpiSnapshots: [
        snap({ id: 'crm.nps.score', value: 55, classification: 'green', delta: 0.07 }),
      ],
    });
    expect(r.rulesFired).toContain('R-POSITIVE-LIFT');
  });

  it('fires R-INTEGRATION-HEALTH when integration score is amber/red', () => {
    const r = narrative.generate({
      dashboardId: 'executive',
      kpiSnapshots: [
        {
          id: 'gov-integrations.integration_health.index',
          value: 62,
          classification: 'amber',
          delta: -0.1,
        },
      ],
    });
    expect(r.rulesFired).toContain('R-INTEGRATION-HEALTH');
    expect(r.refs).toContain('gov-integrations.integration_health.index');
  });

  it('fires R-REDFLAG-CLUSTER when clinical red-flags are red', () => {
    const r = narrative.generate({
      dashboardId: 'clinical',
      kpiSnapshots: [
        {
          id: 'clinical.red_flags.active.count',
          value: 40,
          classification: 'red',
          delta: 0.3,
        },
      ],
    });
    expect(r.rulesFired).toContain('R-REDFLAG-CLUSTER');
    expect(r.refs).toContain('clinical.red_flags.active.count');
  });
});

describe('narrative — confidence scoring', () => {
  it('low when no rules fire', () => {
    const r = narrative.generate({
      dashboardId: 'executive',
      kpiSnapshots: [snap({ classification: 'green', delta: 0 })],
    });
    expect(r.confidence).toBe('low');
  });

  it('medium when 1-2 rules fire', () => {
    const r = narrative.generate({
      dashboardId: 'executive',
      kpiSnapshots: [snap({ id: 'crm.nps.score', value: 20, classification: 'red', delta: -0.2 })],
    });
    expect(['medium', 'high']).toContain(r.confidence);
  });

  it('high when 3+ rules fire on 4+ classified snapshots', () => {
    const r = narrative.generate({
      dashboardId: 'executive',
      kpiSnapshots: [
        { id: 'finance.ar.dso.days', value: 95, classification: 'red', delta: 0.2 },
        { id: 'crm.nps.score', value: 55, classification: 'green', delta: 0.06 },
        {
          id: 'gov-integrations.integration_health.index',
          value: 65,
          classification: 'amber',
          delta: -0.1,
        },
        {
          id: 'clinical.red_flags.active.count',
          value: 30,
          classification: 'red',
          delta: 0.15,
        },
      ],
    });
    expect(r.confidence).toBe('high');
    expect(r.rulesFired.length).toBeGreaterThanOrEqual(3);
  });
});

describe('narrative — bilingual parity', () => {
  it('emits matching paragraph count in EN and AR', () => {
    const r = narrative.generate({
      dashboardId: 'executive',
      kpiSnapshots: [
        snap({ id: 'finance.ar.dso.days', value: 95, classification: 'red', delta: 0.2 }),
      ],
    });
    expect(r.paragraphsEn.length).toBe(r.paragraphsAr.length);
  });

  it('headlines are present in both languages', () => {
    const r = narrative.generate({
      dashboardId: 'executive',
      kpiSnapshots: [snap({ classification: 'green', delta: 0 })],
    });
    expect(typeof r.headlineEn).toBe('string');
    expect(typeof r.headlineAr).toBe('string');
    expect(r.headlineEn.length).toBeGreaterThan(0);
    expect(r.headlineAr.length).toBeGreaterThan(0);
  });
});
