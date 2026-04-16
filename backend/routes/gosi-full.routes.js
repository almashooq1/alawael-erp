/**
 * GOSI Full Routes — مسارات التأمينات الاجتماعية الكاملة
 *
 * تغطي:
 * - تسجيل الموظفين وإدارة الاشتراكات
 * - حساب الاشتراكات الشهرية وربطها بالرواتب
 * - سجلات الدفع (SADAD)
 * - حساب مكافأة نهاية الخدمة (مادة 84/85/87)
 * - التقارير والإحصائيات
 *
 * @module routes/gosi-full.routes
 * @version 1.0.0
 */
'use strict';

const express = require('express');
const router = express.Router();
const gosiService = require('../services/gosi-full.service');
const { authenticateToken, authorize } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
// ── Async wrapper ─────────────────────────────────────────────────────────
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── بناء السياق ───────────────────────────────────────────────────────────
const buildContext = req => ({
  userId: req.user?._id || req.user?.id,
  organizationId: req.user?.organizationId || req.user?.organization,
  establishmentId: process.env.GOSI_ESTABLISHMENT_ID,
});

// =============================================================================
// لوحة التحكم والإحصائيات
// =============================================================================

/**
 * GET /api/gosi-full/dashboard
 * ملخص GOSI للوحة التحكم
 */
router.get(
  '/dashboard',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager', 'hr', 'finance']),
  asyncHandler(async (req, res) => {
    const ctx = buildContext(req);
    const data = await gosiService.getDashboardSummary(ctx.organizationId);
    res.json({ success: true, data });
  })
);

/**
 * GET /api/gosi-full/rates
 * جدول نسب الاشتراكات (للعرض)
 */
router.get(
  '/rates',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  asyncHandler(async (req, res) => {
    const data = gosiService.getRatesTable();
    res.json({ success: true, data });
  })
);

// =============================================================================
// حساب الاشتراكات
// =============================================================================

/**
 * POST /api/gosi-full/calculate
 * حساب سريع للاشتراك (بدون حفظ)
 * Body: { basicSalary, housingAllowance, nationalityCode, hireDate }
 */
router.post(
  '/calculate',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  asyncHandler(async (req, res) => {
    const { basicSalary, housingAllowance = 0, nationalityCode = 'SA', hireDate } = req.body;
    if (!basicSalary || basicSalary <= 0) {
      return res
        .status(400)
        .json({ success: false, message: 'basicSalary مطلوب ويجب أن يكون أكبر من صفر' });
    }
    const data = gosiService.quickCalculate(
      basicSalary,
      housingAllowance,
      nationalityCode,
      hireDate
    );
    res.json({ success: true, data });
  })
);

/**
 * POST /api/gosi-full/monthly/:period
 * حساب اشتراكات الشهر لجميع الموظفين وإنشاء سجل الدفع
 * Params: period = YYYY-MM
 * Body: { employees: [...] }
 */
router.post(
  '/monthly/:period',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager', 'finance']),
  asyncHandler(async (req, res) => {
    const { period } = req.params;
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ success: false, message: 'تنسيق period يجب أن يكون YYYY-MM' });
    }
    const { employees } = req.body;
    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ success: false, message: 'قائمة الموظفين مطلوبة' });
    }
    const ctx = buildContext(req);
    const payment = await gosiService.calculateMonthlyContributions(
      employees,
      period,
      ctx.organizationId,
      ctx.userId
    );
    res.status(201).json({
      success: true,
      message: `تم حساب اشتراكات ${period} بنجاح`,
      data: payment,
    });
  })
);

// =============================================================================
// تسجيل الموظفين وإدارة الاشتراكات
// =============================================================================

/**
 * POST /api/gosi-full/employees/:employeeId/register
 * تسجيل موظف في GOSI
 */
router.post(
  '/employees/:employeeId/register',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const employeeData = { _id: employeeId, ...req.body };
    const ctx = buildContext(req);
    const subscription = await gosiService.registerEmployee(employeeData, ctx);
    res.status(201).json({
      success: true,
      message: 'تم تسجيل الموظف في التأمينات الاجتماعية بنجاح',
      data: subscription,
    });
  })
);

/**
 * PUT /api/gosi-full/subscriptions/:subscriptionId/wage
 * تحديث راتب الاشتراك
 * Body: { newBasicSalary, newHousingAllowance }
 */
router.put(
  '/subscriptions/:subscriptionId/wage',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { subscriptionId } = req.params;
    const { newBasicSalary, newHousingAllowance = 0 } = req.body;
    if (!newBasicSalary) {
      return res.status(400).json({ success: false, message: 'newBasicSalary مطلوب' });
    }
    const ctx = buildContext(req);
    const data = await gosiService.updateSubscriptionWage(
      subscriptionId,
      newBasicSalary,
      newHousingAllowance,
      ctx.userId
    );
    res.json({ success: true, message: 'تم تحديث الراتب بنجاح', data });
  })
);

/**
 * POST /api/gosi-full/payroll/:payrollId/link
 * ربط اشتراكات GOSI مع مسير الرواتب
 * Body: { payrollItems: [...], period: 'YYYY-MM' }
 */
