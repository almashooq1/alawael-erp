/**
 * Rule: employee professional credential expiring within 30 days.
 *
 * 30-day heads-up companion to `credential-expired`. Uniform medium
 * severity (a renewal nudge, not yet a breach). Self-loading on the
 * real `EmployeeCredential` model — see credential-expired.js for the
 * loader-drift rationale; tests MUST inject the model.
 */

'use strict';

function resolveModel(ctx) {
  const injected = ctx.models && (ctx.models.EmployeeCredential || ctx.models.Credential);
  if (injected) return injected;
  try {
    return require('../../models/EmployeeCredential');
  } catch (_) {
    return null;
  }
}

module.exports = {
  id: 'credential-expiry-30d',
  severity: 'warning',
  category: 'hr',
  description: 'Employee professional credential expires within 30 days',

  async evaluate(ctx) {
    const Cred = resolveModel(ctx);
    if (!Cred || typeof Cred.find !== 'function') return [];
    const now = ctx.now || new Date();
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const rows = await Cred.find({
      expiresAt: { $gte: now, $lte: horizon },
      // not already expired / suspended / mid-renewal
      status: { $nin: ['suspended', 'expired', 'pending-renewal'] },
    });
    return rows
      .filter(c => c.expiresAt)
      .map(c => ({
        key: `credential:${c._id}`,
        subject: { type: 'EmployeeCredential', id: c._id, employeeId: c.employeeId, kind: c.kind },
        branchId: c.branchId,
        message: `${c.labelAr || c.kind} (${c.issueNumber || c._id}) expires on ${new Date(c.expiresAt).toISOString().slice(0, 10)}`,
      }));
  },
};
