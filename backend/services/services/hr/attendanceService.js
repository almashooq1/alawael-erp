/**
 * HR Attendance Service - خدمة الحضور والغياب المتقدمة
 * إدارة شاملة لنظام الحضور والغياب والإجازات
 */

const Employee = require('../models/employee.model');
const Attendance = require('../models/attendance.model');
const Leave = require('../models/leave.model');

class HRAttendanceService {
  /**
   * تسجيل الحضور
   */
  static async recordAttendance(employeeId, attendanceData) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // التحقق من عدم التسجيل المكرر
      const existingRecord = await Attendance.findOne({
        employeeId,
        date: today,
      });

      if (existingRecord) {
        return {
          success: false,
          message: 'تم تسجيل الحضور بالفعل اليوم',
          record: existingRecord,
        };
      }

      const attendance = new Attendance({
        employeeId,
        date: today,
        checkInTime: attendanceData.checkInTime || new Date(),
        checkOutTime: attendanceData.checkOutTime,
        location: attendanceData.location,
        device: attendanceData.device || 'mobile',
        status: attendanceData.status || 'present',
        notes: attendanceData.notes,
        workHours: this.calculateWorkHours(attendanceData.checkInTime, attendanceData.checkOutTime),
        overtime: this.calculateOvertime(attendanceData.checkInTime, attendanceData.checkOutTime),
      });

      await attendance.save();

      // تحديث إحصائيات الموظف
      if (!employee.attendance) {
        employee.attendance = {
          totalPresent: 0,
          totalAbsent: 0,
          totalLate: 0,
          totalEarlyLeave: 0,
          totalOvertime: 0,
        };
      }

      if (attendance.status === 'present') employee.attendance.totalPresent += 1;
      if (attendance.status === 'absent') employee.attendance.totalAbsent += 1;
      if (attendance.status === 'late') employee.attendance.totalLate += 1;

      if (attendance.overtime > 0) {
        employee.attendance.totalOvertime += attendance.overtime;
      }

      employee.attendance.lastAttendanceUpdate = new Date();
      await employee.save();

