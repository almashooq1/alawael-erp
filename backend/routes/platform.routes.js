/**
 * DDD Platform Health API
 * نقطة نهاية صحة المنصة الموحدة
 *
 * Endpoints:
 *  GET /api/v1/platform/health       — Full health check
 *  GET /api/v1/platform/domains      — List all domains
 *  GET /api/v1/platform/stats        — Platform-wide stats
 *  GET /api/v1/platform/version      — Platform version info
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/* ── DDD Module Routes (125 modules) ── */
const dddLoader = require('./ddd-loader');
router.use('/', dddLoader);

/* ── GET /health — Full platform health check ── */
router.get('/health', async (req, res) => {
  try {
    const { listDomains, healthCheckAll } = require('../domains');
const safeError = require('../utils/safeError');
    const domains = listDomains();

    // Database connection
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

    // Domain health
    let domainHealth;
    try {
      domainHealth = await healthCheckAll();
    } catch {
      domainHealth = domains.map(d => ({ name: d.name, status: 'unknown' }));
    }

    // Model count
    const modelNames = mongoose.modelNames();

    // Memory usage
    const mem = process.memoryUsage();

    const health = {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      platform: 'Unified Rehabilitation Intelligence Platform',
      platformAr: 'منصة التأهيل الموحدة الذكية',
      version: '2.0.0-ddd',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        name: mongoose.connection.name || 'alawael-erp',
      },
      domains: {
        total: domains.length,
        list: domains.map(d => ({
          name: d.name,
          version: d.version,
          prefix: d.prefix,
          description: d.description,
          status: 'active',
        })),
      },
      models: {
        total: modelNames.length,
        list: modelNames.sort(),
      },
      memory: {
        rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      },
      node: process.version,
    };

    res.json(health);
  } catch (err) {
    safeError(res, err, 'platform');
      timestamp: new Date().toISOString(),
    });
  }
});

/* ── GET /domains — List all domains ── */
router.get('/domains', (req, res) => {
  try {
    const { listDomains } = require('../domains');
    const domains = listDomains();

    res.json({
      total: domains.length,
      domains: domains.map(d => ({
        name: d.name,
        version: d.version,
        prefix: d.prefix,
        description: d.description,
        endpoints: [`/api/v1/${d.prefix || d.name}`, `/api/v2/${d.prefix || d.name}`],
      })),
    });
  } catch (err) {
    res
      .status(500)
      .json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      });
  }
});

/* ── GET /stats — Platform-wide statistics ── */
router.get('/stats', async (req, res) => {
  try {
    const db = mongoose.connection;
    if (db.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    // Count documents across core collections
    const collections = [
      { name: 'beneficiaries', label: 'المستفيدون', labelEn: 'Beneficiaries' },
      { name: 'episodesofcares', label: 'حلقات الرعاية', labelEn: 'Episodes' },
      { name: 'clinicalsessions', label: 'الجلسات', labelEn: 'Sessions' },
      { name: 'clinicalassessments', label: 'التقييمات', labelEn: 'Assessments' },
      { name: 'therapeuticgoals', label: 'الأهداف', labelEn: 'Goals' },
      { name: 'unifiedcareplans', label: 'خطط الرعاية', labelEn: 'Care Plans' },
      { name: 'workflowtasks', label: 'المهام', labelEn: 'Tasks' },
      { name: 'recommendations', label: 'التوصيات', labelEn: 'Recommendations' },
      { name: 'qualityaudits', label: 'مراجعات الجودة', labelEn: 'Audits' },
      { name: 'familymembers', label: 'أفراد الأسرة', labelEn: 'Family Members' },
      { name: 'therapygroups', label: 'المجموعات العلاجية', labelEn: 'Groups' },
      { name: 'telesessions', label: 'جلسات عن بُعد', labelEn: 'Tele Sessions' },
      { name: 'arvrsessions', label: 'جلسات AR/VR', labelEn: 'AR/VR Sessions' },
      { name: 'behaviorrecords', label: 'سجلات السلوك', labelEn: 'Behavior Records' },
      { name: 'researchstudies', label: 'الدراسات', labelEn: 'Studies' },
      { name: 'trainingprograms', label: 'برامج التدريب', labelEn: 'Training Programs' },
    ];

    const statPromises = collections.map(async col => {
      try {
        const count = await db.collection(col.name).countDocuments();
        return { ...col, count };
      } catch {
        return { ...col, count: 0 };
      }
    });

    const stats = await Promise.all(statPromises);
    const totalDocuments = stats.reduce((s, st) => s + st.count, 0);

    res.json({
      totalDocuments,
      collections: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res
      .status(500)
      .json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      });
  }
});

/* ── GET /version — Version info ── */
router.get('/version', (req, res) => {
  const { listDomains } = require('../domains');
  const domains = listDomains();
  const modelCount = mongoose.modelNames().length;

  res.json({
    platform: 'Unified Rehabilitation Intelligence Platform',
    platformAr: 'منصة التأهيل الموحدة الذكية',
    version: '2.0.0-ddd',
    architecture: 'Domain-Driven Design (DDD)',
    domains: domains.length,
    models: modelCount,
    endpoints: domains.length * 3, // /api, /api/v1, /api/v2
    features: [
      '20 DDD domains',
      '34 Mongoose models',
      '12-phase Episode of Care',
      'Beneficiary 360° profile',
      'AI Recommendations engine',
      'Decision Support with 8 rules',
      'Real-time Socket.IO events',
      'Comprehensive quality audits',
      '15 standard KPIs',
      'Group & Tele-Rehabilitation',
      'AR/VR sessions',
      'Family portal',
      'Field training management',
      'Clinical research tracking',
    ],
    buildDate: new Date().toISOString(),
  });
});

/* ── Notification templates listing ── */
router.get('/notifications/templates', (_req, res) => {
  try {
    const { listTemplates } = require('../services/dddNotificationDispatcher');
    res.json({ success: true, templates: listTemplates() });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      });
  }
});

/* ── Notification delivery logs ── */
router.get('/notifications/logs', async (req, res) => {
  try {
    const { getNotificationLogs } = require('../services/dddNotificationDispatcher');
    const { templateKey, domain, limit, page, startDate, endDate } = req.query;
    const data = await getNotificationLogs({
      templateKey,
      domain,
      limit: parseInt(limit, 10) || 50,
      page: parseInt(page, 10) || 1,
      startDate,
      endDate,
    });
    res.json({ success: true, ...data });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      });
  }
});

/* ── Scheduler status endpoint ── */
router.get('/scheduler', (_req, res) => {
  try {
    const { getSchedulerStatus } = require('../services/dddScheduler');
    res.json({ success: true, ...getSchedulerStatus() });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      });
  }
});

/* ── Automation logs endpoint ── */
router.get('/automations/logs', async (req, res) => {
  try {
    const { getAutomationLogs } = require('../integration/dddWorkflowAutomations');
    const { ruleId, domain, status, limit, page, startDate, endDate } = req.query;
    const data = await getAutomationLogs({
      ruleId,
      domain,
      status,
      limit: parseInt(limit, 10) || 50,
      page: parseInt(page, 10) || 1,
      startDate,
      endDate,
    });
    res.json({ success: true, ...data });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      });
  }
});

module.exports = router;
