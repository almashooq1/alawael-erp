/**
 * واجهة API لإدارة قاعدة البيانات - Database Management Routes
 * نظام الألوائل للتأهيل وإعادة التأهيل
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const DatabaseMigrationService = require('../services/database-migration-service');
const DatabaseBackupService = require('../services/database-backup-service');
const { seedDatabase, clearDatabase } = require('../database/seeders/database-seeder');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// حماية جميع مسارات قاعدة البيانات - Admin/System Admin فقط
router.use(authenticate);
router.use(authorize(['admin', 'system_admin']));

// تهيئة الخدمات
let migrationService = null;
let backupService = null;

// middleware للتهيئة
async function initServices(req, res, next) {
  try {
    if (!migrationService) {
      migrationService = new DatabaseMigrationService();
      await migrationService.initialize(mongoose.connection);
    }
    if (!backupService) {
      backupService = new DatabaseBackupService();
      await backupService.initialize();
    }
    next();
  } catch (error) {
    next(error);
  }
}

router.use(initServices);

// ==========================================
// إدارة الترحيلات
// ==========================================

// الحصول على جميع الترحيلات
router.get('/migrations', async (req, res) => {
  try {
    const migrations = await migrationService.getMigrations();
    res.json({ success: true, data: migrations });
  } catch (error) {
    safeError(res, error, 'database');
  }
});

// الحصول على الترحيلات المعلقة
router.get('/migrations/pending', async (req, res) => {
  try {
    const pending = await migrationService.getPendingMigrations();
    res.json({ success: true, data: pending });
  } catch (error) {
    safeError(res, error, 'database');
  }
});

// إحصائيات الترحيلات
router.get('/migrations/stats', async (req, res) => {
  try {
    const stats = await migrationService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    safeError(res, error, 'database');
  }
});

// إنشاء ترحيل جديد
router.post('/migrations/create', async (req, res) => {
  try {
    const { name, description } = req.body;
    const migration = await migrationService.createMigration(name, { description });
    res.json({ success: true, data: migration });
  } catch (error) {
    safeError(res, error, 'database');
  }
});

// تنفيذ ترحيل محدد
router.post('/migrations/run/:name', async (req, res) => {
  try {
    const result = await migrationService.runMigration(req.params.name, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'database');
  }
});

// تنفيذ جميع الترحيلات المعلقة
router.post('/migrations/run-pending', async (req, res) => {
  try {
    const results = await migrationService.runPendingMigrations(req.body);
    res.json({ success: true, data: results });
  } catch (error) {
    safeError(res, error, 'database');
  }
});

// التراجع عن ترحيل
router.post('/migrations/rollback/:name', async (req, res) => {
  try {
    const result = await migrationService.rollback(req.params.name, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'database');
  }
});

// التحقق من صحة الترحيلات
router.get('/migrations/verify', async (req, res) => {
  try {
    const verification = await migrationService.verifyMigrations();
    res.json({ success: true, data: verification });
  } catch (error) {
    safeError(res, error, 'database');
  }
});

// ==========================================
// إدارة النسخ الاحتياطية
// ==========================================

// إنشاء نسخة احتياطية
router.post('/backup', async (req, res) => {
  try {
    const backup = await backupService.createFullBackup(req.body);
    res.json({ success: true, data: backup });
  } catch (error) {
    safeError(res, error, 'database');
  }
});

// قائمة النسخ الاحتياطية
router.get('/backup/list', async (req, res) => {
  try {
    const backups = await backupService.listBackups(req.query);
    res.json({ success: true, data: backups });
  } catch (error) {
    safeError(res, error, 'database');
  }
});

// معلومات نسخة احتياطية
router.get('/backup/info', async (req, res) => {
  try {
    const info = await backupService.getBackupInfo(req.query.path);
    res.json({ success: true, data: info });
  } catch (error) {
    safeError(res, error, 'database');
  }
});

// استعادة نسخة احتياطية
router.post('/backup/restore', async (req, res) => {
  try {
    const result = await backupService.restoreBackup(req.body.path, req.body.options);
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'database');
  }
});

// إحصائيات النسخ الاحتياطية
router.get('/backup/stats', async (req, res) => {
  try {
    const stats = await backupService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    safeError(res, error, 'database');
  }
});

// تنظيف النسخ القديمة
router.post('/backup/cleanup', async (req, res) => {
  try {
    const result = await backupService.cleanupOldBackups();
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'database');
  }
});

// ==========================================
// إدارة البيانات
// ==========================================

// زرع البيانات التجريبية
router.post('/seed', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res
      .status(403)
      .json({ success: false, message: 'Database seeding is disabled in production' });
  }
  try {
    const result = await seedDatabase();
    res.json({ success: true, data: result });
  } catch (error) {
    safeError(res, error, 'database');
  }
});

// مسح جميع البيانات
router.delete('/clear', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res
      .status(403)
      .json({ success: false, message: 'Database clear is disabled in production' });
  }
  if (req.body.confirm !== 'DELETE_ALL_DATA') {
    return res
      .status(400)
      .json({ success: false, message: 'Confirmation required: { "confirm": "DELETE_ALL_DATA" }' });
  }
  try {
    await clearDatabase();
    res.json({ success: true, message: 'تم مسح جميع البيانات' });
  } catch (error) {
    safeError(res, error, 'database');
  }
});

// ==========================================
// معلومات قاعدة البيانات
// ==========================================

// حالة قاعدة البيانات
router.get('/status', async (req, res) => {
  try {
    const db = mongoose.connection.db;

    // معلومات الاتصال
    const connectionStatus = mongoose.connection.readyState;
    const statusMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    // إحصائيات قاعدة البيانات
    const stats = await db.stats();
    const collections = await db.listCollections().toArray();

    // حجم كل مجموعة
    const collectionStats = [];
    for (const col of collections) {
      try {
        const colStats = await db.collection(col.name).stats();
        collectionStats.push({
          name: col.name,
          count: colStats.count,
          size: colStats.size,
          avgObjSize: colStats.avgObjSize,
        });
      } catch (e) {
        logger.warn(`Failed to get stats for collection ${col.name}:`, e.message);
      }
    }

    res.json({
      success: true,
      data: {
        connection: {
          status: statusMap[connectionStatus],
          host: mongoose.connection.host,
          name: mongoose.connection.name,
        },
        database: {
          name: stats.db,
          collections: stats.collections,
          views: stats.views || 0,
          objects: stats.objects,
          dataSize: stats.dataSize,
          indexSize: stats.indexSize,
          totalSize: stats.dataSize + stats.indexSize,
        },
        collections: collectionStats,
      },
    });
  } catch (error) {
    safeError(res, error, 'database');
  }
});

// فحص الصحة
router.get('/health', async (req, res) => {
  try {
    const db = mongoose.connection.db;

    // تنفيذ أمر ping
    await db.admin().ping();

    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime(),
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        error: 'حدث خطأ في الخادم',
      },
    });
  }
});

module.exports = router;
