const Employee = require('../../models/hr/Employee');
const PayrollRecord = require('../../models/hr/PayrollRecord');
const Leave = require('../../models/hr/Leave');
const LeaveBalance = require('../../models/hr/LeaveBalance');
const AttendanceRecord = require('../../models/hr/AttendanceRecord');
const Certification = require('../../models/hr/Certification');
const EndOfServiceCalculation = require('../../models/hr/EndOfServiceCalculation');

// ===== خدمة حساب الرواتب =====
class PayrollCalculationService {
  /**
   * حساب راتب موظف لشهر محدد
   * يشمل: GOSI (9%/2%)، ساند (0.75%)، خصومات التأخير والغياب، الأوفرتايم
   */
  static async calculatePayroll(employeeId, month, year) {
    const employee = await Employee.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');

    const basic = employee.basic_salary || 0;
    const housing = employee.housing_allowance || 0;
    const transport = employee.transport_allowance || 0;
    const gross = basic + housing + transport;

    // GOSI: 9% للسعوديين، 2% لغير السعوديين (على الراتب الأساسي فقط)
    const gosiEmployeeRate = employee.is_saudi ? 0.09 : 0.02;
    const gosiEmployerRate = employee.is_saudi ? 0.12 : 0.02;
    const gosiEmployee = employee.gosi_registered
      ? Math.round(basic * gosiEmployeeRate * 100) / 100
      : 0;
    const gosiEmployer = employee.gosi_registered
      ? Math.round(basic * gosiEmployerRate * 100) / 100
      : 0;

    // ساند: 0.75% للسعوديين فقط
    const sanedDeduction =
      employee.is_saudi && employee.gosi_registered ? Math.round(basic * 0.0075 * 100) / 100 : 0;

    // حساب خصومات الحضور
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    const attendance = await AttendanceRecord.find({
      employee_id: employeeId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
      deleted_at: null,
    });

    const workingDays = 26;
    const absentDays = attendance.filter(a => a.status === 'absent').length;
    const lateDays = attendance.filter(a => a.late_minutes >= 30).length; // تأخر 30+ دقيقة = خصم

    const dailySalary = gross / workingDays;
    const absenceDeduction = Math.round(absentDays * dailySalary * 100) / 100;
    const lateDeduction = Math.round(lateDays * (dailySalary / 2) * 100) / 100;

    // أوفرتايم: 1.5x أجر الساعة
    const totalOvertimeMinutes = attendance.reduce((s, a) => s + (a.overtime_minutes || 0), 0);
    const overtimePay =
      totalOvertimeMinutes > 0
        ? Math.round((basic / workingDays / 8) * 1.5 * (totalOvertimeMinutes / 60) * 100) / 100
        : 0;

    return {
      employee_id: employeeId,
      month,
      year,
      working_days: workingDays,
      actual_days: workingDays - absentDays,
      basic_salary: basic,
      housing_allowance: housing,
      transport_allowance: transport,
      other_allowances: 0,
      overtime_pay: overtimePay,
      overtime_hours: Math.round((totalOvertimeMinutes / 60) * 10) / 10,
      gosi_employee: gosiEmployee,
      gosi_employer: gosiEmployer,
      saned_deduction: sanedDeduction,
      late_deduction: lateDeduction,
      absence_deduction: absenceDeduction,
    };
  }

  /**
   * توليد كشف رواتب شهري لكل موظفي الفرع
   */
  static async generateMonthlyPayroll(branchId, month, year) {
    const employees = await Employee.find({
      branch_id: branchId,
      status: 'active',
      deleted_at: null,
    });
    const results = [];

    for (const emp of employees) {
      try {
        // التحقق من عدم وجود كشف راتب مسبق
        const existing = await PayrollRecord.findOne({
          employee_id: emp._id,
          month,
          year,
          deleted_at: null,
        });
        if (existing) {
          results.push({ employee: emp._id, status: 'already_exists' });
          continue;
        }

        const data = await PayrollCalculationService.calculatePayroll(emp._id, month, year);
        const record = await PayrollRecord.create({
          ...data,
          branch_id: branchId,
          status: 'draft',
        });
        results.push({ employee: emp._id, status: 'created', record_id: record._id });
      } catch (err) {
        results.push({ employee: emp._id, status: 'error', error: err.message });
      }
    }
    return results;
  }
}

// ===== خدمة مكافأة نهاية الخدمة =====
class EndOfServiceService {
  static async calculate(employeeId, terminationDate, terminationReason) {
    const employee = await Employee.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');

    const existing = await EndOfServiceCalculation.findOne({
      employee_id: employeeId,
      deleted_at: null,
    });
    if (existing && existing.status !== 'draft')
      throw new Error('يوجد حساب مكافأة نهاية خدمة معتمد مسبقاً');

    const data = {
      employee_id: employeeId,
      branch_id: employee.branch_id,
      hire_date: employee.hire_date,
      termination_date: new Date(terminationDate),
      termination_reason: terminationReason,
      last_basic_salary: employee.basic_salary,
    };

    if (existing) {
      Object.assign(existing, data);
      await existing.save();
      return existing;
    }
    return EndOfServiceCalculation.create(data);
  }
}

