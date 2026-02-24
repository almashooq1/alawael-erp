/**
 * خدمات الحضور والانصراف الذكية
 * نظام متقدم يتضمن:
 * - معالجة الحضور والانصراف
 * - حسابات التأخير والساعات الإضافية
 * - إدارة الإجازات
 * - التقارير الذكية
 * - التنبيهات والإشعارات
 */

const {
  AttendanceRecord,
  Schedule,
  Leave,
  LeaveBalance,
  EmployeeAttendanceProfile,
  Absence,
  MonthlyReport,
} = require('../models/attendanceModel');

// ============================================================================
// 1. خدمات الحضور والانصراف
// ============================================================================

class AttendanceService {
  /**
   * تسجيل الحضور
   */
  async checkIn(employeeId, data) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // التحقق من عدم تسجيل الحضور مسبقاً
      const existingCheckIn = await AttendanceRecord.findOne({
        employeeId,
        date: { $gte: today },
      });

      if (existingCheckIn && existingCheckIn.checkInTime) {
        throw new Error('تم تسجيل الحضور مسبقاً اليوم');
      }

      // الحصول على جدول الموظف
      const schedule = await this.getEmployeeSchedule(employeeId, today);
      if (!schedule) {
        throw new Error('لا يوجد جدول دوام محدد للموظف');
      }

      // حساب التأخير
      const checkInTime = new Date();
      const latenessMinutes = this.calculateLateness(checkInTime, schedule.startTime);

      // إنشاء سجل الحضور
      const attendanceRecord = new AttendanceRecord({
        employeeId,
        checkInTime,
        checkInLocation: data.location || {},
        checkInPhoto: data.photo,
        scheduledStartTime: schedule.startTime,
        scheduledEndTime: schedule.endTime,
        date: today,
        workDay: this.getDayName(today),
        latenessMinutes: latenessMinutes > 0 ? latenessMinutes : 0,
        checkInStatus: latenessMinutes > 0 ? 'متأخر' : 'في الوقت',
        verificationMethod: data.verificationMethod || 'تطبيق الجوال',
        status: latenessMinutes > 5 ? 'متأخر' : 'حاضر',
        deviceId: data.deviceId,
        ipAddress: data.ipAddress,
        verified: true,
      });

      await attendanceRecord.save();

