'use strict';

/**
 * W1121 — two operational smart-alert rules in the quality domain:
 *   • capa-overdue          — CAPA past dueDate, still actionable (CBAHI).
 *   • calibration-overdue   — equipment calibration overdue, or failed (critical).
 *
 * Same fake-finder harness the other 24 rule tests use (no DB). Verifies the
 * predicate, the status filters, the severity escalations, and the defensive
 * no-op when the model is absent.
 */

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
      if ('$lt' in v) {
        if (docVal == null) return false;
        const d = docVal instanceof Date ? docVal.getTime() : docVal;
        const lt = v.$lt instanceof Date ? v.$lt.getTime() : v.$lt;
        return d < lt;
      }
    }
    return docVal === v;
  });
}

function ruleById(id) {
  const r = rules.find(x => x.id === id);
  if (!r) throw new Error(`Rule ${id} not registered`);
  return r;
}

async function runOne(ruleId, models, now = new Date('2026-06-10')) {
  const eng = new AlertsEngine({ now: () => now });
  eng.register(ruleById(ruleId));
  const result = await eng.runAll({ models, now });
  return result.raised.filter(a => a.ruleId === ruleId);
}

const PAST = new Date('2026-05-01');
const FUTURE = new Date('2026-08-01');
const BRANCH = '64b000000000000000000001';

describe('capa-overdue', () => {
  test('registered as an operational rule', () => {
    const r = ruleById('capa-overdue');
    expect(r.category).toBe('operational');
    expect(r.severity).toBe('high');
  });

  test('fires on an actionable CAPA past due; skips future-due + terminal', async () => {
    const raised = await runOne('capa-overdue', {
      CapaItem: finder([
        { _id: 'c1', capaNumber: 'CAPA-2026-0001', title: 'Fix sterilizer log', status: 'IN_PROGRESS', dueDate: PAST, branchId: BRANCH, priority: 'medium' },
        { _id: 'c2', status: 'OPEN', dueDate: FUTURE, priority: 'low' }, // not yet due
        { _id: 'c3', status: 'CLOSED', dueDate: PAST, priority: 'high' }, // terminal
        { _id: 'c4', status: 'VERIFIED', dueDate: PAST, priority: 'high' }, // action already verified
      ]),
    });
    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe('capa-overdue:c1');
    expect(raised[0].branchId).toBe(BRANCH);
    expect(raised[0].severity).toBe('high');
    expect(raised[0].message).toMatch(/overdue/);
  });

  test('high/critical priority overdue CAPA escalates to critical', async () => {
    const raised = await runOne('capa-overdue', {
      CapaItem: finder([
        { _id: 'c5', status: 'OPEN', dueDate: PAST, priority: 'critical' },
        { _id: 'c6', status: 'IMPLEMENTED', dueDate: PAST, priority: 'high' },
      ]),
    });
    expect(raised).toHaveLength(2);
    expect(raised.every(a => a.severity === 'critical')).toBe(true);
  });

  test('no CapaItem model → defensive no-op', async () => {
    const raised = await runOne('capa-overdue', {});
    expect(raised).toHaveLength(0);
  });
});

describe('calibration-overdue', () => {
  test('registered as an operational rule', () => {
    const r = ruleById('calibration-overdue');
    expect(r.category).toBe('operational');
    expect(r.severity).toBe('high');
  });

  test('fires on an in-service asset overdue; skips current + excluded statuses', async () => {
    const raised = await runOne('calibration-overdue', {
      CalibrationAsset: finder([
        { _id: 'k1', name: 'Audiometer', status: 'active', nextDueDate: PAST, branchId: BRANCH },
        { _id: 'k2', name: 'Scale', status: 'active', nextDueDate: FUTURE }, // current
        { _id: 'k3', name: 'Old pump', status: 'retired', nextDueDate: PAST }, // excluded
        { _id: 'k4', name: 'Servicing', status: 'in_calibration', nextDueDate: PAST }, // excluded
      ]),
    });
    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe('calibration-overdue:k1');
    expect(raised[0].severity).toBe('high');
    expect(raised[0].message).toMatch(/overdue/);
  });

  test('a FAILED calibration escalates to critical regardless of date', async () => {
    const raised = await runOne('calibration-overdue', {
      CalibrationAsset: finder([
        { _id: 'k5', name: 'BP cuff', status: 'failed', nextDueDate: FUTURE },
      ]),
    });
    expect(raised).toHaveLength(1);
    expect(raised[0].severity).toBe('critical');
    expect(raised[0].message).toMatch(/FAILED/);
  });

  test('awaiting_calibration past due also fires', async () => {
    const raised = await runOne('calibration-overdue', {
      CalibrationAsset: finder([
        { _id: 'k6', name: 'Thermometer', status: 'awaiting_calibration', nextDueDate: PAST },
      ]),
    });
    expect(raised).toHaveLength(1);
  });

  test('no CalibrationAsset model → defensive no-op', async () => {
    const raised = await runOne('calibration-overdue', {});
    expect(raised).toHaveLength(0);
  });
});