router.post(
  '/payroll/:payrollId/link',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager', 'finance']),
  asyncHandler(async (req, res) => {
    const { payrollId } = req.params;
    const { payrollItems, period } = req.body;
    if (!payrollItems || !period) {
      return res.status(400).json({ success: false, message: 'payrollItems و period مطلوبان' });
    }
    const results = await gosiService.linkWithPayroll(payrollItems, period, payrollId);
    res.json({
      success: true,
      message: `تم ربط ${results.length} اشتراك بمسير الرواتب`,
      data: results,
    });
  })
);

// =============================================================================
// إدارة الدفعات
// =============================================================================

/**
 * POST /api/gosi-full/payments/:paymentId/record
 * تسجيل دفعة GOSI بعد السداد
 * Body: { sadadNumber }
 */
router.post(
  '/payments/:paymentId/record',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'finance']),
  asyncHandler(async (req, res) => {
    const { paymentId } = req.params;
    const { sadadNumber } = req.body;
    if (!sadadNumber) {
      return res.status(400).json({ success: false, message: 'sadadNumber مطلوب' });
    }
    const ctx = buildContext(req);
    const payment = await gosiService.recordPayment(paymentId, sadadNumber, ctx.userId);
    res.json({ success: true, message: 'تم تسجيل الدفعة بنجاح', data: payment });
  })
);

/**
 * GET /api/gosi-full/reports/:period
 * تقرير الاشتراكات لفترة محددة
 */
router.get(
  '/reports/:period',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager', 'hr', 'finance']),
  asyncHandler(async (req, res) => {
    const { period } = req.params;
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ success: false, message: 'تنسيق period يجب أن يكون YYYY-MM' });
    }
    const ctx = buildContext(req);
    const data = await gosiService.getPeriodReport(period, ctx.organizationId);
    res.json({ success: true, data });
  })
);

// =============================================================================
// مكافأة نهاية الخدمة
// =============================================================================

/**
 * POST /api/gosi-full/end-of-service/calculate
 * حساب مكافأة نهاية الخدمة الكامل
 * Body: { employee: {...}, terminationType, endDate? }
 */
router.post(
  '/end-of-service/calculate',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const { employee, terminationType, endDate } = req.body;
    if (!employee || !employee._id) {
      return res
        .status(400)
        .json({ success: false, message: 'بيانات الموظف مطلوبة (employee._id)' });
    }
    if (!terminationType) {
      return res.status(400).json({ success: false, message: 'terminationType مطلوب' });
    }
    if (!employee.hireDate) {
      return res.status(400).json({ success: false, message: 'hireDate مطلوب في بيانات الموظف' });
    }
    const ctx = buildContext(req);
    const calc = await gosiService.calculateEndOfService(
      employee,
      terminationType,
      endDate,
      ctx,
      false
    );
    res.status(201).json({
      success: true,
      message: 'تم حساب مكافأة نهاية الخدمة بنجاح',
      data: calc,
    });
  })
);

/**
 * POST /api/gosi-full/end-of-service/estimate
 * حساب تقديري لسيناريوهات نهاية الخدمة
 * Body: { employee: {...} }
 */
router.post(
  '/end-of-service/estimate',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const { employee } = req.body;
    if (!employee || !employee.hireDate) {
      return res.status(400).json({ success: false, message: 'بيانات الموظف مطلوبة مع hireDate' });
    }
    const ctx = buildContext(req);
    const scenarios = await gosiService.estimateEndOfService(employee, ctx);
    res.json({
      success: true,
      message: 'تم حساب التقديرات بنجاح',
      data: scenarios,
    });
  })
);

/**
 * PUT /api/gosi-full/end-of-service/:calculationId/confirm
 * تأكيد حساب مكافأة نهاية الخدمة
 */
router.put(
  '/end-of-service/:calculationId/confirm',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const ctx = buildContext(req);
    const calc = await gosiService.confirmEndOfService(req.params.calculationId, ctx.userId);
    res.json({ success: true, message: 'تم تأكيد الحساب بنجاح', data: calc });
  })
);

/**
 * PUT /api/gosi-full/end-of-service/:calculationId/paid
 * تسجيل صرف مكافأة نهاية الخدمة
 * Body: { paidDate? }
 */
router.put(
  '/end-of-service/:calculationId/paid',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'finance']),
  asyncHandler(async (req, res) => {
    const { paidDate } = req.body;
    const calc = await gosiService.markEndOfServicePaid(req.params.calculationId, paidDate);
    res.json({ success: true, message: 'تم تسجيل صرف المكافأة بنجاح', data: calc });
  })
);

/**
 * GET /api/gosi-full/end-of-service/employee/:employeeId
 * سجل مكافآت نهاية الخدمة للموظف
 */
router.get(
  '/end-of-service/employee/:employeeId',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const data = await gosiService.getEmployeeEndOfServiceHistory(req.params.employeeId);
    res.json({ success: true, data });
  })
);

module.exports = router;
