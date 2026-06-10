/**
 * Rule: an active budget has consumed ≥90% of its allocation (over budget when
 * ≥100%).
 *
 * `category: 'financial'` smart-alert rule (W1141). Distinct from the W401
 * `budgetThresholdSweeper`, which *notifies* via the integration bus — this
 * persists a trackable dashboard `Alert` (assignable, with a state machine) so the
 * finance team can work it. Surfaced to the `Alert` sink + /api/v1/dashboards/alerts.
 *
 * `Budget` is org/fiscal-level (no branch field) → platform-scoped alerts. Two
 * tiers: ≥100% consumed = over budget → `critical`; 90–100% = approaching limit →
 * `high`. Self-loading (no app.js model-loader edit).
 */

'use strict';

const ACTIVE = ['approved', 'active'];
const WARN_RATIO = 0.9;

function resolveModel(ctx) {
  const m = ctx.models && ctx.models.Budget;
  if (m && typeof m.find === 'function') return m;
  try {
    return require('../../models/Budget');
  } catch (_) {
    return null;
  }
}

module.exports = {
  id: 'budget-overrun',
  severity: 'high',
  category: 'financial',
  description: 'Budget consumed ≥90% of its allocation (over budget at ≥100%)',

  async evaluate(ctx = {}) {
    const Budget = resolveModel(ctx);
    if (!Budget) return [];
    const rows = await Budget.find({ status: { $in: ACTIVE } });
    const findings = [];
    for (const b of rows) {
      const budgeted = Number(b.totalBudgeted) || 0;
      if (budgeted <= 0) continue;
      const spent = Number(b.totalSpent) || 0;
      const ratio = spent / budgeted;
      if (ratio < WARN_RATIO) continue;
      const pct = Math.round(ratio * 100);
      const label = b.name || b.fiscalYear || b._id;
      const finding = {
        key: `budget-overrun:${b._id}`,
        subject: { type: 'Budget', id: b._id },
        branchId: b.branchId, // org/fiscal-level (usually undefined) → platform alert
        message: `Budget ${label} at ${pct}% of allocation (${spent} / ${budgeted})`,
      };
      if (ratio >= 1) finding.severity = 'critical'; // over budget
      findings.push(finding);
    }
    return findings;
  },
};
