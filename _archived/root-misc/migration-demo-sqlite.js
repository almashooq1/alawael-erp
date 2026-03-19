#!/usr/bin/env node
/**
 * Database Migration Demo - SQLite Version
 * Purpose: Complete migration demonstration using SQLite
 * No MySQL installation required!
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, emoji, message) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

class SQLiteMigrationDemo {
  constructor() {
    this.oldDb = null;
    this.newDb = null;
    this.stats = {
      users: { source: 0, target: 0, success: 0, failed: 0 },
      products: { source: 0, target: 0, success: 0, failed: 0 }
    };
  }

  async initialize() {
    log(colors.cyan, '📦', 'جاري تحضير قواعد البيانات SQLite...');

    return new Promise((resolve, reject) => {
      // قاعدة البيانات القديمة (محاكاة)
      this.oldDb = new sqlite3.Database(':memory:', err => {
        if (err) reject(err);
        log(colors.green, '✓', 'قاعدة البيانات القديمة جاهزة (في الذاكرة)');
      });

      // قاعدة البيانات الجديدة (محاكاة)
      this.newDb = new sqlite3.Database(':memory:', err => {
        if (err) reject(err);
        log(colors.green, '✓', 'قاعدة البيانات الجديدة جاهزة (في الذاكرة)');
        resolve();
      });
    });
  }

  async createSchema() {
    log(colors.cyan, '📋', 'جاري إنشاء جداول قاعدة البيانات...');

    return new Promise((resolve, reject) => {
      // قاعدة البيانات القديمة
      this.oldDb.serialize(() => {
        this.oldDb.run(`
          CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            username TEXT,
            password TEXT,
            full_name TEXT,
            phone TEXT,
            address TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        this.oldDb.run(`
          CREATE TABLE products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            sku TEXT UNIQUE,
            description TEXT,
            price REAL,
            price_usd REAL,
            price_eur REAL,
            price_sar REAL,
            quantity INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        log(colors.green, '✓', 'تم إنشاء جداول قاعدة البيانات القديمة');
      });

      // قاعدة البيانات الجديدة
      this.newDb.serialize(() => {
        this.newDb.run(`
          CREATE TABLE users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            firstName TEXT,
            lastName TEXT,
            phone TEXT,
            address TEXT,
            isActive INTEGER DEFAULT 1,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        this.newDb.run(
          `
          CREATE TABLE products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            sku TEXT UNIQUE NOT NULL,
            description TEXT,
            pricing TEXT,
            quantity INTEGER DEFAULT 0,
            isActive INTEGER DEFAULT 1,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `,
          () => {
            log(colors.green, '✓', 'تم إنشاء جداول قاعدة البيانات الجديدة');
            resolve();
          }
        );
      });
    });
  }

  async insertTestData() {
    log(colors.cyan, '📊', 'جاري إدراج بيانات الاختبار...');

    const users = [
      { email: 'ali@alawael.com', username: 'ali', password: 'password123', full_name: 'علي محمد' },
      {
        email: 'fatima@alawael.com',
        username: 'fatima',
        password: 'password123',
        full_name: 'فاطمة أحمد'
      },
      {
        email: 'hassan@alawael.com',
        username: 'hassan',
        password: 'password123',
        full_name: 'حسن علي'
      },
      {
        email: 'admin@alawael.com',
        username: 'admin',
        password: 'admin123',
        full_name: 'مدير النظام'
      },
      {
        email: 'user5@alawael.com',
        username: 'user5',
        password: 'password123',
        full_name: 'مستخدم خمسة'
      }
    ];

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

    return new Promise(resolve => {
      // إدراج المستخدمين
      users.forEach(user => {
        this.oldDb.run(
          'INSERT INTO users (email, username, password, full_name, is_active) VALUES (?, ?, ?, ?, 1)',
          [user.email, user.username, user.password, user.full_name]
        );
      });

      // إدراج المنتجات
      products.forEach(product => {
        this.oldDb.run(
          'INSERT INTO products (name, sku, price, price_usd, price_eur, price_sar, quantity, is_active) VALUES (?, ?, ?, ?, ?, ?, 100, 1)',
          [
            product.name,
            product.sku,
            product.price,
            product.price_usd,
            product.price_eur,
            product.price_sar
          ]
        );
      });

      // الانتظار حتى الانتهاء
      setTimeout(() => {
        this.oldDb.all('SELECT COUNT(*) as count FROM users', (err, rows) => {
          this.stats.users.source = rows[0].count;
          log(colors.green, '✓', `تم إدراج ${this.stats.users.source} مستخدمين`);
        });

        this.oldDb.all('SELECT COUNT(*) as count FROM products', (err, rows) => {
          this.stats.products.source = rows[0].count;
          log(colors.green, '✓', `تم إدراج ${this.stats.products.source} منتجات`);
          resolve();
        });
      }, 100);
    });
  }

  async migrateUsers() {
    log(colors.blue, '📋', 'بدء هجرة المستخدمين...');

    return new Promise(resolve => {
      this.oldDb.all('SELECT * FROM users', async (err, users) => {
        if (err) {
          log(colors.red, '✗', `خطأ: ${err.message}`);
          resolve();
          return;
        }

        let success = 0;
        let failed = 0;

        for (const user of users) {
          try {
            const hashedPassword = await bcrypt.hash(user.password, 12);
            const nameParts = (user.full_name || '').split(/\s+/);
            const firstName = nameParts[0] || 'Unknown';
            const lastName = nameParts.slice(1).join(' ') || '';

            this.newDb.run(
              `INSERT INTO users (id, email, username, password, firstName, lastName, phone, address, isActive)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                uuidv4(),
                user.email,
                user.username,
                hashedPassword,
                firstName,
                lastName,
                user.phone,
                user.address,
                user.is_active
              ],
              err => {
                if (!err) success++;
                else failed++;
              }
            );
          } catch (error) {
            failed++;
          }
        }

        setTimeout(() => {
          this.stats.users.success = success;
          this.stats.users.failed = failed;
          log(colors.green, '✅', `انتهى نقل المستخدمين: النجح: ${success}, الفشل: ${failed}`);
          resolve();
        }, 500);
      });
    });
  }

  async migrateProducts() {
    log(colors.blue, '📦', 'بدء هجرة المنتجات...');

    return new Promise(resolve => {
      this.oldDb.all('SELECT * FROM products', (err, products) => {
        if (err) {
          log(colors.red, '✗', `خطأ: ${err.message}`);
          resolve();
          return;
        }

        let success = 0;
        let failed = 0;

        products.forEach(product => {
          try {
            const pricing = JSON.stringify({
              base: product.price || 0,
              usd: product.price_usd || 0,
              eur: product.price_eur || 0,
              sar: product.price_sar || 0
            });

            this.newDb.run(
              `INSERT INTO products (id, name, sku, description, pricing, quantity, isActive)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                uuidv4(),
                product.name,
                product.sku,
                product.description,
                pricing,
                product.quantity,
                product.is_active
              ],
              err => {
                if (!err) success++;
                else failed++;
              }
            );
          } catch (error) {
            failed++;
          }
        });

        setTimeout(() => {
          this.stats.products.success = success;
          this.stats.products.failed = failed;
          log(colors.green, '✅', `انتهى نقل المنتجات: النجح: ${success}, الفشل: ${failed}`);
          resolve();
        }, 500);
      });
    });
  }

  async verify() {
    log(colors.blue, '🔍', 'بدء التحقق من البيانات...');

    return new Promise(resolve => {
      this.newDb.all('SELECT COUNT(*) as count FROM users', (err, rows) => {
        const newUsersCount = rows[0].count;
        log(colors.cyan, '📊', `المستخدمين في قاعدة البيانات الجديدة: ${newUsersCount}`);

        this.newDb.all('SELECT COUNT(*) as count FROM products', (err, rows) => {
          const newProductsCount = rows[0].count;
          log(colors.cyan, '📊', `المنتجات في قاعدة البيانات الجديدة: ${newProductsCount}`);

          // فحص التطابق
          const usersMatch = newUsersCount === this.stats.users.source;
          const productsMatch = newProductsCount === this.stats.products.source;

          log(colors.cyan, '⚠️', 'فحص النتائج:');
          log(
            usersMatch ? colors.green : colors.red,
            usersMatch ? '✓' : '✗',
            `المستخدمين: ${usersMatch ? 'متطابق' : 'غير متطابق'}`
          );
          log(
            productsMatch ? colors.green : colors.red,
            productsMatch ? '✓' : '✗',
            `المنتجات: ${productsMatch ? 'متطابق' : 'غير متطابق'}`
          );

          // عرض عينة من البيانات
          this.newDb.all('SELECT email, firstName, lastName FROM users LIMIT 3', (err, rows) => {
            log(colors.cyan, '👥', 'عينة من المستخدمين المنقولين:');
            rows.forEach(row => {
              console.log(
                `   ${colors.green}✓${colors.reset} ${row.firstName} ${row.lastName} (${row.email})`
              );
            });

            resolve(usersMatch && productsMatch);
          });
        });
      });
    });
  }

  async run() {
    try {
      log(colors.bright, '🚀', '\nبدء عملية الهجرة المحاكاة (SQLite Demo)');
      log(colors.bright, '═', '═'.repeat(60) + '\n');

      const startTime = Date.now();

      await this.initialize();
      console.log('');

      await this.createSchema();
      console.log('');

      await this.insertTestData();
      console.log('');

      await this.migrateUsers();
      await this.migrateProducts();
      console.log('');

      const success = await this.verify();
      console.log('');

      const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

      log(colors.bright, '═', '═'.repeat(60));
      if (success) {
        log(colors.green, '✅', `انتهت الهجرة بنجاح في ${duration} دقيقة!`);
      } else {
        log(colors.red, '⚠️', 'انتهت الهجرة مع بعض المشاكل');
      }
      log(colors.bright, '═', '═'.repeat(60) + '\n');

      return success;
    } catch (error) {
      log(colors.red, '❌', `خطأ حرج: ${error.message}`);
      return false;
    } finally {
      this.oldDb?.close();
      this.newDb?.close();
    }
  }
}

// التنفيذ
(async () => {
  const demo = new SQLiteMigrationDemo();
  const success = await demo.run();
  process.exit(success ? 0 : 1);
})();
