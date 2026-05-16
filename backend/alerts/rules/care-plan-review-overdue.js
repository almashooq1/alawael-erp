/**
 * Rule: active care plan whose scheduled review date has passed.
 *
 * Mirrors `kpi.rehab.care_plan.review.ontime.pct`. CBAHI Standard
 * CC.5 requires periodic care-plan review; the supervisor needs an
 * actionable alert (not just a falling KPI) when a plan is overdue.
 */

'use strict';

module.exports = {
  id: 'care-plan-review-overdue',
  severity: 'warning',
  category: 'clinical',
  description: 'Active care plan past its scheduled review date',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.CarePlan) return [];
    const now = ctx.now || new Date();
    const rows = await ctx.models.CarePlan.find({
      status: 'ACTIVE',
      reviewDate: { $lt: now },
    });
    return rows.map(p => ({
      key: `care-plan-review:${p._id}`,
      subject: { type: 'CarePlan', id: p._id, beneficiaryId: p.beneficiary },
      branchId: p.branchId,
      message: `Care plan ${p.planNumber || p._id} review overdue since ${new Date(p.reviewDate).toISOString().slice(0, 10)}`,
    }));
  },
};
