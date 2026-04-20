/**
 * incidentsAnalyticsService — pure math over Incident records.
 *
 * Healthcare accreditation (CBAHI) + patient safety demand visibility
 * into:
 *   • what happened (categories)
 *   • how bad (severity distribution)
 *   • how fast we respond (MTTR per severity)
 *   • why it keeps happening (root cause frequency)
 *   • are we trending worse (monthly rate)
 *   • regulatory exposure (incidents flagged for regulator)
 *
 * Functions:
 *   • summarize(incidents)         counts + per-severity + MTTR + regCount
 *   • bySeverity(incidents)        per-severity breakdown with MTTR
 *   • byCategory(incidents)        top categories with open backlog
 *   • rootCauseTopN(incidents, n)  top root causes from resolved records
 *   • openBacklog(incidents, now)  open-past-SLA list per severity
 *   • monthlyTrend(incidents)      monthly reported / resolved / MTTR
 *   • detectSurge(incidents, now)  MoM spike alarm on new reports
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
 * Resolution SLA per severity, in hours. CBAHI / JCI standards set
 * these as internal policy; tune via env when the policy evolves.
 */
const THRESHOLDS = {
  sla: {
    get CRITICAL() {
      return envInt('INCIDENT_SLA_CRITICAL_HOURS', 4);
    },
    get HIGH() {
      return envInt('INCIDENT_SLA_HIGH_HOURS', 24);
    },
    get MEDIUM() {
      return envInt('INCIDENT_SLA_MEDIUM_HOURS', 72);
    },
    get LOW() {
      return envInt('INCIDENT_SLA_LOW_HOURS', 168); // 7d
    },
  },
  get surgePct() {
    return envFloat('INCIDENT_SURGE_PCT', 50);
  },
  get surgeMinPrior() {
    return envInt('INCIDENT_SURGE_MIN_PRIOR', 3);
  },
};

const OPEN_STATUSES = new Set([
  'REPORTED',
  'ACKNOWLEDGED',
  'INVESTIGATING',
  'IDENTIFIED',
  'IN_RESOLUTION',
  'REOPENED',
]);
const RESOLVED_STATUSES = new Set(['RESOLVED', 'CLOSED']);

function reportedAt(inc) {
  return (
    inc?.discoveryInfo?.reportedAt || inc?.discoveryInfo?.discoveredAt || inc?.createdAt || null
  );
}

function resolvedAt(inc) {
  return inc?.resolution?.resolvedAt || inc?.resolvedAt || null;
}

function hoursBetween(a, b) {
  return Math.max(0, (new Date(b) - new Date(a)) / 3600000);
}

function regulatoryFlagged(inc) {
  // Model has `reguatoryImpact` (typo) + `regulatoryImpact` — accept both.
  return Boolean(inc?.impactAssessment?.regulatoryImpact || inc?.impactAssessment?.reguatoryImpact);
}

function summarize(incidents) {
  const stats = {
    total: incidents.length,
    open: 0,
    resolved: 0,
    regulatoryCount: 0,
    escalatedCount: 0,
    bySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    byStatus: {},
    avgTtrHours: null,
  };
  let totalHrs = 0;
  let ttrCount = 0;
  for (const i of incidents) {
    const s = i.status;
    stats.byStatus[s] = (stats.byStatus[s] || 0) + 1;
    if (OPEN_STATUSES.has(s)) stats.open += 1;
    if (RESOLVED_STATUSES.has(s)) stats.resolved += 1;
    if (i.severity && stats.bySeverity[i.severity] != null) stats.bySeverity[i.severity] += 1;
    if (i.isEscalated) stats.escalatedCount += 1;
    if (regulatoryFlagged(i)) stats.regulatoryCount += 1;
    const r = reportedAt(i);
    const v = resolvedAt(i);
    if (RESOLVED_STATUSES.has(s) && r && v) {
      totalHrs += hoursBetween(r, v);
      ttrCount += 1;
    }
  }
  if (ttrCount > 0) stats.avgTtrHours = Math.round((totalHrs / ttrCount) * 10) / 10;
  const settled = stats.resolved;
  stats.resolutionRate = stats.total > 0 ? Math.round((settled / stats.total) * 1000) / 10 : null;
  return stats;
}

function bySeverity(incidents) {
  const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const map = new Map();
  for (const sev of order) {
    map.set(sev, {
      severity: sev,
      total: 0,
      open: 0,
      resolved: 0,
      ttrSum: 0,
      ttrCount: 0,
      slaHours: THRESHOLDS.sla[sev],
    });
  }
  for (const i of incidents) {
    const row = map.get(i.severity);
    if (!row) continue;
    row.total += 1;
    if (OPEN_STATUSES.has(i.status)) row.open += 1;
    if (RESOLVED_STATUSES.has(i.status)) row.resolved += 1;
    const r = reportedAt(i);
    const v = resolvedAt(i);
    if (RESOLVED_STATUSES.has(i.status) && r && v) {
      row.ttrSum += hoursBetween(r, v);
      row.ttrCount += 1;
    }
  }
  return order.map(sev => {
    const r = map.get(sev);
    const avgTtrHours = r.ttrCount > 0 ? Math.round((r.ttrSum / r.ttrCount) * 10) / 10 : null;
    return {
      severity: r.severity,
      total: r.total,
      open: r.open,
      resolved: r.resolved,
      avgTtrHours,
      slaHours: r.slaHours,
      slaMet: avgTtrHours == null ? null : avgTtrHours <= r.slaHours,
    };
  });
}

