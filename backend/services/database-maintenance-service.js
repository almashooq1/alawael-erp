/* eslint-disable no-unused-vars, no-undef, no-empty, prefer-const, no-constant-condition, no-unused-expressions */
/**
 * خدمة الصيانة التلقائية لقاعدة البيانات - Database Maintenance Service
 * نظام الألوائل للتأهيل وإعادة التأهيل
 */

const mongoose = require('mongoose');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class DatabaseMaintenanceService {
  constructor() {
    this.isRunning = false;
    this.tasks = [];
    this.logs = [];
    this.config = {
      logRetention: 30, // أيام
      tempFilesRetention: 7, // أيام
      indexRebuildInterval: '0 3 * * 0', // 3 صباحاً كل أحد
      cleanupInterval: '0 4 * * *', // 4 صباحاً يومياً
      optimizeInterval: '0 5 * * 6', // 5 صباحاً كل سبت
      statsInterval: '0 */6 * * *', // كل 6 ساعات
    };
  }

  // تهيئة الخدمة
  async initialize() {
    logger.info('🔧 تهيئة خدمة صيانة قاعدة البيانات...');

    // جدولة المهام
    this.scheduleTasks();

    this.isRunning = true;
    this.log('info', 'تم تهيئة خدمة الصيانة بنجاح');

    return true;
  }

  // جدولة المهام
  scheduleTasks() {
    // إعادة بناء الفهارس
    this.tasks.push({
      name: 'indexRebuild',
      task: cron.schedule(this.config.indexRebuildInterval, () => this.rebuildIndexes(), {
        timezone: 'Asia/Riyadh',
      }),
    });

    // تنظيف البيانات القديمة
    this.tasks.push({
      name: 'cleanup',
      task: cron.schedule(this.config.cleanupInterval, () => this.cleanupOldData(), {
        timezone: 'Asia/Riyadh',
      }),
    });

    // تحسين الأداء
    this.tasks.push({
      name: 'optimize',
      task: cron.schedule(this.config.optimizeInterval, () => this.optimizeDatabase(), {
        timezone: 'Asia/Riyadh',
      }),
    });

    // جمع الإحصائيات
    this.tasks.push({
      name: 'stats',
      task: cron.schedule(this.config.statsInterval, () => this.collectStats(), {
        timezone: 'Asia/Riyadh',
      }),
    });

    this.log('info', `تم جدولة ${this.tasks.length} مهام صيانة`);
  }

  // إعادة بناء الفهارس
  async rebuildIndexes() {
    this.log('info', 'بدء إعادة بناء الفهارس...');

    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      const results = [];

      for (const col of collections) {
        try {
          const collection = db.collection(col.name);
          await collection.reIndex();
          results.push({ collection: col.name, status: 'success' });
          this.log('info', `تم إعادة بناء فهارس: ${col.name}`);
        } catch (error) {
          results.push({ collection: col.name, status: 'error', error: 'حدث خطأ داخلي' });
          this.log('error', 'حدث خطأ داخلي');
        }
      }

      this.log(
        'info',
        `اكتملت إعادة بناء الفهارس: ${results.filter(r => r.status === 'success').length}/${results.length}`
      );
      return results;
    } catch (error) {
      this.log('error', 'حدث خطأ داخلي');
      throw error;
    }
  }

  // تنظيف البيانات القديمة
  async cleanupOldData() {
    this.log('info', 'بدء تنظيف البيانات القديمة...');

    try {
      const db = mongoose.connection.db;
      const results = {
        logs: 0,
        tempFiles: 0,
        expiredSessions: 0,
        oldNotifications: 0,
      };

      // 1. تنظيف السجلات القديمة
      const logCutoff = new Date();
      logCutoff.setDate(logCutoff.getDate() - this.config.logRetention);

      const systemLogCollection = db.collection('systemlogs');
      if (systemLogCollection) {
        const logResult = await systemLogCollection.deleteMany({
          timestamp: { $lt: logCutoff },
        });
        results.logs = logResult.deletedCount;
      }

      // 2. تنظيف الجلسات المنتهية
      const sessionsCollection = db.collection('sessions');
      if (sessionsCollection) {
        const sessionResult = await sessionsCollection.deleteMany({
          expires: { $lt: new Date() },
        });
        results.expiredSessions = sessionResult.deletedCount;
      }

      // 3. تنظيف الإشعارات القديمة
      const notificationsCollection = db.collection('notifications');
      if (notificationsCollection) {
        const notifCutoff = new Date();
        notifCutoff.setDate(notifCutoff.getDate() - 90); // 90 يوم

        const notifResult = await notificationsCollection.deleteMany({
          createdAt: { $lt: notifCutoff },
          read: true,
        });
        results.oldNotifications = notifResult.deletedCount;
      }

      // 4. تنظيف الملفات المؤقتة
      const tempDir = path.join(process.cwd(), 'temp');
      try {
        const files = await fs.readdir(tempDir);
        const tempCutoff = new Date();
        tempCutoff.setDate(tempCutoff.getDate() - this.config.tempFilesRetention);

        for (const file of files) {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime < tempCutoff) {
            await fs.unlink(filePath);
            results.tempFiles++;
          }
        }
      } catch (_e) {
        logger.warn('Temp directory not found or inaccessible during cleanup');
      }

      this.log(
        'info',
        `تم تنظيف: ${results.logs} سجل، ${results.expiredSessions} جلسة، ${results.oldNotifications} إشعار، ${results.tempFiles} ملف مؤقت`
      );
      return results;
    } catch (error) {
      this.log('error', 'حدث خطأ داخلي');
      throw error;
    }
  }

  // تحسين قاعدة البيانات
  async optimizeDatabase() {
    this.log('info', 'بدء تحسين قاعدة البيانات...');

    try {
      const db = mongoose.connection.db;
      const results = [];

      // 1. ضغط قاعدة البيانات
      try {
        await db.command({ compact: 'admin' });
        results.push({ task: 'compact', status: 'success' });
      } catch (e) {
        logger.warn('Database compact (admin) failed:', e.message);
        results.push({ task: 'compact', status: 'failed', error: e.message });
      }

      // 2. تحسين التخزين لكل مجموعة
      const collections = await db.listCollections().toArray();

      for (const col of collections) {
        try {
          const collection = db.collection(col.name);
          const stats = await collection.stats();

          // إذا كان هناك أكثر من 10% مساحة فارغة
          if (
            stats.padding > 1.5 ||
            (stats.storageSize && stats.size && stats.storageSize > stats.size * 1.3)
          ) {
            await db.command({ compact: col.name });
            results.push({ collection: col.name, task: 'compact', status: 'success' });
          }
        } catch (e) {
          logger.warn(`Compact failed for collection ${col.name}:`, e.message);
        }
      }

      // 3. تحديث إحصائيات قاعدة البيانات
      try {
        await db.command({ dbStats: 1, scale: 1024 * 1024 });
        results.push({ task: 'stats', status: 'success' });
      } catch (e) {
        logger.warn('Database stats update failed:', e.message);
        results.push({ task: 'stats', status: 'failed', error: e.message });
      }

      this.log('info', `اكتمل التحسين: ${results.length} عملية`);
      return results;
    } catch (error) {
      this.log('error', 'حدث خطأ داخلي');
      throw error;
    }
  }

  // جمع الإحصائيات
  async collectStats() {
    try {
      const db = mongoose.connection.db;

      // إحصائيات الخادم
      const serverStatus = await db.admin().serverStatus();

      // إحصائيات قاعدة البيانات
      const dbStats = await db.stats();

      // إحصائيات المجموعات
      const collections = await db.listCollections().toArray();
      const collectionStats = [];

      for (const col of collections) {
        try {
          const stats = await db.collection(col.name).stats();
          collectionStats.push({
            name: col.name,
            count: stats.count,
            size: stats.size,
            avgObjSize: stats.avgObjSize,
            storageSize: stats.storageSize,
            nindexes: stats.nindexes,
            indexSize: stats.totalIndexSize,
          });
        } catch (e) {
          logger.warn(`Failed to get stats for collection ${col.name}:`, e.message);
        }
      }

      const stats = {
        timestamp: new Date(),
        server: {
          version: serverStatus.version,
          uptime: serverStatus.uptime,
          connections: serverStatus.connections,
          network: serverStatus.network,
          operations: serverStatus.opcounters,
        },
        database: {
          collections: dbStats.collections,
          objects: dbStats.objects,
          dataSize: dbStats.dataSize,
          indexSize: dbStats.indexSize,
          storageSize: dbStats.storageSize,
        },
        collections: collectionStats,
      };

      // حفظ الإحصائيات
      const statsCollection = db.collection('databasestats');
      await statsCollection.insertOne(stats);

      this.log('info', 'تم جمع وحفظ الإحصائيات');
      return stats;
    } catch (error) {
      this.log('error', 'حدث خطأ داخلي');
      throw error;
    }
  }

  // فحص سلامة قاعدة البيانات
  async checkIntegrity() {
    this.log('info', 'بدء فحص سلامة قاعدة البيانات...');

    try {
      const db = mongoose.connection.db;
      const results = {
        status: 'healthy',
        issues: [],
        checks: [],
      };

      // 1. فحص الاتصال
      try {
        await db.admin().ping();
        results.checks.push({ name: 'connection', status: 'ok' });
      } catch (e) {
        results.checks.push({ name: 'connection', status: 'error', message: e.message });
        results.status = 'critical';
      }

      // 2. فحص المساحة
      const stats = await db.stats();
      const freeSpacePercent = 100 - ((stats.dataSize + stats.indexSize) / stats.storageSize) * 100;

      if (freeSpacePercent < 10) {
        results.issues.push({
          type: 'space',
          severity: 'warning',
          message: 'مساحة التخزين منخفضة',
        });
      }
      results.checks.push({ name: 'storage', status: freeSpacePercent > 10 ? 'ok' : 'warning' });

      // 3. فحص الفهارس
      const collections = await db.listCollections().toArray();
      let indexIssues = 0;

      for (const col of collections) {
        try {
          const indexes = await db.collection(col.name).indexes();
          for (const idx of indexes) {
            if (!idx.name || idx.name === '') {
              indexIssues++;
            }
          }
        } catch (e) {
          logger.warn(`Failed to check indexes for collection ${col.name}:`, e.message);
        }
      }

      results.checks.push({ name: 'indexes', status: indexIssues === 0 ? 'ok' : 'warning' });
      if (indexIssues > 0) {
        results.issues.push({
          type: 'indexes',
          severity: 'warning',
          message: `${indexIssues} مشكلة في الفهارس`,
        });
      }

      // 4. فحص العمليات الطويلة
      try {
        const currentOps = await db.admin().command({ currentOp: 1, secs_running: { $gt: 60 } });
        const longOps = currentOps.inprog
          ? currentOps.inprog.filter(op => op.secs_running > 60)
          : [];

        results.checks.push({
          name: 'longOperations',
          status: longOps.length === 0 ? 'ok' : 'warning',
        });
        if (longOps.length > 0) {
          results.issues.push({
            type: 'operations',
            severity: 'info',
            message: `${longOps.length} عمليات طويلة قيد التنفيذ`,
          });
        }
      } catch (e) {
        logger.warn('Failed to check long-running operations:', e.message);
      }

      this.log('info', `فحص السلامة: ${results.status}، ${results.issues.length} مشاكل`);
      return results;
    } catch (error) {
      this.log('error', 'حدث خطأ داخلي');
      throw error;
    }
  }

  // تسجيل الأحداث
  log(level, message) {
    const logEntry = {
      timestamp: new Date(),
      level,
      message,
      service: 'DatabaseMaintenance',
    };

    this.logs.push(logEntry);

    // الاحتفاظ بآخر 1000 سجل
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    logger.info(`[${logEntry.timestamp.toISOString()}] [${level.toUpperCase()}] ${message}`);
  }

  // الحصول على السجلات
  getLogs(options = {}) {
    let logs = [...this.logs];

    if (options.level) {
      logs = logs.filter(l => l.level === options.level);
    }
    if (options.limit) {
      logs = logs.slice(-options.limit);
    }

    return logs;
  }

  // الحصول على حالة المهام
  getTasksStatus() {
    return this.tasks.map(t => ({
      name: t.name,
      running: t.task.running || false,
    }));
  }

  // إيقاف الخدمة
  stop() {
    this.tasks.forEach(t => t.task.stop());
    this.tasks = [];
    this.isRunning = false;
    this.log('info', 'تم إيقاف خدمة الصيانة');
  }
}

module.exports = new DatabaseMaintenanceService();
