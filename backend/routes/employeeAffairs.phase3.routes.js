/**
 * Employee Affairs Phase 3 Routes — مسارات شؤون الموظفين المرحلة الثالثة
 *
 * Endpoints cover:
 *  /contracts           – إدارة العقود
 *  /vacation-settlement – تسوية الإجازات
 *  /warnings            – الإنذارات والمخالفات
 *  /clearance           – إخلاء الطرف
 *  /exit-visas          – تأشيرات الخروج والعودة
 *  /benefits            – المزايا والبدلات
 */
const express = require('express');
const router = express.Router();
const service = require('../services/employeeAffairs.phase3.service');

// Auth middleware — safe fallback to no-op
let authenticateToken, authorize;
try {
  const authMod = require('../middleware/auth');
  authenticateToken = authMod.authenticateToken || authMod.protect || ((req, res, next) => next());
  authorize =
    authMod.authorize ||
    authMod.restrictTo ||
    ((..._roles) =>
      (_req, _res, next) =>
        next());
} catch {
  authenticateToken = (_req, _res, next) => next();
  authorize = () => (_req, _res, next) => next();
}

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ────────────────────────────────────────────────────────────────────
//  1 — CONTRACTS  إدارة العقود
// ────────────────────────────────────────────────────────────────────
router.get(
  '/contracts',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  wrap(async (req, res) => {
    const result = await service.listContracts(req.query);
    res.json({ success: true, data: result });
  })
);

router.get(
  '/contracts/expiring',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.getExpiringContracts(req.query.days);
    res.json({ success: true, data: result });
  })
);

router.get(
  '/contracts/stats',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.getContractStats();
    res.json({ success: true, data: result });
  })
);

router.get(
  '/contracts/:id',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  wrap(async (req, res) => {
    const result = await service.getContractById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
    res.json({ success: true, data: result });
  })
);

router.post(
  '/contracts',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.createContract({ ...req.body, createdBy: req.user?.id });
    res.status(201).json({ success: true, data: result });
  })
);

router.put(
  '/contracts/:id/renew',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.renewContract(req.params.id, {
      ...req.body,
      renewedBy: req.user?.id,
    });
    res.json({ success: true, data: result });
  })
);

router.put(
  '/contracts/:id/amend',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.addContractAmendment(req.params.id, {
      ...req.body,
      amendedBy: req.user?.id,
    });
    res.json({ success: true, data: result });
  })
);

router.put(
  '/contracts/:id/terminate',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.terminateContract(req.params.id, req.body);
    res.json({ success: true, data: result });
  })
);

// ────────────────────────────────────────────────────────────────────
//  2 — VACATION SETTLEMENT  تسوية الإجازات
// ────────────────────────────────────────────────────────────────────
router.get(
  '/vacation-settlement',
  authenticateToken,
  authorize('admin', 'hr', 'manager', 'finance'),
  wrap(async (req, res) => {
    const result = await service.listSettlements(req.query);
    res.json({ success: true, data: result });
  })
);

router.get(
  '/vacation-settlement/stats',
  authenticateToken,
  authorize('admin', 'hr', 'finance'),
  wrap(async (req, res) => {
    const result = await service.getSettlementStats();
    res.json({ success: true, data: result });
  })
);

router.get(
  '/vacation-settlement/:id',
  authenticateToken,
  authorize('admin', 'hr', 'manager', 'finance'),
  wrap(async (req, res) => {
    const result = await service.getSettlementById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'التسوية غير موجودة' });
    res.json({ success: true, data: result });
  })
);

router.post(
  '/vacation-settlement',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.createSettlement({ ...req.body, createdBy: req.user?.id });
    res.status(201).json({ success: true, data: result });
  })
);

router.put(
  '/vacation-settlement/:id/approve',
  authenticateToken,
  authorize('admin', 'hr', 'manager', 'finance'),
  wrap(async (req, res) => {
    const result = await service.approveSettlement(req.params.id, {
      ...req.body,
      userId: req.user?.id,
    });
    res.json({ success: true, data: result });
  })
);

router.put(
  '/vacation-settlement/:id/disburse',
  authenticateToken,
  authorize('admin', 'finance'),
  wrap(async (req, res) => {
    const result = await service.disburseSettlement(req.params.id, {
      ...req.body,
      paidBy: req.user?.id,
    });
    res.json({ success: true, data: result });
  })
);

// ────────────────────────────────────────────────────────────────────
//  3 — WARNINGS  الإنذارات والمخالفات
// ────────────────────────────────────────────────────────────────────
router.get(
  '/warnings',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  wrap(async (req, res) => {
    const result = await service.listWarnings(req.query);
    res.json({ success: true, data: result });
  })
);

router.get(
  '/warnings/stats',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.getWarningStats();
    res.json({ success: true, data: result });
  })
);

router.get(
  '/warnings/:id',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  wrap(async (req, res) => {
    const result = await service.getWarningById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'الإنذار غير موجود' });
    res.json({ success: true, data: result });
  })
);

router.get(
  '/warnings/employee/:employeeId',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  wrap(async (req, res) => {
    const result = await service.getEmployeeWarningHistory(req.params.employeeId);
    res.json({ success: true, data: result });
  })
);

router.post(
  '/warnings',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.createWarning({ ...req.body, issuedBy: req.user?.id });
    res.status(201).json({ success: true, data: result });
  })
);

router.put(
  '/warnings/:id/issue',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.issueWarning(req.params.id);
    res.json({ success: true, data: result });
  })
);

