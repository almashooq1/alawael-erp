/**
 * Rule: staff professional certification past its expiry date.
 *
 * Companion to `staff-certification-expiry-30d`. Fires the moment a staff
 * certification lapses. This targets `StaffCertification` — the model the
 * web-admin `staff-certifications` UI actually writes to (via
 * `POST /api/v1/rehabilitation-advanced/staff-certifications`). It is DISTINCT
 * from `EmployeeCredential` (the `credential-expired` rule): that model is
 * purpose-built but has no data-entry UI, so on a live deployment credential
 * data lands in StaffCertification. W1151 covers BOTH so expiry alerting fires
 * regardless of which credential model the org populates.
 *
 * Self-loading: the smart-alerts loader does not inject this model. Tests MUST
 * inject it (a bare require() with no DB connection would buffer find() forever).
 * Expiry is NESTED at `certification_info.expiry_date`; `is_lifetime` certs have
 * no expiry and are skipped.
 */

'use strict';

// Allowed severities are info|warning|high|critical (no 'medium').
const SEVERITY_BY_TYPE = Object.freeze({
  license: 'critical', // can't practice without a valid license
  professional: 'high',
  specialty: 'high',
  accreditation: 'high',
  continuing_education: 'warning',
});

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
  id: 'staff-certification-expired',
  severity: 'high',
  category: 'hr',
  description: 'Staff professional certification has expired',

  async evaluate(ctx) {
    const Cert = resolveModel(ctx);
    if (!Cert || typeof Cert.find !== 'function') return [];
    const now = ctx.now || new Date();
    const rows = await Cert.find({
      'certification_info.expiry_date': { $lt: now },
      // exclude already-handled states (revoked/inactive) + in-flight renewal
      status: { $nin: ['revoked', 'inactive', 'pending_renewal'] },
    });
    return rows
      .filter(c => !c.is_lifetime && c.certification_info && c.certification_info.expiry_date)
      .map(c => {
        const info = c.certification_info || {};
        return {
          key: `staff-cert-expired:${c._id}`,
          subject: {
            type: 'StaffCertification',
            id: c._id,
            staffId: c.staff_id,
            certType: info.certification_type,
          },
          severity: SEVERITY_BY_TYPE[info.certification_type] || 'high',
          message: `${info.certification_name || c.certification_id || c._id} EXPIRED on ${new Date(info.expiry_date).toISOString().slice(0, 10)}`,
        };
      });
  },
};
