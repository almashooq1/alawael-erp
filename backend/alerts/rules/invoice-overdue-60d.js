/**
 * Rule: invoice overdue by more than 60 days.
 */

'use strict';

module.exports = {
  id: 'invoice-overdue-60d',
  severity: 'high',
  category: 'financial',
  description: 'Invoice overdue > 60 days',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.Invoice) return [];
    const now = ctx.now || new Date();
    const cutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const rows = await ctx.models.Invoice.find({
      status: { $in: ['issued', 'sent', 'partially_paid', 'overdue'] },
      dueDate: { $lte: cutoff },
    });
    return rows.map(inv => ({
      key: `invoice:${inv._id}`,
      subject: { type: 'Invoice', id: inv._id, beneficiaryId: inv.beneficiaryId },
      branchId: inv.branchId,
      message: `Invoice ${inv.invoiceNumber || inv._id} overdue ${Math.floor((now - new Date(inv.dueDate)) / 86400000)}d`,
    }));
  },
};
