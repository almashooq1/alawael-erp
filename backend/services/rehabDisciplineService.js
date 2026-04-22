/**
 * rehabDisciplineService.js — read-only service layer over the
 * rehabilitation-disciplines registry.
 *
 * Phase 9 Commit 5. Wraps config/rehab-disciplines.registry.js with
 * shape-stable summary projections, age-months → age-band conversion,
 * and a `bundle()` composer that resolves kpiLinks/redFlagLinks into
 * full records from the sister registries. The router in
 * routes/rehab-disciplines.routes.js consumes this service; no other
 * layer should bypass it for registry reads.
 *
 * Pure synchronous, no I/O. The registry it wraps is frozen data, so
 * every call is memo-friendly and thread-safe.
 */

'use strict';

const disciplineRegistry = require('../config/rehab-disciplines.registry');
const kpiRegistry = require('../config/kpi.registry');
const redFlagRegistry = require('../config/red-flags.registry');

// ─── Age-band mapping ──────────────────────────────────────────────

/**
 * Map an age in months to the nearest supported age band. Boundaries:
 *   0-36  → early_0_3
 *   37-72 → early_3_6
 *   73-144 → child_6_12
 *   145-216 → adolescent_12_18
 *   217+ → adult_18_plus
 *
 * Returns null for invalid input (negative, NaN, non-number) so
 * callers can short-circuit without defensive typeof checks at every
 * site.
 */
function ageMonthsToBand(months) {
  if (typeof months !== 'number' || !Number.isFinite(months) || months < 0) return null;
  if (months <= 36) return 'early_0_3';
  if (months <= 72) return 'early_3_6';
  if (months <= 144) return 'child_6_12';
  if (months <= 216) return 'adolescent_12_18';
  return 'adult_18_plus';
}

// ─── Shape helpers ─────────────────────────────────────────────────

function toSummary(d) {
  return {
    id: d.id,
    code: d.code,
    nameEn: d.nameEn,
    nameAr: d.nameAr,
    domain: d.domain,
    ownerRole: d.ownerRole,
    leadSpecialistRole: d.leadSpecialistRole,
    defaultReviewCycleDays: d.defaultReviewCycleDays,
    assessmentCadenceDays: d.assessmentCadenceDays,
    supportedAgeBands: [...d.supportedAgeBands],
    deliveryModes: [...d.deliveryModes],
    programCount: d.programTemplates.length,
    interventionCount: d.recommendedInterventions.length,
    measureCount: d.recommendedMeasures.length,
    goalTemplateCount: d.goalTemplates.length,
    compliance: [...d.compliance],
  };
}

// ─── Core queries ──────────────────────────────────────────────────

function list({ domain, ageBand, deliveryMode } = {}) {
  let out = disciplineRegistry.DISCIPLINES;
  if (domain) out = out.filter(d => d.domain === domain);
  if (ageBand) out = out.filter(d => d.supportedAgeBands.includes(ageBand));
  if (deliveryMode) out = out.filter(d => d.deliveryModes.includes(deliveryMode));
  return out.map(toSummary);
}

function get(id) {
  return disciplineRegistry.byId(id);
}

/**
 * Compose a full UI-ready bundle for a single discipline. Resolves
 * kpiLinks + redFlagLinks into lightweight records so the client
 * doesn't need to hit the other registries separately.
 */
function bundle(id) {
  const d = disciplineRegistry.byId(id);
  if (!d) return null;

  const kpis = d.kpiLinks
    .map(kid => {
      const k = kpiRegistry.byId(kid);
      if (!k) return null;
      return {
        id: k.id,
        nameEn: k.nameEn,
        nameAr: k.nameAr,
        unit: k.unit,
        direction: k.direction,
        target: k.target,
        warningThreshold: k.warningThreshold,
        criticalThreshold: k.criticalThreshold,
        frequency: k.frequency,
        compliance: [...k.compliance],
      };
    })
    .filter(Boolean);

  const flags = d.redFlagLinks
    .map(fid => {
      const f = redFlagRegistry.byId(fid);
      if (!f) return null;
      return {
        id: f.id,
        nameEn: f.nameEn,
        nameAr: f.nameAr,
        domain: f.domain,
        severity: f.severity,
        category: f.category,
        slaHours: f.slaHours,
        owner: f.owner,
        compliance: [...f.compliance],
      };
    })
    .filter(Boolean);

  return {
    discipline: toSummary(d),
    kpis,
    flags,
    programTemplates: d.programTemplates.map(p => ({ ...p })),
    interventions: d.recommendedInterventions.map(i => ({ ...i })),
    measures: d.recommendedMeasures.map(m => ({ ...m })),
    goalTemplates: d.goalTemplates.map(g => ({ ...g })),
    icfDomains: [...d.icfDomains],
    assistantRoles: [...d.assistantRoles],
  };
}

function suggestForAge(ageMonths) {
  const band = ageMonthsToBand(ageMonths);
  if (!band) return [];
  return disciplineRegistry.forAgeBand(band).map(toSummary);
}

function planReviewCycleForDisciplines(ids) {
  return disciplineRegistry.recommendedReviewCycleDays(ids);
}

// ─── Health / drift ────────────────────────────────────────────────

/**
 * Runtime orphan check — walks every discipline's cross-refs and
 * counts links that no longer resolve. In a healthy deployment this
 * returns zero orphans; the Jest drift tests prevent any committed
 * registry from shipping with orphans, but this endpoint is useful
 * for post-deploy smoke tests + support dashboards.
 */
function healthCheck() {
  const all = disciplineRegistry.DISCIPLINES;
  let kpiOrphans = 0;
  let flagOrphans = 0;
  const orphanDetails = [];

  for (const d of all) {
    for (const kid of d.kpiLinks) {
      if (!kpiRegistry.byId(kid)) {
        kpiOrphans++;
        orphanDetails.push({ discipline: d.id, kind: 'kpi', ref: kid });
      }
    }
    for (const fid of d.redFlagLinks) {
      if (!redFlagRegistry.byId(fid)) {
        flagOrphans++;
        orphanDetails.push({ discipline: d.id, kind: 'flag', ref: fid });
      }
    }
  }

  return {
    totalDisciplines: all.length,
    byDomain: disciplineRegistry.DOMAINS.map(dom => ({
      domain: dom,
      count: disciplineRegistry.byDomain(dom).length,
    })),
    kpiOrphans,
    flagOrphans,
    healthy: kpiOrphans === 0 && flagOrphans === 0,
    orphanDetails,
  };
}

module.exports = {
  ageMonthsToBand,
  list,
  get,
  bundle,
  suggestForAge,
  planReviewCycleForDisciplines,
  healthCheck,
  // Taxonomy passthroughs for route-layer /taxonomy endpoint
  DOMAINS: disciplineRegistry.DOMAINS,
  DELIVERY_MODES: disciplineRegistry.DELIVERY_MODES,
  AGE_BANDS: disciplineRegistry.AGE_BANDS,
  // Internal helper used by tests
  _toSummary: toSummary,
};
