/**
 * report-catalog.test.js — Phase 10 Commit 1.
 *
 * Pins the invariants of `config/report.catalog.js`. These invariants
 * are what the engine, scheduler, approval gate, and delivery ledger
 * all assume; break them at your peril.
 */

'use strict';

const catalog = require('../config/report.catalog');

describe('report.catalog — invariants', () => {
  test('REPORTS is a non-empty frozen array', () => {
    expect(Array.isArray(catalog.REPORTS)).toBe(true);
    expect(catalog.REPORTS.length).toBeGreaterThanOrEqual(25);
    expect(Object.isFrozen(catalog.REPORTS)).toBe(true);
  });

  test('every id is unique and matches the dot-slug pattern', () => {
    const ids = catalog.REPORTS.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+){1,3}$/);
    }
  });

  test('every enum field is in its closed set', () => {
    for (const r of catalog.REPORTS) {
      expect(catalog.CATEGORIES).toContain(r.category);
      expect(catalog.PERIODICITIES).toContain(r.periodicity);
      expect(catalog.CONFIDENTIALITY).toContain(r.confidentiality);
      for (const a of r.audiences) expect(catalog.AUDIENCES).toContain(a);
      for (const c of r.channels) expect(catalog.CHANNELS).toContain(c);
      for (const f of r.formats) expect(catalog.FORMATS).toContain(f);
      expect(r.audiences.length).toBeGreaterThan(0);
      expect(r.channels.length).toBeGreaterThan(0);
      expect(r.locales.length).toBeGreaterThan(0);
    }
  });

  test('PERIODICITY_CRON has an entry for every scheduled periodicity', () => {
    for (const p of catalog.PERIODICITIES) {
      if (p === 'on_demand') {
        expect(catalog.PERIODICITY_CRON[p]).toBeNull();
      } else {
        expect(typeof catalog.PERIODICITY_CRON[p]).toBe('string');
        // 5-field cron
        expect(catalog.PERIODICITY_CRON[p].split(/\s+/).length).toBe(5);
      }
    }
  });

  test('confidentiality / approval consistency', () => {
    for (const r of catalog.REPORTS) {
      if (r.confidentiality === 'confidential') {
        // confidential reports should not blast SMS
        expect(r.channels).not.toContain('sms');
      }
      if (r.approvalRequired) {
        expect(['restricted', 'confidential']).toContain(r.confidentiality);
      }
    }
  });

  test('ben-facing reports carry a retention policy', () => {
    for (const r of catalog.REPORTS) {
      expect(r.retention).toBeDefined();
      expect(typeof r.retention.days).toBe('number');
      expect(r.retention.days).toBeGreaterThan(0);
    }
  });

  test('every report names a builder', () => {
    for (const r of catalog.REPORTS) {
      expect(typeof r.builder).toBe('string');
      expect(r.builder).toMatch(/^[a-zA-Z][\w]*\.[a-zA-Z][\w]*$/);
    }
  });
});

describe('report.catalog — helpers', () => {
  test('byId returns the right entry or null', () => {
    const first = catalog.REPORTS[0];
    expect(catalog.byId(first.id)).toBe(first);
    expect(catalog.byId('does.not.exist')).toBeNull();
  });

  test('byPeriodicity filters to enabled entries only', () => {
    const weekly = catalog.byPeriodicity('weekly');
    expect(weekly.length).toBeGreaterThan(0);
    for (const r of weekly) {
      expect(r.periodicity).toBe('weekly');
      expect(r.enabled).toBe(true);
    }
  });

  test('byAudience / byChannel / byCategory / byConfidentiality / byCompliance', () => {
    const guardians = catalog.byAudience('guardian');
    expect(guardians.length).toBeGreaterThan(0);
    for (const r of guardians) expect(r.audiences).toContain('guardian');

    const whatsapps = catalog.byChannel('whatsapp');
    for (const r of whatsapps) expect(r.channels).toContain('whatsapp');

    const clinical = catalog.byCategory('clinical');
    for (const r of clinical) expect(r.category).toBe('clinical');

    const confidential = catalog.byConfidentiality('confidential');
    for (const r of confidential) expect(r.confidentiality).toBe('confidential');

    const cbahi = catalog.byCompliance('CBAHI');
    for (const r of cbahi) expect(r.compliance).toContain('CBAHI');
  });

  test('resolveApprovers falls back to defaults when approverRoles empty', () => {
    const fake = {
      approvalRequired: true,
      approverRoles: [],
      confidentiality: 'confidential',
    };
    expect(catalog.resolveApprovers(fake).length).toBeGreaterThan(0);
    expect(catalog.resolveApprovers({ approvalRequired: false })).toEqual([]);
  });

  test('resolveApprovers respects per-entry overrides', () => {
    const fake = {
      approvalRequired: true,
      approverRoles: ['cfo'],
      confidentiality: 'confidential',
    };
    expect(catalog.resolveApprovers(fake)).toEqual(['cfo']);
  });

  test('classify sums match the array length', () => {
    const c = catalog.classify();
    expect(c.total).toBe(catalog.REPORTS.length);
    expect(c.enabled).toBeLessThanOrEqual(c.total);
    const perPeriodicity = Object.values(c.byPeriodicity).reduce((a, b) => a + b, 0);
    expect(perPeriodicity).toBe(c.total);
    expect(c.approvalRequired).toBeGreaterThan(0);
  });
});
