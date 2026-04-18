/**
 * cpeService.js — SCFHS CPE credit math.
 *
 * Computes the rolling 5-year credit window per employee, broken down
 * by category. The cycle-end date is configurable because SCFHS
 * renewal windows aren't aligned to calendar years — they run from
 * the practitioner's own registration date.
 *
 * SCFHS 2021 framework minimums (renewal requires ALL categories met):
 *   • Category 1 (accredited formal): 50 credits per 5-year cycle
 *   • Category 2 (practice-based):    30 credits per 5-year cycle
 *   • Category 3 (self-directed):     20 credits per 5-year cycle
 *   • Grand total:                    100 credits per 5-year cycle
 *
 * The numbers come from SCFHS's Regulations for Continuing Professional
 * Development (v3.1, 2021). They're configurable via env in case the
 * commission updates them; defaults match the current publication.
 *
 * Consumers:
 *   • /admin/hr/cpe/{employee}/summary — dashboard card
 *   • monthly cron that pages HR when a therapist is <6 months out
 *     and still short on credits
 */

'use strict';

const REQUIRED_CYCLE_DAYS = 5 * 365;

function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

// Per-category minimums. Env overrides let compliance tweak without
// a code deploy if SCFHS publishes a new schedule.
const MIN_PER_CYCLE = {
  get 1() {
    return envInt('SCFHS_CPE_MIN_CAT1', 50);
  },
  get 2() {
    return envInt('SCFHS_CPE_MIN_CAT2', 30);
  },
  get 3() {
    return envInt('SCFHS_CPE_MIN_CAT3', 20);
  },
  get total() {
    return envInt('SCFHS_CPE_MIN_TOTAL', 100);
  },
};

/**
 * Given a list of CpeRecord rows + a cycle end date, compute the
 * credit summary. Pure function — no DB, no side effects, fully
 * testable.
 *
 * @param {Array}  records        CpeRecord documents (raw or lean)
 * @param {Date}   cycleEndDate   The renewal deadline (end of window)
 * @returns {object} summary      { cycle: {start,end}, byCategory, totals }
 */
function summarize(records, cycleEndDate) {
  const end = cycleEndDate instanceof Date ? cycleEndDate : new Date(cycleEndDate);
  const start = new Date(end.getTime() - REQUIRED_CYCLE_DAYS * 24 * 60 * 60 * 1000);

  const inWindow = records.filter(r => {
    const d = new Date(r.activityDate);
    return d >= start && d <= end;
  });

  const byCategory = { 1: 0, 2: 0, 3: 0 };
  const verifiedByCategory = { 1: 0, 2: 0, 3: 0 };
  let total = 0;
  let verifiedTotal = 0;

  for (const r of inWindow) {
    const cat = String(r.category);
    if (!(cat in byCategory)) continue;
    const hours = Number(r.creditHours || 0);
    byCategory[cat] += hours;
    total += hours;
    if (r.verified) {
      verifiedByCategory[cat] += hours;
      verifiedTotal += hours;
    }
  }

  // Per-category status — only VERIFIED credits count toward renewal.
  const categoryStatus = {};
  for (const cat of ['1', '2', '3']) {
    const earned = verifiedByCategory[cat];
    const required = MIN_PER_CYCLE[cat];
    categoryStatus[cat] = {
      earned,
      required,
      met: earned >= required,
      deficit: Math.max(0, required - earned),
    };
  }

  const totalStatus = {
    earned: verifiedTotal,
    required: MIN_PER_CYCLE.total,
    met: verifiedTotal >= MIN_PER_CYCLE.total,
    deficit: Math.max(0, MIN_PER_CYCLE.total - verifiedTotal),
  };

  const allCategoriesMet = ['1', '2', '3'].every(c => categoryStatus[c].met);
  const compliant = allCategoriesMet && totalStatus.met;

  return {
    cycle: { start, end, days: REQUIRED_CYCLE_DAYS },
    recordCount: inWindow.length,
    byCategory, // raw hours per category (verified + unverified)
    verifiedByCategory,
    categoryStatus, // per-cat pass/fail against SCFHS minimum
    total,
    verifiedTotal,
    totalStatus,
    compliant,
  };
}

/**
 * Days until the cycle end. Negative = overdue.
 */
function daysUntilDeadline(cycleEndDate) {
  const end = cycleEndDate instanceof Date ? cycleEndDate : new Date(cycleEndDate);
  return Math.ceil((end.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

/**
 * Returns true when the therapist needs attention: within 6 months of
 * the cycle end AND not compliant. That's the cron-page trigger.
 */
function needsAttention(summary, cycleEndDate) {
  if (summary.compliant) return false;
  const days = daysUntilDeadline(cycleEndDate);
  return days <= 180; // 6 months
}

module.exports = {
  summarize,
  daysUntilDeadline,
  needsAttention,
  MIN_PER_CYCLE,
  REQUIRED_CYCLE_DAYS,
};
