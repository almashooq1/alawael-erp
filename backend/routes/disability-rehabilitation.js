const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { _validateRequest } = require('../middleware/validation');
const { DisabilityRehabilitationService } = require('../services/disabilityRehabilitationService');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// Initialize service
const disabilityService = new DisabilityRehabilitationService();

// Middleware to verify service is ready
router.use((_req, res, next) => {
  if (!disabilityService) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Disability rehabilitation service not initialized',
    });
  }
  next();
});

// Authenticate all routes
router.use(authenticate);

/**
 * @route   GET /api/v1/disability-rehabilitation/programs
 * @desc    Get all rehabilitation programs
 * @access  Private
 */
router.get(
  '/programs',
  async (req, res) => {
    try {
      const programs = await disabilityService.getAllPrograms(req.query);
      res.status(200).json({
        success: true,
        count: programs.length,
        data: programs,
      });
    } catch (error) {
      safeError(res, error, 'fetching programs');
    }
  }
);

/**
 * @route   POST /api/v1/disability-rehabilitation/programs
 * @desc    Create new rehabilitation program
 * @access  Private/Admin
 */
router.post(
  '/programs',
  authorize(['admin']),
  async (req, res) => {
    try {
      const { name, description, duration, targetAudience, objectives } = req.body;

      if (!name || !description) {
        return res.status(400).json({
          success: false,
          error: 'Name and description are required',
        });
      }

      const program = await disabilityService.createProgram({
        name,
        description,
        duration,
        targetAudience,
        objectives,
        createdBy: req.user.id,
      });

      res.status(201).json({
        success: true,
        data: program,
      });
    } catch (error) {
      safeError(res, error, 'creating program');
    }
  }
);

/**
 * @route   GET /api/v1/disability-rehabilitation/programs/:programId
 * @desc    Get specific rehabilitation program
 * @access  Public
 */
router.get(
  '/programs/:programId',
  async (req, res) => {
    try {
      const program = await disabilityService.getProgramById(req.params.programId);

      if (!program) {
        return res.status(404).json({
          success: false,
          error: 'Program not found',
        });
      }

      res.status(200).json({
        success: true,
        data: program,
      });
    } catch (error) {
      safeError(res, error, 'fetching program');
    }
  }
);

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:programId
 * @desc    Update rehabilitation program
 * @access  Private/Admin
 */
router.put(
  '/programs/:programId',
  authorize(['admin']),
  async (req, res) => {
    try {
      const program = await disabilityService.updateProgram(req.params.programId, req.body);

      if (!program) {
        return res.status(404).json({
          success: false,
          error: 'Program not found',
        });
      }

      res.status(200).json({
        success: true,
        data: program,
      });
    } catch (error) {
      safeError(res, error, 'updating program');
    }
  }
);

/**
 * @route   DELETE /api/v1/disability-rehabilitation/programs/:programId
 * @desc    Delete rehabilitation program
 * @access  Private/Admin
 */
router.delete(
  '/programs/:programId',
  authorize(['admin']),
  async (req, res) => {
    try {
      const result = await disabilityService.deleteProgram(req.params.programId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Program not found',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Program deleted successfully',
      });
    } catch (error) {
      safeError(res, error, 'deleting program');
    }
  }
);

/**
 * @route   POST /api/v1/disability-rehabilitation/sessions
 * @desc    Create rehabilitation session
 * @access  Private/Therapist
 */
router.post(
  '/sessions',
  authorize(['admin', 'therapist']),
  async (req, res) => {
    try {
      const { programId, beneficiaryId, duration, sessionDate, notes } = req.body;

      if (!programId || !beneficiaryId || !sessionDate) {
        return res.status(400).json({
          success: false,
          error: 'Program ID, beneficiary ID, and session date are required',
        });
      }

      const session = await disabilityService.createSession({
        programId,
        beneficiaryId,
        duration,
        sessionDate,
        notes,
        therapistId: req.user.id,
      });

      res.status(201).json({
        success: true,
        data: session,
      });
    } catch (error) {
      safeError(res, error, 'creating session');
    }
  }
);

/**
 * @route   GET /api/v1/disability-rehabilitation/sessions
 * @desc    Get all rehabilitation sessions
 * @access  Private
 */
router.get(
  '/sessions',
  async (req, res) => {
    try {
      const sessions = await disabilityService.getAllSessions(req.query);

      res.status(200).json({
        success: true,
        count: sessions.length,
        data: sessions,
      });
    } catch (error) {
      safeError(res, error, 'fetching sessions');
    }
  }
);

