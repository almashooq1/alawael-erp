/**
 * forms-catalog-registry.test.js — shape + invariants for Phase 19 catalog.
 *
 * The registry is pure data; this test pins down the contract so future
 * edits don't drift schemas, accidentally break IDs, or introduce
 * malformed entries.
 */

'use strict';

const catalog = require('../config/forms-catalog.registry');

describe('forms-catalog.registry — Phase 19', () => {
  const all = catalog.listAll();

  test('exports a non-empty frozen catalog', () => {
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThanOrEqual(32);
    expect(Object.isFrozen(all)).toBe(true);
  });

  test('AUDIENCES is the only allowed audience set', () => {
    expect(catalog.AUDIENCES).toEqual(['beneficiary', 'hr', 'management']);
    for (const entry of all) {
      expect(catalog.AUDIENCES).toContain(entry.audience);
    }
  });

  test('every entry has a unique dotted id', () => {
    const ids = all.map(e => e.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z]+\.[a-z-]+\.[a-z0-9-]+$/);
    }
  });

  test('id audience prefix matches entry.audience', () => {
    for (const entry of all) {
      expect(entry.id.startsWith(`${entry.audience}.`)).toBe(true);
    }
  });

  test('every entry has Arabic title + non-empty fields list', () => {
    for (const entry of all) {
      expect(typeof entry.title).toBe('string');
      expect(entry.title.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.fields)).toBe(true);
      expect(entry.fields.length).toBeGreaterThan(0);
    }
  });

  test('every field has name + label + valid type', () => {
    const VALID_TYPES = new Set([
      'text',
      'textarea',
      'number',
      'email',
      'tel',
      'url',
      'password',
      'date',
      'time',
      'datetime',
      'select',
      'radio',
      'checkbox',
      'toggle',
      'file',
      'signature',
      'image',
      'rating',
      'slider',
      'color',
      'header',
      'divider',
      'paragraph',
      'spacer',
      'table',
      'repeater',
      'calculated',
      'location',
      'rich_text',
    ]);
    for (const entry of all) {
      for (const f of entry.fields) {
        expect(typeof f.name).toBe('string');
        expect(f.name.length).toBeGreaterThan(0);
        expect(typeof f.label).toBe('string');
        expect(VALID_TYPES.has(f.type)).toBe(true);
      }
    }
  });

  test('field names are unique within a single template', () => {
    for (const entry of all) {
      const names = entry.fields.map(f => f.name);
      const dupes = names.filter((n, i) => names.indexOf(n) !== i);
      expect(dupes).toEqual([]);
    }
  });

  test('select/radio fields have at least one option', () => {
    for (const entry of all) {
      for (const f of entry.fields) {
        if (f.type === 'select' || f.type === 'radio') {
          expect(Array.isArray(f.options)).toBe(true);
          expect(f.options.length).toBeGreaterThan(0);
          for (const opt of f.options) {
            expect(opt.label).toBeTruthy();
            expect(opt.value).toBeTruthy();
          }
        }
      }
    }
  });

  test('field section reference resolves when sections are declared', () => {
    for (const entry of all) {
      const sectionIds = new Set((entry.sections || []).map(s => s.id));
      for (const f of entry.fields) {
        if (f.section && sectionIds.size > 0) {
          expect(sectionIds.has(f.section)).toBe(true);
        }
      }
    }
  });

  test('approval workflow steps have role + order', () => {
    for (const entry of all) {
      const wf = entry.approvalWorkflow;
      if (!wf || !wf.enabled) continue;
      expect(Array.isArray(wf.steps)).toBe(true);
      expect(wf.steps.length).toBeGreaterThan(0);
      for (const s of wf.steps) {
        expect(typeof s.role).toBe('string');
        expect(s.role.length).toBeGreaterThan(0);
        expect(typeof s.order).toBe('number');
      }
    }
  });

  test('summary counts match listed entries', () => {
    const s = catalog.summary();
    expect(s.total).toBe(all.length);
    expect(s.byAudience.beneficiary).toBe(all.filter(e => e.audience === 'beneficiary').length);
    expect(s.byAudience.hr).toBe(all.filter(e => e.audience === 'hr').length);
    expect(s.byAudience.management).toBe(all.filter(e => e.audience === 'management').length);
  });

  test('listByAudience filters and rejects unknown audiences', () => {
    expect(catalog.listByAudience('hr').every(e => e.audience === 'hr')).toBe(true);
    expect(catalog.listByAudience('beneficiary').length).toBeGreaterThan(0);
    expect(() => catalog.listByAudience('teacher')).toThrow(/Unknown audience/);
  });

  test('getById round-trips known IDs and returns null for unknown', () => {
    expect(catalog.getById('hr.leave.annual').audience).toBe('hr');
    expect(catalog.getById('management.procurement.purchase-request').category).toBe('procurement');
    expect(catalog.getById('does.not.exist')).toBeNull();
  });

  test('expected audiences each have minimum coverage', () => {
    const s = catalog.summary();
    expect(s.byAudience.beneficiary).toBeGreaterThanOrEqual(10);
    expect(s.byAudience.hr).toBeGreaterThanOrEqual(10);
    expect(s.byAudience.management).toBeGreaterThanOrEqual(6);
  });
});
