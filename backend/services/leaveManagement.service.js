/**
 * LeaveManagement Service — خدمة إدارة الإجازات
 * النظام 37: الحضور البيومتري ZKTeco
 */
'use strict';

const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const DailyAttendance = require('../models/DailyAttendance');

// ─── الاستحقاق الافتراضي (نظام العمل السعودي) ──────────────────────────────

const DEFAULT_ENTITLEMENT = {
  annual: 21,
  sick: 30,
  maternity: 70,
  paternity: 3,
  hajj: 10,
  emergency: 3,
  study: 10,
  unpaid: 0,
};

/**
 * حساب أيام العمل (استبعاد الجمعة والسبت)
 */
function calculateWorkingDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let days = 0;

  const d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 5 && day !== 6) days++;
    d.setDate(d.getDate() + 1);
  }

  return days;
}

/**
 * الحصول على رصيد إجازة موظف
 */
async function getBalance(employeeId, leaveType) {
  const year = new Date().getFullYear();

  const balance = await LeaveBalance.findOne({ employeeId, leaveType, year });

  if (!balance) {
    return DEFAULT_ENTITLEMENT[leaveType] || 0;
  }

  return balance.balance;
}

/**
 * تحديث سجلات الحضور اليومية للإجازة المعتمدة
 */
async function markDailyAttendancesAsLeave(request) {
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);

  const d = new Date(start);
  while (d <= end) {
    await DailyAttendance.findOneAndUpdate(
      {
        employeeId: request.employeeId,
        workDate: new Date(d.toISOString().split('T')[0]),
        branchId: request.branchId,
      },
      {
        status: 'leave',
        leaveType: request.leaveType,
        leaveRequestId: request._id,
      },
      { upsert: true }
    );
    d.setDate(d.getDate() + 1);
  }
}

/**
 * تقديم طلب إجازة
 */
async function submitRequest(data) {
  const Employee = require('../models/HR/Employee');
  const employee = await Employee.findById(data.employeeId);
  if (!employee) throw new Error('الموظف غير موجود');

  const daysCount = calculateWorkingDays(data.startDate, data.endDate);

  // التحقق من الرصيد
  if (!['emergency', 'sick', 'unpaid'].includes(data.leaveType)) {
    const balance = await getBalance(data.employeeId, data.leaveType);
    if (balance < daysCount) {
      throw new Error(`رصيد الإجازة غير كافٍ (${balance} يوم متبقٍ، المطلوب ${daysCount} يوم)`);
    }
  }

  const currentBalance = await getBalance(data.employeeId, data.leaveType);

  const request = await LeaveRequest.create({
    branchId: employee.branchId,
    employeeId: employee._id,
    leaveType: data.leaveType,
    startDate: data.startDate,
    endDate: data.endDate,
    daysCount,
    hoursCount: data.hoursCount || null,
    startTime: data.startTime || null,
    endTime: data.endTime || null,
    reason: data.reason,
    notes: data.notes || null,
    status: 'pending',
    balanceBefore: currentBalance,
    createdBy: data.createdBy || null,
  });

  // تحديث الرصيد المعلق
  const year = new Date().getFullYear();
  await LeaveBalance.findOneAndUpdate(
    { employeeId: employee._id, leaveType: data.leaveType, year, branchId: employee.branchId },
    { $inc: { pending: daysCount } },
    { upsert: true }
  );

  return request;
}

/**
 * اعتماد طلب الإجازة
 */
