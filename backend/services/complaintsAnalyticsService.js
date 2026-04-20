/**
 * complaintsAnalyticsService — pure math over Complaint records.
 *
 * Complaint CRUD already exists at /api/crm/complaints. What was
 * missing: the analytics layer telling management how well the
 * complaints pipeline is running — volumes, categories, resolution
 * times, SLA breaches, open backlog.
 *
 * Functions:
 *   • summarize(complaints)           counts + open/closed + avgResolutionHrs
 *   • byCategory(complaints)          per-category volume + resolution rate
 *   • bySubmitterType(complaints)     parent vs employee vs student etc.
 *   • monthlyTrend(complaints)        monthly volume + resolution rate
 *   • openBacklog(complaints, n)      oldest open complaints watchlist
 *   • slaBreaches(complaints)         per-priority SLA check
 *   • detectSpike(complaints)         alarm when monthly volume jumps
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

/**
 * SLA targets (hours to resolution) per priority. Industry-standard
 * tiers; env-overridable per priority so ops can tune without code
 * changes when the policy evolves.
 */
const THRESHOLDS = {
  sla: {
    get critical() {
      return envInt('COMPLAINT_SLA_CRITICAL_HOURS', 24);
    },
    get high() {
      return envInt('COMPLAINT_SLA_HIGH_HOURS', 72);
    },
    get medium() {
      return envInt('COMPLAINT_SLA_MEDIUM_HOURS', 168); // 7d
    },
    get low() {
      return envInt('COMPLAINT_SLA_LOW_HOURS', 336); // 14d
    },
  },
  // Days open past which a complaint joins the backlog watchlist.
  get backlogDays() {
    return envInt('COMPLAINT_BACKLOG_DAYS', 14);
  },
  // % spike (month-over-month) that trips the alarm.
  get spikePct() {
    return envFloat('COMPLAINT_SPIKE_PCT', 40);
  },
  // Minimum prior-month volume to avoid false alarms on tiny bases.
  get spikeMinPrior() {
    return envInt('COMPLAINT_SPIKE_MIN_PRIOR', 3);
  },
};

const OPEN_STATUSES = new Set(['new', 'under_review', 'in_progress', 'escalated']);
const RESOLVED_STATUSES = new Set(['resolved', 'closed']);

function hoursBetween(a, b) {
  return Math.max(0, (new Date(b) - new Date(a)) / 3600000);
}

function slaHoursFor(priority) {
  return THRESHOLDS.sla[priority] ?? null;
}

function summarize(complaints, now = new Date()) {
  const stats = {
    total: complaints.length,
    open: 0,
    resolved: 0,
    rejected: 0,
    byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
    byStatus: {
      new: 0,
      under_review: 0,
      in_progress: 0,
      escalated: 0,
      resolved: 0,
      closed: 0,
      rejected: 0,
    },
    avgResolutionHours: null,
  };
  let totalResolutionHours = 0;
  let resolutionCount = 0;
  for (const c of complaints) {
    const s = c.status;
    if (s in stats.byStatus) stats.byStatus[s] += 1;
    if (OPEN_STATUSES.has(s)) stats.open += 1;
    if (RESOLVED_STATUSES.has(s)) stats.resolved += 1;
    if (s === 'rejected') stats.rejected += 1;
    if (c.priority in stats.byPriority) stats.byPriority[c.priority] += 1;
    if (RESOLVED_STATUSES.has(s) && c.createdAt && c.resolvedAt) {
      totalResolutionHours += hoursBetween(c.createdAt, c.resolvedAt);
      resolutionCount += 1;
    }
  }
  if (resolutionCount > 0) {
    stats.avgResolutionHours = Math.round((totalResolutionHours / resolutionCount) * 10) / 10;
  }
  const settled = stats.resolved + stats.rejected;
  stats.resolutionRate = stats.total > 0 ? Math.round((settled / stats.total) * 1000) / 10 : null;
  return stats;
}

function byCategory(complaints) {
  const map = new Map();
  for (const c of complaints) {
    const key = (c.category || 'غير محدّد').trim();
    if (!map.has(key)) {
      map.set(key, {
        category: key,
        total: 0,
        open: 0,
        resolved: 0,
        critical: 0,
      });
    }
    const row = map.get(key);
    row.total += 1;
    if (OPEN_STATUSES.has(c.status)) row.open += 1;
    if (RESOLVED_STATUSES.has(c.status)) row.resolved += 1;
    if (c.priority === 'critical') row.critical += 1;
  }
  return [...map.values()]
    .map(row => ({
      ...row,
      resolutionRate: row.total > 0 ? Math.round((row.resolved / row.total) * 1000) / 10 : null,
    }))
    .sort((a, b) => b.total - a.total);
}

