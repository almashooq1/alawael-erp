/**
 * HR Compensation & Benefits Service - خدمة التعويضات والمزايا
 * إدارة شاملة للراتب والمزايا والتأمينات والمكافآت
 */

const Employee = require('../models/employee.model');
const CompensationPlan = require('../models/compensationPlan.model');
const Benefits = require('../models/benefits.model');

class HRCompensationBenefitsService {
  /**
   * إنشاء خطة تعويضات جديدة
   */
  static async createCompensationPlan(planData) {
    try {
      const plan = new CompensationPlan({
        name: planData.name,
        description: planData.description,
        baseSalary: planData.baseSalary,
        components: planData.components || {
          basicSalary: planData.baseSalary,
          houseAllowance: 0,
          transportAllowance: 0,
          mobileAllowance: 0,
          otherAllowances: 0,
        },
        benefits: planData.benefits || [],
        deductions: planData.deductions || [],
        createdBy: planData.createdBy,
        effectiveDate: planData.effectiveDate || new Date(),
        status: 'active',
      });

      // حساب الراتب الإجمالي
      plan.totalCompensation = this.calculateTotalCompensation(plan.components);

      await plan.save();

      return {
        success: true,
        message: 'تم إنشاء خطة التعويضات بنجاح',
        plan,
      };
    } catch (error) {
      throw new Error(`خطأ في إنشاء الخطة: ${error.message}`);
    }
  }

  /**
   * تعيين خطة تعويضات لموظف
   */
  static async assignCompensationPlan(employeeId, planId, assignedBy) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      const plan = await CompensationPlan.findById(planId);
      if (!plan) throw new Error('الخطة غير موجودة');

      // حفظ الخطة السابقة في السجل
      const previousPlan = employee.compensation?.planId;

      employee.compensation = {
        planId,
        assignedDate: new Date(),
        assignedBy,
        components: plan.components,
        totalCompensation: plan.totalCompensation,
        previousPlanId: previousPlan,
      };

      employee.benefits = {
        ...employee.benefits,
        availableBenefits: plan.benefits,
      };

      await employee.save();

