/**
 * W1070 — inventory-low-stock smart-alert rule.
 *
 * Fifth `category: 'operational'` rule, and the first TWO-MODEL join (stock
 * quantities on `InventoryStock`, thresholds on `InventoryItem`). Verifies the
 * join + predicate (available ≤ reorder point), the no-threshold skip, the
 * out-of-stock → critical escalation, the object-export model resolution (and the
 * direct-model fallback), and the no-op guard. Fake-finder harness (no DB).
 */

'use strict';

const { AlertsEngine } = require('../alerts');
const rules = require('../alerts/rules');

function finder(rows) {
  // find({}) returns all rows (low-stock loads the full item + stock sets)
  return { find: async () => rows.slice() };
}

function ruleById(id) {
  const r = rules.find(x => x.id === id);
  if (!r) throw new Error(`Rule ${id} not registered`);
  return r;
}

async function runOne(models) {
  const eng = new AlertsEngine({ now: () => new Date('2026-06-01') });
  eng.register(ruleById('inventory-low-stock'));
  const result = await eng.runAll({ models });
  return result.raised.filter(a => a.ruleId === 'inventory-low-stock');
}

// object-export shapes, matching how the app.js loader hands back the wrappers
function items(rows) {
  return { InventoryItem: finder(rows) };
}
function stock(rows) {
  return { InventoryStock: finder(rows) };
}

describe('inventory-low-stock', () => {
  test('is registered as an operational rule', () => {
    const r = ruleById('inventory-low-stock');
    expect(r.category).toBe('operational');
    expect(r.severity).toBe('high');
  });

  test('fires when available ≤ reorder point; skips well-stocked + un-thresholded items', async () => {
    const raised = await runOne({
      InventoryItem: items([
        { _id: 'i1', name: 'Gloves', reorderPoint: 50 },
        { _id: 'i2', name: 'Wipes', reorderPoint: 20 },
        { _id: 'i3', name: 'Misc', reorderPoint: 0 }, // no threshold configured
      ]),
      InventoryStock: stock([
        { _id: 's1', itemId: 'i1', quantityOnHand: 40, quantityReserved: 0 }, // 40 ≤ 50 → low
        { _id: 's2', itemId: 'i2', quantityOnHand: 100, quantityReserved: 0 }, // 100 > 20 → ok
        { _id: 's3', itemId: 'i3', quantityOnHand: 0, quantityReserved: 0 }, // no threshold → skip
      ]),
    });
    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe('inventory-low-stock:s1');
    expect(raised[0].category).toBe('operational');
    expect(raised[0].severity).toBe('high');
    expect(raised[0].message).toMatch(/Gloves/);
    expect(raised[0].message).toMatch(/reorder point 50/);
  });

  test('reserved quantity counts against availability', async () => {
    const raised = await runOne({
      InventoryItem: items([{ _id: 'i1', name: 'Syringes', reorderPoint: 10 }]),
      InventoryStock: stock([{ _id: 's1', itemId: 'i1', quantityOnHand: 15, quantityReserved: 8 }]), // avail 7 ≤ 10
    });
    expect(raised).toHaveLength(1);
  });

  test('out of stock escalates to critical', async () => {
    const raised = await runOne({
      InventoryItem: items([{ _id: 'i1', name: 'Masks', reorderPoint: 30 }]),
      InventoryStock: stock([{ _id: 's1', itemId: 'i1', quantityOnHand: 0, quantityReserved: 0 }]),
    });
    expect(raised).toHaveLength(1);
    expect(raised[0].severity).toBe('critical');
  });

  test('falls back to minStockLevel when reorderPoint is 0', async () => {
    const raised = await runOne({
      InventoryItem: items([{ _id: 'i1', name: 'Tape', reorderPoint: 0, minStockLevel: 5 }]),
      InventoryStock: stock([{ _id: 's1', itemId: 'i1', quantityOnHand: 5, quantityReserved: 0 }]),
    });
    expect(raised).toHaveLength(1);
  });

  test('resolves direct-model exports too (not only object wrappers)', async () => {
    const raised = await runOne({
      InventoryItem: finder([{ _id: 'i1', name: 'Pads', reorderPoint: 10 }]),
      InventoryStock: finder([{ _id: 's1', itemId: 'i1', quantityOnHand: 3, quantityReserved: 0 }]),
    });
    expect(raised).toHaveLength(1);
  });

  test('missing either model → defensive no-op', async () => {
    expect(await runOne({})).toHaveLength(0);
    expect(await runOne({ InventoryItem: items([{ _id: 'i1', reorderPoint: 10 }]) })).toHaveLength(
      0
    );
  });
});
