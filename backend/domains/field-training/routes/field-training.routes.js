/**
 * Field Training Routes — مسارات API للتدريب الميداني
 */

const express = require('express');
const router = express.Router();
// W1160 — cross-branch isolation (W269 doctrine): file had NO guards.
//   - /programs/:id → /programs/:programId (TrainingProgram),
//     /trainees/:id* → /trainees/:traineeRecordId* (TraineeRecord) so
//     ownership hooks fire before every handler
//   - dashboard uses effectiveBranchScope (no ?branchId= spoofing)
//   - body guard covers caseload assignment (body-carried beneficiary ids)
const {
  branchScopedResourceParam,
  bodyScopedBeneficiaryGuard,
  effectiveBranchScope,
} = require('../../../middleware/assertBranchMatch');
router.param(
  'programId',
  branchScopedResourceParam({
    modelName: 'TrainingProgram',
    label: 'training program',
    loadModel: () => require('../models/TrainingProgram'),
  })
);
router.param(
  'traineeRecordId',
  branchScopedResourceParam({
    modelName: 'TraineeRecord',
    label: 'trainee record',
    loadModel: () => require('../models/TraineeRecord'),
  })
);
router.use(bodyScopedBeneficiaryGuard);
const { fieldTrainingService } = require('../services/FieldTrainingService');
const {
  validateCreateProgram,
  validateEnrollTrainee,
  validate,
} = require('../validators/field-training.validator');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function getUserId(req) {
  return req.user?._id || req.user?.id || null;
}

/* ── Programs ── */
router.post(
  '/programs',
  validate(validateCreateProgram),
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.createProgram({
      ...req.body,
      createdBy: getUserId(req),
      // W1171 — pin: restricted callers cannot spoof a foreign branch
      branchId: effectiveBranchScope(req) || req.user?.branchId || req.body.branchId,
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
  '/programs/:programId',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.getProgram(req.params.programId);
    res.json({ success: true, data });
  })
);
router.put(
  '/programs/:programId',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.updateProgram(req.params.programId, req.body);
    res.json({ success: true, data });
  })
);

/* ── Trainees ── */
router.post(
  '/programs/:programId/trainees',
  validate(validateEnrollTrainee),
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
  '/trainees/:traineeRecordId',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.getTraineeRecord(req.params.traineeRecordId);
    res.json({ success: true, data });
  })
);

/* ── Hours ── */
router.post(
  '/trainees/:traineeRecordId/hours',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.logHours(req.params.traineeRecordId, req.body);
    res.json({ success: true, data });
  })
);

/* ── Evaluations ── */
router.post(
  '/trainees/:traineeRecordId/evaluations',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.addEvaluation(req.params.traineeRecordId, {
      ...req.body,
      evaluatedBy: getUserId(req),
    });
    res.json({ success: true, data });
  })
);

/* ── Supervision ── */
router.post(
  '/trainees/:traineeRecordId/supervision',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.addSupervisionSession(req.params.traineeRecordId, {
      ...req.body,
      supervisorId: getUserId(req),
    });
    res.json({ success: true, data });
  })
);

/* ── Observations ── */
router.post(
  '/trainees/:traineeRecordId/observations',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.addObservation(req.params.traineeRecordId, {
      ...req.body,
      observedBy: getUserId(req),
    });
    res.json({ success: true, data });
  })
);

/* ── Competency ── */
router.put(
  '/trainees/:traineeRecordId/competencies/:name',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.updateCompetency(
      req.params.traineeRecordId,
      req.params.name,
      {
        ...req.body,
        assessedBy: getUserId(req),
      }
    );
    res.json({ success: true, data });
  })
);

/* ── Caseload ── */
router.post(
  '/trainees/:traineeRecordId/caseload',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.assignBeneficiary(req.params.traineeRecordId, req.body);
    res.json({ success: true, data });
  })
);

/* ── Complete ── */
router.put(
  '/trainees/:traineeRecordId/complete',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.completeTraining(req.params.traineeRecordId, req.body);
    res.json({ success: true, data });
  })
);

/* ── Dashboard ── */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const data = await fieldTrainingService.getDashboard(
      effectiveBranchScope(req) || req.user?.branchId
    );
    res.json({ success: true, data });
  })
);

module.exports = router;
