/**
 * Rule: credential expiring within 30 days.
 */

'use strict';

module.exports = {
  id: 'credential-expiry-30d',
  severity: 'warning',
  category: 'hr',
  description: 'Employee credential expires within 30 days',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.Credential) return [];
    const now = ctx.now || new Date();
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const rows = await ctx.models.Credential.find({
      verificationStatus: 'verified',
      expiryDate: { $gte: now, $lte: horizon },
    });
    return rows.map(c => ({
      key: `credential:${c._id}`,
      subject: { type: 'Credential', id: c._id, employeeId: c.employeeId },
      branchId: c.branchId,
      message: `License ${c.licenseNumber || c._id} expires on ${new Date(c.expiryDate).toISOString().slice(0, 10)}`,
    }));
  },
};
