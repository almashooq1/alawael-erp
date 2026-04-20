/**
 * claimsAnalyticsService — pure math over NphiesClaim records.
 *
 * The NPHIES adapter already exists with mock/live modes, circuit
 * breakers, rate limits, and audit logs. What was missing: the
 * analytics surface that tells finance WHY claims are being rejected
 * and WHICH insurers have the worst approval rates.
 *
 * Functions:
 *   • summarize(claims)              counts + amounts + approvalRate
 *   • rejectionReasons(claims, n)    top rejection reasons by count
 *   • byInsurer(claims)              per-insurer volume + approval rate
 *   • monthlyTrend(claims)           submitted/approved/rejected by YYYY-MM
 *   • detectRejectionSpike(claims)   trips when recent rejection rate
 *                                    exceeds REJECTION_ALARM_PCT
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
  // Rolling rejection-rate % that trips the alarm.
  get rejectionAlarmPct() {
    return envFloat('CLAIMS_REJECTION_ALARM_PCT', 20);
  },
  // Window (days) the alarm looks at — recent rejection rate, not
  // lifetime. A clinic that had bad claims last year shouldn't page on-call.
  get alarmWindowDays() {
    return envInt('CLAIMS_ALARM_WINDOW_DAYS', 30);
  },
  // Minimum claim count inside the window before the alarm may fire —
  // a 2-claim sample with 50% rejection rate is not actionable.
  get alarmMinSample() {
    return envInt('CLAIMS_ALARM_MIN_SAMPLE', 10);
  },
};

const APPROVED_STATUSES = new Set(['APPROVED']);
const REJECTED_STATUSES = new Set(['REJECTED']);
const PENDING_STATUSES = new Set(['PENDING_REVIEW', 'NOT_SUBMITTED']);
const ERROR_STATUSES = new Set(['ERROR']);

function subStatus(claim) {
  return claim?.nphies?.submission?.status || 'NOT_SUBMITTED';
}

function amount(claim) {
  return Number(claim?.totalAmount || 0);
}

function summarize(claims) {
  const stats = {
    total: claims.length,
    submittedCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    pendingCount: 0,
    errorCount: 0,
    totalAmount: 0,
    approvedAmount: 0,
    rejectedAmount: 0,
    approvalRate: null,
  };
  for (const c of claims) {
    const s = subStatus(c);
    stats.totalAmount += amount(c);
    if (APPROVED_STATUSES.has(s)) {
      stats.approvedCount += 1;
      stats.approvedAmount += Number(c.approvedAmount ?? c.totalAmount ?? 0);
      stats.submittedCount += 1;
    } else if (REJECTED_STATUSES.has(s)) {
      stats.rejectedCount += 1;
      stats.rejectedAmount += amount(c);
      stats.submittedCount += 1;
    } else if (PENDING_STATUSES.has(s)) {
      stats.pendingCount += 1;
      if (s !== 'NOT_SUBMITTED') stats.submittedCount += 1;
    } else if (ERROR_STATUSES.has(s)) {
      stats.errorCount += 1;
      stats.submittedCount += 1;
    }
  }
  stats.totalAmount = Math.round(stats.totalAmount * 100) / 100;
  stats.approvedAmount = Math.round(stats.approvedAmount * 100) / 100;
  stats.rejectedAmount = Math.round(stats.rejectedAmount * 100) / 100;
  const settled = stats.approvedCount + stats.rejectedCount;
  stats.approvalRate = settled > 0 ? Math.round((stats.approvedCount / settled) * 1000) / 10 : null;
  return stats;
}

function rejectionReasons(claims, n = 10) {
  const byReason = new Map();
  for (const c of claims) {
    if (!REJECTED_STATUSES.has(subStatus(c))) continue;
    const reason = (c.nphies?.submission?.reason || 'غير محدّد').trim();
    if (!byReason.has(reason)) {
      byReason.set(reason, { reason, count: 0, amount: 0 });
    }
    const row = byReason.get(reason);
    row.count += 1;
    row.amount += amount(c);
  }
  return [...byReason.values()]
    .map(r => ({ ...r, amount: Math.round(r.amount * 100) / 100 }))
    .sort((a, b) => b.count - a.count || b.amount - a.amount)
    .slice(0, n);
}

function byInsurer(claims) {
  const byIns = new Map();
  for (const c of claims) {
    const key = (c.insurerName || c.insurerId || 'غير محدّد').trim();
    if (!byIns.has(key)) {
      byIns.set(key, {
        insurer: key,
        total: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
        totalAmount: 0,
        approvedAmount: 0,
      });
    }
    const row = byIns.get(key);
    row.total += 1;
    row.totalAmount += amount(c);
    const s = subStatus(c);
    if (APPROVED_STATUSES.has(s)) {
      row.approved += 1;
      row.approvedAmount += Number(c.approvedAmount ?? c.totalAmount ?? 0);
    } else if (REJECTED_STATUSES.has(s)) {
      row.rejected += 1;
    } else if (PENDING_STATUSES.has(s)) {
      row.pending += 1;
    }
  }
  return [...byIns.values()]
    .map(row => {
      const settled = row.approved + row.rejected;
      return {
        ...row,
        totalAmount: Math.round(row.totalAmount * 100) / 100,
        approvedAmount: Math.round(row.approvedAmount * 100) / 100,
        approvalRate: settled > 0 ? Math.round((row.approved / settled) * 1000) / 10 : null,
      };
    })
    .sort((a, b) => b.total - a.total);
}

function monthlyTrend(claims) {
  const byMonth = new Map();
  for (const c of claims) {
    if (!c.serviceDate) continue;
    const key = new Date(c.serviceDate).toISOString().slice(0, 7);
    if (!byMonth.has(key)) {
      byMonth.set(key, { submitted: 0, approved: 0, rejected: 0, amount: 0 });
    }
    const row = byMonth.get(key);
    const s = subStatus(c);
    if (s !== 'NOT_SUBMITTED') row.submitted += 1;
    if (APPROVED_STATUSES.has(s)) row.approved += 1;
    if (REJECTED_STATUSES.has(s)) row.rejected += 1;
    row.amount += amount(c);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([month, v]) => {
      const settled = v.approved + v.rejected;
      return {
        month,
        ...v,
        amount: Math.round(v.amount * 100) / 100,
        approvalRate: settled > 0 ? Math.round((v.approved / settled) * 1000) / 10 : null,
      };
    });
}

function detectRejectionSpike(claims, now = new Date()) {
  const cutoff = new Date(now.getTime() - THRESHOLDS.alarmWindowDays * 86400000);
  const recent = claims.filter(c => c.serviceDate && new Date(c.serviceDate) >= cutoff);
  let approved = 0;
  let rejected = 0;
  for (const c of recent) {
    const s = subStatus(c);
    if (APPROVED_STATUSES.has(s)) approved += 1;
    if (REJECTED_STATUSES.has(s)) rejected += 1;
  }
  const settled = approved + rejected;
  if (settled < THRESHOLDS.alarmMinSample) return { active: false, settled, rejectionRate: null };
  const rate = Math.round((rejected / settled) * 1000) / 10;
  return {
    active: rate >= THRESHOLDS.rejectionAlarmPct,
    settled,
    rejectionRate: rate,
    windowDays: THRESHOLDS.alarmWindowDays,
    threshold: THRESHOLDS.rejectionAlarmPct,
  };
}

module.exports = {
  THRESHOLDS,
  summarize,
  rejectionReasons,
  byInsurer,
  monthlyTrend,
  detectRejectionSpike,
};
