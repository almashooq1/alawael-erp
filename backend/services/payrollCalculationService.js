/**
 * Payroll Calculation Service
 * خدمة حساب الرواتب المتقدمة
 */

const Payroll = require('../models/payroll.model');
const Employee = require('../models/Employee');
const Attendance = require('../models/attendance.model');
const Leave = require('../models/leave.model');
const { CompensationStructure, IndividualIncentive, PerformancePenalty } = require('../models/compensation.model');

class PayrollCalculationService {
  /**
   * حساب الراتب الشهري الكامل
   */
  static async calculateMonthlyPayroll(employeeId, month, year) {
    try {
      // جلب بيانات الموظف
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        throw new Error(`الموظف ${employeeId} غير موجود`);
      }

      // جلب هيكل الحوافز
      const compensationStructure = await this.getApplicableCompensationStructure(employee);

      // جلب بيانات الحضور
      const attendanceData = await this.getAttendanceData(employeeId, month, year);

      // جلب بيانات الإجازات
      const leaveData = await this.getLeaveData(employeeId, month, year);

      // جلب الحوافز الفردية
      const incentives = await IndividualIncentive.find({
        employeeId,
        month,
        year,
        status: 'approved',
      });

      // جلب العقوبات
      const penalties = await PerformancePenalty.find({
        employeeId,
        $expr: {
          $and: [
            { $eq: [{ $year: '$incidentDate' }, year] },
            { $eq: [{ $month: '$incidentDate' }, parseInt(month.split('-')[1])] },
          ],
        },
        status: 'approved',
      });

      // إنشاء سجل الراتب
      let payroll = new Payroll({
        employeeId,
        employeeName: employee.fullName,
        employeeEmail: employee.email,
        departmentId: employee.departmentId,
        departmentName: employee.departmentName,
        month,
        year,
        baseSalary: employee.baseSalary || 0,
        payPeriodStartDate: new Date(`${month}-01`),
        payPeriodEndDate: this.getLastDayOfMonth(month, year),
      });

      // حساب المزايا
      this.calculateAllowances(payroll, compensationStructure, employee);

      // حساب الحضور والعمل الإضافي
      this.calculateAttendance(payroll, attendanceData, leaveData);

      // حساب الحوافز
      this.calculateIncentives(payroll, incentives);

      // حساب العقوبات
      this.calculatePenalties(payroll, penalties);

      // حساب الضرائب والخصومات
      this.calculateTaxesAndDeductions(payroll, compensationStructure);

      // حساب الإجماليات
      payroll.recalculateAll();

      return payroll;
    } catch (error) {
      throw new Error(`خطأ في حساب الراتب: ${error.message}`);
    }
  }

  /**
   * حساب المزايا بناءً على هيكل الحوافز
   */
  static calculateAllowances(payroll, compensationStructure, employee) {
    const allowances = [];

    if (!compensationStructure || !compensationStructure.fixedAllowances) {
      return;
    }

    compensationStructure.fixedAllowances.forEach(allowance => {
      let amount = allowance.amount;

      // إذا كانت نسبة مئوية
      if (allowance.percentage && !allowance.amount) {
        amount = (payroll.baseSalary * allowance.percentage) / 100;
      }

      allowances.push({
        _id: new mongoose.Types.ObjectId(),
        name: allowance.name,
        amount,
        isFixed: true,
        description: `${allowance.name} - ${allowance.frequency}`,
      });
    });

    // إضافة المزايا المتغيرة
    if (compensationStructure.variableAllowances) {
      compensationStructure.variableAllowances.forEach(varAllowance => {
        // تحقق من الشروط
        if (this.meetsCriteria(employee, varAllowance.condition)) {
          let amount = varAllowance.amount;

          if (varAllowance.percentage) {
            amount = (payroll.baseSalary * varAllowance.percentage) / 100;
          }

          if (varAllowance.maxCap && amount > varAllowance.maxCap) {
            amount = varAllowance.maxCap;
          }

          allowances.push({
            _id: new mongoose.Types.ObjectId(),
            name: varAllowance.name,
            amount,
            isFixed: false,
          });
        }
      });
    }

    payroll.allowances = allowances;
  }

  /**
   * حساب بيانات الحضور والعمل الإضافي
   */
  static async getAttendanceData(employeeId, month, year) {
    try {
      const attendance = await Attendance.findOne({
        employeeId,
        month,
        year,
      });

      if (!attendance) {
        return {
          presentDays: 0,
          absentDays: 0,
          leaveDays: 0,
          workingDays: 22,
          overtime: 0,
        };
      }

      return {
        presentDays: attendance.presentDays || 0,
        absentDays: attendance.absentDays || 0,
        leaveDays: attendance.leaveDays || 0,
        workingDays: attendance.workingDays || 22,
        overtime: attendance.overtime || 0,
      };
    } catch (error) {
      console.error('خطأ في جلب بيانات الحضور:', error);
      return {};
    }
  }

  /**
   * جلب بيانات الإجازات
   */
  static async getLeaveData(employeeId, month, year) {
    try {
      const leaves = await Leave.find({
        employeeId,
        startDate: {
          $gte: new Date(`${year}-${month}-01`),
          $lt: new Date(`${year}-${parseInt(month) === 12 ? parseInt(month) : parseInt(month) + 1}-01`),
        },
        status: 'approved',
      });

      const leaveDays = {
        paid: 0,
        unpaid: 0,
      };

      leaves.forEach(leave => {
        if (leave.isPaid) {
          leaveDays.paid += leave.days || 0;
        } else {
          leaveDays.unpaid += leave.days || 0;
        }
      });

      return leaveDays;
    } catch (error) {
      console.error('خطأ في جلب بيانات الإجازات:', error);
      return { paid: 0, unpaid: 0 };
    }
  }

  /**
   * حساب الحضور والعمل الإضافي
   */
  static calculateAttendance(payroll, attendanceData, leaveData) {
    payroll.attendance = {
      presentDays: attendanceData.presentDays || 0,
      absentDays: attendanceData.absentDays || 0,
      leaveDays: (leaveData?.paid || 0) + (leaveData?.unpaid || 0),
      unpaidLeaveDays: leaveData?.unpaid || 0,
      workingDays: attendanceData.workingDays || 22,
      actualWorkingDays: (attendanceData.presentDays || 0) + (leaveData?.paid || 0),
      overtime: {
        regularOvertime: attendanceData.overtime?.regular || 0,
        weekendOvertime: attendanceData.overtime?.weekend || 0,
        holidayOvertime: attendanceData.overtime?.holiday || 0,
      },
    };
  }

  /**
   * حساب الحوافز الفردية
   */
  static calculateIncentives(payroll, incentives) {
    if (!incentives || incentives.length === 0) {
      return;
    }

    incentives.forEach(incentive => {
      switch (incentive.incentiveType) {
        case 'performance':
          payroll.incentives.performanceBonus += incentive.amount;
          break;
        case 'attendance':
          payroll.incentives.attendanceBonus += incentive.amount;
          break;
        case 'safety':
          payroll.incentives.safetyBonus += incentive.amount;
          break;
        case 'loyalty':
          payroll.incentives.loyaltyBonus += incentive.amount;
          break;
        case 'project':
          payroll.incentives.projectBonus += incentive.amount;
          break;
        case 'seasonal':
          payroll.incentives.seasonalBonus += incentive.amount;
          break;
        default:
          payroll.incentives.other.push({
            name: incentive.incentiveType,
            amount: incentive.amount,
            reason: incentive.reason,
            approvedBy: incentive.approvedBy?.name,
          });
      }
    });
  }

  /**
   * حساب العقوبات
   */
  static calculatePenalties(payroll, penalties) {
    if (!penalties || penalties.length === 0) {
      return;
    }

    penalties.forEach(penalty => {
      switch (penalty.penaltyType) {
        case 'disciplinary':
          payroll.penalties.disciplinary += penalty.amount;
          break;
        case 'attendance':
          payroll.penalties.attendance += penalty.amount;
          break;
        case 'misconduct':
          payroll.penalties.misconduct += penalty.amount;
          break;
        default:
          payroll.penalties.other.push({
            name: penalty.penaltyType,
            amount: penalty.amount,
            reason: penalty.reason,
            approvedBy: penalty.approvedBy?.name,
          });
      }
    });
  }

  /**
   * حساب الضرائب والخصومات
   */
  static calculateTaxesAndDeductions(payroll, compensationStructure) {
    // حساب الضرائب
    const taxableIncome = payroll.calculations.totalGross;
    const taxBrackets = compensationStructure?.taxes?.incomeTax?.brackets || [];

    let incomeTax = 0;
    for (const bracket of taxBrackets) {
      if (taxableIncome >= bracket.minIncome && taxableIncome <= bracket.maxIncome) {
        incomeTax = (taxableIncome * bracket.taxRate) / 100;
        break;
      }
    }

    payroll.taxes.incomeTax = incomeTax;
    payroll.taxes.taxableIncome = taxableIncome;

    // حساب الضمان الاجتماعي
    const deductionConfig = compensationStructure?.mandatoryDeductions;
    if (deductionConfig?.socialSecurity?.enabled) {
      let socialSecurity = (taxableIncome * (deductionConfig.socialSecurity.employeePercentage || 0)) / 100;
      if (deductionConfig.socialSecurity.maxCap) {
        socialSecurity = Math.min(socialSecurity, deductionConfig.socialSecurity.maxCap);
      }
      payroll.taxes.socialSecurity = socialSecurity;
      payroll.taxes.socialSecurityPercentage = deductionConfig.socialSecurity.employeePercentage;
    }

    // حساب التأمين الصحي
    if (deductionConfig?.healthInsurance?.enabled) {
      const healthInsurance = (taxableIncome * (deductionConfig.healthInsurance.employeePercentage || 0)) / 100;
      payroll.taxes.healthInsurance = healthInsurance;
      payroll.taxes.healthInsurancePercentage = deductionConfig.healthInsurance.employeePercentage;
    }
  }

  /**
   * معالجة رواتب الشهر الكامل
   */
  static async processMonthlyPayrollBatch(month, year) {
    try {
      // جلب جميع الموظفين النشطين
      const employees = await Employee.find({ isActive: true });

      const results = {
        processed: [],
        errors: [],
      };

      for (const employee of employees) {
        try {
          const payroll = await this.calculateMonthlyPayroll(employee._id, month, year);
          await payroll.save();
          results.processed.push({
            employeeId: employee._id,
            employeeName: employee.fullName,
            status: 'success',
          });
        } catch (error) {
          results.errors.push({
            employeeId: employee._id,
            employeeName: employee.fullName,
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`خطأ في معالجة الرواتب: ${error.message}`);
    }
  }

  /**
   * الحصول على هيكل الحوافز المناسب
   */
  static async getApplicableCompensationStructure(employee) {
    try {
      const structures = await CompensationStructure.find({
        isActive: true,
        validFrom: { $lte: new Date() },
        $or: [{ validTo: null }, { validTo: { $gte: new Date() } }],
      }).sort({ createdAt: -1 });

      for (const structure of structures) {
        if (this.isApplicable(structure, employee)) {
          return structure;
        }
      }

      // إذا لم يجد هيكل خاص، استخدم الهيكل العام
      return structures.find(s => s.applicableTo === 'all') || null;
    } catch (error) {
      console.error('خطأ في جلب هيكل الحوافز:', error);
      return null;
    }
  }

  /**
   * التحقق من صحة تطبيق هيكل الحوافز
   */
  static isApplicable(structure, employee) {
    if (structure.applicableTo === 'all') return true;

    const criteria = structure.applicationCriteria || {};

    if (structure.applicableTo === 'department' && criteria.departments) {
      return criteria.departments.includes(employee.departmentName);
    }

    if (structure.applicableTo === 'role' && criteria.roles) {
      return criteria.roles.includes(employee.jobTitle);
    }

    if (structure.applicableTo === 'position' && criteria.positions) {
      return criteria.positions.includes(employee.position);
    }

    if (criteria.minSalary && employee.baseSalary < criteria.minSalary) {
      return false;
    }

    if (criteria.maxSalary && employee.baseSalary > criteria.maxSalary) {
      return false;
    }

    return true;
  }

  /**
   * التحقق من الشرط
   */
  static meetsCriteria(employee, condition) {
    if (!condition) return true;

    // يمكن توسيع هذا لشروط أكثر تعقيداً
    if (condition.includes('high qualification')) {
      return employee.qualifications?.includes('advanced') || false;
    }

    if (condition.includes('management')) {
      return employee.level === 'manager' || employee.level === 'director';
    }

    return true;
  }

  /**
   * الحصول على آخر يوم من الشهر
   */
  static getLastDayOfMonth(monthStr, year) {
    const month = parseInt(monthStr.split('-')[1]);
    return new Date(year, month, 0);
  }

  /**
   * التحقق من اكتمال راتب الموظف
   */
  static async validatePayroll(payrollId) {
    try {
      const payroll = await Payroll.findById(payrollId);
      if (!payroll) {
        throw new Error('الراتب غير موجود');
      }

      const validations = {
        hasBaseSalary: payroll.baseSalary > 0,
        hasTotalGross: payroll.calculations.totalGross > 0,
        hasTotalNet: payroll.calculations.totalNet > 0,
        isCalculated: payroll.calculations.lastCalculatedAt != null,
        taxesCalculated: payroll.taxes.incomeTax >= 0,
      };

      const isValid = Object.values(validations).every(v => v === true);

      return {
        isValid,
        validations,
        errors: Object.keys(validations).filter(key => validations[key] === false),
      };
    } catch (error) {
      throw new Error(`خطأ في التحقق: ${error.message}`);
    }
  }
}

module.exports = PayrollCalculationService;
