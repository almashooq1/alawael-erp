'use strict';

/**
 * W1124 — biomedical-waste-storage-overdue smart-alert rule.
 *
 * Verifies the predicate (stored + past storedAt+maxStorageHours), the
 * hazardous→critical escalation, the fresh/non-stored skips, and the defensive
 * no-op. Fake-finder harness (no DB).
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
  eng.register(ruleById('biomedical-waste-storage-overdue'));
  const result = await eng.runAll({ models, now });
  return result.raised.filter(a => a.ruleId === 'biomedical-waste-storage-overdue');
}

const BRANCH = '64b000000000000000000001';
const hoursAgo = (h, from = new Date('2026-06-10T12:00:00Z')) => new Date(from.getTime() - h * 3600 * 1000);

describe('biomedical-waste-storage-overdue', () => {
  test('registered as an operational rule', () => {
    const r = ruleById('biomedical-waste-storage-overdue');
    expect(r.category).toBe('operational');
    expect(r.severity).toBe('high');
  });

  test('fires on stored waste past its limit; skips fresh', async () => {
    const raised = await runOne({
      BiomedicalWasteRecord: finder([
        {
          _id: 'w1',
          recordNumber: 'BMW-2026-0001',
          status: 'stored',
          wasteCategory: 'general',
          storedAt: hoursAgo(100),
          maxStorageHours: 48,
          branchId: BRANCH,
          deletedAt: null,
        },
        {
          _id: 'w2',
          status: 'stored',
          wasteCategory: 'general',
          storedAt: hoursAgo(1),
          maxStorageHours: 48,
          deletedAt: null,
        }, // fresh
      ]),
    });
    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe('biomedical-waste-storage-overdue:w1');
    expect(raised[0].branchId).toBe(BRANCH);
    expect(raised[0].severity).toBe('high'); // general → default high
  });

  test('hazardous category overdue escalates to critical', async () => {
    const raised = await runOne({
      BiomedicalWasteRecord: finder([
        {
          _id: 'w3',
          status: 'stored',
          wasteCategory: 'infectious',
          storedAt: hoursAgo(72),
          maxStorageHours: 48,
          deletedAt: null,
        },
      ]),
    });
    expect(raised).toHaveLength(1);
    expect(raised[0].severity).toBe('critical');
  });

  test('non-stored / no storedAt are skipped', async () => {
    const raised = await runOne({
      BiomedicalWasteRecord: finder([
        { _id: 'w4', status: 'collected', wasteCategory: 'sharps', storedAt: hoursAgo(200), maxStorageHours: 48, deletedAt: null },
        { _id: 'w5', status: 'stored', wasteCategory: 'sharps', storedAt: null, maxStorageHours: 48, deletedAt: null },
      ]),
    });
    expect(raised).toHaveLength(0);
  });

  test('no model → defensive no-op', async () => {
    const raised = await runOne({});
    expect(raised).toHaveLength(0);
  });
});
