/**
 * Rule: an active fleet vehicle has an expired/expiring statutory document —
 * registration, insurance, or periodic inspection.
 *
 * Third `category: 'operational'` smart-alert rule (W1008), after W1006
 * (facility PPM) + W1007 (work-order overdue). Driving a beneficiary-transport
 * vehicle with expired registration or insurance is a legal/safety exposure, so
 * this surfaces it to the ops/fleet team via the org-scoped `Alert` sink +
 * `/api/v1/dashboards/alerts`.
 *
 * `Vehicle` has no branch field, so these are platform-scoped alerts (branchId
 * undefined — the Alert model supports a `platform` scope). The statutory dates
 * are nested (`registration.expiryDate`, `insurance.policyExpiryDate`,
 * `inspection.nextInspectionDate`), so the predicate runs in JS after a cheap
 * active-status query. Expired registration OR insurance escalates the default
 * `high` to `critical` (illegal to operate); an overdue inspection alone stays
 * `high`.
 */

'use strict';

const ACTIVE = 'نشطة'; // Vehicle.status enum: active

module.exports = {
  id: 'vehicle-document-expiry',
  severity: 'high',
  category: 'operational',
  description: 'Active vehicle has expired registration / insurance / inspection',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.Vehicle) return [];
    const now = ctx.now || new Date();
    const rows = await ctx.models.Vehicle.find({ status: ACTIVE });
    const findings = [];
    for (const v of rows) {
      const regExp =
        v.registration && v.registration.expiryDate && new Date(v.registration.expiryDate) < now;
      const insExp =
        v.insurance && v.insurance.policyExpiryDate && new Date(v.insurance.policyExpiryDate) < now;
      const inspDue =
        v.inspection &&
        v.inspection.nextInspectionDate &&
        new Date(v.inspection.nextInspectionDate) < now;
      if (!regExp && !insExp && !inspDue) continue;
      const which = [
        regExp ? 'registration' : null,
        insExp ? 'insurance' : null,
        inspDue ? 'inspection' : null,
      ]
        .filter(Boolean)
        .join(' + ');
      const label = v.plateNumber || v.registrationNumber || v._id;
      const finding = {
        key: `vehicle-doc-expiry:${v._id}`,
        subject: { type: 'Vehicle', id: v._id },
        branchId: v.branchId, // undefined → platform-scoped alert
        message: `Vehicle ${label} ${which} expired/overdue`,
      };
      // Expired registration or insurance = illegal to operate → critical.
      if (regExp || insExp) finding.severity = 'critical';
      findings.push(finding);
    }
    return findings;
  },
};
