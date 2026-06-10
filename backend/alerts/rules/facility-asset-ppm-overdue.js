/**
 * Rule: facility asset preventive-maintenance (PPM) or regulatory inspection
 * overdue.
 *
 * The first OPERATIONAL-category smart-alert rule (W1006) — it extends the
 * alerts engine beyond clinical/compliance/finance into facilities/ops, feeding
 * the same org-scoped `Alert` sink + `/api/v1/dashboards/alerts` dashboard the
 * other 19 rules use. An asset whose `nextMaintenanceDue` or `nextInspectionDue`
 * is in the past (and that is still in service) is surfaced to the ops team.
 *
 * Life-safety assets (fire suppression, medical gas, lifts, …) escalate the
 * finding to `critical` — the engine spreads the per-finding fields over the
 * rule defaults, so a `severity` on the finding overrides the rule's `high`.
 *
 * The DB query filters to active assets (cheap; status is indexed); the date
 * comparison is done in JS so the predicate stays simple and the rule can flag
 * maintenance + inspection in one pass.
 */

'use strict';

const INACTIVE = ['retired', 'out_of_service'];

module.exports = {
  id: 'facility-asset-ppm-overdue',
  severity: 'high',
  category: 'operational',
  description: 'Facility asset preventive maintenance or inspection overdue',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.FacilityAsset) return [];
    const now = ctx.now || new Date();
    const rows = await ctx.models.FacilityAsset.find({
      status: { $nin: INACTIVE },
    });
    const findings = [];
    for (const a of rows) {
      const maintOverdue = a.nextMaintenanceDue && new Date(a.nextMaintenanceDue) < now;
      const inspOverdue = a.nextInspectionDue && new Date(a.nextInspectionDue) < now;
      if (!maintOverdue && !inspOverdue) continue;
      const which = [maintOverdue ? 'maintenance' : null, inspOverdue ? 'inspection' : null]
        .filter(Boolean)
        .join(' + ');
      const finding = {
        key: `facility-asset-ppm-overdue:${a._id}`,
        subject: { type: 'FacilityAsset', id: a._id },
        branchId: a.branchId,
        message: `Facility asset ${a.name || a.assetTag || a._id} ${which} overdue`,
      };
      // Life-safety assets escalate the default `high` to `critical`.
      if (a.criticality === 'life_safety') finding.severity = 'critical';
      findings.push(finding);
    }
    return findings;
  },
};
