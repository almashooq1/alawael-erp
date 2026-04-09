/**
 * Database Admin Routes - Al-Awael ERP
 * مسارات إدارة قاعدة البيانات
 *
 * Protected endpoints for database management:
 *  - Analytics & Monitoring dashboard data
 *  - Schema registry inspection
 *  - Migration management
 *  - Cache management
 *  - Archive management
 *  - Circuit breaker status
 *  - Index analysis
 *  - Health checks
 *
 * All routes require superAdmin role
 */

'use strict';

const express = require('express');
const router = express.Router();

// ── Dependencies ──
let authMiddleware, authorize;
try {
  const authModule = require('../middleware/auth');
  authMiddleware = authModule.protect || authModule.requireAuth || authModule.authenticate;
  authorize = require('../middleware/authorize');
} catch {
  // Fallback: create minimal middleware
  authMiddleware = (req, res, next) => next();
  authorize = () => (req, res, next) => next();
}

const {
  dbAnalytics,
  schemaRegistry,
  migrationRunner,
  queryCache,
  dataArchiver,
  dbCircuitBreaker,
  databaseEventBus,
  MigrationRunner,
  indexOptimizer,
  seederFramework,
  poolManager,
  backupRestore,
  auditTrail,
  tenantIsolator,
  dataMasking,
  queryGovernor,
  refIntegrity,
  lifecycleManager,
} = require('../database');

// ══════════════════════════════════════════════════════════════════
// Middleware: Require superAdmin
// ══════════════════════════════════════════════════════════════════
const superAdminOnly = [authMiddleware, authorize('superAdmin', 'admin')];

// ══════════════════════════════════════════════════════════════════
// 1. DASHBOARD - لوحة المعلومات
// ══════════════════════════════════════════════════════════════════

/**
 * GET /api/db-admin/dashboard
 * Get comprehensive database dashboard data
 */
