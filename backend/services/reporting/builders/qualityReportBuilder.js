/**
 * qualityReportBuilder.js — real builders for the 4 quality reports:
 *   - quality.incidents.weekly            → buildIncidentsDigest
 *   - quality.incidents.monthly           → buildIncidentsPack
 *   - quality.cbahi.evidence.quarterly    → buildCbahiEvidence
 *   - quality.red_flags.daily             → buildRedFlagsDigest
 *
 * Phase 10 Commit 7e.
 *
 * Two data sources:
 *
 *   - Incident model (models/quality/Incident.model.js) — 9 type enums,
 *     5 severity enums, 4 category enums, 6 status enums. Key dates:
 *     `occurredAt`, `createdAt`, `closedAt`.
 *   - RedFlagState model (models/RedFlagState.js) — active/cooldown
 *     discriminated by `status`; `severity`, `domain`, `raisedAt`.
 *
 * All four builders share the same branch-scope + periodKey grammar
 * and emit the same `{ summary: {items, headlineMetric} }` contract,
 * so the generic HTML template renders them all consistently.
 */

'use strict';

const { parsePeriodKey, parseScopeKey } = require('./periodKey');

const INCIDENT_SEVERITY_ORDER = ['catastrophic', 'major', 'moderate', 'minor', 'insignificant'];
const INCIDENT_OPEN_STATUSES = [
  'reported',
  'investigating',
  'rca_in_progress',
  'action_plan',
  'monitoring',
];
const RED_FLAG_SEVERITY_ORDER = ['critical', 'warning', 'info'];

// ─── Shared helpers ──────────────────────────────────────────────

async function listIncidents(
  Model,
  { start, end, branchId, dateField = 'occurredAt', extra } = {}
) {
  if (!Model) return [];
  const filter = {};
  if (start || end) {
    filter[dateField] = {};
    if (start) filter[dateField].$gte = start;
    if (end) filter[dateField].$lt = end;
  }
  if (branchId) filter.branchId = branchId;
  if (extra) Object.assign(filter, extra);
  try {
    return (await Model.find(filter)) || [];
  } catch (_) {
    return [];
  }
}

async function listActiveFlags(Model, { branchId } = {}) {
  if (!Model) return [];
  const filter = { status: 'active' };
  if (branchId) filter.branchId = branchId;
  try {
    return (await Model.find(filter)) || [];
  } catch (_) {
    return [];
  }
}

async function loadBranch(ctx, scope) {
  if (!scope || scope.type !== 'branch') return null;
  if (typeof ctx.loadBranch === 'function') {
    try {
      return (await ctx.loadBranch(scope.id)) || { id: scope.id };
    } catch (_) {
      return { id: scope.id };
    }
  }
  const Branch = ctx.models && (ctx.models.Branch?.model || ctx.models.Branch);
  if (!Branch || typeof Branch.findById !== 'function') return { id: scope.id };
  try {
    const b = await Branch.findById(scope.id);
    return b ? { id: String(b._id || b.id || scope.id), name: b.name || null } : { id: scope.id };
  } catch (_) {
    return { id: scope.id };
  }
}

function pct(num, den) {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
  return num / den;
}

function formatPct(x) {
  if (x == null || !Number.isFinite(x)) return '—';
  return `${Math.round(x * 1000) / 10}%`;
}

function hoursBetween(a, b) {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.round((ms / 3600000) * 10) / 10;
}

function newObj() {
  return Object.create(null);
}

function bumpKey(obj, key) {
  obj[key] = (obj[key] || 0) + 1;
}

// ─── Rollups (pure) ──────────────────────────────────────────────

