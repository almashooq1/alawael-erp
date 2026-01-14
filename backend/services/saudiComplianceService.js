/**
 * Saudi Compliance Service
 * خدمة الامتثال للمعايير السعودية
 *
 * المسؤولية:
 * ✅ التحقق من الامتثال للأنظمة السعودية
 * ✅ توليد تقارير الامتثال
 * ✅ إدارة المخالفات المرورية
 * ✅ تتبع صلاحيات الترخيص والتسجيل
 * ✅ الامتثال الضريبي والمالي
 */

const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const logger = require('../utils/logger');

class SaudiComplianceService {
  /**
   * ====== فحص المخالفات المرورية ======
   */

  /**
   * تسجيل مخالفة مرورية سعودية
   * @param {string} vehicleId - معرف المركبة
   * @param {object} violationData - بيانات المخالفة
   * @returns {Promise<object>} - نتيجة التسجيل
   */
  async recordSaudiViolation(vehicleId, violationData) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) throw new Error('المركبة غير موجودة');

      // التحقق من صحة كود المخالفة
      const validViolations = this.getSaudiViolationCodes();
      const violation = validViolations[violationData.violationCode];

      if (!violation) {
        throw new Error('كود المخالفة غير صحيح');
      }

      // إنشاء سجل المخالفة
      const violationRecord = {
        date: new Date(),
        violationCode: violationData.violationCode,
        description: violation.الوصف,
        severity: this.calculateViolationSeverity(violation.النقاط),
        fine: violation.الغرامة,
        demeritPoints: violation.النقاط,
        location: violationData.location,
        officer: violationData.officer,
        status: 'مسجلة',
        paymentStatus: 'لم تسدد',
      };

      vehicle.violations.push(violationRecord);

      // إذا كانت هناك نقاط مخصومة، تحديث نقاط السائق
      if (vehicle.assignedDriver.driverId && violation.النقاط > 0) {
        const driver = await Driver.findById(vehicle.assignedDriver.driverId);
        if (driver) {
          await driver.addViolation({
            violationType: violation.الوصف,
            pointsDeducted: violation.النقاط,
            relatedVehicle: vehicleId,
            date: new Date(),
          });
        }
      }

      await vehicle.save();

      logger.info(`تم تسجيل مخالفة: ${vehicle.registrationNumber} - ${violation.الوصف}`);

      return {
        success: true,
        message: 'تم تسجيل المخالفة بنجاح',
        violation: violationRecord,
        totalFines: vehicle.violations.reduce((sum, v) => sum + (v.fine || 0), 0),
      };
    } catch (error) {
      logger.error(`خطأ في تسجيل المخالفة: ${error.message}`);
      throw error;
    }
  }

  /**
   * الحصول على قائمة كود المخالفات السعودية
   * @returns {object} - قاموس المخالفات
   */
  getSaudiViolationCodes() {
    return {
      // مخالفات بدون نقاط
      101: { الوصف: 'عدم حمل رخصة القيادة', الغرامة: 100, النقاط: 0 },
      102: { الوصف: 'عدم حمل وثائق السيارة', الغرامة: 150, النقاط: 0 },
      103: { الوصف: 'عدم حمل بطاقة التأمين', الغرامة: 200, النقاط: 0 },

      // مخالفات بنقاط قليلة
      201: { الوصف: 'تجاوز الإشارة الحمراء', الغرامة: 500, النقاط: 3 },
      202: { الوصف: 'عدم الالتزام بالمسار', الغرامة: 300, النقاط: 2 },
      203: { الوصف: 'الوقوف في مكان محظور', الغرامة: 200, النقاط: 1 },
      204: { الوصف: 'الانحراف بدون إشارة', الغرامة: 200, النقاط: 1 },
      205: { الوصف: 'عدم الالتزام بمسافة الأمان', الغرامة: 300, النقاط: 2 },

      // مخالفات السرعة
      301: { الوصف: 'السرعة الزائدة (20-30 كم)', الغرامة: 600, النقاط: 4 },
      302: { الوصف: 'السرعة الزائدة (31-40 كم)', الغرامة: 800, النقاط: 5 },
      303: { الوصف: 'السرعة الزائدة (41-50 كم)', الغرامة: 1000, النقاط: 6 },
      304: { الوصف: 'السرعة الزائدة (أكثر من 50 كم)', الغرامة: 1500, النقاط: 8 },

      // مخالفات خطيرة
      401: { الوصف: 'القيادة تحت تأثير الكحول', الغرامة: 5000, النقاط: 12 },
      402: { الوصف: 'استخدام الجوال أثناء القيادة', الغرامة: 300, النقاط: 2 },
      403: { الوصف: 'عدم الالتزام بحزام الأمان', الغرامة: 300, النقاط: 2 },
      404: { الوصف: 'الدخول من الطريق الممنوع', الغرامة: 400, النقاط: 3 },
      405: { الوصف: 'القيادة برخصة معلقة', الغرامة: 2000, النقاط: 12 },
      406: { الوصف: 'القيادة بدون رخصة صحيحة', الغرامة: 3000, النقاط: 12 },
      407: { الوصف: 'تجاوز خطوط البيض المرسومة', الغرامة: 250, النقاط: 1 },
      408: { الوصف: 'عكس السير بدون عذر', الغرامة: 300, النقاط: 2 },
    };
  }

  /**
   * حساب درجة خطورة المخالفة
   * @param {number} points - عدد النقاط
   * @returns {string} - درجة الخطورة
   */
  calculateViolationSeverity(points) {
    if (points === 0) return 'بسيطة (غرامة فقط)';
    if (points <= 3) return 'متوسطة (1-3 نقاط)';
    if (points <= 6) return 'خطيرة (4-6 نقاط)';
    return 'شديدة (7+ نقاط)';
  }

  /**
   * ====== فحص صلاحية الترخيص والتسجيل ======
   */

  /**
   * التحقق من صلاحية تسجيل المركبة
   * @param {object} vehicle - بيانات المركبة
   * @returns {object} - حالة التسجيل
   */
  checkRegistrationValidity(vehicle) {
    // معالجة الحالات الخاصة
    if (!vehicle || !vehicle.registration || !vehicle.registration.expiryDate) {
      return {
        isValid: false,
        expiryDate: null,
        daysRemaining: -1,
        status: 'غير صحيح',
        requiresRenewal: true,
        renewalAlertLevel: 'red',
      };
    }

    try {
      const today = new Date();
      const expiryDate = new Date(vehicle.registration.expiryDate);

      if (isNaN(expiryDate.getTime())) {
        return {
          isValid: false,
          expiryDate: null,
          daysRemaining: -1,
          status: 'غير صحيح',
          requiresRenewal: true,
          renewalAlertLevel: 'red',
        };
      }

      const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

      return {
        isValid: daysRemaining > 0,
        expiryDate: expiryDate,
        daysRemaining: daysRemaining,
        status: daysRemaining > 30 ? 'صحيح' : daysRemaining > 0 ? 'قريب الانتهاء' : 'منتهي',
        requiresRenewal: daysRemaining <= 30,
        renewalAlertLevel: daysRemaining > 30 ? 'green' : daysRemaining > 15 ? 'yellow' : daysRemaining > 0 ? 'orange' : 'red',
      };
    } catch (error) {
      return {
        isValid: false,
        expiryDate: null,
        daysRemaining: -1,
        status: 'خطأ',
        requiresRenewal: true,
        renewalAlertLevel: 'red',
      };
    }
  }

  /**
   * التحقق من صلاحية التأمين
   * @param {object} vehicle - بيانات المركبة
   * @returns {object} - حالة التأمين
   */
  checkInsuranceValidity(vehicle) {
    const today = new Date();
    const expiryDate = new Date(vehicle.insurance.expiryDate);
    const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    return {
      isValid: daysRemaining > 0,
      provider: vehicle.insurance.provider,
      expiryDate: expiryDate,
      daysRemaining: daysRemaining,
      status: daysRemaining > 30 ? 'صحيح' : daysRemaining > 0 ? 'قريب الانتهاء' : 'منتهي',
      isMandatory: true,
      requiresRenewal: daysRemaining <= 30,
      renewalAlertLevel: daysRemaining > 30 ? 'green' : daysRemaining > 15 ? 'yellow' : daysRemaining > 0 ? 'orange' : 'red',
    };
  }

  /**
   * التحقق من استحقاق الفحص الدوري
   * @param {object} vehicle - بيانات المركبة
   * @returns {object} - حالة الفحص
   */
  checkInspectionValidity(vehicle) {
    const today = new Date();
    const nextInspectionDate = new Date(vehicle.inspection.nextInspectionDate);
    const daysRemaining = Math.ceil((nextInspectionDate - today) / (1000 * 60 * 60 * 24));

    const inspectionSchedule = this.getInspectionSchedule(vehicle.basicInfo.type);

    return {
      isOverdue: daysRemaining < 0,
      nextDueDate: nextInspectionDate,
      daysRemaining: daysRemaining,
      schedule: inspectionSchedule,
      status: daysRemaining > 30 ? 'متوافق' : daysRemaining > 0 ? 'قريب الاستحقاق' : 'مستحق',
      requiresInspection: daysRemaining <= 0,
      alertLevel: daysRemaining > 30 ? 'green' : daysRemaining > 0 ? 'yellow' : 'red',
    };
  }

  /**
   * الحصول على جدول الفحص الدوري حسب نوع المركبة
   * @param {string} vehicleType - نوع المركبة
   * @returns {object} - جدول الفحص
   */
  getInspectionSchedule(vehicleType) {
    const schedules = {
      'سيارة خاصة': {
        '0-3': 'لا يوجد فحص',
        '3-5': 'كل سنة',
        '5+': 'كل سنة (مشدد)',
      },
      'سيارة تجارية': {
        '0-1': 'لا يوجد فحص',
        '1-5': 'كل سنة',
        '5+': 'كل 6 أشهر',
      },
      حافلة: {
        '0+': 'كل 6 أشهر',
      },
      شاحنة: {
        '0-1': 'كل سنة',
        '1+': 'كل 6 أشهر',
      },
    };

    return schedules[vehicleType] || schedules['سيارة خاصة'];
  }

  /**
   * ====== تقارير الامتثال ======
   */

  /**
   * توليد تقرير امتثال شامل للمركبة
   * @param {string} vehicleId - معرف المركبة
   * @returns {Promise<object>} - تقرير الامتثال
   */
  async generateVehicleComplianceReport(vehicleId) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) throw new Error('المركبة غير موجودة');

      const registrationCheck = this.checkRegistrationValidity(vehicle);
      const insuranceCheck = this.checkInsuranceValidity(vehicle);
      const inspectionCheck = this.checkInspectionValidity(vehicle);

      const violations = vehicle.violations || [];
      const unpaidFines = violations.filter(v => v.paymentStatus !== 'مسددة كاملاً');

      // حساب نسبة الامتثال
      let complianceScore = 100;
      if (!registrationCheck.isValid) complianceScore -= 25;
      if (!insuranceCheck.isValid) complianceScore -= 25;
      if (inspectionCheck.isOverdue) complianceScore -= 20;
      if (unpaidFines.length > 0) complianceScore -= 5 * Math.min(unpaidFines.length, 5);

      const report = {
        vehicleInfo: {
          registration: vehicle.registrationNumber,
          make: vehicle.basicInfo.make,
          model: vehicle.basicInfo.model,
          year: vehicle.basicInfo.year,
          owner: vehicle.owner.name,
        },
        generatedAt: new Date(),
        overallComplianceScore: Math.max(0, complianceScore),
        overallStatus: complianceScore >= 80 ? 'متوافق' : complianceScore >= 50 ? 'متوافق مع تحفظات' : 'غير متوافق',

        registration: registrationCheck,
        insurance: insuranceCheck,
        inspection: inspectionCheck,

        violations: {
          total: violations.length,
          unpaid: unpaidFines.length,
          totalFinesAmount: unpaidFines.reduce((sum, v) => sum + (v.fine || 0), 0),
          recentViolations: violations.slice(-5).reverse(),
        },

        recommendations: this.generateComplianceRecommendations({
          registrationCheck,
          insuranceCheck,
          inspectionCheck,
          violations: unpaidFines,
        }),

        legalStatus: {
          canBeDriven: registrationCheck.isValid && insuranceCheck.isValid,
          canBeTransferred: registrationCheck.isValid && inspectionCheck.isValid && unpaidFines.length === 0,
          canBeSold: vehicle.owner.ownershipType === 'فردي' && unpaidFines.length === 0,
        },
      };

      return report;
    } catch (error) {
      logger.error(`خطأ في توليد تقرير الامتثال: ${error.message}`);
      throw error;
    }
  }

  /**
   * توليد توصيات الامتثال
   * @param {object} checks - نتائج الفحوصات
   * @returns {array} - قائمة التوصيات
   */
  generateComplianceRecommendations(checks) {
    const recommendations = [];

    if (!checks.registrationCheck.isValid) {
      recommendations.push({
        type: 'عاجل',
        message: `تجديد التسجيل: ينتهي في ${checks.registrationCheck.daysRemaining} يوم`,
        action: 'زيارة إدارة المرور المختصة',
      });
    }

    if (!checks.insuranceCheck.isValid) {
      recommendations.push({
        type: 'عاجل',
        message: `تجديد التأمين: ينتهي في ${checks.insuranceCheck.daysRemaining} يوم`,
        action: 'التواصل مع شركة التأمين',
      });
    }

    if (checks.inspectionCheck.isOverdue) {
      recommendations.push({
        type: 'عاجل',
        message: 'الفحص الدوري مستحق',
        action: 'التوجه إلى مركز الفحص المعتمد',
      });
    }

    if (checks.violations && checks.violations.length > 0) {
      recommendations.push({
        type: 'مهم',
        message: `توجد ${checks.violations.length} مخالفات غير مسددة`,
        action: 'تسديد الغرامات عبر منصة أبشر أو البنك',
        amount: checks.violations.reduce((sum, v) => sum + (v.fine || 0), 0),
      });
    }

    if (checks.registrationCheck.daysRemaining <= 30) {
      recommendations.push({
        type: 'تنبيه',
        message: 'التسجيل قريب الانتهاء',
        action: 'حضّر المستندات المطلوبة للتجديد',
      });
    }

    if (checks.insuranceCheck.daysRemaining <= 30) {
      recommendations.push({
        type: 'تنبيه',
        message: 'التأمين قريب الانتهاء',
        action: 'تواصل مع وكيل التأمين',
      });
    }

    return recommendations;
  }

  /**
   * ====== تقارير إدارية ======
   */

  /**
   * توليد تقرير امتثال الأسطول
   * @param {array} vehicleIds - معرفات المركبات
   * @returns {Promise<object>} - تقرير الأسطول
   */
  async generateFleetComplianceReport(vehicleIds) {
    try {
      const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } });

      const reports = await Promise.all(vehicles.map(vehicle => this.generateVehicleComplianceReport(vehicle._id)));

      const compliant = reports.filter(r => r.overallStatus === 'متوافق').length;
      const partiallyCompliant = reports.filter(r => r.overallStatus === 'متوافق مع تحفظات').length;
      const nonCompliant = reports.filter(r => r.overallStatus === 'غير متوافق').length;

      const totalFines = reports.reduce((sum, r) => sum + r.violations.totalFinesAmount, 0);
      const expiredRegistrations = reports.filter(r => !r.registration.isValid).length;
      const expiredInsurance = reports.filter(r => !r.insurance.isValid).length;
      const overdueInspections = reports.filter(r => r.inspection.isOverdue).length;

      return {
        generatedAt: new Date(),
        totalVehicles: vehicles.length,
        complianceBreakdown: {
          compliant: compliant,
          partiallyCompliant: partiallyCompliant,
          nonCompliant: nonCompliant,
          compliancePercentage: ((compliant / vehicles.length) * 100).toFixed(2) + '%',
        },
        criticalIssues: {
          expiredRegistrations: expiredRegistrations,
          expiredInsurance: expiredInsurance,
          overdueInspections: overdueInspections,
          totalOutstandingFines: totalFines,
        },
        vehicleDetails: reports,
        averageComplianceScore: (reports.reduce((sum, r) => sum + r.overallComplianceScore, 0) / reports.length).toFixed(2),
      };
    } catch (error) {
      logger.error(`خطأ في توليد تقرير الأسطول: ${error.message}`);
      throw error;
    }
  }

  /**
   * ====== التحقق من البيانات الوصفية ======
   */

  /**
   * حساب عدد الأيام المتبقية حتى تاريخ معين
   * @param {Date} expiryDate - التاريخ المستهدف
   * @returns {number} - عدد الأيام (موجب للمستقبل، سالب للماضي)
   */
  calculateDaysRemaining(expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(expiryDate);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * التحقق من اكتمال البيانات المطلوبة
   * @param {object} vehicle - بيانات المركبة
   * @returns {object} - نتيجة التحقق
   */
  validateVehicleData(vehicle) {
    const requiredFields = [
      'registrationNumber',
      'basicInfo.make',
      'basicInfo.model',
      'basicInfo.year',
      'basicInfo.vin',
      'basicInfo.engineNumber',
      'owner.name',
      'owner.nationalId',
      'registration.expiryDate',
      'insurance.policyNumber',
      'insurance.expiryDate',
    ];

    const missingFields = [];
    const invalidFields = [];

    requiredFields.forEach(field => {
      const value = field.split('.').reduce((obj, key) => obj?.[key], vehicle);

      if (!value) {
        missingFields.push(field);
      }
    });

    // التحقق من صحة الأرقام
    if (vehicle.owner?.nationalId && !/^\d{10}$/.test(vehicle.owner.nationalId)) {
      invalidFields.push('owner.nationalId');
    }

    if (vehicle.basicInfo?.vin && vehicle.basicInfo.vin.length !== 17) {
      invalidFields.push('basicInfo.vin');
    }

    return {
      isValid: missingFields.length === 0 && invalidFields.length === 0,
      missingFields: missingFields,
      invalidFields: invalidFields,
      dataCompletionPercentage: (((requiredFields.length - missingFields.length) / requiredFields.length) * 100).toFixed(2) + '%',
    };
  }
}

module.exports = SaudiComplianceService;
module.exports.saudiComplianceService = new SaudiComplianceService();
