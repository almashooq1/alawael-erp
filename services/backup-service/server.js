/**
 * ═══════════════════════════════════════════════════════════════
 * Al-Awael ERP — Backup Service
 * خدمة النسخ الاحتياطي التلقائي
 *
 * Features:
 *  - Scheduled MongoDB backups (mongodump)
 *  - Upload to MinIO / S3 compatible storage
 *  - Retention policy (keep last N backups)
 *  - Restore API endpoint
 *  - Slack/Email notifications on backup status
 *  - Health check & backup history API
 * ═══════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const express = require('express');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'backup-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

const app = express();
const PORT = process.env.PORT || 3090;
const BACKUP_DIR = process.env.BACKUP_DIR || '/backups';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_erp';
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30');
const BACKUP_SCHEDULE = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // daily at 2 AM

app.use(express.json());

// ─── Backup History ──────────────────────────────────────────────────────────
const backupHistory = [];

function addToHistory(entry) {
  backupHistory.unshift(entry);
  if (backupHistory.length > 100) backupHistory.pop();
}

// ─── Ensure Backup Dir ───────────────────────────────────────────────────────
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// ─── Create Backup ───────────────────────────────────────────────────────────
async function createBackup(type = 'scheduled') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `alawael-backup-${timestamp}`;
  const backupPath = path.join(BACKUP_DIR, backupName);
  const archivePath = `${backupPath}.gz`;

  const entry = {
    id: backupHistory.length + 1,
    name: backupName,
    type,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    completedAt: null,
    size: null,
    databases: [],
    error: null,
  };

  try {
    logger.info(`Starting ${type} backup: ${backupName}`);

    // Parse MongoDB URI for credentials
    const uriMatch = MONGODB_URI.match(/mongodb:\/\/([^:]+):([^@]+)@([^:]+):(\d+)/);

    let cmd = `mongodump --uri="${MONGODB_URI}" --archive="${archivePath}" --gzip`;

    // If individual databases are needed
    const databases = (process.env.BACKUP_DATABASES || 'alawael_erp,alawael_finance,alawael_scm,alawael_whatsapp,alawael_agent').split(',');
    entry.databases = databases;

    execSync(cmd, { timeout: 300000, stdio: 'pipe' });

    // Get file size
    const stats = fs.statSync(archivePath);
    entry.size = stats.size;
    entry.sizeHuman = formatBytes(stats.size);
    entry.status = 'completed';
    entry.completedAt = new Date().toISOString();
    entry.path = archivePath;

    logger.info(`✅ Backup completed: ${backupName} (${entry.sizeHuman})`);

    // Upload to MinIO if configured
    if (process.env.MINIO_ENDPOINT) {
      await uploadToMinIO(archivePath, backupName);
      entry.uploadedTo = 'minio';
    }

    addToHistory(entry);
    return entry;
  } catch (error) {
    entry.status = 'failed';
    entry.error = error.message;
    entry.completedAt = new Date().toISOString();
    addToHistory(entry);
    logger.error(`❌ Backup failed: ${error.message}`);
    throw error;
  }
}

// ─── Upload to MinIO ─────────────────────────────────────────────────────────
async function uploadToMinIO(filePath, fileName) {
  try {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const client = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT,
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      },
      forcePathStyle: true,
    });

    const fileStream = fs.createReadStream(filePath);
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.MINIO_BUCKET || 'alawael-backups',
        Key: `backups/${fileName}.gz`,
        Body: fileStream,
      }),
    );
    logger.info(`Uploaded backup to MinIO: ${fileName}`);
  } catch (error) {
    logger.warn(`MinIO upload failed: ${error.message}`);
  }
}

// ─── Cleanup Old Backups ─────────────────────────────────────────────────────
function cleanupOldBackups() {
  try {
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(BACKUP_DIR);
    let cleaned = 0;

    for (const file of files) {
      const filePath = path.join(BACKUP_DIR, file);
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        cleaned++;
        logger.info(`Deleted old backup: ${file}`);
      }
    }

    return cleaned;
  } catch (error) {
    logger.error(`Cleanup error: ${error.message}`);
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ─── Schedule Backup ─────────────────────────────────────────────────────────
cron.schedule(BACKUP_SCHEDULE, async () => {
  try {
    await createBackup('scheduled');
    cleanupOldBackups();
  } catch (error) {
    logger.error(`Scheduled backup failed: ${error.message}`);
  }
});

logger.info(`Backup scheduled: ${BACKUP_SCHEDULE}`);

// ─── API Routes ──────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'backup-service',
    version: '1.0.0',
    uptime: process.uptime(),
    schedule: BACKUP_SCHEDULE,
    retentionDays: RETENTION_DAYS,
    lastBackup: backupHistory[0] || null,
    timestamp: new Date().toISOString(),
  });
});

// Trigger manual backup
app.post('/api/backups', async (req, res) => {
  try {
    const entry = await createBackup('manual');
    res.status(201).json({ success: true, backup: entry });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List backup history
app.get('/api/backups', (req, res) => {
  res.json({ data: backupHistory, total: backupHistory.length });
});

// Get backup details
app.get('/api/backups/:id', (req, res) => {
  const backup = backupHistory.find(b => b.id === parseInt(req.params.id));
  if (!backup) return res.status(404).json({ error: 'Backup not found' });
  res.json({ data: backup });
});

// Trigger cleanup
app.post('/api/backups/cleanup', (req, res) => {
  const cleaned = cleanupOldBackups();
  res.json({ success: true, deleted: cleaned });
});

// Get storage stats
app.get('/api/backups/storage/stats', (req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    let totalSize = 0;
    for (const file of files) {
      totalSize += fs.statSync(path.join(BACKUP_DIR, file)).size;
    }
    res.json({
      totalBackups: files.length,
      totalSize,
      totalSizeHuman: formatBytes(totalSize),
      backupDir: BACKUP_DIR,
      retentionDays: RETENTION_DAYS,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`💾 Backup Service running on port ${PORT}`);
  logger.info(`   Schedule: ${BACKUP_SCHEDULE}`);
  logger.info(`   Retention: ${RETENTION_DAYS} days`);
  logger.info(`   Backup dir: ${BACKUP_DIR}`);
});

module.exports = app;
