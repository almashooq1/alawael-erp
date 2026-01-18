# 🗄️ Database Schema & Migration Guide

**التاريخ**: يناير 17, 2026  
**الأولوية**: 🔴 CRITICAL - ضروري قبل النشر  
**الحالة**: شامل وجاهز للاستخدام

---

## 📊 نموذج قاعدة البيانات

### 1. جدول المستخدمين (Users)

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    id_number VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(255),
    role ENUM('admin', 'manager', 'employee', 'user') DEFAULT 'user',
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    created_by INT REFERENCES users(id),

    CONSTRAINT email_format CHECK (email LIKE '%@%.%'),
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_status (status),
    INDEX idx_role (role),
    INDEX idx_created_at (created_at)
);
```

### 2. جدول الجلسات (Sessions)

```sql
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    refresh_token_hash VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    login_method ENUM('email', 'phone', 'id_number', 'username', 'smart_login') DEFAULT 'email',
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NOT NULL,
    refresh_expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logged_out_at TIMESTAMP,
    logout_reason VARCHAR(255),

    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_is_active (is_active),
    INDEX idx_expires_at (expires_at),
    INDEX idx_created_at (created_at)
);
```

### 3. جدول سجل النشاط (Activity Log)

```sql
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id INT REFERENCES sessions(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INT,
    details JSON,
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    status ENUM('success', 'failure', 'warning') DEFAULT 'success',
    error_message VARCHAR(500),
    response_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_status (status)
);
```

### 4. جدول المصادقة الثنائية (Two-Factor Authentication)

```sql
CREATE TABLE two_factor_auth (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT FALSE,
    secret_key VARCHAR(255),
    backup_codes JSON,
    method ENUM('totp', 'email', 'sms') DEFAULT 'totp',
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_is_enabled (is_enabled)
);
```

### 5. جدول محاولات المصادقة الثنائية (2FA Attempts)

```sql
CREATE TABLE two_factor_attempts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id INT REFERENCES sessions(id) ON DELETE CASCADE,
    attempt_count INT DEFAULT 1,
    last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    ip_address VARCHAR(50),
    expires_at TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_verified (is_verified),
    INDEX idx_expires_at (expires_at)
);
```

### 6. جدول إعادة تعيين كلمة السر (Password Reset)

```sql
CREATE TABLE password_resets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reset_token_hash VARCHAR(255) UNIQUE NOT NULL,
    email_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    ip_address VARCHAR(50),
    is_used BOOLEAN DEFAULT FALSE,

    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (reset_token_hash),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_used (is_used)
);
```

### 7. جدول سجلات الأمان (Security Audit Log)

```sql
CREATE TABLE security_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    description VARCHAR(500),
    ip_address VARCHAR(50),
    affected_resource VARCHAR(100),
    affected_resource_id INT,
    action_taken VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_event_type (event_type),
    INDEX idx_severity (severity),
    INDEX idx_created_at (created_at)
);
```

---

## 🚀 Migration Scripts

### Migration 001: Initial Schema

```javascript
// backend/db/migrations/001_initial_schema.js

exports.up = async knex => {
  await knex.schema
    .createTable('users', table => {
      table.increments('id').primary();
      table.string('username', 50).unique().notNullable();
      table.string('email', 100).unique().notNullable();
      table.string('phone', 20);
      table.string('id_number', 20).unique();
      table.string('password_hash', 255).notNullable();
      table.string('first_name', 100);
      table.string('last_name', 100);
      table.string('avatar_url', 255);
      table.enum('role', ['admin', 'manager', 'employee', 'user']).defaultTo('user');
      table.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active');
      table.boolean('email_verified').defaultTo(false);
      table.boolean('phone_verified').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('last_login_at');
      table.integer('created_by').references('id').inTable('users');

      table.index('email');
      table.index('username');
      table.index('status');
      table.index('role');
      table.index('created_at');
    })
    .createTable('sessions', table => {
      table.increments('id').primary();
      table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('token_hash', 255).unique().notNullable();
      table.string('refresh_token_hash', 255).unique().notNullable();
      table.string('ip_address', 50);
      table.string('user_agent', 500);
      table.enum('login_method', ['email', 'phone', 'id_number', 'username', 'smart_login']).defaultTo('email');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('expires_at').notNullable();
      table.timestamp('refresh_expires_at').notNullable();
      table.timestamp('last_activity_at').defaultTo(knex.fn.now());
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('logged_out_at');
      table.string('logout_reason', 255);

      table.index('user_id');
      table.index('token_hash');
      table.index('is_active');
      table.index('expires_at');
    })
    .createTable('activity_logs', table => {
      table.increments('id').primary();
      table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('session_id').references('id').inTable('sessions').onDelete('SET NULL');
      table.string('action', 100).notNullable();
      table.string('resource_type', 50);
      table.integer('resource_id');
      table.json('details');
      table.string('ip_address', 50);
      table.string('user_agent', 500);
      table.enum('status', ['success', 'failure', 'warning']).defaultTo('success');
      table.string('error_message', 500);
      table.integer('response_time_ms');
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index('user_id');
      table.index('action');
      table.index('created_at');
    })
    .createTable('two_factor_auth', table => {
      table.increments('id').primary();
      table.integer('user_id').unique().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.boolean('is_enabled').defaultTo(false);
      table.string('secret_key', 255);
      table.json('backup_codes');
      table.enum('method', ['totp', 'email', 'sms']).defaultTo('totp');
      table.boolean('verified').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('last_used_at');

      table.index('user_id');
      table.index('is_enabled');
    })
    .createTable('password_resets', table => {
      table.increments('id').primary();
      table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('reset_token_hash', 255).unique().notNullable();
      table.timestamp('email_sent_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at').notNullable();
      table.timestamp('used_at');
      table.string('ip_address', 50);
      table.boolean('is_used').defaultTo(false);

      table.index('user_id');
      table.index('token_hash');
      table.index('expires_at');
    })
    .createTable('security_audit_logs', table => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('event_type', 100).notNullable();
      table.enum('severity', ['low', 'medium', 'high', 'critical']).defaultTo('medium');
      table.string('description', 500);
      table.string('ip_address', 50);
      table.string('affected_resource', 100);
      table.integer('affected_resource_id');
      table.string('action_taken', 255);
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index('user_id');
      table.index('event_type');
      table.index('severity');
    });
};