async function approve(requestId, approverId) {
  const request = await LeaveRequest.findById(requestId);
  if (!request) throw new Error('طلب الإجازة غير موجود');
  if (request.status !== 'pending') throw new Error('الطلب ليس في حالة انتظار');

  request.status = 'approved';
  request.approvedBy = approverId;
  request.approvedAt = new Date();
  await request.save();

  const year = new Date().getFullYear();

  // خصم من الرصيد المعلق وإضافة للمستخدم
  await LeaveBalance.findOneAndUpdate(
    { employeeId: request.employeeId, leaveType: request.leaveType, year },
    {
      $inc: {
        pending: -request.daysCount,
        used: request.daysCount,
        balance: -request.daysCount,
      },
    }
  );

  // تحديث رصيد ما بعد
  const newBalance = await getBalance(request.employeeId, request.leaveType);
  request.isDeducted = true;
  request.balanceAfter = newBalance;
  await request.save();

  // تحديث سجلات الحضور
  await markDailyAttendancesAsLeave(request);

  return request;
}

/**
 * رفض طلب الإجازة
 */
async function reject(requestId, reason, rejectorId) {
  const request = await LeaveRequest.findById(requestId);
  if (!request) throw new Error('طلب الإجازة غير موجود');

  request.status = 'rejected';
  request.rejectionReason = reason;
  request.approvedBy = rejectorId;
  request.approvedAt = new Date();
  await request.save();

  // إعادة الرصيد المعلق
  const year = new Date().getFullYear();
  await LeaveBalance.findOneAndUpdate(
    { employeeId: request.employeeId, leaveType: request.leaveType, year },
    { $inc: { pending: -request.daysCount } }
  );

  return request;
}

/**
 * قائمة طلبات الإجازة مع فلترة
 */
async function list(filters = {}) {
  const {
    branchId,
    employeeId,
    status,
    leaveType,
    dateFrom,
    dateTo,
    page = 1,
    perPage = 15,
  } = filters;

  const query = {};
  if (branchId) query.branchId = branchId;
  if (employeeId) query.employeeId = employeeId;
  if (status) query.status = status;
  if (leaveType) query.leaveType = leaveType;
  if (dateFrom) query.startDate = { $gte: new Date(dateFrom) };
  if (dateTo) query.endDate = { $lte: new Date(dateTo) };

  const [data, total] = await Promise.all([
    LeaveRequest.find(query)
      .populate('employeeId', 'name nameAr')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage),
    LeaveRequest.countDocuments(query),
  ]);

  return { data, total, page, perPage, pages: Math.ceil(total / perPage) };
}

/**
 * إحصائيات الإجازات
 */
async function getStats(branchId) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const [pendingRequests, approvedThisMonth, onLeaveToday, totalAbsentToday] = await Promise.all([
    LeaveRequest.countDocuments({ branchId, status: 'pending' }),
    LeaveRequest.countDocuments({
      branchId,
      status: 'approved',
      startDate: { $gte: monthStart, $lte: monthEnd },
    }),
    DailyAttendance.countDocuments({
      branchId,
      workDate: { $gte: today, $lte: todayEnd },
      status: 'leave',
    }),
    DailyAttendance.countDocuments({
      branchId,
      workDate: { $gte: today, $lte: todayEnd },
      status: 'absent',
    }),
  ]);

  return { pendingRequests, approvedThisMonth, onLeaveToday, totalAbsentToday };
}

/**
 * تهيئة أرصدة الإجازات السنوية للموظفين
 */
async function initializeYearlyBalances(branchId, year) {
  const Employee = require('../models/HR/Employee');
  const employees = await Employee.find({ branchId, employmentStatus: 'active' });

  for (const emp of employees) {
    for (const [leaveType, entitlement] of Object.entries(DEFAULT_ENTITLEMENT)) {
      if (entitlement > 0) {
        await LeaveBalance.findOneAndUpdate(
          { employeeId: emp._id, leaveType, year, branchId },
          {
            $setOnInsert: {
              entitlement,
              balance: entitlement,
              used: 0,
              pending: 0,
              carriedForward: 0,
            },
          },
          { upsert: true }
        );
      }
    }
  }
}

module.exports = {
  submitRequest,
  approve,
  reject,
  getBalance,
  list,
  getStats,
  initializeYearlyBalances,
  calculateWorkingDays,
};
