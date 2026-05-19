'use strict';

/**
 * attendance-intelligence.service.js — Wave 129.
 *
 * Read-only aggregation service powering the seven per-persona
 * attendance dashboards. NO persistence here — everything is pure
 * + observational reads against the canonical models built across
 * Waves 119-128.
 *
 * Personas:
 *   1. employeeDashboard       — "What's my attendance picture?"
 *   2. branchManagerDashboard  — Today at this branch
 *   3. hrAdminDashboard        — Org-wide today, top exceptions
 *   4. hrDirectorDashboard     — Monthly + branch comparisons
 *   5. securityDashboard       — Fraud / tailgate / impossible-travel
 *   6. fleetDashboard          — Driver-specific trip-vs-tap coverage
 *   7. executiveDashboard      — Top-line KPIs
 *
 * Date math is calendar-day aware (00:00→23:59:59.999 local-server
 * boundary). Multi-day windows use `lookbackDays` for sliding window
 * or `periodMonth` for calendar-month rollups.
 */

const reg = require('./attendance.registry');

function _dayStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function _dayEnd(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function _addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function _monthStart(d) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function _monthEnd(d) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + 1, 0);
  x.setHours(23, 59, 59, 999);
  return x;
}

async function _runFind(cursor) {
  if (cursor && typeof cursor.lean === 'function') cursor = cursor.lean();
  return (await cursor) || [];
}

