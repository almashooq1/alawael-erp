/**
 * Rule: invoice overdue by more than 90 days (write-off risk).
 *
 * Companion to `invoice-overdue-60d`. At 90+ days the AR team
 * needs to either escalate to legal or write the balance off —
 * different action than the 60-day "needs a phone call" tier.
 */

'use strict';

const CRITICAL_DAYS = 90;

module.exports = {
  id: 'invoice-overdue-90d-critical',
  severity: 'critical',
  category: 'financial',
  description: 'Invoice overdue > 90 days — write-off risk',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.Invoice) return [];
    const now = ctx.now || new Date();
    const cutoff = new Date(now.getTime() - CRITICAL_DAYS * 24 * 60 * 60 * 1000);
    const rows = await ctx.models.Invoice.find({
      status: { $in: ['issued', 'sent', 'partially_paid', 'overdue'] },
      dueDate: { $lte: cutoff },
    });
    return rows.map(inv => ({
      key: `invoice-90d:${inv._id}`,
      subject: { type: 'Invoice', id: inv._id, beneficiaryId: inv.beneficiaryId },
      branchId: inv.branchId,
      message: `Invoice ${inv.invoiceNumber || inv._id} overdue ${Math.floor((now - new Date(inv.dueDate)) / 86400000)}d — write-off risk`,
    }));
  },
};
