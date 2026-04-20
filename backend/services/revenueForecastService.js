/**
 * revenueForecastService — pure math for short-horizon cashflow projection.
 *
 * Built on the same Invoice records as revenueService (which handles AR
 * aging + top debtors + current-state summary). This file answers the
 * forward-looking question: "given the last 6 months of invoicing, what
 * can the CEO expect in the next 3 months?"
 *
 * Functions:
 *   • dso(invoices)                Days Sales Outstanding (weighted)
 *   • velocityByInsurer(invoices)  avg days from issue→paid per insurer
 *   • cohortCollection(invoices)   % collected by month-age (1/2/3/6 mo)
 *   • projectMonths(invoices, n)   forecast next N months of inflow
 *   • detectCashflowRisk(history)  alarm when trend declining vs trailing
 *
 * Model is deliberately simple: moving-average over trailing history,
 * risk-adjusted by the lifetime collection rate. Not ML — finance teams
 * need forecasts they can explain.
 */

'use strict';

function envFloat(name, fallback) {
  const v = parseFloat(process.env[name]);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

const THRESHOLDS = {
  // Trailing months used to compute the moving-average baseline.
  get trailingMonths() {
    return envInt('FORECAST_TRAILING_MONTHS', 6);
  },
  // % drop vs trailing average that trips the cashflow-risk alarm.
  get riskDropPct() {
    return envFloat('FORECAST_RISK_DROP_PCT', 20);
  },
  // Minimum months of history before forecasting (avoid garbage output
  // on a 2-invoice DB).
  get minHistoryMonths() {
    return envInt('FORECAST_MIN_HISTORY_MONTHS', 3);
  },
};

const PAID = 'PAID';
const SETTLED_STATUSES = new Set(['PAID', 'PARTIALLY_PAID']);

function toMonthKey(d) {
  return new Date(d).toISOString().slice(0, 7);
}

function amount(inv) {
  return Number(inv?.totalAmount || 0);
}

function daysBetween(a, b) {
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));
}

/**
 * Days Sales Outstanding — weighted by invoice amount.
 * Higher = slower collection. Industry benchmark: <45 days is healthy.
 */
function dso(invoices, now = new Date()) {
  let weightedDays = 0;
  let totalAmount = 0;
  for (const inv of invoices) {
    if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') continue;
    if (!inv.issueDate) continue;
    const amt = amount(inv);
    if (amt <= 0) continue;
    // For paid invoices, count days-to-paid (use updatedAt as proxy).
    // For outstanding, count days-since-issue.
    const endDate = inv.status === PAID && inv.updatedAt ? inv.updatedAt : now;
    const days = daysBetween(inv.issueDate, endDate);
    weightedDays += days * amt;
    totalAmount += amt;
  }
  if (totalAmount === 0) return null;
  return Math.round((weightedDays / totalAmount) * 10) / 10;
}

/**
 * Per-insurer average days-from-issue-to-paid. Exposes which payers
 * take 90+ days vs which pay promptly. Excludes non-insurance invoices.
 */
function velocityByInsurer(invoices) {
  const byIns = new Map();
  for (const inv of invoices) {
    if (inv.status !== PAID || !inv.issueDate || !inv.updatedAt) continue;
    const key = inv.insurance?.provider ? String(inv.insurance.provider) : null;
    if (!key) continue;
    const days = daysBetween(inv.issueDate, inv.updatedAt);
    if (!byIns.has(key)) {
      byIns.set(key, { insurer: key, paidCount: 0, totalDays: 0, totalAmount: 0 });
    }
    const row = byIns.get(key);
    row.paidCount += 1;
    row.totalDays += days;
    row.totalAmount += amount(inv);
  }
  return [...byIns.values()]
    .map(row => ({
      insurer: row.insurer,
      paidCount: row.paidCount,
      totalAmount: Math.round(row.totalAmount * 100) / 100,
      avgDaysToPaid: Math.round((row.totalDays / row.paidCount) * 10) / 10,
    }))
    .sort((a, b) => b.avgDaysToPaid - a.avgDaysToPaid);
}

/**
 * Cohort collection curve. For invoices issued in month M, what % of
 * the cohort's total is collected by month M+1, M+2, M+3, M+6?
 * Helps predict the shape of future inflow.
 */
function cohortCollection(invoices) {
  const cohorts = new Map();
  for (const inv of invoices) {
    if (!inv.issueDate || inv.status === 'DRAFT' || inv.status === 'CANCELLED') continue;
    const cohort = toMonthKey(inv.issueDate);
    if (!cohorts.has(cohort)) {
      cohorts.set(cohort, { cohort, issued: 0, paidBy1: 0, paidBy2: 0, paidBy3: 0, paidBy6: 0 });
    }
    const row = cohorts.get(cohort);
    const amt = amount(inv);
    row.issued += amt;
    if (inv.status === PAID && inv.updatedAt && inv.issueDate) {
      const daysToPaid = daysBetween(inv.issueDate, inv.updatedAt);
      if (daysToPaid <= 30) row.paidBy1 += amt;
      if (daysToPaid <= 60) row.paidBy2 += amt;
      if (daysToPaid <= 90) row.paidBy3 += amt;
      if (daysToPaid <= 180) row.paidBy6 += amt;
    }
  }
  return [...cohorts.values()]
    .sort((a, b) => (a.cohort < b.cohort ? -1 : 1))
    .map(r => {
      const pct = v => (r.issued > 0 ? Math.round((v / r.issued) * 1000) / 10 : null);
      return {
        cohort: r.cohort,
        issued: Math.round(r.issued * 100) / 100,
        pct30d: pct(r.paidBy1),
        pct60d: pct(r.paidBy2),
        pct90d: pct(r.paidBy3),
        pct180d: pct(r.paidBy6),
      };
    });
}

