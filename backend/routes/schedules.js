const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { authenticate, authorize } = require('../middleware/auth');
const { ScheduleManagementService } = require('../services/scheduleManagementService');
const logger = require('../utils/logger');

// Initialize service
const scheduleService = new ScheduleManagementService();

// Middleware to verify service is ready
router.use((req, res, next) => {
  if (!scheduleService) {
    return res.status(503).json({ 
      error: 'Service unavailable',
      message: 'Schedule management service not initialized'
    });
  }
  next();
});

/**
 * @route   GET /api/v1/schedules
 * @desc    Get all schedules
 * @access  Private
 */
router.get('/',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const schedules = await scheduleService.getAllSchedules(req.query);
      res.status(200).json({
        success: true,
        count: schedules.length,
        data: schedules
      });
    } catch (error) {
      logger.error('Error fetching schedules:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch schedules'
      });
    }
  })
);

/**
 * @route   POST /api/v1/schedules
 * @desc    Create new schedule
 * @access  Private/Manager
 */
router.post('/',
  authenticate,
  authorize(['manager', 'admin']),
  asyncHandler(async (req, res) => {
    try {
      const { title, description, startDate, endDate, resourceId, type } = req.body;

      if (!title || !startDate || !resourceId) {
        return res.status(400).json({
          success: false,
          error: 'Title, startDate, and resourceId are required'
        });
      }

      const schedule = await scheduleService.createSchedule({
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        resourceId,
        type: type || 'event',
        createdBy: req.user.id
      });

      res.status(201).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      logger.error('Error creating schedule:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create schedule'
      });
    }
  })
);

/**
 * @route   GET /api/v1/schedules/:scheduleId
 * @desc    Get specific schedule
 * @access  Private
 */
router.get('/:scheduleId',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const schedule = await scheduleService.getScheduleById(req.params.scheduleId);
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found'
        });
      }

      res.status(200).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      logger.error('Error fetching schedule:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch schedule'
      });
    }
  })
);

/**
 * @route   PUT /api/v1/schedules/:scheduleId
 * @desc    Update schedule
 * @access  Private/Manager
 */
router.put('/:scheduleId',
  authenticate,
  authorize(['manager', 'admin']),
  asyncHandler(async (req, res) => {
    try {
      const schedule = await scheduleService.updateSchedule(
        req.params.scheduleId,
        req.body
      );

      if (!schedule) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found'
        });
      }

      res.status(200).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      logger.error('Error updating schedule:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update schedule'
      });
    }
  })
);

/**
 * @route   DELETE /api/v1/schedules/:scheduleId
 * @desc    Delete schedule
 * @access  Private/Admin
 */
router.delete('/:scheduleId',
  authenticate,
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    try {
      const result = await scheduleService.deleteSchedule(req.params.scheduleId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Schedule deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting schedule:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete schedule'
      });
    }
  })
);

/**
 * @route   GET /api/v1/schedules/resource/:resourceId
 * @desc    Get schedules for specific resource
 * @access  Private
 */
router.get('/resource/:resourceId',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const schedules = await scheduleService.getSchedulesByResource(req.params.resourceId);
      
      res.status(200).json({
        success: true,
        count: schedules.length,
        data: schedules
      });
    } catch (error) {
      logger.error('Error fetching resource schedules:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch schedules'
      });
    }
  })
);

/**
 * @route   GET /api/v1/schedules/date-range
 * @desc    Get schedules within date range
 * @access  Private
 */
router.get('/date-range/:startDate/:endDate',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const schedules = await scheduleService.getSchedulesByDateRange(
        new Date(req.params.startDate),
        new Date(req.params.endDate)
      );
      
      res.status(200).json({
        success: true,
        count: schedules.length,
        data: schedules
      });
    } catch (error) {
      logger.error('Error fetching schedules by date range:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch schedules'
      });
    }
  })
);

/**
 * @route   POST /api/v1/schedules/:scheduleId/confirm
 * @desc    Confirm schedule
 * @access  Private
 */
router.post('/:scheduleId/confirm',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const schedule = await scheduleService.confirmSchedule(
        req.params.scheduleId,
        req.user.id
      );

      if (!schedule) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found'
        });
      }

      res.status(200).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      logger.error('Error confirming schedule:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to confirm schedule'
      });
    }
  })
);

// Error handling middleware
router.use((err, req, res, next) => {
  logger.error('Router error:', err);
  res.status(500).json({
    success: false,
    error: 'An unexpected error occurred',
    message: err.message
  });
});

module.exports = router;
