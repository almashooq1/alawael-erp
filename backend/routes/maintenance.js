const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { authenticate, authorize } = require('../middleware/auth');
const { MaintenanceService } = require('../services/maintenanceService');
const logger = require('../utils/logger');

// Initialize service
const maintenanceService = new MaintenanceService();

// Middleware to verify service is ready
router.use((req, res, next) => {
  if (!maintenanceService) {
    return res.status(503).json({ 
      error: 'Service unavailable',
      message: 'Maintenance service not initialized'
    });
  }
  next();
});

/**
 * @route   GET /api/v1/maintenance/schedules
 * @desc    Get all maintenance schedules
 * @access  Private
 */
router.get('/schedules',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const schedules = await maintenanceService.getAllSchedules(req.query);
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
 * @route   POST /api/v1/maintenance/schedules
 * @desc    Create maintenance schedule
 * @access  Private/Manager
 */
router.post('/schedules',
  asyncHandler(async (req, res) => {
    try {
      const { vehicleId, maintenanceType, scheduledDate, estimatedDuration, description } = req.body;

      if (!vehicleId || !maintenanceType || !scheduledDate) {
        return res.status(400).json({
          success: false,
          error: 'Vehicle ID, maintenance type, and scheduled date are required'
        });
      }

      const schedule = await maintenanceService.createSchedule({
        vehicleId,
        maintenanceType,
        scheduledDate,
        estimatedDuration,
        description,
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
 * @route   GET /api/v1/maintenance/schedules/:scheduleId
 * @desc    Get specific maintenance schedule
 * @access  Private
 */
router.get('/schedules/:scheduleId',
  asyncHandler(async (req, res) => {
    try {
      const schedule = await maintenanceService.getScheduleById(req.params.scheduleId);
      
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
 * @route   PUT /api/v1/maintenance/schedules/:scheduleId
 * @desc    Update maintenance schedule
 * @access  Private/Manager
 */
router.put('/schedules/:scheduleId',
  asyncHandler(async (req, res) => {
    try {
      const schedule = await maintenanceService.updateSchedule(
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
 * @route   DELETE /api/v1/maintenance/schedules/:scheduleId
 * @desc    Delete maintenance schedule
 * @access  Private/Admin
 */
router.delete('/schedules/:scheduleId',
  asyncHandler(async (req, res) => {
    try {
      const result = await maintenanceService.deleteSchedule(req.params.scheduleId);

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
 * @route   GET /api/v1/maintenance/predict/:vehicleId
 * @desc    Predict next maintenance for vehicle
 * @access  Private
 */
router.get('/predict/:vehicleId',
  asyncHandler(async (req, res) => {
    try {
      const prediction = await maintenanceService.predictMaintenanceNeeds(req.params.vehicleId);
      
      if (!prediction) {
        return res.status(404).json({
          success: false,
          error: 'Vehicle not found'
        });
      }

      res.status(200).json({
        success: true,
        data: prediction
      });
    } catch (error) {
      logger.error('Error predicting maintenance:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to predict maintenance'
      });
    }
  })
);

/**
 * @route   POST /api/v1/maintenance/records
 * @desc    Create maintenance record
 * @access  Private/Technician
 */
router.post('/records',
  asyncHandler(async (req, res) => {
    try {
      const { vehicleId, maintenanceType, completionDate, cost, notes, parts } = req.body;

      if (!vehicleId || !maintenanceType || !completionDate) {
        return res.status(400).json({
          success: false,
          error: 'Vehicle ID, maintenance type, and completion date are required'
        });
      }

      const record = await maintenanceService.createRecord({
        vehicleId,
        maintenanceType,
        completionDate,
        cost,
        notes,
        parts,
        technician: req.user.id
      });

      res.status(201).json({
        success: true,
        data: record
      });
    } catch (error) {
      logger.error('Error creating record:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create record'
      });
    }
  })
);

/**
 * @route   GET /api/v1/maintenance/records/:recordId
 * @desc    Get specific maintenance record
 * @access  Private
 */
router.get('/records/:recordId',
  asyncHandler(async (req, res) => {
    try {
      const record = await maintenanceService.getRecordById(req.params.recordId);
      
      if (!record) {
        return res.status(404).json({
          success: false,
          error: 'Record not found'
        });
      }

      res.status(200).json({
        success: true,
        data: record
      });
    } catch (error) {
      logger.error('Error fetching record:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch record'
      });
    }
  })
);

/**
 * @route   GET /api/v1/maintenance/vehicle/:vehicleId/history
 * @desc    Get maintenance history for vehicle
 * @access  Private
 */
router.get('/vehicle/:vehicleId/history',
  asyncHandler(async (req, res) => {
    try {
      const history = await maintenanceService.getVehicleMaintenanceHistory(req.params.vehicleId);
      
      if (!history) {
        return res.status(404).json({
          success: false,
          error: 'Vehicle not found'
        });
      }

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Error fetching history:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch history'
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
