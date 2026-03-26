/**
 * Employee Affairs Expanded Routes — مسارات شؤون الموظفين الموسعة
 *
 * 60+ endpoints covering:
 * ─── /complaints        — الشكاوى والتظلمات
 * ─── /loans             — السلف والقروض
 * ─── /disciplinary      — الإنذارات والإجراءات التأديبية
 * ─── /letters           — الشهادات والخطابات
 * ─── /promotions        — الترقيات والتنقلات
 * ─── /overtime          — إدارة العمل الإضافي
 * ─── /expanded-dashboard — لوحة المعلومات الموسعة
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const service = require('../services/employeeAffairs.expanded.service');
const _logger = require('../utils/logger');

// ─── Async wrapper ──────────────────────────────────────────────────────────
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ── Field whitelists ────────────────────────────────────────────── */
const COMPLAINT_FIELDS = [
  'subject',
  'description',
  'category',
  'priority',
  'department',
  'attachments',
];
const LOAN_FIELDS = [
  'amount',
  'type',
  'reason',
  'installments',
  'startDate',
  'department',
  'repaymentMethod',
];
const DISCIPLINARY_FIELDS = [
  'employeeId',
  'type',
  'severity',
  'reason',
  'description',
  'date',
  'witnesses',
];
const LETTER_FIELDS = [
  'type',
  'purpose',
  'language',
  'recipientName',
  'recipientOrganization',
  'notes',
  'department',
];
const PROMOTION_FIELDS = [
  'employeeId',
  'type',
  'fromPosition',
  'toPosition',
  'fromDepartment',
  'toDepartment',
  'effectiveDate',
  'reason',
  'notes',
];

function pick(src, fields) {
  const out = {};
  for (const f of fields) if (src[f] !== undefined) out[f] = src[f];
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// لوحة المعلومات الموسعة (MUST come before param routes)
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/expanded-dashboard',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const data = await service.getExpandedDashboard();
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// الشكاوى والتظلمات — Complaints & Grievances
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/complaints',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await service.listComplaints(req.query);
    res.json({ success: true, ...result });
  })
);

router.get(
  '/complaints/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const stats = await service.getComplaintStats();
    res.json({ success: true, data: stats });
  })
);

router.post(
  '/complaints',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const complaint = await service.createComplaint({
      ...pick(req.body, COMPLAINT_FIELDS),
      employeeId: req.body.employeeId || req.user?.id,
    });
    res.status(201).json({ success: true, data: complaint });
  })
);

router.get(
  '/complaints/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const complaint = await service.getComplaintById(req.params.id);
    res.json({ success: true, data: complaint });
  })
);

router.patch(
  '/complaints/:id/status',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  asyncHandler(async (req, res) => {
    const complaint = await service.updateComplaintStatus(req.params.id, {
      ...pick(req.body, ['status', 'resolution', 'notes']),
      performedBy: req.user?.id,
    });
    res.json({ success: true, data: complaint });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// السلف والقروض — Employee Loans & Advances
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/loans',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await service.listLoans(req.query);
    res.json({ success: true, ...result });
  })
);

router.get(
  '/loans/stats',
  authenticateToken,
  authorize('admin', 'hr', 'finance'),
  asyncHandler(async (req, res) => {
    const stats = await service.getLoanStats();
    res.json({ success: true, data: stats });
  })
);

router.post(
  '/loans',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const loan = await service.createLoan({
      ...pick(req.body, LOAN_FIELDS),
      employeeId: req.body.employeeId || req.user?.id,
    });
    res.status(201).json({ success: true, data: loan });
  })
);

router.get(
  '/loans/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const loan = await service.getLoanById(req.params.id);
    res.json({ success: true, data: loan });
  })
);

router.patch(
  '/loans/:id/approve',
  authenticateToken,
  authorize('admin', 'hr', 'finance', 'manager'),
  asyncHandler(async (req, res) => {
    const loan = await service.approveLoanStep(req.params.id, {
      ...pick(req.body, ['decision', 'notes', 'conditions']),
      approvedBy: req.user?.id,
    });
    res.json({ success: true, data: loan });
  })
);

router.patch(
  '/loans/:loanId/installments/:installmentNumber/pay',
  authenticateToken,
  authorize('admin', 'hr', 'finance'),
  asyncHandler(async (req, res) => {
    const loan = await service.recordInstallmentPayment(
      req.params.loanId,
      Number(req.params.installmentNumber)
    );
    res.json({ success: true, data: loan });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// الإنذارات والإجراءات التأديبية — Disciplinary Actions
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/disciplinary',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  asyncHandler(async (req, res) => {
    const result = await service.listDisciplinaryActions(req.query);
    res.json({ success: true, ...result });
  })
);

router.post(
  '/disciplinary',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  asyncHandler(async (req, res) => {
    const action = await service.createDisciplinaryAction({
      ...pick(req.body, DISCIPLINARY_FIELDS),
      issuedBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: action });
  })
);

