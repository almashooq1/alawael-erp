/**
 * Rule: an inventory item's available stock has dropped to or below its reorder
 * point (supply-continuity risk — therapy / medical / facility consumables).
 *
 * Fifth `category: 'operational'` smart-alert rule (after facilities W1006,
 * maintenance W1007, fleet W1008, contracts W1009). Unlike those single-model
 * rules, low-stock is a TWO-MODEL join: `InventoryStock` holds the per-warehouse
 * `quantityOnHand` / `quantityReserved`, while the threshold (`reorderPoint`)
 * lives on `InventoryItem`. The rule loads the item thresholds into a Map, then
 * scans stock rows. Surfaced to the ops team via the org-scoped `Alert` sink +
 * /api/v1/dashboards/alerts.
 *
 * Both inventory models use object exports (`{ ItemCategory, InventoryItem }`,
 * `{ InventoryStock, ... }`), so the app.js loader hands back the wrapper object;
 * `resolveModel` digs the real model out (checks `.find`, then the named key).
 *
 * Stock rows are warehouse-scoped (no `branchId`), so these alerts are
 * platform-scoped with the warehouse in the subject/metadata.
 */

'use strict';

function resolveModel(loaded, name) {
  if (!loaded) return null;
  if (typeof loaded.find === 'function') return loaded; // direct model export
  if (loaded[name] && typeof loaded[name].find === 'function') return loaded[name]; // object export
  return null;
}

module.exports = {
  id: 'inventory-low-stock',
  severity: 'high',
  category: 'operational',
  description: 'Inventory item at or below its reorder point',

  async evaluate(ctx) {
    if (!ctx.models) return [];
    const Stock = resolveModel(ctx.models.InventoryStock, 'InventoryStock');
    const Item = resolveModel(ctx.models.InventoryItem, 'InventoryItem');
    if (!Stock || !Item) return [];

    // Item thresholds: id → { reorderPoint, minStockLevel, name }
    const items = await Item.find({});
    const threshold = new Map();
    for (const it of items) {
      threshold.set(String(it._id), {
        reorderPoint: Number(it.reorderPoint) || 0,
        minStockLevel: Number(it.minStockLevel) || 0,
        name: it.name || it.nameAr || it.sku || String(it._id),
      });
    }

    const rows = await Stock.find({});
    const findings = [];
    for (const s of rows) {
      const t = threshold.get(String(s.itemId));
      if (!t) continue;
      const limit = t.reorderPoint > 0 ? t.reorderPoint : t.minStockLevel;
      if (limit <= 0) continue; // no threshold configured → nothing to breach
      const available =
        typeof s.quantityAvailable === 'number'
          ? s.quantityAvailable
          : Math.max(0, (Number(s.quantityOnHand) || 0) - (Number(s.quantityReserved) || 0));
      if (available > limit) continue;
      const finding = {
        // one alert per (item, warehouse) stock row
        key: `inventory-low-stock:${s._id}`,
        subject: { type: 'InventoryStock', id: s._id },
        branchId: s.branchId, // usually undefined (warehouse-scoped) → platform alert
        message: `Low stock: ${t.name} at ${available} (reorder point ${limit})`,
      };
      // Out of stock entirely is more urgent than merely at the reorder point.
      if (available <= 0) finding.severity = 'critical';
      findings.push(finding);
    }
    return findings;
  },
};
