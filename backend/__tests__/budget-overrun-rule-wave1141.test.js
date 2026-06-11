/**
 * W1141 — budget-overrun smart-alert rule.
 *
 * `category: 'financial'` rule: an active budget consumed ≥90% of allocation
 * (≥100% → critical). Self-loading, so the test ALWAYS injects the model.
 * Fake-finder harness like the other rule tests.
 */

'use strict';

const { AlertsEngine } = require('../alerts');
const rules = require('../alerts/rules');

function finder(rows) {
  return { find: async q => rows.filter(r => shallowMatch(r, q)) };
}

function shallowMatch(doc, q) {
  return Object.entries(q).every(([k, v]) => {
    const docVal = doc[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if ('$in' in v) return v.$in.includes(docVal);
      if ('$nin' in v) return !v.$nin.includes(docVal);
    }
    return docVal === v;
  });
}

function ruleById(id) {
  const r = rules.find(x => x.id === id);
  if (!r) throw new Error(`Rule ${id} not registered`);
  return r;
}

async function runOne(rows) {
  const eng = new AlertsEngine({ now: () => new Date('2026-06-01') });
  eng.register(ruleById('budget-overrun'));
  const result = await eng.runAll({ models: { Budget: finder(rows) } });
  return result.raised.filter(a => a.ruleId === 'budget-overrun');
}

describe('budget-overrun', () => {
  test('is registered as a financial rule', () => {
    const r = ruleById('budget-overrun');
    expect(r.category).toBe('financial');
    expect(r.severity).toBe('high');
  });

  test('fires at ≥90% (high) and ≥100% (critical); skips under-90% and non-active', async () => {
    const raised = await runOne([
      { _id: 'b1', name: 'OT supplies', status: 'active', totalBudgeted: 1000, totalSpent: 950 }, // 95% → high
      { _id: 'b2', name: 'PT supplies', status: 'active', totalBudgeted: 1000, totalSpent: 1200 }, // 120% → critical
      { _id: 'b3', name: 'Admin', status: 'active', totalBudgeted: 1000, totalSpent: 500 }, // 50% → skip
      { _id: 'b4', name: 'Old', status: 'closed', totalBudgeted: 1000, totalSpent: 1500 }, // closed → skip
      { _id: 'b5', name: 'Zero', status: 'active', totalBudgeted: 0, totalSpent: 100 }, // no allocation → skip
    ]);
    expect(raised).toHaveLength(2);
    const byId = Object.fromEntries(raised.map(r => [r.key, r]));
    expect(byId['budget-overrun:b1'].severity).toBe('high');
    expect(byId['budget-overrun:b1'].category).toBe('financial');
    expect(byId['budget-overrun:b1'].message).toMatch(/95%/);
    expect(byId['budget-overrun:b2'].severity).toBe('critical');
  });

  test('an approved (not yet active) budget over threshold also fires', async () => {
    const raised = await runOne([
      { _id: 'b6', status: 'approved', totalBudgeted: 100, totalSpent: 100 },
    ]);
    expect(raised).toHaveLength(1);
    expect(raised[0].severity).toBe('critical'); // exactly 100%
  });

  test('no Budget model → defensive no-op', async () => {
    const eng = new AlertsEngine({ now: () => new Date('2026-06-01') });
    eng.register(ruleById('budget-overrun'));
    const result = await eng.runAll({ models: { Budget: { find: async () => [] } } });
    expect(result.raised.filter(a => a.ruleId === 'budget-overrun')).toHaveLength(0);
  });
});