      return {
        success: true,
        message: 'تم تسجيل الحضور بنجاح',
        data: attendanceRecord,
        isLate: latenessMinutes > 5,
      };
    } catch (error) {
      throw new Error(`خطأ في تسجيل الحضور: ${error.message}`);
    }
  }

  /**
   * تسجيل الانصراف
   */
  async checkOut(employeeId, data) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // البحث عن سجل الحضور لليوم
      const attendanceRecord = await AttendanceRecord.findOne({
        employeeId,
        date: { $gte: today },
      });

      if (!attendanceRecord) {
        throw new Error('لم يتم تسجيل الحضور اليوم');
      }

      if (attendanceRecord.checkOutTime) {
        throw new Error('تم تسجيل الانصراف مسبقاً');
      }

      // تسجيل الانصراف
      attendanceRecord.checkOutTime = new Date();
      attendanceRecord.checkOutLocation = data.location || {};
      attendanceRecord.checkOutPhoto = data.photo;

      // حساب مدة العمل
      attendanceRecord.calculateWorkDuration();

      // حساب الإضافي
      const overtime = this.calculateOvertime(
        attendanceRecord.workDuration,
        this.getWorkHoursFromSchedule(
          attendanceRecord.scheduledStartTime,
          attendanceRecord.scheduledEndTime
        )
      );

      if (overtime > 0) {
        attendanceRecord.overtimeMinutes = Math.round(overtime * 60);
        attendanceRecord.overtimeApproved = false;
      }

      // حساب الخصم (انصراف مبكر)
      const earlyMinutes = this.calculateEarlyCheckout(
        attendanceRecord.checkOutTime,
        attendanceRecord.scheduledEndTime
      );

      if (earlyMinutes > 0) {
        attendanceRecord.earlyCheckoutMinutes = earlyMinutes;
        attendanceRecord.checkOutStatus = 'مبكر جداً';
      }

      attendanceRecord.updatedAt = new Date();
      await attendanceRecord.save();

      return {
        success: true,
        message: 'تم تسجيل الانصراف بنجاح',
        data: attendanceRecord,
        workDuration: attendanceRecord.workDuration,
        overtime: attendanceRecord.overtimeMinutes,
      };
    } catch (error) {
      throw new Error(`خطأ في تسجيل الانصراف: ${error.message}`);
    }
  }

  /**
   * حساب التأخير بالدقائق
   */
  calculateLateness(checkInTime, scheduledStartTime) {
    const diff = (checkInTime - scheduledStartTime) / (1000 * 60); // بالدقائق
    return diff > 0 ? Math.round(diff) : 0;
  }

  /**
   * حساب الانصراف المبكر
   */
  calculateEarlyCheckout(checkOutTime, scheduledEndTime) {
    const diff = (scheduledEndTime - checkOutTime) / (1000 * 60); // بالدقائق
    return diff > 0 ? Math.round(diff) : 0;
  }

  /**
   * حساب الساعات الإضافية
   */
  calculateOvertime(actualHours, scheduledHours) {
    const overtime = actualHours - scheduledHours;
    return overtime > 0 ? overtime : 0;
  }

  /**
   * الحصول على جدول الموظف
   */
  async getEmployeeSchedule(employeeId, date) {
    const dayName = this.getDayName(date);
    const schedule = await Schedule.findOne({
      employeeId,
      startDate: { $lte: date },
      endDate: { $gte: date },
    });

    if (schedule) {
      const daySchedule = schedule.workDays.find(d => d.day === dayName);
      if (daySchedule && daySchedule.isWorking) {
        return {
          startTime: new Date(`${date.toISOString().split('T')[0]}T${daySchedule.startTime}`),
          endTime: new Date(`${date.toISOString().split('T')[0]}T${daySchedule.endTime}`),
          breakStartTime: daySchedule.breakStartTime,
          breakEndTime: daySchedule.breakEndTime,
        };
      }
    }
    return null;
  }

  /**
   * الحصول على عدد ساعات العمل المحددة
   */
  getWorkHoursFromSchedule(startTime, endTime) {
    if (startTime && endTime) {
      return (endTime - startTime) / (1000 * 60 * 60); // تحويل إلى ساعات
    }
    return 8; // الافتراضي 8 ساعات
  }

  /**
   * الحصول على اسم اليوم بالعربية
   */
  getDayName(date) {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[date.getDay()];
  }

  /**
   * الحصول على سجلات الحضور لفترة معينة
   */
  async getAttendanceRecords(employeeId, startDate, endDate, filters = {}) {
    try {
      const query = {
        employeeId,
        date: { $gte: startDate, $lte: endDate },
      };

      if (filters.status) query.status = filters.status;
      if (filters.verificationMethod) query.verificationMethod = filters.verificationMethod;

      const records = await AttendanceRecord.find(query).sort({ date: -1 }).lean();

      return records;
    } catch (error) {
      throw new Error(`خطأ في الحصول على سجلات الحضور: ${error.message}`);
    }
  }

  /**
   * إدخال حضور يدوي
   */
  async manualEntry(employeeId, data) {
    try {
      const attendanceRecord = new AttendanceRecord({
        employeeId,
        checkInTime: new Date(data.checkInTime),
        checkOutTime: data.checkOutTime ? new Date(data.checkOutTime) : null,
        date: new Date(data.date),
        status: data.status || 'حاضر',
        manualEntryReason: data.reason,
        notes: data.notes,
        verificationMethod: 'الحضور اليدوي',
        verified: false,
      });

      if (data.checkOutTime) {
        attendanceRecord.calculateWorkDuration();
      }

      await attendanceRecord.save();

      return {
        success: true,
        message: 'تم إضافة السجل بنجاح',
        data: attendanceRecord,
      };
    } catch (error) {
      throw new Error(`خطأ في الإدخال اليدوي: ${error.message}`);
    }
  }
}

// ============================================================================
// 2. خدمات إدارة الإجازات
// ============================================================================

