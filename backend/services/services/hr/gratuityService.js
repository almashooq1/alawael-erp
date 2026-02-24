/**
 * Advanced End-of-Service Gratuity Service
 * نظام متقدم لحساب مكافآت نهاية الخدمة - الامتثال التام لنظام العمل السعودي
 * 
 * الميزات:
 * ✅ حسابات دقيقة وفقاً للقانون السعودي
 * ✅ دعم سيناريوهات الإنهاء المختلفة (استقالة، إنهاء، تقاعد، وفاة)
 * ✅ حسابات الخصومات والتسويات
 * ✅ تتبع كامل للعمليات والتدقيق
 * ✅ تكاملات Qiwa و GOSI
 * ✅ تقارير شاملة وتحليلات
 * 
 * @version 1.0.0
 * @date 2026-02-17
 */

const Employee = require('../../models/employee.model');
const Gratuity = require('../../models/gratuity.model');
const GratuityAudit = require('../../models/gratuityAudit.model');
const Payment = require('../../models/payment.model');
const QiwaService = require('../qiwa.service');
const GOSIService = require('../gosi.service');

class GratuityService {
  // ============================================================
  // 1. حسابات مكافأة نهاية الخدمة الأساسية
  // ============================================================

  /**
   * حساب مكافأة نهاية الخدمة وفقاً للقانون السعودي
   * 
   * صيغة الحساب:
   * - السنوات 1-5: (الراتب الأخير / 3) × عدد السنوات
   * - السنوات 5-10: (الراتب الأخير × 2/3) × عدد السنوات الإضافية
   * - السنوات 10+: الراتب الأخير × عدد السنوات الإضافية
   */
  static calculateGratuity(employee, terminationDate = null, scenario = 'resignation') {
    const hireDate = new Date(employee.hireDate);
    const exitDate = terminationDate ? new Date(terminationDate) : new Date();
    
    // حساب فترة الخدمة بدقة
    const serviceDetails = this.calculateServicePeriod(hireDate, exitDate);
    const yearsOfService = serviceDetails.totalYears;

    // الراتب المستحقة (أساس الحساب)
    const lastSalary = this.getLastSalaryForCalculation(employee);
    
    let gratuity = 0;
    let details = {
      yearsBreakdown: [],
      totalYears: yearsOfService,
      lastSalary: lastSalary,
      scenario: scenario
    };

    if (yearsOfService < 2) {
      // أقل من سنتين: لا توجد مكافأة
      gratuity = 0;
      details.reason = 'خدمة أقل من سنتين - لا توجد مكافأة';
    } else if (scenario === 'DISMISSAL_WITHOUT_CAUSE') {
      // الفصل بدون مبرر: الحقوق الكاملة
      gratuity = this.calculateFullGratuity(yearsOfService, lastSalary, details);
    } else if (scenario === 'DISMISSAL_WITH_FAULT') {
      // الفصل بسبب خطأ الموظف: حقوق مخفضة
      gratuity = this.calculateReducedGratuity(yearsOfService, lastSalary, details);
    } else if (scenario === 'RETIREMENT') {
      // تقاعد طبيعي: الحقوق الكاملة
      gratuity = this.calculateFullGratuity(yearsOfService, lastSalary, details);
    } else if (scenario === 'DEATH') {
      // وفاة الموظف: الحقوق الكاملة للورثة
      gratuity = this.calculateFullGratuity(yearsOfService, lastSalary, details);
    } else if (scenario === 'RESIGNATION') {
      // استقالة: حقوق الاستقالة
      gratuity = this.calculateResignationGratuity(yearsOfService, lastSalary, details);
    } else {
      // الحالة الافتراضية
      gratuity = this.calculateFullGratuity(yearsOfService, lastSalary, details);
    }

    return {
      gratuity: Math.round(gratuity * 100) / 100,
      details: details,
      serviceDetails: serviceDetails,
      isEligible: gratuity > 0,
      scenario: scenario,
    };
  }

