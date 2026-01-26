/**
 * Rehabilitation Routes - Advanced API Endpoints
 * مسارات خدمات التأهيل
 *
 * Comprehensive endpoints for disability assessments and rehabilitation programs
 */

const express = require('express');
const router = express.Router();
const rehabilitationService = require('../services/rehabilitation.service');
const { asyncHandler } = require('../utils/errorHandler');

// ==================== DISABILITY ASSESSMENT ENDPOINTS ====================

/**
 * POST /api/rehabilitation/assessments
 * Create new disability assessment
 */
router.post(
  '/assessments',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.createAssessment(req.body);
    res.status(201).json({
      success: result.success,
      message: result.message,
      data: result.data,
      assessment_id: result.assessment_id,
    });
  }),
);

/**
 * GET /api/rehabilitation/assessments/:assessmentId
 * Get assessment by ID
 */
router.get(
  '/assessments/:assessmentId',
  asyncHandler(async (req, res) => {
    const assessment = await rehabilitationService.getAssessment(req.params.assessmentId);
    res.json({
      success: true,
      data: assessment,
    });
  }),
);

/**
 * PUT /api/rehabilitation/assessments/:assessmentId
 * Update assessment
 */
router.put(
  '/assessments/:assessmentId',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.updateAssessment(req.params.assessmentId, req.body);
    res.json(result);
  }),
);

/**
 * GET /api/rehabilitation/assessments/type/:disabilityType
 * Get assessments by disability type
 */
router.get(
  '/assessments/type/:disabilityType',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.getAssessmentsByType(req.params.disabilityType);
    res.json(result);
  }),
);

/**
 * GET /api/rehabilitation/assessments/statistics
 * Get assessment statistics
 */
router.get(
  '/assessments/statistics',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.getAssessmentStatistics();
    res.json(result);
  }),
);

/**
 * GET /api/rehabilitation/assessments/:assessmentId/report
 * Generate comprehensive assessment report
 */
router.get(
  '/assessments/:assessmentId/report',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.generateAssessmentReport(req.params.assessmentId);
    res.json(result);
  }),
);

/**
 * GET /api/rehabilitation/assessments/:assessmentId/readiness
 * Check rehabilitation readiness
 */
router.get(
  '/assessments/:assessmentId/readiness',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.checkRehabilitationReadiness(req.params.assessmentId);
    res.json(result);
  }),
);

// ==================== REHABILITATION PROGRAM ENDPOINTS ====================

/**
 * POST /api/rehabilitation/programs
 * Create rehabilitation program
 */
router.post(
  '/programs',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.createRehabilitationProgram(req.body);
    res.status(201).json({
      success: result.success,
      message: result.message,
      data: result.data,
      program_id: result.program_id,
    });
  }),
);

/**
 * GET /api/rehabilitation/programs/:programId
 * Get rehabilitation program
 */
router.get(
  '/programs/:programId',
  asyncHandler(async (req, res) => {
    const program = await rehabilitationService.getRehabilitationProgram(req.params.programId);
    res.json({
      success: true,
      data: program,
    });
  }),
);

/**
 * POST /api/rehabilitation/programs/:programId/therapy-session
 * Add therapy session to program
 */
router.post(
  '/programs/:programId/therapy-session',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.addTherapySession(req.params.programId, req.body);
    res.json(result);
  }),
);

/**
 * PUT /api/rehabilitation/programs/:programId/goals/:goalId/progress
 * Update goal progress
 */
router.put(
  '/programs/:programId/goals/:goalId/progress',
  asyncHandler(async (req, res) => {
    const { progressPercentage } = req.body;
    const result = await rehabilitationService.updateGoalProgress(req.params.programId, req.params.goalId, progressPercentage);
    res.json(result);
  }),
);

/**
 * GET /api/rehabilitation/programs/:programId/progress-report
 * Generate progress report
 */
router.get(
  '/programs/:programId/progress-report',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.generateProgressReport(req.params.programId);
    res.json(result);
  }),
);

/**
 * GET /api/rehabilitation/programs/:programId/outcomes
 * Get program outcomes
 */
router.get(
  '/programs/:programId/outcomes',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.getProgramOutcomes(req.params.programId);
    res.json(result);
  }),
);

/**
 * POST /api/rehabilitation/programs/:programId/discharge
 * Discharge program
 */
router.post(
  '/programs/:programId/discharge',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.dischargeProgram(req.params.programId, req.body);
    res.json(result);
  }),
);

/**
 * GET /api/rehabilitation/programs/ready-for-discharge
 * Get programs ready for discharge
 */
router.get(
  '/programs/ready-for-discharge',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.getProgramsReadyForDischarge();
    res.json(result);
  }),
);

/**
 * GET /api/rehabilitation/beneficiary/:beneficiaryId/active-programs
 * Get active programs for beneficiary
 */
router.get(
  '/beneficiary/:beneficiaryId/active-programs',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.getActiveProgramsForBeneficiary(req.params.beneficiaryId);
    res.json(result);
  }),
);

/**
 * GET /api/rehabilitation/programs/:programId/therapy-session/:sessionNumber
 * Get therapy session details
 */
router.get(
  '/programs/:programId/therapy-session/:sessionNumber',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.getTherapySessionDetails(req.params.programId, parseInt(req.params.sessionNumber));
    res.json(result);
  }),
);

/**
 * GET /api/rehabilitation/programs/:programId/outcome-comparison
 * Generate outcome measurement comparison
 */
router.get(
  '/programs/:programId/outcome-comparison',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.compareOutcomeMeasures(req.params.programId);
    res.json(result);
  }),
);

// ==================== ANALYTICS ENDPOINTS ====================

/**
 * GET /api/rehabilitation/statistics
 * Get rehabilitation statistics
 */
router.get(
  '/statistics',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.getRehabilitationStatistics();
    res.json(result);
  }),
);

/**
 * GET /api/rehabilitation/programs/:programId/effectiveness-metrics
 * Get program effectiveness metrics
 */
router.get(
  '/programs/:programId/effectiveness-metrics',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.getProgramEffectivenessMetrics(req.params.programId);
    res.json(result);
  }),
);

/**
 * GET /api/rehabilitation/therapist/:therapistId/caseload
 * Get therapist caseload
 */
router.get(
  '/therapist/:therapistId/caseload',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.getTherapistCaseload(req.params.therapistId);
    res.json(result);
  }),
);

/**
 * POST /api/rehabilitation/search
 * Search assessments and programs
 */
router.post(
  '/search',
  asyncHandler(async (req, res) => {
    const result = await rehabilitationService.searchRehabilitationData(req.body);
    res.json(result);
  }),
);

/**
 * GET /api/rehabilitation/dashboard
 * Get rehabilitation dashboard summary
 */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const stats = await rehabilitationService.getRehabilitationStatistics();

    res.json({
      success: true,
      data: {
        statistics: stats.data,
        summary: {
          total_beneficiaries: stats.data.active_programs + stats.data.completed_programs,
          active_programs: stats.data.active_programs,
          ready_for_rehabilitation: stats.data.ready_for_rehabilitation,
          discharge_rate: (stats.data.completed_programs / (stats.data.active_programs + stats.data.completed_programs)) * 100,
        },
      },
    });
  }),
);

module.exports = router;