class LeaveService {
  /**
   * طلب إجازة
   */
  async requestLeave(employeeId, data) {
    try {
      const leave = new Leave({
        employeeId,
        leaveType: data.leaveType,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
        duration: this.calculateLeaveDuration(data.startDate, data.endDate),
        documents: data.documents || [],
        isPaidLeave: data.isPaidLeave !== false,
        status: 'مرسل',
      });

      // التحقق من الرصيد
      const balance = await this.checkLeaveBalance(employeeId, data.leaveType, leave.duration);
      if (!balance.available) {
        throw new Error(`رصيد ${data.leaveType} غير كافي`);
      }

      await leave.save();

      return {
        success: true,
        message: 'تم إرسال طلب الإجازة بنجاح',
        data: leave,
      };
    } catch (error) {
      throw new Error(`خطأ في طلب الإجازة: ${error.message}`);
    }
  }

  /**
   * الموافقة على الإجازة
   */
  async approveLeave(leaveId, approvedBy, rejectionReason = null) {
    try {
      const leave = await Leave.findById(leaveId);
      if (!leave) throw new Error('لم يتم العثور على الإجازة');

      if (rejectionReason) {
        leave.status = 'مرفوض';
        leave.rejectionReason = rejectionReason;
      } else {
        leave.status = 'موافق عليه';
        leave.approvedBy = approvedBy;
        leave.approvalDate = new Date();

        // تحديث رصيد الإجازات
        await this.updateLeaveBalance(leave.employeeId, leave.leaveType, leave.duration);
      }

      await leave.save();

      return {
        success: true,
        message: 'تم تحديث حالة الإجازة',
        data: leave,
      };
    } catch (error) {
      throw new Error(`خطأ في معالجة الإجازة: ${error.message}`);
    }
  }

  /**
   * حساب مدة الإجازة بالأيام
   */
  calculateLeaveDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }

  /**
   * التحقق من رصيد الإجازات
   */
  async checkLeaveBalance(employeeId, leaveType, duration) {
    try {
      const currentYear = new Date().getFullYear();
      const balance = await LeaveBalance.findOne({
        employeeId,
        year: currentYear,
      });

      if (!balance) {
        return { available: false, remaining: 0, message: 'لا يوجد رصيد إجازات' };
      }

      let remainingDays = 0;
      let fieldName = '';

      switch (leaveType) {
        case 'إجازة سنوية':
          remainingDays = balance.annualLeaveRemaining;
          fieldName = 'annualLeave';
          break;
        case 'إجازة مرضية':
          remainingDays = balance.sickLeaveRemaining;
          fieldName = 'sickLeave';
          break;
        case 'إجازة استثنائية':
          remainingDays = balance.exceptionalLeaveRemaining;
          fieldName = 'exceptionalLeave';
          break;
      }

      const available = remainingDays >= duration;
      return { available, remaining: remainingDays, fieldName };
    } catch (error) {
      throw new Error(`خطأ في التحقق من الرصيد: ${error.message}`);
    }
  }

  /**
   * تحديث رصيد الإجازات
   */
  async updateLeaveBalance(employeeId, leaveType, duration) {
    try {
      const currentYear = new Date().getFullYear();
      const balance = await LeaveBalance.findOne({
        employeeId,
        year: currentYear,
      });

      if (!balance) {
        throw new Error('لا يوجد رصيد إجازات');
      }

      if (leaveType === 'إجازة سنوية') {
        balance.annualLeaveUsed = (balance.annualLeaveUsed || 0) + duration;
        balance.annualLeaveRemaining = balance.annualLeaveAllocation - balance.annualLeaveUsed;
      } else if (leaveType === 'إجازة مرضية') {
        balance.sickLeaveUsed = (balance.sickLeaveUsed || 0) + duration;
        balance.sickLeaveRemaining = balance.sickLeaveAllocation - balance.sickLeaveUsed;
      }

      balance.updatedAt = new Date();
      await balance.save();

      return balance;
    } catch (error) {
      throw new Error(`خطأ في تحديث الرصيد: ${error.message}`);
    }
  }

  /**
   * الحصول على رصيد الإجازات
   */
  async getLeaveBalance(employeeId) {
    try {
      const currentYear = new Date().getFullYear();
      let balance = await LeaveBalance.findOne({
        employeeId,
        year: currentYear,
      });

      if (!balance) {
        // إنشاء رصيد جديد للسنة الحالية
        balance = new LeaveBalance({
          employeeId,
          year: currentYear,
        });
        await balance.save();
      }

      return balance;
    } catch (error) {
      throw new Error(`خطأ في الحصول على الرصيد: ${error.message}`);
    }
  }

  /**
   * الحصول على طلبات الإجازات المعلقة
   */
  async getPendingLeaveRequests(filters = {}) {
    try {
      const query = { status: 'مرسل' };
      if (filters.employeeId) query.employeeId = filters.employeeId;
      if (filters.leaveType) query.leaveType = filters.leaveType;

      const leaves = await Leave.find(query)
        .populate('employeeId', 'name email')
        .sort({ createdAt: -1 });

      return leaves;
    } catch (error) {
      throw new Error(`خطأ في الحصول على الطلبات: ${error.message}`);
    }
  }
}

