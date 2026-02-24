/**
 * Gratuity Calculation Utilities
 * أدوات مساعدة لحسابات مكافآت نهاية الخدمة
 * 
 * تتضمن:
 * - محاكاة السيناريوهات المختلفة
 * - مقارنات الحسابات
 * - تحقق من الصيغ
 * - معالجات خاصة
 * 
 * @version 1.0.0
 */

class GratuityCalculationUtils {
  /**
   * المعايير السعودية لحسابات المكافآت
   */
  static SAUDI_LABOR_STANDARDS = {
    MINIMUM_SERVICE_YEARS: 2,
    TIER1_RATE: 1/3,          // السنوات 2-5
    TIER2_RATE: 2/3,          // السنوات 5-10
    TIER3_RATE: 1,            // السنوات 10+
    TIER1_YEARS: 3,           // عدد السنوات للمرحلة الأولى (2-5)
    TIER2_YEARS: 5,           // عدد السنوات للمرحلة الثانية (5-10)
    RESIGNATION_REDUCTION: 0.5, // تخفيض الاستقالة 50%
    FAULT_DISMISSAL_REDUCTION: 0.25 // تخفيض الفصل بخطأ 25%
  };

  // ============================================================
  // 1. محاكاة السيناريوهات
  // ============================================================

  /**
   * محاكاة مقارنة جميع السيناريوهات الممكنة
   */
  static simulateAllScenarios(employee, terminationDate) {
    const scenarios = [
      'RESIGNATION',
      'DISMISSAL_WITHOUT_CAUSE',
      'DISMISSAL_WITH_FAULT',
      'RETIREMENT',
      'DEATH'
    ];

    const GratuityService = require('../services/hr/gratuityService');
    
    const simulations = {};
    scenarios.forEach(scenario => {
      const calc = GratuityService.calculateGratuity(
        employee,
        terminationDate,
        scenario
      );
      simulations[scenario] = {
        gratuity: calc.gratuity,
        scenario: scenario,
        isEligible: calc.isEligible
      };
    });

    // ترتيب حسب المبلغ (الأعلى أولاً)
    const sorted = Object.entries(simulations)
      .sort((a, b) => b[1].gratuity - a[1].gratuity)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});

    return {
      simulations: sorted,
      bestCase: Object.entries(sorted)[0][1].gratuity,
      worstCase: Object.entries(sorted)[Object.entries(sorted).length - 1][1].gratuity,
      difference: Object.entries(sorted)[0][1].gratuity - 
                  Object.entries(sorted)[Object.entries(sorted).length - 1][1].gratuity
    };
  }

  /**
   * محاكاة تأثير تغيير تاريخ الإنهاء
   */
  static simulateDateVariation(employee, baseDate, daysVariation = 30) {
    const GratuityService = require('../services/hr/gratuityService');
    
    const results = [];
    const baseDate_obj = new Date(baseDate);

    for (let days = -daysVariation; days <= daysVariation; days += 1) {
      const testDate = new Date(baseDate_obj);
      testDate.setDate(testDate.getDate() + days);

      const calc = GratuityService.calculateGratuity(employee, testDate);

      results.push({
        date: testDate.toISOString().split('T')[0],
        daysFromBase: days,
        gratuity: calc.gratuity,
        yearsOfService: calc.serviceDetails.totalYears
      });
    }

    return {
      baseDate: baseDate,
      variations: results,
      minGratuity: Math.min(...results.map(r => r.gratuity)),
      maxGratuity: Math.max(...results.map(r => r.gratuity)),
      optimalDate: results.reduce((max, current) => 
        current.gratuity > max.gratuity ? current : max
      )
    };
  }

  /**
   * محاكاة تأثير تغيير الراتب الأساسي
   */
  static simulateSalaryVariation(employee, baseTerminationDate, salaryPercentages = [90, 95, 100, 105, 110]) {
    const GratuityService = require('../services/hr/gratuityService');
    
    const baseSalary = GratuityService.getLastSalaryForCalculation(employee);
    const results = [];

    salaryPercentages.forEach(percentage => {
      const adjustedEmployee = JSON.parse(JSON.stringify(employee));
      const factor = percentage / 100;
      
      adjustedEmployee.compensation.components.basicSalary *= factor;
      adjustedEmployee.compensation.components.houseAllowance *= factor;
      adjustedEmployee.compensation.components.transportAllowance *= factor;

      const calc = GratuityService.calculateGratuity(adjustedEmployee, baseTerminationDate);

      results.push({
        salaryPercentage: percentage,
        adjustedSalary: baseSalary * factor,
        gratuity: calc.gratuity,
        percentageChange: ((percentage - 100) / 100) * 100
      });
    });

    return {
      baseSalary: baseSalary,
      variations: results,
      elasticity: this.calculateElasticity(results)
    };
  }

  /**
   * حساب مرونة الراتب (elasticity)
   */
  static calculateElasticity(salaryVariations) {
    if (salaryVariations.length < 2) return 0;

    const first = salaryVariations[0];
    const last = salaryVariations[salaryVariations.length - 1];

    const salaryChange = ((last.adjustedSalary - first.adjustedSalary) / first.adjustedSalary) * 100;
    const gratuityChange = ((last.gratuity - first.gratuity) / first.gratuity) * 100;

    return gratuityChange / salaryChange;
  }

  // ============================================================
  // 2. مقارنات متقدمة
  // ============================================================

  /**
   * مقارنة مجموعة من موظفين في نفس التاريخ
   */
  static compareMultipleEmployees(employees, terminationDate, scenario = 'RESIGNATION') {
    const GratuityService = require('../services/hr/gratuityService');
    
    const comparisons = employees.map(emp => {
      const calc = GratuityService.calculateGratuity(emp, terminationDate, scenario);
      return {
        employeeId: emp._id,
        fullName: emp.fullName,
        position: emp.position,
        baseSalary: GratuityService.getLastSalaryForCalculation(emp),
        yearsOfService: calc.serviceDetails.totalYears,
        gratuity: calc.gratuity
      };
    });

    // حساب الإحصائيات
    const gratuities = comparisons.map(c => c.gratuity);
    const stats = {
      count: comparisons.length,
      total: gratuities.reduce((a, b) => a + b, 0),
      average: gratuities.reduce((a, b) => a + b, 0) / comparisons.length,
      min: Math.min(...gratuities),
      max: Math.max(...gratuities),
      median: this.calculateMedian(gratuities),
      stdDev: this.calculateStandardDeviation(gratuities),
      variance: this.calculateVariance(gratuities)
    };

    return {
      scenario: scenario,
      terminationDate: terminationDate,
      comparisons: comparisons.sort((a, b) => b.gratuity - a.gratuity),
      statistics: stats,
      distribution: this.analyzeDistribution(gratuities)
    };
  }

  /**
   * تحليل توزيع المكافآت
   */
  static analyzeDistribution(gratuities) {
    if (gratuities.length === 0) return null;

    const sorted = [...gratuities].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const range = max - min;

    // تقسيم إلى فئات
    const bins = 5;
    const binSize = range / bins;
    const distribution = {};

    for (let i = 0; i < bins; i++) {
      const binStart = min + (i * binSize);
      const binEnd = binStart + binSize;
      const count = gratuities.filter(g => g >= binStart && g < binEnd).length;
      distribution[`${Math.round(binStart)}-${Math.round(binEnd)}`] = count;
    }

    return {
      range: { min, max },
      binCount: bins,
      distribution: distribution,
      skewness: this.calculateSkewness(gratuities),
      kurtosis: this.calculateKurtosis(gratuities)
    };
  }

  // ============================================================
  // 3. التحقق من الصحة والدقة
  // ============================================================

  /**
   * التحقق من صحة الحساب
   */
  static validateCalculation(gratuityRecord) {
    const errors = [];
    const warnings = [];

    // التحقق من الأساسيات
    if (!gratuityRecord.summary || !gratuityRecord.summary.baseGratuity) {
      errors.push('مكافأة أساسية مفقودة');
    }

    if (gratuityRecord.summary.baseGratuity < 0) {
      errors.push('مكافأة أساسية سالبة');
    }

    // التحقق من الخصومات
    if (gratuityRecord.summary.totalDeductions > gratuityRecord.summary.baseGratuity) {
      warnings.push('إجمالي الخصومات يتجاوز المكافأة الأساسية');
    }

    // التحقق من صيغة الحساب
    const calculated = 
      gratuityRecord.summary.baseGratuity +
      gratuityRecord.summary.totalAdditions -
      gratuityRecord.summary.totalDeductions;

    const tolerance = 0.01; // دقة 0.01
    if (Math.abs(calculated - gratuityRecord.summary.netSettlement) > tolerance) {
      errors.push('عدم مطابقة في صيغة الحساب');
    }

    // التحقق من سيناريو الإنهاء
    const validScenarios = [
      'RESIGNATION',
      'DISMISSAL_WITHOUT_CAUSE',
      'DISMISSAL_WITH_FAULT',
      'RETIREMENT',
      'DEATH'
    ];

    if (!validScenarios.includes(gratuityRecord.terminationScenario)) {
      errors.push('سيناريو إنهاء غير صالح');
    }

    // التحقق من الموافقات
    if (gratuityRecord.status === 'COMPLETED' && gratuityRecord.approvals.length < 2) {
      warnings.push('عدد الموافقات أقل من المطلوب');
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      summary: {
        errorCount: errors.length,
        warningCount: warnings.length
      }
    };
  }

  /**
   * مقارنة حسابين لكشف الاختلافات
   */
  static compareCalculations(calc1, calc2) {
    const differences = {
      baseGratuity: {
        calc1: calc1.gratuity,
        calc2: calc2.gratuity,
        difference: calc1.gratuity - calc2.gratuity,
        percentage: ((calc1.gratuity - calc2.gratuity) / calc2.gratuity) * 100
      },
      serviceYears: {
        calc1: calc1.serviceDetails?.totalYears,
        calc2: calc2.serviceDetails?.totalYears,
        difference: (calc1.serviceDetails?.totalYears || 0) - (calc2.serviceDetails?.totalYears || 0)
      },
      scenario: {
        calc1: calc1.scenario,
        calc2: calc2.scenario,
        same: calc1.scenario === calc2.scenario
      }
    };

    return {
      differences: differences,
      identical: Math.abs(differences.baseGratuity.difference) < 0.01,
      significantDifference: Math.abs(differences.baseGratuity.percentage) > 5
    };
  }

  // ============================================================
  // 4. أدوات إحصائية مساعدة
  // ============================================================

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

  static calculateVariance(arr) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  }

  static calculateSkewness(arr) {
    if (arr.length < 3) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const stdDev = this.calculateStandardDeviation(arr);
    const skew = arr.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / arr.length;
    return skew;
  }

  static calculateKurtosis(arr) {
    if (arr.length < 4) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const stdDev = this.calculateStandardDeviation(arr);
    const kurt = arr.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0) / arr.length - 3;
    return kurt;
  }

  // ============================================================
  // 5. معالجات خاصة
  // ============================================================

  /**
   * معالجة الحالات الخاصة
   */
  static handleSpecialCases(employee, _scenario) {
    const specialCases = {};

    // حالة خاصة: موظف قريب من التقاعد
    const age = this.calculateAge(employee.dateOfBirth);
    if (age >= 58 && age <= 65) {
      specialCases.nearRetirement = {
        age: age,
        yearsUntilRetirement: 65 - age,
        recommendation: 'يجب التحضير للتقاعد'
      };
    }

    // حالة خاصة: موظف طويل الأمد
    const yearsOfService = (new Date() - new Date(employee.hireDate)) / (1000 * 60 * 60 * 24 * 365);
    if (yearsOfService > 20) {
      specialCases.longTermEmployee = {
        yearsOfService: yearsOfService,
        recommendation: 'موظف طويل الأمد - قد يستحق معاملة خاصة'
      };
    }

    // حالة خاصة: موظف على وشك إكمال 5 سنوات
    if (yearsOfService > 4.5 && yearsOfService < 5) {
      specialCases.almostMilestone = {
        yearsOfService: yearsOfService,
        daysUntilMilestone: Math.round((5 - yearsOfService) * 365),
        impact: 'قد يستفيد من تأجيل الإنهاء أسابيع قليلة'
      };
    }

    return specialCases;
  }

  /**
   * حساب العمر
   */
  static calculateAge(dateOfBirth) {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * اقتراح أفضل سيناريو من وجهة نظر الموظف
   */
  static recommendBestScenario(employee, terminationDate) {
    const simulations = this.simulateAllScenarios(employee, terminationDate);
    
    let bestScenario = null;
    let maxGratuity = 0;

    Object.entries(simulations.simulations).forEach(([scenario, data]) => {
      if (data.gratuity > maxGratuity) {
        maxGratuity = data.gratuity;
        bestScenario = scenario;
      }
    });

    return {
      recommendedScenario: bestScenario,
      maxGratuity: maxGratuity,
      allScenarios: simulations.simulations,
      note: 'هذا متوقع من الموظف - يجب اتباع السياسة الشركة'
    };
  }

  /**
   * حساب أثر التأخير على المكافأة
   */
  static calculateDelayImpact(employee, currentDate, delayDays = 30) {
    const GratuityService = require('../services/hr/gratuityService');
    
    const currentCalc = GratuityService.calculateGratuity(employee, currentDate);
    
    const delayedDate = new Date(currentDate);
    delayedDate.setDate(delayedDate.getDate() + delayDays);
    const delayedCalc = GratuityService.calculateGratuity(employee, delayedDate);

    const difference = delayedCalc.gratuity - currentCalc.gratuity;
    const percentChange = (difference / currentCalc.gratuity) * 100;

    return {
      currentDate: currentDate,
      delayedDate: delayedDate,
      delayDays: delayDays,
      currentGratuity: currentCalc.gratuity,
      delayedGratuity: delayedCalc.gratuity,
      additionalGratuity: difference,
      percentageIncrease: percentChange
    };
  }
}

module.exports = GratuityCalculationUtils;
