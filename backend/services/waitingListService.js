/**
 * waitingListService — pure math over WaitingListEntry records.
 *
 * Functions:
 *   • summarize(entries)              counts + avg wait + oldest waiter
 *   • prioritize(waiters)             sort by priority, then requestedAt
 *   • estimateWaitDays(historical)    median days waiting→enrolled from
 *                                     past resolved entries
 *   • detectStale(waiters, asOf?)     waiting > STALE_DAYS (default 60)
 *   • groupByServiceType(entries)     per-line breakdown
 */

'use strict';

function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

const THRESHOLDS = {
  // Days waiting before it's "stale" — needs a status check with the family.
  get staleDays() {
    return envInt('WAITLIST_STALE_DAYS', 60);
  },
  // Days after offer before auto-lapsing (for UI reminders; actual lapse
  // is a business decision, not auto-done here).
  get offerWindowDays() {
    return envInt('WAITLIST_OFFER_DAYS', 7);
  },
};

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function summarize(entries, now = new Date()) {
  const stats = {
    total: entries.length,
    waiting: 0,
    offered: 0,
    enrolled: 0,
    withdrawn: 0,
    lapsed: 0,
    avgWaitDays: null,
    oldestWaiterDays: null,
  };
  const waitingDays = [];
  for (const e of entries) {
    const s = e.status;
    if (s in stats) stats[s] += 1;
    if (s === 'waiting' && e.requestedAt) {
      const d = daysBetween(e.requestedAt, now);
      waitingDays.push(d);
    }
  }
  if (waitingDays.length > 0) {
    stats.avgWaitDays =
      Math.round((waitingDays.reduce((a, b) => a + b, 0) / waitingDays.length) * 10) / 10;
    stats.oldestWaiterDays = Math.max(...waitingDays);
  }
  return stats;
}

function prioritize(waiters) {
  return [...waiters].sort((a, b) => {
    // Lower priority number = higher urgency.
    const pa = a.priority ?? 3;
    const pb = b.priority ?? 3;
    if (pa !== pb) return pa - pb;
    return new Date(a.requestedAt) - new Date(b.requestedAt);
  });
}

/**
 * Median wait duration from resolved (enrolled) historical entries.
 * Returns null if sample is empty.
 */
function estimateWaitDays(historicalEntries) {
  const waits = historicalEntries
    .filter(e => e.status === 'enrolled' && e.requestedAt && e.resolvedAt)
    .map(e => daysBetween(e.requestedAt, e.resolvedAt))
    .sort((a, b) => a - b);
  if (waits.length === 0) return null;
  const mid = Math.floor(waits.length / 2);
  return waits.length % 2 === 0
    ? Math.round(((waits[mid - 1] + waits[mid]) / 2) * 10) / 10
    : waits[mid];
}

function detectStale(waiters, now = new Date()) {
  const cutoff = new Date(now.getTime() - THRESHOLDS.staleDays * 86400000);
  return waiters
    .filter(e => e.status === 'waiting' && new Date(e.requestedAt) <= cutoff)
    .map(e => ({
      _id: e._id,
      beneficiaryId: e.beneficiaryId ? String(e.beneficiaryId) : null,
      guardianId: e.guardianId ? String(e.guardianId) : null,
      prospectName: e.prospectName,
      serviceType: e.serviceType,
      priority: e.priority,
      daysWaiting: daysBetween(e.requestedAt, now),
    }))
    .sort((a, b) => b.daysWaiting - a.daysWaiting);
}

function groupByServiceType(entries) {
  const byType = {};
  for (const e of entries) {
    const t = e.serviceType || 'other';
    if (!byType[t]) byType[t] = { total: 0, waiting: 0, offered: 0, enrolled: 0 };
    byType[t].total += 1;
    if (e.status in byType[t]) byType[t][e.status] += 1;
  }
  return byType;
}

module.exports = {
  THRESHOLDS,
  summarize,
  prioritize,
  estimateWaitDays,
  detectStale,
  groupByServiceType,
};
