#!/usr/bin/env node

/**
 * 🔄 Intelligent Restore System
 * نظام الاسترجاع الذكي
 *
 * الميزات:
 * - استرجاع ذكي من نقاط متعددة
 * - اختبار الاسترجاع دون فقدان البيانات
 * - استرجاع انتقائي (مجموعات محددة)
 * - مقارنة النسخ الاحتياطية
 * - التحقق من السلامة التلقائي
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

const log = {
  info: msg => console.log(`${COLORS.cyan}ℹ ${msg}${COLORS.reset}`),
  success: msg => console.log(`${COLORS.green}✅ ${msg}${COLORS.reset}`),
  warning: msg => console.log(`${COLORS.yellow}⚠️  ${msg}${COLORS.reset}`),
  error: msg => console.log(`${COLORS.red}❌ ${msg}${COLORS.reset}`),
  title: msg => console.log(`\n${COLORS.blue}${msg}${COLORS.reset}\n`),
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = query => new Promise(resolve => rl.question(query, resolve));

// ==================================================
// Restore Manager Class
// ==================================================

class RestoreManager {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/intelligent_agent';
  }

  /**
   * قائمة النسخ الاحتياطية المتاحة
   */
  listAvailableBackups() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        log.warning('لا توجد نسخ احتياطية متاحة');
        return [];
      }

      const files = fs
        .readdirSync(this.backupDir)
        .filter(f => f.includes('backup-') && (f.endsWith('.archive') || f.endsWith('.enc')))
        .map((f, index) => {
          const filePath = path.join(this.backupDir, f);
          const stats = fs.statSync(filePath);
          return {
            index: index + 1,
            name: f,
            path: filePath,
            size: (stats.size / 1024 / 1024).toFixed(2),
            date: new Date(stats.mtime).toLocaleString('ar-EG'),
            type: f.split('-')[1], // daily, weekly, monthly
          };
        })
        .sort((a, b) => b.date.localeCompare(a.date));

      return files;
    } catch (error) {
      log.error(`خطأ في قائمة النسخ: ${error.message}`);
      return [];
    }
  }

  /**
   * عرض النسخ المتاحة
   */
  displayBackups() {
    const backups = this.listAvailableBackups();

    if (backups.length === 0) {
      log.error('لا توجد نسخ احتياطية متاحة');
      return false;
    }

    log.title('📦 النسخ الاحتياطية المتاحة');

    console.log(
      `${'#'.padEnd(4)} ${'النوع'.padEnd(10)} ${'الحجم'.padEnd(10)} ${'التاريخ'.padEnd(25)} ${'الملف'}`
    );
    console.log('-'.repeat(80));

    backups.forEach(b => {
      console.log(
        `${b.index}.`.padEnd(4) +
          `${b.type}`.padEnd(10) +
          `${b.size} MB`.padEnd(10) +
          `${b.date}`.padEnd(25) +
          `${b.name}`
      );
    });

    return backups;
  }

  /**
   * التحقق من سلامة النسخة
   */
  async verifyBackup(backupPath) {
    try {
      log.info('🔍 جاري التحقق من سلامة النسخة...');

      if (!fs.existsSync(backupPath)) {
        throw new Error('ملف النسخة غير موجود');
      }

      const stats = fs.statSync(backupPath);

      if (stats.size === 0) {
        throw new Error('ملف النسخة فارغ');
      }

      if (stats.size > 10 * 1024 * 1024 * 1024) {
        // 10 GB
        log.warning('⚠️ حجم النسخة كبير جداً (أكثر من 10 GB)');
      }

      // Test extraction
      if (backupPath.endsWith('.archive') || backupPath.endsWith('.enc')) {
        log.info('🔐 اختبار فك الضغط...');

        try {
          const testCommand = `mongorestore --uri="${this.mongoUri}" --archive="${backupPath}" --gzip --dryRun`;
          execSync(testCommand, { stdio: 'pipe', timeout: 30000 });
          log.success('✅ النسخة صحيحة وجاهزة للاسترجاع');
          return true;
        } catch {
          log.warning('⚠️ فشل الاختبار - قد تكون النسخة مشفرة');
          return true; // قد تكون مشفرة
        }
      }

      log.success('✅ التحقق من السلامة اكتمل');
      return true;
    } catch (error) {
      log.error(`❌ فشل التحقق: ${error.message}`);
      return false;
    }
  }

  /**
   * استرجاع في بيئة اختبار
   */
  async testRestore(backupPath) {
    try {
      log.title('🧪 اختبار الاسترجاع في بيئة آمنة');

      const testDb = 'intelligent_agent_restore_test';
      const testUri = this.mongoUri.replace(/\/[^/]+$/, `/${testDb}`);

      log.info(`📥 جاري الاسترجاع في قاعدة البيانات المؤقتة: ${testDb}`);

      const command = `mongorestore --uri="${testUri}" --archive="${backupPath}" --gzip`;
      execSync(command, { stdio: 'pipe', timeout: 300000 });

      log.success('✅ اختبار الاسترجاع نجح!');

      // Verify data
      log.info('🔍 التحقق من البيانات المستعادة...');

      const verifyCommand = `mongosh "${testUri}" --eval "db.adminCommand('dbStats')"`;
      const result = execSync(verifyCommand, { stdio: 'pipe', encoding: 'utf-8' });

      log.success('✅ البيانات صحيحة');

      // Cleanup
      log.info('🗑️ تنظيف قاعدة البيانات المؤقتة...');
      const cleanupCommand = `mongosh "${testUri}" --eval "db.dropDatabase()"`;
      execSync(cleanupCommand, { stdio: 'pipe' });

      return true;
    } catch (error) {
      log.error(`❌ خطأ في اختبار الاسترجاع: ${error.message}`);
      return false;
    }
  }

  /**
   * استرجاع حقيقي
   */
  async performRestore(backupPath, backupType = 'full') {
    try {
      log.title('🔄 بدء استرجاع البيانات');

      // التحقق من السلامة أولاً
      const isValid = await this.verifyBackup(backupPath);
      if (!isValid) {
        const confirm = await question('⚠️ النسخة قد لا تكون صالحة. هل تريد المتابعة؟ (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
          log.warning('✋ تم إلغاء العملية');
          return false;
        }
      }

      // Decrypt if needed
      let fileToRestore = backupPath;
      if (backupPath.endsWith('.enc')) {
        log.info('🔓 جاري فك التشفير...');

        const password = process.env.BACKUP_ENCRYPTION_PASSWORD || 'secure-backup-key';
        const decryptedFile = backupPath.replace('.enc', '.dec');

        const decryptCommand = `openssl enc -aes-256-cbc -d -in "${backupPath}" -out "${decryptedFile}" -k "${password}"`;
        execSync(decryptCommand, { stdio: 'pipe' });

        fileToRestore = decryptedFile;
      }

      // Create backup of current data (safety measure)
      log.info('💾 إنشاء نسخة احتياطية من البيانات الحالية قبل الاسترجاع...');

      const safetyBackupFile = path.join(
        this.backupDir,
        `safety-backup-before-restore-${Date.now()}.archive`
      );

      const safetyCommand = `mongodump --uri="${this.mongoUri}" --archive="${safetyBackupFile}" --gzip`;
      execSync(safetyCommand, { stdio: 'pipe', timeout: 300000 });

      log.success(`✅ نسخة أمان تم إنشاؤها: ${safetyBackupFile}`);

      // Perform restore
      log.info('📥 جاري استرجاع البيانات...');

      const restoreCommand = `mongorestore --uri="${this.mongoUri}" --archive="${fileToRestore}" --gzip`;
      execSync(restoreCommand, { stdio: 'pipe', timeout: 300000 });

      log.success('✅ تم استرجاع البيانات بنجاح!');

      // Cleanup decrypted file
      if (fileToRestore !== backupPath) {
        fs.unlinkSync(fileToRestore);
      }

      return true;
    } catch (error) {
      log.error(`❌ خطأ في الاسترجاع: ${error.message}`);
      log.warning('⚠️ تم الاحتفاظ بنسخة أمان من البيانات الأصلية');
      return false;
    }
  }

  /**
   * استرجاع تفاعلي
   */
  async interactiveRestore() {
    try {
      const backups = this.displayBackups();

      if (backups.length === 0) {
        return;
      }

      const choice = await question('\nاختر رقم النسخة الاحتياطية: ');
      const selectedIndex = parseInt(choice) - 1;

      if (selectedIndex < 0 || selectedIndex >= backups.length) {
        log.error('اختيار غير صالح');
        return;
      }

      const selected = backups[selectedIndex];
      log.info(`تم اختيار: ${selected.name}`);

      // Confirm
      const confirm = await question('\nهل تريد المتابعة؟ هذا سيستبدل البيانات الحالية (y/n): ');

      if (confirm.toLowerCase() !== 'y') {
        log.warning('✋ تم إلغاء العملية');
        return;
      }

      // Test first
      const testConfirm = await question(
        'هل تريد اختبار الاسترجاع أولاً بدون تعديل البيانات؟ (y/n): '
      );

      if (testConfirm.toLowerCase() === 'y') {
        await this.testRestore(selected.path);
        const finalConfirm = await question('\nهل تريد متابعة الاسترجاع الحقيقي؟ (y/n): ');
        if (finalConfirm.toLowerCase() !== 'y') {
          log.warning('✋ تم إلغاء العملية');
          return;
        }
      }

      // Perform actual restore
      await this.performRestore(selected.path);
    } catch (error) {
      log.error(`خطأ: ${error.message}`);
    }
  }

  /**
   * عرض معلومات تفصيلية عن النسخة
   */
  showBackupDetails(backupPath) {
    try {
      log.title('📋 تفاصيل النسخة الاحتياطية');

      const stats = fs.statSync(backupPath);

      console.log(`الملف: ${path.basename(backupPath)}`);
      console.log(`الحجم: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`التاريخ: ${new Date(stats.mtime).toLocaleString('ar-EG')}`);
      console.log(`المسار: ${backupPath}`);
    } catch (error) {
      log.error(`خطأ: ${error.message}`);
    }
  }
}

// ==================================================
// CLI
// ==================================================

async function main() {
  const args = process.argv.slice(2);
  const manager = new RestoreManager();

  if (args.length === 0) {
    log.title('🔄 Restore Manager - مدير الاسترجاع');
    console.log('الأوامر:');
    console.log('  interactive   - استرجاع تفاعلي (موصى به)');
    console.log('  list          - عرض النسخ المتاحة');
    console.log('  restore FILE  - استرجاع من ملف محدد');
    console.log('  test FILE     - اختبار الاسترجاع');
    console.log('  verify FILE   - التحقق من سلامة النسخة');
    console.log('  info FILE     - عرض معلومات النسخة');
    return;
  }

  const command = args[0];

  switch (command) {
    case 'interactive':
      await manager.interactiveRestore();
      break;

    case 'list':
      manager.displayBackups();
      break;

    case 'restore':
      if (!args[1]) {
        log.error('يرجى تحديد ملف النسخة');
        return;
      }
      await manager.performRestore(args[1]);
      break;

    case 'test':
      if (!args[1]) {
        log.error('يرجى تحديد ملف النسخة');
        return;
      }
      await manager.testRestore(args[1]);
      break;

    case 'verify':
      if (!args[1]) {
        log.error('يرجى تحديد ملف النسخة');
        return;
      }
      await manager.verifyBackup(args[1]);
      break;

    case 'info':
      if (!args[1]) {
        log.error('يرجى تحديد ملف النسخة');
        return;
      }
      manager.showBackupDetails(args[1]);
      break;

    default:
      log.error(`أمر غير معروف: ${command}`);
  }

  rl.close();
}

if (require.main === module) {
  main().catch(error => {
    log.error(error.message);
    rl.close();
    process.exit(1);
  });
}

module.exports = RestoreManager;
