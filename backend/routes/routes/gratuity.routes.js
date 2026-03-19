/**
 * Gratuity Routes - مسارات مكافأة نهاية الخدمة
 * 
 * توفر واجهات برمجية شاملة لإدارة حسابات وعمليات مكافآت نهاية الخدمة
 * 
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const GratuityService = require('../services/hr/gratuityService');
const Gratuity = require('../models/gratuity.model');
const GratuityAudit = require('../models/gratuityAudit.model');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

// ============================================================
// 1. حسابات مكافأة نهاية الخدمة
// ============================================================

/**
 * POST /api/gratuity/calculate
 * حساب مكافأة نهاية الخدمة للموظف
 * 
 * Body:
 * {
 *   "employeeId": "...",
 *   "terminationDate": "2026-02-17",
 *   "scenario": "RESIGNATION" | "DISMISSAL_WITHOUT_CAUSE" | "DISMISSAL_WITH_FAULT" | "RETIREMENT" | "DEATH"
 * }
 */
router.post(
  '/calculate',
  authenticateToken,
  authorizeRole(['hr', 'finance', 'manager', 'admin']),
  async (req, res) => {
    try {
      const { employeeId, terminationDate, scenario = 'RESIGNATION' } = req.body;

      if (!employeeId) {
        return res.status(400).json({ error: 'معرف الموظف مطلوب' });
      }

      const result = await GratuityService.calculateFinalSettlement(
        employeeId,
        terminationDate,
        scenario
      );

      res.json({
        success: true,
        message: 'تم حساب المكافأة بنجاح',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        error: error.message,
        message: 'خطأ في حساب المكافأة'
      });
    }
  }
);

/**
 * POST /api/gratuity/preview
 * عرض معاينة الحساب بدون حفظ
 */
