/**
 * Rule: care plan flagged `requiresSignature` but not yet signed
 * 14 days after creation.
 *
 * The `requiresSignature` flag is opt-in (see CarePlan.js comments)
 * so legacy plans don't retroactively flood alerts. Only new plans
 * that explicitly require parent/guardian signature count here.
 */

'use strict';

const SLA_DAYS = 14;

module.exports = {
  id: 'care-plan-unsigned-14d',
  severity: 'high',
  category: 'clinical',
  description: 'Care plan awaiting signature for more than 14 days',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.CarePlan) return [];
    const now = ctx.now || new Date();
    const cutoff = new Date(now.getTime() - SLA_DAYS * 24 * 60 * 60 * 1000);
    const rows = await ctx.models.CarePlan.find({
      status: { $in: ['DRAFT', 'ACTIVE'] },
      requiresSignature: true,
      signedAt: null,
      createdAt: { $lte: cutoff },
    });
    return rows.map(p => ({
      key: `care-plan-unsigned:${p._id}`,
      subject: { type: 'CarePlan', id: p._id, beneficiaryId: p.beneficiary },
      branchId: p.branchId,
      message: `Care plan ${p.planNumber || p._id} unsigned for > 14 days`,
    }));
  },
};
