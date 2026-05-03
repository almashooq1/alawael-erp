/**
 * Rule: ZATCA rejected at least one invoice submission in the last 24h.
 *
 * Field paths match `models/Invoice.js → invoiceSchema.zatca`:
 *   • zatca.zatcaStatus: 'NOT_SUBMITTED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'
 *   • zatca.submittedToZatcaAt: Date
 *
 * Real-time alerts ALSO fire from `services/invoiceZatcaHook.js` the
 * moment a submission comes back REJECTED (see docs/blueprint/22-zatca-phase2.md).
 * This rule is the defense-in-depth sweep that catches anything missed
 * by the hook (e.g. submissions that pre-date the hook, or rejections
 * that happened while ops-alerter recipients were unconfigured).
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
      'zatca.zatcaStatus': 'REJECTED',
      'zatca.submittedToZatcaAt': { $gte: since },
    });
    return rows.map(inv => ({
      key: `zatca-rejected:${inv._id}`,
      subject: { type: 'Invoice', id: inv._id },
      branchId: inv.branchId,
      message: `ZATCA rejected invoice ${inv.invoiceNumber || inv._id}`,
      metadata: {
        errors: inv.zatca?.zatcaErrors,
        reference: inv.zatca?.zatcaReference,
      },
    }));
  },
};
