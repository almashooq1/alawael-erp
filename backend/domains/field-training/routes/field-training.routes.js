/**
 * Field Training Routes — مسارات API للتدريب الميداني
 */

const express = require('express');
const router = express.Router();
const { fieldTrainingService } = require('../services/FieldTrainingService');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function getUserId(req) {
  return req.user?._id || req.user?.id || req.headers['x-user-id'];
}

/* ── Programs ── */
router.post(
  '/programs',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.createProgram({
      ...req.body,
      createdBy: getUserId(req),
      branchId: req.user?.branchId || req.body.branchId,
    });
    res.status(201).json({ success: true, data });
  })
);
router.get(
  '/programs',
  asyncHandler(async (req, res) => {
    const result = await fieldTrainingService.listPrograms({
      status: req.query.status,
      type: req.query.type,
      specialty: req.query.specialty,
      supervisorId: req.query.supervisorId,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, ...result });
  })
);
router.get(
  '/programs/:id',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.getProgram(req.params.id);
    res.json({ success: true, data });
  })
);
router.put(
  '/programs/:id',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.updateProgram(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

/* ── Trainees ── */
router.post(
  '/programs/:programId/trainees',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.enrollTrainee(req.params.programId, req.body);
    res.status(201).json({ success: true, data });
  })
);
router.get(
  '/trainees',
  asyncHandler(async (req, res) => {
    const result = await fieldTrainingService.listTrainees({
      programId: req.query.programId,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, ...result });
  })
);
router.get(
  '/trainees/:id',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.getTraineeRecord(req.params.id);
    res.json({ success: true, data });
  })
);

/* ── Hours ── */
router.post(
  '/trainees/:id/hours',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.logHours(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

/* ── Evaluations ── */
router.post(
  '/trainees/:id/evaluations',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.addEvaluation(req.params.id, {
      ...req.body,
      evaluatedBy: getUserId(req),
    });
    res.json({ success: true, data });
  })
);

/* ── Supervision ── */
router.post(
  '/trainees/:id/supervision',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.addSupervisionSession(req.params.id, {
      ...req.body,
      supervisorId: getUserId(req),
    });
    res.json({ success: true, data });
  })
);

/* ── Observations ── */
router.post(
  '/trainees/:id/observations',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.addObservation(req.params.id, {
      ...req.body,
      observedBy: getUserId(req),
    });
    res.json({ success: true, data });
  })
);

/* ── Competency ── */
router.put(
  '/trainees/:id/competencies/:name',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.updateCompetency(req.params.id, req.params.name, {
      ...req.body,
      assessedBy: getUserId(req),
    });
    res.json({ success: true, data });
  })
);

/* ── Caseload ── */
router.post(
  '/trainees/:id/caseload',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.assignBeneficiary(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

/* ── Complete ── */
router.put(
  '/trainees/:id/complete',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.completeTraining(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

/* ── Dashboard ── */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.getDashboard(req.query.branchId || req.user?.branchId);
    res.json({ success: true, data });
  })
);

module.exports = router;
