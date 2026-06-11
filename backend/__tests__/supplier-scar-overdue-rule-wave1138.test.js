/**
 * W1138 — supplier-scar-response-overdue smart-alert rule.
 *
 * `category: 'quality'` rule: a SCAR awaiting supplier response (open/acknowledged/
 * in_progress/rejected) past its `responseDueBy`. Self-loading → the test ALWAYS
 * injects the model. Fake-finder harness like the other rule tests.
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
  eng.register(ruleById('supplier-scar-response-overdue'));
  const result = await eng.runAll({ models: { SupplierScar: finder(rows) }, now });
  return result.raised.filter(a => a.ruleId === 'supplier-scar-response-overdue');
}

const PAST = new Date('2026-05-01');
const FUTURE = new Date('2026-07-01');
const BRANCH = '64b000000000000000000006';

describe('supplier-scar-response-overdue', () => {
  test('is registered as a quality rule', () => {
    const r = ruleById('supplier-scar-response-overdue');
    expect(r.category).toBe('quality');
    expect(r.severity).toBe('high');
  });

  test('fires on awaiting-response SCARs past due; skips future + responded + closed', async () => {
    const raised = await runOne([
      {
        _id: 'q1',
        scarNumber: 'SCAR-1',
        status: 'open',
        responseDueBy: PAST,
        severity: 'major',
        branchId: BRANCH,
      },
      {
        _id: 'q2',
        scarNumber: 'SCAR-2',
        status: 'in_progress',
        responseDueBy: FUTURE,
        severity: 'minor',
        branchId: BRANCH,
      },
      {
        _id: 'q3',
        scarNumber: 'SCAR-3',
        status: 'response_received',
        responseDueBy: PAST,
        severity: 'major',
        branchId: BRANCH,
      },
      {
        _id: 'q4',
        scarNumber: 'SCAR-4',
        status: 'closed',
        responseDueBy: PAST,
        severity: 'major',
        branchId: BRANCH,
      },
    ]);
    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe('supplier-scar-response-overdue:q1');
    expect(raised[0].branchId).toBe(BRANCH);
    expect(raised[0].category).toBe('quality');
    expect(raised[0].severity).toBe('high');
    expect(raised[0].message).toMatch(/overdue/);
  });

  test('a critical SCAR overdue escalates to critical', async () => {
    const raised = await runOne([
      {
        _id: 'q5',
        scarNumber: 'SCAR-5',
        status: 'acknowledged',
        responseDueBy: PAST,
        severity: 'critical',
        branchId: BRANCH,
      },
    ]);
    expect(raised).toHaveLength(1);
    expect(raised[0].severity).toBe('critical');
  });

  test('a SCAR with no responseDueBy does not fire', async () => {
    const raised = await runOne([
      { _id: 'q6', status: 'open', severity: 'major', branchId: BRANCH },
    ]);
    expect(raised).toHaveLength(0);
  });
});