function byCategory(incidents) {
  const map = new Map();
  for (const i of incidents) {
    const key = i.category || 'OTHER';
    if (!map.has(key)) {
      map.set(key, { category: key, total: 0, open: 0, critical: 0 });
    }
    const row = map.get(key);
    row.total += 1;
    if (OPEN_STATUSES.has(i.status)) row.open += 1;
    if (i.severity === 'CRITICAL') row.critical += 1;
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function rootCauseTopN(incidents, n = 10) {
  const map = new Map();
  for (const i of incidents) {
    const rc = (i.resolution?.rootCause || '').trim();
    if (!rc) continue;
    if (!map.has(rc)) map.set(rc, { rootCause: rc, count: 0, permanentFixes: 0 });
    const row = map.get(rc);
    row.count += 1;
    if (i.resolution?.permanentFix === true) row.permanentFixes += 1;
  }
  return [...map.values()]
    .map(r => ({
      ...r,
      permanentFixRate: r.count > 0 ? Math.round((r.permanentFixes / r.count) * 1000) / 10 : null,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

function openBacklog(incidents, now = new Date(), limit = 50) {
  const rows = [];
  for (const i of incidents) {
    if (!OPEN_STATUSES.has(i.status)) continue;
    const r = reportedAt(i);
    if (!r) continue;
    const ageHours = hoursBetween(r, now);
    const slaHours = THRESHOLDS.sla[i.severity] ?? null;
    const breachedBy = slaHours != null ? Math.round((ageHours - slaHours) * 10) / 10 : null;
    rows.push({
      _id: i._id,
      incidentNumber: i.incidentNumber,
      title: i.title,
      category: i.category,
      severity: i.severity,
      status: i.status,
      ageHours: Math.round(ageHours * 10) / 10,
      slaHours,
      breachedBy,
      overSla: breachedBy != null && breachedBy > 0,
    });
  }
  return rows
    .sort((a, b) => (b.breachedBy ?? -Infinity) - (a.breachedBy ?? -Infinity))
    .slice(0, limit);
}

function monthlyTrend(incidents) {
  const map = new Map();
  for (const i of incidents) {
    const r = reportedAt(i);
    if (!r) continue;
    const key = new Date(r).toISOString().slice(0, 7);
    if (!map.has(key)) {
      map.set(key, { month: key, reported: 0, resolved: 0, ttrSum: 0, ttrCount: 0 });
    }
    const row = map.get(key);
    row.reported += 1;
    const v = resolvedAt(i);
    if (RESOLVED_STATUSES.has(i.status)) {
      row.resolved += 1;
      if (v) {
        row.ttrSum += hoursBetween(r, v);
        row.ttrCount += 1;
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => (a.month < b.month ? -1 : 1))
    .map(r => ({
      month: r.month,
      reported: r.reported,
      resolved: r.resolved,
      resolutionRate: r.reported > 0 ? Math.round((r.resolved / r.reported) * 1000) / 10 : null,
      avgTtrHours: r.ttrCount > 0 ? Math.round((r.ttrSum / r.ttrCount) * 10) / 10 : null,
    }));
}

function detectSurge(incidents, now = new Date()) {
  const thisMonthStart = new Date(now);
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);
  const priorMonthStart = new Date(thisMonthStart);
  priorMonthStart.setMonth(priorMonthStart.getMonth() - 1);
  let current = 0;
  let prior = 0;
  for (const i of incidents) {
    const r = reportedAt(i);
    if (!r) continue;
    const t = new Date(r);
    if (t >= thisMonthStart && t <= now) current += 1;
    else if (t >= priorMonthStart && t < thisMonthStart) prior += 1;
  }
  if (prior < THRESHOLDS.surgeMinPrior) {
    return { active: false, reason: 'insufficient_prior_volume', current, prior };
  }
  const jumpPct = Math.round(((current - prior) / prior) * 1000) / 10;
  return {
    active: jumpPct >= THRESHOLDS.surgePct,
    current,
    prior,
    jumpPct,
    threshold: THRESHOLDS.surgePct,
  };
}

module.exports = {
  THRESHOLDS,
  summarize,
  bySeverity,
  byCategory,
  rootCauseTopN,
  openBacklog,
  monthlyTrend,
  detectSurge,
};
