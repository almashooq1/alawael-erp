/**
 * attendance.routes.js - Attendance Management API Routes
 * Handles all attendance-related endpoints
 *
 * @module api/routes/beneficiary/attendance
 */

const express = require('express');
const router = express.Router();
const AttendanceService = require('../../../services/BeneficiaryManagement/AttendanceService');

// Middleware
const authenticate = (req, res, next) => {
  // TODO: Implement JWT authentication
  next();
};

// Initialize service
let attendanceService;

// Initialize service on first use
router.use((req, res, next) => {
  if (!attendanceService) {
    const { MongoClient } = require('mongodb');
    attendanceService = new AttendanceService(global.db);
  }
  next();
});

/**
 * @route POST /api/attendance/record
 * @description Record attendance for a beneficiary
 * @param {string} beneficiaryId - Beneficiary ID
 * @param {Object} body - Attendance data
 * @returns {Object} Created attendance record
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

    const result = await attendanceService.recordAttendance(beneficiaryId, req.body);

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
 * @route GET /api/attendance/:beneficiaryId/report
 * @description Get attendance report for a beneficiary
 * @param {string} beneficiaryId - Beneficiary ID
 * @query {string} startDate - Start date (optional)
 * @query {string} endDate - End date (optional)
 * @query {string} courseId - Course ID (optional)
 * @returns {Object} Attendance report
 */
router.get('/:beneficiaryId/report', authenticate, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      courseId: req.query.courseId
    };

    const result = await attendanceService.getAttendanceReport(beneficiaryId, options);
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
 * @route GET /api/attendance/:beneficiaryId/threshold-check
 * @description Check attendance threshold and generate alerts
 * @param {string} beneficiaryId - Beneficiary ID
 * @query {string} period - 'semester' or 'year' (optional)
 * @returns {Object} Alert report
 */
router.get('/:beneficiaryId/threshold-check', authenticate, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const options = {
      period: req.query.period || 'semester'
    };

    const result = await attendanceService.checkAttendanceThreshold(beneficiaryId, options);
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
 * @route POST /api/attendance/bulk-upload
 * @description Bulk upload attendance records
 * @param {Array<Object>} body - Array of attendance records
 * @returns {Object} Upload result
 */
router.post('/bulk-upload', authenticate, async (req, res) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({
        status: 'error',
        message: 'records must be an array',
        data: null,
        timestamp: new Date()
      });
    }

    const result = await attendanceService.bulkUploadAttendance(records);
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
 * @route GET /api/attendance/:beneficiaryId/export
 * @description Export attendance data to CSV
 * @param {string} beneficiaryId - Beneficiary ID
 * @query {string} startDate - Start date (optional)
 * @query {string} endDate - End date (optional)
 * @returns {Object} CSV formatted data
 */
router.get('/:beneficiaryId/export', authenticate, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const result = await attendanceService.exportAttendanceData(beneficiaryId, options);

    if (result.status === 'success') {
      // Send CSV file
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${beneficiaryId}.csv"`);
      return res.send(result.data.csv);
    }

    return res.status(404).json(result);

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
 * @route GET /api/attendance/health
 * @description Check service health
 * @returns {Object} Service status
 */
router.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Attendance service is healthy',
    service: 'AttendanceService',
    timestamp: new Date()
  });
});

module.exports = router;