/**
 * Trailing monthly averages used as the forecast baseline.
 * Returns { issuedAvg, paidAvg, collectionRate, monthsObserved }.
 */
function trailingAverages(invoices, trailingMonths = null, now = new Date()) {
  const mo = trailingMonths ?? THRESHOLDS.trailingMonths;
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - mo);
  const byMonth = new Map();
  for (const inv of invoices) {
    if (!inv.issueDate) continue;
    const dt = new Date(inv.issueDate);
    if (dt < cutoff) continue;
    if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') continue;
    const key = toMonthKey(dt);
    if (!byMonth.has(key)) byMonth.set(key, { issued: 0, paid: 0 });
    const row = byMonth.get(key);
    const amt = amount(inv);
    row.issued += amt;
    if (SETTLED_STATUSES.has(inv.status)) row.paid += amt;
  }
  const months = [...byMonth.values()];
  if (months.length === 0) {
    return { issuedAvg: 0, paidAvg: 0, collectionRate: null, monthsObserved: 0 };
  }
  const issuedAvg = months.reduce((a, m) => a + m.issued, 0) / months.length;
  const paidAvg = months.reduce((a, m) => a + m.paid, 0) / months.length;
  return {
    issuedAvg: Math.round(issuedAvg * 100) / 100,
    paidAvg: Math.round(paidAvg * 100) / 100,
    collectionRate: issuedAvg > 0 ? Math.round((paidAvg / issuedAvg) * 1000) / 10 : null,
    monthsObserved: months.length,
  };
}

/**
 * Forecast next N months of billed + collected inflow.
 * Returns array of { month, projectedIssued, projectedCollected, confidence }.
 * Confidence drops with how far ahead we're projecting.
 */
function projectMonths(invoices, n = 3, now = new Date()) {
  const trailing = trailingAverages(invoices, null, now);
  if (trailing.monthsObserved < THRESHOLDS.minHistoryMonths) {
    return {
      insufficient: true,
      monthsObserved: trailing.monthsObserved,
      required: THRESHOLDS.minHistoryMonths,
      projections: [],
      trailing,
    };
  }
  const collectionRate = (trailing.collectionRate || 0) / 100;
  const projections = [];
  for (let i = 1; i <= n; i++) {
    const dt = new Date(now);
    dt.setMonth(dt.getMonth() + i);
    const monthKey = toMonthKey(dt);
    // Confidence decays: 1.0 at month+1, 0.7 at month+3, 0.4 at month+6
    const confidence = Math.max(0.3, 1 - (i - 1) * 0.15);
    projections.push({
      month: monthKey,
      projectedIssued: Math.round(trailing.issuedAvg * 100) / 100,
      projectedCollected: Math.round(trailing.issuedAvg * collectionRate * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
    });
  }
  return {
    insufficient: false,
    trailing,
    projections,
  };
}

/**
 * Trips when the trailing trend is declining — comparing the latest
 * month's issued amount against the trailing average of prior months.
 * A healthy pipeline stays flat or grows; a drop ≥ RISK_DROP_PCT is a
 * yellow flag for the finance team.
 */
function detectCashflowRisk(invoices, now = new Date()) {
  const history = monthlyHistory(invoices, now);
  if (history.length < THRESHOLDS.minHistoryMonths) {
    return { active: false, reason: 'insufficient_history', monthsObserved: history.length };
  }
  const latest = history[history.length - 1];
  const prior = history.slice(-1 - THRESHOLDS.trailingMonths, -1);
  if (prior.length === 0) return { active: false, reason: 'no_prior_months' };
  const priorAvg = prior.reduce((a, m) => a + m.issued, 0) / prior.length;
  if (priorAvg <= 0) return { active: false, reason: 'no_prior_revenue' };
  const drop = ((priorAvg - latest.issued) / priorAvg) * 100;
  return {
    active: drop >= THRESHOLDS.riskDropPct,
    dropPct: Math.round(drop * 10) / 10,
    threshold: THRESHOLDS.riskDropPct,
    latestMonth: latest.month,
    latestIssued: latest.issued,
    trailingAvg: Math.round(priorAvg * 100) / 100,
    monthsObserved: history.length,
  };
}

function monthlyHistory(invoices, now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - 12);
  const byMonth = new Map();
  for (const inv of invoices) {
    if (!inv.issueDate) continue;
    const dt = new Date(inv.issueDate);
    if (dt < cutoff) continue;
    if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') continue;
    const key = toMonthKey(dt);
    if (!byMonth.has(key)) byMonth.set(key, { month: key, issued: 0, paid: 0 });
    const row = byMonth.get(key);
    row.issued += amount(inv);
    if (SETTLED_STATUSES.has(inv.status)) row.paid += amount(inv);
  }
  return [...byMonth.values()]
    .map(r => ({
      ...r,
      issued: Math.round(r.issued * 100) / 100,
      paid: Math.round(r.paid * 100) / 100,
    }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));
}

module.exports = {
  THRESHOLDS,
  dso,
  velocityByInsurer,
  cohortCollection,
  trailingAverages,
  projectMonths,
  detectCashflowRisk,
  monthlyHistory,
};
