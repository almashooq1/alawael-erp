'use strict';

/**
 * W1126 — staff-health-surveillance-overdue smart-alert rule.
 * Predicate (nextDueDate past + not closed), urgent→critical, skips, no-op.
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
    }
    return docVal === v;
  });
}
function ruleById(id) {
  const r = rules.find(x => x.id === id);
  if (!r) throw new Error(`Rule ${id} not registered`);
  return r;
}
async function runOne(models, now = new Date('2026-06-10T12:00:00Z')) {
  const eng = new AlertsEngine({ now: () => now });
  eng.register(ruleById('staff-health-surveillance-overdue'));
  const result = await eng.runAll({ models, now });
  return result.raised.filter(a => a.ruleId === 'staff-health-surveillance-overdue');
}

const BRANCH = '64b000000000000000000001';
const PAST = new Date('2026-05-01');
const FUTURE = new Date('2026-08-01');

describe('staff-health-surveillance-overdue', () => {
  test('registered as an operational rule', () => {
    const r = ruleById('staff-health-surveillance-overdue');
    expect(r.category).toBe('operational');
    expect(r.severity).toBe('high');
  });

  test('fires on overdue surveillance; skips future + closed + no-due', async () => {
    const raised = await runOne({
      StaffHealthRecord: finder([
        {
          _id: 's1',
          recordType: 'tb_screening',
          recordNumber: 'OHR-2026-0001',
          status: 'open',
          nextDueDate: PAST,
          branchId: BRANCH,
          deletedAt: null,
        },
        {
          _id: 's2',
          recordType: 'immunization',
          status: 'open',
          nextDueDate: FUTURE,
          deletedAt: null,
        }, // future
        {
          _id: 's3',
          recordType: 'tb_screening',
          status: 'closed',
          nextDueDate: PAST,
          deletedAt: null,
        }, // closed
        {
          _id: 's4',
          recordType: 'periodic_checkup',
          status: 'open',
          nextDueDate: null,
          deletedAt: null,
        }, // no due
      ]),
    });
    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe('staff-health-surveillance-overdue:s1');
    expect(raised[0].branchId).toBe(BRANCH);
    expect(raised[0].severity).toBe('high');
  });

  test('exposure-incident or restricted overdue escalates to critical', async () => {
    const raised = await runOne({
      StaffHealthRecord: finder([
        {
          _id: 's5',
          recordType: 'exposure_incident',
          status: 'open',
          nextDueDate: PAST,
          deletedAt: null,
        },
        {
          _id: 's6',
          recordType: 'fitness_for_work',
          status: 'restricted',
          nextDueDate: PAST,
          restrictions: 'x',
          deletedAt: null,
        },
      ]),
    });
    expect(raised).toHaveLength(2);
    expect(raised.every(a => a.severity === 'critical')).toBe(true);
  });

  test('no model → defensive no-op', async () => {
    const raised = await runOne({});
    expect(raised).toHaveLength(0);
  });
});
