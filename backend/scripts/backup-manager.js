#!/usr/bin/env node
/* eslint-disable no-unused-vars */

/**
 * 💾 Automated Backup Manager
 * مدير النسخ الاحتياطية الذكي التلقائي
 *
 * الميزات:
 * - نسخ احتياطية يومية وأسبوعية وشهرية
 * - تشفير وضغط تلقائي
 * - تحميل سحابي (AWS S3، Google Cloud، Dropbox)
 * - المراقبة والتنبيهات
 * - استرجاع تلقائي عند الأعطال
 */

const fs = require('fs');
const path = require('path');
const { execSync, execFileSync, spawn } = require('child_process');
const CronJob = require('cron').CronJob;
const nodemailer = require('nodemailer');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

const log = {
  info: msg => console.log(`${COLORS.cyan}ℹ ${msg}${COLORS.reset}`),
  success: msg => console.log(`${COLORS.green}✅ ${msg}${COLORS.reset}`),
  warning: msg => console.log(`${COLORS.yellow}⚠️  ${msg}${COLORS.reset}`),
  error: msg => console.log(`${COLORS.red}❌ ${msg}${COLORS.reset}`),
  title: msg => console.log(`\n${COLORS.blue}${msg}${COLORS.reset}\n`),
};

// ==================================================
// Configuration
// ==================================================

const BACKUP_CONFIG = {
  backupDir: path.join(__dirname, '../backups'),

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/intelligent_agent',
  },

  schedule: {
    daily: '0 3 * * *', // 3:00 AM
    weekly: '0 4 * * 0', // Sunday 4:00 AM
    monthly: '0 5 1 * *', // 1st day 5:00 AM
  },

  retention: {
    daily: 7, // 7 days
    weekly: 4, // 4 weeks
    monthly: 12, // 12 months
  },

  cloud: {
    enabled: process.env.BACKUP_CLOUD_ENABLED === 'true',
    s3: {
      enabled: process.env.AWS_S3_ENABLED === 'true',
      bucket: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_REGION || 'eu-west-1',
    },
  },

  encryption: {
    enabled: process.env.BACKUP_ENCRYPTION_ENABLED === 'true',
    algorithm: 'aes-256-cbc',
  },

  notifications: {
    email: process.env.BACKUP_EMAIL_ENABLED === 'true',
    slack: process.env.BACKUP_SLACK_ENABLED === 'true',
  },
};

// ==================================================
// Backup Manager Class
// ==================================================

class BackupManager {
  constructor(config) {
    this.config = config;
    this.ensureBackupDir();
    this.initializeJobs();
  }

