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

  test('non-rehab modules are (currently) stubs', () => {
    expect(isStub('therapistReportBuilder.buildProductivity')).toBe(true);
    expect(isStub('financeReportBuilder.buildAgingReport')).toBe(true);
    expect(isStub('hrReportBuilder.buildTurnover')).toBe(true);
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
