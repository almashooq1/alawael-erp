/**
 * Clinical Research Routes — مسارات API للبحث السريري
 */

const express = require('express');
const router = express.Router();
const { researchService } = require('../services/ResearchService');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function getUserId(req) {
  return req.user?._id || req.user?.id || req.headers['x-user-id'];
}

// Create study
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = await researchService.createStudy({
      ...req.body,
      createdBy: getUserId(req),
      branchId: req.user?.branchId || req.body.branchId,
    });
    res.status(201).json({ success: true, data });
  })
);

// List studies
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await researchService.listStudies({
      status: req.query.status,
      type: req.query.type,
      piId: req.query.piId,
      keyword: req.query.keyword,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, ...result });
  })
);

// Dashboard
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const data = await researchService.getDashboard(req.query.branchId || req.user?.branchId);
    res.json({ success: true, data });
  })
);

// Get study
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = await researchService.getStudy(req.params.id);
    res.json({ success: true, data });
  })
);

// Update study
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = await researchService.updateStudy(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

// Transition status
router.put(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const data = await researchService.transitionStatus(
      req.params.id,
      req.body.status,
      getUserId(req),
      req.body.reason
    );
    res.json({ success: true, data });
  })
);

// Enroll participant
router.post(
  '/:id/participants',
  asyncHandler(async (req, res) => {
    const data = await researchService.enrollParticipant(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

// Withdraw participant
router.post(
  '/:id/participants/:beneficiaryId/withdraw',
  asyncHandler(async (req, res) => {
    const data = await researchService.withdrawParticipant(
      req.params.id,
      req.params.beneficiaryId,
      req.body.reason
    );
    res.json({ success: true, data });
  })
);

// Record consent
router.put(
  '/:id/participants/:beneficiaryId/consent',
  asyncHandler(async (req, res) => {
    const data = await researchService.recordConsent(
      req.params.id,
      req.params.beneficiaryId,
      req.body.consentStatus
    );
    res.json({ success: true, data });
  })
);

// Milestones
router.post(
  '/:id/milestones',
  asyncHandler(async (req, res) => {
    const data = await researchService.addMilestone(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

// Publications
router.post(
  '/:id/publications',
  asyncHandler(async (req, res) => {
    const data = await researchService.addPublication(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

module.exports = router;
