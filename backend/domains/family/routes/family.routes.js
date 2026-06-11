/**
 * Family Routes — مسارات API للتواصل الأسري وبوابة أولياء الأمور
 *
 * @module domains/family/routes/family.routes
 */

const express = require('express');
const router = express.Router();
// W1140 — cross-branch isolation (W269 doctrine): auto-enforce beneficiary
// ownership on every :beneficiaryId param + body-carried beneficiary ids.
// W1168 — requireBranchAccess populates req.branchScope BEFORE the guards
// below (without it every assertBranchMatch helper silently no-ops) +
// effectiveBranchScope pins branchId reads against query/body spoofing.
const {
  branchScopedBeneficiaryParam,
  bodyScopedBeneficiaryGuard,
  effectiveBranchScope,
  branchScopedResourceParam,
} = require('../../../middleware/assertBranchMatch');
const { requireBranchAccess } = require('../../../middleware/branchScope.middleware');
router.use(requireBranchAccess); // W1168 — must run before the param/body guards
router.param('beneficiaryId', branchScopedBeneficiaryParam);
// W1175 — resource ownership: restricted callers cannot touch a foreign-branch
// FamilyMember (update / consents) or FamilyCommunication (follow-ups /
// homework). :consentId and :homeworkId are sub-documents of the hooked
// parents — covered transitively.
router.param(
  'memberId',
  branchScopedResourceParam({
    modelName: 'FamilyMember',
    label: 'فرد أسرة',
    loadModel: () => require('../models/FamilyMember'),
  })
);
router.param(
  'commId',
  branchScopedResourceParam({
    modelName: 'FamilyCommunication',
    label: 'تواصل أسري',
    loadModel: () => require('../models/FamilyCommunication'),
  })
);
router.use(bodyScopedBeneficiaryGuard);
const { familyService } = require('../services/FamilyService');
const {
  validateAddFamilyMember,
  validateUpdateFamilyMember,
  validateLogCommunication,
  validateAssignHomework,
  validateUpdateHomeworkStatus,
  validate,
} = require('../validators/family.validator');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Family Members
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /members — إضافة فرد أسرة */
router.post(
  '/members',
  validate(validateAddFamilyMember),
  asyncHandler(async (req, res) => {
    const data = await familyService.addFamilyMember({
      ...req.body,
      branchId: effectiveBranchScope(req) || req.user?.branchId || req.body.branchId,
      organizationId: req.user?.organizationId || req.body.organizationId,
    });
    res.status(201).json({ success: true, data });
  })
);

/** GET /members/:beneficiaryId — أفراد أسرة مستفيد */
router.get(
  '/members/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const data = await familyService.getFamilyMembers(req.params.beneficiaryId);
    res.json({ success: true, data, total: data.length });
  })
);

/** PUT /members/:memberId — تحديث بيانات فرد أسرة */
// W1175 — renamed :id → :memberId (URL shape unchanged) so the FamilyMember
// ownership hook fires.
router.put(
  '/members/:memberId',
  validate(validateUpdateFamilyMember),
  asyncHandler(async (req, res) => {
    const data = await familyService.updateFamilyMember(req.params.memberId, req.body);
    res.json({ success: true, data });
  })
);

/** GET /members/:beneficiaryId/primary — جهة الاتصال الرئيسية */
router.get(
  '/members/:beneficiaryId/primary',
  asyncHandler(async (req, res) => {
    const data = await familyService.getPrimaryContact(req.params.beneficiaryId);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Consents
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /consents/:memberId — إضافة موافقة */
router.post(
  '/consents/:memberId',
  asyncHandler(async (req, res) => {
    const data = await familyService.addConsent(req.params.memberId, req.body);
    res.json({ success: true, data });
  })
);

/** POST /consents/:memberId/revoke/:consentId — إلغاء موافقة */
router.post(
  '/consents/:memberId/revoke/:consentId',
  asyncHandler(async (req, res) => {
    const data = await familyService.revokeConsent(req.params.memberId, req.params.consentId);
    res.json({ success: true, data });
  })
);

/** GET /consents/:beneficiaryId — الموافقات النشطة */
router.get(
  '/consents/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const data = await familyService.getActiveConsents(req.params.beneficiaryId);
    res.json({ success: true, data, total: data.length });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Communications
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /communications — تسجيل تواصل */
router.post(
  '/communications',
  validate(validateLogCommunication),
  asyncHandler(async (req, res) => {
    const data = await familyService.logCommunication({
      ...req.body,
      staffId: getUserId(req),
      branchId: effectiveBranchScope(req) || req.user?.branchId || req.body.branchId,
      organizationId: req.user?.organizationId || req.body.organizationId,
    });
    res.status(201).json({ success: true, data });
  })
);

/** GET /communications/:beneficiaryId — سجل التواصل */
router.get(
  '/communications/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const data = await familyService.getCommunicationHistory(req.params.beneficiaryId, {
      type: req.query.type,
      limit: parseInt(req.query.limit) || 30,
    });
    res.json({ success: true, data, total: data.length });
  })
);

/** GET /follow-ups — المتابعات المعلّقة */
router.get(
  '/follow-ups',
  asyncHandler(async (req, res) => {
    const data = await familyService.getPendingFollowUps({
      staffId: req.query.staffId || getUserId(req),
      branchId: effectiveBranchScope(req) || req.query.branchId || req.user?.branchId,
      limit: parseInt(req.query.limit) || 50,
    });
    res.json({ success: true, data, total: data.length });
  })
);

/** POST /follow-ups/:commId/complete — إتمام متابعة */
// W1175 — renamed :id → :commId (follow-ups live on FamilyCommunication; the
// ownership hook fires; URL shape unchanged).
router.post(
  '/follow-ups/:commId/complete',
  asyncHandler(async (req, res) => {
    const data = await familyService.completeFollowUp(
      req.params.commId,
      getUserId(req),
      req.body.note
    );
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Homework
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /homework — تكليف واجب منزلي */
router.post(
  '/homework',
  validate(validateAssignHomework),
  asyncHandler(async (req, res) => {
    const data = await familyService.assignHomework({
      ...req.body,
      staffId: getUserId(req),
      branchId: effectiveBranchScope(req) || req.user?.branchId || req.body.branchId,
    });
    res.status(201).json({ success: true, data });
  })
);

/** GET /homework/:beneficiaryId — الواجبات المعلقة */
router.get(
  '/homework/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const data = await familyService.getPendingHomework(req.params.beneficiaryId);
    res.json({ success: true, data, total: data.length });
  })
);

/** PUT /homework/:commId/:homeworkId — تحديث حالة واجب */
router.put(
  '/homework/:commId/:homeworkId',
  validate(validateUpdateHomeworkStatus),
  asyncHandler(async (req, res) => {
    const data = await familyService.updateHomeworkStatus(
      req.params.commId,
      req.params.homeworkId,
      req.body.status,
      req.body.feedback
    );
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Family Portal
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /portal/:beneficiaryId — بيانات بوابة الأسرة */
router.get(
  '/portal/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const data = await familyService.getFamilyPortalData(
      req.params.beneficiaryId,
      req.query.familyMemberId
    );
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /dashboard — لوحة تحكم التواصل الأسري */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const data = await familyService.getDashboard(
      effectiveBranchScope(req) || req.query.branchId || req.user?.branchId
    );
    res.json({ success: true, data });
  })
);

module.exports = router;