function rollupIncidents(rows) {
  const bySeverity = newObj();
  const byCategory = newObj();
  const byType = newObj();
  const byStatus = newObj();
  let open = 0;
  let closed = 0;
  let reportedToMoh = 0;
  let rcaDone = 0;
  const mttrHours = [];
  for (const r of rows || []) {
    if (!r) continue;
    bumpKey(bySeverity, r.severity || 'unknown');
    bumpKey(byCategory, r.category || 'unknown');
    bumpKey(byType, r.type || 'unknown');
    bumpKey(byStatus, r.status || 'unknown');
    if (r.status === 'closed') closed += 1;
    else if (INCIDENT_OPEN_STATUSES.includes(r.status)) open += 1;
    if (r.reportedToMoh) reportedToMoh += 1;
    if (r.rootCause || (r.rcaDetails && Object.keys(r.rcaDetails).length)) rcaDone += 1;
    if (r.status === 'closed' && r.closedAt && r.occurredAt) {
      const h = hoursBetween(r.occurredAt, r.closedAt);
      if (h != null && h >= 0) mttrHours.push(h);
    }
  }
  const total = (rows || []).length;
  const mttr = mttrHours.length
    ? Math.round((mttrHours.reduce((a, b) => a + b, 0) / mttrHours.length) * 10) / 10
    : null;
  return {
    total,
    open,
    closed,
    reportedToMoh,
    rcaDone,
    bySeverity,
    byCategory,
    byType,
    byStatus,
    mttrHours: mttr,
  };
}

function countOverdueActions(rows) {
  let overdue = 0;
  for (const r of rows || []) {
    const all = [...(r.correctiveActions || []), ...(r.preventiveActions || [])];
    for (const a of all) {
      if (
        a &&
        (a.status === 'overdue' ||
          (a.deadline && new Date(a.deadline) < new Date() && a.status !== 'completed'))
      ) {
        overdue += 1;
      }
    }
  }
  return overdue;
}

function rollupFlags(rows) {
  const bySeverity = newObj();
  const byDomain = newObj();
  const byFlagId = newObj();
  let critical = 0;
  let blocking = 0;
  for (const r of rows || []) {
    if (!r) continue;
    const sev = r.severity || 'unknown';
    bumpKey(bySeverity, sev);
    bumpKey(byDomain, r.domain || 'unknown');
    bumpKey(byFlagId, r.flagId || 'unknown');
    if (sev === 'critical') critical += 1;
    if (r.blocking === true) blocking += 1;
  }
  return {
    total: (rows || []).length,
    critical,
    blocking,
    bySeverity,
    byDomain,
    topFlags: Object.entries(byFlagId)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([flagId, count]) => ({ flagId, count })),
  };
}

function topEntries(obj, n = 3) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

// ─── Scaffolding ─────────────────────────────────────────────────

function baseResult(report, fallbackId, periodKey, scopeKey, range) {
  return {
    reportType: (report && report.id) || fallbackId,
    periodKey,
    scopeKey: scopeKey || null,
    generatedAt: new Date().toISOString(),
    range: range ? { start: range.start.toISOString(), end: range.end.toISOString() } : null,
    branch: null,
    summary: { items: [], headlineMetric: null },
  };
}

function degradeOnBadPeriod(result, periodKey) {
  result.summary.items.push(`Unrecognised periodKey '${periodKey}' — report built empty.`);
  return result;
}

// ─── 1. buildIncidentsDigest (weekly) ─────────────────────────────