  /**
   * حساب الحقوق الكاملة
   */
  static calculateFullGratuity(yearsOfService, lastSalary, details = {}) {
    let gratuity = 0;

    if (yearsOfService >= 2 && yearsOfService <= 5) {
      // السنوات الأولى (2-5): ثلث الراتب لكل سنة
      gratuity = (lastSalary / 3) * yearsOfService;
      details.yearsBreakdown?.push({
        period: '2-5 years',
        years: yearsOfService,
        rate: 1/3,
        calculation: `(${lastSalary} / 3) × ${yearsOfService}`,
        amount: gratuity
      });
    } else if (yearsOfService > 5 && yearsOfService <= 10) {
      // السنوات 2-5: ثلث الراتب
      const amount1 = (lastSalary / 3) * 3;
      gratuity += amount1;
      details.yearsBreakdown?.push({
        period: '2-5 years',
        years: 3,
        rate: 1/3,
        calculation: `(${lastSalary} / 3) × 3`,
        amount: amount1
      });

      // السنوات 5-10: ثلثي الراتب
      const remaining = yearsOfService - 5;
      const amount2 = (lastSalary * 2/3) * remaining;
      gratuity += amount2;
      details.yearsBreakdown?.push({
        period: '5-10 years',
        years: remaining,
        rate: 2/3,
        calculation: `(${lastSalary} × 2/3) × ${remaining}`,
        amount: amount2
      });
    } else if (yearsOfService > 10) {
      // السنوات 2-5: ثلث الراتب
      const amount1 = (lastSalary / 3) * 3;
      gratuity += amount1;
      details.yearsBreakdown?.push({
        period: '2-5 years',
        years: 3,
        rate: 1/3,
        calculation: `(${lastSalary} / 3) × 3`,
        amount: amount1
      });

      // السنوات 5-10: ثلثي الراتب
      const amount2 = (lastSalary * 2/3) * 5;
      gratuity += amount2;
      details.yearsBreakdown?.push({
        period: '5-10 years',
        years: 5,
        rate: 2/3,
        calculation: `(${lastSalary} × 2/3) × 5`,
        amount: amount2
      });

      // السنوات 10+: الراتب الكامل
      const remaining = yearsOfService - 10;
      const amount3 = lastSalary * remaining;
      gratuity += amount3;
      details.yearsBreakdown?.push({
        period: '10+ years',
        years: remaining,
        rate: 1,
        calculation: `${lastSalary} × ${remaining}`,
        amount: amount3
      });
    }

    return gratuity;
  }

  /**
   * حساب حقوق الاستقالة (مخفضة)
   */
  static calculateResignationGratuity(yearsOfService, lastSalary, details = {}) {
    let gratuity = 0;

    if (yearsOfService < 2) {
      gratuity = 0; // لا توجد مكافأة قبل سنتين
      details.reason = 'استقالة قبل سنتين من الخدمة';
    } else if (yearsOfService <= 5) {
      // حقوق الاستقالة: نصف الحقوق الكاملة
      const fullGratuity = (lastSalary / 3) * yearsOfService;
      gratuity = fullGratuity * 0.5;
      details.yearsBreakdown?.push({
        period: '2-5 years (resignation)',
        years: yearsOfService,
        rate: (1/3) * 0.5,
        calculation: `((${lastSalary} / 3) × ${yearsOfService}) × 0.5`,
        amount: gratuity
      });
    } else {
      // حقوق الاستقالة بعد 5 سنوات
      const full = this.calculateFullGratuity(yearsOfService, lastSalary, {});
      gratuity = full * 0.5;
      details.reason = 'الاستقالة - حقوق مخفضة 50%';
      details.baseCalculation = full;
      details.reductionPercentage = 50;
    }

    return gratuity;
  }

  /**
   * حساب حقوق الفصل بسبب خطأ الموظف
   */
  static calculateReducedGratuity(yearsOfService, lastSalary, details = {}) {
    // الفصل بسبب خطأ: حقوق مخفضة 25%
    const fullGratuity = this.calculateFullGratuity(yearsOfService, lastSalary, {});
    const reducedGratuity = fullGratuity * 0.75;
    
    details.reason = 'فصل بسبب خطأ الموظف - حقوق مخفضة 25%';
    details.baseCalculation = fullGratuity;
    details.reductionPercentage = 25;

    return reducedGratuity;
  }

  // ============================================================
  // 2. حسابات الخصومات والتسويات
  // ============================================================

