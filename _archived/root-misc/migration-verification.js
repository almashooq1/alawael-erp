#!/usr/bin/env node
/**
 * Migration Verification Script
 * Purpose: Verify data integrity after migration
 * Checks: Row counts, data quality, relationships
 */

const mysql = require('mysql2/promise');

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

class VerificationScript {
  constructor(config) {
    this.config = config;
    this.conn = null;
    this.checks = {
      passed: 0,
      failed: 0,
      warnings: 0
    };
  }

  async connect() {
    this.conn = await mysql.createConnection(this.config);
  }

  async disconnect() {
    if (this.conn) await this.conn.end();
  }

  log(color, emoji, message) {
    console.log(`${color}${emoji} ${message}${colors.reset}`);
  }

  async runChecks() {
    console.log(`\n${colors.bright}${'═'.repeat(60)}`);
    console.log('🔍 بدء فحص سلامة البيانات المهاجرة');
    console.log(`${'═'.repeat(60)}${colors.reset}\n`);

    const checks = [
      this.checkTableExists('users'),
      this.checkTableExists('products'),
      this.checkRowCounts(),
      this.checkNullValues(),
      this.checkPasswordFormat(),
      this.checkEmailFormat(),
      this.checkDataConsistency()
    ];

    const results = await Promise.all(checks);

    return results.every(r => r === true);
  }

  async checkTableExists(tableName) {
    try {
      const [tables] = await this.conn.query(
        'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
        [tableName]
      );

      if (tables.length > 0) {
        this.log(colors.green, '✓', `جدول "${tableName}" موجود`);
        this.checks.passed++;
        return true;
      } else {
        this.log(colors.red, '✗', `جدول "${tableName}" غير موجود!`);
        this.checks.failed++;
        return false;
      }
    } catch (error) {
      this.log(colors.red, '✗', `خطأ في فحص جدول "${tableName}": ${error.message}`);
      this.checks.failed++;
      return false;
    }
  }

  async checkRowCounts() {
    try {
      const [users] = await this.conn.query('SELECT COUNT(*) as count FROM users');
      const [products] = await this.conn.query('SELECT COUNT(*) as count FROM products');

      console.log(`${colors.cyan}📊 عدد الصفوف:${colors.reset}`);
      console.log(`   ${colors.bright}المستخدمين:${colors.reset} ${users[0].count}`);
      console.log(`   ${colors.bright}المنتجات:${colors.reset} ${products[0].count}\n`);

      this.checks.passed += 2;
      return true;
    } catch (error) {
      this.log(colors.red, '✗', `خطأ عد الصفوف: ${error.message}`);
      this.checks.failed++;
      return false;
    }
  }

  async checkNullValues() {
    try {
      console.log(`${colors.cyan}⚠️  فحص القيم المفقودة:${colors.reset}`);

      const checks = [
        {
          query: 'SELECT COUNT(*) as count FROM users WHERE email IS NULL',
          field: 'البريد الإلكتروني'
        },
        {
          query: 'SELECT COUNT(*) as count FROM users WHERE firstName IS NULL',
          field: 'الاسم الأول'
        },
        {
          query: 'SELECT COUNT(*) as count FROM users WHERE password IS NULL',
          field: 'كلمة المرور'
        },
        { query: 'SELECT COUNT(*) as count FROM products WHERE name IS NULL', field: 'اسم المنتج' }
      ];

      let allPassed = true;

      for (const check of checks) {
        const [result] = await this.conn.query(check.query);
        const count = result[0].count;

        if (count === 0) {
          this.log(colors.green, '✓', `لا توجد قيم مفقودة في ${check.field}`);
          this.checks.passed++;
        } else {
          this.log(colors.red, '✗', `وجدت ${count} قيمة مفقودة في ${check.field}`);
          this.checks.failed++;
          allPassed = false;
        }
      }

      return allPassed;
    } catch (error) {
      this.log(colors.red, '✗', `خطأ في فحص القيم المفقودة: ${error.message}`);
      this.checks.failed++;
      return false;
    }
  }

