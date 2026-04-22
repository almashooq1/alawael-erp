/**
 * rehabSeedPlanner.js — materialization planner for the rehab
 * disciplines registry.
 *
 * Phase 9 Commit 6. Converts the pure-data registry entries into
 * seed-ready document plans for the existing Program + OutcomeMeasure
 * + Intervention + GoalTemplate collections. Pure function — no I/O,
 * no DB. The CLI wrapper (scripts/rehab-seed-planner.js) renders the
 * plan as table / JSON / markdown and can optionally apply the
 * measure upserts when given a Mongo connection.
 *
 * Why a planner instead of direct upserts here: downstream sites
 * may want to (a) inspect what will change before running, (b) emit
 * the plan as documentation, (c) ship seed JSON to a CD pipeline
 * without coupling to mongoose. Decoupling "what to write" from
 * "how to write" keeps both trivially testable.
 */

'use strict';

const disciplineRegistry = require('../config/rehab-disciplines.registry');

// ─── Dedup ─────────────────────────────────────────────────────────

/**
 * Many disciplines recommend the same outcome measure (Vineland-3
 * shows up under LS, IL, ABA; GMFCS under PT). Dedupe by `code` and
 * collect the disciplines that reference each one.
 */
function buildMeasurePlan() {
  const byCode = new Map();
  for (const d of disciplineRegistry.DISCIPLINES) {
    for (const m of d.recommendedMeasures) {
      const existing = byCode.get(m.code);
      if (existing) {
        existing.disciplines.push(d.id);
        existing.disciplineCodes.push(d.code);
      } else {
        byCode.set(m.code, {
          code: m.code,
          nameEn: m.nameEn,
          standardBody: m.standardBody,
          instrumentType: m.instrumentType,
          domainTag: m.domainTag,
          disciplines: [d.id],
          disciplineCodes: [d.code],
        });
      }
    }
  }
  const unique = Array.from(byCode.values());
  return {
    uniqueMeasures: unique,
    total: unique.length,
    totalReferences: disciplineRegistry.DISCIPLINES.reduce(
      (sum, d) => sum + d.recommendedMeasures.length,
      0
    ),
  };
}

/**
 * Build the seed plan for Program documents. Requires a branchId
 * because the existing Program model scopes every record to a branch.
 * Each programTemplate expands to one document per branch.
 */
function buildProgramPlan({ branchId } = {}) {
  if (!branchId || typeof branchId !== 'string') {
    return { error: 'branchId is required', programs: [], total: 0 };
  }
  const programs = [];
  for (const d of disciplineRegistry.DISCIPLINES) {
    for (const p of d.programTemplates) {
      programs.push({
        code: p.code,
        branchId,
        disciplineId: d.id,
        disciplineCode: d.code,
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        deliveryMode: p.deliveryMode,
        frequencyPerWeek: p.frequencyPerWeek,
        durationMinutes: p.durationMinutes,
        cycleWeeks: p.cycleWeeks,
        evidenceLevel: p.evidenceLevel,
        // Mapping to existing Program.category enum (best-effort;
        // UI can surface a prompt for the rare cases that don't fit).
        legacyCategory: disciplineToLegacyCategory(d),
      });
    }
  }
  return { programs, total: programs.length, branchId };
}

function disciplineToLegacyCategory(d) {
  // The existing Program.category enum is:
  //   physical | cognitive | occupational | speech | behavioral |
  //   educational | vocational
  // Our 11 disciplines don't map 1:1; favour the closest match.
  switch (d.code) {
    case 'PT':
      return 'physical';
    case 'OT':
      return 'occupational';
    case 'SLP':
      return 'speech';
    case 'ABA':
      return 'behavioral';
    case 'EI':
      return 'cognitive';
    case 'ACAD':
      return 'educational';
    case 'LS':
      return 'educational';
    case 'IL':
      return 'vocational';
    case 'PSY':
      return 'behavioral';
    case 'FAM':
      return 'educational';
    case 'SOC':
      return 'educational';
    default:
      return 'educational';
  }
}

/**
 * Intervention plan — same dedup + collect logic as measures. Though
 * interventions are usually discipline-specific, codes occasionally
 * overlap (e.g., Vineland-3 as a measure vs Vineland-based intervention).
 */
function buildInterventionPlan() {
  const byCode = new Map();
  for (const d of disciplineRegistry.DISCIPLINES) {
    for (const iv of d.recommendedInterventions) {
      const existing = byCode.get(iv.code);
      if (existing) {
        existing.disciplines.push(d.id);
      } else {
        byCode.set(iv.code, {
          code: iv.code,
          nameEn: iv.nameEn,
          nameAr: iv.nameAr,
          technique: iv.technique,
          evidenceLevel: iv.evidenceLevel,
          disciplines: [d.id],
        });
      }
    }
  }
  const unique = Array.from(byCode.values());
  return {
    uniqueInterventions: unique,
    total: unique.length,
    totalReferences: disciplineRegistry.DISCIPLINES.reduce(
      (sum, d) => sum + d.recommendedInterventions.length,
      0
    ),
  };
}

/**
 * Goal-template plan. Unlike measures, templates are intentionally
 * discipline-specific — do not dedupe.
 */
function buildGoalTemplatePlan() {
  const templates = [];
  for (const d of disciplineRegistry.DISCIPLINES) {
    for (const g of d.goalTemplates) {
      templates.push({
        code: g.code,
        disciplineId: d.id,
        disciplineCode: d.code,
        nameAr: g.nameAr,
        nameEn: g.nameEn,
        metric: g.metric,
        unit: g.unit,
        baseline: g.baseline,
        target: g.target,
        masteryCriteria: g.masteryCriteria,
      });
    }
  }
  return {
    templates,
    total: templates.length,
    byDiscipline: disciplineRegistry.DISCIPLINES.map(d => ({
      disciplineId: d.id,
      code: d.code,
      count: d.goalTemplates.length,
    })),
  };
}

/**
 * Full plan aggregate. Useful for documentation + pre-deploy review.
 */
function buildFullPlan({ branchId } = {}) {
  return {
    generatedAt: new Date().toISOString(),
    disciplines: {
      total: disciplineRegistry.DISCIPLINES.length,
      byDomain: disciplineRegistry.DOMAINS.map(dom => ({
        domain: dom,
        count: disciplineRegistry.byDomain(dom).length,
      })),
    },
    measures: buildMeasurePlan(),
    interventions: buildInterventionPlan(),
    goalTemplates: buildGoalTemplatePlan(),
    programs: branchId ? buildProgramPlan({ branchId }) : { note: 'pass branchId to compute' },
  };
}

module.exports = {
  buildMeasurePlan,
  buildProgramPlan,
  buildInterventionPlan,
  buildGoalTemplatePlan,
  buildFullPlan,
  // exposed for tests
  _disciplineToLegacyCategory: disciplineToLegacyCategory,
};
