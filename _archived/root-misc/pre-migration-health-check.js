#!/usr/bin/env node
/**
 * Pre-Migration Health Check
 * Purpose: Verify all systems are ready for migration
 * Run this 26 Feb at 10:00 AM to confirm everything is set
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(color, emoji, message) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

class HealthCheck {
  constructor() {
    this.checks = {
      pass: [],
      fail: [],
      warn: []
    };
  }

  async checkNodePackages() {
    log(colors.cyan, '📦', 'فحص مكتبات Node.js...');

    const requiredPackages = ['mysql2', 'bcrypt', 'uuid'];

    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
      );

      for (const pkg of requiredPackages) {
        if (packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg]) {
          log(colors.green, '✓', `✓ ${pkg} مثبت`);
          this.checks.pass.push(`Package: ${pkg}`);
        } else {
          log(colors.red, '✗', `✗ ${pkg} غير مثبت`);
          this.checks.fail.push(`Package: ${pkg} (run: npm install ${pkg})`);
        }
      }
    } catch (error) {
      log(colors.yellow, '⚠️ ', `تحذير: لم يتم العثور على package.json: ${error.message}`);
      this.checks.warn.push('package.json not found');
    }
  }

  async checkDatabaseConnection(config, name) {
    log(colors.cyan, '🔌', `فحص الاتصال بـ ${name}...`);

    try {
      const conn = await mysql.createConnection(config);

      // اختبر الاتصال
      const [result] = await conn.query('SELECT 1 as test');

      log(colors.green, '✓', `✓ متصل بـ ${name}`);
      this.checks.pass.push(`Database: ${name}`);

      await conn.end();
      return true;
    } catch (error) {
      log(colors.red, '✗', `✗ فشل الاتصال بـ ${name}: ${error.message}`);
      this.checks.fail.push(`Database: ${name} - ${error.message}`);
      return false;
    }
  }

  async checkScriptFiles() {
    log(colors.cyan, '📋', 'فحص ملفات الـ scripts...');

    const requiredFiles = [
      'migration-script-main.js',
      'migration-script.sql',
      'migration-verification.js',
      'migration-rollback.js',
      'test-data-setup.js'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        log(colors.green, '✓', `✓ ${file} (${stats.size} bytes)`);
        this.checks.pass.push(`Script: ${file}`);
      } else {
        log(colors.red, '✗', `✗ ${file} غير موجود`);
        this.checks.fail.push(`Script: ${file}`);
      }
    }
  }

  async checkDiskSpace() {
    log(colors.cyan, '💾', 'فحص المساحة المتاحة...');

    try {
      const diskSpace = require('diskusage');
      const drive = 'C:';

      const info = diskSpace.checkSync(drive);
      const freeGB = (info.available / 1024 ** 3).toFixed(2);
      const totalGB = (info.total / 1024 ** 3).toFixed(2);

      log(colors.green, '✓', `المساحة الحرة: ${freeGB} GB من ${totalGB} GB`);

      if (info.available > 10 * 1024 ** 3) {
        this.checks.pass.push('Disk space: OK');
      } else {
        log(colors.yellow, '⚠️ ', '⚠️  تحذير: المساحة الحرة أقل من 10 GB');
        this.checks.warn.push('Disk space: Low');
      }
    } catch (error) {
      log(colors.yellow, '⚠️ ', `تحذير: لا يمكن قياس المساحة: ${error.message}`);
      this.checks.warn.push('Disk space: Unable to check');
    }
  }

  async checkBackupLocation() {
    log(colors.cyan, '📂', 'فحص موقع النسخة الاحتياطية...');

    const backupDirs = [
      'C:\\backups',
      path.join(process.cwd(), 'backups'),
      'D:\\',
      'C:\\Users\\x-be\\OneDrive\\المستندات'
    ];

    let found = false;
    for (const dir of backupDirs) {
      if (fs.existsSync(dir)) {
        log(colors.green, '✓', `✓ موقع النسخة الاحتياطية متاح: ${dir}`);
        this.checks.pass.push(`Backup location: ${dir}`);
        found = true;
        break;
      }
    }

    if (!found) {
      log(colors.yellow, '⚠️ ', '⚠️  قم بإنشاء مجلد للنسخ الاحتياطية');
      this.checks.warn.push('No backup directory found');
    }
  }

  async checkEnvironmentVariables() {
    log(colors.cyan, '🔐', 'فحص متغيرات البيئة...');

    const requiredVars = [
      'OLD_DB_HOST',
      'OLD_DB_USER',
      'OLD_DB_PASSWORD',
      'NEW_DB_HOST',
      'NEW_DB_USER',
      'NEW_DB_PASSWORD'
    ];

    let allSet = true;
    for (const varName of requiredVars) {
      if (process.env[varName]) {
        log(colors.green, '✓', `✓ ${varName} محدد`);
      } else {
        log(colors.yellow, '⚠️ ', `⚠️  ${varName} غير محدد (سيتم استخدام القيم الافتراضية)`);
        allSet = false;
      }
    }

    if (allSet) {
      this.checks.pass.push('Environment variables: All set');
    } else {
      this.checks.warn.push('Environment variables: Some missing (using defaults)');
    }
  }

  printSummary() {
    console.log(`\n${colors.bright}${'═'.repeat(60)}`);
    console.log(`📊 ملخص فحص الجاهزية${colors.reset}\n`);

    if (this.checks.pass.length > 0) {
      console.log(`${colors.green}✓ نجح (${this.checks.pass.length}):${colors.reset}`);
      this.checks.pass.forEach(item => console.log(`  ${item}`));
    }

    if (this.checks.warn.length > 0) {
      console.log(`\n${colors.yellow}⚠️  تحذيرات (${this.checks.warn.length}):${colors.reset}`);
      this.checks.warn.forEach(item => console.log(`  ${item}`));
    }

    if (this.checks.fail.length > 0) {
      console.log(`\n${colors.red}✗ أخفق (${this.checks.fail.length}):${colors.reset}`);
      this.checks.fail.forEach(item => console.log(`  ${item}`));
    }

    console.log(`\n${colors.bright}${'═'.repeat(60)}${colors.reset}\n`);

    // Final verdict
    if (this.checks.fail.length === 0 && this.checks.warn.length <= 2) {
      log(colors.green, '✅', 'جميع الأنظمة جاهزة للهجرة!');
      return true;
    } else if (this.checks.fail.length === 0) {
      log(colors.yellow, '⚠️ ', 'معظم الأنظمة جاهزة، لكن يوجد بعض التحذيرات');
      return true;
    } else {
      log(colors.red, '❌', 'هناك مشاكل يجب حلها قبل الهجرة');
      return false;
    }
  }

  async run() {
    try {
      log(colors.bright, '🏥', '\nفحص الجاهزية قبل الهجرة');
      log(colors.bright, '═', '═'.repeat(60) + '\n');

      // Run all checks
      await this.checkNodePackages();
      console.log('');

      await this.checkScriptFiles();
      console.log('');

      // Check database connections with defaults
      const oldConfig = {
        host: process.env.OLD_DB_HOST || 'localhost',
        user: process.env.OLD_DB_USER || 'root',
        password: process.env.OLD_DB_PASSWORD || '',
        database: process.env.OLD_DATABASE || 'alawael_old'
      };

      const newConfig = {
        host: process.env.NEW_DB_HOST || 'localhost',
        user: process.env.NEW_DB_USER || 'root',
        password: process.env.NEW_DB_PASSWORD || '',
        database: process.env.NEW_DATABASE || 'alawael_new'
      };

      await this.checkDatabaseConnection(oldConfig, 'قاعدة البيانات القديمة');
      await this.checkDatabaseConnection(newConfig, 'قاعدة البيانات الجديدة');
      console.log('');

      await this.checkDiskSpace();
      console.log('');

      await this.checkBackupLocation();
      console.log('');

      await this.checkEnvironmentVariables();
      console.log('');

      return this.printSummary();
    } catch (error) {
      log(colors.red, '❌', `خطأ حرج: ${error.message}`);
      return false;
    }
  }
}

// التنفيذ
(async () => {
  const healthCheck = new HealthCheck();
  const ready = await healthCheck.run();

  console.log(`${colors.cyan}الخطve التالية:${colors.reset}`);
  if (ready) {
    console.log('  1. عدّل بيانات الاتصال في migration-script-main.js');
    console.log('  2. شغل: node test-data-setup.js');
    console.log('  3. اختبر الهجرة على بيانات التجربة');
    console.log('  4. احصل على موافقة من VP Engineering\n');
  } else {
    console.log('  ⚠️  يجب حل المشاكل المذكورة أعلاه قبل المتابعة\n');
  }

  process.exit(ready ? 0 : 1);
})();
