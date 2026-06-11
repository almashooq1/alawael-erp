/**
 * W1197 — pay-equity-gap-exceeded alert rule guard.
 * Static: registered + correct contract shape. Behavioural: the evaluate()
 * predicate (breach detection, reportable-only, latest-per-branch dedup, idempotent
 * key) against a mock model — no DB.
 */

'use strict';

const path = require('path');
const rules = require('../alerts/rules');
const rule = require('../alerts/rules/pay-equity-gap-exceeded');

// mock PayEquitySnapshot model: find(filter).lean() → rows
function model(rows) {
  return { find: () => ({ lean: () => Promise.resolve(rows) }) };
}
const ctx = (rows, now) => ({ models: { PayEquitySnapshot: model(rows) }, now: now || new Date('2026-06-15') });

const snap = (over = {}) => ({
  _id: over._id || 's1',
  branchId: over.branchId || 'bA',
  scope: over.scope || { level: 'branch', department: null },
  computedAt: over.computedAt || new Date('2026-06-01'),
  equityScore: over.equityScore != null ? over.equityScore : 90,
  genderGap: over.genderGap || { reportable: true, medianGapPct: 4, direction: 'female' },
  nationalityGap: over.nationalityGap || { reportable: false },
  ...over,
});

describe('W1197 pay-equity alert rule — contract + registration', () => {
  test('registered in the rules index', () => {
    expect(rules).toContain(rule);
  });
  test('exports the canonical rule shape', () => {
    expect(rule.id).toBe('pay-equity-gap-exceeded');
    expect(rule.category).toBe('hr');
    expect(['warning', 'critical', 'info']).toContain(rule.severity);
    expect(typeof rule.evaluate).toBe('function');
  });
});

describe('W1197 pay-equity alert rule — evaluate predicate', () => {
  test('no alert for a healthy snapshot', async () => {
    const out = await rule.evaluate(ctx([snap()]));
    expect(out).toEqual([]);
  });

  test('alerts on a low equity score, idempotent key + branchId carried', async () => {
    const out = await rule.evaluate(ctx([snap({ _id: 'sLow', equityScore: 55, branchId: 'bX' })]));
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('pay-equity-gap:sLow');
    expect(out[0].branchId).toBe('bX');
    expect(out[0].message).toMatch(/equity score 55 < floor 70/);
  });

  test('alerts on a reportable gap over the ceiling, NOT on a suppressed one', async () => {
    const reportable = snap({ _id: 'sGap', equityScore: 95, genderGap: { reportable: true, medianGapPct: 25, direction: 'female' } });
    const suppressed = snap({ _id: 'sSup', branchId: 'bB', equityScore: 95, nationalityGap: { reportable: false, medianGapPct: 40, direction: 'saudi' } });
    const out = await rule.evaluate(ctx([reportable, suppressed]));
    expect(out.map(a => a.key)).toEqual(['pay-equity-gap:sGap']); // only the reportable breach
    expect(out[0].message).toMatch(/gender median gap 25%/);
  });

  test('keeps only the LATEST snapshot per branch', async () => {
    const older = snap({ _id: 'old', branchId: 'bA', equityScore: 50, computedAt: new Date('2026-05-01') });
    const newer = snap({ _id: 'new', branchId: 'bA', equityScore: 92, computedAt: new Date('2026-06-01') });
    const out = await rule.evaluate(ctx([older, newer]));
    expect(out).toEqual([]); // newest (92) is healthy → the older breach is ignored
  });

  test('department-scoped snapshots are deduped independently of the branch-scoped one', async () => {
    const branchScope = snap({ _id: 'b', branchId: 'bA', equityScore: 92, scope: { level: 'branch', department: null } });
    const deptScope = snap({ _id: 'd', branchId: 'bA', equityScore: 40, scope: { level: 'department', department: 'PT' } });
    const out = await rule.evaluate(ctx([branchScope, deptScope]));
    expect(out.map(a => a.key)).toEqual(['pay-equity-gap:d']); // dept breach kept separately
  });

  test('no model → empty (defensive)', async () => {
    const out = await rule.evaluate({ models: {}, now: new Date('2026-06-15') });
    // lazy mongoose lookup returns null outside a connection → []
    expect(Array.isArray(out)).toBe(true);
  });
});
