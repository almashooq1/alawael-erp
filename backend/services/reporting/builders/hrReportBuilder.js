/**
 * hrReportBuilder.js — real builders for the 3 HR reports:
 *   - hr.turnover.monthly          → buildTurnover
 *   - hr.attendance.weekly         → buildAttendanceAdherence
 *   - hr.cpe.compliance.monthly    → buildCpeCompliance
 *
 * Phase 10 Commit 7g.
 *
 * Three data sources:
 *   - Employee (models/HR/Employee.js) — status enum: active |
 *     on_leave | suspended | terminated | resigned; termination_date,
 *     termination_type, branch_id (snake_case), createdAt as hire
 *     proxy when hire_date missing.
 *   - Attendance (models/Attendance.js) — employee-keyed daily
 *     attendance with status enum present | absent | late | half_day |
 *     leave | holiday | remote.
 *   - CpeRecord (models/CpeRecord.js) — SCFHS credits per employee
 *     per activityDate, with category '1'/'2'/'3' and creditHours.
 *
 * CPE compliance target: 25 hours per rolling 12-month window is the
 * default SCFHS bar for most categories; operator can override via
 * `ctx.cpeTargetHours`.
 */

'use strict';

const { parsePeriodKey, parseScopeKey } = require('./periodKey');

const DEFAULT_CPE_TARGET_HOURS = 25;
const EMPLOYEE_TERMINATED_STATUSES = ['terminated', 'resigned'];
const ATTENDANCE_PRESENT = ['present', 'late', 'half_day', 'remote'];
const ATTENDANCE_ABSENT = ['absent'];

// ─── Shared helpers ──────────────────────────────────────────────

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

function branchFilterKey(row) {
  // HR uses snake_case branch_id; finance/quality use camelCase
  // branchId. Accept both so the resolver doesn't have to know.
  return row.branch_id || row.branchId;
}

// ─── 1. buildTurnover (monthly, confidential) ────────────────────
//
// Turnover = (terminated + resigned in period) / avg headcount.
// Headcount proxy: Employee status='active' at end-of-period, minus
// the terminations_within_period / 2 (start-of-period approximation).

function rollupTurnover(rows, { rangeStart, rangeEnd } = {}) {
  let terminated = 0;
  let resigned = 0;
  const byReason = {};
  const byDepartment = {};
  for (const e of rows || []) {
    if (!e) continue;
    const t = e.termination_date || e.terminationDate;
    if (!t) continue;
    const at = new Date(t).getTime();
    if (rangeStart && at < rangeStart.getTime()) continue;
    if (rangeEnd && at >= rangeEnd.getTime()) continue;
    if (e.status === 'terminated') terminated += 1;
    else if (e.status === 'resigned') resigned += 1;
    const reason = e.termination_type || e.terminationType || 'unknown';
    byReason[reason] = (byReason[reason] || 0) + 1;
    const dept = e.department || 'unknown';
    byDepartment[dept] = (byDepartment[dept] || 0) + 1;
  }
  return {
    terminated,
    resigned,
    total: terminated + resigned,
    byReason,
    byDepartment,
  };
}