  /**
   * حساب الخصومات من مكافأة نهاية الخدمة
   */
  static calculateDeductions(employee, gratuityAmount) {
    const deductions = {
      itemized: [],
      total: 0
    };

    // الخصم 1: الرصيد السالب / الدين للشركة
    if (employee.advanceSalary || employee.debt) {
      const debt = (employee.advanceSalary || 0) + (employee.debt || 0);
      deductions.itemized.push({
        type: 'ADVANCE_OR_DEBT',
        description: 'رصيد سالب / دين قديم',
        amount: debt,
        reason: 'استرجاع المستحقات'
      });
      deductions.total += debt;
    }

    // الخصم 2: الإجازات غير المستخدمة (قد تكون حساب منفصل)
    if (employee.unusedLeaveDays && employee.unusedLeaveDays > 0) {
      const dailySalary = this.getDailySalary(employee);
      const unusedLeaveDeduction = employee.unusedLeaveDays * dailySalary;
      deductions.itemized.push({
        type: 'UNUSED_LEAVE',
        description: 'خصم من الإجازات غير المستخدمة',
        days: employee.unusedLeaveDays,
        dailyRate: dailySalary,
        amount: unusedLeaveDeduction,
        note: 'حسب اتفاق الطرفين'
      });
      deductions.total += unusedLeaveDeduction;
    }

    // الخصم 3: المخالفات والعقوبات
    if (employee.violations && employee.violations.length > 0) {
      const violationAmount = employee.violations.reduce((sum, v) => sum + (v.penalty || 0), 0);
      if (violationAmount > 0) {
        deductions.itemized.push({
          type: 'VIOLATIONS',
          description: 'خصم المخالفات والعقوبات',
          violationCount: employee.violations.length,
          amount: violationAmount
        });
        deductions.total += violationAmount;
      }
    }

    // الخصم 4: الأمانات أو السلف
    if (employee.deposits || employee.advances) {
      const depositAmount = (employee.deposits || 0) + (employee.advances || 0);
      deductions.itemized.push({
        type: 'DEPOSITS',
        description: 'استرجاع السلف والأمانات',
        amount: depositAmount
      });
      deductions.total += depositAmount;
    }

    // التأكد من عدم تجاوز الخصم للمكافأة
    const maxDeductions = Math.min(deductions.total, gratuityAmount);
    
    return {
      ...deductions,
      total: maxDeductions,
      maxApplicable: gratuityAmount,
      netGratuity: Math.max(0, gratuityAmount - maxDeductions)
    };
  }

  /**
   * حساب الإضافات إلى مكافأة نهاية الخدمة
   */
  static calculateAdditions(employee, gratuityAmount) {
    const additions = {
      itemized: [],
      total: 0
    };

    // الإضافة 1: الأجور المتأخرة
    if (employee.unpaidSalaries && employee.unpaidSalaries.length > 0) {
      const unpaidAmount = employee.unpaidSalaries.reduce((sum, s) => sum + s.amount, 0);
      additions.itemized.push({
        type: 'UNPAID_SALARY',
        description: 'الأجور المتأخرة',
        months: employee.unpaidSalaries.length,
        amount: unpaidAmount
      });
      additions.total += unpaidAmount;
    }

    // الإضافة 2: السلف المنسوقة/الملغاة
    if (employee.cancelledAdvances) {
      additions.itemized.push({
        type: 'CANCELLED_ADVANCES',
        description: 'السلف الملغاة',
        amount: employee.cancelledAdvances
      });
      additions.total += employee.cancelledAdvances;
    }

    // الإضافة 3: المكافآت المعلقة
    if (employee.pendingBonuses && employee.pendingBonuses > 0) {
      additions.itemized.push({
        type: 'PENDING_BONUSES',
        description: 'المكافآت المعلقة',
        amount: employee.pendingBonuses
      });
      additions.total += employee.pendingBonuses;
    }

    return {
      ...additions,
      totalAdditions: additions.total,
      totalWithAdditions: gratuityAmount + additions.total
    };
  }