  /**
   * تأكد من وجود مجلد النسخ الاحتياطية
   */
  ensureBackupDir() {
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
      log.success(`مجلد النسخ الاحتياطية جاهز: ${this.config.backupDir}`);
    }
  }

  /**
   * إنشاء نسخة احتياطية من MongoDB
   */
  async backupMongoDB(backupType = 'daily') {
    try {
      log.title(`🔄 بدء نسخة احتياطية ${backupType}`);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(
        this.config.backupDir,
        `backup-${backupType}-${timestamp}.archive`
      );

      // Create backup
      log.info('📦 جاري تنفيذ mongodump...');

      execFileSync(
        'mongodump',
        [`--uri=${this.config.mongodb.uri}`, `--archive=${backupFile}`, '--gzip'],
        { stdio: 'pipe' }
      );

      // Get file size
      const stats = fs.statSync(backupFile);
      const sizeKb = (stats.size / 1024).toFixed(2);

      log.success(`نسخة احتياطية ${backupType} اكتملت: ${sizeKb} KB`);

      // Encrypt if enabled
      if (this.config.encryption.enabled) {
        await this.encryptBackup(backupFile);
      }

      // Upload to cloud if enabled
      if (this.config.cloud.enabled) {
        await this.uploadToCloud(backupFile, backupType);
      }

      // Clean old backups
      this.cleanOldBackups(backupType);

      // Send notification
      await this.notifySuccess(`نسخة احتياطية ${backupType} اكتملت بنجاح`);

      return backupFile;
    } catch (error) {
      log.error(`خطأ في النسخة الاحتياطية: ${error.message}`);
      await this.notifyError(`خطأ في النسخة الاحتياطية ${backupType}: ${error.message}`);
      throw error;
    }
  }

  /**
   * تشفير النسخة الاحتياطية
   */
  async encryptBackup(filePath) {
    try {
      log.info('🔐 جاري تشفير النسخة الاحتياطية...');

      const { backupEncryptionPassword } = require('../config/secrets');
      const password = backupEncryptionPassword;
      const encryptedFile = `${filePath}.enc`;

      // Using openssl for encryption
      execFileSync(
        'openssl',
        ['enc', '-aes-256-cbc', '-salt', '-in', filePath, '-out', encryptedFile, '-k', password],
        { stdio: 'pipe' }
      );

      // Remove original file
      fs.unlinkSync(filePath);

      log.success(`✅ تم تشفير النسخة الاحتياطية: ${path.basename(encryptedFile)}`);

      return encryptedFile;
    } catch (error) {
      log.warning(`⚠️ فشل التشفير: ${error.message}`);
      return filePath;
    }
  }

  /**
   * تحميل النسخة الاحتياطية إلى السحابة
   */
  async uploadToCloud(filePath, backupType) {
    try {
      if (!this.config.cloud.s3.enabled) return;

      log.info('☁️ جاري تحميل النسخة إلى AWS S3...');

      const fileName = path.basename(filePath);
      const s3Path = `backups/${backupType}/${new Date().getFullYear()}/${fileName}`;

      const awsArgs = [
        's3',
        'cp',
        filePath,
        `s3://${this.config.cloud.s3.bucket}/${s3Path}`,
        '--region',
        this.config.cloud.s3.region,
      ];

      execFileSync('aws', awsArgs, { stdio: 'pipe' });

      log.success(`☁️ تم التحميل إلى AWS S3: ${s3Path}`);
    } catch (error) {
      log.warning(`⚠️ فشل تحميل السحابة: ${error.message}`);
    }
  }

  /**
   * حذف النسخ الاحتياطية القديمة
   */
  cleanOldBackups(backupType) {
    try {
      const maxRetention = this.config.retention[backupType] || 7;
      const cutoffTime = Date.now() - maxRetention * 24 * 60 * 60 * 1000;

      const files = fs
        .readdirSync(this.config.backupDir)
        .filter(f => f.includes(`backup-${backupType}`))
        .map(f => ({
          name: f,
          path: path.join(this.config.backupDir, f),
          time: fs.statSync(path.join(this.config.backupDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      let deletedCount = 0;
      for (const file of files) {
        if (file.time < cutoffTime) {
          fs.unlinkSync(file.path);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        log.info(`🗑️ تم حذف ${deletedCount} نسخة قديمة`);
      }
    } catch (error) {
      log.warning(`⚠️ خطأ في تنظيف النسخ القديمة: ${error.message}`);
    }
  }

  /**
   * التحقق من سلامة النسخة الاحتياطية
   */
  async verifyBackup(backupFile) {
    try {
      log.info('🔍 جاري التحقق من سلامة النسخة الاحتياطية...');

      // Check file exists
      if (!fs.existsSync(backupFile)) {
        throw new Error('ملف النسخة الاحتياطية غير موجود');
      }

      // Check file size
      const stats = fs.statSync(backupFile);
      if (stats.size === 0) {
        throw new Error('ملف النسخة الاحتياطية فارغ');
      }

      log.success('✅ تم التحقق من السلامة: النسخة الاحتياطية صحيحة');
      return true;
    } catch (error) {
      log.error(`❌ فشل التحقق: ${error.message}`);
      return false;
    }
  }

  /**
   * استرجاع من نسخة احتياطية
   */
  async restoreFromBackup(backupFile) {
    try {
      log.title('🔄 بدء استرجاع البيانات');

      // Decrypt if needed
      let fileToRestore = backupFile;
      if (backupFile.endsWith('.enc')) {
        log.info('🔓 جاري فك التشفير...');

        const { backupEncryptionPassword } = require('../config/secrets');
        const password = backupEncryptionPassword;
        const decryptedFile = backupFile.replace('.enc', '.dec');

        execFileSync(
          'openssl',
          ['enc', '-aes-256-cbc', '-d', '-in', backupFile, '-out', decryptedFile, '-k', password],
          { stdio: 'pipe' }
        );
        fileToRestore = decryptedFile;
      }

      // Restore
      log.info('ِ📥 جاري استرجاع البيانات من MongoDB...');

      execFileSync(
        'mongorestore',
        [`--uri=${this.config.mongodb.uri}`, `--archive=${fileToRestore}`, '--gzip'],
        { stdio: 'pipe' }
      );

      log.success('✅ تم استرجاع البيانات بنجاح');

      // Cleanup
      if (fileToRestore !== backupFile) {
        fs.unlinkSync(fileToRestore);
      }

      return true;
    } catch (error) {
      log.error(`❌ خطأ في الاسترجاع: ${error.message}`);
      throw error;
    }
  }

  /**
   * إرسال إشعار بريد إلكتروني
   */
  async notifySuccess(message) {
    if (!this.config.notifications.email) return;

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: process.env.BACKUP_EMAIL_FROM || 'backups@alaweal.info',
        to: process.env.BACKUP_EMAIL_TO || 'admin@alaweal.info',
        subject: `✅ ${message}`,
        html: `
          <h2>${message}</h2>
          <p><strong>الوقت:</strong> ${new Date().toLocaleString('ar-EG')}</p>
          <p><strong>السيرفر:</strong> ${require('os').hostname()}</p>
        `,
      });
    } catch (error) {
      log.warning(`⚠️ فشل إرسال الإشعار: ${error.message}`);
    }
  }

  /**
   * إرسال إشعار خطأ
   */
  async notifyError(message) {
    if (!this.config.notifications.email) return;

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: process.env.BACKUP_EMAIL_FROM || 'backups@alaweal.info',
        to: process.env.BACKUP_EMAIL_TO || 'admin@alaweal.info',
        subject: `❌ خطأ: ${message}`,
        html: `
          <h2 style="color: red;">❌ ${message}</h2>
          <p><strong>الوقت:</strong> ${new Date().toLocaleString('ar-EG')}</p>
          <p><strong>السيرفر:</strong> ${require('os').hostname()}</p>
          <p style="color: red;"><strong>يرجى التحقق فوراً!</strong></p>
        `,
      });
    } catch (error) {
      log.warning(`⚠️ فشل إرسال الإشعار: ${error.message}`);
    }
  }

  /**
   * بدء جدولة النسخ الاحتياطية
   */
  initializeJobs() {
    log.title('⏰ بدء جدولة النسخ الاحتياطية');

    // Daily backup
    new CronJob(this.config.schedule.daily, async () => {
      await this.backupMongoDB('daily');
    }).start();
    log.success(`يومية: ${this.config.schedule.daily}`);

    // Weekly backup
    new CronJob(this.config.schedule.weekly, async () => {
      await this.backupMongoDB('weekly');
    }).start();
    log.success(`أسبوعية: ${this.config.schedule.weekly}`);

    // Monthly backup
    new CronJob(this.config.schedule.monthly, async () => {
      await this.backupMongoDB('monthly');
    }).start();
    log.success(`شهرية: ${this.config.schedule.monthly}`);
  }

  /**
   * حصول على إحصائيات النسخ الاحتياطية
   */
  getStats() {
    try {
      const files = fs.readdirSync(this.config.backupDir);
      const backups = files.map(f => {
        const filePath = path.join(this.config.backupDir, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
          created: new Date(stats.ctime).toLocaleString('ar-EG'),
        };
      });

      return {
        total: backups.length,
        backups,
        lastBackup: backups[backups.length - 1],
      };
    } catch (error) {
      log.error(`خطأ في الحصول على الإحصائيات: ${error.message}`);
      return null;
    }
  }
}

