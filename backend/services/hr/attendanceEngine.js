/**
 * AttendanceEngine - محرك الحضور والانصراف الموحد
 * ═══════════════════════════════════════════════════════════════════
 * المحرك المركزي الذي يوحد جميع عمليات الحضور والانصراف:
 *  - تسجيل الدخول/الخروج (يدوي + بايومتري)
 *  - ربط مع ورديات العمل (WorkShift)
 *  - حساب التأخير والخروج المبكر والساعات الإضافية
 *  - تقارير يومية/شهرية/شاملة
 *  - إدارة التصحيحات والموافقات
 *  - إحصائيات لوحة التحكم
 *
 * يستخدم SmartAttendance كمصدر وحيد للبيانات (Single Source of Truth)
 *
 * @module services/hr/attendanceEngine
 */

const SmartAttendance = require('../../models/advanced_attendance.model');
const WorkShift = require('../../models/workShift.model');
const Employee = require('../../models/employee.model');
const logger = require('../../utils/logger');

class AttendanceEngine {
  // ═══════════════════════════════════════════════
  //  تسجيل الحضور والانصراف
  // ═══════════════════════════════════════════════

  /**
   * تسجيل حضور موظف (Check-In)
   * يدعم التسجيل اليدوي، من الموقع، من الجهاز، أو عبر API
   */
  static async checkIn(employeeId, data = {}) {
    const employee = await Employee.findById(employeeId).select('fullName department position');
    if (!employee) throw new Error('الموظف غير موجود');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // التحقق من عدم وجود سجل مسبق
    const existing = await SmartAttendance.findOne({
      employeeId,
      date: today,
      isDeleted: false,
    });

    if (existing && existing.checkInTime) {
      return {
        success: false,
        message: 'تم تسجيل الحضور بالفعل اليوم',
        record: this._formatRecord(existing),
      };
    }

    // جلب وردية الموظف
    const shift = await WorkShift.getEmployeeShift(employeeId, employee.department);
    const now = new Date();

    // حساب التأخير
    let latenessInfo = { isLate: false, lateMinutes: 0, deduction: null };
    if (shift) {
      latenessInfo = shift.calculateLateness(now);
    }

    // تحديد الحالة
    let attendanceStatus = 'present';
    if (latenessInfo.isAbsent) {
      attendanceStatus = 'absent';
    } else if (latenessInfo.isLate) {
      attendanceStatus = 'late_arrival';
    }

    const checkInData = {
      employeeId,
      date: today,
      checkInTime: now,
      checkInMethod: data.method || 'web_portal',
      checkInLocation: data.location || undefined,
      checkInDevice: data.device || undefined,
      checkInNotes: data.notes || undefined,
      attendanceStatus,
      departmentAtTimeOfAttendance: employee.department,
      lateness: {
        minutes: latenessInfo.lateMinutes,
        isLate: latenessInfo.isLate,
        reason: data.lateReason || undefined,
      },
      approvalStatus: latenessInfo.isLate ? 'pending' : 'approved',
    };

    let record;
    if (existing) {
      // تحديث سجل موجود (مثلاً أُنشئ من ZKTeco بدون حضور)
      Object.assign(existing, checkInData);
      record = await existing.save();
    } else {
      record = await new SmartAttendance(checkInData).save();
    }

    logger.info(
      `Attendance: ${employee.fullName} checked in at ${now.toLocaleTimeString('ar-SA')} ` +
        `[${data.method || 'web_portal'}] ${latenessInfo.isLate ? `(متأخر ${latenessInfo.lateMinutes} دقيقة)` : ''}`
    );

    return {
      success: true,
      message: latenessInfo.isLate
        ? `تم تسجيل الحضور (متأخر ${latenessInfo.lateMinutes} دقيقة)`
        : 'تم تسجيل الحضور بنجاح',
      record: this._formatRecord(record),
      shift: shift ? { name: shift.shiftName, start: shift.startTime, end: shift.endTime } : null,
      lateness: latenessInfo,
    };
  }