router.get('/dashboard', superAdminOnly, async (req, res) => {
  try {
    const [dashboard, cacheStats, circuitStatus, archiveStats] = await Promise.all([
      dbAnalytics.getDashboardData(),
      Promise.resolve(queryCache.getStats()),
      Promise.resolve(dbCircuitBreaker.getMetrics()),
      dataArchiver.getStats().catch(() => ({ error: 'Not available' })),
    ]);

    dashboard.queryCache = cacheStats;
    dashboard.circuitBreaker = circuitStatus;
    dashboard.archive = archiveStats;

    res.json({ success: true, data: dashboard });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 2. ANALYTICS - التحليلات
// ══════════════════════════════════════════════════════════════════

/** GET /api/db-admin/analytics/database */
router.get('/analytics/database', superAdminOnly, async (req, res) => {
  try {
    const stats = await dbAnalytics.getDatabaseStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/analytics/collections */
router.get('/analytics/collections', superAdminOnly, async (req, res) => {
  try {
    const stats = await dbAnalytics.getCollectionStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/analytics/performance */
router.get('/analytics/performance', superAdminOnly, async (req, res) => {
  try {
    const perf = dbAnalytics.getQueryPerformance();
    res.json({ success: true, data: perf });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/analytics/indexes */
router.get('/analytics/indexes', superAdminOnly, async (req, res) => {
  try {
    const analysis = await dbAnalytics.analyzeIndexes();
    res.json({ success: true, data: analysis });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/analytics/history */
router.get('/analytics/history', superAdminOnly, (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes) || 60;
    const history = dbAnalytics.getSnapshotHistory(minutes);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 3. SCHEMA REGISTRY - سجل المخططات
// ══════════════════════════════════════════════════════════════════

/** GET /api/db-admin/schemas */
router.get('/schemas', superAdminOnly, (req, res) => {
  try {
    const summary = schemaRegistry.getSchemaSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/schemas/:modelName */
router.get('/schemas/:modelName', superAdminOnly, (req, res) => {
  try {
    const info = schemaRegistry.getSchemaInfo(req.params.modelName);
    if (!info) {
      return res.status(404).json({ success: false, error: 'Model not found' });
    }
    res.json({ success: true, data: info });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/schemas/groups */
router.get('/schema-groups', superAdminOnly, (req, res) => {
  try {
    const groups = schemaRegistry.getGroups();
    res.json({ success: true, data: groups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/schemas/dependencies */
router.get('/schema-dependencies', superAdminOnly, (req, res) => {
  try {
    const graph = schemaRegistry.getDependencyGraph();
    res.json({ success: true, data: graph });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/schemas/validate */
router.get('/schema-validate', superAdminOnly, async (req, res) => {
  try {
    const result = await schemaRegistry.validateAll();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/schemas/docs */
router.get('/schema-docs', superAdminOnly, (req, res) => {
  try {
    const markdown = schemaRegistry.generateDocs();
    const format = req.query.format || 'json';

    if (format === 'markdown' || format === 'md') {
      res.type('text/markdown').send(markdown);
    } else {
      res.json({ success: true, data: { markdown } });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 4. MIGRATIONS - الهجرات
// ══════════════════════════════════════════════════════════════════

/** GET /api/db-admin/migrations/status */
router.get('/migrations/status', superAdminOnly, async (req, res) => {
  try {
    const status = await migrationRunner.status();
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/migrations/run */
router.post('/migrations/run', superAdminOnly, async (req, res) => {
  try {
    const result = await migrationRunner.runAll();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/migrations/rollback */
router.post('/migrations/rollback', superAdminOnly, async (req, res) => {
  try {
    const batches = parseInt(req.body.batches) || 1;
    const result = await migrationRunner.rollback(batches);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/migrations/generate */
router.post('/migrations/generate', superAdminOnly, (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Migration name is required' });
    }
    const result = MigrationRunner.generate(name);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 5. CACHE - التخزين المؤقت
// ══════════════════════════════════════════════════════════════════

/** GET /api/db-admin/cache/stats */
router.get('/cache/stats', superAdminOnly, (req, res) => {
  try {
    const stats = queryCache.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/cache/invalidate */
router.post('/cache/invalidate', superAdminOnly, (req, res) => {
  try {
    const { model } = req.body;
    if (model) {
      const count = queryCache.invalidateModel(model);
      res.json({ success: true, message: `Invalidated ${count} entries for ${model}` });
    } else {
      queryCache.invalidateAll();
      res.json({ success: true, message: 'All cache entries invalidated' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/cache/warmup */
router.post('/cache/warmup', superAdminOnly, async (req, res) => {
  try {
    const result = await queryCache.warmup();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/cache/toggle */
router.post('/cache/toggle', superAdminOnly, (req, res) => {
  try {
    const { enabled } = req.body;
    if (enabled) {
      queryCache.enable();
    } else {
      queryCache.disable();
    }
    res.json({ success: true, message: `Query cache ${enabled ? 'enabled' : 'disabled'}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 6. ARCHIVE - الأرشفة
// ══════════════════════════════════════════════════════════════════

/** GET /api/db-admin/archive/stats */
router.get('/archive/stats', superAdminOnly, async (req, res) => {
  try {
    const stats = await dataArchiver.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/archive/policies */
router.get('/archive/policies', superAdminOnly, (req, res) => {
  try {
    const policies = dataArchiver.getPolicies();
    res.json({ success: true, data: policies });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/archive/run */
router.post('/archive/run', superAdminOnly, async (req, res) => {
  try {
    const { model } = req.body;
    let result;
    if (model) {
      result = await dataArchiver.archiveModel(model);
    } else {
      result = await dataArchiver.archiveAll();
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/archive/restore */
router.post('/archive/restore', superAdminOnly, async (req, res) => {
  try {
    const { model, filter } = req.body;
    if (!model) {
      return res.status(400).json({ success: false, error: 'Model name is required' });
    }
    const result = await dataArchiver.restore(model, filter || {}, req.user?.name || 'admin');
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/archive/purge */
router.post('/archive/purge', superAdminOnly, async (req, res) => {
  try {
    const { model, olderThanDays } = req.body;
    if (!model) {
      return res.status(400).json({ success: false, error: 'Model name is required' });
    }
    const result = await dataArchiver.purgeArchive(model, olderThanDays || 365 * 5);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 7. CIRCUIT BREAKER - قاطع الدائرة
// ══════════════════════════════════════════════════════════════════

/** GET /api/db-admin/circuit-breaker/status */
router.get('/circuit-breaker/status', superAdminOnly, (req, res) => {
  try {
    const metrics = dbCircuitBreaker.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/circuit-breaker/reset */
router.post('/circuit-breaker/reset', superAdminOnly, (req, res) => {
  try {
    dbCircuitBreaker.reset();
    res.json({ success: true, message: 'Circuit breaker reset to CLOSED' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 8. EVENT BUS - ناقل الأحداث
// ══════════════════════════════════════════════════════════════════

/** GET /api/db-admin/events/stats */
router.get('/events/stats', superAdminOnly, (req, res) => {
  try {
    const stats = databaseEventBus.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/events/dead-letters */
router.get('/events/dead-letters', superAdminOnly, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const deadLetters = databaseEventBus.getDeadLetters(limit);
    res.json({ success: true, data: deadLetters });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/events/replay-dead-letters */
router.post('/events/replay-dead-letters', superAdminOnly, async (req, res) => {
  try {
    const result = await databaseEventBus.replayDeadLetters(req.body || {});
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 9. HEALTH - الصحة
// ══════════════════════════════════════════════════════════════════

/** GET /api/db-admin/health */
router.get('/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const state = mongoose.connection.readyState;
    const stateNames = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    const health = {
      database: {
        status: stateNames[state] || 'unknown',
        isHealthy: state === 1,
      },
      circuitBreaker: dbCircuitBreaker.getMetrics(),
      queryCache: queryCache.getStats(),
      eventBus: databaseEventBus.getStats(),
      timestamp: new Date(),
    };

    const statusCode = health.database.isHealthy ? 200 : 503;
    res.status(statusCode).json({ success: health.database.isHealthy, data: health });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 10. INDEX OPTIMIZER - محسّن الفهارس
// ══════════════════════════════════════════════════════════════════

/** GET /api/db-admin/indexes/analysis */
router.get('/indexes/analysis', superAdminOnly, async (req, res) => {
  try {
    const analysis = await indexOptimizer.analyzeAllIndexes();
    res.json({ success: true, data: analysis });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/indexes/suggestions */
router.get('/indexes/suggestions', superAdminOnly, async (req, res) => {
  try {
    const suggestions = await indexOptimizer.getSuggestions();
    res.json({ success: true, data: suggestions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/indexes/unused */
router.get('/indexes/unused', superAdminOnly, async (req, res) => {
  try {
    const unused = await indexOptimizer.findUnusedIndexes();
    res.json({ success: true, data: unused });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/indexes/optimize */
router.post('/indexes/optimize', superAdminOnly, async (req, res) => {
  try {
    const result = await indexOptimizer.optimize(req.body || {});
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 11. SEEDER - البذر
// ══════════════════════════════════════════════════════════════════

/** POST /api/db-admin/seeder/run */
router.post('/seeder/run', superAdminOnly, async (req, res) => {
  try {
    const { environment, tags, force } = req.body || {};
    const result = await seederFramework.run({
      environment: environment || process.env.NODE_ENV,
      tags,
      force,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/seeder/status */
router.get('/seeder/status', superAdminOnly, async (req, res) => {
  try {
    const status = await seederFramework.getStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/seeder/rollback */
router.post('/seeder/rollback', superAdminOnly, async (req, res) => {
  try {
    const { seedName } = req.body || {};
    const result = await seederFramework.rollback(seedName);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 12. CONNECTION POOL - مجمع الاتصالات
// ══════════════════════════════════════════════════════════════════

/** GET /api/db-admin/pool/metrics */
router.get('/pool/metrics', superAdminOnly, async (req, res) => {
  try {
    const metrics = poolManager.getPoolMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/pool/status */
router.get('/pool/status', superAdminOnly, async (req, res) => {
  try {
    const status = poolManager.getStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 13. BACKUP & RESTORE - النسخ الاحتياطي
// ══════════════════════════════════════════════════════════════════

/** POST /api/db-admin/backup/create */
router.post('/backup/create', superAdminOnly, async (req, res) => {
  try {
    const { collections, tags, compress } = req.body || {};
    const result = await backupRestore.backup({
      collections,
      tags,
      compress,
      initiatedBy: req.user?.name || 'admin',
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/backup/list */
router.get('/backup/list', superAdminOnly, async (req, res) => {
  try {
    const { status, type, limit } = req.query;
    const backups = await backupRestore.listBackups({
      status,
      type,
      limit: parseInt(limit) || 20,
    });
    res.json({ success: true, data: backups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/backup/stats */
router.get('/backup/stats', superAdminOnly, async (req, res) => {
  try {
    const stats = await backupRestore.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/backup/verify/:backupId */
router.post('/backup/verify/:backupId', superAdminOnly, async (req, res) => {
  try {
    const result = await backupRestore.verify(req.params.backupId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/backup/restore/:backupId */
router.post('/backup/restore/:backupId', superAdminOnly, async (req, res) => {
  try {
    const { collections, drop } = req.body || {};
    const result = await backupRestore.restore(req.params.backupId, {
      collections,
      drop,
      restoredBy: req.user?.name || 'admin',
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** DELETE /api/db-admin/backup/:backupId */
router.delete('/backup/:backupId', superAdminOnly, async (req, res) => {
  try {
    const result = await backupRestore.deleteBackup(req.params.backupId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 14. AUDIT TRAIL - تتبع التغييرات
// ══════════════════════════════════════════════════════════════════

/** GET /api/db-admin/audit/search */
router.get('/audit/search', superAdminOnly, async (req, res) => {
  try {
    const {
      action,
      entityType,
      entityId,
      userId,
      severity,
      source,
      from,
      to,
      search,
      page,
      limit,
    } = req.query;
    const skip = ((parseInt(page) || 1) - 1) * (parseInt(limit) || 50);
    const result = await auditTrail.search(
      { action, entityType, entityId, userId, severity, source, from, to, search },
      { skip, limit: parseInt(limit) || 50 }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/audit/document/:entityType/:entityId */
router.get('/audit/document/:entityType/:entityId', superAdminOnly, async (req, res) => {
  try {
    const history = await auditTrail.getDocumentHistory(
      req.params.entityType,
      req.params.entityId,
      { limit: parseInt(req.query.limit) || 50 }
    );
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/audit/user/:userId */
router.get('/audit/user/:userId', superAdminOnly, async (req, res) => {
  try {
    const activity = await auditTrail.getUserActivity(req.params.userId, {
      from: req.query.from ? new Date(req.query.from) : undefined,
      to: req.query.to ? new Date(req.query.to) : undefined,
      limit: parseInt(req.query.limit) || 50,
    });
    res.json({ success: true, data: activity });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/audit/stats */
router.get('/audit/stats', superAdminOnly, async (req, res) => {
  try {
    const stats = await auditTrail.getStats({
      from: req.query.from,
      to: req.query.to,
    });
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/audit/compliance-report */
router.get('/audit/compliance-report', superAdminOnly, async (req, res) => {
  try {
    const report = await auditTrail.complianceReport({
      from: req.query.from ? new Date(req.query.from) : undefined,
      to: req.query.to ? new Date(req.query.to) : undefined,
    });
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/audit/cleanup */
router.post('/audit/cleanup', superAdminOnly, async (req, res) => {
  try {
    const { olderThanDays } = req.body || {};
    const result = await auditTrail.cleanup(olderThanDays);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 15. MULTI-TENANT - عزل المستأجرين
// ══════════════════════════════════════════════════════════════════

/** GET /api/db-admin/tenant/stats */
router.get('/tenant/stats', superAdminOnly, async (req, res) => {
  try {
    const stats = tenantIsolator.getStats(req.query.tenantId);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/tenant/sizes */
router.get('/tenant/sizes', superAdminOnly, async (req, res) => {
  try {
    const sizes = await tenantIsolator.getTenantSizes();
    res.json({ success: true, data: sizes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/tenant/quota/:tenantId */
router.get('/tenant/quota/:tenantId', superAdminOnly, async (req, res) => {
  try {
    const quota = await tenantIsolator.checkQuota(req.params.tenantId);
    res.json({ success: true, data: quota });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/tenant/quota */
router.post('/tenant/quota', superAdminOnly, async (req, res) => {
  try {
    const { tenantId, maxDocuments, maxStorageBytes, maxQueriesPerMinute } = req.body || {};
    tenantIsolator.setQuota(tenantId, { maxDocuments, maxStorageBytes, maxQueriesPerMinute });
    res.json({ success: true, message: 'Quota set successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 16. DATA MASKING - إخفاء البيانات
// ══════════════════════════════════════════════════════════════════

/** GET /api/db-admin/masking/rules */
router.get('/masking/rules', superAdminOnly, async (req, res) => {
  try {
    const rules = dataMasking.getRules(req.query.model);
    res.json({ success: true, data: rules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/masking/rules */
router.post('/masking/rules', superAdminOnly, async (req, res) => {
  try {
    const { modelName, rules } = req.body || {};
    if (!modelName || !rules) {
      return res.status(400).json({ success: false, error: 'modelName and rules are required' });
    }
    dataMasking.defineRules(modelName, rules);
    res.json({ success: true, message: `Rules defined for ${modelName}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/masking/apply-pii-preset */
router.post('/masking/apply-pii-preset', superAdminOnly, async (req, res) => {
  try {
    dataMasking.applyPIIPreset();
    res.json({ success: true, message: 'PII masking preset applied' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 17. QUERY GOVERNOR - حاكم الاستعلامات
// ══════════════════════════════════════════════════════════════════

/** GET /api/db-admin/governor/metrics */
router.get('/governor/metrics', superAdminOnly, async (req, res) => {
  try {
    const metrics = queryGovernor.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/governor/current-ops */
router.get('/governor/current-ops', superAdminOnly, async (req, res) => {
  try {
    const ops = await queryGovernor.getCurrentOps();
    res.json({ success: true, data: ops });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/governor/start-monitor */
router.post('/governor/start-monitor', superAdminOnly, async (req, res) => {
  try {
    queryGovernor.startMonitor();
    res.json({ success: true, message: 'Query monitor started' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/governor/stop-monitor */
router.post('/governor/stop-monitor', superAdminOnly, async (req, res) => {
  try {
    queryGovernor.stopMonitor();
    res.json({ success: true, message: 'Query monitor stopped' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/governor/set-budget */
router.post('/governor/set-budget', superAdminOnly, async (req, res) => {
  try {
    const { role, queriesPerMinute, writesPerMinute } = req.body || {};
    if (!role) return res.status(400).json({ success: false, error: 'role is required' });
    queryGovernor.setRateBudget(role, { queriesPerMinute, writesPerMinute });
    res.json({ success: true, message: `Budget set for role: ${role}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 18. REFERENTIAL INTEGRITY - سلامة المراجع
// ══════════════════════════════════════════════════════════════════

/** GET /api/db-admin/integrity/relations */
router.get('/integrity/relations', superAdminOnly, async (req, res) => {
  try {
    const relations = refIntegrity.getRelations(req.query.model);
    res.json({ success: true, data: relations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/integrity/graph */
router.get('/integrity/graph', superAdminOnly, async (req, res) => {
  try {
    const graph = refIntegrity.getRelationGraph();
    res.json({ success: true, data: graph });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/integrity/discover */
router.post('/integrity/discover', superAdminOnly, async (req, res) => {
  try {
    const count = refIntegrity.autoDiscoverRelations();
    res.json({ success: true, data: { discovered: count } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/integrity/audit */
router.post('/integrity/audit', superAdminOnly, async (req, res) => {
  try {
    const { models, fix } = req.body || {};
    const report = await refIntegrity.audit({ models, fix });
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/integrity/can-delete */
router.post('/integrity/can-delete', superAdminOnly, async (req, res) => {
  try {
    const { modelName, documentId } = req.body || {};
    if (!modelName || !documentId) {
      return res.status(400).json({ success: false, error: 'modelName and documentId required' });
    }
    const result = await refIntegrity.canDelete(modelName, documentId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/integrity/dependencies/:modelName */
router.get('/integrity/dependencies/:modelName', superAdminOnly, async (req, res) => {
  try {
    const tree = refIntegrity.getDependencyTree(req.params.modelName);
    res.json({ success: true, data: tree });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 19. TTL LIFECYCLE - دورة حياة البيانات
// ══════════════════════════════════════════════════════════════════

/** GET /api/db-admin/lifecycle/status */
router.get('/lifecycle/status', superAdminOnly, async (req, res) => {
  try {
    const status = await lifecycleManager.getStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/lifecycle/policies */
router.get('/lifecycle/policies', superAdminOnly, async (req, res) => {
  try {
    const policies = await lifecycleManager.getPolicies();
    res.json({ success: true, data: policies });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/lifecycle/policies */
router.post('/lifecycle/policies', superAdminOnly, async (req, res) => {
  try {
    const { collection, retentionDays, action, dateField, priority } = req.body || {};
    if (!collection || !retentionDays) {
      return res
        .status(400)
        .json({ success: false, error: 'collection and retentionDays required' });
    }
    const policy = await lifecycleManager.setPolicy(collection, {
      retentionDays,
      action,
      dateField,
      priority,
    });
    res.json({ success: true, data: policy });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** DELETE /api/db-admin/lifecycle/policies/:collection */
router.delete('/lifecycle/policies/:collection', superAdminOnly, async (req, res) => {
  try {
    await lifecycleManager.removePolicy(req.params.collection);
    res.json({ success: true, message: `Policy removed for ${req.params.collection}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/lifecycle/init-defaults */
router.post('/lifecycle/init-defaults', superAdminOnly, async (req, res) => {
  try {
    const count = await lifecycleManager.initDefaultPolicies();
    res.json({ success: true, data: { policiesCreated: count } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/lifecycle/process */
router.post('/lifecycle/process', superAdminOnly, async (req, res) => {
  try {
    const { dryRun } = req.body || {};
    const result = await lifecycleManager.process({ dryRun });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** POST /api/db-admin/lifecycle/create-ttl-indexes */
router.post('/lifecycle/create-ttl-indexes', superAdminOnly, async (req, res) => {
  try {
    const results = await lifecycleManager.createTTLIndexes();
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/lifecycle/aging/:collection */
router.get('/lifecycle/aging/:collection', superAdminOnly, async (req, res) => {
  try {
    const dist = await lifecycleManager.getAgingDistribution(req.params.collection, {
      dateField: req.query.dateField,
    });
    res.json({ success: true, data: dist });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/lifecycle/upcoming-expirations */
router.get('/lifecycle/upcoming-expirations', superAdminOnly, async (req, res) => {
  try {
    const upcoming = await lifecycleManager.getUpcomingExpirations(
      parseInt(req.query.withinDays) || 30
    );
    res.json({ success: true, data: upcoming });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /api/db-admin/lifecycle/metrics */
router.get('/lifecycle/metrics', superAdminOnly, async (req, res) => {
  try {
    const metrics = lifecycleManager.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
