/**
 * W1135 — training-compliance-overdue smart-alert rule.
 *
 * `category: 'compliance'` rule: a staff member's mandatory training
 * (`TrainingCompliance`) is `pending`/`overdue` with a past `dueDate`. Self-loading,
 * so the test ALWAYS injects the model (the require fallback would buffer/hang
 * without a DB). Fake-finder harness like the other rule tests.
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

async function runOne(rows, now = new Date('2026-06-01')) {
  const eng = new AlertsEngine({ now: () => now });
  eng.register(ruleById('training-compliance-overdue'));
  const result = await eng.runAll({ models: { TrainingCompliance: finder(rows) }, now });
  return result.raised.filter(a => a.ruleId === 'training-compliance-overdue');
}

const PAST = new Date('2026-05-01');
const FUTURE = new Date('2026-07-01');
const BRANCH = '64b000000000000000000005';

describe('training-compliance-overdue', () => {
  test('is registered as a compliance rule', () => {
    const r = ruleById('training-compliance-overdue');
    expect(r.category).toBe('compliance');
    expect(r.severity).toBe('high');
  });

  test('fires on pending/overdue records past due; skips future, completed, waived', async () => {
    const raised = await runOne([
      {
        _id: 't1',
        status: 'pending',
        dueDate: PAST,
        branchId: BRANCH,
        userId: 'u1',
        courseId: 'c1',
      },
      {
        _id: 't2',
        status: 'overdue',
        dueDate: PAST,
        branchId: BRANCH,
        userId: 'u2',
        courseId: 'c2',
      },
      { _id: 't3', status: 'pending', dueDate: FUTURE, branchId: BRANCH }, // not yet due
      { _id: 't4', status: 'completed', dueDate: PAST, branchId: BRANCH },
      { _id: 't5', status: 'waived', dueDate: PAST, branchId: BRANCH },
    ]);
    expect(raised).toHaveLength(2);
    const keys = raised.map(r => r.key).sort();
    expect(keys).toEqual(['training-compliance-overdue:t1', 'training-compliance-overdue:t2']);
    expect(raised[0].category).toBe('compliance');
    expect(raised.find(r => r.key.endsWith('t1')).branchId).toBe(BRANCH);
  });

  test('a pending record with no dueDate does not fire', async () => {
    const raised = await runOne([{ _id: 't6', status: 'pending', branchId: BRANCH }]);
    expect(raised).toHaveLength(0);
  });
});
