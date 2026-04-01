/**
 * NitaqatService — خدمة حساب نطاقات (Nitaqat 2.0)
 *
 * وزارة الموارد البشرية والتنمية الاجتماعية (MHRSD)
 * خوارزمية حساب نسبة التوطين + تحديد النطاق + التوصيات
 *
 * @module services/nitaqat
 */
'use strict';

const { NitaqatCalculation, NitaqatActivityParam } = require('../models/nitaqat.models');
const logger = require('../utils/logger');

// ─── ثوابت الأوزان ─────────────────────────────────────────────────────────
const WEIGHT = {
  FULL_TIME: 1.0, // دوام كامل، راتب ≥ 4000
  MID_SALARY: 0.5, // راتب 3000-3999
  LOW_SALARY: 0.0, // راتب < 3000 (لا يُحتسب)
  DISABLED: 4.0, // ذوو إعاقة (أربعة أضعاف)
  STUDENT: 0.5, // طالب (عمل جزئي)
  REMOTE_FULL: 1.0, // عمل عن بعد دوام كامل
  REMOTE_PART: 0.5, // عمل عن بعد دوام جزئي
  PROBATION: 0.5, // فترة تجربة (أول 3 أشهر)
};

// حدود النسب القصوى للفئات الخاصة
const MAX_DISABLED_RATIO = 0.1; // 10% من إجمالي القوة العاملة
const MAX_STUDENT_RATIO = 0.1; // 10% (40% في قطاع الغذاء)
const FOOD_SECTOR_CODES = ['I5510', 'I5520', 'I5610', 'I5630']; // رموز قطاع الغذاء

// ─── معاملات افتراضية إذا لم تُوجد في قاعدة البيانات ─────────────────────
const DEFAULT_THRESHOLDS_SMALL = {
  redMax: 0,
  lowGreenMax: 10,
  midGreenMax: 25,
  highGreenMax: 40,
};

class NitaqatService {
  // =========================================================================
  // حساب نطاقات شامل
  // =========================================================================

