/**
 * Smart Attendance Service - خدمة الحضور الذكية
 * خدمة متقدمة لإدارة الحضور والانصراف مع التحليلات والذكاء الاصطناعي
 */

const SmartAttendance = require('../models/advanced_attendance.model');
const SmartLeave = require('../models/smart_leave.model');
const AttendanceRules = require('../models/attendance_rules.model');
const Employee = require('../models/employee.model');
const NotificationService = require('./notification_service');

class SmartAttendanceService {
  /**
   * تسجيل الدخول الذكي
   */
  static async recordSmartCheckIn(employeeId, checkInData) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      // التحقق من عدم التسجيل المكرر
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingCheckIn = await SmartAttendance.findOne({
        employeeId,
        date: today,
        isDeleted: false,
      });

      if (existingCheckIn && existingCheckIn.checkInTime) {
        return {
          success: false,
          message: 'تم تسجيل الدخول بالفعل اليوم',
          record: existingCheckIn,
        };
      }

      // الحصول على قواعس الحضور المطبقة
      const applicableRules = await this.getApplicableRules(employeeId);

      // إنشاء سجل الحضور
      let attendance = existingCheckIn || new SmartAttendance({
        employeeId,
        date: today,
      });

      attendance.checkInTime = new Date();
      attendance.checkInLocation = checkInData.location || {};
      attendance.checkInMethod = checkInData.method || 'mobile_app';
      attendance.checkInDevice = checkInData.device || {};
      attendance.checkInPhoto = checkInData.photo || {};
      attendance.checkInNotes = checkInData.notes;

      // تحليل التأخير
      const lateAnalysis = await this.analyzeLate ness(
        attendance.checkInTime,
        applicableRules
      );

      if (lateAnalysis.isLate) {
        attendance.lateness = {
          minutes: lateAnalysis.minutes,
          isLate: true,
          reason: lateAnalysis.reason,
        };

        attendance.attendanceStatus = 'late_arrival';

        // إضافة تنبيه
        attendance.alerts.push({
          type: 'late_arrival',
          timestamp: new Date(),
          severity: lateAnalysis.severity,
          message: `دخول متأخر بمدة ${lateAnalysis.minutes} دقيقة`,
        });
      } else {
        attendance.attendanceStatus = 'present';
      }

      // تحليل ذكي للأنماط غير الطبيعية
      const intelligenceAnalysis = await this.analyzeAnomalies(
        employeeId,
        attendance
      );

      attendance.intelligenceFlags = intelligenceAnalysis;

      // إضافة تنبيهات ذكية إذا لزم الأمر
      if (intelligenceAnalysis.isAnomalous) {
        attendance.alerts.push({
          type: 'anomalous_behavior',
          timestamp: new Date(),
          severity: 'warning',
          message: intelligenceAnalysis.anomalyReason,
        });
      }

      await attendance.save();

      // تحديث بيانات الموظف
      await this.updateEmployeeStats(employeeId);

      // إرسال الإشعارات
      await this.sendCheckInNotifications(employee, attendance, lateAnalysis);

