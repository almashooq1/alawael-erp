#!/usr/bin/env node
/**
 * Database Migration - Test Data Preparation
 * Purpose: Create test databases with sample data for 26 Feb testing
 * Usage: node test-data-setup.js
 */

const mysql = require('mysql2/promise');

const ADMIN_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_ADMIN_USER || 'root',
  password: process.env.DB_ADMIN_PASSWORD || '',
  multipleStatements: true
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

class TestDataSetup {
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

  async dropDatabases() {
    log(colors.cyan, '🗑️ ', 'جاري حذف قواعد البيانات الاختبارية القديمة...');

    try {
      await this.conn.query('DROP DATABASE IF EXISTS test_alawael_old');
      log(colors.green, '✓', 'تم حذف test_alawael_old');

      await this.conn.query('DROP DATABASE IF EXISTS test_alawael_new');
      log(colors.green, '✓', 'تم حذف test_alawael_new');
    } catch (error) {
      log(colors.yellow, '⚠️ ', `تحذير: ${error.message}`);
    }
  }

  async createDatabases() {
    log(colors.cyan, '📦', 'جاري إنشاء قواعد البيانات...');

    try {
      await this.conn.query(
        'CREATE DATABASE test_alawael_old CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
      );
      log(colors.green, '✓', 'تم إنشاء test_alawael_old');

      await this.conn.query(
        'CREATE DATABASE test_alawael_new CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
      );
      log(colors.green, '✓', 'تم إنشاء test_alawael_new');
    } catch (error) {
      log(colors.red, '✗', `خطأ في إنشاء البيانات: ${error.message}`);
      throw error;
    }
  }

