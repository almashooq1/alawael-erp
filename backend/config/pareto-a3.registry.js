'use strict';

/**
 * pareto-a3.registry.js — World-Class QMS Phase 29 Commit 4.
 *
 * Two related tools:
 *
 *   • Pareto analysis — for a list of categorised items, returns
 *     sorted counts + cumulative %, "vital few" cutoff per the
 *     classic 80/20 rule, plus a confirmation of the Pareto-fit
 *     quality (Gini-like inequality of distribution).
 *
 *   • A3 report — Toyota / Lean 8-section problem-solving template
 *     (Background, Current State, Goal, Root-Cause Analysis,
 *     Countermeasures, Implementation Plan, Follow-up, Lessons-Learned).
 *
 * Both are usable across the QMS — incidents, complaints, defect
 * counts, supplier rejects, etc.
 */

// ── A3 template sections ───────────────────────────────────────────

const A3_SECTIONS = Object.freeze([
  {
    code: 'background',
    nameAr: 'الخلفية',
    nameEn: 'Background / Reason for action',
    helpEn: 'Why are we tackling this issue now? Strategic alignment.',
  },
  {
    code: 'current_state',
    nameAr: 'الوضع الحالي',
    nameEn: 'Current state',
    helpEn: 'Quantify what is happening today, with data + visuals.',
  },
  {
    code: 'goal',
    nameAr: 'الهدف',
    nameEn: 'Goal / Target condition',
    helpEn: 'SMART goal with measurable target and deadline.',
  },
  {
    code: 'root_cause',
    nameAr: 'تحليل السبب الجذري',
    nameEn: 'Root cause analysis',
    helpEn: 'Use 5-Whys, Ishikawa, or data. Avoid jumping to solutions.',
  },
  {
    code: 'countermeasures',
    nameAr: 'الإجراءات المضادة',
    nameEn: 'Countermeasures',
    helpEn: 'Targeted actions tied to specific root causes.',
  },
  {
    code: 'implementation',
    nameAr: 'خطة التنفيذ',
    nameEn: 'Implementation plan',
    helpEn: 'Who, what, when. Gantt or simple table.',
  },
  {
    code: 'follow_up',
    nameAr: 'المتابعة',
    nameEn: 'Follow-up / Check results',
    helpEn: 'How will we verify the goal is met? What is the review cadence?',
  },
  {
    code: 'lessons_learned',
    nameAr: 'الدروس المستفادة',
    nameEn: 'Lessons learned',
    helpEn: 'What can be standardised or shared across the organisation?',
  },
]);

const A3_STATUSES = Object.freeze([
  'draft',
  'in_review',
  'approved',
  'in_execution',
  'follow_up',
  'closed',
  'cancelled',
]);

const A3_TERMINAL_STATUSES = Object.freeze(['closed', 'cancelled']);

const A3_ALLOWED_TRANSITIONS = Object.freeze({
  draft: ['in_review', 'cancelled'],
  in_review: ['approved', 'draft', 'cancelled'],
  approved: ['in_execution', 'cancelled'],
  in_execution: ['follow_up', 'cancelled'],
  follow_up: ['closed', 'in_execution'],
  closed: [],
  cancelled: [],
});

// ── Pareto computation ─────────────────────────────────────────────

const PARETO_DEFAULT_THRESHOLD = 0.8; // 80%

/**
 * Compute a Pareto distribution from a flat list of categorised items.
 *
 * @param {Array<{category:string,count?:number}>} items — either one
 *   record per occurrence (count omitted ⇒ 1) or pre-grouped with
 *   count.
 * @param {object} [opts]
 * @param {number} [opts.threshold=0.8] — cumulative cut-off for "vital few".
 * @returns {{
 *   total:number,
 *   distinct:number,
 *   distribution:Array<{category:string,count:number,percent:number,cumulative:number,vitalFew:boolean}>,
 *   vitalFew:string[],
 *   trivialMany:string[],
 *   isParetoFit:boolean,        // true if vitalFew accounts for ≥80% but uses ≤20% of categories
 *   gini:number                 // 0 = perfectly even, 1 = all weight on one category
 * }}
 */
function computePareto(items, { threshold = PARETO_DEFAULT_THRESHOLD } = {}) {
  if (!Array.isArray(items)) throw new Error('items must be an array');
  const counts = new Map();
  for (const it of items) {
    if (!it || !it.category) continue;
    const c = Number(it.count || 1);
    counts.set(it.category, (counts.get(it.category) || 0) + c);
  }
  const sorted = Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const total = sorted.reduce((a, r) => a + r.count, 0);
  if (total === 0) {
    return {
      total: 0,
      distinct: 0,
      distribution: [],
      vitalFew: [],
      trivialMany: [],
      isParetoFit: false,
      gini: 0,
    };
  }

  let running = 0;
  const distribution = sorted.map(r => {
    running += r.count;
    const cumulative = running / total;
    return {
      category: r.category,
      count: r.count,
      percent: r.count / total,
      cumulative,
      vitalFew: cumulative <= threshold || running - r.count < total * threshold,
    };
  });

  const vitalFew = distribution.filter(d => d.vitalFew).map(d => d.category);
  const trivialMany = distribution.filter(d => !d.vitalFew).map(d => d.category);

  // Gini-like coefficient on the sorted distribution.
  const n = sorted.length;
  let cumulSum = 0;
  let weighted = 0;
  for (let i = 0; i < n; i++) {
    cumulSum += sorted[i].count;
    weighted += cumulSum;
  }
  const gini = n <= 1 ? 0 : (2 * weighted) / (n * total) - (n + 1) / n;

  // Pareto fit heuristic:
  //   • Either the top categories really are a tiny minority (≤ 25% of all)
  //     accounting for ≥ threshold, OR
  //   • The Gini-style inequality of the distribution is high enough
  //     (≥ 0.4) that focusing on the leading bars will pay off — useful
  //     when N is small (e.g. 5 categories where 2 cover 80%).
  const vitalShare = n === 0 ? 1 : vitalFew.length / n;
  const reachesThreshold = distribution.some(d => d.cumulative >= threshold);
  const isParetoFit = reachesThreshold && (vitalShare <= 0.25 || gini >= 0.4);

  return { total, distinct: n, distribution, vitalFew, trivialMany, isParetoFit, gini };
}

module.exports = {
  A3_SECTIONS,
  A3_STATUSES,
  A3_TERMINAL_STATUSES,
  A3_ALLOWED_TRANSITIONS,
  PARETO_DEFAULT_THRESHOLD,
  computePareto,
};
