/**
 * Rehabilitation Routes
 * مسارات API لنظام التأهيل والعلاج
 *
 * @module routes/rehabilitation
 * @description API Endpoints لإدارة برامج التأهيل
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const rehabilitationService = require('../services/rehabilitation.service');
const { authenticateToken, _authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/errorHandler').asyncHandler;

/**
 * Create a rehabilitation assessment
 * @route POST /api/rehabilitation/assessments
 */
router.post(
  '/assessments',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const assessment = await rehabilitationService.createAssessment(req.body);
    res.status(201).json({
      success: true,
      data: assessment,
      message: 'Assessment created successfully',
    });
  })
);

/**
 * Get rehabilitation assessment
 * @route GET /api/rehabilitation/assessments/:id
 */
router.get(
  '/assessments/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const assessment = await rehabilitationService.getAssessment(req.params.id);
    res.json({
      success: true,
      data: assessment,
      message: 'Assessment retrieved successfully',
    });
  })
);

/**
 * Update rehabilitation assessment
 * @route PUT /api/rehabilitation/assessments/:id
 */
router.put(
  '/assessments/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const assessment = await rehabilitationService.updateAssessment(req.params.id, req.body);
    res.json({
      success: true,
      data: assessment,
      message: 'Assessment updated successfully',
    });
  })
);

/**
 * Create a rehabilitation plan
 * @route POST /api/rehabilitation/plans
 */
router.post(
  '/plans',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const plan = await rehabilitationService.createPlan(req.body);
    res.status(201).json({
      success: true,
      data: plan,
      message: 'Plan created successfully',
    });
  })
);

module.exports = router;
