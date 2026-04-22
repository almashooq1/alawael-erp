/**
 * crmReportBuilder.js — real builders for the 2 CRM reports:
 *   - crm.parent.engagement.monthly → buildParentEngagement
 *   - crm.complaints.weekly         → buildComplaintsDigest
 *
 * Phase 10 Commit 7g.
 *
 * Data sources:
 *   - Complaint (models/Complaint.js) — status enum: new |
 *     under_review | in_progress | escalated | resolved | closed |
 *     rejected; priority: critical/high/medium/low; category: 8 enum
 *     values; resolvedAt, createdAt.
 *   - ReportDelivery (models/ReportDelivery.js, Phase 10 C1) — filter
 *     recipientRole='guardian' + read/unread to measure engagement.
 *     Falls back to "0 / null" when the ReportDelivery model isn't
 *     injected (e.g. very early boot before the reporting stack is up).
 */

'use strict';

const { parsePeriodKey, parseScopeKey } = require('./periodKey');

const COMPLAINT_CLOSED_STATUSES = ['resolved', 'closed', 'rejected'];
const COMPLAINT_ACTIVE_STATUSES = ['new', 'under_review', 'in_progress', 'escalated'];
const COMPLAINT_PRIORITIES = ['critical', 'high', 'medium', 'low'];

async function findRows(Model, filter) {
  if (!Model) return [];
  try {
    return (await Model.find(filter)) || [];
  } catch (_) {
    return [];
  }
}

