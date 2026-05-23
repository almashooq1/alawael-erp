'use strict';
/**
 * risk-metrics.registry.test.js — Wave 297
 */

const m = require('../intelligence/risk-metrics.registry');

beforeEach(() => m._reset());

describe('W297 — risk-metrics.registry', () => {
  test('inc + snapshot, no labels', () => {
    m.inc('a.b');
    m.inc('a.b');
    expect(m.snapshot()).toEqual({ 'a.b': 2 });
  });

  test('inc + snapshot, label key independent of insertion order', () => {
    m.inc('x', { b: 2, a: 1 });
    m.inc('x', { a: 1, b: 2 });
    const s = m.snapshot();
    expect(s).toEqual({ 'x|a=1,b=2': 2 });
  });

  test('different label values are separate series', () => {
    m.inc(m.NAMES.BACKLINK_ATTEMPTED, { result: 'ok' });
    m.inc(m.NAMES.BACKLINK_ATTEMPTED, { result: 'ok' });
    m.inc(m.NAMES.BACKLINK_ATTEMPTED, { result: 'failed' });
    expect(m.snapshot()).toEqual({
      'risk.alert.backlink.attempted|result=ok': 2,
      'risk.alert.backlink.attempted|result=failed': 1,
    });
  });

  test('snapshotGrouped buckets by metric name', () => {
    m.inc(m.NAMES.AUDIT_APPENDED, { action: 'ACK' });
    m.inc(m.NAMES.AUDIT_APPENDED, { action: 'TRIGGERED' });
    m.inc(m.NAMES.AUDIT_VERIFIED, { result: 'ok' });
    const g = m.snapshotGrouped();
    expect(g[m.NAMES.AUDIT_APPENDED]).toEqual({ 'action=ACK': 1, 'action=TRIGGERED': 1 });
    expect(g[m.NAMES.AUDIT_VERIFIED]).toEqual({ 'result=ok': 1 });
  });

  test('inc ignores empty name', () => {
    m.inc('');
    m.inc(null);
    expect(m.snapshot()).toEqual({});
  });

  test('NAMES are frozen', () => {
    expect(Object.isFrozen(m.NAMES)).toBe(true);
  });
});
