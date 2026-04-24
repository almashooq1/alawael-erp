/**
 * widget-catalog.test.js — Phase 18 Commit 1.
 *
 * Shape + cross-reference invariants for the widget catalog.
 */

'use strict';

const { WIDGETS, DATA_SHAPES, byCode, byDataShape, supports } = require('../config/widget.catalog');

const SHAPE_SET = new Set(DATA_SHAPES);

describe('widget catalog — sanity', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(WIDGETS)).toBe(true);
    expect(Object.isFrozen(DATA_SHAPES)).toBe(true);
  });

  it('has at least 15 canonical widgets', () => {
    expect(WIDGETS.length).toBeGreaterThanOrEqual(15);
  });

  it('every code is unique', () => {
    const seen = new Set();
    for (const w of WIDGETS) {
      expect(seen.has(w.code)).toBe(false);
      seen.add(w.code);
    }
  });
});

describe('widget catalog — per-entry shape', () => {
  it.each(WIDGETS.map(w => [w.code, w]))('%s has required fields', (_, w) => {
    for (const field of ['code', 'nameEn', 'nameAr', 'dataShape', 'description']) {
      expect(typeof w[field]).toBe('string');
      expect(w[field].length).toBeGreaterThan(0);
    }
    expect(typeof w.defaultSpan).toBe('object');
    expect(typeof w.defaultSpan.col).toBe('number');
    expect(typeof w.defaultSpan.row).toBe('number');
  });

  it.each(WIDGETS.map(w => [w.code, w]))('%s dataShape is from DATA_SHAPES', (_, w) => {
    expect(SHAPE_SET.has(w.dataShape)).toBe(true);
  });

  it.each(WIDGETS.map(w => [w.code, w]))('%s supports block is well-formed', (_, w) => {
    expect(typeof w.supports).toBe('object');
    for (const capability of ['drill', 'live', 'narrative', 'export']) {
      expect(typeof w.supports[capability]).toBe('boolean');
    }
  });

  it.each(WIDGETS.map(w => [w.code, w]))('%s default span fits a 12-col grid', (_, w) => {
    expect(w.defaultSpan.col).toBeGreaterThanOrEqual(1);
    expect(w.defaultSpan.col).toBeLessThanOrEqual(12);
    expect(w.defaultSpan.row).toBeGreaterThanOrEqual(1);
    expect(w.defaultSpan.row).toBeLessThanOrEqual(6);
  });
});

describe('widget catalog — lookups', () => {
  it('byCode returns null for unknown codes', () => {
    expect(byCode('W-DOES-NOT-EXIST')).toBeNull();
  });

  it('byCode returns the widget for known codes', () => {
    const card = byCode('W-KPI-CARD');
    expect(card).toBeTruthy();
    expect(card.dataShape).toBe('kpi-value');
  });

  it('byDataShape returns only widgets of that shape', () => {
    const streams = byDataShape('event-stream');
    expect(streams.length).toBeGreaterThanOrEqual(1);
    for (const w of streams) expect(w.dataShape).toBe('event-stream');
  });

  it('supports() reports capability flags accurately', () => {
    expect(supports('W-NARRATIVE', 'narrative')).toBe(true);
    expect(supports('W-KPI-CARD', 'narrative')).toBe(false);
    expect(supports('W-STREAM', 'live')).toBe(true);
    expect(supports('W-DOES-NOT-EXIST', 'live')).toBe(false);
  });
});