      return {
        success: true,
        message: 'تم تسجيل الحضور بنجاح',
        attendance,
      };
    } catch (error) {
      throw new Error(`خطأ في تسجيل الحضور: ${error.message}`);
    }
  }

  /**
   * تسجيل الخروج
   */
  static async recordCheckOut(employeeId, checkOutData) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const attendance = await Attendance.findOne({
        employeeId,
        date: today,
      });

      if (!attendance) {
        throw new Error('لم يتم تسجيل دخول الموظف اليوم');
      }

      attendance.checkOutTime = new Date();
      attendance.workHours = this.calculateWorkHours(
        attendance.checkInTime,
        attendance.checkOutTime
      );
      attendance.overtime = this.calculateOvertime(attendance.checkInTime, attendance.checkOutTime);
      attendance.notes = checkOutData.notes || attendance.notes;

      await attendance.save();

      return {
        success: true,
        message: 'تم تسجيل الخروج بنجاح',
        attendance,
      };
    } catch (error) {
      throw new Error(`خطأ في تسجيل الخروج: ${error.message}`);
    }
  }

  /**
   * طلب إجازة
   */
  static async requestLeave(leaveData) {
    try {
      const employee = await Employee.findById(leaveData.employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      // التحقق من أيام الإجازة المتاحة
      const availableDays = this.getAvailableLeaveDays(employee, leaveData.type);
      const requestedDays = this.calculateLeaveDays(leaveData.startDate, leaveData.endDate);

      if (requestedDays > availableDays) {
        return {
          success: false,
          message: `الأيام المطلوبة (${requestedDays}) أكثر من المتاح (${availableDays})`,
          availableDays,
          requestedDays,
        };
      }

      const leave = new Leave({
        employeeId: leaveData.employeeId,
        type: leaveData.type, // 'annual', 'sick', 'personal', 'emergency'
        startDate: new Date(leaveData.startDate),
        endDate: new Date(leaveData.endDate),
        days: requestedDays,
        reason: leaveData.reason,
        attachment: leaveData.attachment, // للإجازات الطبية
        status: 'pending',
        requestDate: new Date(),
      });

      await leave.save();

      return {
        success: true,
        message: 'تم تقديم طلب الإجازة بنجاح',
        leaveId: leave._id,
        leave,
      };
    } catch (error) {
      throw new Error(`خطأ في طلب الإجازة: ${error.message}`);
    }
  }

  /**
   * الموافقة على الإجازة
   */
  static async approveLeave(leaveId, approverData) {
    try {
      const leave = await Leave.findByIdAndUpdate(
        leaveId,
        {
          status: 'approved',
          approvedBy: approverData.approvedBy,
          approvedDate: new Date(),
          approvalNotes: approverData.notes,
        },
        { new: true }
      );

      if (!leave) throw new Error('الإجازة غير موجودة');

      // تحديث أيام الإجازة المستخدمة
      const employee = await Employee.findById(leave.employeeId);
      if (!employee.benefits) employee.benefits = {};

      if (leave.type === 'annual') {
        if (!employee.benefits.annualLeaveUsed) employee.benefits.annualLeaveUsed = 0;
        employee.benefits.annualLeaveUsed += leave.days;
      } else if (leave.type === 'sick') {
        if (!employee.benefits.sickLeaveUsed) employee.benefits.sickLeaveUsed = 0;
        employee.benefits.sickLeaveUsed += leave.days;
      }

      await employee.save();

      return {
        success: true,
        message: 'تم الموافقة على الإجازة',
        leave,
      };
    } catch (error) {
      throw new Error(`خطأ في الموافقة: ${error.message}`);
    }
  }

  /**
   * رفض الإجازة
   */
  static async rejectLeave(leaveId, rejectionData) {
    try {
      const leave = await Leave.findByIdAndUpdate(
        leaveId,
        {
          status: 'rejected',
          rejectedBy: rejectionData.rejectedBy,
          rejectedDate: new Date(),
          rejectionReason: rejectionData.reason,
        },
        { new: true }
      );

      if (!leave) throw new Error('الإجازة غير موجودة');

      return {
        success: true,
        message: 'تم رفض الإجازة',
        leave,
      };
    } catch (error) {
      throw new Error(`خطأ في الرفض: ${error.message}`);
    }
  }

  /**
   * جلب طلبات الإجازة المعلقة
   */
  static async getPendingLeaveRequests(options = {}) {
    try {
      const { departmentFilter = null, limit = 50, page = 1 } = options;

      let query = { status: 'pending' };

      if (departmentFilter) {
        const employees = await Employee.find({ department: departmentFilter });
        query.employeeId = { $in: employees.map(e => e._id) };
      }

      const skip = (page - 1) * limit;

      const leaves = await Leave.find(query)
        .populate('employeeId', 'fullName position department')
        .sort({ requestDate: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Leave.countDocuments(query);

      return {
        leaves,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
        summary: {
          totalPending: total,
          urgent: leaves.filter(
            l => (new Date(l.startDate) - new Date()) / (1000 * 60 * 60 * 24) < 3
          ).length,
        },
      };
    } catch (error) {
      throw new Error(`خطأ في جلب الطلبات: ${error.message}`);
    }
  }

  /**
   * جلب سجل الحضور الشهري
   */
  static async getMonthlyAttendanceReport(employeeId, month, year) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const attendanceRecords = await Attendance.find({
        employeeId,
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      }).sort({ date: 1 });

      const summary = {
        totalDays: this.getWorkingDays(month, year),
        presentDays: attendanceRecords.filter(a => a.status === 'present').length,
        absentDays: attendanceRecords.filter(a => a.status === 'absent').length,
        lateDays: attendanceRecords.filter(a => a.status === 'late').length,
        earlyLeaveDays: attendanceRecords.filter(a => a.status === 'early_leave').length,
        totalWorkHours: attendanceRecords.reduce((sum, a) => sum + (a.workHours || 0), 0),
        totalOvertimeHours: attendanceRecords.reduce((sum, a) => sum + (a.overtime || 0), 0),
        attendancePercentage: Math.round(
          (attendanceRecords.filter(a => a.status === 'present').length /
            this.getWorkingDays(month, year)) *
            100
        ),
      };

      return {
        employeeId,
        month: `${month}/${year}`,
        records: attendanceRecords,
        summary,
      };
    } catch (error) {
      throw new Error(`خطأ في جلب التقرير: ${error.message}`);
    }
  }

  /**
   * تحليل أنماط الغياب
   */
  static async analyzeAbsencePatterns(employeeId, months = 3) {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const attendanceRecords = await Attendance.find({
        employeeId,
        date: { $gte: startDate },
      }).sort({ date: -1 });

      const absences = attendanceRecords.filter(a => a.status === 'absent');

      // حساب النمط
      const pattern = {
        frequentDaysWeek: this.findMostFrequentDays(absences),
        frequentWeeks: this.findMostFrequentWeeks(absences),
        isRepetitive: this.checkIfRepetitive(absences),
        averageAbsencesPerMonth: Math.round((absences.length / months) * 100) / 100,
      };

      // تحذيرات
      const warnings = [];
      if (absences.length > 8 && months === 3) {
        warnings.push('معدل غياب مرتفع: أكثر من 8 أيام في 3 أشهر');
      }
      if (pattern.frequentDaysWeek.length > 0) {
        warnings.push(`نمط متكرر: غياب في أيام معينة (${pattern.frequentDaysWeek.join(', ')})`);
      }

      return {
        employeeId,
        period: `آخر ${months} أشهر`,
        totalAbsences: absences.length,
        pattern,
        warnings: warnings.length > 0 ? warnings : [],
        recommendation:
          warnings.length > 0
            ? 'يوصى بإجراء مقابلة مع الموظف'
            : 'لا توجد مؤشرات على أنماط غياب مريبة',
      };
    } catch (error) {
      throw new Error(`خطأ في التحليل: ${error.message}`);
    }
  }

  /**
   * حساب الراتب مع الغياب والعمل الإضافي
   */
  static async calculateSalaryWithAttendance(employeeId, month, year) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      const report = await this.getMonthlyAttendanceReport(employeeId, month, year);
      const baseSalary = employee.salary?.base || 0;
      const workingDaysInMonth = report.summary.totalDays;

      // حساب الراتب اليومي
      const dailySalary = baseSalary / workingDaysInMonth;

      // خصم الغياب
      const absenceDeduction = dailySalary * report.summary.absentDays;

      // حساب العمل الإضافي (عادة 1.5 مرة من الراتب)
      const overtimePay = (baseSalary / 160) * report.summary.totalOvertimeHours * 1.5; // 160 ساعة/شهر

      // حساب الراتب النهائي
      const finalSalary = baseSalary - absenceDeduction + overtimePay;

      return {
        employeeId,
        month: `${month}/${year}`,
        baseSalary,
        absenceDeduction: Math.round(absenceDeduction * 100) / 100,
        overtimePay: Math.round(overtimePay * 100) / 100,
        finalSalary: Math.round(finalSalary * 100) / 100,
        breakdown: {
          presentDays: report.summary.presentDays,
          absentDays: report.summary.absentDays,
          overtimeHours: report.summary.totalOvertimeHours,
          attendancePercentage: report.summary.attendancePercentage,
        },
      };
    } catch (error) {
      throw new Error(`خطأ في حساب الراتب: ${error.message}`);
    }
  }

  /**
   * الحصول على بقية أيام الإجازة
   */
  static async getRemainingLeaveDays(employeeId) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      const annualLeaveDays = employee.benefits?.annualLeaveDays || 30;
      const sickLeaveDays = employee.benefits?.sickLeaveDays || 15;
      const personalLeaveDays = employee.benefits?.personalLeaveDays || 3;

      const usedAnnual = employee.benefits?.annualLeaveUsed || 0;
      const usedSick = employee.benefits?.sickLeaveUsed || 0;
      const usedPersonal = employee.benefits?.personalLeaveUsed || 0;

      return {
        employeeId,
        annual: {
          total: annualLeaveDays,
          used: usedAnnual,
          remaining: annualLeaveDays - usedAnnual,
        },
        sick: {
          total: sickLeaveDays,
          used: usedSick,
          remaining: sickLeaveDays - usedSick,
        },
        personal: {
          total: personalLeaveDays,
          used: usedPersonal,
          remaining: personalLeaveDays - usedPersonal,
        },
        allLeaveDaysRemaining:
          annualLeaveDays -
          usedAnnual +
          (sickLeaveDays - usedSick) +
          (personalLeaveDays - usedPersonal),
      };
    } catch (error) {
      throw new Error(`خطأ في جلب أيام الإجازة: ${error.message}`);
    }
  }

  // ============= Helper Methods =============

  static calculateWorkHours(checkInTime, checkOutTime) {
    if (!checkInTime || !checkOutTime) return 0;

    const diff = new Date(checkOutTime) - new Date(checkInTime);
    return diff / (1000 * 60 * 60); // تحويل إلى ساعات
  }

  static calculateOvertime(checkInTime, checkOutTime) {
    const workHours = this.calculateWorkHours(checkInTime, checkOutTime);
    const standardHours = 8;

    return workHours > standardHours ? workHours - standardHours : 0;
  }

  static getAvailableLeaveDays(employee, type) {
    if (type === 'annual') {
      const total = employee.benefits?.annualLeaveDays || 30;
      const used = employee.benefits?.annualLeaveUsed || 0;
      return total - used;
    } else if (type === 'sick') {
      const total = employee.benefits?.sickLeaveDays || 15;
      const used = employee.benefits?.sickLeaveUsed || 0;
      return total - used;
    }
    return 0;
  }

  static calculateLeaveDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return diffDays;
  }

  static getWorkingDays(month, year) {
    let workingDays = 0;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const day = date.getDay();
      if (day !== 5 && day !== 6) {
        // تحديد عطل نهاية الأسبوع (الجمعة والسبت)
        workingDays++;
      }
    }

    return workingDays;
  }

  static findMostFrequentDays(absences) {
    const daysCount = {};
    absences.forEach(a => {
      const day = new Date(a.date).toLocaleDateString('ar-EG', { weekday: 'long' });
      daysCount[day] = (daysCount[day] || 0) + 1;
    });

    return Object.keys(daysCount).filter(day => daysCount[day] >= 2);
  }

  static findMostFrequentWeeks(absences) {
    const weeksCount = {};
    absences.forEach(a => {
      const date = new Date(a.date);
      const week = Math.ceil(date.getDate() / 7);
      weeksCount[`أسبوع ${week}`] = (weeksCount[`أسبوع ${week}`] || 0) + 1;
    });

    return Object.keys(weeksCount).filter(week => weeksCount[week] >= 2);
  }

  static checkIfRepetitive(absences) {
    if (absences.length < 2) return false;

    let pattern = true;
    const dayGaps = [];

    for (let i = 1; i < absences.length; i++) {
      const gap = Math.floor(
        (new Date(absences[i - 1].date) - new Date(absences[i].date)) / (1000 * 60 * 60 * 24)
      );
      dayGaps.push(gap);
    }

    // تحقق من وجود نمط متكرر (نفس الفاصل الزمني)
    return dayGaps.length > 0 && dayGaps.every(gap => gap === dayGaps[0]);
  }
}

module.exports = HRAttendanceService;
