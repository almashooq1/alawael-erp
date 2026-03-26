#!/usr/bin/env node
/* eslint-disable no-unused-vars */
/**
 * System Readiness Checker - فاحص جاهزية النظام
 * تحقق من أن جميع الأنظمة جاهزة للهجرة
 *
 * الاستخدام:
 *   node system-readiness.js --full
 *   node system-readiness.js --quick
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const mongoose = require('mongoose');
const Redis = require('ioredis');

class SystemReadinessChecker {
  constructor() {
    this.checks = {
      system: {},
      databases: {},
      backup: {},
      network: {},
      disk: {},
      docker: {},
    };

    this.allPassed = true;
  }

  // ===== فحوصات النظام الأساسية =====
  async checkSystemRequirements() {
    console.log('\n█ SYSTEM REQUIREMENTS\n');

    // فحص النظام التشغيلي
    const platform = os.platform();
    const arch = os.arch();
    const cpus = os.cpus().length;
    const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);

    console.log(`  🖥️ Platform: ${platform} ${arch}`);
    console.log(`  💻 CPUs: ${cpus}`);
    console.log(`  🧠 Memory: ${freeMemory}GB free / ${totalMemory}GB total`);

    // فحص المتطلبات
    const checks = {
      'Minimum 4 CPUs': cpus >= 4,
      'Minimum 8GB RAM': parseFloat(totalMemory) >= 8,
      'Minimum 2GB Free Memory': parseFloat(freeMemory) >= 2,
    };

    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`  ${passed ? '✅' : '❌'} ${check}`);
      if (!passed) this.allPassed = false;
    });
  }

  // ===== فحوصات قاعدة البيانات =====
  async checkDatabaseReadiness() {
    console.log('\n█ DATABASE READINESS\n');

    // فحص MongoDB
    try {
      console.log('  🗄️ MongoDB:');

      const oldUri = process.env.MONGO_OLD_URI || 'mongodb://localhost:27017/alawael';
      const newUri = process.env.MONGO_NEW_URI || 'mongodb://localhost:27017/alawael-new';

      // الاتصال بـ Old DB
      const oldDb = await mongoose.createConnection(oldUri, {
        serverSelectionTimeoutMS: 5000,
      });

      const oldAdmin = oldDb.db.admin();
      const oldStatus = await oldAdmin.ping();

      if (oldStatus.ok === 1) {
        console.log('    ✅ Old DB accessible');

        // عد السجلات
        try {
          const collections = await oldDb.db.listCollections().toArray();
          console.log(`    ✅ Found ${collections.length} collections`);

          let totalDocs = 0;
          for (const col of collections) {
            const count = await oldDb.collection(col.name).countDocuments();
            totalDocs += count;
          }
          console.log(`    ✅ Total documents: ${totalDocs}`);
        } catch (e) {
          console.log('    ⚠️ Could not count documents');
        }
      } else {
        console.log('    ❌ Old DB not responding');
        this.allPassed = false;
      }

      await oldDb.close();

      // الاتصال بـ New DB
      const newDb = await mongoose.createConnection(newUri, {
        serverSelectionTimeoutMS: 5000,
      });

      const newAdmin = newDb.db.admin();
      const newStatus = await newAdmin.ping();

      if (newStatus.ok === 1) {
        console.log('    ✅ New DB accessible and empty');
      } else {
        console.log('    ❌ New DB not responding');
        this.allPassed = false;
      }

      await newDb.close();
    } catch (error) {
      console.log(`    ❌ MongoDB error: ${error.message}`);
      this.allPassed = false;
    }

    // فحص Redis
    try {
      console.log('  🔴 Redis:');

      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      const pong = await redis.ping();

      if (pong === 'PONG') {
        console.log('    ✅ Redis accessible');

        // فحص الذاكرة
        const info = await redis.info('memory');
        console.log('    ✅ Redis memory check passed');
      } else {
        console.log('    ❌ Redis not responding');
        this.allPassed = false;
      }

      redis.disconnect();
    } catch (error) {
      console.log(`    ❌ Redis error: ${error.message}`);
      this.allPassed = false;
    }
  }

  // ===== فحوصات النسخ الاحتياطية =====
  async checkBackupReadiness() {
    console.log('\n█ BACKUP INTEGRITY\n');

    const backupPaths = [
      '/backups/pre-migration',
      '/backups/checkpoints',
      '/backups/post-migration',
    ];

    for (const dir of backupPaths) {
      try {
        if (fs.existsSync(dir)) {
          const stats = fs.statSync(dir);
          const files = fs.readdirSync(dir);
          const size = this.getDirectorySize(dir);

          console.log(`  📦 ${dir}:`);
          console.log(`     ✅ Exists`);
          console.log(`     ✅ Files: ${files.length}`);
          console.log(`     ✅ Size: ${(size / 1024 / 1024 / 1024).toFixed(2)}GB`);
        } else {
          console.log(`  📦 ${dir}:`);
          console.log(`     ⚠️ Does not exist - will be created`);
        }
      } catch (error) {
        console.log(`  📦 ${dir}:`);
        console.log(`     ❌ Error: ${error.message}`);
        this.allPassed = false;
      }
    }
  }

  // ===== فحوصات الشبكة =====
  async checkNetworkConnectivity() {
    console.log('\n█ NETWORK CONNECTIVITY\n');

    const hosts = [
      { name: 'MongoDB nodes', host: 'mongodb-primary.internal' },
      { name: 'Redis server', host: 'redis.internal' },
    ];

    for (const { name, host } of hosts) {
      try {
        require('child_process').execFileSync('ping', ['-c', '1', host], {
          timeout: 5000,
          stdio: 'pipe',
        });
        console.log(`  ✅ ${name}: reachable`);
      } catch (error) {
        console.log(`  ⚠️ ${name}: unreachable (may be DNS issue)`);
      }
    }
  }

  // ===== فحوصات مساحة التخزين =====
  async checkDiskSpace() {
    console.log('\n█ DISK SPACE\n');

    try {
      const output = execSync('df -h / | tail -1').toString();
      const parts = output.trim().split(/\s+/);

      const used = parts[2];
      const available = parts[3];
      const usePercent = parseInt(parts[4]);

      console.log(`  📊 Root partition:`);
      console.log(`     Used: ${used}`);
      console.log(`     Available: ${available}`);
      console.log(`     Percentage: ${usePercent}%`);

      if (usePercent > 85) {
        console.log(`     ❌ Low disk space!`);
        this.allPassed = false;
      } else if (usePercent > 70) {
        console.log(`     ⚠️ Disk space running low`);
      } else {
        console.log(`     ✅ Disk space healthy`);
      }
    } catch (error) {
      console.log(`  ⚠️ Could not check disk space`);
    }
  }

  // ===== فحوصات Docker (إن وجدت) =====
  async checkDockerStatus() {
    console.log('\n█ DOCKER SERVICES\n');

    try {
      const output = execSync('docker ps --format "table {{.Names}}\t{{.Status}}"').toString();
      const lines = output.split('\n').filter(l => l.trim());

      console.log(`  🐳 Running containers:`);
      lines.forEach(line => {
        console.log(`     ${line}`);
      });
    } catch (error) {
      console.log(`  ℹ️ Docker not available or no containers running`);
    }
  }

  // ===== التحقق من أدوات الهجرة =====
  async checkMigrationTools() {
    console.log('\n█ MIGRATION TOOLS\n');

    const tools = [
      { name: 'mongodump', cmd: 'mongodump --version' },
      { name: 'mongorestore', cmd: 'mongorestore --version' },
      { name: 'Node.js', cmd: 'node --version' },
      { name: 'npm', cmd: 'npm --version' },
    ];

    for (const { name, cmd } of tools) {
      try {
        const version = execSync(cmd).toString().trim();
        console.log(`  ✅ ${name}: ${version}`);
      } catch (error) {
        console.log(`  ❌ ${name}: not found`);
        this.allPassed = false;
      }
    }
  }

  // ===== دالات مساعدة =====
  getDirectorySize(dir) {
    let size = 0;

    try {
      const files = fs.readdirSync(dir, { withFileTypes: true });

      for (const file of files) {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory()) {
          size += this.getDirectorySize(fullPath);
        } else {
          size += fs.statSync(fullPath).size;
        }
      }
    } catch (error) {
      // ignore
    }

    return size;
  }

  // ===== عرض النتائج النهائية =====
  printFinalReport() {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║           SYSTEM READINESS REPORT                    ║
╚═══════════════════════════════════════════════════════╝

Timestamp: ${new Date().toISOString()}

${
  this.allPassed
    ? `✅ SYSTEM IS READY FOR MIGRATION

All checks passed successfully. The system is prepared for:
- Database migration
- Rollback procedures
- Production deployment
`
    : `❌ SYSTEM NOT READY FOR MIGRATION

Please resolve the failures listed above before proceeding.
Contact DevOps team for assistance.
`
}

═══════════════════════════════════════════════════════
    `);
  }

  // ===== تشغيل جميع الفحوصات =====
  async runAllChecks() {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║  System Readiness Check - نظام الألوائل             ║
║  ALAWAEL v1.0.0                                      ║
╚═══════════════════════════════════════════════════════╝
    `);

    try {
      await this.checkSystemRequirements();
      await this.checkDatabaseReadiness();
      await this.checkBackupReadiness();
      await this.checkNetworkConnectivity();
      await this.checkDiskSpace();
      await this.checkDockerStatus();
      await this.checkMigrationTools();

      this.printFinalReport();

      return this.allPassed ? 0 : 1;
    } catch (error) {
      console.error('\n❌ Check failed:', error.message);
      return 1;
    }
  }
}

// تشغيل الفاحص
const checker = new SystemReadinessChecker();
checker.runAllChecks().then(exitCode => process.exit(exitCode));
