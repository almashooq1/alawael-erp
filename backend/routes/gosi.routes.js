/**
 * GOSI Routes — مسارات التأمينات الاجتماعية
 *
 * Exposes the existing GOSI service files as REST API endpoints.
 * Uses the unified GovernmentIntegrationService for employee-aware ops
 * and falls back to gosi-advanced.service for standalone calculations.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const govService = require('../services/governmentIntegration.service');

// ─── Async wrapper ──────────────────────────────────────────────────────────
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ═══════════════════════════════════════════════════════════════════════════
// لوحة الامتثال (MUST come before /:employeeId patterns)
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/compliance/report',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const data = await govService.getGOSIComplianceReport(req.query);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// عمليات حساب مباشرة (لا تحتاج employeeId)
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/calculate',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  asyncHandler(async (req, res) => {
    const { basicSalary, housingAllowance = 0, isSaudi = true } = req.body;
    if (!basicSalary) {
      return res.status(400).json({ success: false, message: 'basicSalary مطلوب' });
    }
    const data = govService.calculateGOSIContributions(basicSalary, housingAllowance, isSaudi);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// عمليات الموظف — GOSI per-employee operations
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/:employeeId/register',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const data = await govService.registerEmployeeGOSI(req.params.employeeId);
    res.status(201).json({ success: true, data });
  })
);

router.get(
  '/:employeeId/status',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const data = await govService.getEmployeeGOSIStatus(req.params.employeeId);
    res.json({ success: true, data });
  })
);

router.put(
  '/:employeeId/wage',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { newSalary } = req.body;
    if (!newSalary) {
      return res.status(400).json({ success: false, message: 'newSalary مطلوب' });
    }
    const data = await govService.updateEmployeeGOSIWage(req.params.employeeId, newSalary);
    res.json({ success: true, data });
  })
);

router.post(
  '/:employeeId/cancel',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager']),
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const data = await govService.cancelEmployeeGOSI(
      req.params.employeeId,
      reason || 'إنهاء خدمات'
    );
    res.json({ success: true, data });
  })
);

router.get(
  '/:employeeId/certificate',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'hr_manager', 'hr']),
  asyncHandler(async (req, res) => {
    const { type = 'standard' } = req.query;
    const data = await govService.generateGOSICertificate(req.params.employeeId, type);
    res.json({ success: true, data });
  })
);

module.exports = router;
