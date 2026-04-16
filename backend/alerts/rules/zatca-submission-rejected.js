/**
 * Rule: ZATCA rejected at least one invoice submission in the last 24h.
 */

'use strict';

module.exports = {
  id: 'zatca-submission-rejected',
  severity: 'high',
  category: 'financial',
  description: 'ZATCA rejected invoice submission(s) in last 24h',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.Invoice) return [];
    const now = ctx.now || new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const rows = await ctx.models.Invoice.find({
      'zatcaSubmission.status': 'rejected',
      'zatcaSubmission.submittedAt': { $gte: since },
    });
    return rows.map(inv => ({
      key: `zatca-rejected:${inv._id}`,
      subject: { type: 'Invoice', id: inv._id },
      branchId: inv.branchId,
      message: `ZATCA rejected invoice ${inv.invoiceNumber || inv._id}`,
    }));
  },
};
