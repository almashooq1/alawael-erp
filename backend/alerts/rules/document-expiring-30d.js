/**
 * Rule: regulated document expiring within 30 days.
 *
 * Mirrors `kpi.documents.expiring_30d.count`. Catches PDPL consent
 * renewals, building permits, MOH licenses, etc. before they lapse.
 */

'use strict';

module.exports = {
  id: 'document-expiring-30d',
  severity: 'warning',
  category: 'compliance',
  description: 'Document expires within 30 days',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.Document) return [];
    const now = ctx.now || new Date();
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const rows = await ctx.models.Document.find({
      status: 'active',
      expiryDate: { $gte: now, $lte: horizon },
    });
    return rows.map(d => ({
      key: `document:${d._id}`,
      subject: { type: 'Document', id: d._id },
      branchId: d.branchId,
      message: `Document ${d.title || d.documentNumber || d._id} expires on ${new Date(d.expiryDate).toISOString().slice(0, 10)}`,
    }));
  },
};