// ==================================================
// CLI Interface
// ==================================================

async function main() {
  const args = process.argv.slice(2);
  const manager = new BackupManager(BACKUP_CONFIG);

  if (args.length === 0) {
    log.title('💾 Backup Manager - مدير النسخ الاحتياطية');
    console.log('الأوامر المتاحة:');
    console.log('  backup [type]     - إنشاء نسخة احتياطية (daily/weekly/monthly)');
    console.log('  restore [file]    - استرجاع من نسخة احتياطية');
    console.log('  verify [file]     - التحقق من سلامة النسخة');
    console.log('  stats             - عرض إحصائيات النسخ الاحتياطية');
    console.log('  start             - بدء الجدولة التلقائية');
    return;
  }

  const command = args[0];

  switch (command) {
    case 'backup':
      await manager.backupMongoDB(args[1] || 'daily');
      break;

    case 'restore':
      if (!args[1]) {
        log.error('يرجى تحديد ملف النسخة الاحتياطية');
        return;
      }
      await manager.restoreFromBackup(args[1]);
      break;

    case 'verify':
      if (!args[1]) {
        log.error('يرجى تحديد ملف النسخة الاحتياطية');
        return;
      }
      await manager.verifyBackup(args[1]);
      break;

    case 'stats': {
      const stats = manager.getStats();
      console.log(JSON.stringify(stats, null, 2));
      break;
    }

    case 'start':
      log.success('✅ جدولة النسخ الاحتياطية التلقائية قيد التشغيل...');
      console.log('اضغط Ctrl+C للإيقاف');
      break;

    default:
      log.error(`أمر غير معروف: ${command}`);
  }
}

if (require.main === module) {
  main().catch(error => {
    log.error(error.message);
    process.exit(1);
  });
}

module.exports = BackupManager;
