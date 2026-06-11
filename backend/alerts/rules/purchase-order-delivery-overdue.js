/**
 * Rule: a committed purchase order is past its expected delivery date and has
 * not been received — a procurement / supply-continuity signal (supplier late →
 * potential stockout).
 *
 * `category: 'operational'` smart-alert rule (W1132). Distinct from
 * `inventory-low-stock` (current shortfall) — this catches the *incoming* supply
 * being late before it becomes a shortfall. Feeds the same org-scoped `Alert`
 * sink + /api/v1/dashboards/alerts.
 *
 * Uses the SELF-LOADING pattern (no app.js model-loader edit): it prefers the
 * test-injectable `ctx.models` entry but falls back to a direct `require`, so it
 * fires in prod with zero change to app.js (kept tiny on purpose — app.js is a
 * parallel-work hot zone). The model is registered as `InventoryModulePurchaseOrder`
 * and uses snake_case fields (`expected_delivery_date`, `branch_id`, `po_number`).
 */

'use strict';

// committed, delivery not yet complete (excludes draft / pending_approval /
// received / cancelled / closed)
const AWAITING = ['approved', 'sent', 'partial'];

function resolvePOModel(ctx) {
  const m = ctx.models && (ctx.models.InventoryModulePurchaseOrder || ctx.models.PurchaseOrder);
  if (m && typeof m.find === 'function') return m;
  try {
    return require('../../models/inventory/PurchaseOrder');
  } catch (_) {
    return null;
  }
}

module.exports = {
  id: 'purchase-order-delivery-overdue',
  severity: 'high',
  category: 'operational',
  description: 'Purchase order past its expected delivery date and not yet received',

  async evaluate(ctx = {}) {
    const PO = resolvePOModel(ctx);
    if (!PO) return [];
    const now = ctx.now || new Date();
    const rows = await PO.find({ status: { $in: AWAITING } });
    const findings = [];
    for (const po of rows) {
      if (po.actual_delivery_date) continue; // already delivered
      if (!po.expected_delivery_date || new Date(po.expected_delivery_date) >= now) continue;
      const due = new Date(po.expected_delivery_date).toISOString().slice(0, 10);
      findings.push({
        key: `po-delivery-overdue:${po._id}`,
        subject: { type: 'PurchaseOrder', id: po._id },
        branchId: po.branch_id,
        message: `Purchase order ${po.po_number || po._id} delivery overdue since ${due} (status: ${po.status})`,
      });
    }
    return findings;
  },
};
