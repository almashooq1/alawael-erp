/**
 * ═══════════════════════════════════════════════════════════
 *  HR Smart Routes — الذكاء الاصطناعي والتحليلات
 *  /api/hr/smart/*
 * ═══════════════════════════════════════════════════════════
 */
'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');

// ─── Lazy-load models (safe across test/prod) ───
const getModel = (name, fallback) => {
  try {
    return require(`../../models/HR/${name}`);
  } catch {
    try {
      return require(`../../models/${fallback || name}`);
    } catch {
      return null;
    }
  }
};

const models = () => ({
  Employee: getModel('Employee', 'Employee'),
  Attendance: getModel('Attendance', 'attendance.model'),
  LeaveRequest: getModel('Leave', 'leave.model'),
  Payroll: getModel('Payroll', 'payroll.model'),
  PerformanceEvaluation: getModel('PerformanceEvaluation', 'performance.model'),
  CareerPath: getModel('CareerPath'),
  TrainingPlan: getModel('TrainingPlan'),
  Onboarding: getModel('Onboarding'),
  EmployeeDocument: getModel('EmployeeDocument'),
});

// ─── Services ───
const HRAIService = require('../../services/hr/hrAI.service');
const HRAnalyticsService = require('../../services/hr/hrAnalytics.service');
const OnboardingService = require('../../services/hr/onboarding.service');
const DocumentService = require('../../services/hr/document.service');
const { safeError } = require('../../utils/safeError');

// ═══════════════════════════════════════════════════
//  AI — ذكاء اصطناعي
// ═══════════════════════════════════════════════════

/** تنبؤ مخاطر الاستقالة */
router.get(
  '/ai/attrition-risk/:employeeId',
  authenticate,
  authorize('admin', 'hr', 'manager'),
  async (req, res) => {
    try {
      const result = await HRAIService.predictAttritionRisk(req.params.employeeId, models());
      res.json({ success: true, data: result });
    } catch (err) {
      res
        .status(err.message === 'الموظف غير موجود' ? 404 : 500)
        .json({ success: false, message: err.message });
    }
  }
);

