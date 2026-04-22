/**
 * therapistReportBuilder.js — real builders for
 *   - `therapist.productivity.weekly` → buildProductivity
 *   - `therapist.caseload.monthly`    → buildCaseload
 *
 * Phase 10 Commit 7c.
 *
 * Both read from TherapySession (date-range query), group by therapist,
 * and emit a leaderboard-ish structure. Productivity focuses on session
 * counts + completion rate per therapist; caseload focuses on unique-
 * beneficiary distribution.
 *
 * Shared helpers live in `./builders/_sessionGroup.js` so the branch
 * and fleet builders can clone the pattern without duplicating logic.
 * We keep them inline here in this commit (they're small) and refactor
 * to a shared module only if a third consumer appears.
 *
 * Output shapes:
 *
 *   buildProductivity(...) →
 *   {
 *     reportType, periodKey, scopeKey, generatedAt, range,
 *     branch: { id, name? } | null,
 *     byTherapist: Array<{
 *       therapistId, name?, total,
 *       completed, noShow, cancelledByPatient, cancelledByCenter,
 *       completionRate, noShowRate,
 *     }> (sorted by completed desc),
 *     totals: { therapists, sessions, completed },
 *     summary: { items, headlineMetric },
 *   }
 *
 *   buildCaseload(...) →
 *   {
 *     reportType, periodKey, scopeKey, generatedAt, range,
 *     branch: { id, name? } | null,
 *     byTherapist: Array<{
 *       therapistId, name?, beneficiaries: number,
 *       sessions: number, avgSessionsPerBeneficiary: number,
 *     }> (sorted by beneficiaries desc),
 *     totals: { therapists, beneficiaries, sessions },
 *     summary: { items, headlineMetric },
 *   }
 */

'use strict';

const { parsePeriodKey, parseScopeKey } = require('./periodKey');

// ─── Shared listing ──────────────────────────────────────────────

