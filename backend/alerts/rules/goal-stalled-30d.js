/**
 * Rule: SMART goal in-progress with no recorded progress in 30 days.
 *
 * Mirrors `kpi.rehab.goals.stalled.pct`. The clinical supervisor
 * needs to know which specific goals stalled — not just that the
 * branch ratio dropped — so they can reassign or revise interventions.
 */

'use strict';

const STALL_DAYS = 30;

module.exports = {
  id: 'goal-stalled-30d',
  severity: 'warning',
  category: 'clinical',
  description: 'SMART goal in-progress with no update for 30 days',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.Goal) return [];
    const now = ctx.now || new Date();
    const cutoff = new Date(now.getTime() - STALL_DAYS * 24 * 60 * 60 * 1000);
    const rows = await ctx.models.Goal.find({
      status: 'in-progress',
      lastProgressAt: { $lte: cutoff },
    });
    return rows.map(g => ({
      key: `goal-stalled:${g._id}`,
      subject: { type: 'Goal', id: g._id },
      branchId: g.branchId,
      message: `Goal ${g.title || g._id} stalled — last progress ${g.lastProgressAt ? new Date(g.lastProgressAt).toISOString().slice(0, 10) : 'never'}`,
    }));
  },
};