function bySubmitterType(complaints) {
  const map = new Map();
  for (const c of complaints) {
    const key = c.submitterType || 'other';
    if (!map.has(key)) map.set(key, { submitterType: key, total: 0, open: 0, resolved: 0 });
    const row = map.get(key);
    row.total += 1;
    if (OPEN_STATUSES.has(c.status)) row.open += 1;
    if (RESOLVED_STATUSES.has(c.status)) row.resolved += 1;
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function monthlyTrend(complaints) {
  const map = new Map();
  for (const c of complaints) {
    if (!c.createdAt) continue;
    const key = new Date(c.createdAt).toISOString().slice(0, 7);
    if (!map.has(key)) {
      map.set(key, {
        month: key,
        total: 0,
        resolved: 0,
        totalResolutionHrs: 0,
        resolvedWithTimes: 0,
      });
    }
    const row = map.get(key);
    row.total += 1;
    if (RESOLVED_STATUSES.has(c.status)) {
      row.resolved += 1;
      if (c.resolvedAt) {
        row.totalResolutionHrs += hoursBetween(c.createdAt, c.resolvedAt);
        row.resolvedWithTimes += 1;
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => (a.month < b.month ? -1 : 1))
    .map(r => ({
      month: r.month,
      total: r.total,
      resolved: r.resolved,
      resolutionRate: r.total > 0 ? Math.round((r.resolved / r.total) * 1000) / 10 : null,
      avgResolutionHours:
        r.resolvedWithTimes > 0
          ? Math.round((r.totalResolutionHrs / r.resolvedWithTimes) * 10) / 10
          : null,
    }));
}

function openBacklog(complaints, now = new Date(), n = 50) {
  const cutoffMs = now.getTime() - THRESHOLDS.backlogDays * 86400000;
  return complaints
    .filter(c => OPEN_STATUSES.has(c.status) && c.createdAt)
    .filter(c => new Date(c.createdAt).getTime() <= cutoffMs)
    .map(c => ({
      _id: c._id,
      complaintId: c.complaintId,
      subject: c.subject,
      category: c.category,
      priority: c.priority,
      status: c.status,
      submitterType: c.submitterType,
      daysOpen: Math.round((now - new Date(c.createdAt)) / 86400000),
      assignedTo: c.assignedTo ? String(c.assignedTo) : null,
    }))
    .sort((a, b) => b.daysOpen - a.daysOpen)
    .slice(0, n);
}

function slaBreaches(complaints, now = new Date()) {
  const rows = [];
  for (const c of complaints) {
    if (!c.createdAt) continue;
    const slaHours = slaHoursFor(c.priority);
    if (slaHours == null) continue;
    if (OPEN_STATUSES.has(c.status)) {
      const ageHours = hoursBetween(c.createdAt, now);
      if (ageHours > slaHours) {
        rows.push({
          _id: c._id,
          complaintId: c.complaintId,
          subject: c.subject,
          priority: c.priority,
          status: c.status,
          slaHours,
          ageHours: Math.round(ageHours * 10) / 10,
          breachedBy: Math.round((ageHours - slaHours) * 10) / 10,
        });
      }
    } else if (RESOLVED_STATUSES.has(c.status) && c.resolvedAt) {
      const resolvedHours = hoursBetween(c.createdAt, c.resolvedAt);
      if (resolvedHours > slaHours) {
        rows.push({
          _id: c._id,
          complaintId: c.complaintId,
          subject: c.subject,
          priority: c.priority,
          status: c.status,
          slaHours,
          resolvedInHours: Math.round(resolvedHours * 10) / 10,
          breachedBy: Math.round((resolvedHours - slaHours) * 10) / 10,
        });
      }
    }
  }
  return rows.sort((a, b) => b.breachedBy - a.breachedBy);
}

function detectSpike(complaints, now = new Date()) {
  const thisMonth = new Date(now);
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  const priorMonth = new Date(thisMonth);
  priorMonth.setMonth(priorMonth.getMonth() - 1);
  let current = 0;
  let prior = 0;
  for (const c of complaints) {
    if (!c.createdAt) continue;
    const d = new Date(c.createdAt);
    if (d >= thisMonth && d <= now) current += 1;
    else if (d >= priorMonth && d < thisMonth) prior += 1;
  }
  if (prior < THRESHOLDS.spikeMinPrior) {
    return { active: false, reason: 'insufficient_prior_volume', current, prior };
  }
  const jumpPct = Math.round(((current - prior) / prior) * 1000) / 10;
  return {
    active: jumpPct >= THRESHOLDS.spikePct,
    current,
    prior,
    jumpPct,
    threshold: THRESHOLDS.spikePct,
  };
}

module.exports = {
  THRESHOLDS,
  summarize,
  byCategory,
  bySubmitterType,
  monthlyTrend,
  openBacklog,
  slaBreaches,
  detectSpike,
};
