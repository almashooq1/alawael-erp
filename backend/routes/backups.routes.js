/**
 * ═══════════════════════════════════════════════════════════════════════
 * BACKUP MANAGEMENT API ROUTES
 * مسارات API لإدارة النسخ الاحتياطية
 * ═══════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();

const enhancedBackup = require('../services/enhanced-backup.service');
const backupMonitoring = require('../services/backup-monitoring.service');
const multiLocationStorage = require('../services/backup-multi-location.service');

// Middleware for authentication and authorization
const authenticate = (req, res, next) => {
  // Implement your authentication logic here
  if (req.user && ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ error: 'Unauthorized' });
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * 1. BACKUP CREATION & MANAGEMENT
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * POST /api/backups/create
 * Create a new backup
 */
router.post('/create', authenticate, async (req, res) => {
  try {
    const { type = 'FULL', description = '' } = req.body;

    const backup = await enhancedBackup.createBackup({
      type,
      description,
      triggeredBy: req.user.id,
      compress: true,
      encrypt: true,
      verify: true,
    });

    res.json({
      success: true,
      message: 'Backup created successfully',
      backup,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/backups/list
 * List all backups with optional filtering
 */
router.get('/list', authenticate, async (req, res) => {
  try {
    const { type, status, startDate, endDate, limit = 50 } = req.query;

    const backups = await enhancedBackup.listBackups({
      type,
      status,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      count: backups.length,
      backups: backups.slice(0, limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/backups/:backupId
 * Get backup details
 */
router.get('/:backupId', authenticate, async (req, res) => {
  try {
    const backup = await enhancedBackup.getBackupDetails(req.params.backupId);

    res.json({
      success: true,
      backup,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/backups/:backupId/restore
 * Restore from a backup
 */
router.post('/:backupId/restore', authenticate, async (req, res) => {
  try {
    const { force = false, verify = true } = req.body;

    const result = await enhancedBackup.restoreBackup(req.params.backupId, {
      force,
      verify,
    });

    res.json({
      success: true,
      message: 'Restore completed successfully',
      result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/backups/:backupId
 * Delete a backup
 */
router.delete('/:backupId', authenticate, async (req, res) => {
  try {
    const success = await enhancedBackup.deleteBackup(req.params.backupId);

    res.json({
      success,
      message: success ? 'Backup deleted successfully' : 'Backup not found',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════════
 * 2. MONITORING & HEALTH
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * GET /api/backups/health/status
 * Get backup system health status
 */
router.get('/health/status', authenticate, async (req, res) => {
  try {
    const health = await backupMonitoring.checkHealth();

    res.json({
      success: true,
      health,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/backups/metrics
 * Get backup metrics and statistics
 */
router.get('/metrics/current', authenticate, async (req, res) => {
  try {
    const metrics = backupMonitoring.getMetrics();

    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/backups/stats
 * Get detailed backup statistics
 */
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const stats = await enhancedBackup.getBackupStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/backups/report
 * Get backup report for specified period
 */
router.get('/report/summary', authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const report = await backupMonitoring.getBackupReport(parseInt(days));

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════════
 * 3. VALIDATION & VERIFICATION
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * POST /api/backups/:backupId/validate
 * Validate backup integrity
 */
router.post('/:backupId/validate', authenticate, async (req, res) => {
  try {
    const validation = await backupMonitoring.validateBackup(req.params.backupId);

    res.json({
      success: true,
      validation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════════
 * 4. ALERTS & NOTIFICATIONS
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * GET /api/backups/alerts/active
 * Get active alerts
 */
router.get('/alerts/active', authenticate, async (req, res) => {
  try {
    const alerts = backupMonitoring.getActiveAlerts();

    res.json({
      success: true,
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/backups/alerts/:alertId/resolve
 * Resolve an alert
 */
router.post('/alerts/:alertId/resolve', authenticate, async (req, res) => {
  try {
    const { resolution = '' } = req.body;

    const alert = backupMonitoring.resolveAlert(req.params.alertId, resolution);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    res.json({
      success: true,
      message: 'Alert resolved',
      alert,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════════
 * 5. MULTI-LOCATION STORAGE MANAGEMENT
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * GET /api/backups/storage/locations
 * List all configured storage locations
 */
router.get('/storage/locations', authenticate, async (req, res) => {
  try {
    const locations = Array.from(multiLocationStorage.storageLocations.values()).map(loc => ({
      name: loc.name,
      type: loc.type,
      enabled: loc.enabled,
      priority: loc.priority,
      status: loc.status,
      failureCount: loc.failureCount,
    }));

    res.json({
      success: true,
      locations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/backups/storage/stats
 * Get storage statistics
 */
router.get('/storage/stats', authenticate, async (req, res) => {
  try {
    const stats = await multiLocationStorage.getStorageStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/backups/:backupId/replicate
 * Replicate backup to all locations
 */
router.post('/:backupId/replicate', authenticate, async (req, res) => {
  try {
    const { sourceLocation = null } = req.body;

    const results = await multiLocationStorage.replicateBackup(req.params.backupId, sourceLocation);

    res.json({
      success: true,
      message: 'Replication completed',
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════════
 * 6. SCHEDULING & AUTOMATION
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * POST /api/backups/schedule/start
 * Start automated backup scheduling
 */
router.post('/schedule/start', authenticate, async (req, res) => {
  try {
    const { cronExpression = '0 2 * * *' } = req.body;

    enhancedBackup.scheduleBackups(cronExpression);

    res.json({
      success: true,
      message: 'Backup scheduling started',
      schedule: cronExpression,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════════
 * 7. WEBHOOKS & STREAMING
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * GET /api/backups/events/stream
 * Server-Sent Events stream for backup events (optional)
 */
router.get('/events/stream', authenticate, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (eventName, data) => {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Listen to backup events
  enhancedBackup.on('backup:started', (data) => sendEvent('backup:started', data));
  enhancedBackup.on('backup:progress', (data) => sendEvent('backup:progress', data));
  enhancedBackup.on('backup:completed', (data) => sendEvent('backup:completed', data));
  enhancedBackup.on('backup:failed', (data) => sendEvent('backup:failed', data));

  backupMonitoring.on('alert:created', (data) => sendEvent('alert:created', data));
  backupMonitoring.on('health:checked', (data) => sendEvent('health:checked', data));

  // Clean up on disconnect
  req.on('close', () => {
    // Remove listeners
  });
});

/**
 * Error handler
 */
router.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({
    success: false,
    error: error.message || 'Internal Server Error',
  });
});

module.exports = router;