/** توصيات التدريب الذكية */
router.get(
  '/ai/training-suggestions/:employeeId',
  authenticate,
  authorize('admin', 'hr', 'manager'),
  async (req, res) => {
    try {
      const result = await HRAIService.suggestTraining(req.params.employeeId, models());
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  }
);

/** تحليل أنماط الحضور */
router.get(
  '/ai/attendance-patterns',
  authenticate,
  authorize('admin', 'hr', 'manager'),
  async (req, res) => {
    try {
      const result = await HRAIService.analyzeAttendancePatterns(req.query.department, models());
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  }
);

/** تحليل فجوة المهارات للقسم */
router.get(
  '/ai/skill-gap/:departmentId',
  authenticate,
  authorize('admin', 'hr', 'manager'),
  async (req, res) => {
    try {
      const result = await HRAIService.departmentSkillGapAnalysis(
        req.params.departmentId,
        models()
      );
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  }
);

/** لوحة التحكم الذكية */
router.get('/ai/dashboard', authenticate, authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const result = await HRAIService.smartDashboard(models());
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** توصيات الترقية */
router.get(
  '/ai/promotion-recommendations',
  authenticate,
  authorize('admin', 'hr'),
  async (req, res) => {
    try {
      const result = await HRAIService.promotionRecommendations(models());
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  }
);

/** تحليل تكلفة القوى العاملة */
router.get('/ai/workforce-cost', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const result = await HRAIService.workforceCostAnalysis(models());
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ═══════════════════════════════════════════════════
//  ANALYTICS — تقارير وتحليلات
// ═══════════════════════════════════════════════════

/** تقرير القوى العاملة */
router.get(
  '/analytics/workforce',
  authenticate,
  authorize('admin', 'hr', 'manager'),
  async (req, res) => {
    try {
      const result = await HRAnalyticsService.workforceReport(models());
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  }
);

/** تقرير الإجازات */
router.get(
  '/analytics/leaves',
  authenticate,
  authorize('admin', 'hr', 'manager'),
  async (req, res) => {
    try {
      const result = await HRAnalyticsService.leaveReport(req.query, models());
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  }
);

/** تقرير الحضور */
router.get(
  '/analytics/attendance',
  authenticate,
  authorize('admin', 'hr', 'manager'),
  async (req, res) => {
    try {
      const result = await HRAnalyticsService.attendanceReport(req.query, models());
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  }
);

/** تقرير الرواتب */
router.get('/analytics/payroll', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const result = await HRAnalyticsService.payrollReport(req.query, models());
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** تقرير الأداء */
router.get(
  '/analytics/performance',
  authenticate,
  authorize('admin', 'hr', 'manager'),
  async (req, res) => {
    try {
      const result = await HRAnalyticsService.performanceReport(req.query, models());
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  }
);

/** تقرير السعودة */
router.get(
  '/analytics/saudization',
  authenticate,
  authorize('admin', 'hr', 'manager'),
  async (req, res) => {
    try {
      const result = await HRAnalyticsService.saudizationReport(models());
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  }
);

// ═══════════════════════════════════════════════════
//  ONBOARDING — تهيئة الموظف الجديد
// ═══════════════════════════════════════════════════

/** سرد القوالب المتاحة */
router.get('/onboarding/templates', authenticate, authorize('admin', 'hr'), (req, res) => {
  res.json({ success: true, data: OnboardingService.getTemplates() });
});

/** لوحة تحكم التهيئة */
router.get(
  '/onboarding/dashboard',
  authenticate,
  authorize('admin', 'hr', 'manager'),
  async (req, res) => {
    try {
      const result = await OnboardingService.dashboard();
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  }
);

/** إنشاء عملية تهيئة */
router.post('/onboarding', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const result = await OnboardingService.create({
      ...req.body,
      createdBy: req.user?.id || req.user?._id,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/** سرد جميع عمليات التهيئة */
router.get('/onboarding', authenticate, authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const result = await OnboardingService.list(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** جلب تهيئة موظف */
router.get(
  '/onboarding/employee/:employeeId',
  authenticate,
  authorize('admin', 'hr', 'manager', 'user'),
  async (req, res) => {
    try {
      const result = await OnboardingService.getByEmployee(req.params.employeeId);
      if (!result)
        return res
          .status(404)
          .json({ success: false, message: 'لم يتم العثور على بيانات التهيئة' });
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  }
);

/** تحديث مهمة تهيئة */
router.put(
  '/onboarding/:id/tasks/:taskId',
  authenticate,
  authorize('admin', 'hr', 'manager'),
  async (req, res) => {
    try {
      const result = await OnboardingService.updateTask(req.params.id, req.params.taskId, {
        ...req.body,
        updatedBy: req.user?.id || req.user?._id,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/** تقديم تغذية راجعة */
router.post(
  '/onboarding/:id/feedback',
  authenticate,
  authorize('admin', 'hr', 'manager', 'user'),
  async (req, res) => {
    try {
      const result = await OnboardingService.submitFeedback(req.params.id, req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ═══════════════════════════════════════════════════
//  DOCUMENTS — إدارة مستندات الموظفين
// ═══════════════════════════════════════════════════

/** لوحة تحكم المستندات */
router.get('/documents/dashboard', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const result = await DocumentService.dashboard();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** مستندات تنتهي قريباً */
router.get('/documents/expiring', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const result = await DocumentService.getExpiringDocuments(days);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** مستندات منتهية */
router.get('/documents/expired', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const result = await DocumentService.getExpiredDocuments();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** إنشاء مستند */
router.post('/documents', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const result = await DocumentService.create({
      ...req.body,
      createdBy: req.user?.id || req.user?._id,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/** مستندات موظف */
router.get(
  '/documents/employee/:employeeId',
  authenticate,
  authorize('admin', 'hr', 'manager', 'user'),
  async (req, res) => {
    try {
      const result = await DocumentService.getByEmployee(req.params.employeeId, req.query);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: safeError(err) });
    }
  }
);

/** التحقق من مستند */
router.put('/documents/:id/verify', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const result = await DocumentService.verifyDocument(req.params.id, {
      verifiedBy: req.user?.id || req.user?._id,
      verificationNotes: req.body.notes,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/** إضافة إصدار جديد */
router.post('/documents/:id/versions', authenticate, authorize('admin', 'hr'), async (req, res) => {
  try {
    const result = await DocumentService.addVersion(req.params.id, {
      ...req.body,
      uploadedBy: req.user?.id || req.user?._id,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
