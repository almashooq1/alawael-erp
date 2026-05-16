/**
 * Rule: PDPL data-subject request has breached its 30-day response SLA.
 *
 * PDPL Art.27 mandates a response within 30 days of receipt. Any
 * request still in `received` / `under_review` past that window is
 * a regulatory exposure that must reach the DPO immediately.
 */

'use strict';

const SLA_DAYS = 30;
const OPEN_STATUSES = ['received', 'under_review', 'in_progress'];

module.exports = {
  id: 'pdpl-dsar-sla-breach',
  severity: 'critical',
  category: 'compliance',
  description: 'PDPL subject request exceeded 30-day response SLA',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.PdplRequest) return [];
    const now = ctx.now || new Date();
    const cutoff = new Date(now.getTime() - SLA_DAYS * 24 * 60 * 60 * 1000);
    const rows = await ctx.models.PdplRequest.find({
      status: { $in: OPEN_STATUSES },
      requestedAt: { $lte: cutoff },
    });
    return rows.map(r => ({
      key: `pdpl-dsar-sla:${r._id}`,
      subject: { type: 'PdplRequest', id: r._id, beneficiaryId: r.beneficiaryId },
      message: `PDPL ${r.requestType} request from ${r.requestedAt.toISOString().slice(0, 10)} past 30-day SLA`,
      metadata: { requestType: r.requestType, status: r.status },
    }));
  },
};