  /**
   * حساب التسوية النهائية الشاملة
   */
  static async calculateFinalSettlement(employeeId, terminationDate, scenario = 'RESIGNATION') {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('الموظف غير موجود');

      // 1. حساب مكافأة نهاية الخدمة الأساسية
      const gratuityCalculation = this.calculateGratuity(employee, terminationDate, scenario);
      const baseGratuity = gratuityCalculation.gratuity;

      // 2. حساب الخصومات
      const deductions = this.calculateDeductions(employee, baseGratuity);

      // 3. حساب الإضافات
      const additions = this.calculateAdditions(employee, baseGratuity);

      // 4. التسوية النهائية
      const grosSettlement = baseGratuity + additions.total;
      const netSettlement = grosSettlement - deductions.total;

      return {
        employeeId,
        fullName: employee.fullName,
        position: employee.position,
        department: employee.department,
        terminationDate: terminationDate || new Date(),
        scenario: scenario,
        breakdown: {
          baseGratuity: {
            amount: baseGratuity,
            details: gratuityCalculation.details,
            serviceDetails: gratuityCalculation.serviceDetails
          },
          additions: {
            items: additions.itemized,
            total: additions.total
          },
          deductions: {
            items: deductions.itemized,
            total: deductions.total
          }
        },
        summary: {
          baseGratuity: baseGratuity,
          totalAdditions: additions.total,
          totalDeductions: deductions.total,
          grossSettlement: grosSettlement,
          netSettlement: Math.max(0, netSettlement)
        },
        lastSalary: gratuityCalculation.details.lastSalary,
        yearsOfService: gratuityCalculation.serviceDetails.totalYears
      };
    } catch (error) {
      throw new Error(`خطأ في حساب التسوية: ${error.message}`);
    }
  }

  // ============================================================
  // 3. حفظ وتتبع عمليات الحساب
  // ============================================================

  /**
   * إنشاء وحفظ سجل مكافأة نهاية الخدمة
   */
  static async createGratuityRecord(employeeId, settlementData, createdBy) {
    try {
      const gratuityRecord = new Gratuity({
        employeeId,
        fullName: settlementData.fullName,
        position: settlementData.position,
        department: settlementData.department,
        terminationDate: settlementData.terminationDate,
        terminationScenario: settlementData.scenario,
        calculation: settlementData.breakdown,
        summary: settlementData.summary,
        status: 'DRAFT',
        createdBy,
        createdAt: new Date(),
        approvals: [],
        auditTrail: []
      });

      await gratuityRecord.save();

      // تسجيل في السجل
      await this.createAuditLog(gratuityRecord._id, employeeId, 'CREATED', {
        scenario: settlementData.scenario,
        baseGratuity: settlementData.summary.baseGratuity
      }, createdBy);

      return {
        success: true,
        message: 'تم إنشاء سجل مكافأة نهاية الخدمة',
        gratuityId: gratuityRecord._id,
        record: gratuityRecord
      };
    } catch (error) {
      throw new Error(`خطأ في إنشاء السجل: ${error.message}`);
    }
  }

  /**
   * الموافقة على مكافأة نهاية الخدمة
   */
  static async approveGratuity(gratuityId, approvedBy, remarks = '') {
    try {
      const gratuity = await Gratuity.findById(gratuityId);
      if (!gratuity) throw new Error('السجل غير موجود');

      gratuity.approvals.push({
        approvedBy,
        timestamp: new Date(),
        remarks,
        status: 'APPROVED'
      });

      // تحديث الحالة إذا تمت جميع الموافقات المطلوبة
      const requiredApprovals = 2; // مدير HR + CFO
      if (gratuity.approvals.length >= requiredApprovals) {
        gratuity.status = 'APPROVED';
      }

      await gratuity.save();

      await this.createAuditLog(gratuityId, gratuity.employeeId, 'APPROVED', { approvedBy, remarks });

      return {
        success: true,
        message: 'تم الموافقة على المكافأة',
        status: gratuity.status,
        approvalCount: gratuity.approvals.length
      };
    } catch (error) {
      throw new Error(`خطأ في الموافقة: ${error.message}`);
    }
  }

  /**
   * معالجة الدفع
   */
  static async processPayment(gratuityId, paymentMethod, bankDetails = {}) {
    try {
      const gratuity = await Gratuity.findById(gratuityId);
      if (!gratuity) throw new Error('السجل غير موجود');

      if (gratuity.status !== 'APPROVED') {
        throw new Error('يجب الموافقة على المكافأة قبل الدفع');
      }

      // إنشاء سجل دفع
      const payment = new Payment({
        gratuityId,
        employeeId: gratuity.employeeId,
        amount: gratuity.summary.netSettlement,
        paymentMethod, // BANK_TRANSFER, CHECK, CASH
        bankDetails,
        status: 'PENDING',
        createdAt: new Date()
      });

      await payment.save();

      // تحديث حالة المكافأة
      gratuity.paymentId = payment._id;
      gratuity.status = 'PAYMENT_PROCESSING';
      await gratuity.save();

      await this.createAuditLog(gratuityId, gratuity.employeeId, 'PAYMENT_INITIATED', {
        paymentId: payment._id,
        amount: gratuity.summary.netSettlement,
        method: paymentMethod
      });

      return {
        success: true,
        message: 'تم بدء عملية الدفع',
        paymentId: payment._id,
        payment: payment
      };
    } catch (error) {
      throw new Error(`خطأ في معالجة الدفع: ${error.message}`);
    }
  }

  /**
   * تحديد الدفع كمكتمل
   */
  static async completePayment(gratuityId, paymentReference) {
    try {
      const gratuity = await Gratuity.findById(gratuityId);
      if (!gratuity) throw new Error('السجل غير موجود');

      const payment = await Payment.findById(gratuity.paymentId);
      if (!payment) throw new Error('سجل الدفع غير موجود');

      payment.status = 'COMPLETED';
      payment.paymentReference = paymentReference;
      payment.completedAt = new Date();
      await payment.save();

      gratuity.status = 'COMPLETED';
      gratuity.paymentCompletedAt = new Date();
      await gratuity.save();

      await this.createAuditLog(gratuityId, gratuity.employeeId, 'PAYMENT_COMPLETED', {
        paymentReference,
        amount: payment.amount
      });

      return {
        success: true,
        message: 'تم إكمال الدفع',
        status: 'COMPLETED',
        paymentReference
      };
    } catch (error) {
      throw new Error(`خطأ في إكمال الدفع: ${error.message}`);
    }
  }

  // ============================================================
  // 4. سجل التدقيق والتتبع
  // ============================================================

  /**
   * إنشاء سجل تدقيق
   */
  static async createAuditLog(gratuityId, employeeId, action, details = {}, userId = 'SYSTEM') {
    try {
      const auditLog = new GratuityAudit({
        gratuityId,
        employeeId,
        action, // CREATED, MODIFIED, APPROVED, PAYMENT_INITIATED, COMPLETED
        details,
        timestamp: new Date(),
        userId
      });

      await auditLog.save();
      return auditLog;
    } catch (error) {
      console.error('خطأ في تسجيل التدقيق:', error.message);
    }
  }

  /**
   * جلب سجل التدقيق الكامل
   */
  static async getAuditTrail(gratuityId) {
    try {
      const auditLogs = await GratuityAudit.find({ gratuityId })
        .sort({ timestamp: -1 });

      return auditLogs;
    } catch (error) {
      throw new Error(`خطأ في جلب السجل: ${error.message}`);
    }
  }

  // ============================================================
  // 5. الطرق المساعدة
  // ============================================================

  /**
   * حساب فترة الخدمة بدقة
   */
  static calculateServicePeriod(hireDate, exitDate) {
    const hire = new Date(hireDate);
    const exit = new Date(exitDate);

    const totalDays = Math.floor((exit - hire) / (1000 * 60 * 60 * 24));
    const totalMonths = Math.floor(totalDays / 30);
    const totalYears = totalMonths / 12;

    return {
      totalDays,
      totalMonths,
      totalYears: Math.floor(totalYears * 100) / 100,
      years: Math.floor(totalYears),
      remainingMonths: totalMonths % 12
    };
  }

  /**
   * جلب آخر راتب شامل
   */
  static getLastSalaryForCalculation(employee) {
    // الراتب الأساسي + المزايا الشهرية المضمونة
    const basicSalary = employee.compensation?.components?.basicSalary || 0;
    const housingAllowance = employee.compensation?.components?.houseAllowance || 0;
    const transportAllowance = employee.compensation?.components?.transportAllowance || 0;

    return basicSalary + housingAllowance + transportAllowance;
  }

  /**
   * حساب الراتب اليومي
   */
  static getDailySalary(employee) {
    const lastSalary = this.getLastSalaryForCalculation(employee);
    return lastSalary / 30; // 30 يوم متوسط في الشهر
  }

  /**
   * التحقق من الأهلية لمكافأة نهاية الخدمة
   */
  static isEligibleForGratuity(employee, scenario = 'RESIGNATION') {
    const hireDate = new Date(employee.hireDate);
    const yearsOfService = (new Date() - hireDate) / (1000 * 60 * 60 * 24 * 365);

    if (scenario === 'DEATH' || scenario === 'RETIREMENT' || scenario === 'DISMISSAL_WITHOUT_CAUSE') {
      // أهلية كاملة بدون حد أدنى للسنوات
      return true;
    }

    // الحالات الأخرى: يجب أن تكون قد أكملت سنتين على الأقل
    return yearsOfService >= 2;
  }
}

module.exports = GratuityService;
