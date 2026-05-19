'use strict';

/**
 * saudi-labor-compliance.service.js — Wave 137.
 *
 * Scans DailyAttendanceRecord rows (Wave 131) for Saudi Labour Law
 * violations and produces audit-ready compliance reports.
 *
 * Public API:
 *   scanEmployeeWeek({ employeeId, weekStart, opts? })
 *   scanBranchMonth({ branchId, month, year })  →
 *     per-employee summary + bottom-line stats
 *   organizationNitaqat({ employeeRoster })  →
 *     { band, pct, gapToNextBetter, riskLevel }
 *   complianceReport({ branchId, month, year })  →
 *     full audit-ready report (violations + Nitaqat + cost impact)
 *
 * Outputs are NOT persisted by default — caller decides whether to
 * stash in an audit collection. Pure read-from-DailyAttendanceRecord.
 */

const lib = require('./saudi-labor-compliance.lib');

function _dayBounds(d) {
  const start = new Date(d);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

function _addDays(d, n) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function _monthBounds(month, year) {
  // month is 1-12 like a human reads it.
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}

function createSaudiLaborComplianceService({
  dailyRecordModel = null,
  employeeModel = null,
  logger = console,
  now = () => new Date(),
  ramadanRanges = [],
  limits = lib.DEFAULT_LIMITS,
} = {}) {
  if (!dailyRecordModel) {
    throw new Error('saudi-compliance: dailyRecordModel required');
  }

  async function _loadEmployeeWeek({ employeeId, weekStart }) {
    const start = _dayBounds(weekStart).start;
    const end = _dayBounds(_addDays(start, 6)).end;
    let cursor = dailyRecordModel.find({
      employeeId,
      shiftDate: { $gte: start, $lte: end },
    });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    try {
      return (await cursor) || [];
    } catch (err) {
      logger.warn(`[saudi-compliance] week load failed: ${err.message}`);
      return [];
    }
  }

  async function _employeeMeta(employeeId) {
    if (!employeeModel) return { isMuslim: true, nationality: 'unknown' };
    try {
      const cursor = employeeModel.findOne({ _id: employeeId });
      const emp =
        cursor && typeof cursor.lean === 'function'
          ? await cursor.lean()
          : cursor && typeof cursor.then === 'function'
            ? await cursor
            : cursor;
      if (!emp) return { isMuslim: true, nationality: 'unknown' };
      return {
        isMuslim: emp.isMuslim !== false, // default true unless explicit false
        nationality: emp.nationality || 'unknown',
        regularHourlyRate: emp.regularHourlyRate || null,
      };
    } catch (err) {
      logger.warn(`[saudi-compliance] employee meta failed: ${err.message}`);
      return { isMuslim: true, nationality: 'unknown' };
    }
  }

  async function scanEmployeeWeek({ employeeId, weekStart } = {}) {
    if (!employeeId) return { ok: false, reason: 'EMPLOYEE_REQUIRED' };
    if (!weekStart) {
      return {
        ok: false,
        reason: 'VALIDATION_FAILED',
        errors: { weekStart: 'required' },
      };
    }
    const meta = await _employeeMeta(employeeId);
    const records = await _loadEmployeeWeek({ employeeId, weekStart });
    const byDay = new Map();
    for (const r of records) byDay.set(_dayBounds(r.shiftDate).start.toISOString(), r);

    const dailyViolations = [];
    const daysForWeek = [];
    const start = _dayBounds(weekStart).start;
    for (let i = 0; i < 7; i++) {
      const d = _addDays(start, i);
      const rec = byDay.get(_dayBounds(d).start.toISOString());
      const wm = rec ? rec.workedMinutes || 0 : 0;
      const dayCheck = lib.checkDay({
        workedMinutes: wm,
        date: d,
        isMuslim: meta.isMuslim,
        ramadanRanges,
        limits,
        breakMinutes: rec ? rec.breakMinutes : undefined,
      });
      if (dayCheck.violations.length > 0) {
        dailyViolations.push({
          date: d,
          workedMinutes: wm,
          allowedMaxMinutes: dayCheck.allowedMaxMinutes,
          violations: dayCheck.violations,
        });
      }
      daysForWeek.push({
        date: d,
        workedMinutes: wm,
        isRestDay: !rec || wm === 0,
        fridayCompensated: rec ? rec.fridayCompensated === true : false,
      });
    }
    const weekCheck = lib.checkWeek({
      days: daysForWeek,
      isMuslim: meta.isMuslim,
      ramadanRanges,
      limits,
    });

    return {
      ok: true,
      employeeId,
      weekStart: start,
      meta,
      dailyViolations,
      weeklyViolations: weekCheck.violations,
      totalWeekMinutes: weekCheck.totalMinutes,
      weeklyCapMinutes: weekCheck.weeklyCapMinutes,
      restDayCount: weekCheck.restDayCount,
      ramadanDaysInWeek: weekCheck.ramadanDaysInWeek,
      hasViolations: dailyViolations.length > 0 || weekCheck.violations.length > 0,
    };
  }

  async function _loadBranchMonth({ branchId, month, year }) {
    const { start, end } = _monthBounds(month, year);
    let cursor = dailyRecordModel.find({
      branchId,
      shiftDate: { $gte: start, $lte: end },
    });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    try {
      return (await cursor) || [];
    } catch (err) {
      logger.warn(`[saudi-compliance] month load failed: ${err.message}`);
      return [];
    }
  }

  async function scanBranchMonth({ branchId, month, year } = {}) {
    if (!branchId) return { ok: false, reason: 'BRANCH_REQUIRED' };
    if (!month || !year) {
      return {
        ok: false,
        reason: 'VALIDATION_FAILED',
        errors: { month: 'required', year: 'required' },
      };
    }
    const records = await _loadBranchMonth({ branchId, month, year });
    const byEmp = new Map();
    for (const r of records) {
      const k = String(r.employeeId);
      if (!byEmp.has(k)) byEmp.set(k, []);
      byEmp.get(k).push(r);
    }

    const perEmployee = [];
    let totalDailyViolations = 0;
    let totalWeeklyViolations = 0;
    let totalOvertimeMinutes = 0;
    let totalFridayMinutes = 0;

    for (const [empId, empRecords] of byEmp) {
      const meta = await _employeeMeta(empId);
      let empDailyV = 0;
      let empWeeklyV = 0;
      let empOtMinutes = 0;
      let empFridayMinutes = 0;
      // Walk each day, accumulate.
      const byDay = new Map();
      for (const r of empRecords) byDay.set(_dayBounds(r.shiftDate).start.toISOString(), r);

      const { start, end } = _monthBounds(month, year);
      // Sliding-window weekly check: scan each calendar week within the month.
      const monthStart = start;
      const monthEnd = end;
      // Daily violations
      for (const [, rec] of byDay) {
        const wm = rec.workedMinutes || 0;
        const d = lib.checkDay({
          workedMinutes: wm,
          date: rec.shiftDate,
          isMuslim: meta.isMuslim,
          ramadanRanges,
          limits,
          breakMinutes: rec.breakMinutes,
        });
        if (d.violations.length > 0) empDailyV += d.violations.length;
        empOtMinutes += rec.overtimeMinutes || 0;
        if (lib.isFriday(rec.shiftDate) && wm > 0) empFridayMinutes += wm;
      }
      // Weekly violations: iterate Saturdays in month.
      let cursor = new Date(monthStart);
      while (cursor.getUTCDay() !== 6) {
        cursor = _addDays(cursor, 1);
      }
      while (cursor <= monthEnd) {
        const days = [];
        for (let i = 0; i < 7; i++) {
          const d = _addDays(cursor, i);
          const rec = byDay.get(_dayBounds(d).start.toISOString());
          days.push({
            date: d,
            workedMinutes: rec ? rec.workedMinutes || 0 : 0,
            isRestDay: !rec || (rec.workedMinutes || 0) === 0,
            fridayCompensated: rec ? rec.fridayCompensated === true : false,
          });
        }
        const wk = lib.checkWeek({
          days,
          isMuslim: meta.isMuslim,
          ramadanRanges,
          limits,
        });
        empWeeklyV += wk.violations.length;
        cursor = _addDays(cursor, 7);
      }
      perEmployee.push({
        employeeId: empId,
        nationality: meta.nationality,
        isMuslim: meta.isMuslim,
        dailyViolationCount: empDailyV,
        weeklyViolationCount: empWeeklyV,
        overtimeMinutes: empOtMinutes,
        fridayMinutes: empFridayMinutes,
      });
      totalDailyViolations += empDailyV;
      totalWeeklyViolations += empWeeklyV;
      totalOvertimeMinutes += empOtMinutes;
      totalFridayMinutes += empFridayMinutes;
    }

    return {
      ok: true,
      branchId,
      month,
      year,
      employeesScanned: byEmp.size,
      totalDailyViolations,
      totalWeeklyViolations,
      totalOvertimeMinutes,
      totalFridayMinutes,
      perEmployee,
    };
  }

  function organizationNitaqat({ employeeRoster = [], sizeBand = null } = {}) {
    if (!Array.isArray(employeeRoster) || employeeRoster.length === 0) {
      return {
        ok: false,
        reason: 'EMPTY_ROSTER',
      };
    }
    const activeEmployees = employeeRoster.filter(
      e => e.status !== 'terminated' && e.status !== 'resigned'
    );
    const saudiCount = activeEmployees.filter(
      e => e.nationality === 'SA' || e.nationality === 'saudi'
    ).length;
    // Auto-detect size band if not provided.
    let band = sizeBand;
    if (!band) {
      const n = activeEmployees.length;
      if (n < 50) band = 'small';
      else if (n < 250) band = 'medium';
      else if (n < 500) band = 'large';
      else band = 'huge';
    }
    const result = lib.classifyNitaqat({
      saudiCount,
      totalCount: activeEmployees.length,
      sizeBand: band,
      industry: 'healthcare',
    });

    let riskLevel = 'low';
    if (result.band === 'red') riskLevel = 'critical';
    else if (result.band === 'yellow') riskLevel = 'high';
    else if (result.band === 'green') riskLevel = 'medium';

    return {
      ok: true,
      ...result,
      sizeBand: band,
      saudiCount,
      totalCount: activeEmployees.length,
      riskLevel,
    };
  }

  async function complianceReport({ branchId, month, year, employeeRoster = null } = {}) {
    const labour = await scanBranchMonth({ branchId, month, year });
    if (!labour.ok) return labour;
    const nitaqat = employeeRoster
      ? organizationNitaqat({ employeeRoster })
      : { ok: false, reason: 'NO_ROSTER_PROVIDED' };

    const totalLaborMinutes = labour.perEmployee.reduce(
      (acc, e) => acc + (e.overtimeMinutes || 0),
      0
    );
    const overallRisk =
      labour.totalDailyViolations + labour.totalWeeklyViolations > 50
        ? 'critical'
        : labour.totalDailyViolations + labour.totalWeeklyViolations > 10
          ? 'high'
          : labour.totalDailyViolations + labour.totalWeeklyViolations > 0
            ? 'medium'
            : 'low';
    return {
      ok: true,
      generatedAt: now(),
      branchId,
      month,
      year,
      labour,
      nitaqat,
      totalLaborMinutes,
      overallRisk,
    };
  }

  return {
    scanEmployeeWeek,
    scanBranchMonth,
    organizationNitaqat,
    complianceReport,
    lib, // expose pure helpers for external callers
  };
}

module.exports = {
  createSaudiLaborComplianceService,
  ...lib, // re-export pure helpers
};
