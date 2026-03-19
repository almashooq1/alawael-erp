#!/usr/bin/env node
/* eslint-disable no-unused-vars */
/**
 * Migration Testing Suite
 * اختبار شامل لخطة الهجرة قبل التنفيذ الفعلي
 *
 * الاستخدام:
 *   node migration-test.js --dry-run
 *   node migration-test.js --validate-only
 *   node migration-test.js --test-rollback
 */

const mongoose = require('mongoose');
const Redis = require('ioredis');
const fs = require('fs').promises;
const { EventEmitter } = require('events');
const path = require('path');

class MigrationTester extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      oldDbUri: config.oldDbUri || process.env.MONGO_OLD_URI,
      newDbUri: config.newDbUri || process.env.MONGO_NEW_URI,
      redisUrl: config.redisUrl || process.env.REDIS_URL,
      testStage: config.testStage || 'full',
      ...config,
    };

    this.results = {
      connectivity: {},
      dataMigration: {},
      integrity: {},
      performance: {},
      rollback: {},
    };

    this.errors = [];
    this.warnings = [];
  }

  /**
   * مرحلة 1: اختبار الاتصال
   */
  async testConnectivity() {
    console.log('\n█ Testing Connectivity...\n');

    try {
      // اختبار MongoDB القديم
      console.log('  🔗 Connecting to old MongoDB...');
      const oldDb = await mongoose.createConnection(this.config.oldDbUri, {
        serverSelectionTimeoutMS: 5000,
      });

      const oldPing = await oldDb.db.admin().ping();
      this.results.connectivity.oldDb = {
        status: 'connected',
        ping: oldPing,
        timestamp: new Date(),
      };
      console.log('     ✅ Old DB connected');

      // اختبار MongoDB الجديد
      console.log('  🔗 Connecting to new MongoDB...');
      const newDb = await mongoose.createConnection(this.config.newDbUri, {
        serverSelectionTimeoutMS: 5000,
      });

      const newPing = await newDb.db.admin().ping();
      this.results.connectivity.newDb = {
        status: 'connected',
        ping: newPing,
        timestamp: new Date(),
      };
      console.log('     ✅ New DB connected');

      // اختبار Redis
      console.log('  🔗 Connecting to Redis...');
      const redis = new Redis(this.config.redisUrl);
      const redisPing = await redis.ping();

      this.results.connectivity.redis = {
        status: redisPing === 'PONG' ? 'connected' : 'error',
        timestamp: new Date(),
      };
      console.log('     ✅ Redis connected\n');

      return { oldDb, newDb, redis };
    } catch (error) {
      this.errors.push({
        phase: 'connectivity',
        error: error.message,
        stack: error.stack,
      });
      console.error('     ❌ Connection failed:', error.message);
      throw error;
    }
  }

  /**
   * مرحلة 2: اختبار البيانات
   */
  async testDataMigration(oldDb, newDb) {
    console.log('\n█ Testing Data Migration...\n');

    const collections = ['users', 'employees', 'courses', 'attendance', 'salaries'];

    for (const collection of collections) {
      try {
        console.log(`  📦 ${collection}:`);

        // حساب عدد المستندات في DB القديم
        const oldCount = await oldDb.collection(collection).countDocuments();

        // حساب عدد المستندات في DB الجديد
        const newCount = await newDb.collection(collection).countDocuments();

        const percentage = ((newCount / oldCount) * 100).toFixed(2);
        const match = oldCount === newCount;

        this.results.dataMigration[collection] = {
          old: oldCount,
          new: newCount,
          match,
          percentage: parseFloat(percentage),
        };

        const status = match ? '✅' : percentage >= 95 ? '⚠️' : '❌';
        console.log(`      Old: ${oldCount}, New: ${newCount} ${percentage}% ${status}\n`);

        if (percentage < 95) {
          this.warnings.push({
            phase: 'dataMigration',
            collection,
            message: `Only ${percentage}% of data migrated`,
          });
        }
      } catch (error) {
        this.errors.push({
          phase: 'dataMigration',
          collection,
          error: error.message,
        });
        console.error(`      ❌ Error: ${error.message}\n`);
      }
    }
  }

  /**
   * مرحلة 3: اختبار السلامة المرجعية
   */
  async testIntegrity(oldDb, newDb) {
    console.log('\n█ Testing Referential Integrity...\n');

    try {
      // التحقق من أن جميع المستخدمين لهم موظفون متطابقين
      console.log('  🔗 Checking user-employee relationships...');

      const users = await newDb
        .collection('users')
        .find({ employeeId: { $ne: null } })
        .limit(100)
        .toArray();

      let integrityFails = 0;

      for (const user of users) {
        const employee = await newDb.collection('employees').findOne({ _id: user.employeeId });

        if (!employee) {
          integrityFails++;
        }
      }

      this.results.integrity.userEmployeeM2M = {
        sampledUsers: users.length,
        brokenReferences: integrityFails,
        status: integrityFails === 0 ? 'pass' : 'fail',
      };

      console.log(`     ✅ ${users.length - integrityFails}/${users.length} relationships valid\n`);

      if (integrityFails > 0) {
        this.warnings.push({
          phase: 'integrity',
          message: `${integrityFails} broken user-employee relationships`,
        });
      }
    } catch (error) {
      this.errors.push({
        phase: 'integrity',
        error: error.message,
      });
      console.error(`  ❌ Integrity test failed: ${error.message}\n`);
    }
  }

  /**
   * مرحلة 4: اختبار الأداء
   */
  async testPerformance(newDb) {
    console.log('\n█ Testing Performance...\n');

    try {
      // اختبار سرعة القراءة
      console.log('  ⚡ Testing read performance...');
      const readStart = Date.now();

      const users = await newDb.collection('users').find({}).limit(1000).toArray();

      const readTime = Date.now() - readStart;
      this.results.performance.readTime = readTime;

      console.log(`     ✅ Read 1000 documents in ${readTime}ms\n`);

      // قياس متوسط الأداء
      if (readTime > 1000) {
        this.warnings.push({
          phase: 'performance',
          message: `Read performance slow: ${readTime}ms for 1000 docs`,
        });
      }
    } catch (error) {
      this.errors.push({
        phase: 'performance',
        error: error.message,
      });
      console.error(`  ❌ Performance test failed: ${error.message}\n`);
    }
  }

  /**
   * مرحلة 5: اختبار التراجع
   */
  async testRollback() {
    console.log('\n█ Testing Rollback Procedures...\n');

    try {
      // التحقق من وجود النسخة الاحتياطية
      console.log('  🔒 Checking backup files...');

      const backupDir = '/backups/pre-migration';
      const backupExists = await this.directoryExists(backupDir);

      this.results.rollback.backupExists = backupExists;

      if (backupExists) {
        console.log('     ✅ Backup directory exists');

        // التحقق من حجم النسخة
        const backupSize = await this.getDirectorySize(backupDir);
        this.results.rollback.backupSize = backupSize;

        console.log(`     ✅ Backup size: ${(backupSize / 1024 / 1024 / 1024).toFixed(2)} GB\n`);
      } else {
        console.log('     ⚠️ Backup directory not found\n');
        this.warnings.push({
          phase: 'rollback',
          message: 'Backup directory not found - prepare backup first',
        });
      }
    } catch (error) {
      this.errors.push({
        phase: 'rollback',
        error: error.message,
      });
    }
  }

  /**
   * تشغيل جميع الاختبارات
   */
  async runFullTest() {
    console.log(`
╔═══════════════════════════════════════════╗
║   Database Migration Test Suite           ║
║   ALAWAEL v1.0.0                         ║
║   Date: ${new Date().toISOString()}       ║
╚═══════════════════════════════════════════╝
    `);

    const startTime = Date.now();

    try {
      // الاختبار 1: الاتصال
      const { oldDb, newDb, redis } = await this.testConnectivity();

      // الاختبار 2: البيانات
      await this.testDataMigration(oldDb, newDb);

      // الاختبار 3: السلامة
      await this.testIntegrity(newDb);

      // الاختبار 4: الأداء
      await this.testPerformance(newDb);

      // الاختبار 5: التراجع
      await this.testRollback();

      // إغلاق الاتصالات
      await oldDb.close();
      await newDb.close();
      redis.disconnect();
    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
    }

    // عرض النتائج
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    this.printResults(duration);
  }

  /**
   * طباعة النتائج
   */
  printResults(duration) {
    console.log(`
╔═══════════════════════════════════════════╗
║   TEST RESULTS SUMMARY                    ║
╚═══════════════════════════════════════════╝

⏱️ Duration: ${duration}s

📊 Connectivity:
${this.formatResults('connectivity')}

📦 Data Migration:
${this.formatResults('dataMigration')}

🔗 Integrity:
${this.formatResults('integrity')}

⚡ Performance:
${Object.entries(this.results.performance)
  .map(([key, val]) => `   ${key}: ${val}ms`)
  .join('\n')}

🔒 Rollback:
${Object.entries(this.results.rollback)
  .map(([key, val]) => `   ${key}: ${val}`)
  .join('\n')}

${
  this.errors.length > 0
    ? `
❌ ERRORS (${this.errors.length}):
${this.errors.map(e => `   - ${e.error}`).join('\n')}
`
    : '✅ No errors'
}

${
  this.warnings.length > 0
    ? `
⚠️ WARNINGS (${this.warnings.length}):
${this.warnings.map(w => `   - ${w.message}`).join('\n')}
`
    : ''
}

═══════════════════════════════════════════════

${
  this.errors.length === 0 && this.warnings.length === 0
    ? '✅ ALL TESTS PASSED - MIGRATION READY'
    : this.errors.length > 0
      ? '❌ TESTS FAILED - DO NOT PROCEED'
      : '⚠️ TESTS PASSED WITH WARNINGS'
}

═══════════════════════════════════════════════
    `);

    // حفظ النتائج في ملف
    this.saveResults();
  }

  /**
   * تنسيق النتائج للعرض
   */
  formatResults(phase) {
    return Object.entries(this.results[phase])
      .map(([key, val]) => `   ${key}: ${JSON.stringify(val)}`)
      .join('\n');
  }

  /**
   * حفظ النتائج
   */
  async saveResults() {
    const report = {
      timestamp: new Date(),
      results: this.results,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
        status: this.errors.length === 0 ? 'PASS' : 'FAIL',
      },
    };

    const filename = `migration-test-${Date.now()}.json`;
    await fs.writeFile(filename, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved: ${filename}`);
  }

  /**
   * دالات مساعدة
   */
  async directoryExists(dir) {
    try {
      await fs.access(dir);
      return true;
    } catch {
      return false;
    }
  }

  async getDirectorySize(dir) {
    let size = 0;
    try {
      const files = await fs.readdir(dir, { recursive: true });
      for (const file of files) {
        const stat = await fs.stat(path.join(dir, file));
        size += stat.size;
      }
    } catch (error) {
      console.error('Error calculating directory size:', error);
    }
    return size;
  }
}

// تشغيل الاختبارات
async function main() {
  const args = process.argv.slice(2);
  const tester = new MigrationTester();

  if (args.includes('--dry-run')) {
    console.log('🧪 Running in DRY RUN mode - no changes will be made');
  }

  await tester.runFullTest();
}

main().catch(console.error);
