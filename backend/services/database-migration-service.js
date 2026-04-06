/* eslint-disable no-unused-vars */
/**
 * خدمة ترحيل قاعدة البيانات - Database Migration Service
 * نظام الألوائل للتأهيل وإعادة التأهيل
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class DatabaseMigrationService {
  constructor(config = {}) {
    this.config = {
      migrationsDir: config.migrationsDir || './migrations',
      migrationsCollection: config.migrationsCollection || 'migrations',
      backupDir: config.backupDir || './backups',
      ...config,
    };

    this.connection = null;
    this.Migration = null;
  }

  // تهيئة الخدمة
  async initialize(connection) {
    this.connection = connection || mongoose.connection;

    // إنشاء نموذج الترحيلات
    const migrationSchema = new mongoose.Schema({
      name: { type: String, required: true, unique: true },
      hash: { type: String, required: true },
      executedAt: { type: Date, default: Date.now },
      duration: Number,
      status: { type: String, enum: ['success', 'failed', 'rolled_back'], default: 'success' },
      error: String,
      rollbackScript: String,
    });

    this.Migration = mongoose.models.Migration || mongoose.model('Migration', migrationSchema);

    // التأكد من وجود مجلد الترحيلات
    await this.ensureMigrationsDir();

    return this;
  }

  // التأكد من وجود مجلد الترحيلات
  async ensureMigrationsDir() {
    try {
      await fs.mkdir(this.config.migrationsDir, { recursive: true });
      await fs.mkdir(this.config.backupDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }

  // إنشاء ترحيل جديد
  async createMigration(name, options = {}) {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14);
    const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.js`;
    const filepath = path.join(this.config.migrationsDir, filename);

    const template = `/**
 * الترحيل: ${name}
 * تاريخ الإنشاء: ${new Date().toLocaleString('ar-SA')}
 */

