/**
 * AttendanceProcessing Service — خدمة معالجة الحضور والانصراف
 * النظام 37: الحضور البيومتري ZKTeco
 */
'use strict';

const AttendanceLog = require('../models/AttendanceLog');
const DailyAttendance = require('../models/DailyAttendance');
const WorkShift = require('../models/WorkShift');
const EmployeeShiftAssignment = require('../models/EmployeeShiftAssignment');
const LeaveRequest = require('../models/LeaveRequest');
const AttendancePolicyModel = require('../models/AttendancePolicyModel');

// ─── مساعدات ──────────────────────────────────────────────────────────────────

/**
 * الحصول على تاريخ بدون وقت (YYYY-MM-DD)
 */
function toDateString(date) {
  return date instanceof Date ? date.toISOString().split('T')[0] : date;
}

/**
 * حساب الفرق بالدقائق بين وقتين
 */
function diffMinutes(dateA, dateB) {
  return Math.round((dateA - dateB) / 60000);
}

/**
 * دمج تاريخ ووقت نص (HH:MM:SS) في Date
 */
function combineDateTime(dateStr, timeStr) {
  if (!timeStr) return null;
  const [h, m, s] = timeStr.split(':').map(Number);
  const d = new Date(dateStr + 'T00:00:00.000Z');
  d.setUTCHours(h || 0, m || 0, s || 0, 0);
  return d;
}

// ─── الدوام ───────────────────────────────────────────────────────────────────

/**
 * الحصول على دوام الموظف لتاريخ معين
 */
async function getEmployeeShift(employee, dateStr) {
  const date = new Date(dateStr);

  const assignment = await EmployeeShiftAssignment.findOne({
    employeeId: employee._id,
    effectiveFrom: { $lte: date },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: date } }],
    isActive: true,
  })
    .sort({ effectiveFrom: -1 })
    .populate('shiftId');

  return assignment ? assignment.shiftId : null;
}

// ─── حساب إحصائيات الحضور ────────────────────────────────────────────────────

/**
 * إعادة حساب إحصائيات الحضور اليومي
 */
function recalculate(daily, shift) {
  if (!shift || !daily.checkIn) return;

  const dateStr = toDateString(daily.workDate);

  // حساب التأخير
  if (shift.startTime) {
    const scheduledIn = combineDateTime(dateStr, shift.startTime);
    if (scheduledIn) {
      const actualIn = new Date(daily.checkIn);
      const lateMinutes = diffMinutes(actualIn, scheduledIn);
      const graceInMinutes = shift.graceInMinutes || 0;
      daily.lateMinutes = Math.max(0, lateMinutes - graceInMinutes);
    }
  }

  // حساب الخروج المبكر والوقت الإضافي
  if (shift.endTime && daily.checkOut) {
    const scheduledOut = combineDateTime(dateStr, shift.endTime);
    if (scheduledOut) {
      const actualOut = new Date(daily.checkOut);
      const diffMin = diffMinutes(actualOut, scheduledOut);

      if (diffMin < 0) {
        daily.earlyLeaveMinutes = Math.abs(diffMin);
        daily.overtimeMinutes = 0;
      } else {
        const overtimeAfter = shift.overtimeAfterMinutes || 30;
        daily.earlyLeaveMinutes = 0;
        daily.overtimeMinutes = Math.max(0, diffMin - overtimeAfter);
      }
    }
  }

  // الوقت الفعلي
  if (daily.checkIn && daily.checkOut) {
    const worked = diffMinutes(new Date(daily.checkOut), new Date(daily.checkIn));
    daily.workedMinutes = Math.max(0, worked - (daily.breakMinutes || 0));
  }

  // قيمة الوقت الإضافي
  if (daily.overtimeMinutes > 0 && shift.hourlyRate) {
    const multiplier = daily.isHoliday ? 2.0 : daily.isWeekend ? 1.5 : 1.25;
    daily.overtimeAmount = parseFloat(
      ((daily.overtimeMinutes / 60) * shift.hourlyRate * multiplier).toFixed(2)
    );
  }
}

/**
 * تحديد حالة الحضور
 */
async function determineStatus(daily, shift, employeeId) {
  // تحقق من إجازة معتمدة
  if (employeeId) {
    const leave = await LeaveRequest.findOne({
      employeeId,
      status: 'approved',
      startDate: { $lte: daily.workDate },
      endDate: { $gte: daily.workDate },
    });
    if (leave) {
      return { status: 'leave', leaveType: leave.leaveType };
    }
  }

  if (!daily.checkIn) return { status: 'absent', leaveType: null };

  if (shift) {
    const scheduledMinutes = (shift.durationHours || 8) * 60;
    if (daily.workedMinutes < scheduledMinutes / 2) {
      return { status: 'half_day', leaveType: null };
    }
  }

  if (daily.lateMinutes > 0) return { status: 'late', leaveType: null };

  return { status: 'present', leaveType: null };
}

// ─── معالجة السجلات ───────────────────────────────────────────────────────────

/**
 * معالجة سجل بصمة واحد وتحديث الملخص اليومي
 */
