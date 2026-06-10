/**
 * Rule: a contract still marked ACTIVE whose end date has passed.
 *
 * Fourth `category: 'operational'` smart-alert rule (W1009), after facilities
 * (W1006), maintenance (W1007) and fleet (W1008). A service/vendor/general
 * contract that is still `ACTIVE` but past its `endDate` has lapsed without being
 * renewed or closed — a governance gap (e.g. a `SERVICE_AGREEMENT` for cleaning /
 * catering / maintenance silently expiring → service-continuity risk). Surfaced
 * to the ops/admin team via the org-scoped `Alert` sink + /api/v1/dashboards/alerts.
 *
 * Distinct from the existing `employment-contract-*` rules (those cover HR/staff
 * contracts on a separate model). `Contract` is loaded under the key
 * `Contract.model` (its file is `models/Contract.model.js`), so the rule checks
 * both keys defensively.
 */

'use strict';

module.exports = {
  id: 'contract-expired',
  severity: 'high',
  category: 'operational',
  description: 'Contract still marked ACTIVE but past its end date',

  async evaluate(ctx) {
    const Contract = ctx.models && (ctx.models.Contract || ctx.models['Contract.model']);
    if (!Contract) return [];
    const now = ctx.now || new Date();
    const rows = await Contract.find({ status: 'ACTIVE' });
    const findings = [];
    for (const c of rows) {
      if (!c.endDate || new Date(c.endDate) >= now) continue;
      const due = new Date(c.endDate).toISOString().slice(0, 10);
      const label = c.title || c.contractNumber || c.name || c._id;
      findings.push({
        key: `contract-expired:${c._id}`,
        subject: { type: 'Contract', id: c._id },
        branchId: c.branchId,
        message: `Contract ${label} marked ACTIVE but expired on ${due}`,
      });
    }
    return findings;
  },
};
