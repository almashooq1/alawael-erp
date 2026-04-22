/**
 * reporting-builder-registry.test.js — Phase 10 Commit 2.
 *
 * Ensures every `builder` path in the catalog resolves to a function
 * in the registry (real or stub), and that real rehab builders are
 * wired, not shadowed by stubs.
 */

'use strict';

const catalog = require('../config/report.catalog');
const { builders, has, isStub, stubBuilder } = require('../services/reporting/builderRegistry');

describe('builderRegistry — coverage', () => {
  test('every catalog builder path resolves in the registry', () => {
    const unresolved = [];
    for (const r of catalog.REPORTS) {
      if (!has(r.builder)) unresolved.push(`${r.id} → ${r.builder}`);
    }
    expect(unresolved).toEqual([]);
  });

  test('rehabReportBuilders entries are real (not stubs)', () => {
    for (const fn of Object.keys(builders.rehabReportBuilders)) {
      expect(typeof builders.rehabReportBuilders[fn]).toBe('function');
      expect(isStub(`rehabReportBuilders.${fn}`)).toBe(false);
    }
  });

  test('builders already swapped to real are not flagged as stubs', () => {
    expect(isStub('attendanceReportBuilder.buildAdherence')).toBe(false);
    expect(isStub('sessionReportBuilder.buildVolume')).toBe(false);
    expect(isStub('therapistReportBuilder.buildProductivity')).toBe(false);
    expect(isStub('therapistReportBuilder.buildCaseload')).toBe(false);
    expect(isStub('branchReportBuilder.buildOccupancy')).toBe(false);
    expect(isStub('fleetReportBuilder.buildPunctuality')).toBe(false);
    expect(isStub('qualityReportBuilder.buildIncidentsDigest')).toBe(false);
    expect(isStub('qualityReportBuilder.buildRedFlagsDigest')).toBe(false);
    expect(isStub('financeReportBuilder.buildClaimsPack')).toBe(false);
    expect(isStub('financeReportBuilder.buildAgingReport')).toBe(false);
    expect(isStub('hrReportBuilder.buildTurnover')).toBe(false);
    expect(isStub('hrReportBuilder.buildCpeCompliance')).toBe(false);
    expect(isStub('crmReportBuilder.buildParentEngagement')).toBe(false);
    expect(isStub('crmReportBuilder.buildComplaintsDigest')).toBe(false);
  });

  test('remaining catalog modules are still stubs (only kpi + executive left)', () => {
    expect(isStub('kpiReportBuilder.buildExecDigest')).toBe(true);
    expect(isStub('kpiReportBuilder.buildBoardPack')).toBe(true);
    expect(isStub('kpiReportBuilder.buildBranchKpiPack')).toBe(true);
    expect(isStub('executiveReportBuilder.buildProgramsReview')).toBe(true);
    expect(isStub('executiveReportBuilder.buildAnnualReport')).toBe(true);
  });
});

describe('stubBuilder', () => {
  test('returns a well-formed JSON skeleton', async () => {
    const fn = stubBuilder('example.kind');
    const out = await fn({
      report: { id: 'r.x', nameEn: 'X', nameAr: 'س' },
      periodKey: '2026-W17',
      scopeKey: 'branch:b1',
      ctx: { now: new Date() },
    });
    expect(out).toMatchObject({
      reportType: 'r.x',
      kind: 'example.kind',
      status: 'stub',
      periodKey: '2026-W17',
      scopeKey: 'branch:b1',
      nameEn: 'X',
      nameAr: 'س',
    });
    expect(typeof out.generatedAt).toBe('string');
    expect(out.summary).toEqual({ items: [], headlineMetric: null });
    expect(out.inputs).toContain('now');
  });
});

describe('has / isStub', () => {
  test('has is false for bogus paths', () => {
    expect(has(null)).toBe(false);
    expect(has('')).toBe(false);
    expect(has('no.such')).toBe(false);
    expect(has('rehabReportBuilders.nada')).toBe(false);
  });
});