router.put(
  '/warnings/:id/acknowledge',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await service.acknowledgeWarning(req.params.id, req.body);
    res.json({ success: true, data: result });
  })
);

router.put(
  '/warnings/:id/appeal',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await service.appealWarning(req.params.id, {
      ...req.body,
      submittedBy: req.user?.id,
    });
    res.json({ success: true, data: result });
  })
);

// ────────────────────────────────────────────────────────────────────
//  4 — CLEARANCE/OFFBOARDING  إخلاء الطرف
// ────────────────────────────────────────────────────────────────────
router.get(
  '/clearance',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  wrap(async (req, res) => {
    const result = await service.listClearances(req.query);
    res.json({ success: true, data: result });
  })
);

router.get(
  '/clearance/stats',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.getClearanceStats();
    res.json({ success: true, data: result });
  })
);

router.get(
  '/clearance/:id',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  wrap(async (req, res) => {
    const result = await service.getClearanceById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'إخلاء الطرف غير موجود' });
    res.json({ success: true, data: result });
  })
);

router.post(
  '/clearance',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.initiateClearance({ ...req.body, initiatedBy: req.user?.id });
    res.status(201).json({ success: true, data: result });
  })
);

router.put(
  '/clearance/:id/item/:itemId',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  wrap(async (req, res) => {
    const result = await service.updateClearanceItem(req.params.id, req.params.itemId, {
      ...req.body,
      clearedBy: req.user?.id,
    });
    res.json({ success: true, data: result });
  })
);

router.put(
  '/clearance/:id/settlement',
  authenticateToken,
  authorize('admin', 'hr', 'finance'),
  wrap(async (req, res) => {
    const result = await service.calculateFinalSettlement(req.params.id, {
      ...req.body,
      calculatedBy: req.user?.id,
    });
    res.json({ success: true, data: result });
  })
);

router.put(
  '/clearance/:id/exit-interview',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.conductExitInterview(req.params.id, req.body);
    res.json({ success: true, data: result });
  })
);

// ────────────────────────────────────────────────────────────────────
//  5 — EXIT/RE-ENTRY VISAS  تأشيرات الخروج والعودة
// ────────────────────────────────────────────────────────────────────
router.get(
  '/exit-visas',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  wrap(async (req, res) => {
    const result = await service.listVisaRequests(req.query);
    res.json({ success: true, data: result });
  })
);

router.get(
  '/exit-visas/expiring',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.getExpiringVisas(req.query.days);
    res.json({ success: true, data: result });
  })
);

router.get(
  '/exit-visas/stats',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.getVisaStats();
    res.json({ success: true, data: result });
  })
);

router.get(
  '/exit-visas/:id',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  wrap(async (req, res) => {
    const result = await service.getVisaRequestById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    res.json({ success: true, data: result });
  })
);

router.post(
  '/exit-visas',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.createVisaRequest({ ...req.body, requestedBy: req.user?.id });
    res.status(201).json({ success: true, data: result });
  })
);

router.put(
  '/exit-visas/:id/approve',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  wrap(async (req, res) => {
    const result = await service.approveVisaRequest(req.params.id, {
      ...req.body,
      userId: req.user?.id,
    });
    res.json({ success: true, data: result });
  })
);

router.put(
  '/exit-visas/:id/issue',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.issueVisa(req.params.id, req.body);
    res.json({ success: true, data: result });
  })
);

router.put(
  '/exit-visas/:id/travel',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.recordTravel(req.params.id, req.body);
    res.json({ success: true, data: result });
  })
);

router.put(
  '/exit-visas/:id/return',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.recordReturn(req.params.id);
    res.json({ success: true, data: result });
  })
);

// ────────────────────────────────────────────────────────────────────
//  6 — BENEFITS & ALLOWANCES  المزايا والبدلات
// ────────────────────────────────────────────────────────────────────
router.get(
  '/benefit-packages',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.listBenefitPackages();
    res.json({ success: true, data: result });
  })
);

router.post(
  '/benefit-packages',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.createBenefitPackage({ ...req.body, createdBy: req.user?.id });
    res.status(201).json({ success: true, data: result });
  })
);

router.get(
  '/employee-benefits',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  wrap(async (req, res) => {
    const result = await service.listEmployeeBenefits(req.query);
    res.json({ success: true, data: result });
  })
);

router.get(
  '/employee-benefits/stats',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.getBenefitStats();
    res.json({ success: true, data: result });
  })
);

router.get(
  '/employee-benefits/:id',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  wrap(async (req, res) => {
    const result = await service.getEmployeeBenefitById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'المزايا غير موجودة' });
    res.json({ success: true, data: result });
  })
);

router.post(
  '/employee-benefits',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.assignBenefit({ ...req.body, assignedBy: req.user?.id });
    res.status(201).json({ success: true, data: result });
  })
);

router.put(
  '/employee-benefits/:id/adjust',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.adjustBenefitAllowance(req.params.id, {
      ...req.body,
      adjustedBy: req.user?.id,
    });
    res.json({ success: true, data: result });
  })
);

router.put(
  '/employee-benefits/:id/claim-ticket',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.claimAirTicket(req.params.id, req.body);
    res.json({ success: true, data: result });
  })
);

// ────────────────────────────────────────────────────────────────────
//  PHASE 3 DASHBOARD
// ────────────────────────────────────────────────────────────────────
router.get(
  '/phase3-dashboard',
  authenticateToken,
  authorize('admin', 'hr'),
  wrap(async (req, res) => {
    const result = await service.getPhase3Dashboard();
    res.json({ success: true, data: result });
  })
);

module.exports = router;
