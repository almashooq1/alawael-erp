/**
 * revenueService — pure math over Invoice records.
 *
 * Functions:
 *   • summarize(invoices)          totals + paid/outstanding/at-risk + breakdown
 *   • agingBuckets(invoices, asOf) 0-30 / 31-60 / 61-90 / >90 days overdue
 *   • topDebtors(invoices, n)      beneficiaries with largest outstanding balance
 *   • revenueByMonth(invoices)     last-12-months net revenue trend
 *   • detectOverdueAlarm(buckets)  true when >90d AR exceeds OVERDUE_ALARM_PCT
 *
 * No DB / no mongoose — the route layer hydrates invoices via lean() then
 * hands them in here. Same pattern the other analytics services follow.
 */

'use strict';

function envFloat(name, fallback) {
  const v = parseFloat(process.env[name]);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

const THRESHOLDS = {
  // % of total AR that, if sitting >90 days, should trip the alarm.
  get overdueAlarmPct() {
    return envFloat('AR_OVERDUE_ALARM_PCT', 15);
  },
  // Absolute floor so alarm doesn't fire on tiny outstanding amounts.
  get overdueAlarmMinAmount() {
    return envFloat('AR_OVERDUE_ALARM_MIN_AMOUNT', 5000);
  },
};

const OUTSTANDING_STATUSES = new Set(['ISSUED', 'PARTIALLY_PAID', 'OVERDUE']);
const PAID_STATUSES = new Set(['PAID']);

function amount(inv) {
  return Number(inv?.totalAmount || 0);
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function summarize(invoices) {
  const stats = {
    total: invoices.length,
    grossRevenue: 0,
    paidRevenue: 0,
    outstandingAmount: 0,
    draftAmount: 0,
    cancelledCount: 0,
    byStatus: {
      DRAFT: 0,
      ISSUED: 0,
      PARTIALLY_PAID: 0,
      PAID: 0,
      CANCELLED: 0,
      OVERDUE: 0,
    },
  };
  for (const inv of invoices) {
    const amt = amount(inv);
    const s = inv.status;
    if (s in stats.byStatus) stats.byStatus[s] += 1;
    if (s === 'CANCELLED') {
      stats.cancelledCount += 1;
      continue;
    }
    stats.grossRevenue += amt;
    if (PAID_STATUSES.has(s)) stats.paidRevenue += amt;
    if (OUTSTANDING_STATUSES.has(s)) stats.outstandingAmount += amt;
    if (s === 'DRAFT') stats.draftAmount += amt;
  }
  stats.grossRevenue = Math.round(stats.grossRevenue * 100) / 100;
  stats.paidRevenue = Math.round(stats.paidRevenue * 100) / 100;
  stats.outstandingAmount = Math.round(stats.outstandingAmount * 100) / 100;
  stats.draftAmount = Math.round(stats.draftAmount * 100) / 100;
  stats.collectionRate =
    stats.grossRevenue > 0
      ? Math.round((stats.paidRevenue / stats.grossRevenue) * 1000) / 10
      : null;
  return stats;
}

function agingBuckets(invoices, asOf = new Date()) {
  const buckets = {
    current: { count: 0, amount: 0 },
    d0to30: { count: 0, amount: 0 },
    d31to60: { count: 0, amount: 0 },
    d61to90: { count: 0, amount: 0 },
    over90: { count: 0, amount: 0 },
    totalOutstanding: 0,
  };
  for (const inv of invoices) {
    if (!OUTSTANDING_STATUSES.has(inv.status)) continue;
    const amt = amount(inv);
    if (!inv.dueDate) {
      buckets.current.count += 1;
      buckets.current.amount += amt;
      buckets.totalOutstanding += amt;
      continue;
    }
    const overdueDays = daysBetween(inv.dueDate, asOf);
    if (overdueDays <= 0) {
      buckets.current.count += 1;
      buckets.current.amount += amt;
    } else if (overdueDays <= 30) {
      buckets.d0to30.count += 1;
      buckets.d0to30.amount += amt;
    } else if (overdueDays <= 60) {
      buckets.d31to60.count += 1;
      buckets.d31to60.amount += amt;
    } else if (overdueDays <= 90) {
      buckets.d61to90.count += 1;
      buckets.d61to90.amount += amt;
    } else {
      buckets.over90.count += 1;
      buckets.over90.amount += amt;
    }
    buckets.totalOutstanding += amt;
  }
  for (const key of Object.keys(buckets)) {
    if (typeof buckets[key] === 'number') {
      buckets[key] = Math.round(buckets[key] * 100) / 100;
    } else {
      buckets[key].amount = Math.round(buckets[key].amount * 100) / 100;
    }
  }
  return buckets;
}

function topDebtors(invoices, n = 10) {
  const byBeneficiary = new Map();
  for (const inv of invoices) {
    if (!OUTSTANDING_STATUSES.has(inv.status)) continue;
    const key = inv.beneficiary ? String(inv.beneficiary) : null;
    if (!key) continue;
    if (!byBeneficiary.has(key)) {
      byBeneficiary.set(key, {
        beneficiary: key,
        invoiceCount: 0,
        outstandingAmount: 0,
        oldestInvoiceDate: null,
      });
    }
    const row = byBeneficiary.get(key);
    row.invoiceCount += 1;
    row.outstandingAmount += amount(inv);
    const issued = inv.issueDate ? new Date(inv.issueDate) : null;
    if (issued && (!row.oldestInvoiceDate || issued < row.oldestInvoiceDate)) {
      row.oldestInvoiceDate = issued;
    }
  }
  return [...byBeneficiary.values()]
    .map(r => ({
      ...r,
      outstandingAmount: Math.round(r.outstandingAmount * 100) / 100,
      oldestInvoiceDate: r.oldestInvoiceDate ? r.oldestInvoiceDate.toISOString() : null,
    }))
    .sort((a, b) => b.outstandingAmount - a.outstandingAmount)
    .slice(0, n);
}

function revenueByMonth(invoices) {
  const byMonth = new Map();
  for (const inv of invoices) {
    if (!inv.issueDate || inv.status === 'DRAFT' || inv.status === 'CANCELLED') continue;
    const key = new Date(inv.issueDate).toISOString().slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, { issued: 0, paid: 0, count: 0 });
    const row = byMonth.get(key);
    const amt = amount(inv);
    row.issued += amt;
    if (PAID_STATUSES.has(inv.status)) row.paid += amt;
    row.count += 1;
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([month, v]) => ({
      month,
      count: v.count,
      issued: Math.round(v.issued * 100) / 100,
      paid: Math.round(v.paid * 100) / 100,
      collectionRate: v.issued > 0 ? Math.round((v.paid / v.issued) * 1000) / 10 : null,
    }));
}

function detectOverdueAlarm(buckets) {
  const over = buckets?.over90?.amount || 0;
  const total = buckets?.totalOutstanding || 0;
  if (over < THRESHOLDS.overdueAlarmMinAmount) return false;
  if (total === 0) return false;
  const pct = (over / total) * 100;
  return pct >= THRESHOLDS.overdueAlarmPct;
}

module.exports = {
  THRESHOLDS,
  summarize,
  agingBuckets,
  topDebtors,
  revenueByMonth,
  detectOverdueAlarm,
};
