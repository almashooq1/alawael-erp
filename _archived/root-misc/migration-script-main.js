#!/usr/bin/env node
/**
 * Database Migration Script - ALAWAEL ERP System
 * Purpose: Migrate user data from old system to new system
 * Date: February 25, 2026
 * Status: Ready for Execution
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// ==================== CONFIGURATION ====================
const OLD_DB_CONFIG = {
  host: process.env.OLD_DB_HOST || 'localhost',
  user: process.env.OLD_DB_USER || 'old_user',
  password: process.env.OLD_DB_PASSWORD || 'old_password',
  database: process.env.OLD_DATABASE || 'alawael_old',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const NEW_DB_CONFIG = {
  host: process.env.NEW_DB_HOST || 'localhost',
  user: process.env.NEW_DB_USER || 'new_user',
  password: process.env.NEW_DB_PASSWORD || 'new_password',
  database: process.env.NEW_DATABASE || 'alawael_new',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// ==================== COLOR CODES FOR CONSOLE ====================
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dimmed: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// ==================== MAIN MIGRATION CLASS ====================
class DatabaseMigration {
  constructor(oldConfig, newConfig) {
    this.oldConfig = oldConfig;
    this.newConfig = newConfig;
    this.oldConn = null;
    this.newConn = null;
    this.migrations = {
      successful: 0,
      failed: 0,
      errors: []
    };
  }

  async connect() {
    try {
      log(colors.cyan, '🔌 جاري الاتصال بـ قواعد البيانات...');

      this.oldConn = await mysql.createConnection(this.oldConfig);
      log(colors.green, '✓ متصل بقاعدة البيانات القديمة');

      this.newConn = await mysql.createConnection(this.newConfig);
      log(colors.green, '✓ متصل بقاعدة البيانات الجديدة');

      return true;
    } catch (error) {
      log(colors.red, `✗ خطأ في الاتصال: ${error.message}`);
      throw error;
    }
  }

  async disconnect() {
    if (this.oldConn) await this.oldConn.end();
    if (this.newConn) await this.newConn.end();
  }

  // ==================== MIGRATION: USERS ====================
  async migrateUsers() {
    log(colors.blue, '\n📋 بدء هجرة بيانات المستخدمين...');

    try {
      // جلب المستخدمين من النظام القديم
      const [oldUsers] = await this.oldConn.query('SELECT * FROM users');
      log(colors.yellow, `📊 وجدت ${oldUsers.length} مستخدم في النظام القديم`);

      let success = 0;
      let failed = 0;

      for (const user of oldUsers) {
        try {
          // تحويل كلمة السر إلى bcrypt
          let hashedPassword;
          if (user.password && user.password.length > 20) {
            // إذا كانت مشفرة بالفعل (bcrypt)
            hashedPassword = user.password;
          } else {
            // إعادة تشفير
            hashedPassword = await bcrypt.hash(user.password || 'DefaultPass123!', 12);
          }

          // تقسيم الاسم الكامل
          const fullName = user.full_name || user.name || 'Unknown User';
          const nameParts = fullName.trim().split(/\s+/);
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          // إدراج في قاعدة البيانات الجديدة
          await this.newConn.query(
            `INSERT INTO users (
              id, email, username, password, firstName, lastName,
              phone, address, isActive, createdAt, updatedAt
            ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              user.email || `user_${user.id}@alawael.local`,
              user.username || user.email?.split('@')[0] || `user_${user.id}`,
              hashedPassword,
              firstName,
              lastName,
              user.phone || null,
              user.address || null,
              user.is_active === 1 || user.isActive === true || true
            ]
          );

          success++;
          if (success % 100 === 0) {
            log(colors.green, `✓ تم نقل ${success} مستخدم...`);
          }
        } catch (error) {
          failed++;
          this.migrations.errors.push(`User ${user.id}: ${error.message}`);
          log(colors.red, `✗ خطأ بمستخدم ${user.id}: ${error.message}`);
        }
      }

      this.migrations.successful += success;
      this.migrations.failed += failed;

      log(colors.green, '\n✅ انتهى نقل المستخدمين:');
      log(colors.green, `   ✓ نجح: ${success}`);
      log(colors.red, `   ✗ فشل: ${failed}`);

      return { success, failed };
    } catch (error) {
      log(colors.red, `❌ خطأ في نقل المستخدمين: ${error.message}`);
      throw error;
    }
  }

  // ==================== MIGRATION: PRODUCTS ====================
  async migrateProducts() {
    log(colors.blue, '\n📦 بدء هجرة بيانات المنتجات...');

    try {
      const [oldProducts] = await this.oldConn.query('SELECT * FROM products');
      log(colors.yellow, `📊 وجدت ${oldProducts.length} منتج في النظام القديم`);

      let success = 0;
      let failed = 0;

      for (const product of oldProducts) {
        try {
          const pricing = JSON.stringify({
            base: product.price || product.base_price || 0,
            usd: product.price_usd || product.price || 0,
            eur: product.price_eur || 0,
            sar: product.price_sar || 0
          });

          await this.newConn.query(
            `INSERT INTO products (
              id, name, sku, description, pricing, quantity,
              isActive, createdAt, updatedAt
            ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              product.name || product.title || 'Unknown Product',
              product.sku || product.code || `SKU_${product.id}`,
              product.description || null,
              pricing,
              product.quantity || product.stock || 0,
              product.is_active === 1 || product.isActive === true || true
            ]
          );

          success++;
          if (success % 50 === 0) {
            log(colors.green, `✓ تم نقل ${success} منتج...`);
          }
        } catch (error) {
          failed++;
          this.migrations.errors.push(`Product ${product.id}: ${error.message}`);
        }
      }

      this.migrations.successful += success;
      this.migrations.failed += failed;

      log(colors.green, '\n✅ انتهى نقل المنتجات:');
      log(colors.green, `   ✓ نجح: ${success}`);
      log(colors.red, `   ✗ فشل: ${failed}`);

      return { success, failed };
    } catch (error) {
      log(colors.red, `❌ خطأ في نقل المنتجات: ${error.message}`);
      throw error;
    }
  }

  // ==================== VERIFICATION ====================
  async verify() {
    log(colors.blue, '\n🔍 بدء التحقق من البيانات المنقولة...');

    try {
      // عد الصفوف
      const [newUsers] = await this.newConn.query('SELECT COUNT(*) as count FROM users');
      const [newProducts] = await this.newConn.query('SELECT COUNT(*) as count FROM products');

      log(colors.green, '\n📊 عدد الصفوف المنقولة:');
      log(colors.cyan, `   المستخدمين: ${newUsers[0].count}`);
      log(colors.cyan, `   المنتجات: ${newProducts[0].count}`);

      // فحص NULLs
      const [nullEmails] = await this.newConn.query(
        'SELECT COUNT(*) as count FROM users WHERE email IS NULL'
      );
      const [nullNames] = await this.newConn.query(
        'SELECT COUNT(*) as count FROM users WHERE firstName IS NULL'
      );

      log(colors.green, '\n⚠️  فحص البيانات المفقودة:');
      log(
        nullEmails[0].count === 0 ? colors.green : colors.red,
        `   ${nullEmails[0].count === 0 ? '✓' : '✗'} Null emails: ${nullEmails[0].count}`
      );
      log(
        nullNames[0].count === 0 ? colors.green : colors.red,
        `   ${nullNames[0].count === 0 ? '✓' : '✗'} Null names: ${nullNames[0].count}`
      );

      // فحص Passwords
      const [invalidPasswords] = await this.newConn.query(
        'SELECT COUNT(*) as count FROM users WHERE password NOT LIKE "$2b$%"'
      );
      log(
        invalidPasswords[0].count === 0 ? colors.green : colors.red,
        `   ${invalidPasswords[0].count === 0 ? '✓' : '✗'} Password format: ${invalidPasswords[0].count} invalid`
      );

      const totalIssues = nullEmails[0].count + nullNames[0].count + invalidPasswords[0].count;
      if (totalIssues === 0) {
        log(colors.green, '\n✅ الهجرة نجحت! جميع الفحوصات مرت بنجاح!');
        return true;
      } else {
        log(colors.red, `\n❌ توجد ${totalIssues} مشاكل. يرجى المراجعة.`);
        return false;
      }
    } catch (error) {
      log(colors.red, `❌ خطأ في التحقق: ${error.message}`);
      return false;
    }
  }

  // ==================== MAIN EXECUTION ====================
  async run() {
    const startTime = Date.now();

    try {
      log(colors.bright, '\n🚀 بدء عملية الهجرة الشاملة');
      log(colors.bright, '═══════════════════════════════════════════════\n');

      await this.connect();

      // تنفيذ الهجرات بالترتيب
      await this.migrateUsers();
      await this.migrateProducts();

      // التحقق
      const verifyResult = await this.verify();

      // الملخص النهائي
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000 / 60).toFixed(2);

      log(colors.bright, '\n═══════════════════════════════════════════════');
      log(colors.green, `✅ انتهت الهجرة بنجاح في ${duration} دقيقة`);
      log(colors.cyan, `   الإجمالي الناجح: ${this.migrations.successful}`);
      log(colors.red, `   الإجمالي الفاشل: ${this.migrations.failed}`);

      if (this.migrations.errors.length > 0 && this.migrations.errors.length <= 10) {
        log(colors.yellow, '\n📋 الأخطاء (أول 10):');
        this.migrations.errors.slice(0, 10).forEach(e => {
          console.log(`   - ${e}`);
        });
      }

      log(colors.bright, '\n═══════════════════════════════════════════════\n');

      return {
        success: verifyResult,
        duration,
        stats: this.migrations
      };
    } catch (error) {
      log(colors.red, `\n❌ حدث خطأ حرج: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      await this.disconnect();
    }
  }
}

// ==================== SCRIPT EXECUTION ====================
(async () => {
  const migrator = new DatabaseMigration(OLD_DB_CONFIG, NEW_DB_CONFIG);
  const result = await migrator.run();

  process.exit(result.success ? 0 : 1);
})();