module.exports = {
  // وصف الترحيل
  description: '${options.description || name}',

  // إصدار المخطط المستهدف (زده مع كل ترحيل)
  version: 1,

  // الترحيل للأمام
  async up(db) {
    // ── أمثلة شائعة: ──────────────────────────────────────────────
    // إضافة حقل جديد لجميع المستندات:
    //   await db.collection('users').updateMany({}, { $set: { isActive: true } });
    //
    // إنشاء فهرس:
    //   await db.collection('orders').createIndex({ createdAt: -1 });
    //
    // إعادة تسمية حقل:
    //   await db.collection('employees').updateMany({}, { $rename: { 'fname': 'firstName' } });
    //
    // إضافة مجموعة جديدة مع بيانات أولية:
    //   await db.createCollection('settings');
    //   await db.collection('settings').insertOne({ key: 'version', value: '2.0' });
    // ────────────────────────────────────────────────────────────────

    throw new Error('Migration up() not implemented — replace this with your migration code');
  },

  // التراجع عن الترحيل
  async down(db) {
    // ── أمثلة شائعة: ──────────────────────────────────────────────
    // إزالة حقل:
    //   await db.collection('users').updateMany({}, { $unset: { isActive: '' } });
    //
    // حذف فهرس:
    //   await db.collection('orders').dropIndex('createdAt_-1');
    //
    // التراجع عن إعادة التسمية:
    //   await db.collection('employees').updateMany({}, { $rename: { 'firstName': 'fname' } });
    // ────────────────────────────────────────────────────────────────

    throw new Error('Migration down() not implemented — replace this with your rollback code');
  }
};`;

    await fs.writeFile(filepath, template, 'utf8');

    return {
      filename,
      filepath,
      name: filename.replace('.js', ''),
    };
  }

  // الحصول على قائمة الترحيلات
  async getMigrations() {
    const files = await fs.readdir(this.config.migrationsDir);
    const migrations = files
      .filter(f => f.endsWith('.js'))
      .sort()
      .map(f => f.replace('.js', ''));

    const executed = await this.Migration.find({ status: 'success' }).select('name').lean();
    const executedNames = new Set(executed.map(m => m.name));

    return migrations.map(name => ({
      name,
      executed: executedNames.has(name),
      filepath: path.join(this.config.migrationsDir, `${name}.js`),
    }));
  }

  // الحصول على الترحيلات المعلقة
  async getPendingMigrations() {
    const all = await this.getMigrations();
    return all.filter(m => !m.executed);
  }

  // تنفيذ ترحيل واحد
  async runMigration(migrationName, options = {}) {
    const filepath = path.join(this.config.migrationsDir, `${migrationName}.js`);

    // التحقق من وجود الملف
    try {
      await fs.access(filepath);
    } catch {
      throw new Error(`الترحيل غير موجود: ${migrationName}`);
    }

    // التحقق من عدم تنفيذه مسبقاً
    const existing = await this.Migration.findOne({ name: migrationName });
    if (existing && existing.status === 'success' && !options.force) {
      return { skipped: true, reason: 'already_executed' };
    }

    // قراءة الترحيل
    const migration = require(filepath);
    const hash = this.generateHash(filepath);

    // نسخ احتياطي قبل التنفيذ
    let backupPath = null;
    if (options.backup !== false) {
      backupPath = await this.createBackup(`pre_${migrationName}`);
    }

    const startTime = Date.now();

    try {
      // تنفيذ الترحيل
      await migration.up(this.connection.db);

      // تسجيل النجاح
      await this.Migration.findOneAndUpdate(
        { name: migrationName },
        {
          name: migrationName,
          hash,
          executedAt: new Date(),
          duration: Date.now() - startTime,
          status: 'success',
          rollbackScript: migration.down ? migration.down.toString() : null,
        },
        { upsert: true }
      );

      return {
        success: true,
        name: migrationName,
        duration: Date.now() - startTime,
        backupPath,
      };
    } catch (error) {
      // تسجيل الفشل
      await this.Migration.findOneAndUpdate(
        { name: migrationName },
        {
          name: migrationName,
          hash,
          executedAt: new Date(),
          duration: Date.now() - startTime,
          status: 'failed',
          error: 'حدث خطأ داخلي',
        },
        { upsert: true }
      );

      // استعادة النسخة الاحتياطية إذا كان مطلوباً
      if (options.autoRollback && backupPath) {
        await this.restoreBackup(backupPath);
      }

      throw error;
    }
  }

  // تنفيذ جميع الترحيلات المعلقة
  async runPendingMigrations(options = {}) {
    const pending = await this.getPendingMigrations();
    const results = [];

    for (const migration of pending) {
      try {
        const result = await this.runMigration(migration.name, options);
        results.push(result);

        if (!result.skipped && options.stopOnError !== false) {
          // توقف عند أول خطأ
        }
      } catch (error) {
        results.push({
          success: false,
          name: migration.name,
          error: 'حدث خطأ داخلي',
        });

        if (options.stopOnError !== false) {
          break;
        }
      }
    }

    return results;
  }

  // التراجع عن ترحيل
  async rollback(migrationName, options = {}) {
    const migrationRecord = await this.Migration.findOne({
      name: migrationName,
      status: 'success',
    });

    if (!migrationRecord) {
      throw new Error(`الترحيل غير موجود أو لم يتم تنفيذه: ${migrationName}`);
    }

    const filepath = path.join(this.config.migrationsDir, `${migrationName}.js`);
    const migration = require(filepath);

    if (!migration.down) {
      throw new Error(`لا يوجد سكربت تراجع للترحيل: ${migrationName}`);
    }

    // نسخ احتياطي قبل التراجع
    let backupPath = null;
    if (options.backup !== false) {
      backupPath = await this.createBackup(`pre_rollback_${migrationName}`);
    }

    const startTime = Date.now();

    try {
      // تنفيذ التراجع
      await migration.down(this.connection.db);

      // تحديث السجل
      await this.Migration.findByIdAndUpdate(migrationRecord._id, {
        status: 'rolled_back',
        rolledBackAt: new Date(),
        rollbackDuration: Date.now() - startTime,
      });

      return {
        success: true,
        name: migrationName,
        duration: Date.now() - startTime,
        backupPath,
      };
    } catch (error) {
      throw error;
    }
  }

  // التراجع عن آخر n ترحيلات
  async rollbackLast(count = 1, options = {}) {
    const executed = await this.Migration.find({ status: 'success' })
      .sort({ executedAt: -1 })
      .limit(count)
      .lean();

    const results = [];

    for (const migration of executed) {
      try {
        const result = await this.rollback(migration.name, options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          name: migration.name,
          error: 'حدث خطأ داخلي',
        });
        break;
      }
    }

    return results;
  }

  // إنشاء نسخة احتياطية
  async createBackup(name) {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14);
    const backupPath = path.join(this.config.backupDir, `${timestamp}_${name}.json`);

    const collections = await this.connection.db.listCollections().toArray();
    const backup = {
      timestamp: new Date(),
      name,
      collections: {},
    };

    for (const col of collections) {
      const data = await this.connection.db.collection(col.name).find({}).toArray();
      backup.collections[col.name] = data;
    }

    await fs.writeFile(backupPath, JSON.stringify(backup, null, 2), 'utf8');

    return backupPath;
  }

  // استعادة نسخة احتياطية
  async restoreBackup(backupPath) {
    let backupData;
    try {
      backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));
    } catch (err) {
      throw new Error(`Failed to parse backup file ${backupPath}: ${err.message}`);
    }

    for (const [collectionName, documents] of Object.entries(backupData.collections)) {
      const collection = this.connection.db.collection(collectionName);

      // حذف البيانات الحالية
      await collection.deleteMany({});

      // إدراج البيانات من النسخة الاحتياطية
      if (documents.length > 0) {
        await collection.insertMany(documents);
      }
    }

    return { success: true, collections: Object.keys(backupData.collections) };
  }

  // توليد hash للملف
  generateHash(filepath) {
    const content = require('fs').readFileSync(filepath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }

  // التحقق من صحة الترحيلات
  async verifyMigrations() {
    const migrations = await this.getMigrations();
    const issues = [];

    for (const migration of migrations) {
      if (!migration.executed) continue;

      const record = await this.Migration.findOne({ name: migration.name });
      if (!record) {
        issues.push({
          name: migration.name,
          issue: 'no_record',
          message: 'تم تنفيذ الترحيل ولكن لا يوجد سجل',
        });
        continue;
      }

      const currentHash = this.generateHash(migration.filepath);
      if (record.hash !== currentHash) {
        issues.push({
          name: migration.name,
          issue: 'hash_mismatch',
          message: 'تم تعديل الترحيل بعد التنفيذ',
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  // إحصائيات الترحيلات
  async getStats() {
    const total = await this.Migration.countDocuments();
    const successful = await this.Migration.countDocuments({ status: 'success' });
    const failed = await this.Migration.countDocuments({ status: 'failed' });
    const rolledBack = await this.Migration.countDocuments({ status: 'rolled_back' });
    const pending = (await this.getPendingMigrations()).length;

    const lastMigration = await this.Migration.findOne().sort({ executedAt: -1 }).lean();

    return {
      total,
      successful,
      failed,
      rolledBack,
      pending,
      lastMigration: lastMigration
        ? {
            name: lastMigration.name,
            executedAt: lastMigration.executedAt,
            duration: lastMigration.duration,
          }
        : null,
    };
  }
}

module.exports = DatabaseMigrationService;
