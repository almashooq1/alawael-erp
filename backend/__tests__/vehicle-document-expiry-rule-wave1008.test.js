/**
 * W1008 — vehicle-document-expiry smart-alert rule.
 *
 * Third `category: 'operational'` rule (after W1006 facility-asset + W1007
 * maintenance-WO). Verifies the nested-date predicate (registration / insurance /
 * inspection expiry on an active vehicle), the active-status filter, the
 * registration|insurance → critical escalation, and the platform-scope (no branch
 * field → branchId undefined). Same fake-finder harness the other rule tests use.
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
  eng.register(ruleById('vehicle-document-expiry'));
  const result = await eng.runAll({ models, now });
  return result.raised.filter(a => a.ruleId === 'vehicle-document-expiry');
}

const PAST = new Date('2026-05-01');
const FUTURE = new Date('2026-07-01');
const ACTIVE = 'نشطة';
const SOLD = 'مبيعة';

describe('vehicle-document-expiry', () => {
  test('is registered as an operational rule', () => {
    const r = ruleById('vehicle-document-expiry');
    expect(r.category).toBe('operational');
    expect(r.severity).toBe('high');
  });

  test('an overdue inspection alone fires HIGH (platform-scoped: no branchId)', async () => {
    const raised = await runOne({
      Vehicle: finder([
        {
          _id: 'v1',
          plateNumber: 'ABC-123',
          status: ACTIVE,
          registration: { expiryDate: FUTURE },
          insurance: { policyExpiryDate: FUTURE },
          inspection: { nextInspectionDate: PAST },
        },
      ]),
    });
    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe('vehicle-doc-expiry:v1');
    expect(raised[0].category).toBe('operational');
    expect(raised[0].severity).toBe('high');
    expect(raised[0].branchId).toBeUndefined();
    expect(raised[0].message).toMatch(/inspection/);
  });

  test('expired registration or insurance escalates to critical', async () => {
    const raised = await runOne({
      Vehicle: finder([
        {
          _id: 'v2',
          plateNumber: 'XYZ-789',
          status: ACTIVE,
          registration: { expiryDate: PAST },
          insurance: { policyExpiryDate: FUTURE },
        },
      ]),
    });
    expect(raised).toHaveLength(1);
    expect(raised[0].severity).toBe('critical');
    expect(raised[0].message).toMatch(/registration/);
  });

  test('a fully-current active vehicle does not fire', async () => {
    const raised = await runOne({
      Vehicle: finder([
        {
          _id: 'v3',
          status: ACTIVE,
          registration: { expiryDate: FUTURE },
          insurance: { policyExpiryDate: FUTURE },
          inspection: { nextInspectionDate: FUTURE },
        },
      ]),
    });
    expect(raised).toHaveLength(0);
  });

  test('a sold/withdrawn vehicle is excluded even when expired', async () => {
    const raised = await runOne({
      Vehicle: finder([{ _id: 'v4', status: SOLD, registration: { expiryDate: PAST } }]),
    });
    expect(raised).toHaveLength(0);
  });

  test('no Vehicle model → defensive no-op', async () => {
    const raised = await runOne({});
    expect(raised).toHaveLength(0);
  });
});
