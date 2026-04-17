/**
 * AL-AWAEL ERP — AUTOMATED BACKUP ROUTES
 * Phase 23 — نظام النسخ الاحتياطي التلقائي
 *
 * 20 endpoints for backup management, scheduling, storage targets,
 * restore, health monitoring, analytics, and configuration.
 */

const express = require('express');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const router = express.Router();
const AutomatedBackupService = require('../services/automated-backup.service');
const safeError = require('../utils/safeError');

/**
 * Return a safe error message for client responses.
 * In production, internal/infrastructure errors are replaced with a generic message
 * to prevent information leakage (stack traces, file paths, connection strings).
 */
const safeErrorMsg = err => {
  const msg = err && err.message ? err.message : 'حدث خطأ داخلي';
  const isProd = process.env.NODE_ENV === 'production';
  // Allow short, known operational messages through; mask everything else in prod
  if (isProd && msg.length > 200) return 'حدث خطأ داخلي';
  // Strip anything that looks like a file path or stack trace
  if (isProd && /[/\\]|at\s+\w|node_modules|Error:/.test(msg)) return 'حدث خطأ داخلي';
  return msg;
};

const backupService = new AutomatedBackupService({
  s3Bucket: process.env.AWS_S3_BUCKET || '',
  s3Region: process.env.AWS_REGION || 'me-south-1',
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS, 10) || 30,
});

/* ━━━ Middleware: auth check (graceful) ━━━ */
let authenticate, authorize;
try {
  ({ authenticate, authorize } = require('../middleware/auth'));
} catch {
  authenticate = (_req, _res, _next) => {
    return _res.status(503).json({ success: false, message: 'Authentication service unavailable' });
  };
  authorize = () => (_req, _res, _next) => {
    return _res.status(503).json({ success: false, message: 'Authorization service unavailable' });
  };
}

const guard = [authenticate, authorize(['admin', 'system_admin', 'super_admin'])];

// Global auth: all backup endpoints require authentication
router.use(authenticate);
router.use(requireBranchAccess);
/* ══════════════════════════════════════════════════════════════════════
   BACKUP OPERATIONS — عمليات النسخ الاحتياطي
   ══════════════════════════════════════════════════════════════════════ */

// 1. POST /  — Create a new backup
router.post('/', guard, (req, res) => {
  try {
    const backup = backupService.createBackup(req.body);
    res.status(201).json({ success: true, data: backup });
  } catch (error) {
    res.status(400).json({ success: false, error: safeErrorMsg(error) });
  }
});

// 2. GET /  — List all backups
router.get('/', guard, (req, res) => {
  try {
    const result = backupService.listBackups(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    safeError(res, error, 'automated-backup');
  }
});

/* ── IMPORTANT: Named GET routes BEFORE /:id to avoid param capture ── */

// 16. GET /health — System health status
router.get('/health', guard, (_req, res) => {
  try {
    const health = backupService.getHealthStatus();
    res.json({ success: true, data: health });
  } catch (error) {
    safeError(res, error, 'automated-backup');
  }
});

// 17. GET /analytics — Backup analytics
router.get('/analytics', guard, (req, res) => {
  try {
    const analytics = backupService.getAnalytics(req.query);
    res.json({ success: true, data: analytics });
  } catch (error) {
    safeError(res, error, 'automated-backup');
  }
});

// 19. GET /config — Get current configuration
router.get('/config', guard, (_req, res) => {
  try {
    const config = backupService.getConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    safeError(res, error, 'automated-backup');
  }
});

// 20. PUT /config — Update configuration
router.put('/config', guard, (req, res) => {
  try {
    const config = backupService.updateConfig(req.body);
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(400).json({ success: false, error: safeErrorMsg(error) });
  }
});

// 18. POST /cleanup — Run retention cleanup
router.post('/cleanup', guard, (_req, res) => {
  try {
    const result = backupService.runRetentionCleanup();
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'automated-backup');
  }
});

