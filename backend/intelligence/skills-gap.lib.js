/**
 * skills-gap.lib.js — pure competency gap-analysis logic (W1201).
 *
 * A gap is `max(0, requiredLevel - currentLevel)` for a competency the employee's
 * role requires (levels 1-5). The lib rolls gaps up per employee (readiness %,
 * critical-gap count) and per org (which competencies have the biggest aggregate
 * gap → training priorities). All pure (no DB, no Date).
 *
 * Inputs are plain rows:
 *   requirements: [{ competencyKey, competencyNameAr, requiredLevel, criticality }]
 *   current:      Map/obj competencyKey → currentLevel (1-5; missing = level 0)
 */

'use strict';

const MAX_LEVEL = 5;
const CRITICALITIES = Object.freeze(['core', 'important', 'nice']);
const CRIT_WEIGHT = Object.freeze({ core: 3, important: 2, nice: 1 });

function clampLevel(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  if (v > MAX_LEVEL) return MAX_LEVEL;
  return Math.round(v);
}

/** Per-competency gap for one employee against their role's requirements. */
function employeeGaps(requirements, currentByKey) {
  const cur =
    currentByKey instanceof Map ? currentByKey : new Map(Object.entries(currentByKey || {}));
  const rows = (requirements || []).map(req => {
    const required = clampLevel(req.requiredLevel);
    const current = clampLevel(cur.get(req.competencyKey));
    const gap = Math.max(0, required - current);
    const criticality = CRITICALITIES.includes(req.criticality) ? req.criticality : 'important';
    return {
      competencyKey: req.competencyKey,
      competencyNameAr: req.competencyNameAr || req.competencyKey,
      requiredLevel: required,
      currentLevel: current,
      gap,
      criticality,
      met: gap === 0,
    };
  });
  return {
    competencies: rows,
    requiredCount: rows.length,
    metCount: rows.filter(r => r.met).length,
    gapCount: rows.filter(r => r.gap > 0).length,
    criticalGapCount: rows.filter(r => r.gap > 0 && r.criticality === 'core').length,
    totalGap: rows.reduce((a, r) => a + r.gap, 0),
    // weighted readiness: how much of the (criticality-weighted) requirement is met
    readinessPct: weightedReadiness(rows),
    topGaps: rows
      .filter(r => r.gap > 0)
      .sort((a, b) => gapScore(b) - gapScore(a))
      .slice(0, 5),
  };

  function gapScore(r) {
    return r.gap * (CRIT_WEIGHT[r.criticality] || 1);
  }
  function weightedReadiness(rs) {
    let need = 0;
    let have = 0;
    for (const r of rs) {
      const w = CRIT_WEIGHT[r.criticality] || 1;
      need += r.requiredLevel * w;
      have += Math.min(r.currentLevel, r.requiredLevel) * w;
    }
    return need ? Math.round((have / need) * 1000) / 10 : 100;
  }
}

/**
 * Org rollup: aggregate per-competency gap across many employees' gap rows.
 * `perEmployee` is an array of `employeeGaps(...).competencies` arrays.
 * Returns priorities sorted by total weighted gap (biggest training need first).
 */
function orgGapRollup(perEmployeeCompetencies) {
  const byKey = new Map();
  let assessed = 0;
  for (const comps of perEmployeeCompetencies || []) {
    assessed++;
    for (const c of comps || []) {
      if (!byKey.has(c.competencyKey)) {
        byKey.set(c.competencyKey, {
          competencyKey: c.competencyKey,
          competencyNameAr: c.competencyNameAr,
          criticality: c.criticality,
          affected: 0,
          totalGap: 0,
          totalRequiring: 0,
        });
      }
      const agg = byKey.get(c.competencyKey);
      agg.totalRequiring++;
      if (c.gap > 0) {
        agg.affected++;
        agg.totalGap += c.gap;
      }
    }
  }
  const priorities = [...byKey.values()]
    .map(a => ({
      ...a,
      affectedPct: a.totalRequiring ? Math.round((a.affected / a.totalRequiring) * 1000) / 10 : 0,
      weightedGap: a.totalGap * (CRIT_WEIGHT[a.criticality] || 1),
    }))
    .filter(a => a.affected > 0)
    .sort((a, b) => b.weightedGap - a.weightedGap);
  return { employeesAssessed: assessed, priorities };
}

/** Match a set of gap competency keys to trainings that cover them. */
function matchTrainings(gapKeyToName, trainings) {
  const keys = new Set(Object.keys(gapKeyToName || {}));
  const out = [];
  for (const t of trainings || []) {
    const covered = (t.skillsCovered || []).filter(s => keys.has(s));
    if (covered.length)
      out.push({ trainingId: t._id, title: t.title, covers: covered, coversCount: covered.length });
  }
  return out.sort((a, b) => b.coversCount - a.coversCount);
}

module.exports = {
  MAX_LEVEL,
  CRITICALITIES,
  CRIT_WEIGHT,
  clampLevel,
  employeeGaps,
  orgGapRollup,
  matchTrainings,
};