  /**
   * تسجيل انصراف موظف (Check-Out)
   */
  static async checkOut(employeeId, data = {}) {
    const employee = await Employee.findById(employeeId).select('fullName department');
    if (!employee) throw new Error('الموظف غير موجود');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await SmartAttendance.findOne({
      employeeId,
      date: today,
      isDeleted: false,
    });

    if (!record) {
      throw new Error('لم يتم تسجيل حضور الموظف اليوم');
    }

    if (record.checkOutTime) {
      return {
        success: false,
        message: 'تم تسجيل الانصراف بالفعل',
        record: this._formatRecord(record),
      };
    }

    const now = new Date();
    record.checkOutTime = now;
    record.checkOutMethod = data.method || 'web_portal';
    record.checkOutLocation = data.location || undefined;
    record.checkOutDevice = data.device || undefined;
    record.checkOutNotes = data.notes || undefined;

    // جلب الوردية لحساب الخروج المبكر والإضافي
    const shift = await WorkShift.getEmployeeShift(employeeId, employee.department);

    let earlyLeaveInfo = { isEarlyLeave: false, earlyMinutes: 0 };
    let overtimeInfo = { hasOvertime: false, minutes: 0 };

    if (shift) {
      earlyLeaveInfo = shift.calculateEarlyLeave(now);
      overtimeInfo = shift.calculateOvertime(record.checkInTime, now);
    }

    if (earlyLeaveInfo.isEarlyLeave) {
      record.earlyLeave = {
        minutes: earlyLeaveInfo.earlyMinutes,
        isEarlyLeave: true,
        reason: data.earlyLeaveReason || undefined,
      };
      if (record.attendanceStatus === 'present') {
        record.attendanceStatus = 'early_departure';
      }
    }

    await record.save();

    logger.info(
      `Attendance: ${employee.fullName} checked out at ${now.toLocaleTimeString('ar-SA')} ` +
        `[${data.method || 'web_portal'}]`
    );

    return {
      success: true,
      message: earlyLeaveInfo.isEarlyLeave
        ? `تم تسجيل الانصراف (خروج مبكر ${earlyLeaveInfo.earlyMinutes} دقيقة)`
        : 'تم تسجيل الانصراف بنجاح',
      record: this._formatRecord(record),
      overtime: overtimeInfo,
      earlyLeave: earlyLeaveInfo,
    };
  }

  // ═══════════════════════════════════════════════
  //  حالة اليوم
  // ═══════════════════════════════════════════════

  /**
   * حالة حضور الموظف اليوم
   */
  static async getTodayStatus(employeeId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await SmartAttendance.findOne({
      employeeId,
      date: today,
      isDeleted: false,
    }).populate('employeeId', 'fullName department position');

    const shift = await WorkShift.getEmployeeShift(employeeId);

    return {
      hasRecord: !!record,
      isCheckedIn: !!(record && record.checkInTime),
      isCheckedOut: !!(record && record.checkOutTime),
      record: record ? this._formatRecord(record) : null,
      shift: shift
        ? {
            name: shift.shiftName,
            code: shift.shiftCode,
            startTime: shift.startTime,
            endTime: shift.endTime,
            type: shift.shiftType,
            color: shift.color,
          }
        : null,
      serverTime: new Date(),
    };
  }

  // ═══════════════════════════════════════════════
  //  سجلات الحضور (Employee Records)
  // ═══════════════════════════════════════════════

