/**
 * Rule: employment contract past its end date but not yet marked
 * `terminated` or `expired`.
 *
 * Detects a data-entry hole where HR forgot to update status after
 * an employee's contract lapsed — which would otherwise leave the
 * person nominally `active` in payroll runs and access-control.
 */

'use strict';

module.exports = {
  id: 'employment-contract-expired',
  severity: 'critical',
  category: 'hr',
  description: 'Employment contract past end date but still marked active',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.EmploymentContract) return [];
    const now = ctx.now || new Date();
    const rows = await ctx.models.EmploymentContract.find({
      status: 'active',
      endDate: { $lt: now },
    });
    return rows.map(c => ({
      key: `employment-contract-expired:${c._id}`,
      subject: { type: 'EmploymentContract', id: c._id, employeeId: c.employeeId },
      branchId: c.branchId,
      message: `Employment contract ${c.contractNumber || c._id} ended ${new Date(c.endDate).toISOString().slice(0, 10)} but still ACTIVE`,
    }));
  },
};
