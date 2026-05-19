'use strict';

/**
 * Attendance Management Service — نظام الحضور والانصراف الذكي
 * ============================================================
 * Unified, professional service covering:
 *  - Check-in / Check-out with shift awareness & lateness calculation
 *  - Overtime & early-departure detection
 *  - Leave request lifecycle (submit → approve/reject)
 *  - Daily, weekly, monthly reporting
 *  - Smart pattern analysis & anomaly flags
 *  - Real-time dashboard KPIs
 */

const mongoose = require('mongoose');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const isBetween = require('dayjs/plugin/isBetween');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
dayjs.extend(duration);
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);

// ── Model imports (lazy to avoid circular-dep issues at startup) ──────────
let _Attendance, _Employee, _Shift, _Leave, _Correction;
const Attendance = () => {
  if (!_Attendance) _Attendance = require('../models/Attendance');
  return _Attendance;
};
const Employee = () => {
  if (!_Employee) _Employee = require('../models/HR/Employee');
  return _Employee;
};
const Shift = () => {
  if (!_Shift) _Shift = require('../models/Shift');
  return _Shift;
};
const Leave = () => {
  if (!_Leave) _Leave = require('../models/leave.model');
  return _Leave;
};
const Correction = () => {
  if (!_Correction) _Correction = require('../models/HR/AttendanceCorrection');
  return _Correction;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse "HH:MM" string into today's Date object.
 */
function parseTimeToday(timeStr, baseDate = new Date()) {
  const [h, m] = (timeStr || '08:00').split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Calculate lateness in minutes vs scheduled start.
 */
function calcLatenessMinutes(checkInTime, scheduledStart) {
  const diff = dayjs(checkInTime).diff(dayjs(scheduledStart), 'minute');
  return diff > 0 ? diff : 0;
}

/**
 * Calculate working hours between check-in and check-out.
 */
function calcWorkingHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const mins = dayjs(checkOut).diff(dayjs(checkIn), 'minute');
  return Math.max(0, parseFloat((mins / 60).toFixed(2)));
}

/**
 * Calculate overtime hours (anything beyond scheduledEnd).
 */
function calcOvertimeHours(checkOut, scheduledEnd, workingHours, standardHours = 8) {
  if (!checkOut || !scheduledEnd) return 0;
  const overshoot = dayjs(checkOut).diff(dayjs(scheduledEnd), 'minute');
  if (overshoot > 15) return parseFloat((overshoot / 60).toFixed(2));
  // fallback: working hours beyond standard
  const extra = workingHours - standardHours;
  return extra > 0 ? parseFloat(extra.toFixed(2)) : 0;
}

/**
 * Derive attendance status from lateness.
 */
function deriveStatus(latenessMinutes, isAbsent = false) {
  if (isAbsent) return 'absent';
  if (latenessMinutes > 30) return 'late';
  if (latenessMinutes > 5) return 'late';
  return 'present';
}

/**
 * Get today's date range (start / end).
 */
function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Get month date range.
 */
function monthRange(month, year) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SERVICE
// ─────────────────────────────────────────────────────────────────────────────

class AttendanceManagementService {
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CHECK-IN
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Record employee check-in.
   * @param {string} employeeId
   * @param {{ location?: {lat,lng}, device?: string, source?: string, notes?: string }} data
   */
  static async checkIn(employeeId, data = {}) {
    const { start } = todayRange();

    // Duplicate guard
    const existing = await Attendance().findOne({ employeeId, date: start });
    if (existing?.checkIn) {
      return {
        success: false,
        code: 'ALREADY_CHECKED_IN',
        message: 'تم تسجيل الحضور مسبقاً اليوم',
        record: existing,
      };
    }

    const now = new Date();

    // Shift lookup (optional — graceful if none found)
    const shift = await AttendanceManagementService._findEmployeeShift(employeeId);
    const scheduledStart = shift ? parseTimeToday(shift.startTime, now) : null;
    const _scheduledEnd = shift ? parseTimeToday(shift.endTime, now) : null;
    const latenessMinutes = scheduledStart ? calcLatenessMinutes(now, scheduledStart) : 0;
    const status = deriveStatus(latenessMinutes);

    const locationData = data.location
      ? {
          latitude: data.location.lat ?? data.location.latitude,
          longitude: data.location.lng ?? data.location.longitude,
        }
      : undefined;

    const record = existing
      ? Object.assign(existing, {
          checkIn: now,
          status,
          shiftId: shift?._id,
          location: locationData,
          notes: data.notes,
          source: data.source || 'manual',
        })
      : new (Attendance())({
          employeeId,
          date: start,
          checkIn: now,
          status,
          shiftId: shift?._id,
          department: data.department,
          location: locationData,
          notes: data.notes,
          source: data.source || 'manual',
          recordedBy: data.recordedBy,
        });

    await record.save();

    return {
      success: true,
      message:
        latenessMinutes > 5
          ? `تم تسجيل الحضور — تأخير ${latenessMinutes} دقيقة`
          : 'تم تسجيل الحضور في الوقت المحدد',
      isLate: latenessMinutes > 5,
      latenessMinutes,
      scheduledStart: scheduledStart?.toISOString(),
      checkInTime: now.toISOString(),
      record,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CHECK-OUT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Record employee check-out.
   */
  static async checkOut(employeeId, data = {}) {
    const { start } = todayRange();

    const record = await Attendance().findOne({ employeeId, date: start });
    if (!record) {
      return { success: false, code: 'NO_CHECK_IN', message: 'لم يتم تسجيل الحضور اليوم' };
    }
    if (record.checkOut) {
      return {
        success: false,
        code: 'ALREADY_CHECKED_OUT',
        message: 'تم تسجيل الانصراف مسبقاً',
        record,
      };
    }

    const now = new Date();
    const shift = record.shiftId
      ? await Shift().findById(record.shiftId)
      : await AttendanceManagementService._findEmployeeShift(employeeId);

    const scheduledEnd = shift ? parseTimeToday(shift.endTime, now) : null;
    const workingHours = calcWorkingHours(record.checkIn, now);
    const overtimeHours = calcOvertimeHours(now, scheduledEnd, workingHours);

    // Early departure flag
    const earlyDepartureMinutes =
      scheduledEnd && dayjs(now).isBefore(dayjs(scheduledEnd))
        ? dayjs(scheduledEnd).diff(dayjs(now), 'minute')
        : 0;

    record.checkOut = now;
    record.workingHours = workingHours;
    record.overtimeHours = overtimeHours;
    if (data.notes) record.notes = data.notes;
    if (earlyDepartureMinutes > 15 && record.status === 'present') record.status = 'half_day';

    await record.save();

    return {
      success: true,
      message:
        overtimeHours > 0
          ? `تم تسجيل الانصراف — ${overtimeHours.toFixed(1)} ساعة إضافية`
          : 'تم تسجيل الانصراف بنجاح',
      workingHours,
      overtimeHours,
      earlyDepartureMinutes,
      checkOutTime: now.toISOString(),
      record,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. DASHBOARD KPIs
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Return today's KPI snapshot for the dashboard.
   */
  static async getDashboardStats({ branchId, department } = {}) {
    const { start, end } = todayRange();

    // Build employee filter
    const empFilter = { status: 'active' };
    if (branchId) empFilter.branch_id = branchId;
    if (department) empFilter.department = department;

    const [totalEmployees, todayRecords] = await Promise.all([
      Employee().countDocuments(empFilter),
      Attendance()
        .find({ date: { $gte: start, $lte: end } })
        .lean(),
    ]);

    const statusCounts = { present: 0, absent: 0, late: 0, half_day: 0, leave: 0, remote: 0 };
    let totalWorkingHours = 0,
      totalOvertimeHours = 0;

    for (const r of todayRecords) {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      totalWorkingHours += r.workingHours || 0;
      totalOvertimeHours += r.overtimeHours || 0;
    }

    const checkedIn = todayRecords.filter(r => r.checkIn).length;
    const checkedOut = todayRecords.filter(r => r.checkOut).length;
    const presentToday =
      statusCounts.present + statusCounts.late + statusCounts.half_day + statusCounts.remote;
    const absentToday = totalEmployees - checkedIn;
    const attendanceRate = totalEmployees ? Math.round((presentToday / totalEmployees) * 100) : 0;

    // Weekly trend (last 7 calendar days)
    const weeklyTrend = await AttendanceManagementService._getWeeklyTrend(branchId, department);

    // Department breakdown
    const deptBreakdown = await AttendanceManagementService._getDepartmentBreakdown(start, end);

    // Pending leave requests
    const pendingLeaves = await Leave().countDocuments({ status: 'pending' });

    return {
      totalEmployees,
      presentToday,
      absentToday: Math.max(0, absentToday),
      lateToday: statusCounts.late,
      onLeave: statusCounts.leave,
      remote: statusCounts.remote,
      checkedIn,
      checkedOut,
      attendanceRate,
      totalWorkingHours: parseFloat(totalWorkingHours.toFixed(1)),
      totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(1)),
      pendingLeaves,
      byStatus: [
        { status: 'حاضر', key: 'present', count: statusCounts.present },
        { status: 'غائب', key: 'absent', count: Math.max(0, absentToday) },
        { status: 'متأخر', key: 'late', count: statusCounts.late },
        { status: 'إجازة', key: 'leave', count: statusCounts.leave },
        { status: 'عن بُعد', key: 'remote', count: statusCounts.remote },
      ],
      weeklyTrend,
      deptBreakdown,
      generatedAt: new Date().toISOString(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. TODAY'S ATTENDANCE LIST
  // ═══════════════════════════════════════════════════════════════════════════

  static async getTodayAttendance({
    branchId: _branchId,
    department: _department,
    status,
    page = 1,
    limit = 50,
  } = {}) {
    const { start, end } = todayRange();
    const skip = (page - 1) * limit;

    const filter = { date: { $gte: start, $lte: end } };
    if (status) filter.status = status;

    const [records, total] = await Promise.all([
      Attendance()
        .find(filter)
        .populate('employeeId', 'name_ar name_en employee_number department job_title_ar branch_id')
        .populate('shiftId', 'name startTime endTime type')
        .sort({ checkIn: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Attendance().countDocuments(filter),
    ]);

    return {
      records: records.map(r => ({
        ...r,
        checkInFormatted: r.checkIn ? dayjs(r.checkIn).format('HH:mm') : '—',
        checkOutFormatted: r.checkOut ? dayjs(r.checkOut).format('HH:mm') : '—',
        workingHoursFormatted: r.workingHours
          ? `${Math.floor(r.workingHours)}:${String(Math.round((r.workingHours % 1) * 60)).padStart(2, '0')}`
          : '—',
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. EMPLOYEE ATTENDANCE HISTORY
  // ═══════════════════════════════════════════════════════════════════════════

  static async getEmployeeHistory(employeeId, { month, year, fromDate, toDate } = {}) {
    let dateFilter;
    if (fromDate && toDate) {
      dateFilter = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    } else {
      const m = month || new Date().getMonth() + 1;
      const y = year || new Date().getFullYear();
      const range = monthRange(m, y);
      dateFilter = { $gte: range.start, $lte: range.end };
    }

    const records = await Attendance()
      .find({ employeeId, date: dateFilter })
      .populate('shiftId', 'name startTime endTime type')
      .sort({ date: 1 })
      .lean();

    const summary = records.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        acc.totalWorkingHours += r.workingHours || 0;
        acc.totalOvertimeHours += r.overtimeHours || 0;
        return acc;
      },
      {
        present: 0,
        absent: 0,
        late: 0,
        half_day: 0,
        leave: 0,
        remote: 0,
        totalWorkingHours: 0,
        totalOvertimeHours: 0,
      }
    );

    return {
      employeeId,
      records: records.map(r => ({
        ...r,
        dateFormatted: dayjs(r.date).format('YYYY-MM-DD'),
        dayName: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][
          new Date(r.date).getDay()
        ],
        checkInFormatted: r.checkIn ? dayjs(r.checkIn).format('HH:mm') : '—',
        checkOutFormatted: r.checkOut ? dayjs(r.checkOut).format('HH:mm') : '—',
        workingHoursFormatted: r.workingHours
          ? `${Math.floor(r.workingHours)}:${String(Math.round((r.workingHours % 1) * 60)).padStart(2, '0')}`
          : '—',
      })),
      summary: {
        ...summary,
        totalWorkingHours: parseFloat(summary.totalWorkingHours.toFixed(1)),
        totalOvertimeHours: parseFloat(summary.totalOvertimeHours.toFixed(1)),
        attendanceRate: records.length
          ? Math.round(((summary.present + summary.late) / records.length) * 100)
          : 0,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. MONTHLY REPORT (ALL EMPLOYEES)
  // ═══════════════════════════════════════════════════════════════════════════

  static async getMonthlyReport({ month, year, department, branchId, page = 1, limit = 30 } = {}) {
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();
    const { start, end } = monthRange(m, y);
    const skip = (page - 1) * limit;

    const empFilter = { status: 'active' };
    if (department) empFilter.department = department;
    if (branchId) empFilter.branch_id = new mongoose.Types.ObjectId(branchId);

    const [employees, total] = await Promise.all([
      Employee()
        .find(empFilter)
        .select('name_ar name_en employee_number department job_title_ar')
        .skip(skip)
        .limit(limit)
        .lean(),
      Employee().countDocuments(empFilter),
    ]);

    const employeeIds = employees.map(e => e._id);
    const records = await Attendance()
      .find({ employeeId: { $in: employeeIds }, date: { $gte: start, $lte: end } })
      .lean();

    // Group by employee
    const byEmployee = {};
    for (const r of records) {
      const key = r.employeeId.toString();
      if (!byEmployee[key]) byEmployee[key] = [];
      byEmployee[key].push(r);
    }

    const workingDays = AttendanceManagementService._countWorkingDays(start, end);

    const rows = employees.map(emp => {
      const recs = byEmployee[emp._id.toString()] || [];
      const presentDays = recs.filter(r => ['present', 'late', 'remote'].includes(r.status)).length;
      const absentDays = workingDays - presentDays;
      const lateDays = recs.filter(r => r.status === 'late').length;
      const leaveDays = recs.filter(r => r.status === 'leave').length;
      const totalHours = recs.reduce((s, r) => s + (r.workingHours || 0), 0);
      const overtimeHours = recs.reduce((s, r) => s + (r.overtimeHours || 0), 0);
      const attendanceRate = workingDays ? Math.round((presentDays / workingDays) * 100) : 0;

      return {
        employee: emp,
        presentDays,
        absentDays: Math.max(0, absentDays),
        lateDays,
        leaveDays,
        totalHours: parseFloat(totalHours.toFixed(1)),
        overtimeHours: parseFloat(overtimeHours.toFixed(1)),
        attendanceRate,
        status:
          attendanceRate >= 90
            ? 'ممتاز'
            : attendanceRate >= 75
              ? 'جيد'
              : attendanceRate >= 60
                ? 'مقبول'
                : 'ضعيف',
      };
    });

    return {
      month: m,
      year: y,
      workingDays,
      rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      summary: {
        avgAttendanceRate: rows.length
          ? Math.round(rows.reduce((s, r) => s + r.attendanceRate, 0) / rows.length)
          : 0,
        totalOvertimeHours: parseFloat(rows.reduce((s, r) => s + r.overtimeHours, 0).toFixed(1)),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. MANUAL RECORD (ADMIN)
  // ═══════════════════════════════════════════════════════════════════════════

  static async createManualRecord(
    employeeId,
    { date, status, checkIn, checkOut, notes, recordedBy, source = 'manual' }
  ) {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const checkInDate = checkIn ? new Date(`${date}T${checkIn}:00`) : undefined;
    const checkOutDate = checkOut ? new Date(`${date}T${checkOut}:00`) : undefined;
    const workingHours = calcWorkingHours(checkInDate, checkOutDate);

    const record = await Attendance().findOneAndUpdate(
      { employeeId, date: day },
      {
        $set: {
          status,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          workingHours,
          notes,
          recordedBy,
          source,
        },
      },
      { upsert: true, new: true }
    );

    return { success: true, message: 'تم حفظ السجل بنجاح', record };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. LEAVE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  static async submitLeaveRequest(
    employeeId,
    { leaveType, startDate, endDate, reason, attachments, contactDuringLeave }
  ) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Overlap check
    const overlap = await Leave().findOne({
      employeeId,
      status: { $in: ['pending', 'approved'] },
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }],
    });
    if (overlap) {
      return { success: false, code: 'OVERLAP', message: 'يتعارض مع طلب إجازة موجود' };
    }

    const leave = new (Leave())({
      employeeId,
      leaveType,
      startDate: start,
      endDate: end,
      days,
      reason,
      attachments,
      contactDuringLeave,
      status: 'pending',
    });
    await leave.save();

    return { success: true, message: 'تم تقديم طلب الإجازة بنجاح', leave };
  }

  static async processLeaveRequest(leaveId, { decision, managerId, managerNotes }) {
    const leave = await Leave().findById(leaveId);
    if (!leave) return { success: false, message: 'طلب الإجازة غير موجود' };
    if (leave.status !== 'pending') return { success: false, message: 'الطلب تمت معالجته مسبقاً' };

    leave.status = decision; // 'approved' | 'rejected'
    leave.approvedBy = managerId;
    leave.managerNotes = managerNotes;
    leave.processedAt = new Date();
    await leave.save();

    // If approved, mark attendance records as 'leave'
    if (decision === 'approved') {
      const days = [];
      const current = new Date(leave.startDate);
      while (current <= leave.endDate) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      for (const day of days) {
        const d = new Date(day);
        d.setHours(0, 0, 0, 0);
        await Attendance().findOneAndUpdate(
          { employeeId: leave.employeeId, date: d },
          {
            $setOnInsert: {
              employeeId: leave.employeeId,
              date: d,
              status: 'leave',
              source: 'system',
            },
          },
          { upsert: true }
        );
      }
    }

    return {
      success: true,
      message: decision === 'approved' ? 'تمت الموافقة على الإجازة' : 'تم رفض الإجازة',
      leave,
    };
  }

  static async getLeaveRequests({ status, employeeId, month, year, page = 1, limit = 20 } = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (employeeId) filter.employeeId = employeeId;
    if (month && year) {
      const { start, end } = monthRange(month, year);
      filter.startDate = { $gte: start, $lte: end };
    }
    const skip = (page - 1) * limit;
    const [leaves, total] = await Promise.all([
      Leave()
        .find(filter)
        .populate('employeeId', 'name_ar name_en employee_number department')
        .populate('approvedBy', 'name_ar name_en')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Leave().countDocuments(filter),
    ]);

    return { leaves, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. ANALYTICS & PATTERN ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  static async getAnalytics({ period = 30, branchId: _branchId, department: _department } = {}) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - period);

    const records = await Attendance()
      .find({ date: { $gte: start, $lte: end } })
      .lean();

    // Daily trend
    const byDay = {};
    for (const r of records) {
      const key = dayjs(r.date).format('YYYY-MM-DD');
      if (!byDay[key]) byDay[key] = { date: key, present: 0, absent: 0, late: 0, total: 0 };
      byDay[key][r.status] = (byDay[key][r.status] || 0) + 1;
      byDay[key].total++;
    }
    const dailyTrend = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));

    // Hour distribution for check-in
    const hourDist = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      count: 0,
    }));
    for (const r of records) {
      if (r.checkIn) {
        const h = new Date(r.checkIn).getHours();
        hourDist[h].count++;
      }
    }

    // Status summary
    const statusSummary = records.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    // Average working hours per day
    const withHours = records.filter(r => r.workingHours > 0);
    const avgWorkingHours = withHours.length
      ? parseFloat(
          (withHours.reduce((s, r) => s + r.workingHours, 0) / withHours.length).toFixed(2)
        )
      : 0;

    return { period, dailyTrend, hourDist, statusSummary, avgWorkingHours };
  }

  static async analyzePatterns(employeeId, months = 3) {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);

    const records = await Attendance()
      .find({ employeeId, date: { $gte: start, $lte: end } })
      .sort({ date: 1 })
      .lean();

    const total = records.length;
    if (total === 0) return { employeeId, message: 'لا توجد سجلات كافية للتحليل', patterns: [] };

    const lateCount = records.filter(r => r.status === 'late').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const avgWorkHours =
      records.filter(r => r.workingHours).reduce((s, r) => s + r.workingHours, 0) / total;

    // Day-of-week pattern
    const dayPattern = Array(7)
      .fill(0)
      .map((_, i) => ({
        day: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][i],
        late: 0,
        absent: 0,
        total: 0,
      }));
    for (const r of records) {
      const d = new Date(r.date).getDay();
      dayPattern[d].total++;
      if (r.status === 'late') dayPattern[d].late++;
      if (r.status === 'absent') dayPattern[d].absent++;
    }

    const patterns = [];
    if (lateCount / total > 0.2)
      patterns.push({
        type: 'chronic_lateness',
        label: 'تأخر متكرر',
        severity: lateCount / total > 0.4 ? 'high' : 'medium',
        detail: `تأخر ${lateCount} مرة من أصل ${total}`,
      });
    if (absentCount / total > 0.1)
      patterns.push({
        type: 'frequent_absence',
        label: 'غياب متكرر',
        severity: absentCount / total > 0.2 ? 'high' : 'medium',
        detail: `غاب ${absentCount} يوماً من أصل ${total}`,
      });
    if (avgWorkHours < 6 && avgWorkHours > 0)
      patterns.push({
        type: 'low_hours',
        label: 'ساعات عمل منخفضة',
        severity: 'medium',
        detail: `متوسط ${avgWorkHours.toFixed(1)} ساعة يومياً`,
      });

    return {
      employeeId,
      months,
      total,
      lateCount,
      absentCount,
      avgWorkHours: parseFloat(avgWorkHours.toFixed(2)),
      lateRate: parseFloat(((lateCount / total) * 100).toFixed(1)),
      absenceRate: parseFloat(((absentCount / total) * 100).toFixed(1)),
      dayPattern,
      patterns,
      riskLevel: patterns.some(p => p.severity === 'high')
        ? 'high'
        : patterns.length > 0
          ? 'medium'
          : 'low',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. EXPORT
  // ═══════════════════════════════════════════════════════════════════════════

  static async exportMonthlyData(month, year, { department: _department } = {}) {
    const { start, end } = monthRange(month, year);
    const filter = { date: { $gte: start, $lte: end } };

    const records = await Attendance()
      .find(filter)
      .populate('employeeId', 'name_ar employee_number department job_title_ar')
      .sort({ date: 1, 'employeeId.name_ar': 1 })
      .lean();

    return records.map(r => ({
      'رقم الموظف': r.employeeId?.employee_number || '',
      'اسم الموظف': r.employeeId?.name_ar || '',
      القسم: r.employeeId?.department || '',
      التاريخ: dayjs(r.date).format('YYYY-MM-DD'),
      الحالة:
        {
          present: 'حاضر',
          absent: 'غائب',
          late: 'متأخر',
          half_day: 'نصف يوم',
          leave: 'إجازة',
          remote: 'عن بُعد',
        }[r.status] || r.status,
      'وقت الحضور': r.checkIn ? dayjs(r.checkIn).format('HH:mm') : '',
      'وقت الانصراف': r.checkOut ? dayjs(r.checkOut).format('HH:mm') : '',
      'ساعات العمل': r.workingHours || 0,
      'الساعات الإضافية': r.overtimeHours || 0,
      المصدر: r.source || '',
      ملاحظات: r.notes || '',
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. ATTENDANCE CORRECTION REQUESTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Submit a correction request for a past attendance record.
   * Employees can request fixes for wrong check-in time, wrong status, missing record, etc.
   */
  static async submitCorrectionRequest(
    employeeId,
    {
      date,
      correctionType,
      requestedCheckIn,
      requestedCheckOut,
      requestedStatus,
      reason,
      attendanceRecordId,
    }
  ) {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);

    // Prevent duplicate pending request for same employee+date+type
    const existing = await Correction().findOne({
      employeeId,
      date: day,
      correctionType,
      status: 'pending',
    });
    if (existing) {
      return {
        success: false,
        code: 'DUPLICATE',
        message: 'يوجد طلب تصحيح معلّق لنفس اليوم والنوع',
      };
    }

    const requestNumber = `COR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const correction = await Correction().create({
      requestNumber,
      employeeId,
      date: day,
      correctionType,
      requestedCheckIn: requestedCheckIn || null,
      requestedCheckOut: requestedCheckOut || null,
      requestedStatus: requestedStatus || null,
      reason,
      attendanceRecordId: attendanceRecordId || null,
      status: 'pending',
    });

    return { success: true, message: 'تم تقديم طلب التصحيح بنجاح', correction };
  }

  /**
   * List correction requests — employees see their own, HR/admin see all.
   */
  static async getCorrectionRequests({ employeeId, status, page = 1, limit = 20 } = {}) {
    const filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [corrections, total] = await Promise.all([
      Correction()
        .find(filter)
        .populate('employeeId', 'name_ar name_en employee_number department')
        .populate('reviewedBy', 'name_ar name_en')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Correction().countDocuments(filter),
    ]);

    return { corrections, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  /**
   * HR/manager approves or rejects a correction request.
   * On approval, the linked attendance record is updated automatically.
   */
  static async processCorrectionRequest(correctionId, { decision, reviewedBy, reviewNotes }) {
    const correction = await Correction().findById(correctionId);
    if (!correction) return { success: false, message: 'طلب التصحيح غير موجود' };
    if (correction.status !== 'pending')
      return { success: false, message: 'الطلب تمت معالجته مسبقاً' };

    correction.status = decision; // 'approved' | 'rejected'
    correction.reviewedBy = reviewedBy;
    correction.reviewNotes = reviewNotes;
    correction.reviewedAt = new Date();
    await correction.save();

    if (decision === 'approved') {
      const day = new Date(correction.date);
      day.setHours(0, 0, 0, 0);

      const updateFields = {};
      if (correction.requestedStatus) updateFields.status = correction.requestedStatus;
      if (correction.requestedCheckIn) {
        updateFields.checkIn = new Date(
          `${dayjs(correction.date).format('YYYY-MM-DD')}T${correction.requestedCheckIn}:00`
        );
      }
      if (correction.requestedCheckOut) {
        updateFields.checkOut = new Date(
          `${dayjs(correction.date).format('YYYY-MM-DD')}T${correction.requestedCheckOut}:00`
        );
      }
      if (updateFields.checkIn && updateFields.checkOut) {
        updateFields.workingHours = calcWorkingHours(updateFields.checkIn, updateFields.checkOut);
      }
      updateFields.source = 'correction';
      updateFields.notes = `تم التصحيح بناءً على طلب #${correction.requestNumber}`;

      await Attendance().findOneAndUpdate(
        { employeeId: correction.employeeId, date: day },
        { $set: updateFields },
        { upsert: true }
      );
    }

    return {
      success: true,
      message:
        decision === 'approved'
          ? 'تمت الموافقة على طلب التصحيح وتحديث السجل'
          : 'تم رفض طلب التصحيح',
      correction,
    };
  }

  /**
   * Search employees by name or employee_number (for EmployeeRecordTab).
   */
  static async searchEmployees(query, limit = 15) {
    if (!query || query.trim().length < 2) return [];

    const q = query.trim();
    const employees = await Employee()
      .find({
        status: 'active',
        $or: [
          { name_ar: { $regex: q, $options: 'i' } },
          { name_en: { $regex: q, $options: 'i' } },
          { employee_number: { $regex: q, $options: 'i' } },
        ],
      })
      .select('name_ar name_en employee_number department job_title_ar')
      .limit(limit)
      .lean();

    return employees;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. PAYROLL BRIDGE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Count Mon–Fri working days between two dates (inclusive).
   * Used internally by getMonthlyReport and getEmployeeMonthlyStats.
   */
  static _countWorkingDays(start, end) {
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay(); // 0=Sun, 6=Sat
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  /**
   * Aggregate a single employee's attendance stats for a given month/year.
   * This is the canonical source for payroll calculations — replaces the
   * broken Attendance.findOne({month,year}) query in payrollCalculationService.
   *
   * @param {string|ObjectId} employeeId
   * @param {number}          month  1-12
   * @param {number}          year   e.g. 2025
   * @returns {{ presentDays, absentDays, lateDays, leaveDays, workingDays, overtimeHours }}
   */
  static async getEmployeeMonthlyStats(employeeId, month, year) {
    const { start, end } = monthRange(Number(month), Number(year));
    const workingDays = AttendanceManagementService._countWorkingDays(start, end);

    const records = await Attendance()
      .find({ employeeId, date: { $gte: start, $lte: end } })
      .lean();

    const presentDays = records.filter(r =>
      ['present', 'late', 'remote'].includes(r.status)
    ).length;
    const absentDays = Math.max(0, workingDays - presentDays);
    const lateDays = records.filter(r => r.status === 'late').length;
    const leaveDays = records.filter(r => r.status === 'leave').length;
    const overtimeHours = parseFloat(
      records.reduce((s, r) => s + (r.overtimeHours || 0), 0).toFixed(2)
    );

    return { presentDays, absentDays, lateDays, leaveDays, workingDays, overtimeHours };
  }
}

module.exports = AttendanceManagementService;
