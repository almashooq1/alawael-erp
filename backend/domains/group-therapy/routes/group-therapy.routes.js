/**
 * Group Therapy Routes — مسارات API للعلاج الجماعي
 */

const express = require('express');
const router = express.Router();
// W1140 — cross-branch isolation (W269 doctrine): auto-enforce beneficiary
// ownership on every :beneficiaryId param + body-carried beneficiary ids.
// W1157 — close the group/session-keyed :id gap + list scoping:
//   - /:id → /:groupId (TherapyGroup), /sessions/:sessionId →
//     /sessions/:groupSessionId (GroupSession) so ownership hooks fire first
//   - list/dashboard use effectiveBranchScope (no ?branchId= spoofing)
const {
  branchScopedBeneficiaryParam,
  branchScopedResourceParam,
  bodyScopedBeneficiaryGuard,
  effectiveBranchScope,
} = require('../../../middleware/assertBranchMatch');
router.param('beneficiaryId', branchScopedBeneficiaryParam);
router.param(
  'groupId',
  branchScopedResourceParam({
    modelName: 'TherapyGroup',
    label: 'therapy group',
    loadModel: () => require('../models/TherapyGroup'),
  })
);
router.param(
  'groupSessionId',
  branchScopedResourceParam({
    modelName: 'GroupSession',
    label: 'group session',
    loadModel: () => require('../models/GroupSession'),
  })
);
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

// W1579 — server-owned fields a client must NOT self-set. The validators only
// enum-check — they do NOT whitelist. Critically, bodyScopedBeneficiaryGuard checks the
// TOP-LEVEL body.beneficiaryId only, so a create/update body carrying a members[] /
// memberAttendance[] array of foreign-branch beneficiaryIds would INJECT cross-branch
// members bypassing the guard. Membership flows through the guarded addMember endpoint;
// attendance through the /complete endpoint. Strip both arrays + audit/computed/lifecycle.
const GROUP_SERVER_FIELDS = ['_id', 'branchId', 'createdBy', 'isDeleted', 'currentSize', 'members'];
const SESSION_SERVER_FIELDS = ['_id', 'branchId', 'isDeleted', 'status', 'memberAttendance'];
function stripFields(body, fields) {
  const clean = {};
  for (const k of Object.keys(body || {})) {
    if (!fields.includes(k)) clean[k] = body[k];
  }
  return clean;
}

// Groups
router.post(
  '/',
  validate(validateCreateGroup),
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.createGroup({
      ...stripFields(req.body, GROUP_SERVER_FIELDS),
      createdBy: getUserId(req),
      // W1171 — pin: restricted callers cannot spoof a foreign branch
      branchId: effectiveBranchScope(req) || req.user?.branchId || req.body.branchId,
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
      // W1157 — restricted callers are pinned to their own branch
      branchId: effectiveBranchScope(req) || req.user?.branchId,
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
    // W1157 — effectiveBranchScope ignores ?branchId= spoofing for restricted callers
    const data = await groupTherapyService.getDashboard(
      effectiveBranchScope(req) || req.user?.branchId
    );
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
  '/:groupId',
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.getGroup(req.params.groupId);
    res.json({ success: true, data });
  })
);
router.put(
  '/:groupId',
  validate(validateUpdateGroup),
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.updateGroup(
      req.params.groupId,
      stripFields(req.body, GROUP_SERVER_FIELDS)
    );
    res.json({ success: true, data });
  })
);

// Members
router.post(
  '/:groupId/members',
  validate(validateAddMember),
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.addMember(req.params.groupId, req.body);
    res.json({ success: true, data });
  })
);
router.post(
  '/:groupId/members/:beneficiaryId/withdraw',
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.removeMember(
      req.params.groupId,
      req.params.beneficiaryId,
      req.body.reason
    );
    res.json({ success: true, data });
  })
);

// Sessions
router.post(
  '/:groupId/sessions',
  validate(validateCreateGroupSession),
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.createGroupSession({
      ...stripFields(req.body, SESSION_SERVER_FIELDS),
      groupId: req.params.groupId,
      // W1171 — pin: restricted callers cannot spoof a foreign branch
      branchId: effectiveBranchScope(req) || req.user?.branchId || req.body.branchId,
    });
    res.status(201).json({ success: true, data });
  })
);
router.get(
  '/:groupId/sessions',
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.getGroupSessions(
      req.params.groupId,
      parseInt(req.query.limit) || 20
    );
    res.json({ success: true, data, total: data.length });
  })
);
router.get(
  '/sessions/:groupSessionId',
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.getSessionDetails(req.params.groupSessionId);
    res.json({ success: true, data });
  })
);
router.put(
  '/sessions/:groupSessionId/complete',
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.completeGroupSession(
      req.params.groupSessionId,
      req.body
    );
    res.json({ success: true, data });
  })
);

module.exports = router;
