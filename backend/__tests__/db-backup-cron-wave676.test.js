'use strict';

/**
 * W676 drift guard — databaseBackupBootstrap.
 *
 * Locks the DB-backup-cron wiring that closes the DR-drill `no_backup_found`
 * gap (dormant automated-backup service + no in-app backup producer → 3-day
 * DR-verify failure, diagnosed 2026-05-31):
 *   • bootstrap is GATED OFF by default — returns { scheduled:false } unless
 *     ENABLE_DB_BACKUP_CRON==='true' (inert on deploy, zero prod risk)
 *   • requires logger; throws without it
 *   • drives the proven scripts/db-backup.js createBackup + cleanupOldBackups
 *     (writes backup_* to DB_BACKUP_DIR || backups/mongodb — the exact dir +
 *     naming dr-verify.js SECONDARY scans)
 *   • Asia/Riyadh, node-cron via loadOptional, lazy-require inside the tick
 *   • wired into app.js
 *
 * Pure static reads + an inert behavioral call (never schedules / never shells
 * out to mongodump).
 */

const fs = require('fs');
const path = require('path');

const BOOT_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'databaseBackupBootstrap.js'),
  'utf8'
);
const APP_SRC = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

describe('W676 databaseBackupBootstrap — source shape', () => {
  it('is env-gated on ENABLE_DB_BACKUP_CRON', () => {
    expect(BOOT_SRC).toMatch(/process\.env\.ENABLE_DB_BACKUP_CRON\s*!==\s*'true'/);
  });
  it('drives the proven db-backup script (createBackup + cleanupOldBackups)', () => {
    expect(BOOT_SRC).toMatch(/require\(\s*'\.\.\/scripts\/db-backup'\s*\)/);
    expect(BOOT_SRC).toMatch(/createBackup/);
    expect(BOOT_SRC).toMatch(/cleanupOldBackups/);
  });
  it('schedules via node-cron loaded optionally, Asia/Riyadh', () => {
    expect(BOOT_SRC).toMatch(/loadOptional\(\s*'node-cron'\s*\)/);
    expect(BOOT_SRC).toMatch(/timezone:\s*'Asia\/Riyadh'/);
  });
  it('exports wireDatabaseBackup', () => {
    expect(BOOT_SRC).toMatch(/module\.exports\s*=\s*\{\s*wireDatabaseBackup\s*\}/);
  });
});

describe('W676 databaseBackupBootstrap — inert default behavior', () => {
  const { wireDatabaseBackup } = require('../startup/databaseBackupBootstrap');
  const silentLogger = { info: () => {}, warn: () => {}, error: () => {} };

  it('throws without a logger', () => {
    expect(() => wireDatabaseBackup({}, {})).toThrow(/logger required/);
  });

  it('does NOT schedule when ENABLE_DB_BACKUP_CRON is unset (inert default)', () => {
    const prev = process.env.ENABLE_DB_BACKUP_CRON;
    delete process.env.ENABLE_DB_BACKUP_CRON;
    try {
      const res = wireDatabaseBackup({}, { logger: silentLogger });
      expect(res).toEqual({ scheduled: false });
    } finally {
      if (prev !== undefined) process.env.ENABLE_DB_BACKUP_CRON = prev;
    }
  });
});

describe('W676 — wired into app.js', () => {
  it('app.js calls wireDatabaseBackup', () => {
    expect(APP_SRC).toMatch(
      /databaseBackupBootstrap'\)\.wireDatabaseBackup\(app,\s*\{\s*logger\s*\}\)/
    );
  });
});

describe('W737 — backup failure fires a durable ops alert', () => {
  it('both failure branches call safeOpsAlert (no more silent log-only failure)', () => {
    // the soft-fail (res.success false) branch + the thrown-exception branch
    const alertCalls = (BOOT_SRC.match(/safeOpsAlert\(/g) || []).length;
    expect(alertCalls).toBeGreaterThanOrEqual(3); // 1 def + 2 call sites
  });
  it('safeOpsAlert lazy-requires ops-alerter and is fully swallowed', () => {
    expect(BOOT_SRC).toMatch(/require\(\s*'\.\.\/services\/ops-alerter'\s*\)/);
    expect(BOOT_SRC).toMatch(/async function safeOpsAlert/);
    expect(BOOT_SRC).toMatch(/ops-alert dispatch failed \(swallowed\)/);
  });
  it('alerts are critical severity + kind=backup_failed', () => {
    expect(BOOT_SRC).toMatch(/kind:\s*'backup_failed'/);
    expect(BOOT_SRC).toMatch(/severity:\s*'critical'/);
  });
});
