/**
 * achievements.routes.js - Achievement & Recognition API Routes
 * Handles achievement recording, skill tracking, and activity management
 *
 * @module api/routes/beneficiary/achievements
 */

const express = require('express');
const router = express.Router();
const AchievementService = require('../../../services/BeneficiaryManagement/AchievementService');

// Middleware
const authenticate = (req, res, next) => {
  // TODO: Implement JWT authentication
  next();
};

// Initialize service
let achievementService;

router.use((req, res, next) => {
  if (!achievementService) {
    achievementService = new AchievementService(global.db);
  }
  next();
});

/**
 * @route POST /api/achievements/record
 * @description Record an achievement/certification
 * @param {string} beneficiaryId - Beneficiary ID
 * @param {Object} body - Achievement data
 * @returns {Object} Achievement record
 */
router.post('/record', authenticate, async (req, res) => {
  try {
    const { beneficiaryId } = req.body;

    if (!beneficiaryId) {
      return res.status(400).json({
        status: 'error',
        message: 'beneficiaryId is required',
        data: null,
        timestamp: new Date()
      });
    }

    const result = await achievementService.recordAchievement(beneficiaryId, req.body);
    const statusCode = result.status === 'success' ? 201 : 400;
    return res.status(statusCode).json(result);

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
      data: null,
      timestamp: new Date()
    });
  }
});

/**
 * @route POST /api/achievements/:beneficiaryId/skills/track
 * @description Track skills development
 * @param {string} beneficiaryId - Beneficiary ID
 * @param {Object} body - Skill data
 * @returns {Object} Skill record
 */
router.post('/:beneficiaryId/skills/track', authenticate, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;

    const result = await achievementService.trackSkillsDevelopment(beneficiaryId, req.body);
    const statusCode = result.status === 'success' ? 201 : 400;
    return res.status(statusCode).json(result);

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
      data: null,
      timestamp: new Date()
    });
  }
});

/**
 * @route POST /api/achievements/:beneficiaryId/activities/track
 * @description Track student involvement in activities
 * @param {string} beneficiaryId - Beneficiary ID
 * @param {Object} body - Activity data
 * @returns {Object} Activity record
 */
router.post('/:beneficiaryId/activities/track', authenticate, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;

    const result = await achievementService.trackStudentInvolvement(beneficiaryId, req.body);
    const statusCode = result.status === 'success' ? 201 : 400;
    return res.status(statusCode).json(result);

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
      data: null,
      timestamp: new Date()
    });
  }
});

/**
 * @route GET /api/achievements/:beneficiaryId/points
 * @description Get achievement points and gamification status
 * @param {string} beneficiaryId - Beneficiary ID
 * @returns {Object} Points information
 */
router.get('/:beneficiaryId/points', authenticate, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;

    const result = await achievementService.manageAchievementPoints(beneficiaryId);
    const statusCode = result.status === 'success' ? 200 : 404;
    return res.status(statusCode).json(result);

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
      data: null,
      timestamp: new Date()
    });
  }
});

/**
 * @route GET /api/achievements/:beneficiaryId/summary
 * @description Get beneficiary achievement summary
 * @param {string} beneficiaryId - Beneficiary ID
 * @returns {Object} Achievement summary
 */
router.get('/:beneficiaryId/summary', authenticate, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;

    const result = await achievementService.getBeneficiaryAchievementSummary(beneficiaryId);
    const statusCode = result.status === 'success' ? 200 : 404;
    return res.status(statusCode).json(result);

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
      data: null,
      timestamp: new Date()
    });
  }
});

/**
 * @route GET /api/achievements/health
 * @description Check service health
 * @returns {Object} Service status
 */
router.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Achievement service is healthy',
    service: 'AchievementService',
    timestamp: new Date()
  });
});

module.exports = router;