/**
 * @route   GET /api/v1/disability-rehabilitation/sessions/:sessionId
 * @desc    Get specific rehabilitation session
 * @access  Private
 */
router.get(
  '/sessions/:sessionId',
  async (req, res) => {
    try {
      const session = await disabilityService.getSessionById(req.params.sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
        });
      }

      res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error) {
      safeError(res, error, 'fetching session');
    }
  }
);

/**
 * @route   PUT /api/v1/disability-rehabilitation/sessions/:sessionId
 * @desc    Update rehabilitation session
 * @access  Private/Therapist
 */
router.put(
  '/sessions/:sessionId',
  authorize(['admin', 'therapist']),
  async (req, res) => {
    try {
      const session = await disabilityService.updateSession(req.params.sessionId, req.body);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
        });
      }

      res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error) {
      safeError(res, error, 'updating session');
    }
  }
);

/**
 * @route   POST /api/v1/disability-rehabilitation/goals
 * @desc    Create rehabilitation goal
 * @access  Private/Therapist
 */
router.post(
  '/goals',
  authorize(['admin', 'therapist']),
  async (req, res) => {
    try {
      const { beneficiaryId, description, targetDate, category, priority } = req.body;

      if (!beneficiaryId || !description) {
        return res.status(400).json({
          success: false,
          error: 'Beneficiary ID and description are required',
        });
      }

      const goal = await disabilityService.createGoal({
        beneficiaryId,
        description,
        targetDate,
        category,
        priority: priority || 'medium',
        createdBy: req.user.id,
      });

      res.status(201).json({
        success: true,
        data: goal,
      });
    } catch (error) {
      safeError(res, error, 'creating goal');
    }
  }
);

/**
 * @route   GET /api/v1/disability-rehabilitation/goals/:goalId
 * @desc    Get specific rehabilitation goal
 * @access  Private
 */
router.get(
  '/goals/:goalId',
  async (req, res) => {
    try {
      const goal = await disabilityService.getGoalById(req.params.goalId);

      if (!goal) {
        return res.status(404).json({
          success: false,
          error: 'Goal not found',
        });
      }

      res.status(200).json({
        success: true,
        data: goal,
      });
    } catch (error) {
      safeError(res, error, 'fetching goal');
    }
  }
);

/**
 * @route   POST /api/v1/disability-rehabilitation/assessments
 * @desc    Create rehabilitation assessment
 * @access  Private/Therapist
 */
router.post(
  '/assessments',
  authorize(['admin', 'therapist']),
  async (req, res) => {
    try {
      const { beneficiaryId, programId, results, notes, assessmentDate } = req.body;

      if (!beneficiaryId || !programId || !assessmentDate) {
        return res.status(400).json({
          success: false,
          error: 'Beneficiary ID, program ID, and assessment date are required',
        });
      }

      const assessment = await disabilityService.createAssessment({
        beneficiaryId,
        programId,
        results,
        notes,
        assessmentDate,
        assessedBy: req.user.id,
      });

      res.status(201).json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      safeError(res, error, 'creating assessment');
    }
  }
);

/**
 * @route   GET /api/v1/disability-rehabilitation/assessments/:assessmentId
 * @desc    Get specific rehabilitation assessment
 * @access  Private
 */
router.get(
  '/assessments/:assessmentId',
  async (req, res) => {
    try {
      const assessment = await disabilityService.getAssessmentById(req.params.assessmentId);

      if (!assessment) {
        return res.status(404).json({
          success: false,
          error: 'Assessment not found',
        });
      }

      res.status(200).json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      safeError(res, error, 'fetching assessment');
    }
  }
);

/**
 * @route   GET /api/v1/disability-rehabilitation/performance/:beneficiaryId
 * @desc    Get beneficiary performance and progress
 * @access  Private
 */
router.get(
  '/performance/:beneficiaryId',
  async (req, res) => {
    try {
      const performance = await disabilityService.getBeneficiaryPerformance(
        req.params.beneficiaryId
      );

      if (!performance) {
        return res.status(404).json({
          success: false,
          error: 'Beneficiary not found',
        });
      }

      res.status(200).json({
        success: true,
        data: performance,
      });
    } catch (error) {
      safeError(res, error, 'fetching performance');
    }
  }
);

// Error handling middleware
router.use((err, _req, res, _next) => {
  safeError(res, error, 'Router error');

module.exports = router;
