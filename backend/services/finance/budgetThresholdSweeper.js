/**
 * budgetThresholdSweeper.js — W401 producer for `finance.budget.threshold_reached`.
 *
 * Iterates active budgets (status='active') and emits one
 * integrationBus.publish('finance', 'budget.threshold_reached', {...}) per
 * budget whose utilization is at or above the configured threshold
 * (default 80%). Pure/injectable: pass { BudgetModel, integrationBus }.
 *
 * Idempotency strategy: this is a sweeper, not a hot path. The cron in
 * financeBootstrap.js runs once daily; emitting one reminder per day per
 * over-threshold budget is acceptable. Notification subscribers should
 * dedup at their own layer if quieter signaling is needed.
 *
 * Envelope per SYSTEM_EVENTS.BUDGET_THRESHOLD_REACHED:
 *   { departmentId, budgetId, currentSpend, budgetLimit, percentage }
 *
 * Wired by W401 to close W382 KNOWN_DEAD_CONTRACTS entry
 * `finance.BUDGET_THRESHOLD_REACHED` + W392 LIVE-orphan entry
 * `finance.budget.threshold_reached`.
 */

'use strict';

const DEFAULT_THRESHOLD_PERCENT = 80;

function computePercentage(spent, total) {
  const t = Number(total) || 0;
  if (t <= 0) return 0;
  return (Number(spent || 0) / t) * 100;
}

async function sweepBudgetThresholds({
  BudgetModel,
  integrationBus,
  thresholdPercent = DEFAULT_THRESHOLD_PERCENT,
  logger,
} = {}) {
  if (!BudgetModel || !integrationBus) {
    return { scanned: 0, emitted: 0, errors: 0, reason: 'missing_deps' };
  }

  let scanned = 0;
  let emitted = 0;
  let errors = 0;

  let budgets = [];
  try {
    budgets = await BudgetModel.find(
      { status: 'active', isDeleted: { $ne: true } },
      { _id: 1, department: 1, totalSpent: 1, totalBudgeted: 1, utilizationPercentage: 1 }
    ).lean();
  } catch (err) {
    logger?.warn?.('[budgetThresholdSweeper] find failed', { error: err.message });
    return { scanned: 0, emitted: 0, errors: 1, reason: 'find_failed' };
  }

  for (const b of budgets) {
    scanned++;
    const pct =
      typeof b.utilizationPercentage === 'number' && b.utilizationPercentage > 0
        ? b.utilizationPercentage
        : computePercentage(b.totalSpent, b.totalBudgeted);
    if (pct < thresholdPercent) continue;
    try {
      await integrationBus.publish('finance', 'budget.threshold_reached', {
        departmentId: String(b.department || ''),
        budgetId: String(b._id),
        currentSpend: Number(b.totalSpent || 0),
        budgetLimit: Number(b.totalBudgeted || 0),
        percentage: Number(pct.toFixed(2)),
      });
      emitted++;
    } catch (err) {
      errors++;
      logger?.warn?.('[budgetThresholdSweeper] publish failed', {
        budgetId: String(b._id),
        error: err.message,
      });
    }
  }

  if (emitted > 0) {
    logger?.info?.(
      `[budgetThresholdSweeper] scanned=${scanned} emitted=${emitted} errors=${errors} threshold=${thresholdPercent}%`
    );
  }

  return { scanned, emitted, errors };
}

module.exports = {
  sweepBudgetThresholds,
  computePercentage,
  DEFAULT_THRESHOLD_PERCENT,
};
