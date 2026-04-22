/**
 * kpi.aliases.js — catalog-name → canonical kpi.registry id mapping.
 *
 * Phase 10 Commit 10.
 *
 * Why this file exists:
 *   The `config/report.catalog.js` entries reference KPI ids like
 *   `rehab.goal.mastery_rate` that read as "the catalog concept". The
 *   authoritative `config/kpi.registry.js` stores the SAME concept
 *   under a more specific id with units suffix
 *   (`rehab.goals.achievement_rate.pct`). Neither naming is "wrong" —
 *   they optimise for different readers (catalog = domain-first,
 *   registry = metric-first with units). The alias layer lets both
 *   survive without either being forced to change.
 *
 * Five of the sixteen aliases are deliberately `null`: the catalog
 * references a KPI that doesn't yet exist in the registry. Those are
 * real gaps — we leave them listed here so future commits can add the
 * corresponding KPI to kpi.registry and flip the alias value.
 *
 * Drift tests consult `resolveKpiId(alias)`:
 *   - returns the canonical id if the alias maps to a live KPI;
 *   - returns null for the five known gaps;
 *   - returns the input unchanged when the alias is already a valid
 *     registry id (so call sites don't have to pre-check).
 */

'use strict';

const { byId } = require('./kpi.registry');

/**
 * Frozen map from catalog KPI id → canonical kpi.registry id.
 * Null values flag KPIs that aren't yet in the registry.
 */
const KPI_ALIASES = Object.freeze({
  // Exact-concept matches (registry ids differ only in units suffix /
  // namespace).
  'clinical.care_plan.review_adherence': 'rehab.care_plan.review.ontime.pct',
  'crm.complaints.resolution_time': 'crm.complaints.resolution_rate.pct',
  'crm.parent.engagement_score': 'rehab.family.engagement.pct',
  'finance.claims.denial_rate': 'finance.claims.denial_rate.pct',
  'finance.collections.dso_days': 'finance.claims.collection_days.mean',
  'hr.cpe.compliance_rate': 'hr.credentials.compliance.pct',
  'multi-branch.occupancy.rate': 'rehab.program.capacity.utilization.pct',
  'rehab.goal.mastery_rate': 'rehab.goals.achievement_rate.pct',
  'rehab.goal.progress_velocity': 'rehab.goals.velocity.mean_days',
  'scheduling.session.cancellation_rate': 'scheduling.noshow.rate.pct',
  'scheduling.session.punctuality': 'rehab.sessions.adherence.pct',

  // P10-C12 closed these 5 gaps by adding matching KPI entries to
  // kpi.registry.js. Each maps the catalog's short alias to the new
  // canonical registry id (which carries the unit suffix per registry
  // convention). See `config/kpi.registry.js` "Phase 10 C12 additions"
  // block. gap count: 5 → 0.
  'finance.invoices.aging_ratio': 'finance.invoices.aging.concentration.pct',
  'hr.attendance.adherence': 'hr.attendance.adherence.pct',
  'hr.turnover.voluntary_rate': 'hr.turnover.voluntary.pct',
  'multi-branch.fleet.punctuality': 'multi-branch.fleet.completion.pct',
  'quality.cbahi.evidence.completeness': 'quality.cbahi.evidence.completeness.pct',
});

/**
 * Resolve a catalog KPI id to its canonical registry id, returning:
 *   - the canonical id if `aliasOrId` is a known alias with a mapping;
 *   - `aliasOrId` unchanged if it's already a valid registry id;
 *   - null if it's an alias that flags a registry gap;
 *   - null if it's an unknown id.
 */
function resolveKpiId(aliasOrId) {
  if (!aliasOrId || typeof aliasOrId !== 'string') return null;
  if (byId(aliasOrId)) return aliasOrId;
  if (Object.prototype.hasOwnProperty.call(KPI_ALIASES, aliasOrId)) {
    return KPI_ALIASES[aliasOrId] || null;
  }
  return null;
}

/**
 * List of alias ids that map to a null canonical — the current
 * kpi.registry gaps. Exposed so drift tests can lock in the exact
 * budget.
 */
function gapAliases() {
  return Object.entries(KPI_ALIASES)
    .filter(([, v]) => v == null)
    .map(([k]) => k);
}

/**
 * Full list of alias keys (regardless of whether they resolve).
 */
function aliasKeys() {
  return Object.keys(KPI_ALIASES);
}

module.exports = {
  KPI_ALIASES,
  resolveKpiId,
  gapAliases,
  aliasKeys,
};
