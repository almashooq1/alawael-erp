/**
 * diversity.lib.js — pure workforce diversity & inclusion statistics (W1199).
 *
 * Composition, diversity indices, Saudization, and the "glass-ceiling" lens
 * (representation of each group ACROSS salary tiers — a seniority proxy, since the
 * Employee schema carries no explicit grade/level). Distinct from pay-equity:
 * this measures WHO is represented and at WHAT levels, not pay gaps.
 *
 * All functions pure (no DB, no Date). Rows: `{ gender, nationality, salary,
 * department }`. The service maps `total_salary` → `salary`.
 *
 * PRIVACY: like pay-equity, group breakdowns below MIN_GROUP are flagged
 * non-reportable so a published % can't re-identify an individual.
 */

'use strict';

const MIN_GROUP = 3;
const SAUDI = new Set(['sa', 'sau', 'saudi', 'ksa', 'السعودية']);

function isSaudi(nationality) {
  return SAUDI.has(
    String(nationality || '')
      .trim()
      .toLowerCase()
  );
}

function round(n, dp = 1) {
  if (n == null || !Number.isFinite(n)) return null;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** counts → { groups: {label: count}, total }. */
function tally(rows, classify) {
  const groups = {};
  let total = 0;
  for (const r of rows) {
    const k = classify(r);
    if (k == null) continue;
    groups[k] = (groups[k] || 0) + 1;
    total++;
  }
  return { groups, total };
}

/** representation: counts + % per group on a dimension. */
function representation(rows, classify) {
  const { groups, total } = tally(rows, classify);
  const pct = {};
  for (const [k, c] of Object.entries(groups)) pct[k] = total ? round((c / total) * 100) : 0;
  return { total, counts: groups, pct };
}

/** Blau's index of heterogeneity: 1 - Σ pᵢ²  (0 = homogeneous, →1 = even mix). */
function blauIndex(counts) {
  const vals = Object.values(counts);
  const total = vals.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  const sumSq = vals.reduce((a, c) => a + (c / total) ** 2, 0);
  return round(1 - sumSq, 3);
}

/** Shannon entropy (natural log), normalised to [0,1] by ln(k). */
function shannonIndex(counts) {
  const vals = Object.values(counts).filter(c => c > 0);
  const total = vals.reduce((a, b) => a + b, 0);
  if (total <= 0 || vals.length <= 1) return vals.length <= 1 ? 0 : null;
  const h = -vals.reduce((a, c) => {
    const p = c / total;
    return a + p * Math.log(p);
  }, 0);
  return round(h / Math.log(vals.length), 3);
}

function saudizationRate(rows) {
  if (!rows.length) return null;
  const saudi = rows.filter(r => isSaudi(r.nationality)).length;
  return round((saudi / rows.length) * 100);
}

/**
 * Glass-ceiling lens: split the workforce into `tiers` equal-size salary tiers
 * (T1 = lowest paid … Tn = highest), then report each group's share within each
 * tier. A group whose share DROPS sharply in the top tier vs the bottom is a
 * representation cliff. Returns per-tier representation + a topVsBottomDelta per
 * group for the primary dimension (gender).
 */
function representationByTier(rows, classify, tiers = 3) {
  const withSalary = rows.filter(r => Number.isFinite(Number(r.salary)) && r.salary >= 0);
  if (withSalary.length < tiers * MIN_GROUP) {
    return { reportable: false, tiers: [], note: 'insufficient salaried headcount for tiering' };
  }
  const sorted = [...withSalary].sort((a, b) => Number(a.salary) - Number(b.salary));
  const size = Math.floor(sorted.length / tiers);
  const out = [];
  for (let t = 0; t < tiers; t++) {
    const start = t * size;
    const end = t === tiers - 1 ? sorted.length : start + size;
    const slice = sorted.slice(start, end);
    out.push({ tier: t + 1, headcount: slice.length, ...representation(slice, classify) });
  }
  // delta = top-tier share − bottom-tier share, per group (negative = under-represented at the top)
  const bottom = out[0].pct;
  const top = out[out.length - 1].pct;
  const groups = new Set([...Object.keys(bottom), ...Object.keys(top)]);
  const topVsBottomDelta = {};
  for (const g of groups) topVsBottomDelta[g] = round((top[g] || 0) - (bottom[g] || 0));
  return { reportable: true, tierCount: tiers, tiers: out, topVsBottomDelta };
}

/** Full diversity analysis over the in-scope active workforce rows. */
function analyzeDiversity(rows, opts = {}) {
  const clean = (rows || []).filter(Boolean);
  const tiers = opts.tiers || 3;
  const gender = representation(clean, r => r.gender || null);
  const nationality = representation(clean, r => (isSaudi(r.nationality) ? 'saudi' : 'nonSaudi'));
  const department = representation(clean, r => r.department || null);
  return {
    headcount: clean.length,
    reportable: clean.length >= MIN_GROUP,
    gender,
    nationality,
    department,
    saudizationRatePct: saudizationRate(clean),
    diversityIndex: {
      genderBlau: blauIndex(gender.counts),
      nationalityBlau: blauIndex(nationality.counts),
      departmentShannon: shannonIndex(department.counts),
    },
    seniorityLens: {
      gender: representationByTier(clean, r => r.gender || null, tiers),
      nationality: representationByTier(
        clean,
        r => (isSaudi(r.nationality) ? 'saudi' : 'nonSaudi'),
        tiers
      ),
    },
  };
}

module.exports = {
  MIN_GROUP,
  isSaudi,
  round,
  tally,
  representation,
  blauIndex,
  shannonIndex,
  saudizationRate,
  representationByTier,
  analyzeDiversity,
};
