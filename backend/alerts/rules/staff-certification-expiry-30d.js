/**
 * Rule: staff professional certification expiring within 30 days.
 *
 * 30-day heads-up companion to `staff-certification-expired`. Targets the
 * UI-backed `StaffCertification` model (see that file for the EmployeeCredential
 * rationale). Uniform `warning` severity (a renewal nudge, not yet a breach).
 * Self-loading; tests MUST inject the model. Expiry is nested at
 * `certification_info.expiry_date`; `is_lifetime` certs are skipped.
 */

'use strict';

function resolveModel(ctx) {
  const injected = ctx.models && ctx.models.StaffCertification;
  if (injected) return injected;
  try {
    return require('../../models/rehab-advanced/StaffCertification.model');
  } catch (_) {
    return null;
  }
}

module.exports = {
  id: 'staff-certification-expiry-30d',
  severity: 'warning',
  category: 'hr',
  description: 'Staff professional certification expires within 30 days',

  async evaluate(ctx) {
    const Cert = resolveModel(ctx);
    if (!Cert || typeof Cert.find !== 'function') return [];
    const now = ctx.now || new Date();
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const rows = await Cert.find({
      'certification_info.expiry_date': { $gte: now, $lte: horizon },
      // not already expired / revoked / inactive / mid-renewal
      status: { $nin: ['revoked', 'inactive', 'expired', 'pending_renewal'] },
    });
    return rows
      .filter(c => !c.is_lifetime && c.certification_info && c.certification_info.expiry_date)
      .map(c => {
        const info = c.certification_info || {};
        return {
          key: `staff-cert:${c._id}`,
          subject: {
            type: 'StaffCertification',
            id: c._id,
            staffId: c.staff_id,
            certType: info.certification_type,
          },
          message: `${info.certification_name || c.certification_id || c._id} expires on ${new Date(info.expiry_date).toISOString().slice(0, 10)}`,
        };
      });
  },
};