router.get(
  '/disciplinary/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const action = await service.getDisciplinaryActionById(req.params.id);
    res.json({ success: true, data: action });
  })
);

router.patch(
  '/disciplinary/:id/approve',
  authenticateToken,
  authorize('admin', 'hr'),
  asyncHandler(async (req, res) => {
    const action = await service.approveDisciplinaryAction(req.params.id, {
      ...pick(req.body, ['decision', 'notes']),
      approvedBy: req.user?.id,
    });
    res.json({ success: true, data: action });
  })
);

router.post(
  '/disciplinary/:id/appeal',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const action = await service.fileAppeal(req.params.id, req.body);
    res.json({ success: true, data: action });
  })
);

router.get(
  '/disciplinary/employee/:employeeId/record',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  asyncHandler(async (req, res) => {
    const record = await service.getEmployeeDisciplinaryRecord(req.params.employeeId);
    res.json({ success: true, data: record });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// الشهادات والخطابات — Certificates & Letters
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/letters',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await service.listLetters(req.query);
    res.json({ success: true, ...result });
  })
);

router.get(
  '/letters/stats',
  authenticateToken,
  authorize('admin', 'hr'),
  asyncHandler(async (req, res) => {
    const stats = await service.getLetterStats();
    res.json({ success: true, data: stats });
  })
);

router.post(
  '/letters',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const letter = await service.createLetterRequest({
      ...pick(req.body, LETTER_FIELDS),
      employeeId: req.body.employeeId || req.user?.id,
      requestedBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: letter });
  })
);

router.get(
  '/letters/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const letter = await service.getLetterById(req.params.id);
    res.json({ success: true, data: letter });
  })
);

router.patch(
  '/letters/:id/status',
  authenticateToken,
  authorize('admin', 'hr'),
  asyncHandler(async (req, res) => {
    const letter = await service.updateLetterStatus(req.params.id, {
      ...pick(req.body, ['status', 'notes', 'content']),
      preparedBy: req.user?.id,
    });
    res.json({ success: true, data: letter });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// الترقيات والتنقلات — Promotions & Transfers
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/promotions',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await service.listPromotionTransfers(req.query);
    res.json({ success: true, ...result });
  })
);

router.post(
  '/promotions',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  asyncHandler(async (req, res) => {
    const request = await service.createPromotionTransfer({
      ...pick(req.body, PROMOTION_FIELDS),
      initiatedBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: request });
  })
);

router.get(
  '/promotions/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const request = await service.getPromotionTransferById(req.params.id);
    res.json({ success: true, data: request });
  })
);

router.patch(
  '/promotions/:id/approve',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  asyncHandler(async (req, res) => {
    const request = await service.approvePromotionTransferStep(req.params.id, {
      ...pick(req.body, ['decision', 'notes']),
      approver: req.user?.id,
    });
    res.json({ success: true, data: request });
  })
);

router.post(
  '/promotions/:id/execute',
  authenticateToken,
  authorize('admin', 'hr'),
  asyncHandler(async (req, res) => {
    const request = await service.executePromotionTransfer(
      req.params.id,
      pick(req.body, ['effectiveDate', 'notes'])
    );
    res.json({ success: true, data: request });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// إدارة العمل الإضافي — Overtime Management
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/overtime',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await service.listOvertimeRequests(req.query);
    res.json({ success: true, ...result });
  })
);

router.get(
  '/overtime/stats',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  asyncHandler(async (req, res) => {
    const stats = await service.getOvertimeStats();
    res.json({ success: true, data: stats });
  })
);

router.get(
  '/overtime/monthly-report',
  authenticateToken,
  authorize('admin', 'hr', 'finance'),
  asyncHandler(async (req, res) => {
    const { month, year } = req.query;
    const report = await service.getOvertimeMonthlyReport(
      Number(month) || new Date().getMonth() + 1,
      Number(year) || new Date().getFullYear()
    );
    res.json({ success: true, data: report });
  })
);

router.post(
  '/overtime',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const request = await service.createOvertimeRequest({
      ...pick(req.body, ['date', 'hours', 'reason', 'department', 'type']),
      employeeId: req.body.employeeId || req.user?.id,
    });
    res.status(201).json({ success: true, data: request });
  })
);

router.get(
  '/overtime/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const request = await service.getOvertimeRequestById(req.params.id);
    res.json({ success: true, data: request });
  })
);

router.patch(
  '/overtime/:id/approve',
  authenticateToken,
  authorize('admin', 'hr', 'manager'),
  asyncHandler(async (req, res) => {
    const request = await service.approveOvertimeStep(req.params.id, {
      ...req.body,
      approver: req.user?.id,
    });
    res.json({ success: true, data: request });
  })
);

module.exports = router;
