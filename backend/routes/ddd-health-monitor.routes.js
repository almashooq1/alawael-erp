'use strict';
/**
 * HealthMonitor Routes
 * Auto-extracted from services/dddHealthMonitor.js
 * 8 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { runFullHealthCheck, livenessCheck, readinessCheck, getHealthDashboard, getHealthTrend, checkDomainHealth } = require('../services/dddHealthMonitor');

  router.get('/health-monitor/check', authenticate, async (_req, res) => {
    try {
    const result = await runFullHealthCheck();
    const httpStatus = result.overallStatus === 'unhealthy' ? 503 : 200;
    res.status(httpStatus).json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'health-monitor');
    }
  });

  router.get('/health-monitor/live', authenticate, async (_req, res) => {
    try {
    const result = await livenessCheck();
    res.status(result.status === 'ok' ? 200 : 503).json(result);
    } catch (e) {
      safeError(res, e, 'health-monitor');
    }
  });

  router.get('/health-monitor/ready', authenticate, async (_req, res) => {
    try {
    const result = await readinessCheck();
    res.status(result.ready ? 200 : 503).json(result);
    } catch (e) {
      safeError(res, e, 'health-monitor');
    }
  });

  router.get('/health-monitor/dashboard', authenticate, async (_req, res) => {
    try {
    const dashboard = await getHealthDashboard();
    res.json({ success: true, ...dashboard });
    } catch (e) {
      safeError(res, e, 'health-monitor');
    }
  });

  router.get('/health-monitor/trend', authenticate, async (req, res) => {
    try {
    const hours = parseInt(req.query.hours, 10) || 24;
    const trend = await getHealthTrend(hours);
    res.json({ success: true, count: trend.length, trend });
    } catch (e) {
      safeError(res, e, 'health-monitor');
    }
  });

  router.get('/health-monitor/domain/:name', authenticate, async (req, res) => {
    try {
    const result = await checkDomainHealth(req.params.name);
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'health-monitor');
    }
  });

  router.get('/health-monitor/infrastructure', authenticate, async (_req, res) => {
    try {
    const [mongo, redis] = await Promise.all([checkMongoDB(), checkRedis()]);
    const memory = checkMemory();
    const uptime = checkUptime();
    res.json({ success: true, mongodb: mongo, redis, memory, uptime });
    } catch (e) {
      safeError(res, e, 'health-monitor');
    }
  });

  router.get('/health-monitor/domains', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'health-monitor');
    }
  });

module.exports = router;
