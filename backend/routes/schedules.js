const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { ScheduleManagementService } = require('../services/scheduleManagementService');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// Initialize service
const scheduleService = new ScheduleManagementService();

// Middleware to verify service is ready
router.use((_req, res, next) => {
  if (!scheduleService) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Schedule management service not initialized',
    });
  }
  next();
});

/**
 * @route   GET /api/v1/schedules
 * @desc    Get all schedules
 * @access  Private
 */
router.get('/', authenticate, requireBranchAccess, requireBranchAccess, async (req, res) => {
  try {
    const schedules = await scheduleService.getAllSchedules(req.query);
    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules,
    });
  } catch (error) {
    safeError(res, error, 'fetching schedules');
  }
});

/**
 * @route   POST /api/v1/schedules
 * @desc    Create new schedule
 * @access  Private/Manager
 */
router.post(
  '/',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize(['manager', 'admin']),
  async (req, res) => {
    try {
      const { title, description, startDate, endDate, resourceId, type } = req.body;

      if (!title || !startDate || !resourceId) {
        return res.status(400).json({
          success: false,
          error: 'Title, startDate, and resourceId are required',
        });
      }

      const schedule = await scheduleService.createSchedule({
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        resourceId,
        type: type || 'event',
        createdBy: req.user.id,
      });

      res.status(201).json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      safeError(res, error, 'creating schedule');
    }
  }
);

/**
 * @route   GET /api/v1/schedules/resource/:resourceId
 * @desc    Get schedules for specific resource
 * @access  Private
 */
router.get(
  '/resource/:resourceId',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  async (req, res) => {
    try {
      const schedules = await scheduleService.getSchedulesByResource(req.params.resourceId);

      res.status(200).json({
        success: true,
        count: schedules.length,
        data: schedules,
      });
    } catch (error) {
      safeError(res, error, 'fetching resource schedules');
    }
  }
);

/**
 * @route   GET /api/v1/schedules/date-range
 * @desc    Get schedules within date range
 * @access  Private
 */
router.get(
  '/date-range/:startDate/:endDate',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  async (req, res) => {
    try {
      const schedules = await scheduleService.getSchedulesByDateRange(
        new Date(req.params.startDate),
        new Date(req.params.endDate)
      );

      res.status(200).json({
        success: true,
        count: schedules.length,
        data: schedules,
      });
    } catch (error) {
      safeError(res, error, 'fetching schedules by date range');
    }
  }
);

/**
 * @route   GET /api/v1/schedules/:scheduleId
 * @desc    Get specific schedule
 * @access  Private
 */
router.get(
  '/:scheduleId',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  async (req, res) => {
    try {
      const schedule = await scheduleService.getScheduleById(req.params.scheduleId);

      if (!schedule) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found',
        });
      }

      res.status(200).json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      safeError(res, error, 'fetching schedule');
    }
  }
);

/**
 * @route   PUT /api/v1/schedules/:scheduleId
 * @desc    Update schedule
 * @access  Private/Manager
 */
router.put(
  '/:scheduleId',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize(['manager', 'admin']),
  async (req, res) => {
    try {
      const schedule = await scheduleService.updateSchedule(req.params.scheduleId, req.body);

      if (!schedule) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found',
        });
      }

      res.status(200).json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      safeError(res, error, 'updating schedule');
    }
  }
);

/**
 * @route   DELETE /api/v1/schedules/:scheduleId
 * @desc    Delete schedule
 * @access  Private/Admin
 */
router.delete(
  '/:scheduleId',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize(['admin']),
  async (req, res) => {
    try {
      const result = await scheduleService.deleteSchedule(req.params.scheduleId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Schedule deleted successfully',
      });
    } catch (error) {
      safeError(res, error, 'deleting schedule');
    }
  }
);

/**
 * @route   POST /api/v1/schedules/:scheduleId/confirm
 * @desc    Confirm schedule
 * @access  Private
 */
router.post(
  '/:scheduleId/confirm',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  async (req, res) => {
    try {
      const schedule = await scheduleService.confirmSchedule(req.params.scheduleId, req.user.id);

      if (!schedule) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found',
        });
      }

      res.status(200).json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      safeError(res, error, 'confirming schedule');
    }
  }
);

// Error handling middleware
router.use((err, _req, res, _next) => {
  safeError(res, err, 'Router error');
});

module.exports = router;
