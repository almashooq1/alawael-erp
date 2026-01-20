// Monitoring Routes
const express = require('express');
const MonitoringService = require('../services/monitoringService');

const router = express.Router();

// Get system health
router.get('/health', (req, res) => {
  try {
    const health = MonitoringService.getSystemHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get performance metrics
router.get('/metrics', (req, res) => {
  try {
    const metrics = MonitoringService.getPerformanceMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Monitor endpoints
router.get('/endpoints', (req, res) => {
  try {
    const endpoints = MonitoringService.monitorEndpoints();
    res.json(endpoints);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get alerts
router.get('/alerts', (req, res) => {
  try {
    const alerts = MonitoringService.getAlerts();
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Monitor database
router.get('/database', (req, res) => {
  try {
    const dbStatus = MonitoringService.monitorDatabase();
    res.json(dbStatus);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get realtime data
router.get('/realtime', (req, res) => {
  try {
    const realtime = MonitoringService.getRealtimeData();
    res.json(realtime);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