async function listSessions(Model, { start, end, scope }) {
  if (!Model) return [];
  const filter = { date: { $gte: start, $lt: end } };
  if (scope && scope.type === 'branch' && scope.id) filter.branchId = scope.id;
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

async function loadTherapistNames(ctx, ids) {
  const out = new Map();
  const uniqueIds = [...new Set(ids.filter(Boolean).map(String))];
  if (!uniqueIds.length) return out;
  if (typeof ctx.loadTherapists === 'function') {
    try {
      const list = (await ctx.loadTherapists(uniqueIds)) || [];
      for (const t of list) out.set(String(t._id || t.id), t.name || t.fullName || null);
      return out;
    } catch (_) {
      /* fall through */
    }
  }
  const Employee = ctx.models && (ctx.models.Employee?.model || ctx.models.Employee);
  if (!Employee || typeof Employee.find !== 'function') return out;
  try {
    const rows = (await Employee.find({ _id: { $in: uniqueIds } })) || [];
    for (const r of rows) out.set(String(r._id || r.id), r.fullName || r.name || null);
  } catch (_) {
    /* ignore */
  }
  return out;
}

function formatPct(x) {
  if (x == null || !Number.isFinite(x)) return '—';
  return `${Math.round(x * 1000) / 10}%`;
}

function pct(num, den) {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
  return num / den;
}

function therapistKey(s) {
  if (!s) return null;
  const ref = s.therapist || s.therapistId;
  return ref ? String(ref) : null;
}

// ─── Productivity ────────────────────────────────────────────────

function groupProductivity(rows) {
  const map = new Map();
  for (const s of rows || []) {
    const k = therapistKey(s);
    if (!k) continue;
    const node = map.get(k) || {
      therapistId: k,
      total: 0,
      completed: 0,
      noShow: 0,
      cancelledByPatient: 0,
      cancelledByCenter: 0,
    };
    node.total += 1;
    switch (s.status) {
      case 'COMPLETED':
        node.completed += 1;
        break;
      case 'NO_SHOW':
        node.noShow += 1;
        break;
      case 'CANCELLED_BY_PATIENT':
        node.cancelledByPatient += 1;
        break;
      case 'CANCELLED_BY_CENTER':
        node.cancelledByCenter += 1;
        break;
      default:
        break;
    }
    map.set(k, node);
  }
  return map;
}

function decorateProductivity(map) {
  const list = [];
  for (const node of map.values()) {
    const cancelled = node.cancelledByPatient + node.cancelledByCenter;
    const settled = node.completed + cancelled + node.noShow;
    list.push({
      ...node,
      completionRate: pct(node.completed, settled),
      noShowRate: pct(node.noShow, node.total),
    });
  }
  list.sort((a, b) => b.completed - a.completed || b.total - a.total);
  return list;
}

async function buildProductivity({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = {
    reportType: (report && report.id) || 'therapist.productivity.weekly',
    periodKey,
    scopeKey: scopeKey || null,
    generatedAt: new Date().toISOString(),
    range: range ? { start: range.start.toISOString(), end: range.end.toISOString() } : null,
    branch: null,
    byTherapist: [],
    totals: { therapists: 0, sessions: 0, completed: 0 },
    summary: { items: [], headlineMetric: null },
  };
  if (!range) {
    result.summary.items.push(`Unrecognised periodKey '${periodKey}' — report built empty.`);
    return result;
  }
  const Model =
    ctx.models &&
    (ctx.models.TherapySession?.model ||
      ctx.models.TherapySession ||
      ctx.models.Session?.model ||
      ctx.models.Session);
  const rows = await listSessions(Model, { start: range.start, end: range.end, scope });
  const grouped = groupProductivity(rows);
  const nameMap = await loadTherapistNames(ctx, [...grouped.keys()]);
  const decorated = decorateProductivity(grouped).map(n => ({
    ...n,
    name: nameMap.get(n.therapistId) || null,
  }));
  result.byTherapist = decorated;
  result.totals.therapists = decorated.length;
  result.totals.sessions = decorated.reduce((a, b) => a + b.total, 0);
  result.totals.completed = decorated.reduce((a, b) => a + b.completed, 0);
  result.branch = await loadBranch(ctx, scope);

  result.summary.items = [
    `Therapists active: ${result.totals.therapists}`,
    `Sessions held: ${result.totals.sessions} (${result.totals.completed} completed)`,
    ...decorated
      .slice(0, 3)
      .map(
        (t, i) =>
          `#${i + 1} ${t.name || t.therapistId}: ${t.completed}/${t.total} (${formatPct(t.completionRate)})`
      ),
  ];
  result.summary.headlineMetric = decorated.length
    ? {
        label: 'avg completion rate',
        value: formatPct(
          pct(
            result.totals.completed,
            decorated.reduce(
              (a, b) => a + (b.completed + b.cancelledByPatient + b.cancelledByCenter + b.noShow),
              0
            )
          )
        ),
      }
    : null;
  return result;
}

// ─── Caseload ────────────────────────────────────────────────────

function beneficiaryKey(s) {
  if (!s) return null;
  const ref = s.beneficiary || s.beneficiaryId;
  return ref ? String(ref) : null;
}

function groupCaseload(rows) {
  // therapistId → { beneficiaries: Set<id>, sessions: count }
  const map = new Map();
  for (const s of rows || []) {
    const tk = therapistKey(s);
    const bk = beneficiaryKey(s);
    if (!tk) continue;
    const node = map.get(tk) || { therapistId: tk, beneficiaries: new Set(), sessions: 0 };
    node.sessions += 1;
    if (bk) node.beneficiaries.add(bk);
    map.set(tk, node);
  }
  return map;
}

function decorateCaseload(map) {
  const list = [];
  for (const node of map.values()) {
    const b = node.beneficiaries.size;
    list.push({
      therapistId: node.therapistId,
      beneficiaries: b,
      sessions: node.sessions,
      avgSessionsPerBeneficiary: b > 0 ? Math.round((node.sessions / b) * 100) / 100 : null,
    });
  }
  list.sort((a, b) => b.beneficiaries - a.beneficiaries || b.sessions - a.sessions);
  return list;
}

async function buildCaseload({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = {
    reportType: (report && report.id) || 'therapist.caseload.monthly',
    periodKey,
    scopeKey: scopeKey || null,
    generatedAt: new Date().toISOString(),
    range: range ? { start: range.start.toISOString(), end: range.end.toISOString() } : null,
    branch: null,
    byTherapist: [],
    totals: { therapists: 0, beneficiaries: 0, sessions: 0 },
    summary: { items: [], headlineMetric: null },
  };
  if (!range) {
    result.summary.items.push(`Unrecognised periodKey '${periodKey}' — report built empty.`);
    return result;
  }
  const Model =
    ctx.models &&
    (ctx.models.TherapySession?.model ||
      ctx.models.TherapySession ||
      ctx.models.Session?.model ||
      ctx.models.Session);
  const rows = await listSessions(Model, { start: range.start, end: range.end, scope });
  const grouped = groupCaseload(rows);
  const nameMap = await loadTherapistNames(ctx, [...grouped.keys()]);
  const decorated = decorateCaseload(grouped).map(n => ({
    ...n,
    name: nameMap.get(n.therapistId) || null,
  }));
  result.byTherapist = decorated;
  result.totals.therapists = decorated.length;
  // Total unique beneficiaries across all therapists (dedupe).
  const uniqueBeneficiaries = new Set();
  for (const node of grouped.values()) {
    for (const b of node.beneficiaries) uniqueBeneficiaries.add(b);
  }
  result.totals.beneficiaries = uniqueBeneficiaries.size;
  result.totals.sessions = decorated.reduce((a, b) => a + b.sessions, 0);
  result.branch = await loadBranch(ctx, scope);

  result.summary.items = [
    `Therapists: ${result.totals.therapists}`,
    `Unique beneficiaries served: ${result.totals.beneficiaries}`,
    `Total sessions: ${result.totals.sessions}`,
    ...decorated
      .slice(0, 3)
      .map(
        (t, i) =>
          `#${i + 1} ${t.name || t.therapistId}: ${t.beneficiaries} beneficiaries / ${t.sessions} sessions`
      ),
  ];
  result.summary.headlineMetric = decorated.length
    ? {
        label: 'avg beneficiaries per therapist',
        value: `${Math.round((result.totals.beneficiaries / decorated.length) * 100) / 100}`,
      }
    : null;
  return result;
}

module.exports = {
  buildProductivity,
  buildCaseload,
  // Exposed for tests:
  groupProductivity,
  decorateProductivity,
  groupCaseload,
  decorateCaseload,
};