  async createOldDatabaseSchema() {
    log(colors.cyan, '📋', 'جاري إنشاء جداول القاعدة القديمة...');

    const schema = `
      USE test_alawael_old;

      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100),
        password VARCHAR(255),
        full_name VARCHAR(255),
        name VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE products (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255),
        title VARCHAR(255),
        sku VARCHAR(100),
        code VARCHAR(100),
        description TEXT,
        price DECIMAL(10,2),
        base_price DECIMAL(10,2),
        price_usd DECIMAL(10,2),
        price_eur DECIMAL(10,2),
        price_sar DECIMAL(10,2),
        quantity INT DEFAULT 0,
        stock INT DEFAULT 0,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        order_number VARCHAR(100),
        total_amount DECIMAL(12,2),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    try {
      await this.conn.query(schema);
      log(colors.green, '✓', 'تم إنشاء جداول القاعدة القديمة');
    } catch (error) {
      log(colors.red, '✗', `خطأ: ${error.message}`);
      throw error;
    }
  }

  async createNewDatabaseSchema() {
    log(colors.cyan, '📋', 'جاري إنشاء جداول القاعدة الجديدة...');

    const schema = `
      USE test_alawael_new;

      CREATE TABLE users (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        firstName VARCHAR(100) NOT NULL,
        lastName VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        isActive BOOLEAN DEFAULT true,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      CREATE TABLE products (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        pricing JSON,
        quantity INT DEFAULT 0,
        isActive BOOLEAN DEFAULT true,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;

    try {
      await this.conn.query(schema);
      log(colors.green, '✓', 'تم إنشاء جداول القاعدة الجديدة');
    } catch (error) {
      log(colors.red, '✗', `خطأ: ${error.message}`);
      throw error;
    }
  }

  async insertTestData() {
    log(colors.cyan, '📊', 'جاري إدراج بيانات الاختبار...');

    try {
      // إدراج مستخدمين اختبار
      const users = [
        {
          email: 'ali@test.com',
          username: 'ali',
          password: '$2b$12$abcdefghijklmnopqrstuvwxyz',
          full_name: 'علي محمد'
        },
        {
          email: 'fatima@test.com',
          username: 'fatima',
          password: '$2b$12$abcdefghijklmnopqrstuvwxyz',
          full_name: 'فاطمة أحمد'
        },
        {
          email: 'hassan@test.com',
          username: 'hassan',
          password: '$2b$12$abcdefghijklmnopqrstuvwxyz',
          full_name: 'حسن علي'
        },
        {
          email: 'amira@test.com',
          username: 'amira',
          password: '$2b$12$abcdefghijklmnopqrstuvwxyz',
          full_name: 'أميرة محمود'
        },
        {
          email: 'admin@test.com',
          username: 'admin',
          password: '$2b$12$abcdefghijklmnopqrstuvwxyz',
          full_name: 'مدير النظام'
        }
      ];

      for (const user of users) {
        await this.conn.query(
          'INSERT INTO test_alawael_old.users (email, username, password, full_name, is_active) VALUES (?, ?, ?, ?, 1)',
          [user.email, user.username, user.password, user.full_name]
        );
      }
      log(colors.green, '✓', `تم إدراج ${users.length} مستخدم اختبار`);

      // إدراج منتجات اختبار
      const products = [
        {
          name: 'شاحن الهاتف',
          sku: 'CHARGER-001',
          price: 50,
          price_usd: 13,
          price_eur: 12,
          price_sar: 50
        },
        {
          name: 'كابل USB',
          sku: 'CABLE-USB-001',
          price: 20,
          price_usd: 5,
          price_eur: 5,
          price_sar: 20
        },
        {
          name: 'سماعات رأس',
          sku: 'HEADPHONE-001',
          price: 150,
          price_usd: 40,
          price_eur: 37,
          price_sar: 150
        },
        {
          name: 'حقيبة حماية',
          sku: 'CASE-001',
          price: 80,
          price_usd: 21,
          price_eur: 20,
          price_sar: 80
        },
        {
          name: 'لاصقة حماية',
          sku: 'PROTECTOR-001',
          price: 30,
          price_usd: 8,
          price_eur: 7,
          price_sar: 30
        }
      ];

      for (const product of products) {
        await this.conn.query(
          'INSERT INTO test_alawael_old.products (name, sku, price, price_usd, price_eur, price_sar, quantity, is_active) VALUES (?, ?, ?, ?, ?, ?, 100, 1)',
          [
            product.name,
            product.sku,
            product.price,
            product.price_usd,
            product.price_eur,
            product.price_sar
          ]
        );
      }
      log(colors.green, '✓', `تم إدراج ${products.length} منتج اختبار`);

      // إدراج طلبات اختبار
      const orders = [
        { user_id: 1, order_number: 'ORD-001', total_amount: 100 },
        { user_id: 2, order_number: 'ORD-002', total_amount: 200 },
        { user_id: 1, order_number: 'ORD-003', total_amount: 150 },
        { user_id: 3, order_number: 'ORD-004', total_amount: 300 }
      ];

      for (const order of orders) {
        await this.conn.query(
          'INSERT INTO test_alawael_old.orders (user_id, order_number, total_amount, status) VALUES (?, ?, ?, "pending")',
          [order.user_id, order.order_number, order.total_amount]
        );
      }
      log(colors.green, '✓', `تم إدراج ${orders.length} طلب اختبار`);
    } catch (error) {
      log(colors.red, '✗', `خطأ في إدراج البيانات: ${error.message}`);
      throw error;
    }
  }

  async verifySetup() {
    log(colors.cyan, '🔍', 'جاري التحقق من بيانات الاختبار...');

    try {
      const [users] = await this.conn.query('SELECT COUNT(*) as count FROM test_alawael_old.users');
      const [products] = await this.conn.query(
        'SELECT COUNT(*) as count FROM test_alawael_old.products'
      );
      const [orders] = await this.conn.query(
        'SELECT COUNT(*) as count FROM test_alawael_old.orders'
      );

      console.log(`\n${colors.cyan}📊 ملخص البيانات الاختبارية:${colors.reset}`);
      console.log(`   المستخدمين: ${users[0].count}`);
      console.log(`   المنتجات: ${products[0].count}`);
      console.log(`   الطلبات: ${orders[0].count}\n`);

      return true;
    } catch (error) {
      log(colors.red, '✗', `خطأ التحقق: ${error.message}`);
      return false;
    }
  }

  async run() {
    try {
      log(colors.bright, '🚀', '\nبدء تحضير بيانات الاختبار');
      log(colors.bright, '═', '═'.repeat(50) + '\n');

      await this.connect();

      await this.dropDatabases();
      console.log('');

      await this.createDatabases();
      console.log('');

      await this.createOldDatabaseSchema();
      await this.createNewDatabaseSchema();
      console.log('');

      await this.insertTestData();
      console.log('');

      await this.verifySetup();

      log(colors.bright, '═', '═'.repeat(50));
      log(colors.green, '✅', 'انتهى تحضير بيانات الاختبار بنجاح!\n');

      console.log(`${colors.yellow}الخطve التالية:${colors.reset}`);
      console.log('  1. عدّل الملف: migration-script-main.js');
      console.log('  2. اضبط: OLD_DB_CONFIG و NEW_DB_CONFIG');
      console.log('  3. شغل الأمر: node migration-script-main.js\n');

      console.log(`${colors.cyan}بيانات الاتصال الاختبارية:${colors.reset}`);
      console.log('  OLD Database: test_alawael_old');
      console.log('  NEW Database: test_alawael_new\n');

      return true;
    } catch (error) {
      log(colors.red, '❌', `خطأ حرج: ${error.message}`);
      return false;
    } finally {
      await this.disconnect();
    }
  }
}

// التنفيذ
(async () => {
  const setup = new TestDataSetup(ADMIN_CONFIG);
  const success = await setup.run();
  process.exit(success ? 0 : 1);
})();
