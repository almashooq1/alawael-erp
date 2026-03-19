/**
 * Government Integration Routes — مسارات التكامل الحكومي الموحّد
 *
 * Unified API for GOSI + MOL + Qiwa interactions through employee context.
 * ─── التسجيل الشامل (GOSI + Qiwa)
 * ─── لوحة الامتثال الحكومي
 * ─── المزامنة الجماعية
 * ─── حالة التكامل لكل موظف
 * ─── إنهاء الخدمات الموحّد
 * ─── عمليات قوى (عقود + حماية أجور + نطاقات)
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const govService = require('../services/governmentIntegration.service');

// ─── Async wrapper ──────────────────────────────────────────────────────────
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ═══════════════════════════════════════════════════════════════════════════
// لوحة المعلومات والتقارير (MUST come before /:employeeId)
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/dashboard',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const data = await govService.getGovernmentComplianceDashboard();
    res.json({ success: true, data });
  })
);

router.get(
  '/nitaqat/status',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const data = await govService.getNitaqatStatus();
    res.json({ success: true, data });
  })
);

router.get(
  '/nitaqat/compliance',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const data = await govService.getNitaqatCompliance();
    res.json({ success: true, data });
  })
);

router.get(
  '/gosi/compliance',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const data = await govService.getGOSIComplianceReport(req.query);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// المزامنة الجماعية
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/bulk-sync',
  authenticateToken,
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const data = await govService.bulkSyncGovernmentRegistrations();
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// WPS — حماية الأجور
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/wps/submit',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const data = await govService.submitPayrollToWPS(req.body);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// عمليات الموظف الفردية — Per-employee operations
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/:employeeId/status',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const data = await govService.getEmployeeGovernmentStatus(req.params.employeeId);
    res.json({ success: true, data });
  })
);

router.post(
  '/:employeeId/register-all',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const data = await govService.fullGovernmentRegistration(req.params.employeeId);
    res.status(201).json({ success: true, data });
  })
);

router.post(
  '/:employeeId/terminate',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const data = await govService.terminateEmployeeGovernment(req.params.employeeId, reason);
    res.json({ success: true, data });
  })
);

// ─── GOSI per employee ─────────────────────────────────────────────────────

router.post(
  '/:employeeId/gosi/register',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const data = await govService.registerEmployeeGOSI(req.params.employeeId);
    res.status(201).json({ success: true, data });
  })
);

router.get(
  '/:employeeId/gosi/status',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const data = await govService.getEmployeeGOSIStatus(req.params.employeeId);
    res.json({ success: true, data });
  })
);

router.put(
  '/:employeeId/gosi/wage',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { newSalary } = req.body;
    if (!newSalary) return res.status(400).json({ success: false, message: 'newSalary مطلوب' });
    const data = await govService.updateEmployeeGOSIWage(req.params.employeeId, newSalary);
    res.json({ success: true, data });
  })
);

// ─── Qiwa / MOL per employee ───────────────────────────────────────────────

router.post(
  '/:employeeId/qiwa/contract',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const data = await govService.registerEmployeeQiwaContract(req.params.employeeId, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.get(
  '/:employeeId/qiwa/status',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const data = await govService.getEmployeeQiwaStatus(req.params.employeeId);
    res.json({ success: true, data });
  })
);

router.put(
  '/:employeeId/qiwa/wage',
  authenticateToken,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const data = await govService.updateEmployeeWageInQiwa(req.params.employeeId, req.body);
    res.json({ success: true, data });
  })
);

router.get(
  '/:employeeId/qiwa/verify',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const data = await govService.verifyEmployeeInQiwa(req.params.employeeId);
    res.json({ success: true, data });
  })
);

router.get(
  '/:employeeId/mol/labor-record',
  authenticateToken,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const data = await govService.getEmployeeLaborRecord(req.params.employeeId);
    res.json({ success: true, data });
  })
);

module.exports = router;
