'use strict';

/**
 * W786 — inventory-module stock receipt when PO lines carry item_id.
 * Mirrors inventory-module.routes.js POST purchase-orders/:id/receive.
 */

function getInventoryItemModel() {
  return require('../models/inventory/InventoryItem');
}

function getInventoryTransactionModel() {
  return require('../models/inventory/InventoryTransaction');
}

/**
 * @param {{ po: object, deltas: Array<{ item_id: unknown, quantity_delta: number, unit_cost?: number }>, actorId: unknown }} opts
 */
async function applyStockReceiptForPoLines({ po, deltas, actorId }) {
  if (!po || !Array.isArray(deltas) || !deltas.length) return;

  const InventoryItem = getInventoryItemModel();
  const InventoryTransaction = getInventoryTransactionModel();

  for (const line of deltas) {
    if (!line.item_id || !(line.quantity_delta > 0)) continue;

    const item = await InventoryItem.findById(line.item_id);
    if (!item) continue;

    const qtyBefore = item.quantity_on_hand || 0;
    const delta = Number(line.quantity_delta);
    const qtyAfter = qtyBefore + delta;
    const qtyAvailable = Math.max(0, qtyAfter - (item.quantity_reserved || 0));
    await InventoryItem.updateOne(
      { _id: line.item_id },
      { $set: { quantity_on_hand: qtyAfter, quantity_available: qtyAvailable } }
    );

    await InventoryTransaction.create({
      item_id: line.item_id,
      transaction_type: 'receipt',
      quantity: delta,
      unit_cost: line.unit_cost || 0,
      quantity_before: qtyBefore,
      quantity_after: qtyAfter,
      reference_type: 'PurchaseOrder',
      reference_id: po._id,
      reference_number: po.po_number,
      branch_id: po.branch_id,
      created_by: actorId,
    });
  }
}

module.exports = { applyStockReceiptForPoLines };
