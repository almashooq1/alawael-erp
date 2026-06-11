'use strict';

/**
 * Smart Alerts rule registry.
 *
 * Phase 11 baseline shipped 5 rules. Wave 3 (2026-05-16) added 12
 * more — bringing total coverage to 17 rules spanning HR,
 * compliance, clinical, financial, and quality categories.
 *
 * Each rule is self-contained: `engine.registerAll([...])` is
 * driven by this list, and the dispatcher picks up routing
 * automatically via `category` + `severity` (see recipients.js).
 *
 * To add a new rule:
 *   1. Drop a `.js` file in this directory exporting
 *      `{ id, severity, category, description, evaluate }`.
 *   2. Require it here.
 *   3. Add a test case to `__tests__/alerts.rules.wave3.test.js`
 *      (or `alerts.engine.test.js` for the original 5).
 */

module.exports = [
  // ── Phase 11 baseline (4 — W1150 removed orphan irp-overdue-approval) ──
  require('./credential-expiry-30d'),
  require('./invoice-overdue-60d'),
  require('./incident-major'),
  require('./zatca-submission-rejected'),

  // ── Wave 3 — compliance & documents (4) ─────────────────────
  require('./document-expiring-30d'),
  require('./document-expired'),
  require('./pdpl-dsar-approaching-sla'),
  require('./pdpl-dsar-sla-breach'),

  // ── Wave 3 — clinical & safety (4) ──────────────────────────
  require('./care-plan-unsigned-14d'),
  require('./care-plan-review-overdue'),
  require('./goal-stalled-30d'),
  require('./vaccination-overdue'),

  // ── Wave 3 — HR escalations (3) ─────────────────────────────
  require('./credential-expired'),
  // ── W1151 — staff certification expiry (the UI-backed credential model) ──
  require('./staff-certification-expired'),
  require('./staff-certification-expiry-30d'),
  require('./employment-contract-expiring-60d'),
  require('./employment-contract-expired'),

  // ── Wave 3 — financial & quality escalations (2) ────────────
  require('./invoice-overdue-90d-critical'),
  require('./incident-critical-open-24h'),

  // ── Wave 5 — statistical anomaly bridge (1) ─────────────────
  // Reads from ctx.kpiHistoryStore (injected at boot). Silent
  // no-op when the store isn't wired, so it's safe to ship now
  // and turn on later by registering the store in app.js.
  require('./kpi-anomaly-detected'),

  // ── W1006 — operational / facilities (1) ────────────────────
  // First `category: 'operational'` rule — facility PPM/inspection
  // overdue. Needs `FacilityAsset` in the app.js model loader to fire
  // (defensive no-op otherwise).
  require('./facility-asset-ppm-overdue'),

  // ── W1007 — operational / maintenance (1) ───────────────────
  // Work order past its scheduled date and still open. Needs
  // `MaintenanceWorkOrder` in the app.js model loader to fire.
  require('./maintenance-work-order-overdue'),

  // ── W1008 — operational / fleet (1) ─────────────────────────
  // Active vehicle with expired registration / insurance / inspection.
  // Needs `Vehicle` in the app.js model loader to fire.
  require('./vehicle-document-expiry'),

  // ── W1009 — operational / contracts (1) ─────────────────────
  // Contract still ACTIVE but past endDate. Needs `Contract.model`
  // in the app.js model loader to fire (file is Contract.model.js).
  require('./contract-expired'),

  // ── W1070 — operational / inventory (1) ─────────────────────
  // Item at/below its reorder point (a TWO-model join across
  // InventoryStock + InventoryItem). Needs both in the app.js loader.
  require('./inventory-low-stock'),

  // ── W1121 — operational / quality (2) ───────────────────────
  // Self-loading (require the model directly when absent from ctx.models),
  // so they fire without an app.js model-loader edit.
  // CAPA past its due date and not yet completed (CBAHI quality management).
  require('./capa-overdue'),
  // Calibrated equipment overdue, or a failed calibration (→ critical).
  require('./calibration-overdue'),

  // ── W1124 — operational / waste (1) ─────────────────────────
  // Biomedical waste stored on-site past its WHO/CBAHI time limit
  // (links the W1123 waste system into the Alert sink). Self-loading.
  require('./biomedical-waste-storage-overdue'),

  // ── W1126 — operational / occupational health (1) ───────────
  // Staff occ-health surveillance overdue (links the W1125 system). Self-loading.
  require('./staff-health-surveillance-overdue'),

  // ── W1132 — operational / procurement (1) ───────────────────
  // Purchase order past its expected delivery date and not received.
  // Self-loading (no app.js edit).
  require('./purchase-order-delivery-overdue'),

  // ── W1135 — compliance / training (1) ───────────────────────
  // Staff mandatory training overdue (TrainingCompliance). Self-loading.
  require('./training-compliance-overdue'),

  // ── W1138 — quality / supplier (1) ──────────────────────────
  // Supplier corrective action (SCAR) response overdue. Self-loading.
  require('./supplier-scar-response-overdue'),

  // ── W1141 — financial / budget (1) ──────────────────────────
  // Active budget consumed ≥90% of allocation (≥100% = critical). Self-loading.
  require('./budget-overrun'),

  // ── W1197 — HR / pay equity (1) ─────────────────────────────
  // Latest pay-equity snapshot breaches the equity-score floor or a REPORTABLE
  // demographic gap ceiling (closes the W1193/W1194 loop into the Alert sink).
  // Self-loading (lazy PayEquitySnapshot lookup, no app.js model-loader edit).
  require('./pay-equity-gap-exceeded'),
];
