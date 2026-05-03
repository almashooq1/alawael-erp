/**
 * Automated Backup Configuration
 * نظام النسخ الاحتياطي التلقائي
 */

const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Acquire a distributed lock via Redis SET NX EX.
 * Returns true if the lock was obtained, false otherwise.
 */
const acquireBackupLock = async (ttlSeconds = 3600) => {
  try {
    const redis = require('./redis');
    const client = redis.getClient ? redis.getClient() : redis;
    if (!client || typeof client.set !== 'function') return true; // no Redis → allow
    const result = await client.set('backup:lock', process.pid.toString(), 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch {
    // Redis unavailable — allow backup to proceed (single-instance fallback)
    return true;
  }
};

const releaseBackupLock = async () => {
  try {
    const redis = require('./redis');
    const client = redis.getClient ? redis.getClient() : redis;
    if (client && typeof client.del === 'function') {
      await client.del('backup:lock');
    }
  } catch {
    /* ignore */
  }
};

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
const BACKUP_RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10);

// Ensure backup directory exists
const ensureBackupDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    // console.log(`📁 Created backup directory: ${BACKUP_DIR}`);
  }
};

// MongoDB Backup
//
// If BACKUP_ENCRYPTION_KEY is set, the gzip archive is encrypted in-place
// with AES-256-GCM (output: `<file>.gz.enc`, plaintext deleted on success).
// PDPL/NPHIES require encryption-at-rest for healthcare PII.
const backupMongoDB = () => {
  return new Promise((resolve, reject) => {
    ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `mongodb-backup-${timestamp}.gz`);

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';

    // Use execFile to prevent command injection via mongoUri
    const args = ['--uri', mongoUri, '--archive', backupFile, '--gzip'];

    execFile('mongodump', args, async (error, _stdout, _stderr) => {
      if (error) {
        logger.error('Backup failed:', { error: error.message });
        return reject(error);
      }

      const keyHex = process.env.BACKUP_ENCRYPTION_KEY;
      if (!keyHex) {
        return resolve(backupFile);
      }

      try {
        const { encryptFile } = require('../utils/backup-crypto');
        const encryptedFile = `${backupFile}.enc`;
        const meta = await encryptFile({
          inputPath: backupFile,
          outputPath: encryptedFile,
          keyHex,
        });
        fs.unlinkSync(backupFile); // remove plaintext
        logger.info('Backup encrypted', {
          file: encryptedFile,
          plaintextBytes: meta.plaintextBytes,
          ciphertextBytes: meta.ciphertextBytes,
          durationMs: meta.durationMs,
        });
        resolve(encryptedFile);
      } catch (encErr) {
        logger.error('Backup encryption failed — keeping plaintext archive', {
          error: encErr.message,
        });
        // Reject so the scheduler triggers ops-alerter — a plaintext archive
        // sitting on disk when encryption was supposed to run is a security
        // incident, not a non-event.
        reject(encErr);
      }
    });
  });
};

// Clean old backups
const cleanOldBackups = () => {
  ensureBackupDir();

  const files = fs.readdirSync(BACKUP_DIR);
  const now = Date.now();
  const retentionMs = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  let deletedCount = 0;

  files.forEach(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    const age = now - stats.mtimeMs;

    if (age > retentionMs) {
      fs.unlinkSync(filePath);
      deletedCount++;
    }
  });

  if (deletedCount > 0) {
    // console.log(`🗑️  Deleted ${deletedCount} old backup(s)`);
  }
};

// Schedule daily backups
const scheduleBackups = () => {
  if (process.env.ENABLE_AUTO_BACKUP !== 'true') {
    // console.log('ℹ️  Auto-backup disabled (set ENABLE_AUTO_BACKUP=true to enable)');
    return;
  }

  // console.log(`📅 Scheduled daily backups (retention: ${BACKUP_RETENTION_DAYS} days)`);

  // Run backup every 24 hours
  const BACKUP_INTERVAL = 24 * 60 * 60 * 1000;

  const runOnce = async label => {
    const locked = await acquireBackupLock();
    if (!locked) {
      logger.info(`${label} backup skipped — another instance holds the lock`);
      return;
    }
    try {
      await backupMongoDB();
      cleanOldBackups();
    } catch (error) {
      logger.error(`${label} backup failed:`, { error: error.message });
      try {
        const { sendOpsAlert } = require('../services/ops-alerter');
        await sendOpsAlert({
          kind: 'backup_failed',
          severity: 'critical',
          subject: `فشل ${label} للنسخ الاحتياطي`,
          body: `فشل النسخ الاحتياطي المجدول. السبب: ${error.message}`,
          metadata: { label, error: error.message },
        });
      } catch (alertErr) {
        logger.error('Backup alert dispatch failed:', { error: alertErr.message });
      }
    } finally {
      await releaseBackupLock();
    }
  };

  setInterval(() => runOnce('Scheduled'), BACKUP_INTERVAL);

  // Run initial backup after 5 minutes
  setTimeout(() => runOnce('Initial'), 5 * 60 * 1000);
};

module.exports = {
  backupMongoDB,
  cleanOldBackups,
  scheduleBackups,
  ensureBackupDir,
};
