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
  // ── Phase 11 baseline (5) ───────────────────────────────────
  require('./credential-expiry-30d'),
  require('./irp-overdue-approval'),
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
];
