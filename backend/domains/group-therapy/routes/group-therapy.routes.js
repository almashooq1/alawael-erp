/**
 * Group Therapy Routes — مسارات API للعلاج الجماعي
 */

const express = require('express');
const router = express.Router();
const { groupTherapyService } = require('../services/GroupTherapyService');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function getUserId(req) {
  return req.user?._id || req.user?.id || req.headers['x-user-id'];
}

// Groups
router.post(
  '/',
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
  asyncHandler(async (req, res) => {
    const data = await groupTherapyService.updateGroup(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

// Members
router.post(
  '/:id/members',
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