  /**
   * حساب نطاقات المنشأة بالكامل
   * @param {Object} organization - بيانات المنشأة
   * @param {Array}  employees    - قائمة الموظفين النشطين
   * @param {string} calculatedBy - معرّف المستخدم المنفّذ
   * @returns {Promise<NitaqatCalculation>}
   */
  async calculateNitaqat(organization, employees, calculatedBy) {
    // تصنيف الموظفين
    const classification = this._classifyEmployees(employees, organization.economicActivityCode);

    const totalEmployees = employees.length;

    // العدد المرجح للسعوديين (مع تطبيق الحدود القصوى)
    const weightedSaudiCount = this._calculateWeightedCount(
      classification,
      totalEmployees,
      organization.economicActivityCode
    );

    // نسبة التوطين
    const saudizationPercentage =
      totalEmployees > 0 ? (weightedSaudiCount / totalEmployees) * 100 : 0;

    // حدود النطاقات
    const thresholds = await this._getBandThresholds(
      organization.economicActivityCode,
      organization.subActivityCode,
      totalEmployees
    );

    // النطاق الحالي
    const currentBand = this._determineBand(saudizationPercentage, thresholds);

    // النطاق السابق
    const previousCalc = await NitaqatCalculation.findOne({ organization: organization._id })
      .sort({ calculationDate: -1 })
      .select('nitaqatBand')
      .lean();

    // التوصيات
    const recommendations = this._generateRecommendations(
      classification,
      currentBand,
      saudizationPercentage,
      thresholds,
      totalEmployees
    );

    const record = await NitaqatCalculation.findOneAndUpdate(
      {
        organization: organization._id,
        calculationDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      {
        organization: organization._id,
        calculationDate: new Date(),
        economicActivityCode: organization.economicActivityCode || 'Q8610',
        economicActivityName: organization.economicActivityName,
        subActivityCode: organization.subActivityCode,
        totalEmployees,
        saudiEmployees: classification.saudiCount,
        expatEmployees: classification.expatCount,
        saudiDisabled: classification.disabledCount,
        saudiStudents: classification.studentCount,
        saudiRemote: classification.remoteCount,
        saudiBelow3000: classification.below3000,
        saudi3000To4000: classification.midSalary,
        saudiProbation: classification.probationCount,
        weightedSaudiCount: Math.round(weightedSaudiCount * 100) / 100,
        saudizationPercentage: Math.round(saudizationPercentage * 1000) / 1000,
        redMax: thresholds.redMax,
        lowGreenMax: thresholds.lowGreenMax,
        midGreenMax: thresholds.midGreenMax,
        highGreenMax: thresholds.highGreenMax,
        nitaqatBand: currentBand,
        previousBand: previousCalc ? previousCalc.nitaqatBand : null,
        bandChanged: previousCalc ? previousCalc.nitaqatBand !== currentBand : false,
        saudisNeededForNextBand: recommendations.saudisNeeded || 0,
        maxExpatsAllowed: recommendations.maxExpats || 0,
        recommendations,
        calculatedBy,
      },
      { upsert: true, new: true }
    );

    logger.info(
      `[Nitaqat] Calculated for org ${organization._id}: band=${currentBand}, %=${saudizationPercentage.toFixed(2)}`
    );
    return record;
  }

  // =========================================================================
  // جلب آخر حساب للمنشأة
  // =========================================================================
  async getLatestCalculation(organizationId) {
    return NitaqatCalculation.findOne({ organization: organizationId })
      .sort({ calculationDate: -1 })
      .lean();
  }

  // =========================================================================
  // سجل حسابات المنشأة (تاريخي)
  // =========================================================================
  async getCalculationHistory(organizationId, limit = 12) {
    return NitaqatCalculation.find({ organization: organizationId })
      .sort({ calculationDate: -1 })
      .limit(limit)
      .lean();
  }

  // =========================================================================
  // حساب "ماذا لو" — كم سعودي أحتاج للوصول لنطاق أعلى
  // =========================================================================
  async whatIfAnalysis(organizationId, additionalSaudis) {
    const latest = await this.getLatestCalculation(organizationId);
    if (!latest) return null;

    const newWeighted = latest.weightedSaudiCount + additionalSaudis;
    const newTotal = latest.totalEmployees;
    const newPercentage = newTotal > 0 ? (newWeighted / newTotal) * 100 : 0;
    const thresholds = {
      redMax: latest.redMax,
      lowGreenMax: latest.lowGreenMax,
      midGreenMax: latest.midGreenMax,
      highGreenMax: latest.highGreenMax,
    };
    const newBand = this._determineBand(newPercentage, thresholds);

    return {
      current: {
        band: latest.nitaqatBand,
        percentage: latest.saudizationPercentage,
        saudis: latest.saudiEmployees,
      },
      projected: {
        band: newBand,
        percentage: Math.round(newPercentage * 100) / 100,
        additionalSaudis,
        bandImproved: newBand !== latest.nitaqatBand,
      },
    };
  }

  // =========================================================================
  // إدارة معاملات الأنشطة الاقتصادية
  // =========================================================================
  async upsertActivityParams(params) {
    const { activityCode, subActivityCode = 'default', year } = params;
    return NitaqatActivityParam.findOneAndUpdate({ activityCode, subActivityCode, year }, params, {
      upsert: true,
      new: true,
    });
  }

  async getActivityParams(activityCode, subActivityCode = 'default') {
    const year = new Date().getFullYear();
    return (
      (await NitaqatActivityParam.findOne({ activityCode, subActivityCode, year }).lean()) ||
      (await NitaqatActivityParam.findOne({
        activityCode,
        subActivityCode: 'default',
        year,
      }).lean())
    );
  }

  async listActivityParams() {
    return NitaqatActivityParam.find({ isActive: true }).sort({ activityCode: 1 }).lean();
  }

  // =========================================================================
  // إحصاءات لوحة التحكم
  // =========================================================================
  async getDashboardStats(organizationId) {
    const latest = await this.getLatestCalculation(organizationId);
    const history = await this.getCalculationHistory(organizationId, 6);

    return {
      latest,
      trend: history.map(h => ({
        date: h.calculationDate,
        band: h.nitaqatBand,
        percentage: h.saudizationPercentage,
        saudis: h.saudiEmployees,
        total: h.totalEmployees,
      })),
      bandLabel: this._getBandLabel(latest?.nitaqatBand),
    };
  }

  // =========================================================================
  // دوال مساعدة داخلية
  // =========================================================================

  /**
   * تصنيف الموظفين حسب الجنسية والراتب والفئة
   */
  _classifyEmployees(employees, activityCode) {
    const classification = {
      saudiCount: 0,
      expatCount: 0,
      disabledCount: 0,
      studentCount: 0,
      remoteCount: 0,
      below3000: 0,
      midSalary: 0,
      above4000: 0,
      probationCount: 0,
      weightedDetails: [],
    };

    const now = new Date();

    for (const emp of employees) {
      const nationalityCode = emp.nationalityCode || emp.nationality || '';
      const isSaudi = nationalityCode === 'SA' || nationalityCode === 'Saudi';

      if (!isSaudi) {
        classification.expatCount++;
        continue;
      }

      classification.saudiCount++;

      const basicSalary = Number(emp.basicSalary || 0);
      const housingAllowance = Number(emp.housingAllowance || 0);
      const totalSalary = basicSalary + housingAllowance;

      // تحديد حالة فترة التجربة (أول 90 يوم)
      const joinDate = emp.joinDate || emp.hireDate || emp.startDate;
      const isInProbation = joinDate && (now - new Date(joinDate)) / (1000 * 60 * 60 * 24) <= 90;

      let weight = WEIGHT.FULL_TIME;
      let category = 'full_time';

      if (emp.hasDisability || emp.isDisabled) {
        classification.disabledCount++;
        weight = WEIGHT.DISABLED;
        category = 'disabled';
      } else if (emp.isStudent || emp.employmentType === 'student') {
        classification.studentCount++;
        weight = WEIGHT.STUDENT;
        category = 'student';
      } else if (emp.isRemote || emp.workType === 'remote') {
        classification.remoteCount++;
        weight = emp.isFullTime !== false ? WEIGHT.REMOTE_FULL : WEIGHT.REMOTE_PART;
        category = 'remote';
      } else if (isInProbation) {
        classification.probationCount++;
        weight = WEIGHT.PROBATION;
        category = 'probation';
      } else if (totalSalary < 3000) {
        classification.below3000++;
        weight = WEIGHT.LOW_SALARY;
        category = 'low_salary';
      } else if (totalSalary < 4000) {
        classification.midSalary++;
        weight = WEIGHT.MID_SALARY;
        category = 'mid_salary';
      } else {
        classification.above4000++;
      }

      classification.weightedDetails.push({
        employeeId: emp._id,
        name: emp.fullNameAr || emp.name || '',
        category,
        salary: totalSalary,
        weight,
      });
    }

    return classification;
  }

  /**
   * حساب العدد المرجح مع تطبيق الحدود القصوى
   */
  _calculateWeightedCount(classification, totalEmployees, activityCode) {
    let weighted = 0;

    // ── ذوو الإعاقة: حد أقصى 10% من القوة العاملة بوزن 4 ──────────────
    const maxDisabled = Math.floor(totalEmployees * MAX_DISABLED_RATIO);
    const effectiveDisabled = Math.min(classification.disabledCount, maxDisabled);
    const excessDisabled = classification.disabledCount - effectiveDisabled;
    weighted += effectiveDisabled * WEIGHT.DISABLED;
    weighted += excessDisabled * WEIGHT.FULL_TIME; // الزائد بوزن 1

    // ── الطلاب: حد أقصى 10% (أو 40% في قطاع الغذاء) ──────────────────
    const isFood = FOOD_SECTOR_CODES.includes(activityCode);
    const maxStudentRatio = isFood ? 0.4 : MAX_STUDENT_RATIO;
    const maxStudents = Math.floor(totalEmployees * maxStudentRatio);
    const effectiveStudents = Math.min(classification.studentCount, maxStudents);
    weighted += effectiveStudents * WEIGHT.STUDENT;

    // ── باقي السعوديين ─────────────────────────────────────────────────
    for (const detail of classification.weightedDetails) {
      if (!['disabled', 'student'].includes(detail.category)) {
        weighted += detail.weight;
      }
    }

    return weighted;
  }

  /**
   * حساب حدود النطاقات باستخدام المعادلة اللوغاريتمية
   */
  async _getBandThresholds(activityCode, subActivityCode, totalEmployees) {
    // المنشآت الصغيرة جداً (أقل من 6 موظفين)
    if (!totalEmployees || totalEmployees < 6) {
      return DEFAULT_THRESHOLDS_SMALL;
    }

    const params = await this.getActivityParams(activityCode, subActivityCode);

    if (!params) {
      // قيم افتراضية إذا لم تُوجد معاملات للنشاط
      return DEFAULT_THRESHOLDS_SMALL;
    }

    const x = totalEmployees;
    const ln = Math.log; // اللوغاريتم الطبيعي

    return {
      redMax: Math.max(0, Math.round((params.red.m * ln(x) + params.red.c) * 1000) / 1000),
      lowGreenMax: Math.max(
        0,
        Math.round((params.lowGreen.m * ln(x) + params.lowGreen.c) * 1000) / 1000
      ),
      midGreenMax: Math.max(
        0,
        Math.round((params.midGreen.m * ln(x) + params.midGreen.c) * 1000) / 1000
      ),
      highGreenMax: Math.max(
        0,
        Math.round((params.highGreen.m * ln(x) + params.highGreen.c) * 1000) / 1000
      ),
    };
  }

  /**
   * تحديد النطاق بناءً على النسبة والحدود
   */
  _determineBand(percentage, thresholds) {
    if (percentage >= thresholds.highGreenMax) return 'platinum';
    if (percentage >= thresholds.midGreenMax) return 'high_green';
    if (percentage >= thresholds.lowGreenMax) return 'mid_green';
    if (percentage >= thresholds.redMax) return 'low_green';
    return 'red';
  }

  /**
   * توليد التوصيات
   */
  _generateRecommendations(
    classification,
    currentBand,
    currentPercentage,
    thresholds,
    totalEmployees
  ) {
    const recommendations = {
      currentBand,
      currentPercentage: Math.round(currentPercentage * 100) / 100,
      actions: [],
    };

    // عتبة النطاق التالي
    const nextBandThreshold = {
      red: thresholds.redMax,
      low_green: thresholds.lowGreenMax,
      mid_green: thresholds.midGreenMax,
      high_green: thresholds.highGreenMax,
      platinum: null,
    }[currentBand];

    if (nextBandThreshold !== null && nextBandThreshold !== undefined) {
      const saudisNeeded = Math.max(
        0,
        Math.ceil((nextBandThreshold / 100) * totalEmployees - classification.saudiCount)
      );
      recommendations.saudisNeeded = saudisNeeded;
      recommendations.nextBand = this._getNextBand(currentBand);
      recommendations.nextBandThreshold = nextBandThreshold;

      if (saudisNeeded > 0) {
        recommendations.actions.push({
          type: 'hire_saudis',
          priority: 'high',
          description: `توظيف ${saudisNeeded} موظف سعودي للوصول إلى ${this._getBandLabel(recommendations.nextBand)}`,
          impact: `سيرفع النسبة إلى ${nextBandThreshold.toFixed(1)}%`,
        });
      }
    }

    // الحد الأقصى للوافدين
    const minSaudiRatio = thresholds.redMax / 100;
    const maxExpats =
      minSaudiRatio > 0
        ? Math.max(
            0,
            Math.floor(classification.saudiCount / minSaudiRatio) - classification.saudiCount
          )
        : totalEmployees;
    recommendations.maxExpats = maxExpats;

    // تحسين رواتب منخفضة
    if (classification.below3000 > 0) {
      recommendations.actions.push({
        type: 'increase_salaries',
        priority: 'medium',
        description: `رفع رواتب ${classification.below3000} موظف سعودي فوق 3,000 ريال`,
        impact: 'سيُحتسبون بوزن 0.5 بدلاً من 0',
      });
    }
    if (classification.midSalary > 0) {
      recommendations.actions.push({
        type: 'increase_salaries_mid',
        priority: 'medium',
        description: `رفع رواتب ${classification.midSalary} موظف سعودي فوق 4,000 ريال`,
        impact: 'سيُحتسبون بوزن كامل (1.0) بدلاً من نصف وزن',
      });
    }

    // تنبيه النطاق الأحمر
    if (currentBand === 'red') {
      recommendations.actions.unshift({
        type: 'urgent',
        priority: 'critical',
        description: 'المنشأة في النطاق الأحمر — مطلوب إجراء عاجل خلال 6 أشهر',
        impact: 'إيقاف التأشيرات ونقل الخدمات وفرض غرامات إضافية',
      });
    }

    return recommendations;
  }

  _getNextBand(band) {
    const next = {
      red: 'low_green',
      low_green: 'mid_green',
      mid_green: 'high_green',
      high_green: 'platinum',
    };
    return next[band] || 'platinum';
  }

  _getBandLabel(band) {
    const labels = {
      platinum: 'بلاتيني',
      high_green: 'أخضر مرتفع',
      mid_green: 'أخضر متوسط',
      low_green: 'أخضر منخفض',
      red: 'أحمر',
    };
    return labels[band] || band;
  }
}

module.exports = new NitaqatService();
