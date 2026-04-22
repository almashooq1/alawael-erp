/**
 * reporting-executive-builder.test.js — Phase 10 Commit 7h.
 *
 * Executive builders are composite — they call other real builders.
 * Tests inject `ctx.builders` stubs so we can pin the composition
 * without exercising every downstream data source.
 */

'use strict';

const {
  buildProgramsReview,
  buildAnnualReport,
  pickBuilder,
} = require('../services/reporting/builders/executiveReportBuilder');

describe('pickBuilder', () => {
  test('prefers injected builder over fallback', () => {
    const injected = jest.fn();
    const fallback = jest.fn();
    const ctx = { builders: { mod: { fn: injected } } };
    expect(pickBuilder(ctx, 'mod', 'fn', fallback)).toBe(injected);
  });
  test('falls back when not injected', () => {
    const fallback = jest.fn();
    expect(pickBuilder({}, 'mod', 'fn', fallback)).toBe(fallback);
  });
});

describe('buildProgramsReview (semi-annual)', () => {
  const report = { id: 'exec.programs.semiannual' };

  test('collects rehab-domain KPIs + CBAHI sub-report + optional review compliance', async () => {
    const registry = {
      KPIS: [
        {
          id: 'rehab.goal.mastery_rate',
          domain: 'rehab',
          direction: 'higher_is_better',
          target: 70,
          warningThreshold: 50,
        },
      ],
      classify(k, v) {
        if (v == null) return 'unknown';
        if (v >= k.target) return 'green';
        if (v >= k.warningThreshold) return 'amber';
        return 'red';
      },
    };
    const cbahiDoc = {
      totals: { incidents: 5, catastrophicOrMajor: 2 },
      rcaCompletionRate: 0.8,
    };
    const ctx = {
      models: { kpiRegistry: registry },
      valueResolver: async () => 85,
      builders: {
        qualityReportBuilder: { buildCbahiEvidence: jest.fn(async () => cbahiDoc) },
        rehabReportBuilders: {
          buildReviewComplianceReport: jest.fn(() => ({ overdueCount: 3 })),
        },
      },
      reviewInputs: { someInput: true },
    };
    const doc = await buildProgramsReview({ report, periodKey: '2026-H1', ctx });
    expect(doc.kpis.items).toHaveLength(1);
    expect(doc.kpis.items[0].status).toBe('green');
    expect(doc.cbahi).toBe(cbahiDoc);
    expect(doc.reviewCompliance).toEqual({ overdueCount: 3 });
    expect(ctx.builders.qualityReportBuilder.buildCbahiEvidence).toHaveBeenCalled();
    expect(ctx.builders.rehabReportBuilders.buildReviewComplianceReport).toHaveBeenCalledWith({
      someInput: true,
    });
    expect(doc.summary.headlineMetric.label).toBe('rehab KPIs red');
  });

  test('degrades on unrecognised periodKey', async () => {
    const doc = await buildProgramsReview({ report, periodKey: 'nope' });
    expect(doc.summary.items.some(i => i.includes('Unrecognised'))).toBe(true);
  });

  test('survives sub-builder throws (returns null for that section)', async () => {
    const ctx = {
      models: {
        kpiRegistry: {
          KPIS: [],
          classify: () => 'unknown',
        },
      },
      builders: {
        qualityReportBuilder: {
          buildCbahiEvidence: async () => {
            throw new Error('cbahi down');
          },
        },
      },
    };
    const doc = await buildProgramsReview({ report, periodKey: '2026-H1', ctx });
    expect(doc.cbahi).toBeNull();
  });
});

describe('buildAnnualReport (annual)', () => {
  const report = { id: 'exec.annual.report' };

  test('assembles all 5 sections via injected builders', async () => {
    const calls = [];
    const mkBuilder = (name, fakeOut) =>
      jest.fn(async () => {
        calls.push(name);
        return fakeOut;
      });
    const ctx = {
      builders: {
        kpiReportBuilder: {
          buildBoardPack: mkBuilder('board', {
            counts: { green: 10, amber: 3, red: 2, unknown: 1 },
          }),
        },
        qualityReportBuilder: {
          buildIncidentsPack: mkBuilder('quality', { totals: { total: 12 } }),
        },
        financeReportBuilder: {
          buildRevenueReview: mkBuilder('finance', { totals: { booked: 1_000_000 } }),
        },
        hrReportBuilder: {
          buildTurnover: mkBuilder('hr', {
            totals: { endOfPeriodActive: 45, total: 3 },
          }),
        },
      },
    };
    const doc = await buildAnnualReport({ report, periodKey: '2026', ctx });
    expect(doc.sections.kpis).toBeTruthy();
    expect(doc.sections.quality).toBeTruthy();
    expect(doc.sections.finance).toBeTruthy();
    expect(doc.sections.hr).toBeTruthy();
    expect(calls.sort()).toEqual(['board', 'finance', 'hr', 'quality']);
    expect(doc.summary.headlineMetric.label).toBe('annual scorecard');
    expect(doc.summary.headlineMetric.value).toBe('10G / 3A / 2R');
  });

  test('one section throwing does not sink the others', async () => {
    const ctx = {
      builders: {
        kpiReportBuilder: {
          buildBoardPack: async () => {
            throw new Error('kpi down');
          },
        },
        qualityReportBuilder: {
          buildIncidentsPack: async () => ({ totals: { total: 5 } }),
        },
      },
    };
    const doc = await buildAnnualReport({ report, periodKey: '2026', ctx });
    expect(doc.sections.kpis).toBeNull();
    expect(doc.sections.quality).toEqual({ totals: { total: 5 } });
  });

  test('degrades on bad periodKey', async () => {
    const doc = await buildAnnualReport({ report, periodKey: 'nope' });
    expect(doc.summary.items.some(i => i.includes('Unrecognised'))).toBe(true);
  });
});
