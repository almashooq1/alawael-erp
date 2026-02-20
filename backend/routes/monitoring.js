// Monitoring Routes
const express = require('express');
const MonitoringService = require('../services/monitoringService');
const { ApiResponse, ApiError } = require('../utils/apiResponse');

const router = express.Router();

// Get system health
router.get('/health', (req, res, next) => {
  try {
    const health = MonitoringService.getSystemHealth();
    return res.json(new ApiResponse(200, health, 'System health fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch system health', [error.message]));
  }
});

// Get performance metrics
router.get('/metrics', (req, res, next) => {
  try {
    const metrics = MonitoringService.getPerformanceMetrics();
    return res.json(new ApiResponse(200, metrics, 'Performance metrics fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch performance metrics', [error.message]));
  }
});

// Monitor endpoints
router.get('/endpoints', (req, res, next) => {
  try {
    const endpoints = MonitoringService.monitorEndpoints();
    return res.json(new ApiResponse(200, endpoints, 'Endpoints monitored'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to monitor endpoints', [error.message]));
  }
});

// Get alerts
router.get('/alerts', (req, res, next) => {
  try {
    const alerts = MonitoringService.getAlerts();
    return res.json(new ApiResponse(200, alerts, 'Alerts fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch alerts', [error.message]));
  }
});

// Monitor database
router.get('/database', (req, res, next) => {
  try {
    const dbStatus = MonitoringService.monitorDatabase();
    return res.json(new ApiResponse(200, dbStatus, 'Database status fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch database status', [error.message]));
  }
});

// Get realtime data
router.get('/realtime', (req, res, next) => {
  try {
    const realtime = MonitoringService.getRealtimeData();
    return res.json(new ApiResponse(200, realtime, 'Realtime data fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch realtime data', [error.message]));
  }
});

module.exports = router;