      return {
        success: true,
        message: 'تم تعيين خطة التعويضات للموظف',
        employee,
      };
    } catch (error) {
      throw new Error(`خطأ في التعيين: ${error.message}`);
    }
  }

  /**
   * حساب الراتب مع المزايا والخصومات
   */
  static async calculatePayroll(employeeId, month, year) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      const compensation = employee.compensation || {};
      const benefits = employee.benefits || {};

      // الأجزاء الأساسية
      const basicSalary =
        compensation.components?.basicSalary || compensation.totalCompensation || 0;

      const allowances = {
        house: compensation.components?.houseAllowance || 0,
        transport: compensation.components?.transportAllowance || 0,
        mobile: compensation.components?.mobileAllowance || 0,
        other: compensation.components?.otherAllowances || 0,
      };

      const totalAllowances = Object.values(allowances).reduce((a, b) => a + b, 0);

      // الخصومات
      const deductions = this.calculateDeductions(employee, compensation);

      // المزايا النقدية
      const cashBenefits = this.calculateCashBenefits(benefits);

      // الراتب النهائي
      const grossSalary = basicSalary + totalAllowances;
      const netSalary = grossSalary - deductions.total + cashBenefits;

      return {
        employeeId,
        month: `${month}/${year}`,
        salary: {
          basicSalary: Math.round(basicSalary * 100) / 100,
          allowances: {
            house: allowances.house,
            transport: allowances.transport,
            mobile: allowances.mobile,
            other: allowances.other,
            total: Math.round(totalAllowances * 100) / 100,
          },
          grossSalary: Math.round(grossSalary * 100) / 100,
          deductions: {
            ...deductions,
          },
          cashBenefits: Math.round(cashBenefits * 100) / 100,
          netSalary: Math.round(netSalary * 100) / 100,
        },
        breakdown: {
          employeeId,
          name: employee.fullName,
          position: employee.position,
          department: employee.department,
        },
      };
    } catch (error) {
      throw new Error(`خطأ في حساب الراتب: ${error.message}`);
    }
  }

  /**
   * إدارة التأمين الصحي
   */
  static async enrollHealthInsurance(employeeId, insuranceData) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      if (!employee.benefits) {
        employee.benefits = {};
      }

      const insurance = {
        type: insuranceData.type, // 'basic', 'standard', 'premium'
        provider: insuranceData.provider,
        coverageAmount: insuranceData.coverageAmount,
        dependents: insuranceData.dependents || [],
        enrollmentDate: new Date(),
        effectiveDate: insuranceData.effectiveDate,
        status: 'active',
        monthlyPremium: insuranceData.monthlyPremium,
      };

      employee.benefits.healthInsurance = insurance;

      // إضافة قسط التأمين كخصم
      if (!employee.compensation) {
        employee.compensation = {};
      }

      if (!employee.compensation.deductions) {
        employee.compensation.deductions = {};
      }

      employee.compensation.deductions.healthInsurance = insurance.monthlyPremium;

      await employee.save();

      return {
        success: true,
        message: 'تم تسجيل التأمين الصحي بنجاح',
        insurance,
      };
    } catch (error) {
      throw new Error(`خطأ في التسجيل: ${error.message}`);
    }
  }

  /**
   * إدارة برنامج التقاعد
   */
  static async enrollRetirementPlan(employeeId, planData) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      if (!employee.benefits) {
        employee.benefits = {};
      }

      const retirementPlan = {
        type: planData.type, // 'pension', 'provident_fund', '401k'
        provider: planData.provider,
        contributionRate: planData.contributionRate, // نسبة المساهمة
        employerMatch: planData.employerMatch || 0,
        maturityAge: planData.maturityAge || 60,
        acceptanceDate: new Date(),
        status: 'active',
      };

      employee.benefits.retirementPlan = retirementPlan;

      // حساب المساهمة الشهرية
      const monthlyContribution =
        (employee.compensation?.totalCompensation || 0) * (retirementPlan.contributionRate / 100);

      if (!employee.compensation) employee.compensation = {};
      if (!employee.compensation.deductions) employee.compensation.deductions = {};

      employee.compensation.deductions.retirementContribution = monthlyContribution;
      employee.benefits.retirementBalance = employee.benefits.retirementBalance || 0;

      await employee.save();

      return {
        success: true,
        message: 'تم تسجيل برنامج التقاعد',
        plan: retirementPlan,
        monthlyContribution: Math.round(monthlyContribution * 100) / 100,
      };
    } catch (error) {
      throw new Error(`خطأ في التسجيل: ${error.message}`);
    }
  }

  /**
   * منح مزايا إضافية
   */
  static async grantBenefit(employeeId, benefitData) {
    try {
      const benefit = new Benefits({
        employeeId,
        type: benefitData.type, // 'car_allowance', 'gym', 'education', 'meal_voucher'
        description: benefitData.description,
        value: benefitData.value,
        currency: benefitData.currency || 'SAR',
        startDate: benefitData.startDate || new Date(),
        endDate: benefitData.endDate,
        frequency: benefitData.frequency, // 'monthly', 'quarterly', 'annual'
        status: 'active',
        grantedBy: benefitData.grantedBy,
        grantDate: new Date(),
      });

      await benefit.save();

      // تحديث توفر المزايا للموظف
      const employee = await Employee.findById(employeeId);
      if (!employee.benefits) employee.benefits = {};
      if (!employee.benefits.benefits) employee.benefits.benefits = [];

      employee.benefits.benefits.push({
        benefitId: benefit._id,
        type: benefit.type,
        value: benefit.value,
        frequency: benefit.frequency,
      });

      await employee.save();

      return {
        success: true,
        message: 'تم منح المزايا بنجاح',
        benefit,
      };
    } catch (error) {
      throw new Error(`خطأ في منح المزايا: ${error.message}`);
    }
  }

  /**
   * جلب ملخص المزايا للموظف
   */
  static async getBenefitsSummary(employeeId) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      const benefits = employee.benefits || {};
      const compensation = employee.compensation || {};

      const summary = {
        employeeId,
        fullName: employee.fullName,
        position: employee.position,
        salaryBenefits: {
          baseSalary: compensation.components?.basicSalary || 0,
          totalAllowances: this.calculateTotalAllowances(compensation.components),
          grossSalary: compensation.totalCompensation || 0,
        },
        healthInsurance: benefits.healthInsurance
          ? {
              type: benefits.healthInsurance.type,
              provider: benefits.healthInsurance.provider,
              coverageAmount: benefits.healthInsurance.coverageAmount,
              dependents: benefits.healthInsurance.dependents?.length || 0,
              status: benefits.healthInsurance.status,
            }
          : null,
        retirementPlan: benefits.retirementPlan
          ? {
              type: benefits.retirementPlan.type,
              provider: benefits.retirementPlan.provider,
              contributionRate: benefits.retirementPlan.contributionRate,
              employerMatch: benefits.retirementPlan.employerMatch,
              balance: benefits.retirementBalance || 0,
            }
          : null,
        additionalBenefits: benefits.benefits || [],
        leaveAllocation: {
          annual: {
            total: benefits.annualLeaveDays || 30,
            used: benefits.annualLeaveUsed || 0,
            remaining: (benefits.annualLeaveDays || 30) - (benefits.annualLeaveUsed || 0),
          },
          sick: {
            total: benefits.sickLeaveDays || 15,
            used: benefits.sickLeaveUsed || 0,
            remaining: (benefits.sickLeaveDays || 15) - (benefits.sickLeaveUsed || 0),
          },
          personal: {
            total: benefits.personalLeaveDays || 3,
            used: benefits.personalLeaveUsed || 0,
            remaining: (benefits.personalLeaveDays || 3) - (benefits.personalLeaveUsed || 0),
          },
        },
        totalBenefitsValue: this.calculateTotalBenefitsValue(benefits, compensation),
      };

      return summary;
    } catch (error) {
      throw new Error(`خطأ في جلب الملخص: ${error.message}`);
    }
  }

  /**
   * مقارنة التعويضات بين الموظفين
   */
  static async compareCompensation(employeeIds) {
    try {
      const employees = await Employee.find({ _id: { $in: employeeIds } });

      const comparison = employees.map(emp => ({
        employeeId: emp._id,
        fullName: emp.fullName,
        position: emp.position,
        department: emp.department,
        baseSalary: emp.compensation?.components?.basicSalary || 0,
        totalAllowances: this.calculateTotalAllowances(emp.compensation?.components),
        totalCompensation: emp.compensation?.totalCompensation || 0,
        healthInsurance: emp.benefits?.healthInsurance ? true : false,
        retirementPlan: emp.benefits?.retirementPlan ? true : false,
        additionalBenefits: emp.benefits?.benefits?.length || 0,
      }));

      // حساب الإحصائيات
      const salaries = comparison.map(c => c.totalCompensation);
      const stats = {
        average: Math.round((salaries.reduce((a, b) => a + b, 0) / salaries.length) * 100) / 100,
        min: Math.min(...salaries),
        max: Math.max(...salaries),
        median: this.calculateMedian(salaries),
        stdDev: this.calculateStandardDeviation(salaries),
      };

      return {
        comparison,
        statistics: stats,
        count: employees.length,
      };
    } catch (error) {
      throw new Error(`خطأ في المقارنة: ${error.message}`);
    }
  }

  /**
   * التحقق من الامتثال للمزايا الدنيا
   */
  static async checkBenefitsCompliance(employeeId) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      const compensation = employee.compensation || {};
      const benefits = employee.benefits || {};

      const compliance = {
        employeeId,
        fullName: employee.fullName,
        checks: {
          minimumWage: {
            required: true,
            actual: compensation.totalCompensation || 0,
            minimum: 2000, // الحد الأدنى
            compliant: (compensation.totalCompensation || 0) >= 2000,
          },
          healthInsurance: {
            required: true,
            actual: benefits.healthInsurance ? true : false,
            compliant: benefits.healthInsurance ? true : false,
          },
          retirementPlan: {
            required: true,
            actual: benefits.retirementPlan ? true : false,
            compliant: benefits.retirementPlan ? true : false,
          },
          annualLeave: {
            required: true,
            actual: benefits.annualLeaveDays || 0,
            minimum: 30,
            compliant: (benefits.annualLeaveDays || 0) >= 30,
          },
          endOfServiceBenefit: {
            required: true,
            actual: this.calculateEOSB(employee),
            compliant: this.calculateEOSB(employee) > 0,
          },
        },
        overallCompliance: true,
        nonCompliantItems: [],
      };

      // تحديد العناصر غير المتوافقة
      Object.keys(compliance.checks).forEach(key => {
        if (!compliance.checks[key].compliant) {
          compliance.nonCompliantItems.push(key);
          compliance.overallCompliance = false;
        }
      });

      return compliance;
    } catch (error) {
      throw new Error(`خطأ في التحقق: ${error.message}`);
    }
  }

  /**
   * حساب مكافأة نهاية الخدمة
   */
  static async calculateEndOfServiceBenefit(employeeId) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      const hireDate = new Date(employee.hireDate);
      const currentDate = new Date();
      const yearsOfService = (currentDate - hireDate) / (1000 * 60 * 60 * 24 * 365);

      const baseSalary = employee.compensation?.components?.basicSalary || 0;

      let eosb = 0;

      if (yearsOfService > 5) {
        // السنوات من 5-10: نصف الراتب الأساسي لكل سنة
        // السنوات من 10+: راتب أساسي كامل لكل سنة
        const yearsOver5 = Math.min(yearsOfService - 5, 5);
        const yearsOver10 = Math.max(yearsOfService - 10, 0);

        eosb = yearsOver5 * (baseSalary / 2) + yearsOver10 * baseSalary;
      }

      return {
        employeeId,
        fullName: employee.fullName,
        hireDate,
        yearsOfService: Math.round(yearsOfService * 100) / 100,
        baseSalary,
        endOfServiceBenefit: Math.round(eosb * 100) / 100,
        eligibleForEOSB: yearsOfService > 5,
      };
    } catch (error) {
      throw new Error(`خطأ في الحساب: ${error.message}`);
    }
  }

  /**
   * إنشاء تقرير التعويضات الشامل
   */
  static async generateCompensationReport(departmentFilter = null, options = {}) {
    try {
      let query = {};
      if (departmentFilter) {
        query.department = departmentFilter;
      }

      const employees = await Employee.find(query);

      const report = {
        generatedAt: new Date(),
        department: departmentFilter || 'جميع الأقسام',
        totalEmployees: employees.length,
        summary: {
          totalPayroll: 0,
          averageSalary: 0,
          salaryRange: {
            min: Infinity,
            max: -Infinity,
          },
        },
        employees: [],
      };

      employees.forEach(emp => {
        const compensation = emp.compensation || {};
        const totalComp = compensation.totalCompensation || 0;

        report.summary.totalPayroll += totalComp;
        report.summary.salaryRange.min = Math.min(report.summary.salaryRange.min, totalComp);
        report.summary.salaryRange.max = Math.max(report.summary.salaryRange.max, totalComp);

        report.employees.push({
          employeeId: emp._id,
          fullName: emp.fullName,
          position: emp.position,
          baseSalary: compensation.components?.basicSalary || 0,
          allowances: this.calculateTotalAllowances(compensation.components),
          totalCompensation: totalComp,
          benefits: {
            health: emp.benefits?.healthInsurance ? true : false,
            retirement: emp.benefits?.retirementPlan ? true : false,
            additional: emp.benefits?.benefits?.length || 0,
          },
        });
      });

      report.summary.averageSalary =
        Math.round((report.summary.totalPayroll / employees.length) * 100) / 100;

      return report;
    } catch (error) {
      throw new Error(`خطأ في إنشاء التقرير: ${error.message}`);
    }
  }

  // ============= Helper Methods =============

  static calculateTotalCompensation(components = {}) {
    return (
      (components.basicSalary || 0) +
      (components.houseAllowance || 0) +
      (components.transportAllowance || 0) +
      (components.mobileAllowance || 0) +
      (components.otherAllowances || 0)
    );
  }

  static calculateTotalAllowances(components = {}) {
    return (
      (components.houseAllowance || 0) +
      (components.transportAllowance || 0) +
      (components.mobileAllowance || 0) +
      (components.otherAllowances || 0)
    );
  }

  static calculateDeductions(employee, compensation) {
    const deductions = compensation.deductions || {};

    return {
      healthInsurance: deductions.healthInsurance || 0,
      retirementContribution: deductions.retirementContribution || 0,
      incomeTax: this.calculateIncomeTax(compensation.totalCompensation || 0),
      socialSecurity: (compensation.totalCompensation || 0) * 0.1, // 10%
      other: deductions.other || 0,
      total:
        (deductions.healthInsurance || 0) +
        (deductions.retirementContribution || 0) +
        this.calculateIncomeTax(compensation.totalCompensation || 0) +
        (compensation.totalCompensation || 0) * 0.1 +
        (deductions.other || 0),
    };
  }

  static calculateIncomeTax(salary) {
    // نموذج ضريبة دخل مبسط
    if (salary <= 3000) return 0;
    if (salary <= 5000) return (salary - 3000) * 0.05;
    return 100 + (salary - 5000) * 0.1;
  }

  static calculateCashBenefits(benefits = {}) {
    let cashBenefits = 0;

    if (benefits.bonusPayment) {
      cashBenefits += benefits.bonusPayment;
    }

    return cashBenefits;
  }

  static calculateTotalBenefitsValue(benefits = {}, compensation = {}) {
    let value = compensation.totalCompensation || 0;

    // قيمة التأمين الصحي
    if (benefits.healthInsurance) {
      value += benefits.healthInsurance.coverageAmount * 0.1; // قيمة محسوبة
    }

    // قيمة برنامج التقاعد
    if (benefits.retirementPlan) {
      value +=
        (compensation.totalCompensation || 0) * (benefits.retirementPlan.contributionRate / 100);
    }

    // قيمة المزايا الإضافية
    if (benefits.benefits && Array.isArray(benefits.benefits)) {
      benefits.benefits.forEach(b => {
        if (b.value) value += b.value;
      });
    }

    return Math.round(value * 100) / 100;
  }

  static calculateEOSB(employee) {
    const hireDate = new Date(employee.hireDate);
    const currentDate = new Date();
    const yearsOfService = (currentDate - hireDate) / (1000 * 60 * 60 * 24 * 365);

    if (yearsOfService <= 5) return 0;

    const baseSalary = employee.compensation?.components?.basicSalary || 0;
    const yearsOver5 = Math.min(yearsOfService - 5, 5);
    const yearsOver10 = Math.max(yearsOfService - 10, 0);

    return yearsOver5 * (baseSalary / 2) + yearsOver10 * baseSalary;
  }

  static calculateMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  static calculateStandardDeviation(arr) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }
}

module.exports = HRCompensationBenefitsService;