async function buildTurnover({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = baseResult(report, 'hr.turnover.monthly', periodKey, scopeKey, range);
  Object.assign(result, {
    totals: { terminated: 0, resigned: 0, endOfPeriodActive: 0, total: 0 },
    voluntaryRate: null,
    involuntaryRate: null,
    byReason: {},
    byDepartment: {},
  });
  if (!range) return degradeOnBadPeriod(result, periodKey);

  const branchId = scope && scope.type === 'branch' ? scope.id : null;
  const Employee = ctx.models && (ctx.models.Employee?.model || ctx.models.Employee);
  // Pull everyone who was terminated/resigned in this period — that's
  // the numerator. Then count active employees at period-end — that's
  // the denominator baseline.
  const baseFilter = {};
  if (branchId) baseFilter.$or = [{ branch_id: branchId }, { branchId: branchId }];
  const all = await findRows(Employee, baseFilter);
  const inPeriod = all.filter(e => {
    const t = e.termination_date || e.terminationDate;
    return t && new Date(t) >= range.start && new Date(t) < range.end;
  });
  const roll = rollupTurnover(inPeriod);
  const activeAtEnd = all.filter(e => e.status === 'active').length;
  // Average headcount ≈ active + half the departures in period.
  const avgHeadcount = activeAtEnd + roll.total / 2;

  result.totals = {
    terminated: roll.terminated,
    resigned: roll.resigned,
    endOfPeriodActive: activeAtEnd,
    total: roll.total,
  };
  result.voluntaryRate = pct(roll.resigned, avgHeadcount);
  result.involuntaryRate = pct(roll.terminated, avgHeadcount);
  result.byReason = roll.byReason;
  result.byDepartment = roll.byDepartment;
  result.branch = await loadBranch(ctx, scope);

  result.summary.items = [
    `End-of-period active: ${activeAtEnd}`,
    `Departures: ${roll.total} (resigned ${roll.resigned}, terminated ${roll.terminated})`,
    result.voluntaryRate != null ? `Voluntary turnover: ${formatPct(result.voluntaryRate)}` : null,
    result.involuntaryRate != null
      ? `Involuntary turnover: ${formatPct(result.involuntaryRate)}`
      : null,
  ].filter(Boolean);
  result.summary.headlineMetric =
    result.voluntaryRate != null
      ? { label: 'voluntary turnover', value: formatPct(result.voluntaryRate) }
      : null;
  return result;
}

// ─── 2. buildAttendanceAdherence (weekly) ────────────────────────

function rollupHrAttendance(rows) {
  const byStatus = {};
  let workedDays = 0;
  let absentDays = 0;
  const byEmployee = new Map();
  for (const a of rows || []) {
    if (!a) continue;
    const s = a.status || 'unknown';
    byStatus[s] = (byStatus[s] || 0) + 1;
    if (ATTENDANCE_PRESENT.includes(s)) workedDays += 1;
    if (ATTENDANCE_ABSENT.includes(s)) absentDays += 1;
    const k = a.employeeId ? String(a.employeeId) : null;
    if (k) {
      const node = byEmployee.get(k) || { employeeId: k, present: 0, late: 0, absent: 0, total: 0 };
      node.total += 1;
      if (s === 'present' || s === 'remote' || s === 'half_day') node.present += 1;
      if (s === 'late') node.late += 1;
      if (s === 'absent') node.absent += 1;
      byEmployee.set(k, node);
    }
  }
  return {
    total: (rows || []).length,
    byStatus,
    workedDays,
    absentDays,
    byEmployee: [...byEmployee.values()],
  };
}

async function buildAttendanceAdherence({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = baseResult(report, 'hr.attendance.weekly', periodKey, scopeKey, range);
  Object.assign(result, {
    totals: { records: 0, workedDays: 0, absentDays: 0, employees: 0 },
    byStatus: {},
    adherenceRate: null,
    worstPerformers: [],
  });
  if (!range) return degradeOnBadPeriod(result, periodKey);

  const branchId = scope && scope.type === 'branch' ? scope.id : null;
  const Attendance = ctx.models && (ctx.models.Attendance?.model || ctx.models.Attendance);
  const filter = { date: { $gte: range.start, $lt: range.end } };
  if (branchId) filter.branch_id = branchId;
  const rows = await findRows(Attendance, filter);
  const roll = rollupHrAttendance(rows);
  result.totals = {
    records: roll.total,
    workedDays: roll.workedDays,
    absentDays: roll.absentDays,
    employees: roll.byEmployee.length,
  };
  result.byStatus = roll.byStatus;
  result.adherenceRate = pct(roll.workedDays, roll.workedDays + roll.absentDays);
  result.worstPerformers = roll.byEmployee
    .filter(e => e.absent > 0)
    .sort((a, b) => b.absent - a.absent || b.late - a.late)
    .slice(0, 5);
  result.branch = await loadBranch(ctx, scope);

  result.summary.items = [
    `Records: ${roll.total} across ${result.totals.employees} employees`,
    `Worked days: ${roll.workedDays}; absent days: ${roll.absentDays}`,
    result.adherenceRate != null ? `Adherence: ${formatPct(result.adherenceRate)}` : null,
    result.worstPerformers.length
      ? `Top absentee: ${result.worstPerformers[0].employeeId} (${result.worstPerformers[0].absent} absences)`
      : null,
  ].filter(Boolean);
  result.summary.headlineMetric =
    result.adherenceRate != null
      ? { label: 'attendance adherence', value: formatPct(result.adherenceRate) }
      : null;
  return result;
}

// ─── 3. buildCpeCompliance (monthly) ─────────────────────────────

function rollupCpe(rows, { windowStart } = {}) {
  const byEmployee = new Map();
  let totalHours = 0;
  for (const r of rows || []) {
    if (!r || !r.employeeId) continue;
    if (windowStart && r.activityDate && new Date(r.activityDate) < windowStart) continue;
    const hours = Number(r.creditHours) || 0;
    totalHours += hours;
    const k = String(r.employeeId);
    const node = byEmployee.get(k) || {
      employeeId: k,
      hours: 0,
      byCategory: { 1: 0, 2: 0, 3: 0 },
      activities: 0,
    };
    node.hours = Math.round((node.hours + hours) * 10) / 10;
    node.activities += 1;
    if (r.category && node.byCategory[r.category] != null) {
      node.byCategory[r.category] = Math.round((node.byCategory[r.category] + hours) * 10) / 10;
    }
    byEmployee.set(k, node);
  }
  return {
    totalHours: Math.round(totalHours * 10) / 10,
    byEmployee: [...byEmployee.values()],
  };
}

async function buildCpeCompliance({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = baseResult(report, 'hr.cpe.compliance.monthly', periodKey, scopeKey, range);
  Object.assign(result, {
    targetHours: DEFAULT_CPE_TARGET_HOURS,
    totals: { licensedEmployees: 0, compliantEmployees: 0, totalHours: 0 },
    complianceRate: null,
    atRisk: [],
  });
  if (!range) return degradeOnBadPeriod(result, periodKey);

  const target = Number(ctx.cpeTargetHours) || DEFAULT_CPE_TARGET_HOURS;
  result.targetHours = target;

  // Rolling 12-month window ending at the period end.
  const windowStart = new Date(range.end.getTime() - 365 * 24 * 3600 * 1000);

  const branchId = scope && scope.type === 'branch' ? scope.id : null;
  const CpeRecord = ctx.models && (ctx.models.CpeRecord?.model || ctx.models.CpeRecord);
  const cpeFilter = { activityDate: { $gte: windowStart, $lt: range.end } };
  if (branchId) cpeFilter.branch_id = branchId;
  const cpeRows = await findRows(CpeRecord, cpeFilter);
  const roll = rollupCpe(cpeRows);

  // Licensed employees: active + (SCFHS-licensed OR any employee
  // when the schema doesn't distinguish). Safe default is "active
  // employees in scope".
  const Employee = ctx.models && (ctx.models.Employee?.model || ctx.models.Employee);
  const empFilter = { status: 'active' };
  if (branchId) empFilter.$or = [{ branch_id: branchId }, { branchId: branchId }];
  const licensedEmployees = await countDocs(Employee, empFilter);

  const compliant = roll.byEmployee.filter(e => e.hours >= target).length;
  const atRisk = roll.byEmployee
    .filter(e => e.hours < target)
    .sort((a, b) => a.hours - b.hours)
    .slice(0, 10);

  result.totals = {
    licensedEmployees,
    compliantEmployees: compliant,
    totalHours: roll.totalHours,
  };
  result.complianceRate = pct(compliant, licensedEmployees);
  result.atRisk = atRisk.map(e => ({
    employeeId: e.employeeId,
    hours: e.hours,
    shortfall: Math.round((target - e.hours) * 10) / 10,
    byCategory: e.byCategory,
  }));
  result.branch = await loadBranch(ctx, scope);

  result.summary.items = [
    `Licensed employees: ${licensedEmployees}`,
    `Compliant (≥ ${target} h): ${compliant}`,
    result.complianceRate != null ? `Compliance rate: ${formatPct(result.complianceRate)}` : null,
    result.atRisk.length ? `At-risk: ${result.atRisk.length} employees` : null,
  ].filter(Boolean);
  result.summary.headlineMetric =
    result.complianceRate != null
      ? { label: 'CPE compliance', value: formatPct(result.complianceRate) }
      : null;
  return result;
}

module.exports = {
  buildTurnover,
  buildAttendanceAdherence,
  buildCpeCompliance,
  // Exposed for tests:
  rollupTurnover,
  rollupHrAttendance,
  rollupCpe,
  branchFilterKey,
  DEFAULT_CPE_TARGET_HOURS,
  EMPLOYEE_TERMINATED_STATUSES,
  ATTENDANCE_PRESENT,
  ATTENDANCE_ABSENT,
};
