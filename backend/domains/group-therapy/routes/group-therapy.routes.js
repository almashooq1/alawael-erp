/**
 * Group Therapy Routes — مسارات API للعلاج الجماعي
 */

const express = require('express');
const router = express.Router();
// W1140 — cross-branch isolation (W269 doctrine): auto-enforce beneficiary
// ownership on every :beneficiaryId param + body-carried beneficiary ids.
const {
  branchScopedBeneficiaryParam,
  bodyScopedBeneficiaryGuard,
} = require('../../../middleware/assertBranchMatch');
router.param('beneficiaryId', branchScopedBeneficiaryParam);
router.use(bodyScopedBeneficiaryGuard);
const { groupTherapyService } = require('../services/GroupTherapyService');
const {
  validateCreateGroup,
  validateUpdateGroup,
  validateAddMember,
  validateCreateGroupSession,
  validate,
} = require('../validators/group-therapy.validator');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

// Groups
router.post(
  '/',
  validate(validateCreateGroup),
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.createGroup({
      ...req.body,
      createdBy: getUserId(req),
      branchId: req.user?.branchId || req.body.branchId,
    });
    res.status(201).json({ success: true, data });
  })
);
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.listGroups({
      status: req.query.status,
      type: req.query.type,
      branchId: req.query.branchId || req.user?.branchId,
      therapistId: req.query.therapistId,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, ...data });
  })
);
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.getDashboard(req.query.branchId || req.user?.branchId);
    res.json({ success: true, data });
  })
);
router.get(
  '/beneficiary/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.getBeneficiaryGroups(req.params.beneficiaryId);
    res.json({ success: true, data, total: data.length });
  })
);
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.getGroup(req.params.id);
    res.json({ success: true, data });
  })
);
router.put(
  '/:id',
  validate(validateUpdateGroup),
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.updateGroup(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

// Members
router.post(
  '/:id/members',
  validate(validateAddMember),
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.addMember(req.params.id, req.body);
    res.json({ success: true, data });
  })
);
router.post(
  '/:id/members/:beneficiaryId/withdraw',
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.removeMember(
      req.params.id,
      req.params.beneficiaryId,
      req.body.reason
    );
    res.json({ success: true, data });
  })
);

// Sessions
router.post(
  '/:id/sessions',
  validate(validateCreateGroupSession),
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.createGroupSession({
      ...req.body,
      groupId: req.params.id,
      branchId: req.user?.branchId || req.body.branchId,
    });
    res.status(201).json({ success: true, data });
  })
);
router.get(
  '/:id/sessions',
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.getGroupSessions(
      req.params.id,
      parseInt(req.query.limit) || 20
    );
    res.json({ success: true, data, total: data.length });
  })
);
router.get(
  '/sessions/:sessionId',
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.getSessionDetails(req.params.sessionId);
    res.json({ success: true, data });
  })
);
router.put(
  '/sessions/:sessionId/complete',
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.completeGroupSession(req.params.sessionId, req.body);
    res.json({ success: true, data });
  })
);

module.exports = router;
