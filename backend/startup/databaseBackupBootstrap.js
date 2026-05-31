'use strict';

/**
 * databaseBackupBootstrap.js — Wave 676.
 *
 * Wires a scheduled MongoDB backup producer so the daily DR drill
 * (`scripts/dr-verify.js`, workflow `🛡️ DR Drill (daily)`) finds a recent
 * backup instead of failing with `no_backup_found`.
 *
 * ROOT CAUSE (diagnosed 2026-05-31): the production VPS had NO backup
 * producer — `services/automated-backup.service.js` was dormant (never wired
 * into app.js / startup / any scheduler) and no in-app backup cron existed —
 * so `dr-verify.js` scanned both `BACKUP_DIR` (backend/backups) and
 * `DB_BACKUP_DIR` (backups/mongodb) and found nothing. The DR drill failed for
 * 3+ consecutive days (and OPS_ALERT_* recipients were unset, so the failures
 * were silent).
 *
 * This runs the proven `scripts/db-backup.js` `createBackup()` — which writes a
 * `backup_<label>_<ts>` directory to `DB_BACKUP_DIR || backups/mongodb`, the
 * EXACT directory + `backup_*` naming that dr-verify's SECONDARY check scans —
 * on a daily cron, then prunes old backups via `cleanupOldBackups()`.
 *
 * GATED OFF BY DEFAULT. The capability ships inert; nothing runs until an
 * operator opts in AND confirms the host prerequisites:
 *   • `mongodump` installed on the host (db-backup.js checks this and fails
 *     loudly if absent),
 *   • `DB_BACKUP_DIR` (or default backups/mongodb) writable by the app user.
 *
 * Env:
 *   ENABLE_DB_BACKUP_CRON    — 'true' to schedule (default: OFF)
 *   DB_BACKUP_CRON_SCHEDULE  — cron expr (default '0 2 * * *' = daily 02:00)
 *   DB_BACKUP_KEEP_DAYS      — retention days (db-backup.js default: 30)
 *   DB_BACKUP_DIR            — backup output dir (default: backups/mongodb)
 */

function loadOptional(modulePath) {
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

function wireDatabaseBackup(app, deps = {}) {
  const { logger } = deps;
  if (!logger) {
    throw new Error('databaseBackupBootstrap.wireDatabaseBackup: logger required');
  }

  if (process.env.ENABLE_DB_BACKUP_CRON !== 'true') {
    logger.info('[startup] DB backup cron disabled (set ENABLE_DB_BACKUP_CRON=true to schedule)');
    return { scheduled: false };
  }

  const cron = loadOptional('node-cron');
  if (!cron) {
    logger.warn('[startup] node-cron not available; DB backup cron not scheduled');
    return { scheduled: false };
  }

  const schedule = process.env.DB_BACKUP_CRON_SCHEDULE || '0 2 * * *';
  const TZ = { timezone: 'Asia/Riyadh' };

  cron.schedule(
    schedule,
    async () => {
      try {
        // Lazy-require so a backup-script load error can't break app boot.
        const { createBackup, cleanupOldBackups } = require('../scripts/db-backup');
        logger.info('[db-backup] scheduled backup starting');
        const res = await createBackup({ label: 'cron' });
        if (res && res.success) {
          logger.info(
            `[db-backup] backup complete: ${(res.meta && res.meta.backupName) || res.backupPath}`
          );
        } else {
          logger.error(`[db-backup] backup failed: ${(res && res.error) || 'unknown error'}`);
        }
        try {
          const pruned = cleanupOldBackups();
          logger.info(`[db-backup] retention prune: ${pruned ? pruned.deleted : 0} removed`);
        } catch (pruneErr) {
          logger.error('[db-backup] retention prune failed', pruneErr);
        }
      } catch (err) {
        logger.error('[db-backup] scheduled backup failed', err);
      }
    },
    TZ
  );

  logger.info(`[startup] W676 DB backup cron scheduled (${schedule} Asia/Riyadh)`);
  return { scheduled: true };
}

module.exports = { wireDatabaseBackup };
