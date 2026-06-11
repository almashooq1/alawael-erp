/**
 * W1009 — contract-expired smart-alert rule.
 *
 * Fourth `category: 'operational'` rule (facilities/maintenance/fleet/contracts).
 * Verifies the predicate (ACTIVE status + endDate past), the status filter, the
 * `Contract.model` loader-key fallback, and the no-op guard. Same fake-finder
 * harness the other rule tests use.
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
  eng.register(ruleById('contract-expired'));
  const result = await eng.runAll({ models, now });
  return result.raised.filter(a => a.ruleId === 'contract-expired');
}

const PAST = new Date('2026-05-01');
const FUTURE = new Date('2026-07-01');
const BRANCH = '64b000000000000000000003';

describe('contract-expired', () => {
  test('is registered as an operational rule', () => {
    const r = ruleById('contract-expired');
    expect(r.category).toBe('operational');
    expect(r.severity).toBe('high');
  });

  test('fires on an ACTIVE contract past its endDate; skips current + non-active', async () => {
    const raised = await runOne({
      'Contract.model': finder([
        { _id: 'k1', title: 'Catering SLA', status: 'ACTIVE', endDate: PAST, branchId: BRANCH },
        { _id: 'k2', title: 'Cleaning SLA', status: 'ACTIVE', endDate: FUTURE, branchId: BRANCH },
        { _id: 'k3', title: 'Old SLA', status: 'EXPIRED', endDate: PAST, branchId: BRANCH },
        { _id: 'k4', title: 'Draft SLA', status: 'DRAFT', endDate: PAST, branchId: BRANCH },
      ]),
    });
    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe('contract-expired:k1');
    expect(raised[0].branchId).toBe(BRANCH);
    expect(raised[0].category).toBe('operational');
    expect(raised[0].message).toMatch(/expired/);
  });

  test('also resolves the model under the clean `Contract` key', async () => {
    const raised = await runOne({
      Contract: finder([{ _id: 'k5', status: 'ACTIVE', endDate: PAST, branchId: BRANCH }]),
    });
    expect(raised).toHaveLength(1);
  });

  test('no Contract model → defensive no-op', async () => {
    const raised = await runOne({});
    expect(raised).toHaveLength(0);
  });
});
