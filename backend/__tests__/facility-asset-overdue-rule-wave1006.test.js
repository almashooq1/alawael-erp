/**
 * W1006 — facility-asset-ppm-overdue smart-alert rule.
 *
 * The first `category: 'operational'` rule, extending the alerts engine from
 * clinical/compliance/finance into facilities/ops. Verifies the predicate
 * (maintenance OR inspection overdue on an in-service asset), the active-status
 * filter, and the life-safety → critical severity escalation. Same fake-finder
 * harness the other 19 rule tests use (no DB).
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
  eng.register(ruleById('facility-asset-ppm-overdue'));
  const result = await eng.runAll({ models, now });
  return result.raised.filter(a => a.ruleId === 'facility-asset-ppm-overdue');
}

const PAST = new Date('2026-05-01');
const FUTURE = new Date('2026-07-01');
const BRANCH = '64b000000000000000000001';

describe('facility-asset-ppm-overdue', () => {
  test('is registered in the rules list with category=operational', () => {
    const r = ruleById('facility-asset-ppm-overdue');
    expect(r.category).toBe('operational');
    expect(r.severity).toBe('high');
  });

  test('fires on an in-service asset with maintenance overdue; skips current ones', async () => {
    const raised = await runOne({
      FacilityAsset: finder([
        {
          _id: 'a1',
          name: 'Hydrotherapy pump',
          status: 'in_service',
          branchId: BRANCH,
          nextMaintenanceDue: PAST,
          nextInspectionDue: FUTURE,
          criticality: 'medium',
        },
        {
          _id: 'a2',
          name: 'Treadmill',
          status: 'in_service',
          nextMaintenanceDue: FUTURE,
          nextInspectionDue: FUTURE,
          criticality: 'low',
        },
      ]),
    });
    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe('facility-asset-ppm-overdue:a1');
    expect(raised[0].branchId).toBe(BRANCH);
    expect(raised[0].category).toBe('operational');
    expect(raised[0].severity).toBe('high');
    expect(raised[0].message).toMatch(/maintenance/);
  });

  test('flags inspection overdue too (message names it)', async () => {
    const raised = await runOne({
      FacilityAsset: finder([
        { _id: 'a3', name: 'Lift', status: 'in_service', nextInspectionDue: PAST, criticality: 'high' },
      ]),
    });
    expect(raised).toHaveLength(1);
    expect(raised[0].message).toMatch(/inspection/);
  });

  test('a life-safety asset overdue escalates to critical', async () => {
    const raised = await runOne({
      FacilityAsset: finder([
        {
          _id: 'a4',
          name: 'Fire suppression',
          status: 'in_service',
          nextMaintenanceDue: PAST,
          criticality: 'life_safety',
        },
      ]),
    });
    expect(raised).toHaveLength(1);
    expect(raised[0].severity).toBe('critical');
  });

  test('retired / out-of-service assets are excluded even when overdue', async () => {
    const raised = await runOne({
      FacilityAsset: finder([
        { _id: 'a5', status: 'retired', nextMaintenanceDue: PAST, criticality: 'high' },
        { _id: 'a6', status: 'out_of_service', nextMaintenanceDue: PAST, criticality: 'high' },
      ]),
    });
    expect(raised).toHaveLength(0);
  });

  test('no FacilityAsset model → defensive no-op', async () => {
    const raised = await runOne({});
    expect(raised).toHaveLength(0);
  });
});