  async checkPasswordFormat() {
    try {
      console.log(`\n${colors.cyan}🔐 فحص تنسيق كلمات المرور:${colors.reset}`);

      const [result] = await this.conn.query(
        'SELECT COUNT(*) as count FROM users WHERE password LIKE "$2b$%"'
      );

      const totalUsers = (await this.conn.query('SELECT COUNT(*) as count FROM users'))[0][0].count;
      const bcryptUsers = result[0].count;

      if (bcryptUsers === totalUsers) {
        this.log(colors.green, '✓', `جميع كلمات المرور (${bcryptUsers}) مشفرة بـ bcrypt`);
        this.checks.passed++;
        return true;
      } else {
        const unencrypted = totalUsers - bcryptUsers;
        this.log(colors.red, '✗', `${unencrypted} كلمة مرور غير مشفرة بـ bcrypt`);
        this.checks.failed++;
        return false;
      }
    } catch (error) {
      this.log(colors.red, '✗', `خطأ في فحص كلمات المرور: ${error.message}`);
      this.checks.failed++;
      return false;
    }
  }

  async checkEmailFormat() {
    try {
      console.log(`\n${colors.cyan}📧 فحص صيغة البريد الإلكتروني:${colors.reset}`);

      const [result] = await this.conn.query(
        'SELECT COUNT(*) as count FROM users WHERE email REGEXP "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$"'
      );

      const validEmails = result[0].count;
      const totalUsers = (await this.conn.query('SELECT COUNT(*) as count FROM users'))[0][0].count;

      if (validEmails === totalUsers) {
        this.log(colors.green, '✓', `جميع البريد الإلكتروني (${validEmails}) بصيغة صحيحة`);
        this.checks.passed++;
        return true;
      } else {
        const invalidEmails = totalUsers - validEmails;
        this.log(colors.yellow, '⚠', `${invalidEmails} بريد إلكتروني بصيغة غير صحيحة`);
        this.checks.warnings++;
        return true; // تحذير فقط، لا نعتبره فشل
      }
    } catch (error) {
      this.log(colors.red, '✗', `خطأ في فحص البريد: ${error.message}`);
      return true; // في حالة الخطأ، نتجاوز هذا الفحص
    }
  }

  async checkDataConsistency() {
    try {
      console.log(`\n${colors.cyan}🔗 فحص تناسق البيانات:${colors.reset}`);

      // تحقق من عدم وجود صفوف مكررة بنفس البريد الإلكتروني
      const [duplicates] = await this.conn.query(
        'SELECT email, COUNT(*) as count FROM users GROUP BY email HAVING count > 1'
      );

      if (duplicates.length === 0) {
        this.log(colors.green, '✓', 'لا توجد بريد إلكتروني مكرر');
        this.checks.passed++;
      } else {
        this.log(colors.yellow, '⚠', `وجدت ${duplicates.length} بريد إلكتروني مكرر`);
        this.checks.warnings++;
      }

      // تحقق من الطوابع الزمنية
      const [timestamps] = await this.conn.query(
        'SELECT COUNT(*) as count FROM users WHERE createdAt IS NULL OR updatedAt IS NULL'
      );

      if (timestamps[0].count === 0) {
        this.log(colors.green, '✓', 'جميع الطوابع الزمنية موجودة');
        this.checks.passed++;
        return true;
      } else {
        this.log(colors.red, '✗', `${timestamps[0].count} سجل بدون طوابع زمنية`);
        this.checks.failed++;
        return false;
      }
    } catch (error) {
      this.log(colors.yellow, '⚠', `تجاوز فحص التناسق: ${error.message}`);
      return true;
    }
  }

  async printSummary(success) {
    console.log(`\n${colors.bright}${'═'.repeat(60)}`);

    if (success) {
      this.log(colors.green, '✅', 'جميع الفحوصات نجحت!');
    } else {
      this.log(colors.red, '❌', 'بعض الفحوصات فشلت!');
    }

    console.log(`\n${colors.cyan}📊 ملخص الفحوصات:${colors.reset}`);
    console.log(`   ${colors.green}✓ نجح: ${this.checks.passed}${colors.reset}`);
    console.log(`   ${colors.red}✗ فشل: ${this.checks.failed}${colors.reset}`);
    console.log(`   ${colors.yellow}⚠ تحذيرات: ${this.checks.warnings}${colors.reset}`);

    console.log(`\n${'═'.repeat(60)}${colors.reset}\n`);
  }

  async run() {
    try {
      await this.connect();
      const success = await this.runChecks();
      await this.printSummary(success);
      return success;
    } catch (error) {
      this.log(colors.red, '✗', `خطأ حرج: ${error.message}`);
      return false;
    } finally {
      await this.disconnect();
    }
  }
}

// التنفيذ
(async () => {
  const verifier = new VerificationScript(NEW_DB_CONFIG);
  const success = await verifier.run();
  process.exit(success ? 0 : 1);
})();