async function processLog(log) {
  const Employee = require('../models/Employee');
  const employee = await Employee.findById(log.employeeId);
  if (!employee) return null;

  const dateStr = toDateString(new Date(log.punchTime));

  // الحصول على أو إنشاء ملخص اليوم
  const shift = await getEmployeeShift(employee, dateStr);

  let daily = await DailyAttendance.findOne({
    employeeId: employee._id,
    workDate: new Date(dateStr),
  });

  if (!daily) {
    daily = new DailyAttendance({
      branchId: employee.branchId,
      employeeId: employee._id,
      shiftId: shift ? shift._id : null,
      workDate: new Date(dateStr),
      status: 'present',
    });
  }

  // تحديث وقت الدخول/الخروج
  const punchTime = new Date(log.punchTime);

  if (log.punchType === 'checkin') {
    if (!daily.checkIn || punchTime < new Date(daily.checkIn)) {
      daily.checkIn = punchTime;
    }
  } else if (log.punchType === 'checkout') {
    if (!daily.checkOut || punchTime > new Date(daily.checkOut)) {
      daily.checkOut = punchTime;
    }
  }

  // إعادة الحساب
  if (shift) {
    recalculate(daily, shift);
  }

  // تحديد الحالة
  const { status, leaveType } = await determineStatus(daily, shift, employee._id);
  daily.status = status;
  if (leaveType) daily.leaveType = leaveType;

  await daily.save();

  // تنبيهات
  await checkAndNotify(daily, employee);

  return daily;
}

/**
 * إرسال تنبيهات الحضور
 */
async function checkAndNotify(daily, employee) {
  try {
    const policy = await AttendancePolicyModel.findOne({
      branchId: employee.branchId,
      isActive: true,
    });

    if (!policy) return;

    if (daily.status === 'late' && policy.notifyManagerOnLate) {
      // يمكن استخدام نظام الإشعارات الموجود هنا
      console.log(`[Attendance] Employee ${employee._id} arrived late (${daily.lateMinutes} min)`);
    }

    if (daily.status === 'absent' && policy.notifyManagerOnAbsence) {
      console.log(`[Attendance] Employee ${employee._id} is absent on ${daily.workDate}`);
    }
  } catch (err) {
    console.error('[Attendance] Notify error:', err.message);
  }
}

/**
 * معالجة دفعة من السجلات
 */
async function processBatch(logs) {
  const results = { processed: 0, failed: 0, errors: [] };

  for (const log of logs) {
    try {
      const logDoc = log._id ? log : await AttendanceLog.findById(log.id || log._id);
      if (logDoc) {
        await processLog(logDoc);
        results.processed++;
      }
    } catch (err) {
      results.failed++;
      results.errors.push(err.message);
      console.error('[Attendance] Batch error:', err.message);
    }
  }

  return results;
}

/**
 * توليد تقرير حضور شهري
 */
async function generateMonthlyReport(branchId, year, month) {
  const Employee = require('../models/Employee');

  const dateFrom = new Date(year, month - 1, 1);
  const dateTo = new Date(year, month, 0, 23, 59, 59);

  const employees = await Employee.find({
    branchId,
    employmentStatus: 'active',
  }).select('_id name nameAr');

  const report = [];

  for (const emp of employees) {
    const attendances = await DailyAttendance.find({
      employeeId: emp._id,
      workDate: { $gte: dateFrom, $lte: dateTo },
    });

    // أيام العمل (استبعاد الجمعة والسبت)
    let workingDays = 0;
    const d = new Date(dateFrom);
    while (d <= dateTo) {
      if (d.getDay() !== 5 && d.getDay() !== 6) workingDays++;
      d.setDate(d.getDate() + 1);
    }

    report.push({
      employee: emp.name,
      employeeId: emp._id,
      workingDays,
      presentDays: attendances.filter(a => a.status === 'present').length,
      absentDays: attendances.filter(a => a.status === 'absent').length,
      lateDays: attendances.filter(a => (a.lateMinutes || 0) > 0).length,
      totalLateMin: attendances.reduce((s, a) => s + (a.lateMinutes || 0), 0),
      leaveDays: attendances.filter(a => a.status === 'leave').length,
      overtimeHours: parseFloat(
        (attendances.reduce((s, a) => s + (a.overtimeMinutes || 0), 0) / 60).toFixed(2)
      ),
      overtimeAmt: attendances.reduce((s, a) => s + (a.overtimeAmount || 0), 0),
    });
  }

  return report;
}

/**
 * قائمة سجلات الحضور اليومي مع فلترة
 */
async function list(filters = {}) {
  const { branchId, employeeId, status, dateFrom, dateTo, page = 1, perPage = 15 } = filters;

  const query = {};
  if (branchId) query.branchId = branchId;
  if (employeeId) query.employeeId = employeeId;
  if (status) query.status = status;
  if (dateFrom || dateTo) {
    query.workDate = {};
    if (dateFrom) query.workDate.$gte = new Date(dateFrom);
    if (dateTo) query.workDate.$lte = new Date(dateTo);
  }

  const [data, total] = await Promise.all([
    DailyAttendance.find(query)
      .populate('employeeId', 'name nameAr')
      .populate('shiftId', 'name nameAr')
      .sort({ workDate: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage),
    DailyAttendance.countDocuments(query),
  ]);

  return { data, total, page, perPage, pages: Math.ceil(total / perPage) };
}

/**
 * إحصائيات الحضور
 */
async function getStats(branchId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const [present, absent, late, onLeave] = await Promise.all([
    DailyAttendance.countDocuments({
      branchId,
      workDate: { $gte: today, $lte: todayEnd },
      status: 'present',
    }),
    DailyAttendance.countDocuments({
      branchId,
      workDate: { $gte: today, $lte: todayEnd },
      status: 'absent',
    }),
    DailyAttendance.countDocuments({
      branchId,
      workDate: { $gte: today, $lte: todayEnd },
      lateMinutes: { $gt: 0 },
    }),
    DailyAttendance.countDocuments({
      branchId,
      workDate: { $gte: today, $lte: todayEnd },
      status: 'leave',
    }),
  ]);

  return { present, absent, late, onLeave, date: today };
}

module.exports = {
  processLog,
  processBatch,
  generateMonthlyReport,
  list,
  getStats,
  getEmployeeShift,
  recalculate,
};
