#!/usr/bin/env node
/**
 * Database Migration Rollback Script
 * Purpose: Restore database to pre-migration state if migration fails
 * WARNING: This is a destructive operation - use only on confirmed failure
 */

const mysql = require('mysql2/promise');
const readline = require('readline');

const NEW_DB_CONFIG = {
  host: process.env.NEW_DB_HOST || 'localhost',
  user: process.env.NEW_DB_USER || 'new_user',
  password: process.env.NEW_DB_PASSWORD || 'new_password',
  database: process.env.NEW_DATABASE || 'alawael_new'
};

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

class RollbackManager {
  constructor(config) {
    this.config = config;
    this.conn = null;
  }

  async connect() {
    this.conn = await mysql.createConnection(this.config);
  }

  async disconnect() {
    if (this.conn) await this.conn.end();
  }

  async askConfirmation(question) {
    return new Promise(resolve => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question(`${colors.yellow}${question}${colors.reset} (نعم/Yes/Y)(لا/No/N): `, answer => {
        rl.close();
        resolve(['yes', 'y', 'نعم', 'yes'].includes(answer.toLowerCase()));
      });
    });
  }

  async getBackupFile() {
    return new Promise(resolve => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question(
        `${colors.cyan}أدخل مسار ملف النسخة الاحتياطية (backup file path): ${colors.reset}`,
        answer => {
          rl.close();
          resolve(answer.trim());
        }
      );
    });
  }

  async restoreFromBackup(backupFile) {
    log(colors.cyan, '📂', `جاري استعادة البيانات من: ${backupFile}`);

    // This is a placeholder - actual restoration would depend on the backup format
    // For MySQL dumps, you would use: mysql < backup.sql
    // For our purposes, we're clearing the data as a rollback

    try {
      log(
        colors.yellow,
        '⚠️ ',
        'ملاحظة: الاستعادة من ملف النسخة الاحتياطية تتطلب تشغيل أمر منفصل:'
      );
      console.log(
        `  ${colors.cyan}mysql -u ${this.config.user} -p -h ${this.config.host} ${this.config.database} < ${backupFile}${colors.reset}\n`
      );

      return true;
    } catch (error) {
      log(colors.red, '✗', `خطأ: ${error.message}`);
      return false;
    }
  }

  async truncateTables() {
    log(colors.yellow, '⚠️ ', 'تنبيه: سيتم حذف جميع البيانات من الجداول التالية:');
    console.log('   - users\n   - products\n   - orders\n   - roles\n');

    const confirm = await this.askConfirmation('هل أنت متأكد من رغبتك في المتابعة?');

    if (!confirm) {
      log(colors.yellow, '⚠️ ', 'تم إلغاء عملية الحذف.');
      return false;
    }

    try {
      log(colors.cyan, '🗑️ ', 'جاري حذف البيانات...');

      // Disable foreign key checks temporarily
      await this.conn.query('SET FOREIGN_KEY_CHECKS=0');

      // Truncate tables in order
      const tables = ['orders', 'products', 'users', 'roles', 'permissions'];

      for (const table of tables) {
        try {
          await this.conn.query(`TRUNCATE TABLE \`${table}\``);
          log(colors.green, '✓', `تم حذف جميع البيانات من جدول ${table}`);
        } catch (error) {
          if (error.message.includes('Unknown table')) {
            log(colors.yellow, '⚠️ ', `الجدول ${table} غير موجود، تم التخطي`);
          } else {
            throw error;
          }
        }
      }

      // Re-enable foreign key checks
      await this.conn.query('SET FOREIGN_KEY_CHECKS=1');

      log(colors.green, '✅', 'تم حذف جميع البيانات المهاجرة بنجاح');
      return true;
    } catch (error) {
      log(colors.red, '✗', `خطأ في الحذف: ${error.message}`);
      return false;
    }
  }

  async showCurrentStatus() {
    try {
      console.log(`\n${colors.cyan}📊 حالة قاعدة البيانات الحالية:${colors.reset}`);

      const tables = ['users', 'products', 'orders', 'roles', 'permissions'];

      for (const table of tables) {
        try {
          const [result] = await this.conn.query(`SELECT COUNT(*) as count FROM \`${table}\``);
          const count = result[0].count;
          console.log(`   ${table}: ${count} سجل`);
        } catch (error) {
          console.log(`   ${table}: غير موجود`);
        }
      }
      console.log('');
    } catch (error) {
      log(colors.red, '✗', `خطأ: ${error.message}`);
    }
  }

  async run() {
    try {
      log(colors.bright, '🚨', '\nأداة استعادة النسخة الاحتياطية - Database Rollback');
      log(colors.bright, '═', '═'.repeat(50) + '\n');

      log(colors.red, '⚠️ ', 'تنبيه حرج: هذه الأداة ستحذف البيانات المهاجرة!');
      log(colors.red, '⚠️ ', 'استخدمها فقط عند فشل الهجرة المؤكد.\n');

      await this.connect();

      // Show current status
      await this.showCurrentStatus();

      // Ask for rollback method
      const useBackup = await this.askConfirmation('هل تريد الاستعادة من ملف نسخة احتياطية?');

      if (useBackup) {
        const backupFile = await this.getBackupFile();
        await this.restoreFromBackup(backupFile);
      } else {
        const success = await this.truncateTables();

        if (success) {
          log(colors.green, '✅', 'تم إعادة تعيين قاعدة البيانات بنجاح');
          log(colors.yellow, '⚠️ ', 'الخطوة التالية: تصحيح المشاكل وإعادة المحاولة\n');
        }
      }

      await this.showCurrentStatus();
    } catch (error) {
      log(colors.red, '❌', `خطأ حرج: ${error.message}`);
    } finally {
      await this.disconnect();
    }
  }
}

// التنفيذ
(async () => {
  const rollback = new RollbackManager(NEW_DB_CONFIG);
  await rollback.run();
})();
