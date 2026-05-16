/**
 * Rule: active employment contract ending within 60 days.
 *
 * HR needs ~60 days lead-time to either negotiate renewal terms,
 * issue a non-renewal notice, or coordinate visa transfer. A 30-day
 * window is too tight under Saudi labor law for non-citizen staff.
 */

'use strict';

const LEAD_DAYS = 60;

module.exports = {
  id: 'employment-contract-expiring-60d',
  severity: 'warning',
  category: 'hr',
  description: 'Employment contract expires within 60 days',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.EmploymentContract) return [];
    const now = ctx.now || new Date();
    const horizon = new Date(now.getTime() + LEAD_DAYS * 24 * 60 * 60 * 1000);
    const rows = await ctx.models.EmploymentContract.find({
      status: 'active',
      endDate: { $gte: now, $lte: horizon },
    });
    return rows.map(c => ({
      key: `employment-contract-expiring:${c._id}`,
      subject: { type: 'EmploymentContract', id: c._id, employeeId: c.employeeId },
      branchId: c.branchId,
      message: `Employment contract ${c.contractNumber || c._id} expires on ${new Date(c.endDate).toISOString().slice(0, 10)}`,
    }));
  },
};