  /**
   * سجلات حضور موظف خلال فترة
   */
  static async getEmployeeRecords(employeeId, options = {}) {
    const { startDate, endDate, month, year, limit = 31, page = 1, status } = options;

    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (month && year) {
      dateQuery = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59),
      };
    } else {
      // آخر 30 يوم
      const from = new Date();
      from.setDate(from.getDate() - 30);
      dateQuery = { $gte: from };
    }

    const query = { employeeId, date: dateQuery, isDeleted: false };
    if (status) query.attendanceStatus = status;

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      SmartAttendance.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('employeeId', 'fullName department position')
        .lean(),
      SmartAttendance.countDocuments(query),
    ]);

    return {
      records: records.map(r => this._formatRecord(r)),
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  // ═══════════════════════════════════════════════
  //  لوحة التحكم اليومية
  // ═══════════════════════════════════════════════

  /**
   * بيانات لوحة التحكم اليومية
   * يعيد إحصائيات + سجلات الحضور لجميع الموظفين لليوم المحدد
   */
  static async getDailyDashboard(date, options = {}) {
    const { department, status, search, page = 1, limit = 50 } = options;

    const targetDate = new Date(date || new Date());
    targetDate.setHours(0, 0, 0, 0);

    // بناء الاستعلام
    const query = { date: targetDate, isDeleted: false };
    if (status) query.attendanceStatus = status;
    if (department) query.departmentAtTimeOfAttendance = department;

    const skip = (page - 1) * limit;

    // جلب البيانات بالتوازي
    const [records, totalEmployees] = await Promise.all([
      SmartAttendance.find(query)
        .sort({ checkInTime: -1 })
        .skip(skip)
        .limit(limit)
        .populate('employeeId', 'fullName department position employeeNumber avatar')
        .lean(),
      Employee.countDocuments({ status: 'active' }),
    ]);

    // تصفية بالبحث
    let filteredRecords = records;
    if (search) {
      const s = search.toLowerCase();
      filteredRecords = records.filter(
        r =>
          r.employeeId?.fullName?.toLowerCase().includes(s) ||
          r.employeeId?.employeeNumber?.includes(s)
      );
    }

    // إحصائيات اليوم
    const statsAgg = await SmartAttendance.aggregate([
      { $match: { date: targetDate, isDeleted: false } },
      {
        $group: {
          _id: '$attendanceStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusCounts = {};
    statsAgg.forEach(s => {
      statusCounts[s._id] = s.count;
    });

    const presentCount =
      (statusCounts.present || 0) +
      (statusCounts.late_arrival || 0) +
      (statusCounts.early_departure || 0);

    // إحصائيات التأخير
    const lateStats = await SmartAttendance.aggregate([
      { $match: { date: targetDate, isDeleted: false, 'lateness.isLate': true } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalMinutes: { $sum: '$lateness.minutes' },
          avgMinutes: { $avg: '$lateness.minutes' },
        },
      },
    ]);

    // إحصائيات طريقة التسجيل
    const methodStats = await SmartAttendance.aggregate([
      { $match: { date: targetDate, isDeleted: false } },
      {
        $group: {
          _id: '$checkInMethod',
          count: { $sum: 1 },
        },
      },
    ]);

    const methodCounts = {};
    methodStats.forEach(m => {
      methodCounts[m._id] = m.count;
    });

    const total = await SmartAttendance.countDocuments(query);

    return {
      date: targetDate,
      records: filteredRecords.map(r => this._formatRecord(r)),
      stats: {
        totalEmployees,
        totalRecords: statsAgg.reduce((s, x) => s + x.count, 0),
        present: presentCount,
        absent: statusCounts.absent || 0,
        late: statusCounts.late_arrival || 0,
        earlyLeave: statusCounts.early_departure || 0,
        onLeave: statusCounts.on_leave || 0,
        halfDay: statusCounts.half_day || 0,
        workFromHome: statusCounts.work_from_home || 0,
        attendanceRate:
          totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0,
      },
      lateStats: lateStats[0] || { count: 0, totalMinutes: 0, avgMinutes: 0 },
      checkInMethods: methodCounts,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    };
  }

  // ═══════════════════════════════════════════════
  //  التقارير
  // ═══════════════════════════════════════════════

  /**
   * تقرير حضور شهري لموظف
   */
  static async getMonthlyReport(employeeId, month, year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const records = await SmartAttendance.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    })
      .sort({ date: 1 })
      .lean();

    // حساب الإحصائيات
    const shift = await WorkShift.getEmployeeShift(employeeId);
    const workDays = this._getWorkingDaysCount(month, year, shift);

    const summary = {
      totalWorkDays: workDays,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      earlyLeaveDays: 0,
      halfDays: 0,
      leaveDays: 0,
      workFromHomeDays: 0,
      totalWorkMinutes: 0,
      totalOvertimeMinutes: 0,
      totalLateMinutes: 0,
      totalEarlyLeaveMinutes: 0,
    };

    records.forEach(r => {
      switch (r.attendanceStatus) {
        case 'present':
          summary.presentDays++;
          break;
        case 'absent':
          summary.absentDays++;
          break;
        case 'late_arrival':
          summary.lateDays++;
          summary.presentDays++; // المتأخر حاضر أيضاً
          break;
        case 'early_departure':
          summary.earlyLeaveDays++;
          summary.presentDays++;
          break;
        case 'on_leave':
          summary.leaveDays++;
          break;
        case 'half_day':
          summary.halfDays++;
          break;
        case 'work_from_home':
          summary.workFromHomeDays++;
          summary.presentDays++;
          break;
      }

      if (r.workDuration?.totalMinutes) summary.totalWorkMinutes += r.workDuration.totalMinutes;
      if (r.workDuration?.totalHours?.overtime)
        summary.totalOvertimeMinutes += r.workDuration.totalHours.overtime * 60;
      if (r.lateness?.minutes) summary.totalLateMinutes += r.lateness.minutes;
      if (r.earlyLeave?.minutes) summary.totalEarlyLeaveMinutes += r.earlyLeave.minutes;
    });

    summary.attendancePercentage =
      workDays > 0 ? Math.round((summary.presentDays / workDays) * 100) : 0;
    summary.totalWorkHours = Math.round((summary.totalWorkMinutes / 60) * 100) / 100;
    summary.totalOvertimeHours = Math.round((summary.totalOvertimeMinutes / 60) * 100) / 100;

    return {
      employeeId,
      month,
      year,
      period: `${month}/${year}`,
      shift: shift ? { name: shift.shiftName, code: shift.shiftCode } : null,
      records: records.map(r => this._formatRecord(r)),
      summary,
    };
  }

  /**
   * تقرير شامل (جميع الموظفين / قسم)
   */
  static async getComprehensiveReport(startDate, endDate, options = {}) {
    const { department } = options;
    const from = new Date(startDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(endDate);
    to.setHours(23, 59, 59, 999);

    const matchStage = { date: { $gte: from, $lte: to }, isDeleted: false };
    if (department) matchStage.departmentAtTimeOfAttendance = new (require('mongoose').Types.ObjectId)(department);

    const [statusAgg, deptAgg, methodAgg, lateAgg, dailyAgg] = await Promise.all([
      // توزيع الحالات
      SmartAttendance.aggregate([
        { $match: matchStage },
        { $group: { _id: '$attendanceStatus', count: { $sum: 1 } } },
      ]),

      // توزيع حسب القسم
      SmartAttendance.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: 'employees',
            localField: 'employeeId',
            foreignField: '_id',
            as: 'emp',
          },
        },
        { $unwind: { path: '$emp', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$emp.department',
            total: { $sum: 1 },
            present: {
              $sum: {
                $cond: [
                  { $in: ['$attendanceStatus', ['present', 'late_arrival', 'early_departure']] },
                  1,
                  0,
                ],
              },
            },
            absent: { $sum: { $cond: [{ $eq: ['$attendanceStatus', 'absent'] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ['$attendanceStatus', 'late_arrival'] }, 1, 0] } },
          },
        },
        { $sort: { total: -1 } },
      ]),

      // توزيع طرق التسجيل
      SmartAttendance.aggregate([
        { $match: matchStage },
        { $group: { _id: '$checkInMethod', count: { $sum: 1 } } },
      ]),

      // تحليل التأخير
      SmartAttendance.aggregate([
        { $match: { ...matchStage, 'lateness.isLate': true } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalMinutes: { $sum: '$lateness.minutes' },
            avgMinutes: { $avg: '$lateness.minutes' },
            maxMinutes: { $max: '$lateness.minutes' },
          },
        },
      ]),

      // اتجاه يومي
      SmartAttendance.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            total: { $sum: 1 },
            present: {
              $sum: {
                $cond: [
                  { $in: ['$attendanceStatus', ['present', 'late_arrival', 'early_departure']] },
                  1,
                  0,
                ],
              },
            },
            late: { $sum: { $cond: [{ $eq: ['$attendanceStatus', 'late_arrival'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const statusMap = {};
    statusAgg.forEach(s => {
      statusMap[s._id] = s.count;
    });

    const totalRecords = statusAgg.reduce((s, x) => s + x.count, 0);
    const totalPresent =
      (statusMap.present || 0) + (statusMap.late_arrival || 0) + (statusMap.early_departure || 0);

    return {
      period: { from, to },
      summary: {
        totalRecords,
        present: totalPresent,
        absent: statusMap.absent || 0,
        late: statusMap.late_arrival || 0,
        earlyLeave: statusMap.early_departure || 0,
        onLeave: statusMap.on_leave || 0,
        workFromHome: statusMap.work_from_home || 0,
        attendanceRate: totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0,
      },
      lateAnalysis: lateAgg[0] || { count: 0, totalMinutes: 0, avgMinutes: 0, maxMinutes: 0 },
      byDepartment: deptAgg,
      byMethod: methodAgg.reduce((m, x) => ({ ...m, [x._id]: x.count }), {}),
      dailyTrend: dailyAgg,
    };
  }

  // ═══════════════════════════════════════════════
  //  التصحيحات والموافقات
  // ═══════════════════════════════════════════════

  /**
   * تعديل سجل حضور
   */
  static async updateRecord(recordId, updates, userId) {
    const record = await SmartAttendance.findById(recordId);
    if (!record) throw new Error('السجل غير موجود');

    // حفظ سجل التعديل
    const changes = [];
    const allowedFields = [
      'checkInTime',
      'checkOutTime',
      'attendanceStatus',
      'checkInNotes',
      'checkOutNotes',
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined && String(updates[field]) !== String(record[field])) {
        changes.push({
          modifiedBy: userId,
          modificationDate: new Date(),
          fieldChanged: field,
          oldValue: record[field],
          newValue: updates[field],
          reason: updates.reason || 'تعديل يدوي',
        });
        record[field] = updates[field];
      }
    }

    if (changes.length === 0) {
      return { success: false, message: 'لا توجد تغييرات' };
    }

    if (!record.modificationHistory) record.modificationHistory = [];
    record.modificationHistory.push(...changes);
    record.approvalStatus = 'pending';

    await record.save();

    logger.info(`Attendance: Record ${recordId} updated by user ${userId}: ${changes.length} changes`);

    return {
      success: true,
      message: 'تم تعديل السجل بنجاح',
      changes: changes.length,
      record: this._formatRecord(record),
    };
  }

  /**
   * الموافقة على سجل
   */
  static async approveRecord(recordId, userId, notes) {
    const record = await SmartAttendance.findById(recordId);
    if (!record) throw new Error('السجل غير موجود');

    record.approvalStatus = 'approved';
    record.approvedBy = userId;
    record.approvalDate = new Date();
    record.approvalNotes = notes;
    await record.save();

    return { success: true, message: 'تمت الموافقة على السجل' };
  }

  /**
   * رفض سجل
   */
  static async rejectRecord(recordId, userId, reason) {
    const record = await SmartAttendance.findById(recordId);
    if (!record) throw new Error('السجل غير موجود');

    record.approvalStatus = 'rejected';
    record.approvedBy = userId;
    record.approvalDate = new Date();
    record.approvalNotes = reason;
    await record.save();

    return { success: true, message: 'تم رفض السجل' };
  }

  /**
   * السجلات المعلقة (تحتاج موافقة)
   */
  static async getPendingApprovals(options = {}) {
    const { department, page = 1, limit = 50 } = options;

    const query = { approvalStatus: 'pending', isDeleted: false };
    if (department) query.departmentAtTimeOfAttendance = department;

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      SmartAttendance.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('employeeId', 'fullName department position employeeNumber')
        .lean(),
      SmartAttendance.countDocuments(query),
    ]);

    return {
      records: records.map(r => this._formatRecord(r)),
      pagination: { total, page, pages: Math.ceil(total / limit) },
    };
  }

  // ═══════════════════════════════════════════════
  //  إدارة الورديات
  // ═══════════════════════════════════════════════

  /**
   * جلب جميع الورديات
   */
  static async getShifts() {
    return WorkShift.find({ isActive: true }).sort({ priority: -1, shiftName: 1 }).lean();
  }

  /**
   * إنشاء وردية جديدة
   */
  static async createShift(data, userId) {
    const shift = new WorkShift({ ...data, createdBy: userId });
    await shift.save();
    logger.info(`Attendance: New shift created: ${shift.shiftName} (${shift.shiftCode})`);
    return shift;
  }

  /**
   * تعديل وردية
   */
  static async updateShift(shiftId, data, userId) {
    const shift = await WorkShift.findById(shiftId);
    if (!shift) throw new Error('الوردية غير موجودة');
    Object.assign(shift, data, { updatedBy: userId });
    await shift.save();
    return shift;
  }

  /**
   * تعيين وردية لقسم أو موظف
   */
  static async assignShift(shiftId, targetType, targetId, targetName, userId) {
    return WorkShift.assignShift(shiftId, targetType, targetId, targetName, userId);
  }

  /**
   * جلب وردية موظف
   */
  static async getEmployeeShift(employeeId) {
    const employee = await Employee.findById(employeeId).select('department');
    const shift = await WorkShift.getEmployeeShift(employeeId, employee?.department);
    return shift;
  }

  // ═══════════════════════════════════════════════
  //  الإحصائيات و الملخصات
  // ═══════════════════════════════════════════════

  /**
   * إحصائيات سريعة لوحة التحكم
   */
  static async getQuickStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayStats, weeklyTrend, totalEmployees, biometricToday] = await Promise.all([
      SmartAttendance.aggregate([
        { $match: { date: today, isDeleted: false } },
        {
          $group: {
            _id: '$attendanceStatus',
            count: { $sum: 1 },
          },
        },
      ]),

      SmartAttendance.aggregate([
        {
          $match: {
            date: { $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            present: {
              $sum: {
                $cond: [
                  { $in: ['$attendanceStatus', ['present', 'late_arrival', 'early_departure']] },
                  1,
                  0,
                ],
              },
            },
            total: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      Employee.countDocuments({ status: 'active' }),

      SmartAttendance.countDocuments({
        date: today,
        checkInMethod: 'biometric',
        isDeleted: false,
      }),
    ]);

    const todayMap = {};
    todayStats.forEach(s => {
      todayMap[s._id] = s.count;
    });
    const todayPresent =
      (todayMap.present || 0) + (todayMap.late_arrival || 0) + (todayMap.early_departure || 0);

    return {
      today: {
        date: today,
        totalEmployees,
        present: todayPresent,
        absent: todayMap.absent || 0,
        late: todayMap.late_arrival || 0,
        onLeave: todayMap.on_leave || 0,
        biometric: biometricToday,
        attendanceRate: totalEmployees > 0 ? Math.round((todayPresent / totalEmployees) * 100) : 0,
      },
      weeklyTrend,
    };
  }

  // ═══════════════════════════════════════════════
  //  Helpers الداخلية
  // ═══════════════════════════════════════════════

  /**
   * تنسيق سجل الحضور للإخراج
   */
  static _formatRecord(record) {
    const r = record.toObject ? record.toObject() : record;
    return {
      _id: r._id,
      employeeId: r.employeeId,
      date: r.date,
      checkInTime: r.checkInTime,
      checkOutTime: r.checkOutTime,
      checkInMethod: r.checkInMethod,
      checkOutMethod: r.checkOutMethod,
      attendanceStatus: r.attendanceStatus,
      approvalStatus: r.approvalStatus,
      lateness: r.lateness,
      earlyLeave: r.earlyLeave,
      workDuration: r.workDuration,
      workDurationReadable: r.workDurationReadable,
      checkInDevice: r.checkInDevice,
      checkOutDevice: r.checkOutDevice,
      checkInNotes: r.checkInNotes,
      checkOutNotes: r.checkOutNotes,
      intelligenceFlags: r.intelligenceFlags,
      modificationHistory: r.modificationHistory,
    };
  }

  /**
   * حساب أيام العمل في شهر
   */
  static _getWorkingDaysCount(month, year, shift) {
    const daysOff = shift?.workDays
      ? ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].filter(
          d => !shift.workDays.includes(d)
        )
      : ['friday', 'saturday'];

    const dayIndexMap = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    const offIndices = daysOff.map(d => dayIndexMap[d]);

    let count = 0;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (!offIndices.includes(d.getDay())) count++;
    }
    return count;
  }
}

module.exports = AttendanceEngine;
