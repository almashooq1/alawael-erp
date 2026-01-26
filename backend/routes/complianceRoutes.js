/**
 * Saudi Compliance Routes
 * مسارات API الامتثال السعودي
 *
 * تشمل:
 * ✅ تسجيل المخالفات المرورية
 * ✅ فحص الصلاحيات والترخيص
 * ✅ توليد تقارير الامتثال
 * ✅ إدارة المتطلبات القانونية
 */

const express = require('express');
const router = express.Router();
const SaudiComplianceService = require('../services/saudiComplianceService');
const saudiComplianceService = new SaudiComplianceService();
const auth = require('../middleware/auth');
const { authenticateToken, requireAdmin } = auth;
const logger = require('../utils/logger');

// ====== تسجيل المخالفات المرورية ======

/**
 * POST /api/compliance/violations/record
 * تسجيل مخالفة مرورية سعودية
 */
router.post('/violations/record', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { vehicleId, violationData } = req.body;

    if (!vehicleId || !violationData) {
      return res.status(400).json({
        success: false,
        message: 'بيانات المخالفة مطلوبة',
      });
    }

    const result = await saudiComplianceService.recordSaudiViolation(vehicleId, violationData);

    logger.info(`تم تسجيل مخالفة بواسطة ${req.user.name}: ${violationData.violationCode}`);

    res.status(201).json({
      success: true,
      message: 'تم تسجيل المخالفة بنجاح',
      data: result,
    });
  } catch (error) {
    logger.error(`خطأ في تسجيل المخالفة: ${error.message}`);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/compliance/violations/codes
 * الحصول على قائمة كود المخالفات السعودية
 */
router.get('/violations/codes', authenticateToken, (req, res) => {
  try {
    const violations = saudiComplianceService.getSaudiViolationCodes();

    res.json({
      success: true,
      data: violations,
      totalCodes: Object.keys(violations).length,
    });
  } catch (error) {
    logger.error(`خطأ في جلب أكواد المخالفات: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ====== فحص الصلاحيات ======

/**
 * GET /api/compliance/vehicle/:vehicleId/registration-validity
 * فحص صلاحية تسجيل المركبة
 */
router.get('/vehicle/:vehicleId/registration-validity', authenticateToken, async (req, res) => {
  try {
    const Vehicle = require('../models/Vehicle');
    const vehicle = await Vehicle.findById(req.params.vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'المركبة غير موجودة',
      });
    }

    const registrationValidity = saudiComplianceService.checkRegistrationValidity(vehicle);

    res.json({
      success: true,
      data: registrationValidity,
      vehicle: {
        registration: vehicle.registrationNumber,
        make: vehicle.basicInfo.make,
        model: vehicle.basicInfo.model,
      },
    });
  } catch (error) {
    logger.error(`خطأ في فحص التسجيل: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/compliance/vehicle/:vehicleId/insurance-validity
 * فحص صلاحية التأمين
 */
router.get('/vehicle/:vehicleId/insurance-validity', authenticateToken, async (req, res) => {
  try {
    const Vehicle = require('../models/Vehicle');
    const vehicle = await Vehicle.findById(req.params.vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'المركبة غير موجودة',
      });
    }

    const insuranceValidity = saudiComplianceService.checkInsuranceValidity(vehicle);

    res.json({
      success: true,
      data: insuranceValidity,
      vehicle: {
        registration: vehicle.registrationNumber,
        make: vehicle.basicInfo.make,
        model: vehicle.basicInfo.model,
      },
    });
  } catch (error) {
    logger.error(`خطأ في فحص التأمين: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/compliance/vehicle/:vehicleId/inspection-validity
 * فحص استحقاق الفحص الدوري
 */
router.get('/vehicle/:vehicleId/inspection-validity', authenticateToken, async (req, res) => {
  try {
    const Vehicle = require('../models/Vehicle');
    const vehicle = await Vehicle.findById(req.params.vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'المركبة غير موجودة',
      });
    }

    const inspectionValidity = saudiComplianceService.checkInspectionValidity(vehicle);

    res.json({
      success: true,
      data: inspectionValidity,
      vehicle: {
        registration: vehicle.registrationNumber,
        make: vehicle.basicInfo.make,
        model: vehicle.basicInfo.model,
        type: vehicle.basicInfo.type,
      },
    });
  } catch (error) {
    logger.error(`خطأ في فحص الفحص الدوري: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/compliance/vehicle/:vehicleId/full-check
 * فحص شامل لجميع الصلاحيات
 */
router.get('/vehicle/:vehicleId/full-check', authenticateToken, async (req, res) => {
  try {
    const Vehicle = require('../models/Vehicle');
    const vehicle = await Vehicle.findById(req.params.vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'المركبة غير موجودة',
      });
    }

    const registrationCheck = saudiComplianceService.checkRegistrationValidity(vehicle);
    const insuranceCheck = saudiComplianceService.checkInsuranceValidity(vehicle);
    const inspectionCheck = saudiComplianceService.checkInspectionValidity(vehicle);

    const allValid =
      registrationCheck.isValid && insuranceCheck.isValid && !inspectionCheck.isOverdue;

    res.json({
      success: true,
      data: {
        registration: registrationCheck,
        insurance: insuranceCheck,
        inspection: inspectionCheck,
        summary: {
          allValid: allValid,
          status: allValid ? 'متوافق' : 'يحتاج إجراء',
          checks: {
            registration: registrationCheck.isValid ? 'صحيح' : 'غير صحيح',
            insurance: insuranceCheck.isValid ? 'صحيح' : 'غير صحيح',
            inspection: !inspectionCheck.isOverdue ? 'صحيح' : 'مستحق',
          },
        },
      },
      vehicle: {
        registration: vehicle.registrationNumber,
        make: vehicle.basicInfo.make,
        model: vehicle.basicInfo.model,
        owner: vehicle.owner.name,
      },
    });
  } catch (error) {
    logger.error(`خطأ في الفحص الشامل: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ====== تقارير الامتثال ======

/**
 * GET /api/compliance/vehicle/:vehicleId/compliance-report
 * توليد تقرير امتثال شامل للمركبة
 */
router.get('/vehicle/:vehicleId/compliance-report', authenticateToken, async (req, res) => {
  try {
    const report = await saudiComplianceService.generateVehicleComplianceReport(
      req.params.vehicleId
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error(`خطأ في توليد التقرير: ${error.message}`);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/compliance/fleet/compliance-report
 * توليد تقرير امتثال الأسطول
 */
router.post('/fleet/compliance-report', authenticateToken, async (req, res) => {
  try {
    const { vehicleIds } = req.body;

    if (!vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'معرفات المركبات مطلوبة',
      });
    }

    const report = await saudiComplianceService.generateFleetComplianceReport(vehicleIds);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error(`خطأ في توليد تقرير الأسطول: ${error.message}`);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/compliance/fleet/critical-issues
 * الحصول على المشاكل الحرجة في الأسطول
 */
router.get('/fleet/critical-issues', authenticateToken, async (req, res) => {
  try {
    const Vehicle = require('../models/Vehicle');
    const vehicles = await Vehicle.find({});

    const criticalIssues = [];

    for (const vehicle of vehicles) {
      const registrationCheck = saudiComplianceService.checkRegistrationValidity(vehicle);
      const insuranceCheck = saudiComplianceService.checkInsuranceValidity(vehicle);
      const inspectionCheck = saudiComplianceService.checkInspectionValidity(vehicle);

      if (!registrationCheck.isValid) {
        criticalIssues.push({
          vehicleId: vehicle._id,
          registration: vehicle.registrationNumber,
          issue: 'التسجيل منتهي',
          severity: 'حرج',
          daysOverdue: Math.abs(registrationCheck.daysRemaining),
        });
      }

      if (!insuranceCheck.isValid) {
        criticalIssues.push({
          vehicleId: vehicle._id,
          registration: vehicle.registrationNumber,
          issue: 'التأمين منتهي',
          severity: 'حرج',
          daysOverdue: Math.abs(insuranceCheck.daysRemaining),
        });
      }

      if (inspectionCheck.isOverdue) {
        criticalIssues.push({
          vehicleId: vehicle._id,
          registration: vehicle.registrationNumber,
          issue: 'الفحص الدوري مستحق',
          severity: 'هام',
          daysOverdue: Math.abs(inspectionCheck.daysRemaining),
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalIssues: criticalIssues.length,
        issues: criticalIssues.sort((a, b) => b.daysOverdue - a.daysOverdue),
        summary: {
          critical: criticalIssues.filter(i => i.severity === 'حرج').length,
          important: criticalIssues.filter(i => i.severity === 'هام').length,
        },
      },
    });
  } catch (error) {
    logger.error(`خطأ في الحصول على المشاكل الحرجة: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ====== التحقق من البيانات ======

/**
 * POST /api/compliance/vehicle/validate-data
 * التحقق من اكتمال بيانات المركبة
 */
router.post('/vehicle/validate-data', authenticateToken, async (req, res) => {
  try {
    const vehicleData = req.body;

    const validation = saudiComplianceService.validateVehicleData(vehicleData);

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    logger.error(`خطأ في التحقق من البيانات: ${error.message}`);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/compliance/inspection-schedule/:vehicleType
 * الحصول على جدول الفحص الدوري حسب نوع المركبة
 */
router.get('/inspection-schedule/:vehicleType', authenticateToken, (req, res) => {
  try {
    const schedule = saudiComplianceService.getInspectionSchedule(req.params.vehicleType);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'نوع المركبة غير صحيح',
      });
    }

    res.json({
      success: true,
      data: {
        vehicleType: req.params.vehicleType,
        schedule: schedule,
      },
    });
  } catch (error) {
    logger.error(`خطأ في جلب جدول الفحص: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ====== تقارير إحصائية ======

/**
 * GET /api/compliance/statistics/vehicles-compliance
 * إحصائيات امتثال المركبات
 */
router.get('/statistics/vehicles-compliance', authenticateToken, async (req, res) => {
  try {
    const Vehicle = require('../models/Vehicle');
    const vehicles = await Vehicle.find({});

    let compliant = 0;
    let expiredRegistration = 0;
    let expiredInsurance = 0;
    let overdueInspection = 0;
    let unpaidViolations = 0;

    for (const vehicle of vehicles) {
      const regCheck = saudiComplianceService.checkRegistrationValidity(vehicle);
      const insCheck = saudiComplianceService.checkInsuranceValidity(vehicle);
      const inspCheck = saudiComplianceService.checkInspectionValidity(vehicle);

      if (regCheck.isValid && insCheck.isValid && !inspCheck.isOverdue) {
        compliant++;
      }

      if (!regCheck.isValid) expiredRegistration++;
      if (!insCheck.isValid) expiredInsurance++;
      if (inspCheck.isOverdue) overdueInspection++;

      const unpaidViolationCount =
        vehicle.violations?.filter(v => v.paymentStatus !== 'مسددة كاملاً').length || 0;

      if (unpaidViolationCount > 0) unpaidViolations++;
    }

    res.json({
      success: true,
      data: {
        totalVehicles: vehicles.length,
        compliant: compliant,
        nonCompliant: vehicles.length - compliant,
        compliancePercentage: ((compliant / vehicles.length) * 100).toFixed(2) + '%',
        issues: {
          expiredRegistration: expiredRegistration,
          expiredInsurance: expiredInsurance,
          overdueInspection: overdueInspection,
          vehiclesWithUnpaidViolations: unpaidViolations,
        },
      },
    });
  } catch (error) {
    logger.error(`خطأ في الإحصائيات: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