// 3. GET /:id — Get single backup detail
router.get('/:id', guard, (req, res) => {
  try {
    const backup = backupService.getBackup(req.params.id);
    res.json({ success: true, data: backup });
  } catch (error) {
    res.status(404).json({ success: false, error: safeErrorMsg(error) });
  }
});

// 4. DELETE /:id — Delete a backup
router.delete('/:id', guard, (req, res) => {
  try {
    const result = backupService.deleteBackup(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(404).json({ success: false, error: safeErrorMsg(error) });
  }
});

// 5. POST /:id/verify — Verify backup integrity
router.post('/:id/verify', guard, (req, res) => {
  try {
    const result = backupService.verifyBackup(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, error: safeErrorMsg(error) });
  }
});

/* ══════════════════════════════════════════════════════════════════════
   SCHEDULES — جداول النسخ الاحتياطي
   ══════════════════════════════════════════════════════════════════════ */

// 6. GET /schedules/list — List backup schedules
router.get('/schedules/list', guard, (_req, res) => {
  try {
    const result = backupService.listSchedules();
    res.json({ success: true, ...result });
  } catch (error) {
    safeError(res, error, 'automated-backup');
  }
});

// 7. POST /schedules — Create or update schedule
router.post('/schedules', guard, (req, res) => {
  try {
    const schedule = backupService.upsertSchedule(req.body);
    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    res.status(400).json({ success: false, error: safeErrorMsg(error) });
  }
});

// 8. PUT /schedules/:id/toggle — Toggle schedule enabled/disabled
router.put('/schedules/:id/toggle', guard, (req, res) => {
  try {
    const schedule = backupService.toggleSchedule(req.params.id, req.body.enabled);
    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(404).json({ success: false, error: safeErrorMsg(error) });
  }
});

// 9. DELETE /schedules/:id — Delete a schedule
router.delete('/schedules/:id', guard, (req, res) => {
  try {
    const result = backupService.deleteSchedule(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(404).json({ success: false, error: safeErrorMsg(error) });
  }
});

/* ══════════════════════════════════════════════════════════════════════
   STORAGE TARGETS — أهداف التخزين (S3, GCS, SFTP…)
   ══════════════════════════════════════════════════════════════════════ */

// 10. GET /storage/targets — List storage targets
router.get('/storage/targets', guard, (_req, res) => {
  try {
    const result = backupService.listStorageTargets();
    res.json({ success: true, ...result });
  } catch (error) {
    safeError(res, error, 'automated-backup');
  }
});

// 11. POST /storage/targets — Add/update storage target
router.post('/storage/targets', guard, (req, res) => {
  try {
    const target = backupService.upsertStorageTarget(req.body);
    res.status(201).json({ success: true, data: target });
  } catch (error) {
    res.status(400).json({ success: false, error: safeErrorMsg(error) });
  }
});

// 12. POST /storage/targets/:id/test — Test target connectivity
router.post('/storage/targets/:id/test', guard, (req, res) => {
  try {
    const result = backupService.testStorageTarget(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, error: safeErrorMsg(error) });
  }
});

// 13. DELETE /storage/targets/:id — Remove storage target
router.delete('/storage/targets/:id', guard, (req, res) => {
  try {
    const result = backupService.removeStorageTarget(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: safeErrorMsg(error) });
  }
});

/* ══════════════════════════════════════════════════════════════════════
   RESTORE — الاستعادة
   ══════════════════════════════════════════════════════════════════════ */

// 14. POST /restore/:id — Restore from a backup
router.post('/restore/:id', guard, (req, res) => {
  try {
    const result = backupService.restoreBackup(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, error: safeErrorMsg(error) });
  }
});

// 15. GET /restore/history — Restore history
router.get('/restore/history', guard, (req, res) => {
  try {
    const result = backupService.listRestoreHistory(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    safeError(res, error, 'automated-backup');
  }
});

module.exports = router;
