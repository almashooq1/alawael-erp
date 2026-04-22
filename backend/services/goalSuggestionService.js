/**
 * goalSuggestionService.js — SMART-goal + intervention suggestion
 * engine over the rehab-disciplines registry.
 *
 * Phase 9 Commit 8. Answers the original design requirement:
 * "Auto-suggest next goals and interventions." Pure-function — no
 * I/O, no DB. Given a beneficiary's active disciplines, age, and
 * which templates they already have drafted, returns ranked goal
 * candidates + matching first-line interventions.
 *
 * Scoring (higher is better):
 *   +10  discipline is in the requested set
 *   +5   template's discipline supports the given age band
 *   +3   measurableMetric is one of PERCENTAGE/FREQUENCY/RATE
 *        (easier to observe + chart in sessions)
 *   +2   discipline owner is clinical_director (highest priority tier)
 *   -∞   template code already used (excluded outright)
 *
 * Rankings are stable + deterministic — tests can assert exact order
 * without fixture tolerance.
 */

'use strict';

const disciplineRegistry = require('../config/rehab-disciplines.registry');
const rehabService = require('./rehabDisciplineService');
const { ROLES } = require('../config/rbac.config');

// ─── Core: single goal suggestion ─────────────────────────────────

function scoreTemplate(template, ctx) {
  let score = 0;
  const reasons = [];

  if (ctx.disciplineIds && ctx.disciplineIds.includes(template._disciplineId)) {
    score += 10;
    reasons.push('active_discipline_match');
  }

  if (ctx.ageBand && template._supportedAgeBands.includes(ctx.ageBand)) {
    score += 5;
    reasons.push('age_band_match');
  }

  if (['PERCENTAGE', 'FREQUENCY', 'RATE'].includes(template.metric)) {
    score += 3;
    reasons.push('easy_to_measure');
  }

  if (template._ownerRole === ROLES.CLINICAL_DIRECTOR) {
    score += 2;
    reasons.push('clinical_priority');
  }

  return { score, reasons };
}

/**
 * Flatten every goal template across the catalogue and decorate it
 * with the parent discipline's metadata so scoring can happen on a
 * uniform shape.
 */
function _allTemplates() {
  const out = [];
  for (const d of disciplineRegistry.DISCIPLINES) {
    for (const g of d.goalTemplates) {
      out.push({
        code: g.code,
        nameAr: g.nameAr,
        nameEn: g.nameEn,
        metric: g.metric,
        unit: g.unit,
        baseline: g.baseline,
        target: g.target,
        masteryCriteria: g.masteryCriteria,
        _disciplineId: d.id,
        _disciplineCode: d.code,
        _disciplineNameAr: d.nameAr,
        _ownerRole: d.ownerRole,
        _supportedAgeBands: d.supportedAgeBands,
      });
    }
  }
  return out;
}

/**
 * Suggest goal templates for a given context.
 *
 * @param {object} ctx
 * @param {string[]} [ctx.disciplineIds] — currently-enrolled disciplines
 * @param {number}   [ctx.ageMonths]     — beneficiary age; derives ageBand
 * @param {string[]} [ctx.existingGoalCodes] — templateCodes already in use
 * @param {number}   [ctx.limit]         — max results (default 10)
 * @returns {{ suggestions: Array, evaluated: number }}
 */
function suggestGoalsForContext(ctx = {}) {
  const { disciplineIds = [], ageMonths = null, existingGoalCodes = [], limit = 10 } = ctx;

  const ageBand = typeof ageMonths === 'number' ? rehabService.ageMonthsToBand(ageMonths) : null;

  const excluded = new Set(existingGoalCodes);
  const candidates = _allTemplates().filter(t => !excluded.has(t.code));

  const scored = candidates.map(t => {
    const { score, reasons } = scoreTemplate(t, { disciplineIds, ageBand });
    return {
      code: t.code,
      nameAr: t.nameAr,
      nameEn: t.nameEn,
      metric: t.metric,
      unit: t.unit,
      baseline: t.baseline,
      target: t.target,
      masteryCriteria: t.masteryCriteria,
      discipline: {
        id: t._disciplineId,
        code: t._disciplineCode,
        nameAr: t._disciplineNameAr,
      },
      score,
      reasons,
    };
  });

  // Stable sort: score desc, then templateCode asc for deterministic ties.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.code.localeCompare(b.code);
  });

  return {
    suggestions: scored.slice(0, Math.max(0, Math.floor(limit))),
    evaluated: candidates.length,
    ageBand,
  };
}

// ─── Intervention suggestions per goal-template / discipline ──────

/**
 * Suggest first-line interventions for a given discipline + goal
 * metric. Evidence-level A beats B beats C beats expert-opinion.
 */
function suggestInterventionsForGoal({ disciplineId, metric } = {}) {
  const d = disciplineRegistry.byId(disciplineId);
  if (!d) return { interventions: [], reason: 'unknown_discipline' };

  const ranked = d.recommendedInterventions
    .map(iv => ({
      code: iv.code,
      nameAr: iv.nameAr,
      nameEn: iv.nameEn,
      technique: iv.technique,
      evidenceLevel: iv.evidenceLevel,
      score:
        iv.evidenceLevel === 'A'
          ? 3
          : iv.evidenceLevel === 'B'
            ? 2
            : iv.evidenceLevel === 'C'
              ? 1
              : 0,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.code.localeCompare(b.code);
    });

  // metric is reserved for future technique-affinity filtering
  // (e.g., DURATION goals prefer shaping interventions). For now it
  // just rides in the response for traceability.
  return { interventions: ranked, forMetric: metric || null };
}

/**
 * Bundle: given a picked goal template, return the template + the
 * top-3 interventions in one call. Saves the UI from making two
 * round trips during the "draft goal" flow.
 */
function draftGoalBundle({ templateCode, ageMonths, existingGoalCodes } = {}) {
  const all = _allTemplates();
  const template = all.find(t => t.code === templateCode);
  if (!template) return null;

  const ageBand = typeof ageMonths === 'number' ? rehabService.ageMonthsToBand(ageMonths) : null;

  const { interventions } = suggestInterventionsForGoal({
    disciplineId: template._disciplineId,
    metric: template.metric,
  });

  // Alternative templates in the same discipline (next-best picks)
  const alternatives = suggestGoalsForContext({
    disciplineIds: [template._disciplineId],
    ageMonths,
    existingGoalCodes: [...(existingGoalCodes || []), templateCode],
    limit: 3,
  }).suggestions;

  return {
    template: {
      code: template.code,
      nameAr: template.nameAr,
      nameEn: template.nameEn,
      metric: template.metric,
      unit: template.unit,
      baseline: template.baseline,
      target: template.target,
      masteryCriteria: template.masteryCriteria,
    },
    discipline: {
      id: template._disciplineId,
      code: template._disciplineCode,
      nameAr: template._disciplineNameAr,
    },
    ageBand,
    topInterventions: interventions.slice(0, 3),
    alternatives,
  };
}

module.exports = {
  suggestGoalsForContext,
  suggestInterventionsForGoal,
  draftGoalBundle,
  // test-only
  _allTemplates,
  _scoreTemplate: scoreTemplate,
};
