/**
 * W1007 — maintenance-work-order-overdue smart-alert rule.
 *
 * Second `category: 'operational'` rule (companion to W1006 facility-asset).
 * Verifies the predicate (scheduledDate in the past, status still open), the
 * excluded-state filter (draft + the terminals), and the critical-priority →
 * critical severity escalation. Same fake-finder harness the other rule tests
 * use (no DB).
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

async function runOne(models, now = new Date('2026-06-01')) {
  const eng = new AlertsEngine({ now: () => now });
  eng.register(ruleById('maintenance-work-order-overdue'));
  const result = await eng.runAll({ models, now });
  return result.raised.filter(a => a.ruleId === 'maintenance-work-order-overdue');
}

const PAST = new Date('2026-05-01');
const FUTURE = new Date('2026-07-01');
const BRANCH = '64b000000000000000000002';

describe('maintenance-work-order-overdue', () => {
  test('is registered as an operational rule', () => {
    const r = ruleById('maintenance-work-order-overdue');
    expect(r.category).toBe('operational');
    expect(r.severity).toBe('high');
  });

  test('fires on an open WO past its scheduled date; skips current and terminal ones', async () => {
    const raised = await runOne({
      MaintenanceWorkOrder: finder([
        { _id: 'w1', title: 'Replace HVAC filter', status: 'in_progress', scheduledDate: PAST, branchId: BRANCH },
        { _id: 'w2', title: 'Paint hallway', status: 'scheduled', scheduledDate: FUTURE, branchId: BRANCH },
        { _id: 'w3', title: 'Old job', status: 'completed', scheduledDate: PAST, branchId: BRANCH },
        { _id: 'w4', title: 'Draft idea', status: 'draft', scheduledDate: PAST, branchId: BRANCH },
        { _id: 'w5', title: 'Cancelled job', status: 'cancelled', scheduledDate: PAST, branchId: BRANCH },
      ]),
    });
    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe('maintenance-wo-overdue:w1');
    expect(raised[0].branchId).toBe(BRANCH);
    expect(raised[0].category).toBe('operational');
    expect(raised[0].severity).toBe('high');
    expect(raised[0].message).toMatch(/overdue/);
  });

  test('a critical-priority overdue WO escalates to critical', async () => {
    const raised = await runOne({
      MaintenanceWorkOrder: finder([
        { _id: 'w6', title: 'Boiler fault', status: 'approved', scheduledDate: PAST, priority: 'critical', branchId: BRANCH },
      ]),
    });
    expect(raised).toHaveLength(1);
    expect(raised[0].severity).toBe('critical');
  });

  test('no MaintenanceWorkOrder model → defensive no-op', async () => {
    const raised = await runOne({});
    expect(raised).toHaveLength(0);
  });
});
