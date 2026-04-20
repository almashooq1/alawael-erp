/**
 * retentionService — pure math over Beneficiary + TherapySession records.
 *
 * Answers the missing piece of the revenue cycle: which beneficiaries
 * are active, which are at risk of churning, and which already left.
 *
 * Session activity is the ground truth — not the Beneficiary.status
 * field, which can be stale. A beneficiary who hasn't had a session in
 * 60 days is effectively churned regardless of what the status says.
 *
 * Functions:
 *   • summarize(benefs, sessions)           active/at-risk/churned counts
 *   • atRiskBeneficiaries(benefs, sessions) watchlist sorted by risk
 *   • cohortRetention(benefs, sessions)     per-cohort retention curve
 *   • churnByService(benefs)                per-service-type churn rate
 *   • detectChurnSpike(history)             alarm when recent churn spiking
 */

'use strict';

function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

function envFloat(name, fallback) {
  const v = parseFloat(process.env[name]);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

const THRESHOLDS = {
  // Active = last session within this many days.
  get activeDays() {
    return envInt('RETENTION_ACTIVE_DAYS', 30);
  },
  // At-risk window: no session between ACTIVE_DAYS and CHURN_DAYS.
  // This is the "reach out now before they're gone" zone.
  get churnDays() {
    return envInt('RETENTION_CHURN_DAYS', 60);
  },
  // % of active beneficiaries churning per month that trips the alarm.
  get churnSpikePct() {
    return envFloat('RETENTION_CHURN_SPIKE_PCT', 5);
  },
  // Minimum sample before the spike alarm may fire.
  get spikeMinSample() {
    return envInt('RETENTION_SPIKE_MIN_SAMPLE', 10);
  },
};

const COUNTS_AS_CHURN = new Set(['inactive', 'transferred']);
const EXCLUDED_FROM_BASE = new Set(['deceased', 'graduated', 'pending']);

function benefKey(id) {
  return id ? String(id) : null;
}

/**
 * Index sessions by beneficiary → latest session date.
 * Used by several functions — expose it so routes can compute once.
 */
function indexLastSession(sessions) {
  const map = new Map();
  for (const s of sessions) {
    const k = benefKey(s.beneficiary);
    if (!k) continue;
    const d = s.date ? new Date(s.date) : null;
    if (!d) continue;
    if (!map.has(k) || d > map.get(k)) map.set(k, d);
  }
  return map;
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function classify(lastSessionDate, asOf, activeDays, churnDays) {
  if (!lastSessionDate) return 'never_started';
  const days = daysBetween(lastSessionDate, asOf);
  if (days <= activeDays) return 'active';
  if (days <= churnDays) return 'at_risk';
  return 'churned';
}

function summarize(beneficiaries, sessions, asOf = new Date()) {
  const lastMap = indexLastSession(sessions);
  const stats = {
    total: 0,
    active: 0,
    atRisk: 0,
    churned: 0,
    neverStarted: 0,
    avgTenureDays: null,
    thresholds: {
      activeDays: THRESHOLDS.activeDays,
      churnDays: THRESHOLDS.churnDays,
    },
  };
  let totalTenure = 0;
  let tenureCount = 0;
  for (const b of beneficiaries) {
    if (EXCLUDED_FROM_BASE.has(b.status)) continue;
    stats.total += 1;
    const last = lastMap.get(benefKey(b._id));
    const cls = classify(last, asOf, THRESHOLDS.activeDays, THRESHOLDS.churnDays);
    if (cls === 'active') stats.active += 1;
    else if (cls === 'at_risk') stats.atRisk += 1;
    else if (cls === 'churned') stats.churned += 1;
    else stats.neverStarted += 1;

    // Tenure for enrolled (ever-active) beneficiaries only.
    if (cls !== 'never_started' && b.createdAt) {
      const endDate = cls === 'churned' && last ? last : asOf;
      totalTenure += daysBetween(b.createdAt, endDate);
      tenureCount += 1;
    }
  }
  if (tenureCount > 0) {
    stats.avgTenureDays = Math.round((totalTenure / tenureCount) * 10) / 10;
  }
  const base = stats.active + stats.atRisk + stats.churned;
  stats.churnRate = base > 0 ? Math.round((stats.churned / base) * 1000) / 10 : null;
  stats.retentionRate =
    base > 0 ? Math.round(((stats.active + stats.atRisk) / base) * 1000) / 10 : null;
  return stats;
}

/**
 * Watchlist of at-risk beneficiaries: sessions dropping, 14-60d gap.
 * Also flags ones whose session frequency has halved compared to the
 * prior 30-day window — leading indicator before they fully disengage.
 */
function atRiskBeneficiaries(beneficiaries, sessions, asOf = new Date(), n = 50) {
  const lastMap = indexLastSession(sessions);
  // Per-beneficiary session counts in two windows.
  const recentCutoff = new Date(asOf.getTime() - THRESHOLDS.activeDays * 86400000);
  const priorCutoff = new Date(asOf.getTime() - 2 * THRESHOLDS.activeDays * 86400000);
  const recent = new Map();
  const prior = new Map();
  for (const s of sessions) {
    const k = benefKey(s.beneficiary);
    if (!k || !s.date) continue;
    const d = new Date(s.date);
    if (d >= recentCutoff) recent.set(k, (recent.get(k) || 0) + 1);
    else if (d >= priorCutoff) prior.set(k, (prior.get(k) || 0) + 1);
  }
  const rows = [];
  for (const b of beneficiaries) {
    if (EXCLUDED_FROM_BASE.has(b.status)) continue;
    const k = benefKey(b._id);
    const last = lastMap.get(k);
    const cls = classify(last, asOf, THRESHOLDS.activeDays, THRESHOLDS.churnDays);
    const recentCount = recent.get(k) || 0;
    const priorCount = prior.get(k) || 0;
    // At risk if: in at_risk classification OR active-but-declining
    // (recent < 50% of prior with at least 2 prior sessions).
    const declining = recentCount < priorCount / 2 && priorCount >= 2;
    if (cls !== 'at_risk' && !(cls === 'active' && declining)) continue;
    rows.push({
      _id: b._id,
      name:
        [b.firstName_ar, b.lastName_ar].filter(Boolean).join(' ') ||
        [b.firstName, b.lastName].filter(Boolean).join(' ') ||
        '—',
      status: b.status,
      classification: cls,
      daysSinceLastSession: last ? daysBetween(last, asOf) : null,
      lastSessionAt: last ? last.toISOString() : null,
      sessionsLast30d: recentCount,
      sessionsPrior30d: priorCount,
      declining,
    });
  }
  // Sort: at_risk (more severe) first, then by days-since-last desc.
  rows.sort((a, b) => {
    if (a.classification !== b.classification) {
      return a.classification === 'at_risk' ? -1 : 1;
    }
    return (b.daysSinceLastSession || 0) - (a.daysSinceLastSession || 0);
  });
  return rows.slice(0, n);
}

/**
 * Cohort retention: for beneficiaries enrolled in month M, what % are
 * still active after 1/3/6/12 months? Plain survival curve, no censoring.
 */
function cohortRetention(beneficiaries, sessions, asOf = new Date()) {
  const lastMap = indexLastSession(sessions);
  const cohorts = new Map();
  for (const b of beneficiaries) {
    if (EXCLUDED_FROM_BASE.has(b.status)) continue;
    if (!b.createdAt) continue;
    const cohort = new Date(b.createdAt).toISOString().slice(0, 7);
    if (!cohorts.has(cohort)) {
      cohorts.set(cohort, {
        cohort,
        enrolled: 0,
        retained1m: 0,
        retained3m: 0,
        retained6m: 0,
        retained12m: 0,
      });
    }
    const row = cohorts.get(cohort);
    row.enrolled += 1;
    const last = lastMap.get(benefKey(b._id));
    if (!last) continue; // never had a session — doesn't count toward retention
    const ageMonths = monthsBetween(b.createdAt, asOf);
    // "Retained at Nm" = their LAST session is ≥ N months after enrollment
    const retainedMonths = monthsBetween(b.createdAt, last);
    if (ageMonths >= 1 && retainedMonths >= 1) row.retained1m += 1;
    if (ageMonths >= 3 && retainedMonths >= 3) row.retained3m += 1;
    if (ageMonths >= 6 && retainedMonths >= 6) row.retained6m += 1;
    if (ageMonths >= 12 && retainedMonths >= 12) row.retained12m += 1;
  }
  return [...cohorts.values()]
    .sort((a, b) => (a.cohort < b.cohort ? -1 : 1))
    .map(r => {
      const pct = (v, base) => (base > 0 ? Math.round((v / base) * 1000) / 10 : null);
      return {
        cohort: r.cohort,
        enrolled: r.enrolled,
        m1Pct: pct(r.retained1m, r.enrolled),
        m3Pct: pct(r.retained3m, r.enrolled),
        m6Pct: pct(r.retained6m, r.enrolled),
        m12Pct: pct(r.retained12m, r.enrolled),
      };
    });
}

function monthsBetween(a, b) {
  return (new Date(b) - new Date(a)) / (30 * 86400000);
}

/**
 * Per-service-type retention. Pulls from enrolledPrograms[].status.
 * A beneficiary with multiple programs shows in each row — intentional
 * so the numbers reflect programs, not unique beneficiaries.
 */
function churnByService(beneficiaries) {
  const byService = new Map();
  for (const b of beneficiaries) {
    if (!Array.isArray(b.enrolledPrograms)) continue;
    for (const p of b.enrolledPrograms) {
      const key = p.programName || p.serviceType || 'غير محدّد';
      if (!byService.has(key)) {
        byService.set(key, {
          service: key,
          total: 0,
          active: 0,
          dropped: 0,
          completed: 0,
          paused: 0,
        });
      }
      const row = byService.get(key);
      row.total += 1;
      const s = p.status || 'active';
      if (s === 'active') row.active += 1;
      else if (s === 'dropped') row.dropped += 1;
      else if (s === 'completed') row.completed += 1;
      else if (s === 'paused') row.paused += 1;
    }
  }
  return [...byService.values()]
    .map(row => ({
      ...row,
      churnRate: row.total > 0 ? Math.round((row.dropped / row.total) * 1000) / 10 : null,
      retentionRate:
        row.total > 0 ? Math.round(((row.active + row.completed) / row.total) * 1000) / 10 : null,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Monthly churn trend from Beneficiary records.
 * Returns { month, churned, activeAtStart, churnPct } for the last 12 months.
 * Uses updatedAt as churn date proxy for beneficiaries in churn statuses.
 */
function monthlyChurnHistory(beneficiaries, asOf = new Date()) {
  const cutoff = new Date(asOf);
  cutoff.setMonth(cutoff.getMonth() - 12);
  const byMonth = new Map();
  for (const b of beneficiaries) {
    if (!COUNTS_AS_CHURN.has(b.status)) continue;
    const churnDate = b.updatedAt ? new Date(b.updatedAt) : null;
    if (!churnDate || churnDate < cutoff) continue;
    const key = churnDate.toISOString().slice(0, 7);
    byMonth.set(key, (byMonth.get(key) || 0) + 1);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, churned]) => ({ month, churned }));
}

/**
 * Trips when latest month's churn exceeds RETENTION_CHURN_SPIKE_PCT
 * of the current active base. Gated by minimum sample so a tiny clinic
 * with 3 active beneficiaries doesn't page finance.
 */
function detectChurnSpike(beneficiaries, sessions, asOf = new Date()) {
  const summary = summarize(beneficiaries, sessions, asOf);
  const history = monthlyChurnHistory(beneficiaries, asOf);
  const activeBase = summary.active + summary.atRisk;
  if (activeBase < THRESHOLDS.spikeMinSample) {
    return { active: false, reason: 'insufficient_sample', activeBase };
  }
  if (history.length === 0) return { active: false, reason: 'no_churn_history', activeBase };
  const latest = history[history.length - 1];
  const pct = Math.round((latest.churned / activeBase) * 1000) / 10;
  return {
    active: pct >= THRESHOLDS.churnSpikePct,
    latestMonth: latest.month,
    churnedInMonth: latest.churned,
    activeBase,
    churnPct: pct,
    threshold: THRESHOLDS.churnSpikePct,
  };
}

module.exports = {
  THRESHOLDS,
  indexLastSession,
  summarize,
  atRiskBeneficiaries,
  cohortRetention,
  churnByService,
  monthlyChurnHistory,
  detectChurnSpike,
};