// ============================================================================
// 3. خدمات التقارير
// ============================================================================

class ReportService {
  /**
   * إنشاء تقرير شهري
   */
  async generateMonthlyReport(employeeId, year, month) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // الحصول على سجلات الحضور
      const records = await AttendanceRecord.find({
        employeeId,
        date: { $gte: startDate, $lte: endDate },
      });

      // الحسابات
      const stats = {
        totalWorkingDays: this.countWorkingDays(startDate, endDate),
        totalDaysPresent: records.filter(r => r.status === 'حاضر').length,
        totalDaysAbsent: records.filter(r => r.status === 'غياب').length,
        totalDaysLate: records.filter(r => r.checkInStatus === 'متأخر').length,
        totalWorkHours: records.reduce((sum, r) => sum + (r.workDuration || 0), 0),
        totalOvertimeHours: records.reduce((sum, r) => sum + (r.overtimeMinutes || 0), 0) / 60,
        totalLateness: records.reduce((sum, r) => sum + (r.latenessMinutes || 0), 0),
      };

      const report = new MonthlyReport({
        employeeId,
        year,
        month,
        ...stats,
        createdAt: new Date(),
      });

      await report.save();

      return {
        success: true,
        data: report,
        stats,
      };
    } catch (error) {
      throw new Error(`خطأ في إنشاء التقرير: ${error.message}`);
    }
  }

  /**
   * حساب أيام العمل (استبدال أيام الجمعة والسبت)
   */
  countWorkingDays(startDate, endDate) {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const day = current.getDay();
      // إذا لم يكن الجمعة (5) أو السبت (6)
      if (day !== 5 && day !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * الحصول على تقارير شهرية متعددة
   */
  async getMonthlyReports(employeeId, year) {
    try {
      const reports = await MonthlyReport.find({ employeeId, year }).sort({ month: 1 });

      return reports;
    } catch (error) {
      throw new Error(`خطأ في الحصول على التقارير: ${error.message}`);
    }
  }

  /**
   * تقرير الحضور الشامل
   */
  async getComprehensiveReport(employeeId, startDate, endDate) {
    try {
      const records = await AttendanceRecord.find({
        employeeId,
        date: { $gte: startDate, $lte: endDate },
      }).sort({ date: 1 });

      const leaves = await Leave.find({
        employeeId,
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
        status: 'موافق عليه',
      });

      const report = {
        period: { start: startDate, end: endDate },
        attendanceSummary: {
          present: records.filter(r => r.status === 'حاضر').length,
          absent: records.filter(r => r.status === 'غياب').length,
          late: records.filter(r => r.checkInStatus === 'متأخر').length,
          onLeave: leaves.length,
        },
        timeSummary: {
          totalWorkHours: records.reduce((sum, r) => sum + (r.workDuration || 0), 0),
          totalOvertimeHours: records.reduce((sum, r) => sum + (r.overtimeMinutes || 0), 0) / 60,
          averageDailyHours: 0,
        },
        details: records,
      };

      if (records.length > 0) {
        report.timeSummary.averageDailyHours = report.timeSummary.totalWorkHours / records.length;
      }

      return report;
    } catch (error) {
      throw new Error(`خطأ في إنشاء التقرير الشامل: ${error.message}`);
    }
  }
}

// ============================================================================
// التصدير
// ============================================================================

module.exports = {
  AttendanceService,
  LeaveService,
  ReportService,
};
