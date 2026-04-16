/**
 * Rule: IRP draft awaiting approval > 72 hours.
 */

'use strict';

module.exports = {
  id: 'irp-overdue-approval',
  severity: 'high',
  category: 'clinical',
  description: 'IRP draft has awaited approval for more than 72 hours',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.IRP) return [];
    const now = ctx.now || new Date();
    const cutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const rows = await ctx.models.IRP.find({
      status: 'pending_approval',
      createdAt: { $lte: cutoff },
    });
    return rows.map(irp => ({
      key: `irp-approval:${irp._id}`,
      subject: { type: 'IRP', id: irp._id, beneficiaryId: irp.beneficiaryId },
      branchId: irp.branchId,
      message: `IRP ${irp.planCode || irp._id} pending approval > 72h`,
    }));
  },
};
