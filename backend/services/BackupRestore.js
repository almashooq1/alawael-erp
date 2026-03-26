/* eslint-disable no-unused-vars */
/**
 * ============================================
 * BACKUP & RESTORE SERVICE
 * خدمة النسخ الاحتياطية واستعادة البيانات
 * ============================================
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { S3Client, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const logger = require('../utils/logger');

const execFilePromise = promisify(execFile);

class BackupRestoreService {
  constructor() {
    this.backupDir = process.env.BACKUP_STORAGE_PATH || './backups';

    // Initialize AWS S3
    this.s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    this.s3Bucket = process.env.AWS_S3_BUCKET;
  }

  /**
   * 1️⃣ LOCAL BACKUP OPERATIONS
   */

  // Create Local Database Backup
  async createLocalBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup-${timestamp}.json`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });

      // Get database name
      const dbName = mongoose.connection.name;

      // Export database command
      const mongoUri = process.env.MONGODB_URI;
      await execFilePromise('mongodump', ['--uri', mongoUri, '--archive=' + backupPath]);

      // Get file size
      const stats = await fs.stat(backupPath);
      const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      return {
        success: true,
        backupPath: backupPath,
        fileName: backupFileName,
        timestamp: new Date(),
        fileSize: `${fileSizeInMB} MB`,
        location: 'LOCAL',
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Compress Backup File
  async compressBackup(backupPath) {
    try {
      const compressedPath = backupPath + '.gz';
      const source = await fs.readFile(backupPath);
      const compressed = await new Promise((resolve, reject) => {
        zlib.gzip(source, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      await fs.writeFile(compressedPath, compressed);

      // Delete original file
      await fs.unlink(backupPath);

      return compressedPath;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Restore from Local Backup
  async restoreFromLocalBackup(backupFileName) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);

      // Check if file exists
      const fileStats = await fs.stat(backupPath);
      if (!fileStats.isFile()) {
        throw new Error('Backup file not found');
      }

      // Decompress if necessary
      let restorePath = backupPath;
      if (backupFileName.endsWith('.gz')) {
        restorePath = backupFileName.slice(0, -3); // Remove .gz
        const compressed = await fs.readFile(backupPath);
        const decompressed = await new Promise((resolve, reject) => {
          zlib.gunzip(compressed, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
        await fs.writeFile(restorePath, decompressed);
      }

      // Restore command
      const mongoUri = process.env.MONGODB_URI;
      await execFilePromise('mongorestore', ['--uri', mongoUri, '--archive=' + restorePath]);

      return {
        success: true,
        message: 'Database restored successfully',
        timestamp: new Date(),
        source: backupFileName,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * 2️⃣ CLOUD BACKUP (AWS S3)
   */

  // Upload Backup to S3
  async uploadBackupToS3(backupPath, fileName) {
    try {
      const fileContent = await fs.readFile(backupPath);

      const params = {
        Bucket: this.s3Bucket,
        Key: `backups/${new Date().getFullYear()}/${fileName}`,
        Body: fileContent,
        ContentType: 'application/octet-stream',
        Metadata: {
          'backup-date': new Date().toISOString(),
          'backup-type': 'database-full',
        },
      };

      const upload = new Upload({ client: this.s3, params });
      const result = await upload.done();

      return {
        success: true,
        s3Key: result.Key,
        s3Url: result.Location,
        etag: result.ETag,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Download Backup from S3
  async downloadBackupFromS3(s3Key) {
    try {
      const params = {
        Bucket: this.s3Bucket,
        Key: s3Key,
      };

      const result = await this.s3.send(new GetObjectCommand(params));

      const localPath = path.join(this.backupDir, path.basename(s3Key));

      // Ensure directory exists
      await fs.mkdir(this.backupDir, { recursive: true });

      // Write file - Body is a stream in v3
      const chunks = [];
      for await (const chunk of result.Body) {
        chunks.push(chunk);
      }
      await fs.writeFile(localPath, Buffer.concat(chunks));

      return {
        success: true,
        localPath: localPath,
        fileSize: result.ContentLength,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // List Backups in S3
  async listS3Backups(prefix = 'backups/') {
    try {
      const params = {
        Bucket: this.s3Bucket,
        Prefix: prefix,
      };

      const result = await this.s3.send(new ListObjectsV2Command(params));

      return {
        success: true,
        backups: (result.Contents || []).map(item => ({
          key: item.Key,
          size: `${(item.Size / (1024 * 1024)).toFixed(2)} MB`,
          lastModified: item.LastModified,
          storageClass: item.StorageClass,
        })),
        total: result.Contents?.length || 0,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * 3️⃣ SCHEDULED BACKUPS
   */

  // Setup Auto Backup Schedule
  setupAutoBackupSchedule() {
    const schedule = require('node-schedule');

    // Daily backup at 2 AM
    schedule.scheduleJob('0 2 * * *', async () => {
      try {
        // Create backup
        const backup = await this.createLocalBackup();

        // Compress backup
        const compressedPath = await this.compressBackup(backup.backupPath);

        // Upload to S3
        const s3Result = await this.uploadBackupToS3(compressedPath, path.basename(compressedPath));

        // Cleanup old local backups (keep last 7 days)
        await this.cleanupOldBackups(7);
      } catch (error) {
        logger.error(`❌ Auto backup failed: ${error.message}`);
        // Send alert/notification
      }
    });

    // Weekly full backup at Sunday 1 AM
    schedule.scheduleJob('0 1 * * 0', async () => {
      try {
        // Similar process with full backup flag
      } catch (error) {
        logger.error(`❌ Weekly backup failed: ${error.message}`);
      }
    });
  }

  /**
   * 4️⃣ BACKUP MAINTENANCE
   */

  // List Local Backups
  async listLocalBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);

        backups.push({
          fileName: file,
          size: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
          created: stats.birthtime,
          modified: stats.mtime,
        });
      }

      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Cleanup Old Backups
  async cleanupOldBackups(daysToKeep = 30) {
    try {
      const files = await fs.readdir(this.backupDir);
      const cutoffDate = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffDate) {
          await fs.unlink(filePath);
        }
      }

      return {
        success: true,
        message: `Backups older than ${daysToKeep} days deleted`,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * 5️⃣ BACKUP VERIFICATION
   */

  // Verify Backup Integrity
  async verifyBackupIntegrity(backupPath) {
    try {
      // Try to restore to test database
      const testDbUri =
        process.env.MONGODB_TEST_URI || process.env.MONGODB_URI.replace('?', '_test?');

      const { stdout } = await execFilePromise('mongorestore', [
        '--uri',
        testDbUri,
        '--archive=' + backupPath,
        '--dryRun',
      ]);

      return {
        success: true,
        message: 'Backup integrity verified',
        details: stdout,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Backup integrity check failed',
        error: 'حدث خطأ داخلي',
      };
    }
  }

  /**
   * 6️⃣ BACKUP REPORTS
   */

  // Get Backup Report
  async getBackupReport() {
    try {
      const localBackups = await this.listLocalBackups();
      const s3Backups = await this.listS3Backups();

      return {
        timestamp: new Date(),
        local: {
          count: localBackups.length,
          backups: localBackups,
          totalSize:
            localBackups
              .reduce((sum, b) => {
                const size = parseFloat(b.size);
                return sum + size;
              }, 0)
              .toFixed(2) + ' MB',
        },
        cloud: s3Backups,
        backup_schedule: {
          daily: '02:00 (2 AM)',
          weekly: '01:00 Sunday',
          retention: '30 days',
        },
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = new BackupRestoreService();