// ===== خدمة الإجازات =====
class LeaveService {
  static async applyLeave(employeeId, branchId, leaveType, startDate, endDate, reason, appliedBy) {
    const employee = await Employee.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // التحقق من الحد الأقصى للنوع
    const maxDays = Leave.schema.statics.maxDaysByType[leaveType];
    if (maxDays && days > maxDays) {
      throw new Error(`أقصى أيام لإجازة ${leaveType} هي ${maxDays} يوماً`);
    }

    // التحقق من الرصيد للإجازة السنوية
    if (leaveType === 'annual') {
      const balance = await LeaveBalance.getOrCreate(employeeId, new Date().getFullYear());
      if (balance.annual_remaining < days) {
        throw new Error(`رصيد الإجازة السنوية غير كافٍ. المتاح: ${balance.annual_remaining} يوم`);
      }
    }

    // التحقق من عدم وجود تداخل
    const overlap = await Leave.findOne({
      employee_id: employeeId,
      status: { $in: ['pending', 'approved'] },
      $or: [{ start_date: { $lte: end }, end_date: { $gte: start } }],
      deleted_at: null,
    });
    if (overlap) throw new Error('يوجد طلب إجازة متداخل في نفس الفترة');

    return Leave.create({
      employee_id: employeeId,
      branch_id: branchId,
      leave_type: leaveType,
      start_date: start,
      end_date: end,
      days_requested: days,
      reason,
      applied_by: appliedBy,
      status: 'pending',
    });
  }

  static async approveLeave(leaveId, reviewedBy, daysApproved) {
    const leave = await Leave.findById(leaveId);
    if (!leave) throw new Error('طلب الإجازة غير موجود');
    if (leave.status !== 'pending') throw new Error('طلب الإجازة ليس في حالة انتظار');

    leave.status = 'approved';
    leave.reviewed_by = reviewedBy;
    leave.reviewed_at = new Date();
    leave.days_approved = daysApproved || leave.days_requested;
    leave.deducted_from_balance = true;
    await leave.save();

    // خصم من الرصيد للإجازة السنوية
    if (leave.leave_type === 'annual') {
      const balance = await LeaveBalance.getOrCreate(leave.employee_id, new Date().getFullYear());
      balance.annual_used += leave.days_approved;
      balance.annual_remaining = Math.max(0, balance.annual_remaining - leave.days_approved);
      balance.last_updated = new Date();
      await balance.save();
    }
    return leave;
  }

  static async rejectLeave(leaveId, reviewedBy, rejectionReason) {
    const leave = await Leave.findById(leaveId);
    if (!leave || leave.status !== 'pending') throw new Error('لا يمكن رفض هذا الطلب');
    leave.status = 'rejected';
    leave.reviewed_by = reviewedBy;
    leave.reviewed_at = new Date();
    leave.rejection_reason = rejectionReason;
    return leave.save();
  }
}

// ===== خدمة تنبيهات HR =====
class HRAlertService {
  static async getExpiringDocuments(branchId, days = 30) {
    const employees = await Employee.find({
      branch_id: branchId,
      status: 'active',
      deleted_at: null,
    });
    const alerts = [];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    for (const emp of employees) {
      if (emp.iqama_expiry && emp.iqama_expiry <= futureDate) {
        alerts.push({
          type: 'iqama_expiry',
          employee_id: emp._id,
          name: emp.full_name_ar,
          expiry: emp.iqama_expiry,
        });
      }
      if (emp.scfhs_expiry && emp.scfhs_expiry <= futureDate) {
        alerts.push({
          type: 'scfhs_expiry',
          employee_id: emp._id,
          name: emp.full_name_ar,
          expiry: emp.scfhs_expiry,
        });
      }
    }

    const certs = await Certification.findExpiringSoon(days);
    for (const cert of certs) {
      alerts.push({
        type: 'certification_expiry',
        employee_id: cert.employee_id._id,
        name: cert.employee_id.full_name_ar,
        cert_name: cert.cert_name_ar,
        expiry: cert.expiry_date,
      });
    }
    return alerts;
  }

  static async getProbationEndingSoon(branchId, days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return Employee.find({
      branch_id: branchId,
      probation_end_date: { $lte: futureDate, $gte: new Date() },
      status: 'active',
      deleted_at: null,
    }).select('full_name_ar employee_number probation_end_date department');
  }
}

module.exports = { PayrollCalculationService, EndOfServiceService, LeaveService, HRAlertService };
