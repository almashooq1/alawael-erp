/**
 * W1132 — purchase-order-delivery-overdue smart-alert rule.
 *
 * `category: 'operational'` procurement rule. A committed PO (approved/sent/
 * partial) past its `expected_delivery_date` and not yet received is surfaced to
 * ops — the *incoming* supply is late (before it becomes a low-stock shortfall).
 *
 * The rule is self-loading (prefers `ctx.models`, falls back to `require`), so the
 * test ALWAYS injects the model — letting the require fallback run would hit the
 * real model with no DB connection and buffer/hang. Uses the same fake-finder
 * harness as the other rule tests.
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
  eng.register(ruleById('purchase-order-delivery-overdue'));
  // inject under the canonical model name so the require fallback never runs
  const result = await eng.runAll({ models: { InventoryModulePurchaseOrder: finder(rows) }, now });
  return result.raised.filter(a => a.ruleId === 'purchase-order-delivery-overdue');
}

const PAST = new Date('2026-05-01');
const FUTURE = new Date('2026-07-01');
const BRANCH = '64b000000000000000000004';

describe('purchase-order-delivery-overdue', () => {
  test('is registered as an operational rule', () => {
    const r = ruleById('purchase-order-delivery-overdue');
    expect(r.category).toBe('operational');
    expect(r.severity).toBe('high');
  });

  test('fires on a committed PO past expected delivery; skips on-time, delivered, and uncommitted', async () => {
    const raised = await runOne([
      {
        _id: 'p1',
        po_number: 'PO-1',
        status: 'sent',
        expected_delivery_date: PAST,
        branch_id: BRANCH,
      },
      {
        _id: 'p2',
        po_number: 'PO-2',
        status: 'approved',
        expected_delivery_date: FUTURE,
        branch_id: BRANCH,
      },
      {
        _id: 'p3',
        po_number: 'PO-3',
        status: 'partial',
        expected_delivery_date: PAST,
        actual_delivery_date: PAST,
        branch_id: BRANCH,
      },
      {
        _id: 'p4',
        po_number: 'PO-4',
        status: 'draft',
        expected_delivery_date: PAST,
        branch_id: BRANCH,
      },
      {
        _id: 'p5',
        po_number: 'PO-5',
        status: 'received',
        expected_delivery_date: PAST,
        branch_id: BRANCH,
      },
    ]);
    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe('po-delivery-overdue:p1');
    expect(raised[0].branchId).toBe(BRANCH);
    expect(raised[0].category).toBe('operational');
    expect(raised[0].message).toMatch(/overdue/);
  });

  test('a partially-received PO past its date (not fully delivered) still fires', async () => {
    const raised = await runOne([
      {
        _id: 'p6',
        po_number: 'PO-6',
        status: 'partial',
        expected_delivery_date: PAST,
        branch_id: BRANCH,
      },
    ]);
    expect(raised).toHaveLength(1);
  });

  test('a PO with no expected_delivery_date does not fire', async () => {
    const raised = await runOne([{ _id: 'p7', status: 'sent', branch_id: BRANCH }]);
    expect(raised).toHaveLength(0);
  });
});
