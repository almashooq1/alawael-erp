/**
 * Rule: employee credential past expiry.
 *
 * Companion to `credential-expiry-30d`: that one warns 30 days
 * ahead, this one fires the moment a credential lapses. Raises
 * severity so the dispatcher routes it to HR_MANAGER and the
 * branch admin rather than the holding employee alone.
 */

'use strict';

module.exports = {
  id: 'credential-expired',
  severity: 'critical',
  category: 'hr',
  description: 'Employee credential has expired',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.Credential) return [];
    const now = ctx.now || new Date();
    const rows = await ctx.models.Credential.find({
      verificationStatus: 'verified',
      expiryDate: { $lt: now },
    });
    return rows.map(c => ({
      key: `credential-expired:${c._id}`,
      subject: { type: 'Credential', id: c._id, employeeId: c.employeeId },
      branchId: c.branchId,
      message: `License ${c.licenseNumber || c._id} EXPIRED on ${new Date(c.expiryDate).toISOString().slice(0, 10)}`,
    }));
  },
};
