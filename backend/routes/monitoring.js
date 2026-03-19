/* eslint-disable no-unused-vars */
// Monitoring Routes
const express = require('express');
const MonitoringService = require('../services/monitoringService');
const { ApiResponse, ApiError } = require('../utils/apiResponse');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get system health
router.get('/health', (_req, res, next) => {
  try {
    const health = MonitoringService.getSystemHealth();
    return res.json(new ApiResponse(200, health, 'System health fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch system health', ['حدث خطأ داخلي']));
  }
});

// Get performance metrics
router.get('/metrics', (_req, res, next) => {
  try {
    const metrics = MonitoringService.getPerformanceMetrics();
    return res.json(new ApiResponse(200, metrics, 'Performance metrics fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch performance metrics', ['حدث خطأ داخلي']));
  }
});

// Monitor endpoints
router.get('/endpoints', (_req, res, next) => {
  try {
    const endpoints = MonitoringService.monitorEndpoints();
    return res.json(new ApiResponse(200, endpoints, 'Endpoints monitored'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to monitor endpoints', ['حدث خطأ داخلي']));
  }
});

// Get alerts
router.get('/alerts', (_req, res, next) => {
  try {
    const alerts = MonitoringService.getAlerts();
    return res.json(new ApiResponse(200, alerts, 'Alerts fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch alerts', ['حدث خطأ داخلي']));
  }
});

// Monitor database
router.get('/database', (req, res, next) => {
  try {
    const dbStatus = MonitoringService.monitorDatabase();
    return res.json(new ApiResponse(200, dbStatus, 'Database status fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch database status', ['حدث خطأ داخلي']));
  }
});

// Get realtime data
router.get('/realtime', (req, res, next) => {
  try {
    const realtime = MonitoringService.getRealtimeData();
    return res.json(new ApiResponse(200, realtime, 'Realtime data fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch realtime data', ['حدث خطأ داخلي']));
  }
});

module.exports = router;
