/**
 * Rule: regulated document already past expiry.
 *
 * Mirrors `kpi.documents.expired.count`. A separate higher-severity
 * rule from `document-expiring-30d` so the dispatcher can route it
 * to a different escalation chain (compliance officer + admin).
 */

'use strict';

module.exports = {
  id: 'document-expired',
  severity: 'high',
  category: 'compliance',
  description: 'Document has passed its expiry date',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.Document) return [];
    const now = ctx.now || new Date();
    const rows = await ctx.models.Document.find({
      status: 'active',
      expiryDate: { $lt: now },
    });
    return rows.map(d => ({
      key: `document-expired:${d._id}`,
      subject: { type: 'Document', id: d._id },
      branchId: d.branchId,
      message: `Document ${d.title || d.documentNumber || d._id} expired on ${new Date(d.expiryDate).toISOString().slice(0, 10)}`,
    }));
  },
};