router.post(
  '/preview',
  authenticateToken,
  async (req, res) => {
    try {
      const { employeeId, terminationDate, scenario = 'RESIGNATION' } = req.body;

      const result = await GratuityService.calculateFinalSettlement(
        employeeId,
        terminationDate,
        scenario
      );

      res.json({
        success: true,
        preview: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * POST /api/gratuity/custom-calculation
 * حساب مخصص مع معاملات متقدمة
 */
router.post(
  '/custom-calculation',
  authenticateToken,
  authorizeRole(['hr', 'finance', 'admin']),
  async (req, res) => {
    try {
      const {
        employeeId,
        terminationDate,
        scenario,
        customDeductions = [],
        customAdditions = [],
        adjustmentFactor = 1
      } = req.body;

      let result = await GratuityService.calculateFinalSettlement(
        employeeId,
        terminationDate,
        scenario
      );

      // تطبيق التسويات المخصصة
      if (customDeductions.length > 0) {
        const extraDeductions = customDeductions.reduce((sum, d) => sum + d.amount, 0);
        result.summary.totalDeductions += extraDeductions;
        result.summary.netSettlement = Math.max(0, result.summary.netSettlement - extraDeductions);
      }

      if (customAdditions.length > 0) {
        const extraAdditions = customAdditions.reduce((sum, a) => sum + a.amount, 0);
        result.summary.totalAdditions += extraAdditions;
        result.summary.netSettlement += extraAdditions;
      }

      // تطبيق معامل التعديل
      if (adjustmentFactor !== 1) {
        result.summary.netSettlement = Math.round(result.summary.netSettlement * adjustmentFactor * 100) / 100;
      }

      res.json({
        success: true,
        custom: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ============================================================
// 2. إنشاء وإدارة سجلات المكافآت
// ============================================================

/**
 * POST /api/gratuity/create
 * إنشاء سجل مكافأة نهاية الخدمة
 */
router.post(
  '/create',
  authenticateToken,
  authorizeRole(['hr', 'finance', 'admin']),
  async (req, res) => {
    try {
      const { employeeId, terminationDate, scenario } = req.body;

      // حساب التسوية أولاً
      const settlementData = await GratuityService.calculateFinalSettlement(
        employeeId,
        terminationDate,
        scenario
      );

      // حفظ السجل
      const result = await GratuityService.createGratuityRecord(
        employeeId,
        settlementData,
        req.user.userId
      );

      res.status(201).json({
        success: true,
        message: 'تم إنشاء سجل المكافأة بنجاح',
        data: result.record
      });
    } catch (error) {
      res.status(400).json({
        error: error.message,
        message: 'خطأ في إنشاء السجل'
      });
    }
  }
);

/**
 * GET /api/gratuity/:gratuityId
 * جلب تفاصيل سجل محدد
 */
router.get(
  '/:gratuityId',
  authenticateToken,
  async (req, res) => {
    try {
      const gratuity = await Gratuity.findById(req.params.gratuityId)
        .populate('employeeId', 'fullName position department')
        .populate('createdBy updatedBy', 'fullName email');

      if (!gratuity) {
        return res.status(404).json({ error: 'السجل غير موجود' });
      }

      res.json({
        success: true,
        data: gratuity
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/gratuity/employee/:employeeId
 * جلب سجلات المكافآت للموظف
 */
router.get(
  '/employee/:employeeId',
  authenticateToken,
  async (req, res) => {
    try {
      const gratuities = await Gratuity.find({ employeeId: req.params.employeeId })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'fullName email');

      res.json({
        success: true,
        count: gratuities.length,
        data: gratuities
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/gratuity
 * البحث والتصفية
 * Query params:
 * - status: DRAFT, APPROVED, COMPLETED
 * - scenario: RESIGNATION, DISMISSAL_WITHOUT_CAUSE, etc.
 * - department: الإدارة
 * - fromDate: من التاريخ
 * - toDate: إلى التاريخ
 * - page: رقم الصفحة
 * - limit: عدد النتائج
 */
router.get(
  '/',
  authenticateToken,
  authorizeRole(['hr', 'finance', 'admin']),
  async (req, res) => {
    try {
      const {
        status,
        scenario,
        department,
        fromDate,
        toDate,
        page = 1,
        limit = 20
      } = req.query;

      const filter = {};

      if (status) filter.status = status;
      if (scenario) filter.terminationScenario = scenario;
      if (department) filter.department = department;

      if (fromDate || toDate) {
        filter.terminationDate = {};
        if (fromDate) filter.terminationDate.$gte = new Date(fromDate);
        if (toDate) filter.terminationDate.$lte = new Date(toDate);
      }

      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        Gratuity.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate('employeeId', 'fullName position'),
        Gratuity.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ============================================================
// 3. الموافقات والمعالجة
// ============================================================

/**
 * POST /api/gratuity/:gratuityId/approve
 * الموافقة على المكافأة
 */
router.post(
  '/:gratuityId/approve',
  authenticateToken,
  authorizeRole(['hr', 'finance', 'admin']),
  async (req, res) => {
    try {
      const { gratuityId } = req.params;
      const { remarks } = req.body;

      const result = await GratuityService.approveGratuity(
        gratuityId,
        req.user.userId,
        remarks
      );

      res.json({
        success: true,
        message: 'تمت الموافقة على المكافأة',
        data: result
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * POST /api/gratuity/:gratuityId/reject
 * رفض المكافأة
 */
router.post(
  '/:gratuityId/reject',
  authenticateToken,
  authorizeRole(['hr', 'finance', 'admin']),
  async (req, res) => {
    try {
      const { gratuityId } = req.params;
      const { remarks } = req.body;

      const gratuity = await Gratuity.findById(gratuityId);
      if (!gratuity) {
        return res.status(404).json({ error: 'السجل غير موجود' });
      }

      gratuity.status = 'REJECTED';
      gratuity.approvals.push({
        approvedBy: req.user.userId,
        timestamp: new Date(),
        remarks,
        status: 'REJECTED'
      });

      await gratuity.save();

      await GratuityService.createAuditLog(
        gratuityId,
        gratuity.employeeId,
        'REJECTED',
        { remarks },
        req.user.userId
      );

      res.json({
        success: true,
        message: 'تم رفض المكافأة',
        status: 'REJECTED'
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * POST /api/gratuity/:gratuityId/edit
 * تعديل المكافأة
 */
router.post(
  '/:gratuityId/edit',
  authenticateToken,
  authorizeRole(['hr', 'finance', 'admin']),
  async (req, res) => {
    try {
      const { gratuityId } = req.params;
      const updates = req.body;

      const gratuity = await Gratuity.findById(gratuityId);
      if (!gratuity) {
        return res.status(404).json({ error: 'السجل غير موجود' });
      }

      if (gratuity.status !== 'DRAFT' && gratuity.status !== 'SUBMITTED') {
        return res.status(400).json({
          error: 'لا يمكن تعديل السجل في حالة ' + gratuity.status
        });
      }

      // حفظ القيم القديمة للتدقيق
      const oldValues = JSON.parse(JSON.stringify(gratuity.toObject()));

      // تطبيق التحديثات
      Object.keys(updates).forEach(key => {
        if (key !== '_id' && key !== 'employeeId') {
          gratuity[key] = updates[key];
        }
      });

      gratuity.updatedBy = req.user.userId;
      await gratuity.save();

      await GratuityService.createAuditLog(
        gratuityId,
        gratuity.employeeId,
        'MODIFIED',
        { oldValues, newValues: updates },
        req.user.userId
      );

      res.json({
        success: true,
        message: 'تم تحديث السجل',
        data: gratuity
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ============================================================
// 4. معالجة الدفع
// ============================================================

/**
 * POST /api/gratuity/:gratuityId/process-payment
 * بدء معالجة الدفع
 */
router.post(
  '/:gratuityId/process-payment',
  authenticateToken,
  authorizeRole(['finance', 'admin']),
  async (req, res) => {
    try {
      const { gratuityId } = req.params;
      const { paymentMethod, bankDetails } = req.body;

      const result = await GratuityService.processPayment(
        gratuityId,
        paymentMethod,
        bankDetails
      );

      res.json({
        success: true,
        message: 'تم بدء معالجة الدفع',
        data: result
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * POST /api/gratuity/:gratuityId/complete-payment
 * إكمال الدفع
 */
router.post(
  '/:gratuityId/complete-payment',
  authenticateToken,
  authorizeRole(['finance', 'admin']),
  async (req, res) => {
    try {
      const { gratuityId } = req.params;
      const { paymentReference } = req.body;

      const result = await GratuityService.completePayment(
        gratuityId,
        paymentReference
      );

      res.json({
        success: true,
        message: 'تم إكمال الدفع',
        data: result
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ============================================================
// 5. سجل التدقيق والتقارير
// ============================================================

/**
 * GET /api/gratuity/:gratuityId/audit-trail
 * جلب سجل التدقيق الكامل
 */
router.get(
  '/:gratuityId/audit-trail',
  authenticateToken,
  async (req, res) => {
    try {
      const auditLogs = await GratuityService.getAuditTrail(req.params.gratuityId);

      res.json({
        success: true,
        count: auditLogs.length,
        data: auditLogs
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/gratuity/reports/summary
 * تقرير ملخص المكافآت
 */
router.get(
  '/reports/summary',
  authenticateToken,
  authorizeRole(['hr', 'finance', 'admin']),
  async (req, res) => {
    try {
      const { fromDate, toDate, department } = req.query;

      const filter = {};
      if (fromDate || toDate) {
        filter.terminationDate = {};
        if (fromDate) filter.terminationDate.$gte = new Date(fromDate);
        if (toDate) filter.terminationDate.$lte = new Date(toDate);
      }
      if (department) filter.department = department;

      const gratuities = await Gratuity.find(filter);

      const summary = {
        total: gratuities.length,
        byStatus: {},
        byScenario: {},
        financialSummary: {
          totalGratuity: 0,
          totalDeductions: 0,
          totalPayments: 0,
          averageGratuity: 0
        }
      };

      gratuities.forEach(g => {
        // حساب الحالات
        summary.byStatus[g.status] = (summary.byStatus[g.status] || 0) + 1;
        summary.byScenario[g.terminationScenario] = (summary.byScenario[g.terminationScenario] || 0) + 1;

        // الحسابات المالية
        summary.financialSummary.totalGratuity += g.summary.baseGratuity;
        summary.financialSummary.totalDeductions += g.summary.totalDeductions;
        summary.financialSummary.totalPayments += g.summary.netSettlement;
      });

      if (gratuities.length > 0) {
        summary.financialSummary.averageGratuity = 
          Math.round(summary.financialSummary.totalGratuity / gratuities.length * 100) / 100;
      }

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/gratuity/reports/detailed
 * تقرير مفصل بصيغة PDF/Excel
 */
router.get(
  '/reports/detailed',
  authenticateToken,
  authorizeRole(['hr', 'finance', 'admin']),
  async (req, res) => {
    try {
      const { format = 'json', fromDate, toDate } = req.query;

      const filter = {};
      if (fromDate || toDate) {
        filter.terminationDate = {};
        if (fromDate) filter.terminationDate.$gte = new Date(fromDate);
        if (toDate) filter.terminationDate.$lte = new Date(toDate);
      }

      const gratuities = await Gratuity.find(filter)
        .populate('employeeId', 'fullName position department')
        .sort({ createdAt: -1 });

      if (format === 'json') {
        return res.json({
          success: true,
          data: gratuities
        });
      }

      // للصيغ الأخرى (PDF, Excel)، يمكن إضافة مكتبات مثل pdfkit أو exceljs
      res.json({
        success: true,
        message: 'تقرير مفصل متاح بصيغة ' + format,
        data: gratuities
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/gratuity/reports/compliance
 * تقرير الامتثال للقانون السعودي
 */
router.get(
  '/reports/compliance',
  authenticateToken,
  authorizeRole(['hr', 'compliance', 'admin']),
  async (req, res) => {
    try {
      const gratuities = await Gratuity.find({
        status: { $in: ['COMPLETED', 'APPROVED'] }
      });

      const compliance = {
        totalProcessed: gratuities.length,
        compliantRecords: 0,
        nonCompliantRecords: 0,
        issues: [],
        complianceRate: 0
      };

      gratuities.forEach(g => {
        let isCompliant = true;

        // التحقق من الامتثال
        if (g.summary.baseGratuity <= 0 && g.yearsOfService >= 2) {
          isCompliant = false;
          compliance.issues.push({
            gratuityId: g._id,
            issue: 'مكافأة سالبة أو صفرية لموظف مستحق'
          });
        }

        if (g.status === 'COMPLETED' && !g.integrations.qiwaSubmitted) {
          isCompliant = false;
          compliance.issues.push({
            gratuityId: g._id,
            issue: 'لم يتم إرسالها إلى كيوا'
          });
        }

        if (isCompliant) {
          compliance.compliantRecords++;
        } else {
          compliance.nonCompliantRecords++;
        }
      });

      compliance.complianceRate = gratuities.length > 0
        ? Math.round((compliance.compliantRecords / gratuities.length) * 100)
        : 0;

      res.json({
        success: true,
        data: compliance
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

module.exports = router;