async function buildIncidentsDigest({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = baseResult(report, 'quality.incidents.weekly', periodKey, scopeKey, range);
  Object.assign(result, {
    totals: { total: 0, open: 0, closed: 0, reportedToMoh: 0 },
    bySeverity: {},
    byCategory: {},
    byType: {},
    mttrHours: null,
  });
  if (!range) return degradeOnBadPeriod(result, periodKey);

  const branchId = scope && scope.type === 'branch' ? scope.id : null;
  const Incident = ctx.models && (ctx.models.Incident?.model || ctx.models.Incident);
  const rows = await listIncidents(Incident, {
    start: range.start,
    end: range.end,
    branchId,
    dateField: 'occurredAt',
  });
  const roll = rollupIncidents(rows);
  result.totals = {
    total: roll.total,
    open: roll.open,
    closed: roll.closed,
    reportedToMoh: roll.reportedToMoh,
  };
  result.bySeverity = roll.bySeverity;
  result.byCategory = roll.byCategory;
  result.byType = roll.byType;
  result.mttrHours = roll.mttrHours;
  result.branch = await loadBranch(ctx, scope);

  const topSev = topEntries(roll.bySeverity)
    .map(([k, n]) => `${k}=${n}`)
    .join(', ');
  result.summary.items = [
    `Incidents this week: ${roll.total}`,
    `Open: ${roll.open}; Closed: ${roll.closed}`,
    topSev ? `By severity: ${topSev}` : null,
    roll.mttrHours != null ? `MTTR (closed): ${roll.mttrHours} h` : null,
    roll.reportedToMoh ? `Reported to MoH: ${roll.reportedToMoh}` : null,
  ].filter(Boolean);
  result.summary.headlineMetric = roll.total
    ? { label: 'open incidents', value: String(roll.open) }
    : null;
  return result;
}

// ─── 2. buildIncidentsPack (monthly) ─────────────────────────────

async function buildIncidentsPack({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = baseResult(report, 'quality.incidents.monthly', periodKey, scopeKey, range);
  Object.assign(result, {
    totals: { total: 0, open: 0, closed: 0, reportedToMoh: 0, rcaDone: 0, overdueActions: 0 },
    bySeverity: {},
    byCategory: {},
    byType: {},
    byStatus: {},
    topIncidents: [],
    mttrHours: null,
    rcaCompletionRate: null,
  });
  if (!range) return degradeOnBadPeriod(result, periodKey);

  const branchId = scope && scope.type === 'branch' ? scope.id : null;
  const Incident = ctx.models && (ctx.models.Incident?.model || ctx.models.Incident);
  const rows = await listIncidents(Incident, {
    start: range.start,
    end: range.end,
    branchId,
    dateField: 'occurredAt',
  });
  const roll = rollupIncidents(rows);
  const overdue = countOverdueActions(rows);
  result.totals = {
    total: roll.total,
    open: roll.open,
    closed: roll.closed,
    reportedToMoh: roll.reportedToMoh,
    rcaDone: roll.rcaDone,
    overdueActions: overdue,
  };
  result.bySeverity = roll.bySeverity;
  result.byCategory = roll.byCategory;
  result.byType = roll.byType;
  result.byStatus = roll.byStatus;
  result.mttrHours = roll.mttrHours;
  result.rcaCompletionRate = pct(roll.rcaDone, roll.total);

  // Top incidents: highest severity first, then most recent.
  const severityIdx = INCIDENT_SEVERITY_ORDER.reduce(
    (acc, s, i) => Object.assign(acc, { [s]: i }),
    {}
  );
  result.topIncidents = (rows || [])
    .slice()
    .sort((a, b) => {
      const sa = severityIdx[a.severity] ?? 99;
      const sb = severityIdx[b.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return new Date(b.occurredAt || 0) - new Date(a.occurredAt || 0);
    })
    .slice(0, 10)
    .map(r => ({
      incidentNumber: r.incidentNumber || null,
      severity: r.severity,
      category: r.category,
      type: r.type,
      status: r.status,
      occurredAt: r.occurredAt,
      location: r.location,
    }));

  result.branch = await loadBranch(ctx, scope);

  result.summary.items = [
    `Incidents this month: ${roll.total} (open: ${roll.open}; closed: ${roll.closed})`,
    `RCA completion: ${formatPct(result.rcaCompletionRate)}`,
    overdue ? `Overdue corrective/preventive actions: ${overdue}` : null,
    roll.mttrHours != null ? `MTTR (closed): ${roll.mttrHours} h` : null,
  ].filter(Boolean);
  result.summary.headlineMetric = roll.total
    ? { label: 'open incidents', value: String(roll.open) }
    : null;
  return result;
}

// ─── 3. buildCbahiEvidence (quarterly) ────────────────────────────

async function buildCbahiEvidence({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = baseResult(report, 'quality.cbahi.evidence.quarterly', periodKey, scopeKey, range);
  Object.assign(result, {
    totals: {
      incidents: 0,
      patientSafety: 0,
      staffSafety: 0,
      catastrophicOrMajor: 0,
      reportedToMoh: 0,
      rcaDone: 0,
    },
    bySeverity: {},
    byCategory: {},
    byType: {},
    rcaCompletionRate: null,
    mohReportingRate: null,
    evidenceCompleteness: null,
  });
  if (!range) return degradeOnBadPeriod(result, periodKey);

  const branchId = scope && scope.type === 'branch' ? scope.id : null;
  const Incident = ctx.models && (ctx.models.Incident?.model || ctx.models.Incident);
  const rows = await listIncidents(Incident, {
    start: range.start,
    end: range.end,
    branchId,
    dateField: 'occurredAt',
  });
  const roll = rollupIncidents(rows);
  const patientSafety = roll.byCategory.patient_safety || 0;
  const staffSafety = roll.byCategory.staff_safety || 0;
  const catastrophicOrMajor = (roll.bySeverity.catastrophic || 0) + (roll.bySeverity.major || 0);

  result.totals = {
    incidents: roll.total,
    patientSafety,
    staffSafety,
    catastrophicOrMajor,
    reportedToMoh: roll.reportedToMoh,
    rcaDone: roll.rcaDone,
  };
  result.bySeverity = roll.bySeverity;
  result.byCategory = roll.byCategory;
  result.byType = roll.byType;
  result.rcaCompletionRate = pct(roll.rcaDone, roll.total);
  // MoH reporting is mandatory for catastrophic/major incidents.
  result.mohReportingRate = pct(roll.reportedToMoh, catastrophicOrMajor);
  // Evidence-pack completeness: RCA coverage × MoH reporting coverage.
  if (result.rcaCompletionRate != null && result.mohReportingRate != null) {
    result.evidenceCompleteness =
      Math.round(result.rcaCompletionRate * result.mohReportingRate * 1000) / 1000;
  } else {
    result.evidenceCompleteness = result.rcaCompletionRate;
  }

  result.branch = await loadBranch(ctx, scope);

  result.summary.items = [
    `Quarter incidents: ${roll.total}`,
    `Patient safety: ${patientSafety}; Staff safety: ${staffSafety}`,
    `Catastrophic/Major: ${catastrophicOrMajor}; Reported to MoH: ${roll.reportedToMoh}`,
    `RCA completion: ${formatPct(result.rcaCompletionRate)}`,
    result.mohReportingRate != null
      ? `MoH reporting on Cat/Maj: ${formatPct(result.mohReportingRate)}`
      : null,
  ].filter(Boolean);
  result.summary.headlineMetric = {
    label: 'evidence completeness',
    value: formatPct(result.evidenceCompleteness),
  };
  return result;
}

// ─── 4. buildRedFlagsDigest (daily) ──────────────────────────────

async function buildRedFlagsDigest({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = baseResult(report, 'quality.red_flags.daily', periodKey, scopeKey, range);
  Object.assign(result, {
    totals: { active: 0, critical: 0, blocking: 0, raisedToday: 0 },
    bySeverity: {},
    byDomain: {},
    topFlags: [],
  });
  if (!range) return degradeOnBadPeriod(result, periodKey);

  const branchId = scope && scope.type === 'branch' ? scope.id : null;
  const RedFlagState = ctx.models && (ctx.models.RedFlagState?.model || ctx.models.RedFlagState);
  const active = await listActiveFlags(RedFlagState, { branchId });
  const roll = rollupFlags(active);
  const raisedToday = (active || []).filter(
    f => f.raisedAt && new Date(f.raisedAt) >= range.start && new Date(f.raisedAt) < range.end
  ).length;
  result.totals = {
    active: roll.total,
    critical: roll.critical,
    blocking: roll.blocking,
    raisedToday,
  };
  // Sort severity buckets in canonical order for the UI.
  const bySev = {};
  for (const sev of RED_FLAG_SEVERITY_ORDER) bySev[sev] = roll.bySeverity[sev] || 0;
  result.bySeverity = bySev;
  result.byDomain = roll.byDomain;
  result.topFlags = roll.topFlags;

  result.branch = await loadBranch(ctx, scope);

  result.summary.items = [
    `Active flags: ${roll.total} (critical ${roll.critical}; blocking ${roll.blocking})`,
    `Raised in period: ${raisedToday}`,
    roll.topFlags.length
      ? `Top: ${roll.topFlags.map(f => `${f.flagId}=${f.count}`).join(', ')}`
      : null,
  ].filter(Boolean);
  result.summary.headlineMetric = roll.total
    ? { label: 'critical flags active', value: String(roll.critical) }
    : null;
  return result;
}

module.exports = {
  buildIncidentsDigest,
  buildIncidentsPack,
  buildCbahiEvidence,
  buildRedFlagsDigest,
  // Exposed for tests:
  rollupIncidents,
  rollupFlags,
  countOverdueActions,
  hoursBetween,
  INCIDENT_SEVERITY_ORDER,
  INCIDENT_OPEN_STATUSES,
  RED_FLAG_SEVERITY_ORDER,
};
