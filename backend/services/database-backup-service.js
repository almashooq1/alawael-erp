/* eslint-disable no-unused-vars, no-undef, no-empty, prefer-const, no-constant-condition, no-unused-expressions */
/**
 * خدمة النسخ الاحتياطي - Database Backup Service
 * نظام الألوائل للتأهيل وإعادة التأهيل
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const { createGzip, createGunzip } = require('zlib');
const { pipeline } = require('stream/promises');
const { EventEmitter } = require('events');
const crypto = require('crypto');

class DatabaseBackupService extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      backupDir: config.backupDir || './backups',
      retentionDays: config.retentionDays || 30,
      maxBackups: config.maxBackups || 100,
      compressionEnabled: config.compressionEnabled !== false,
      encryptionEnabled: config.encryptionEnabled || false,
      encryptionKey: config.encryptionKey || process.env.BACKUP_ENCRYPTION_KEY,
      scheduleCron: config.scheduleCron || '0 2 * * *', // يومياً الساعة 2 صباحاً
      ...config,
    };

    this.isRunning = false;
    this.lastBackup = null;
  }

  // تهيئة الخدمة
  async initialize() {
    await this.ensureBackupDir();
    this.emit('initialized');
    return this;
  }

  // التأكد من وجود مجلد النسخ الاحتياطية
  async ensureBackupDir() {
    const dirs = [
      this.config.backupDir,
      path.join(this.config.backupDir, 'daily'),
      path.join(this.config.backupDir, 'weekly'),
      path.join(this.config.backupDir, 'monthly'),
      path.join(this.config.backupDir, 'manual'),
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
      }
    }
  }

  // إنشاء نسخة احتياطية كاملة
  async createFullBackup(options = {}) {
    if (this.isRunning) {
      throw new Error('عملية نسخ احتياطي أخرى قيد التنفيذ');
    }

    this.isRunning = true;
    const startTime = Date.now();
    this.emit('backup:started', { type: 'full', timestamp: new Date() });

    try {
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:T.Z]/g, '')
        .slice(0, 14);
      const backupType = options.type || 'manual';
      const filename = `backup_${backupType}_${timestamp}`;

      // جمع البيانات من جميع المجموعات
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();

      const backupData = {
        metadata: {
          version: '1.0',
          timestamp: new Date(),
          type: backupType,
          collectionsCount: collections.length,
          options,
        },
        collections: {},
        indexes: {},
        validationRules: {},
      };

      for (const col of collections) {
        const collectionName = col.name;

        // جمع البيانات
        const documents = await db.collection(collectionName).find({}).toArray();
        backupData.collections[collectionName] = documents;

        // جمع الفهارس
        const indexes = await db.collection(collectionName).indexes();
        backupData.indexes[collectionName] = indexes;

        this.emit('backup:collection', {
          collection: collectionName,
          documentsCount: documents.length,
        });
      }

      // تحويل إلى JSON
      let content = JSON.stringify(backupData, null, 2);

      // التشفير إذا كان مفعلاً
      if (this.config.encryptionEnabled && this.config.encryptionKey) {
        content = this.encrypt(content);
      }

      // حفظ الملف
      const backupPath = path.join(
        this.config.backupDir,
        backupType,
        `${filename}${this.config.compressionEnabled ? '.gz' : ''}.json`
      );

      if (this.config.compressionEnabled) {
        await fs.writeFile(backupPath, await this.compress(content));
      } else {
        await fs.writeFile(backupPath, content, 'utf8');
      }

      // حساب التحقق
      const checksum = this.calculateChecksum(content);
      await fs.writeFile(`${backupPath}.checksum`, checksum);

      const duration = Date.now() - startTime;
      this.lastBackup = {
        path: backupPath,
        timestamp: new Date(),
        duration,
        size: (await fs.stat(backupPath)).size,
        collectionsCount: collections.length,
      };

      // تنظيف النسخ القديمة
      await this.cleanupOldBackups();

      this.emit('backup:completed', this.lastBackup);
      this.isRunning = false;

      return this.lastBackup;
    } catch (error) {
      this.emit('backup:error', { error, timestamp: new Date() });
      this.isRunning = false;
      throw error;
    }
  }

  // إنشاء نسخة احتياطية تزايدية
  async createIncrementalBackup(lastBackupTimestamp, options = {}) {
    this.emit('backup:started', { type: 'incremental', timestamp: new Date() });

    const db = mongoose.connection.db;
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14);
    const filename = `incremental_${timestamp}`;

    const changes = {
      metadata: {
        version: '1.0',
        timestamp: new Date(),
        type: 'incremental',
        since: lastBackupTimestamp,
      },
      changes: {
        inserted: {},
        updated: {},
        deleted: {},
      },
    };

    // جمع التغييرات من كل مجموعة
    const collections = await db.listCollections().toArray();

    for (const col of collections) {
      const collectionName = col.name;

      // البحث عن المستندات المعدلة
      if (db.collection(collectionName).schema?.paths?.updatedAt) {
        const modified = await db
          .collection(collectionName)
          .find({
            updatedAt: { $gte: new Date(lastBackupTimestamp) },
          })
          .toArray();

        if (modified.length > 0) {
          changes.changes.updated[collectionName] = modified;
        }
      }
    }

    const backupPath = path.join(this.config.backupDir, 'incremental', `${filename}.json`);
    await fs.writeFile(backupPath, JSON.stringify(changes, null, 2), 'utf8');

    this.emit('backup:completed', { path: backupPath, type: 'incremental' });

    return { path: backupPath, type: 'incremental' };
  }

  // استعادة نسخة احتياطية
  async restoreBackup(backupPath, options = {}) {
    this.emit('restore:started', { path: backupPath, timestamp: new Date() });

    try {
      // التحقق من وجود الملف
      await fs.access(backupPath);

      // قراءة الملف
      let content = await fs.readFile(backupPath);

      // فك الضغط إذا كان مضغوطاً
      if (backupPath.endsWith('.gz.json')) {
        content = await this.decompress(content);
      }

      // فك التشفير إذا كان مشفراً
      if (this.config.encryptionEnabled && this.config.encryptionKey) {
        content = this.decrypt(content.toString());
      }

      const backupData = typeof content === 'string' ? JSON.parse(content) : content;

      // التحقق من سلامة البيانات
      if (options.verifyChecksum) {
        const checksumFile = `${backupPath}.checksum`;
        const expectedChecksum = await fs.readFile(checksumFile, 'utf8');
        const actualChecksum = this.calculateChecksum(JSON.stringify(backupData));

        if (expectedChecksum !== actualChecksum) {
          throw new Error('فشل التحقق من سلامة النسخة الاحتياطية');
        }
      }

      const db = mongoose.connection.db;
      const results = {
        collections: {},
        totalDocuments: 0,
        errors: [],
      };

      // استعادة كل مجموعة
      for (const [collectionName, documents] of Object.entries(backupData.collections)) {
        try {
          // حذف البيانات الحالية إذا كان مطلوباً
          if (options.dropExisting !== false) {
            await db.collection(collectionName).deleteMany({});
          }

          // إدراج المستندات
          if (documents.length > 0) {
            await db.collection(collectionName).insertMany(documents);
          }

          results.collections[collectionName] = {
            documentsCount: documents.length,
            success: true,
          };
          results.totalDocuments += documents.length;

          this.emit('restore:collection', {
            collection: collectionName,
            documentsCount: documents.length,
          });
        } catch (error) {
          results.errors.push({
            collection: collectionName,
            error: 'حدث خطأ داخلي',
          });
        }
      }

      // استعادة الفهارس
      if (options.restoreIndexes !== false && backupData.indexes) {
        for (const [collectionName, indexes] of Object.entries(backupData.indexes)) {
          for (const indexDef of indexes) {
            if (indexDef.name !== '_id_') {
              try {
                await db
                  .collection(collectionName)
                  .createIndex(indexDef.key, { ...indexDef, background: true });
              } catch (error) {
                // تجاهل أخطاء الفهارس المكررة
              }
            }
          }
        }
      }

      this.emit('restore:completed', {
        path: backupPath,
        results,
        timestamp: new Date(),
      });

      return results;
    } catch (error) {
      this.emit('restore:error', { error, path: backupPath });
      throw error;
    }
  }

  // قائمة النسخ الاحتياطية
  async listBackups(options = {}) {
    const types = options.type
      ? [options.type]
      : ['daily', 'weekly', 'monthly', 'manual', 'incremental'];
    const backups = [];

    for (const type of types) {
      const typeDir = path.join(this.config.backupDir, type);

      try {
        const files = await fs.readdir(typeDir);

        for (const file of files) {
          if (!file.endsWith('.json') && !file.endsWith('.json.gz')) continue;

          const filepath = path.join(typeDir, file);
          const stats = await fs.stat(filepath);

          backups.push({
            filename: file,
            path: filepath,
            type,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            compressed: file.endsWith('.gz'),
          });
        }
      } catch (error) {
        // تجاهل المجلدات غير الموجودة
      }
    }

    // ترتيب حسب التاريخ
    return backups.sort((a, b) => b.createdAt - a.createdAt);
  }

  // الحصول على معلومات نسخة احتياطية
  async getBackupInfo(backupPath) {
    const stats = await fs.stat(backupPath);
    let content = await fs.readFile(backupPath);

    if (backupPath.endsWith('.gz.json')) {
      content = await this.decompress(content);
    }

    if (this.config.encryptionEnabled && this.config.encryptionKey) {
      content = this.decrypt(content.toString());
    }

    const data = typeof content === 'string' ? JSON.parse(content) : content;

    return {
      path: backupPath,
      size: stats.size,
      createdAt: stats.birthtime,
      metadata: data.metadata,
      collections: Object.keys(data.collections).map(name => ({
        name,
        documentsCount: data.collections[name].length,
      })),
      totalDocuments: Object.values(data.collections).reduce((sum, arr) => sum + arr.length, 0),
    };
  }

  // تنظيف النسخ القديمة
  async cleanupOldBackups() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const backups = await this.listBackups();
    const toDelete = backups.filter(b => b.createdAt < cutoffDate);

    // الاحتفاظ بآخر maxBackups نسخة
    if (backups.length > this.config.maxBackups) {
      const extra = backups.slice(this.config.maxBackups);
      toDelete.push(...extra.filter(b => !toDelete.includes(b)));
    }

    for (const backup of toDelete) {
      try {
        await fs.unlink(backup.path);
        // حذف ملف التحقق أيضاً
        try {
          await fs.unlink(`${backup.path}.checksum`);
        } catch {}

        this.emit('backup:deleted', { path: backup.path });
      } catch (error) {
        this.emit('cleanup:error', { path: backup.path, error });
      }
    }

    return { deletedCount: toDelete.length };
  }

  // جدولة النسخ الاحتياطي
  scheduleBackup(cronExpression, type = 'daily') {
    // يمكن استخدام مكتبة node-cron للجدولة الفعلية
    this.emit('backup:scheduled', { cron: cronExpression, type });
  }

  // ضغط البيانات
  async compress(data) {
    const zlib = require('zlib');
    return new Promise((resolve, reject) => {
      zlib.gzip(Buffer.from(data), (err, compressed) => {
        if (err) reject(err);
        else resolve(compressed);
      });
    });
  }

  // فك الضغط
  async decompress(data) {
    const zlib = require('zlib');
    return new Promise((resolve, reject) => {
      zlib.gunzip(data, (err, decompressed) => {
        if (err) reject(err);
        else resolve(decompressed.toString());
      });
    });
  }

  // تشفير البيانات
  encrypt(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(this.config.encryptionKey, 'hex'),
      iv
    );

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  // فك التشفير
  decrypt(data) {
    const [ivHex, authTagHex, encrypted] = data.split(':');

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(this.config.encryptionKey, 'hex'),
      Buffer.from(ivHex, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // حساب التحقق
  calculateChecksum(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // إحصائيات
  async getStats() {
    const backups = await this.listBackups();
    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

    const byType = {};
    for (const backup of backups) {
      byType[backup.type] = (byType[backup.type] || 0) + 1;
    }

    return {
      totalBackups: backups.length,
      totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      byType,
      lastBackup: this.lastBackup,
      retentionDays: this.config.retentionDays,
      maxBackups: this.config.maxBackups,
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = DatabaseBackupService;