function createAttendanceIntelligenceService({
  sourceEventModel = null,
  exceptionModel = null,
  correctionRequestModel = null,
  logger = console,
} = {}) {
  if (!sourceEventModel) {
    throw new Error('attendance-intelligence: sourceEventModel required');
  }

  // ─── employeeDashboard ──────────────────────────────────────

  async function employeeDashboard({ employeeId, asOf = new Date() } = {}) {
    if (!employeeId) return { ok: false, reason: reg.REASON.EMPLOYEE_REQUIRED };
    const day = _dayStart(asOf);
    const weekStart = _addDays(day, -6);
    const monthStart = _monthStart(asOf);

    let todayEvents = [];
    let weekEvents = [];
    let monthEvents = [];
    try {
      todayEvents = await _runFind(
        sourceEventModel.find({
          employeeId,
          eventTime: { $gte: day, $lte: _dayEnd(asOf) },
        })
      );
      weekEvents = await _runFind(
        sourceEventModel.find({
          employeeId,
          eventTime: { $gte: weekStart, $lte: _dayEnd(asOf) },
        })
      );
      monthEvents = await _runFind(
        sourceEventModel.find({
          employeeId,
          eventTime: { $gte: monthStart, $lte: _dayEnd(asOf) },
        })
      );
    } catch (err) {
      logger.warn(`[intel] employeeDashboard read failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }

    todayEvents.sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime));
    const todayCheckIn = todayEvents.find(e => e.eventKind === 'check-in');
    const todayCheckOut = [...todayEvents].reverse().find(e => e.eventKind === 'check-out');

    let openExceptions = [];
    if (exceptionModel) {
      try {
        openExceptions = await _runFind(
          exceptionModel.find({
            employeeId,
            status: { $in: ['open', 'acknowledged'] },
          })
        );
      } catch (err) {
        logger.warn(`[intel] employeeDashboard exceptions read failed: ${err.message}`);
      }
    }

    let pendingCorrections = [];
    if (correctionRequestModel) {
      try {
        pendingCorrections = await _runFind(
          correctionRequestModel.find({ requesterId: employeeId, status: 'pending' })
        );
      } catch (err) {
        logger.warn(`[intel] employeeDashboard corrections read failed: ${err.message}`);
      }
    }

    const _dayKey = e => {
      const d = new Date(e.eventTime);
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    };
    const monthByDay = {};
    for (const e of monthEvents) {
      const k = _dayKey(e);
      if (!monthByDay[k]) monthByDay[k] = { in: null, out: null };
      if (e.eventKind === 'check-in' && !monthByDay[k].in) monthByDay[k].in = e;
      if (e.eventKind === 'check-out') monthByDay[k].out = e;
    }
    const daysWithCheckIn = Object.values(monthByDay).filter(d => d.in).length;
    const daysWithBothInOut = Object.values(monthByDay).filter(d => d.in && d.out).length;

    return {
      ok: true,
      employeeId,
      asOf,
      today: {
        checkInAt: todayCheckIn ? todayCheckIn.eventTime : null,
        checkInSource: todayCheckIn ? todayCheckIn.source : null,
        checkOutAt: todayCheckOut ? todayCheckOut.eventTime : null,
        checkOutSource: todayCheckOut ? todayCheckOut.source : null,
        eventCount: todayEvents.length,
        status: todayCheckIn ? (todayCheckOut ? 'present-closed' : 'present-open') : 'absent',
      },
      week: {
        eventCount: weekEvents.length,
        uniqueDays: new Set(weekEvents.map(_dayKey)).size,
      },
      month: {
        eventCount: monthEvents.length,
        daysWithCheckIn,
        daysWithBothInOut,
      },
      openExceptions,
      pendingCorrections,
    };
  }

  // ─── branchManagerDashboard ─────────────────────────────────

  async function branchManagerDashboard({ branchId, dayDate = new Date() } = {}) {
    if (!branchId) return { ok: false, reason: reg.REASON.BRANCH_REQUIRED };
    const dStart = _dayStart(dayDate);
    const dEnd = _dayEnd(dayDate);

    let events = [];
    try {
      events = await _runFind(
        sourceEventModel.find({
          branchId,
          eventTime: { $gte: dStart, $lte: dEnd },
        })
      );
    } catch (err) {
      logger.warn(`[intel] branchManagerDashboard events failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }

    // Group events by employee.
    const byEmp = new Map();
    for (const e of events) {
      const k = String(e.employeeId);
      if (!byEmp.has(k)) byEmp.set(k, { employeeId: e.employeeId, events: [] });
      byEmp.get(k).events.push(e);
    }
    for (const v of byEmp.values()) {
      v.events.sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime));
      v.firstCheckIn = v.events.find(e => e.eventKind === 'check-in') || null;
      v.lastCheckOut = [...v.events].reverse().find(e => e.eventKind === 'check-out') || null;
    }
    const employees = [...byEmp.values()];
    const presentCount = employees.filter(e => e.firstCheckIn).length;
    const stillOpenCount = employees.filter(e => e.firstCheckIn && !e.lastCheckOut).length;
    const missingCheckoutCount = stillOpenCount;

    // Source distribution today.
    const sourceCounts = {};
    for (const e of events) {
      sourceCounts[e.source] = (sourceCounts[e.source] || 0) + 1;
    }
    // Flag distribution.
    const flagCounts = {};
    for (const e of events) {
      for (const f of e.flags || []) {
        flagCounts[f] = (flagCounts[f] || 0) + 1;
      }
    }

    // Pending corrections + open exceptions on this branch.
    let pendingCorrections = [];
    if (correctionRequestModel) {
      try {
        pendingCorrections = await _runFind(
          correctionRequestModel.find({ branchId, status: 'pending' })
        );
      } catch (err) {
        logger.warn(`[intel] branchManager corrections failed: ${err.message}`);
      }
    }
    let openExceptions = [];
    if (exceptionModel) {
      try {
        openExceptions = await _runFind(
          exceptionModel.find({ branchId, status: { $in: ['open', 'acknowledged'] } })
        );
      } catch (err) {
        logger.warn(`[intel] branchManager exceptions failed: ${err.message}`);
      }
    }

    return {
      ok: true,
      branchId,
      dayDate: dStart,
      headcount: employees.length,
      presentCount,
      missingCheckoutCount,
      eventCount: events.length,
      sourceCounts,
      flagCounts,
      employees,
      pendingCorrections,
      openExceptions,
    };
  }

  // ─── hrAdminDashboard ───────────────────────────────────────

  async function hrAdminDashboard({ dayDate = new Date() } = {}) {
    const dStart = _dayStart(dayDate);
    const dEnd = _dayEnd(dayDate);
    let events = [];
    try {
      events = await _runFind(sourceEventModel.find({ eventTime: { $gte: dStart, $lte: dEnd } }));
    } catch (err) {
      logger.warn(`[intel] hrAdmin events failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
    const sourceCounts = {};
    const branchPresence = {};
    const uniqueEmployees = new Set();
    for (const e of events) {
      sourceCounts[e.source] = (sourceCounts[e.source] || 0) + 1;
      uniqueEmployees.add(String(e.employeeId));
      if (e.branchId) {
        const k = String(e.branchId);
        if (!branchPresence[k]) branchPresence[k] = new Set();
        if (e.eventKind === 'check-in') branchPresence[k].add(String(e.employeeId));
      }
    }
    const presencePerBranch = Object.fromEntries(
      Object.entries(branchPresence).map(([k, set]) => [k, set.size])
    );

    let topExceptions = [];
    if (exceptionModel) {
      try {
        topExceptions = await _runFind(
          exceptionModel.find({
            detectedAt: { $gte: dStart, $lte: dEnd },
            status: { $in: ['open', 'acknowledged'] },
          })
        );
      } catch (err) {
        logger.warn(`[intel] hrAdmin exceptions failed: ${err.message}`);
      }
    }
    // group by kind.
    const exceptionByKind = {};
    for (const ex of topExceptions) {
      exceptionByKind[ex.kind] = (exceptionByKind[ex.kind] || 0) + 1;
    }

    return {
      ok: true,
      dayDate: dStart,
      activeEmployeeCount: uniqueEmployees.size,
      totalEvents: events.length,
      sourceCounts,
      presencePerBranch,
      openExceptionCount: topExceptions.length,
      exceptionByKind,
    };
  }

  // ─── securityDashboard ──────────────────────────────────────

  async function securityDashboard({ asOf = new Date(), lookbackDays = 7 } = {}) {
    const since = _addDays(_dayStart(asOf), -(lookbackDays - 1));
    const until = _dayEnd(asOf);

    let events = [];
    try {
      events = await _runFind(sourceEventModel.find({ eventTime: { $gte: since, $lte: until } }));
    } catch (err) {
      logger.warn(`[intel] security events failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }

    const tailgateCount = events.filter(e => (e.flags || []).includes('tailgate')).length;
    const spoofCount = events.filter(e => (e.flags || []).includes('spoof-suspected')).length;
    const wrongBranchCount = events.filter(e =>
      (e.flags || []).includes('device-wrong-branch')
    ).length;
    const geofenceEdgeCount = events.filter(e => (e.flags || []).includes('geofence-edge')).length;

    let securityExceptions = [];
    if (exceptionModel) {
      try {
        securityExceptions = await _runFind(
          exceptionModel.find({
            detectedAt: { $gte: since, $lte: until },
            ownerRole: 'security',
            status: { $in: ['open', 'acknowledged'] },
          })
        );
      } catch (err) {
        logger.warn(`[intel] security exceptions failed: ${err.message}`);
      }
    }

    return {
      ok: true,
      since,
      until,
      lookbackDays,
      totalEvents: events.length,
      flagCounts: {
        tailgate: tailgateCount,
        'spoof-suspected': spoofCount,
        'device-wrong-branch': wrongBranchCount,
        'geofence-edge': geofenceEdgeCount,
      },
      openSecurityExceptions: securityExceptions,
    };
  }

  // ─── fleetDashboard ─────────────────────────────────────────

  async function fleetDashboard({ asOf = new Date(), lookbackDays = 7 } = {}) {
    const since = _addDays(_dayStart(asOf), -(lookbackDays - 1));
    const until = _dayEnd(asOf);

    let driverEvents = [];
    try {
      driverEvents = await _runFind(
        sourceEventModel.find({
          eventTime: { $gte: since, $lte: until },
          source: {
            $in: [reg.SOURCE_KIND.NFC, reg.SOURCE_KIND.AUTO_RULE, reg.SOURCE_KIND.MOBILE_GPS],
          },
        })
      );
    } catch (err) {
      logger.warn(`[intel] fleet events failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }

    const tripStarts = driverEvents.filter(
      e => e.source === reg.SOURCE_KIND.AUTO_RULE && e.eventKind === 'check-in'
    );
    const tripEnds = driverEvents.filter(
      e => e.source === reg.SOURCE_KIND.AUTO_RULE && e.eventKind === 'check-out'
    );
    const garageTaps = driverEvents.filter(e => e.source === reg.SOURCE_KIND.NFC);
    const realCheckIns = driverEvents.filter(
      e => e.source !== reg.SOURCE_KIND.AUTO_RULE && e.eventKind === 'check-in'
    );

    const tripsWithTap = tripStarts.filter(trip => {
      const tripTime = new Date(trip.eventTime).getTime();
      return realCheckIns.some(tap => {
        const tapTime = new Date(tap.eventTime).getTime();
        return (
          String(tap.employeeId) === String(trip.employeeId) &&
          Math.abs(tapTime - tripTime) < 2 * 60 * 60 * 1000 // 2h
        );
      });
    }).length;
    const tripsWithoutTap = tripStarts.length - tripsWithTap;

    return {
      ok: true,
      since,
      until,
      lookbackDays,
      tripStartCount: tripStarts.length,
      tripEndCount: tripEnds.length,
      garageTapCount: garageTaps.length,
      tripsWithTap,
      tripsWithoutTap,
      tapCoveragePct:
        tripStarts.length > 0 ? Math.round((tripsWithTap / tripStarts.length) * 100) : null,
    };
  }

  // ─── hrDirectorDashboard (monthly) ──────────────────────────

  async function hrDirectorDashboard({ asOf = new Date() } = {}) {
    const mStart = _monthStart(asOf);
    const mEnd = _monthEnd(asOf);
    let events = [];
    try {
      events = await _runFind(sourceEventModel.find({ eventTime: { $gte: mStart, $lte: mEnd } }));
    } catch (err) {
      logger.warn(`[intel] hrDirector events failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }

    const byBranch = {};
    for (const e of events) {
      const k = String(e.branchId || 'unknown');
      if (!byBranch[k]) {
        byBranch[k] = { branchId: e.branchId || null, events: 0, employees: new Set() };
      }
      byBranch[k].events += 1;
      byBranch[k].employees.add(String(e.employeeId));
    }
    const branchSummary = Object.values(byBranch).map(b => ({
      branchId: b.branchId,
      eventCount: b.events,
      uniqueEmployees: b.employees.size,
    }));
    branchSummary.sort((a, b) => b.eventCount - a.eventCount);

    return {
      ok: true,
      month: { start: mStart, end: mEnd },
      totalEvents: events.length,
      uniqueEmployees: new Set(events.map(e => String(e.employeeId))).size,
      branchSummary,
    };
  }

  // ─── executiveDashboard ─────────────────────────────────────

  async function executiveDashboard({ asOf = new Date(), lookbackDays = 30 } = {}) {
    const since = _addDays(_dayStart(asOf), -(lookbackDays - 1));
    const until = _dayEnd(asOf);
    let events = [];
    try {
      events = await _runFind(sourceEventModel.find({ eventTime: { $gte: since, $lte: until } }));
    } catch (err) {
      logger.warn(`[intel] executive events failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
    const uniqueEmployees = new Set(events.map(e => String(e.employeeId)));
    const uniqueBranches = new Set(events.map(e => String(e.branchId || 'none')));
    const sourceCounts = {};
    for (const e of events) sourceCounts[e.source] = (sourceCounts[e.source] || 0) + 1;
    const totalCheckIns = events.filter(e => e.eventKind === 'check-in').length;
    const totalCheckOuts = events.filter(e => e.eventKind === 'check-out').length;
    const checkoutCoverage =
      totalCheckIns > 0 ? Math.round((totalCheckOuts / totalCheckIns) * 100) : null;

    let openCritical = 0;
    if (exceptionModel) {
      try {
        const ex = await _runFind(
          exceptionModel.find({
            detectedAt: { $gte: since, $lte: until },
            severity: 'critical',
            status: { $in: ['open', 'acknowledged'] },
          })
        );
        openCritical = ex.length;
      } catch (err) {
        logger.warn(`[intel] executive exceptions failed: ${err.message}`);
      }
    }

    return {
      ok: true,
      since,
      until,
      lookbackDays,
      activeEmployees: uniqueEmployees.size,
      activeBranches: uniqueBranches.size,
      totalEvents: events.length,
      totalCheckIns,
      totalCheckOuts,
      checkoutCoveragePct: checkoutCoverage,
      sourceMix: sourceCounts,
      openCriticalExceptions: openCritical,
    };
  }

  return {
    employeeDashboard,
    branchManagerDashboard,
    hrAdminDashboard,
    hrDirectorDashboard,
    securityDashboard,
    fleetDashboard,
    executiveDashboard,
  };
}

module.exports = {
  createAttendanceIntelligenceService,
};