exports.down = async knex => {
  await knex.schema
    .dropTableIfExists('security_audit_logs')
    .dropTableIfExists('password_resets')
    .dropTableIfExists('two_factor_auth')
    .dropTableIfExists('activity_logs')
    .dropTableIfExists('sessions')
    .dropTableIfExists('users');
};
```

---

## 📋 Data Seeding

### Seed File: Initial Data

```javascript
// backend/db/seeds/001_initial_data.js

exports.seed = async knex => {
  // حذف البيانات الموجودة
  await knex('users').del();

  // إدراج بيانات أولية
  await knex('users').insert([
    {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      phone: '+966501234567',
      password_hash: '$2b$10$...', // bcrypt hash
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      status: 'active',
      email_verified: true,
      phone_verified: true,
    },
    {
      id: 2,
      username: 'manager',
      email: 'manager@example.com',
      phone: '+966502234567',
      password_hash: '$2b$10$...',
      first_name: 'Manager',
      last_name: 'User',
      role: 'manager',
      status: 'active',
      email_verified: true,
    },
  ]);
};
```

---

## 🔧 نموذج نظام Database.js

```javascript
// backend/config/database.js

const knex = require('knex');
const path = require('path');

const environment = process.env.NODE_ENV || 'development';

const config = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, '../data/app.db'),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, '../db/migrations'),
      loadExtensions: ['.js'],
    },
    seeds: {
      directory: path.join(__dirname, '../db/seeds'),
      loadExtensions: ['.js'],
    },
  },

  production: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: path.join(__dirname, '../db/migrations'),
    },
    seeds: {
      directory: path.join(__dirname, '../db/seeds'),
    },
  },
};

const db = knex(config[environment]);

module.exports = db;
```

---

## 📊 Indexed Queries (أمثلة الاستعلامات المحسّنة)

```javascript
// الاستعلامات الأكثر استخداماً والمحسّنة

// 1. الحصول على المستخدم بالبريد الإلكتروني
SELECT * FROM users WHERE email = ? AND status = 'active';

// 2. الحصول على الجلسات النشطة للمستخدم
SELECT * FROM sessions
WHERE user_id = ? AND is_active = TRUE AND expires_at > NOW();

// 3. سجل النشاط الحديث
SELECT * FROM activity_logs
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 100;

// 4. التحقق من محاولات إعادة تعيين كلمة السر
SELECT * FROM password_resets
WHERE user_id = ? AND is_used = FALSE AND expires_at > NOW();

// 5. سجل الأمان الحرج
SELECT * FROM security_audit_logs
WHERE severity IN ('high', 'critical')
ORDER BY created_at DESC;
```

---

## ✅ Checklist: تطبيق قاعدة البيانات

```
قبل النشر:
☐ تشغيل جميع Migrations
☐ تحميل Seed Data الأولية
☐ اختبار جميع الاستعلامات
☐ التحقق من Indexes
☐ اختبار الأداء (< 100ms للاستعلام)
☐ النسخ الاحتياطية تعمل

بعد النشر:
☐ مراقبة حجم قاعدة البيانات
☐ تنظيف البيانات القديمة
☐ تحسين الاستعلامات البطيئة
☐ فحص السجلات الدورية
```

---

**الحالة**: ✅ جاهز للاستخدام الفوري  
**الإصدار**: 1.0  
**آخر تحديث**: يناير 17, 2026
