/**
 * Automated Backup Configuration
 * نظام النسخ الاحتياطي التلقائي
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
const BACKUP_RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10);

// Ensure backup directory exists
const ensureBackupDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 Created backup directory: ${BACKUP_DIR}`);
  }
};

// MongoDB Backup
const backupMongoDB = () => {
  return new Promise((resolve, reject) => {
    ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `mongodb-backup-${timestamp}.gz`);

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';

    const command = `mongodump --uri="${mongoUri}" --archive="${backupFile}" --gzip`;

    console.log(`🔄 Starting MongoDB backup...`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Backup failed: ${error.message}`);
        reject(error);
        return;
      }

      console.log(`✅ MongoDB backup completed: ${backupFile}`);
      resolve(backupFile);
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
    console.log(`🗑️  Deleted ${deletedCount} old backup(s)`);
  }
};

// Schedule daily backups
const scheduleBackups = () => {
  if (process.env.ENABLE_AUTO_BACKUP !== 'true') {
    console.log('ℹ️  Auto-backup disabled (set ENABLE_AUTO_BACKUP=true to enable)');
    return;
  }

  console.log(`📅 Scheduled daily backups (retention: ${BACKUP_RETENTION_DAYS} days)`);

  // Run backup every 24 hours
  const BACKUP_INTERVAL = 24 * 60 * 60 * 1000;

  setInterval(async () => {
    try {
      await backupMongoDB();
      cleanOldBackups();
    } catch (error) {
      console.error('❌ Scheduled backup failed:', error.message);
    }
  }, BACKUP_INTERVAL);

  // Run initial backup after 5 minutes
  setTimeout(
    async () => {
      try {
        await backupMongoDB();
        cleanOldBackups();
      } catch (error) {
        console.error('❌ Initial backup failed:', error.message);
      }
    },
    5 * 60 * 1000
  );
};

module.exports = {
  backupMongoDB,
  cleanOldBackups,
  scheduleBackups,
  ensureBackupDir,
};