      return {
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        attendance: attendance.toJSON(),
        lateAnalysis,
        intelligenceAnalysis,
      };
    } catch (error) {
      throw new Error(`خطأ في تسجيل الدخول: ${error.message}`);
    }
  }

  /**
   * تسجيل الخروج الذكي
   */
  static async recordSmartCheckOut(employeeId, checkOutData) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const attendance = await SmartAttendance.findOne({
        employeeId,
        date: today,
        isDeleted: false,
      });

      if (!attendance || !attendance.checkInTime) {
        throw new Error('لم يتم تسجيل دخول الموظف اليوم');
      }

      // الحصول على قواعس الحضور
      const applicableRules = await this.getApplicableRules(employeeId);

      // تسجيل الخروج
      attendance.checkOutTime = new Date();
      attendance.checkOutLocation = checkOutData.location || {};
      attendance.checkOutMethod = checkOutData.method || 'mobile_app';
      attendance.checkOutDevice = checkOutData.device || {};
      attendance.checkOutPhoto = checkOutData.photo || {};
      attendance.checkOutNotes = checkOutData.notes;

      // تحليل الخروج المبكر
      const earlyLeaveAnalysis = await this.analyzeEarlyLeave(
        attendance.checkInTime,
        attendance.checkOutTime,
        applicableRules
      );

      if (earlyLeaveAnalysis.isEarlyLeave) {
        attendance.earlyLeave = {
          minutes: earlyLeaveAnalysis.minutes,
          isEarlyLeave: true,
          reason: earlyLeaveAnalysis.reason,
        };

        if (attendance.attendanceStatus === 'present') {
          attendance.attendanceStatus = 'early_departure';
        }

        // إضافة تنبيه
        attendance.alerts.push({
          type: 'early_departure',
          timestamp: new Date(),
          severity: earlyLeaveAnalysis.severity,
          message: `خروج مبكر بمدة ${earlyLeaveAnalysis.minutes} دقيقة`,
        });
      }

      // حساب ساعات العمل
      await this.calculateWorkHours(attendance, applicableRules);

      // حساب الساعات الإضافية
      await this.calculateOvertime(attendance, applicableRules);

      // تحديث حالة الحضور النهائية
      if (
        attendance.attendanceStatus === 'present' &&
        !attendance.earlyLeave.isEarlyLeave &&
        !attendance.lateness.isLate
      ) {
        attendance.attendanceStatus = 'present';
      }

      await attendance.save();

      // تحديث بيانات الموظف
      await this.updateEmployeeStats(employeeId);

      // إرسال إشعارات الخروج
      const employee = await Employee.findById(employeeId);
      await this.sendCheckOutNotifications(employee, attendance, earlyLeaveAnalysis);

      return {
        success: true,
        message: 'تم تسجيل الخروج بنجاح',
        attendance: attendance.toJSON(),
        workSummary: {
          workHours: attendance.workDuration,
          lateMinutes: attendance.lateness.minutes || 0,
          earlyLeaveMinutes: attendance.earlyLeave.minutes || 0,
          status: attendance.attendanceStatus,
        },
      };
    } catch (error) {
      throw new Error(`خطأ في تسجيل الخروج: ${error.message}`);
    }
  }

  /**
   * تحليل التأخير
   */
  static async analyzeLateness(checkInTime, rules) {
    if (!rules || !rules.latePolicies) {
      return { isLate: false, minutes: 0 };
    }

    const mandatoryCheckInTime = rules.workingHours.mandatoryCheckInTime;
    const [requiredHours, requiredMinutes] = mandatoryCheckInTime
      .split(':')
      .map(Number);

    const requiredDate = new Date();
    requiredDate.setHours(requiredHours, requiredMinutes, 0, 0);

    const delayMs = checkInTime - requiredDate;
    const delayMinutes = Math.floor(delayMs / 60000);

    const gracePeriod = rules.latePolicies.gracePeriodMinutes || 5;

    if (delayMinutes > gracePeriod) {
      const severity =
        delayMinutes > rules.latePolicies.maxLateMinutes ? 'critical' : 'warning';

      return {
        isLate: true,
        minutes: delayMinutes,
        severity,
        reason: `تأخير عن الوقت المحدد بمدة ${delayMinutes} دقيقة`,
      };
    }

    return { isLate: false, minutes: 0 };
  }

  /**
   * تحليل الخروج المبكر
   */
  static async analyzeEarlyLeave(checkInTime, checkOutTime, rules) {
    if (!rules || !rules.workingHours) {
      return { isEarlyLeave: false, minutes: 0 };
    }

    const mandatoryCheckOutTime = rules.workingHours.mandatoryCheckOutTime;
    const [checkOutHours, checkOutMinutes] = mandatoryCheckOutTime
      .split(':')
      .map(Number);

    const requiredDate = new Date(checkOutTime);
    requiredDate.setHours(checkOutHours, checkOutMinutes, 0, 0);

    const earlyMs = requiredDate - checkOutTime;
    const earlyMinutes = Math.floor(earlyMs / 60000);

    if (earlyMinutes > 5) {
      return {
        isEarlyLeave: true,
        minutes: earlyMinutes,
        severity: earlyMinutes > 60 ? 'warning' : 'info',
        reason: `خروج مبكر بمدة ${earlyMinutes} دقيقة`,
      };
    }

    return { isEarlyLeave: false, minutes: 0 };
  }

  /**
   * تحليل الأنماط غير الطبيعية
   */
  static async analyzeAnomalies(employeeId, currentAttendance) {
    try {
      // الحصول على سجلات الحضور السابقة (آخر 30 يوم)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentAttendance = await SmartAttendance.find({
        employeeId,
        date: { $gte: thirtyDaysAgo },
        isDeleted: false,
      }).sort({ date: -1 });

      // حساب الإحصائيات
      const stats = {
        lateCount: recentAttendance.filter((a) => a.lateness.isLate).length,
        earlyLeaveCount: recentAttendance.filter((a) => a.earlyLeave.isEarlyLeave)
          .length,
        absenceCount: recentAttendance.filter(
          (a) => a.attendanceStatus === 'absent'
        ).length,
        averageWorkHours:
          recentAttendance.reduce((sum, a) => sum + (a.workDuration?.totalHours?.regular || 0), 0) /
          recentAttendance.length,
      };

      // تحليل الانحرافات
      const isAnomalous = stats.lateCount >= 3 || stats.earlyLeaveCount >= 5;
      const riskLevel =
        stats.lateCount >= 5
          ? 'high'
          : stats.lateCount >= 3
            ? 'medium'
            : 'low';

      return {
        isAnomalous,
        anomalyReason: isAnomalous
          ? `تأخيرات متكررة أو خروج مبكر (${stats.lateCount} تأخيرات و ${stats.earlyLeaveCount} خروج مبكر)`
          : null,
        riskLevel,
        behaviorScore: this.calculateBehaviorScore(stats),
        patterns: this.detectPatterns(recentAttendance),
      };
    } catch (error) {
      return {
        isAnomalous: false,
        riskLevel: 'low',
        behaviorScore: 100,
        patterns: [],
      };
    }
  }

  /**
   * حساب درجة السلوك
   */
  static calculateBehaviorScore(stats) {
    let score = 100;

    // خصم عن التأخيرات
    score -= stats.lateCount * 5;

    // خصم عن الخروج المبكر
    score -= stats.earlyLeaveCount * 3;

    // خصم عن الغياب
    score -= stats.absenceCount * 10;

    return Math.max(0, score);
  }

  /**
   * اكتشاف الأنماط
   */
  static detectPatterns(attendanceRecords) {
    const patterns = [];

    // اكتشاف تأخيرات في أيام معينة
    const lateByDay = {};
    attendanceRecords.forEach((record) => {
      if (record.lateness.isLate) {
        const day = new Date(record.date).toLocaleDateString('ar-SA', {
          weekday: 'long',
        });
        lateByDay[day] = (lateByDay[day] || 0) + 1;
      }
    });

    Object.entries(lateByDay).forEach(([day, count]) => {
      if (count >= 2) {
        patterns.push({
          patternName: 'متكرر_التأخير_يوم_معين',
          confidence: Math.min(count * 25, 100),
          description: `تأخير متكرر يوم ${day}`,
        });
      }
    });

    return patterns;
  }

  /**
   * حساب ساعات العمل
   */
  static async calculateWorkHours(attendance, rules) {
    const checkInTime = attendance.checkInTime;
    const checkOutTime = attendance.checkOutTime;

    if (!checkInTime || !checkOutTime) return;

    const diffMs = checkOutTime - checkInTime;
    const totalMinutes = Math.floor(diffMs / 60000);

    // طرح فترات الاستراحة
    let breakTimeMinutes = 0;
    if (rules && rules.workingHours && rules.workingHours.breakTimes) {
      breakTimeMinutes = rules.workingHours.breakTimes.reduce(
        (sum, breakTime) => sum + (breakTime.durationMinutes || 0),
        0
      );
    }

    const workMinutes = Math.max(0, totalMinutes - breakTimeMinutes);
    const workHours = workMinutes / 60;

    const regularHours = 8; // ساعات العمل المتوقعة

    attendance.workDuration = {
      totalMinutes: workMinutes,
      totalHours: {
        regular: Math.min(workHours, regularHours),
        overtime: Math.max(0, workHours - regularHours),
      },
    };
  }

  /**
   * حساب الساعات الإضافية
   */
  static async calculateOvertime(attendance, rules) {
    const overtimeHours = attendance.workDuration?.totalHours?.overtime || 0;

    if (overtimeHours > 0 && rules && rules.overtimePolicies) {
      const policy = rules.overtimePolicies;

      if (!policy.isOvertimeAllowed) {
        attendance.alerts.push({
          type: 'overtime_not_allowed',
          severity: 'warning',
          message: 'الساعات الإضافية غير مسموح بها وفقاً للنظام',
        });
      }

      // التحقق من حدود الساعات الإضافية
      if (overtimeHours > policy.maxOvertimePerWeek) {
        attendance.alerts.push({
          type: 'overtime_limit_exceeded',
          severity: 'warning',
          message: `تجاوز حد الساعات الإضافية الأسبوعية`,
        });
      }
    }
  }

  /**
   * الحصول على قواعس الحضور المطبقة
   */
  static async getApplicableRules(employeeId) {
    const employee = await Employee.findById(employeeId);

    if (!employee) return null;

    // البحث عن أنسب قاعدة
    const rules = await AttendanceRules.findOne({
      isActive: true,
      effectiveFrom: { $lte: new Date() },
      $or: [
        {
          'applicability.departments': employee.departmentId,
        },
        {
          'applicability.employeeRoles': employee.role,
        },
        {
          'applicability.specificEmployees': employeeId,
        },
      ],
    });

    return rules;
  }

  /**
   * تحديث إحصائيات الموظف
   */
  static async updateEmployeeStats(employeeId) {
    try {
      const employee = await Employee.findById(employeeId);

      if (!employee) return;

      // جلب الإحصائيات
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      thisMonthStart.setHours(0, 0, 0, 0);

      const thisMonthAttendance = await SmartAttendance.find({
        employeeId,
        date: { $gte: thisMonthStart },
        isDeleted: false,
      });

      // تحديث في النموذج
      employee.attendance = {
        totalPresent: thisMonthAttendance.filter(
          (a) => a.attendanceStatus === 'present'
        ).length,
        totalLate: thisMonthAttendance.filter(
          (a) => a.attendanceStatus === 'late_arrival'
        ).length,
        totalAbsent: thisMonthAttendance.filter(
          (a) => a.attendanceStatus === 'absent'
        ).length,
        totalEarlyLeave: thisMonthAttendance.filter(
          (a) => a.attendanceStatus === 'early_departure'
        ).length,
        lastUpdated: new Date(),
      };

      await employee.save();
    } catch (error) {
      console.error('خطأ في تحديث إحصائيات الموظف:', error);
    }
  }

  /**
   * إرسال الإشعارات عند الدخول
   */
  static async sendCheckInNotifications(employee, attendance, lateAnalysis) {
    try {
      // إشعار للموظف
      await NotificationService.sendNotification({
        userId: employee._id,
        type: 'check_in_confirmation',
        title: 'تم تسجيل الدخول',
        message: `تم تسجيل دخولك في ${attendance.checkInTime.toLocaleTimeString('ar-SA')}`,
        data: {
          attendanceId: attendance._id,
          checkInTime: attendance.checkInTime,
        },
      });

      // إضافة إشعار للمدير إذا كان هناك تأخير
      if (lateAnalysis.isLate && lateAnalysis.severity === 'critical') {
        const manager = await Employee.findById(employee.managerId);

        if (manager) {
          await NotificationService.sendNotification({
            userId: manager._id,
            type: 'employee_late_arrival',
            title: 'دخول متأخر',
            message: `${employee.fullName} تأخر ${lateAnalysis.minutes} دقيقة عن الوقت المحدد`,
            data: {
              employeeId: employee._id,
            },
          });
        }
      }
    } catch (error) {
      console.error('خطأ في إرسال الإشعارات:', error);
    }
  }

  /**
   * إرسال الإشعارات عند الخروج
   */
  static async sendCheckOutNotifications(employee, attendance, earlyLeaveAnalysis) {
    try {
      // إشعار للموظف
      await NotificationService.sendNotification({
        userId: employee._id,
        type: 'check_out_confirmation',
        title: 'تم تسجيل الخروج',
        message: `تم تسجيل خروجك في ${attendance.checkOutTime.toLocaleTimeString('ar-SA')}
Work Duration: ${attendance.workDuration?.totalHours?.regular || 0}h`,
        data: {
          attendanceId: attendance._id,
        },
      });
    } catch (error) {
      console.error('خطأ في إرسال الإشعارات:', error);
    }
  }

  /**
   * الحصول على سجل الحضور اليومي
   */
  static async getTodayRecord(employeeId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await SmartAttendance.findOne({
      employeeId,
      date: today,
      isDeleted: false,
    })
      .populate('employeeId', 'fullName email department position')
      .populate('approvedBy', 'fullName');
  }

  /**
   * الحصول على سجلات الحضور الشهرية
   */
  static async getMonthlyAttendance(employeeId, month, year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    return await SmartAttendance.find({
      employeeId,
      date: { $gte: startDate, $lt: endDate },
      isDeleted: false,
    }).sort({ date: 1 });
  }

  /**
   * إنشاء تقرير الحضور الشهري
   */
  static async generateMonthlyReport(employeeId, month, year) {
    const records = await this.getMonthlyAttendance(employeeId, month, year);

    const summary = {
      totalDays: records.length,
      presentDays: records.filter((r) => r.attendanceStatus === 'present').length,
      lateDays: records.filter((r) => r.lateness.isLate).length,
      earlyLeaveDays: records.filter((r) => r.earlyLeave.isEarlyLeave).length,
      absentDays: records.filter((r) => r.attendanceStatus === 'absent').length,
      totalWorkHours: records.reduce(
        (sum, r) => sum + (r.workDuration?.totalHours?.regular || 0),
        0
      ),
      totalOvertimeHours: records.reduce(
        (sum, r) => sum + (r.workDuration?.totalHours?.overtime || 0),
        0
      ),
      attendancePercentage: (
        (records.filter((r) => r.attendanceStatus === 'present').length /
          records.length) *
        100
      ).toFixed(2),
    };

    return {
      month,
      year,
      records,
      summary,
    };
  }
}

module.exports = SmartAttendanceService;
