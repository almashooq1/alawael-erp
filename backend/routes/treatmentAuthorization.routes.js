/**
 * مسارات إذن العلاج / الموافقة المسبقة
 * Treatment Authorization Routes
 */

const express = require('express');
const router = express.Router();
const TreatmentAuthorizationService = require('../services/treatmentAuthorization.service');
const { authenticateToken, authorize } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const AUTH_ROLES = [
  'admin',
  'center_manager',
  'doctor',
  'therapist',
  'insurance_officer',
  'hr_manager',
  'social_worker',
];

// إنشاء طلب إذن علاج
router.post(
  '/',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(AUTH_ROLES),
  asyncHandler(async (req, res) => {
    const request = await TreatmentAuthorizationService.createRequest(
      req.body,
      req.user.id || req.user._id
    );
    res.status(201).json({ success: true, data: request });
  })
);

// جلب الطلبات
router.get(
  '/',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(AUTH_ROLES),
  asyncHandler(async (req, res) => {
    const result = await TreatmentAuthorizationService.getRequests(req.query);
    res.json({ success: true, data: result });
  })
);

// لوحة المعلومات
router.get(
  '/dashboard',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(AUTH_ROLES),
  asyncHandler(async (req, res) => {
    const data = await TreatmentAuthorizationService.getDashboard(req.query.branch);
    res.json({ success: true, data });
  })
);

// الطلبات القريبة من الانتهاء
router.get(
  '/expiring',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(AUTH_ROLES),
  asyncHandler(async (req, res) => {
    const data = await TreatmentAuthorizationService.checkExpiring();
    res.json({ success: true, data });
  })
);

// جلب طلب واحد
router.get(
  '/:id',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(AUTH_ROLES),
  asyncHandler(async (req, res) => {
    const request = await TreatmentAuthorizationService.getRequestById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    res.json({ success: true, data: request });
  })
);

// تحديث طلب
router.put(
  '/:id',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(AUTH_ROLES),
  asyncHandler(async (req, res) => {
    const request = await TreatmentAuthorizationService.updateRequest(
      req.params.id,
      req.body,
      req.user.id || req.user._id
    );
    res.json({ success: true, data: request });
  })
);

// تقديم للمراجعة الداخلية
router.post(
  '/:id/submit-review',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(AUTH_ROLES),
  asyncHandler(async (req, res) => {
    const request = await TreatmentAuthorizationService.submitForReview(
      req.params.id,
      req.user.id || req.user._id
    );
    res.json({ success: true, data: request });
  })
);

// تقديم لشركة التأمين
router.post(
  '/:id/submit-insurer',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'center_manager', 'insurance_officer']),
  asyncHandler(async (req, res) => {
    const request = await TreatmentAuthorizationService.submitToInsurer(
      req.params.id,
      req.user.id || req.user._id
    );
    res.json({ success: true, data: request });
  })
);

// تسجيل رد شركة التأمين
router.post(
  '/:id/insurer-response',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'center_manager', 'insurance_officer']),
  asyncHandler(async (req, res) => {
    const request = await TreatmentAuthorizationService.recordInsurerResponse(
      req.params.id,
      req.body,
      req.user.id || req.user._id
    );
    res.json({ success: true, data: request });
  })
);

// تقديم استئناف
router.post(
  '/:id/appeal',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(AUTH_ROLES),
  asyncHandler(async (req, res) => {
    const request = await TreatmentAuthorizationService.submitAppeal(
      req.params.id,
      req.body,
      req.user.id || req.user._id
    );
    res.json({ success: true, data: request });
  })
);

// نتيجة الاستئناف
router.post(
  '/:id/appeal-decision',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'center_manager', 'insurance_officer']),
  asyncHandler(async (req, res) => {
    const { decision, notes } = req.body;
    const request = await TreatmentAuthorizationService.recordAppealDecision(
      req.params.id,
      decision,
      notes,
      req.user.id || req.user._id
    );
    res.json({ success: true, data: request });
  })
);

// تسجيل استخدام جلسة
router.post(
  '/:id/sessions/:serviceCode',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(AUTH_ROLES),
  asyncHandler(async (req, res) => {
    const request = await TreatmentAuthorizationService.recordSessionUsage(
      req.params.id,
      req.params.serviceCode,
      req.body,
      req.user.id || req.user._id
    );
    res.json({ success: true, data: request });
  })
);

// إضافة متابعة
router.post(
  '/:id/follow-ups',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorize(AUTH_ROLES),
  asyncHandler(async (req, res) => {
    const request = await TreatmentAuthorizationService.addFollowUp(
      req.params.id,
      req.body,
      req.user.id || req.user._id
    );
    res.json({ success: true, data: request });
  })
);

module.exports = router;