async function countDocs(Model, filter) {
  if (!Model) return 0;
  try {
    if (typeof Model.countDocuments === 'function') {
      return (await Model.countDocuments(filter)) || 0;
    }
    const rows = await Model.find(filter);
    return Array.isArray(rows) ? rows.length : 0;
  } catch (_) {
    return 0;
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
  return ms / 3600000;
}

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

// ─── buildComplaintsDigest (weekly) ──────────────────────────────

function rollupComplaints(rows) {
  const byStatus = {};
  const byPriority = { critical: 0, high: 0, medium: 0, low: 0 };
  const byCategory = {};
  let active = 0;
  let closed = 0;
  let critical = 0;
  const resolutionHours = [];
  for (const c of rows || []) {
    if (!c) continue;
    const s = c.status || 'unknown';
    byStatus[s] = (byStatus[s] || 0) + 1;
    if (COMPLAINT_ACTIVE_STATUSES.includes(s)) active += 1;
    if (COMPLAINT_CLOSED_STATUSES.includes(s)) closed += 1;
    const p = c.priority || 'low';
    if (byPriority[p] != null) byPriority[p] += 1;
    if (p === 'critical') critical += 1;
    const cat = c.category || 'other';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
    if (c.resolvedAt && c.createdAt) {
      const h = hoursBetween(c.createdAt, c.resolvedAt);
      if (h != null && h >= 0) resolutionHours.push(h);
    }
  }
  return {
    total: (rows || []).length,
    active,
    closed,
    critical,
    byStatus,
    byPriority,
    byCategory,
    avgResolutionHours: resolutionHours.length
      ? Math.round((resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length) * 10) / 10
      : null,
  };
}

async function buildComplaintsDigest({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = baseResult(report, 'crm.complaints.weekly', periodKey, scopeKey, range);
  Object.assign(result, {
    totals: { total: 0, active: 0, closed: 0, critical: 0 },
    byStatus: {},
    byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
    byCategory: {},
    avgResolutionHours: null,
    resolutionRate: null,
  });
  if (!range) return degradeOnBadPeriod(result, periodKey);

  const branchId = scope && scope.type === 'branch' ? scope.id : null;
  const Complaint = ctx.models && (ctx.models.Complaint?.model || ctx.models.Complaint);
  const filter = { createdAt: { $gte: range.start, $lt: range.end } };
  if (branchId) filter.branchId = branchId;
  const rows = await findRows(Complaint, filter);
  const roll = rollupComplaints(rows);
  result.totals = {
    total: roll.total,
    active: roll.active,
    closed: roll.closed,
    critical: roll.critical,
  };
  result.byStatus = roll.byStatus;
  result.byPriority = roll.byPriority;
  result.byCategory = roll.byCategory;
  result.avgResolutionHours = roll.avgResolutionHours;
  result.resolutionRate = pct(roll.closed, roll.total);
  result.branch = await loadBranch(ctx, scope);

  result.summary.items = [
    `Complaints this week: ${roll.total}`,
    `Active: ${roll.active}; Closed: ${roll.closed}; Critical: ${roll.critical}`,
    roll.avgResolutionHours != null ? `Avg resolution: ${roll.avgResolutionHours} h` : null,
    result.resolutionRate != null ? `Resolution rate: ${formatPct(result.resolutionRate)}` : null,
  ].filter(Boolean);
  result.summary.headlineMetric = roll.total
    ? { label: 'active complaints', value: String(roll.active) }
    : null;
  return result;
}

// ─── buildParentEngagement (monthly) ──────────────────────────────
//
// Proxy: read rate of guardian-targeted report deliveries in the
// period. The ReportDelivery ledger already distinguishes read /
// unread / failed, so we don't need a separate engagement event
// stream.

function rollupEngagement(rows) {
  let delivered = 0;
  let read = 0;
  let failed = 0;
  let escalated = 0;
  const byChannel = {};
  const perRecipient = new Map();
  for (const d of rows || []) {
    if (!d) continue;
    const st = d.status;
    if (['SENT', 'DELIVERED', 'READ'].includes(st)) delivered += 1;
    if (st === 'READ') read += 1;
    if (st === 'FAILED') failed += 1;
    if (st === 'ESCALATED') escalated += 1;
    if (d.channel) byChannel[d.channel] = (byChannel[d.channel] || 0) + 1;
    const k = d.recipientId ? String(d.recipientId) : null;
    if (k) {
      const node = perRecipient.get(k) || { recipientId: k, delivered: 0, read: 0 };
      if (['SENT', 'DELIVERED', 'READ'].includes(st)) node.delivered += 1;
      if (st === 'READ') node.read += 1;
      perRecipient.set(k, node);
    }
  }
  return {
    total: (rows || []).length,
    delivered,
    read,
    failed,
    escalated,
    byChannel,
    uniqueRecipients: perRecipient.size,
    engagedRecipients: [...perRecipient.values()].filter(n => n.read > 0).length,
  };
}

async function buildParentEngagement({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = baseResult(report, 'crm.parent.engagement.monthly', periodKey, scopeKey, range);
  Object.assign(result, {
    totals: {
      deliveries: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      uniqueRecipients: 0,
      engagedRecipients: 0,
    },
    readRate: null,
    engagementRate: null,
    byChannel: {},
  });
  if (!range) return degradeOnBadPeriod(result, periodKey);

  const branchId = scope && scope.type === 'branch' ? scope.id : null;
  const ReportDelivery =
    ctx.models && (ctx.models.ReportDelivery?.model || ctx.models.ReportDelivery);
  const filter = {
    recipientRole: 'guardian',
    createdAt: { $gte: range.start, $lt: range.end },
  };
  if (branchId) filter.branchId = branchId;
  const rows = await findRows(ReportDelivery, filter);
  const roll = rollupEngagement(rows);

  result.totals = {
    deliveries: roll.total,
    delivered: roll.delivered,
    read: roll.read,
    failed: roll.failed,
    uniqueRecipients: roll.uniqueRecipients,
    engagedRecipients: roll.engagedRecipients,
  };
  result.readRate = pct(roll.read, roll.delivered);
  result.engagementRate = pct(roll.engagedRecipients, roll.uniqueRecipients);
  result.byChannel = roll.byChannel;
  result.branch = await loadBranch(ctx, scope);

  result.summary.items = [
    `Deliveries to guardians: ${roll.total}`,
    `Read: ${roll.read}; Failed: ${roll.failed}`,
    result.readRate != null ? `Read rate: ${formatPct(result.readRate)}` : null,
    result.engagementRate != null
      ? `Recipients engaged: ${roll.engagedRecipients}/${roll.uniqueRecipients} (${formatPct(result.engagementRate)})`
      : null,
  ].filter(Boolean);
  result.summary.headlineMetric =
    result.engagementRate != null
      ? { label: 'engagement rate', value: formatPct(result.engagementRate) }
      : null;
  return result;
}

module.exports = {
  buildParentEngagement,
  buildComplaintsDigest,
  // Exposed for tests:
  rollupComplaints,
  rollupEngagement,
  COMPLAINT_CLOSED_STATUSES,
  COMPLAINT_ACTIVE_STATUSES,
  COMPLAINT_PRIORITIES,
};
