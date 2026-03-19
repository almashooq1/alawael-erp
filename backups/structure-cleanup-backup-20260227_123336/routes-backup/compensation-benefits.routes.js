/**
 * Compensation & Benefits Routes - مسارات التعويضات والمزايا
 */

const express = require('express');
const router = express.Router();
const HRCompensationBenefitsService = require('../services/hr/compensationBenefitsService');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

// ========== خطط التعويضات ==========

// إنشاء خطة تعويضات
router.post(
  '/compensation/plans',
  authenticateToken,
  authorizeRole(['hr', 'finance', 'admin']),
  async (req, res) => {
    try {
      const result = await HRCompensationBenefitsService.createCompensationPlan({
        name: req.body.name,
        description: req.body.description,
        baseSalary: req.body.baseSalary,
        components: req.body.components,
        benefits: req.body.benefits,
        createdBy: req.user.userId,
      });

      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// تعيين خطة تعويضات لموظف
router.post(
  '/compensation/assign/:employeeId',
  authenticateToken,
  authorizeRole(['hr', 'finance', 'admin']),
  async (req, res) => {
    try {
      const result = await HRCompensationBenefitsService.assignCompensationPlan(
        req.params.employeeId,
        req.body.planId,
        req.user.userId
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// حساب الراتب مع المزايا
router.get(
  '/compensation/payroll/:employeeId',
  authenticateToken,
  authorizeRole(['finance', 'hr', 'manager', 'admin']),
  async (req, res) => {
    try {
      const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;

      const payroll = await HRCompensationBenefitsService.calculatePayroll(
        req.params.employeeId,
        parseInt(month),
        parseInt(year)
      );

      res.json(payroll);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ========== التأمين الصحي ==========

// التسجيل في التأمين الصحي
router.post(
  '/benefits/health-insurance/:employeeId',
  authenticateToken,
  authorizeRole(['hr', 'admin']),
  async (req, res) => {
    try {
      const result = await HRCompensationBenefitsService.enrollHealthInsurance(
        req.params.employeeId,
        req.body
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ========== برنامج التقاعد ==========

// التسجيل في برنامج التقاعد
router.post(
  '/benefits/retirement/:employeeId',
  authenticateToken,
  authorizeRole(['hr', 'admin']),
  async (req, res) => {
    try {
      const result = await HRCompensationBenefitsService.enrollRetirementPlan(
        req.params.employeeId,
        req.body
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ========== المزايا الإضافية ==========

// منح مزايا إضافية
router.post(
  '/benefits/grant/:employeeId',
  authenticateToken,
  authorizeRole(['hr', 'manager', 'admin']),
  async (req, res) => {
    try {
      const result = await HRCompensationBenefitsService.grantBenefit(req.params.employeeId, {
        type: req.body.type,
        description: req.body.description,
        value: req.body.value,
        currency: req.body.currency,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        frequency: req.body.frequency,
        grantedBy: req.user.userId,
      });

      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ========== الاستفسارات والتقارير ==========

// ملخص المزايا للموظف
router.get(
  '/benefits/summary/:employeeId',
  authenticateToken,
  authorizeRole(['employee', 'manager', 'hr', 'admin']),
  async (req, res) => {
    try {
      // التحقق من الصلاحيات
      if (req.user.role === 'employee' && req.user.employeeId !== req.params.employeeId) {
        return res.status(403).json({ error: 'غير مصرح بالوصول' });
      }

      const summary = await HRCompensationBenefitsService.getBenefitsSummary(req.params.employeeId);

      res.json(summary);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// مقارنة التعويضات
router.post(
  '/compensation/compare',
  authenticateToken,
  authorizeRole(['hr', 'finance', 'admin']),
  async (req, res) => {
    try {
      const comparison = await HRCompensationBenefitsService.compareCompensation(
        req.body.employeeIds
      );

      res.json(comparison);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// التحقق من الامتثال
router.get(
  '/compliance/benefits/:employeeId',
  authenticateToken,
  authorizeRole(['hr', 'admin']),
  async (req, res) => {
    try {
      const compliance = await HRCompensationBenefitsService.checkBenefitsCompliance(
        req.params.employeeId
      );

      res.json(compliance);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// حساب مكافأة نهاية الخدمة
router.get(
  '/benefits/end-of-service/:employeeId',
  authenticateToken,
  authorizeRole(['hr', 'finance', 'admin']),
  async (req, res) => {
    try {
      const eosb = await HRCompensationBenefitsService.calculateEndOfServiceBenefit(
        req.params.employeeId
      );

      res.json(eosb);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// تقرير التعويضات الشامل
router.get(
  '/reports/compensation',
  authenticateToken,
  authorizeRole(['hr', 'finance', 'admin']),
  async (req, res) => {
    try {
      const { department } = req.query;

      const report = await HRCompensationBenefitsService.generateCompensationReport(department);

      res.json(report);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

module.exports = router;
