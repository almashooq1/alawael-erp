/**
 * Rule: PDPL DSAR within 5 days of its 30-day SLA.
 *
 * Early-warning companion to `pdpl-dsar-sla-breach`. Fires once a
 * request crosses the 25-day mark, giving the DPO a working week
 * to finalize the response before regulatory exposure begins.
 */

'use strict';

const WARN_DAYS = 25;
const SLA_DAYS = 30;
const OPEN_STATUSES = ['received', 'under_review', 'in_progress'];

module.exports = {
  id: 'pdpl-dsar-approaching-sla',
  severity: 'warning',
  category: 'compliance',
  description: 'PDPL subject request approaching 30-day SLA',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.PdplRequest) return [];
    const now = ctx.now || new Date();
    const warnAfter = new Date(now.getTime() - WARN_DAYS * 24 * 60 * 60 * 1000);
    const breachAfter = new Date(now.getTime() - SLA_DAYS * 24 * 60 * 60 * 1000);
    // We want requests aged between 25 and 30 days; older ones are
    // already handled by `pdpl-dsar-sla-breach` so the two rules
    // never fire on the same record at the same time.
    const rows = await ctx.models.PdplRequest.find({
      status: { $in: OPEN_STATUSES },
      requestedAt: { $lte: warnAfter, $gt: breachAfter },
    });
    return rows.map(r => ({
      key: `pdpl-dsar-warn:${r._id}`,
      subject: { type: 'PdplRequest', id: r._id, beneficiaryId: r.beneficiaryId },
      message: `PDPL ${r.requestType} request approaching 30-day SLA (5 days remaining)`,
      metadata: { requestType: r.requestType, status: r.status },
    }));
  },
};
