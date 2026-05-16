/**
 * Rule: scheduled vaccination past its due date.
 *
 * Pediatric rehabilitation centers carry MOH reporting obligations
 * for missed vaccinations of beneficiaries under their care. The
 * clinical supervisor needs an actionable alert per overdue dose,
 * not just the aggregate KPI.
 */

'use strict';

module.exports = {
  id: 'vaccination-overdue',
  severity: 'warning',
  category: 'clinical',
  description: 'Beneficiary vaccination past its due date',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.Vaccination) return [];
    const now = ctx.now || new Date();
    const rows = await ctx.models.Vaccination.find({
      status: { $in: ['scheduled', 'pending'] },
      dueDate: { $lt: now },
    });
    return rows.map(v => ({
      key: `vaccination-overdue:${v._id}`,
      subject: { type: 'Vaccination', id: v._id, beneficiaryId: v.beneficiaryId },
      branchId: v.branchId,
      message: `Vaccination ${v.vaccineName || v.code || v._id} overdue since ${new Date(v.dueDate).toISOString().slice(0, 10)}`,
    }));
  },
};
