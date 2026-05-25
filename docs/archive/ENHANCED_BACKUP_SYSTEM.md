# 📚 ENHANCED BACKUP MANAGEMENT SYSTEM - DOCUMENTATION

# نظام إدارة النسخ الاحتياطية المحسّن - التوثيق الشامل

## 🎯 نظرة عامة | Overview

نظام إدارة النسخ الاحتياطية المحسّن يوفر حلاً شاملاً وموثوقاً لضمان حماية البيانات واستمرارية العمل.

The Enhanced Backup Management System provides a comprehensive and reliable solution for data protection and business continuity.

**الإصدار | Version:** 2.0.0  
**آخر تحديث | Last Updated:** February 2026  
**الحالة | Status:** ✅ Production Ready

---

## 📋 جدول المحتويات | Table of Contents

1. [المميزات الرئيسية | Key Features](#المميزات-الرئيسية)
2. [البنية المعمارية | Architecture](#البنية-المعمارية)
3. [المتطلبات | Requirements](#المتطلبات)
4. [التثبيت والإعداد | Installation & Setup](#التثبيت-والإعداد)
5. [سير العمل | Workflows](#سير-العمل)
6. [API المراجع | API Reference](#api-المراجع)
7. [أمثلة الاستخدام | Usage Examples](#أمثلة-الاستخدام)
8. [المراقبة والتنبيهات | Monitoring & Alerts](#المراقبة-والتنبيهات)
9. [التعافي من الكوارث | Disaster Recovery](#التعافي-من-الكوارث)
10. [استكشاف الأخطاء | Troubleshooting](#استكشاف-الأخطاء)

---

## 🌟 المميزات الرئيسية | Key Features

### نسخ احتياطية تلقائية ويدوية | Automated & Manual Backups

```text
✅ جدولة تلقائية يومية | Daily automated scheduling
✅ نسخ كاملة وزيادية | Full and incremental backups
✅ إنشاء يدوي حسب الطلب | On-demand manual creation
✅ تتبع مفصل للتقدم | Detailed progress tracking
```

### تخزين متعدد المواقع | Multi-Location Storage

```text
✅ التخزين المحلي | Local storage
✅ AWS S3 | Amazon S3
✅ Google Cloud Storage (GCS)
✅ Azure Blob Storage
✅ SFTP/FTP
```

### التشفير والضغط | Encryption & Compression

```text
✅ تشفير AES-256 | AES-256 Encryption
✅ ضغط Gzip | Gzip Compression
✅ حساب SHA-256 للتحقق | SHA-256 Checksums
✅ التحقق من السلامة | Integrity Verification
```

### المراقبة والتنبيهات | Monitoring & Alerts

```text
✅ فحوصات الصحة المستمرة | Continuous health checks
✅ تتبع مقاييس الأداء | Performance metrics tracking
✅ نظام تنبيهات ذكي | Intelligent alert system
✅ تقارير شاملة | Comprehensive reports
```

### إدارة متقدمة | Advanced Management

```text
✅ استعادة من نسخة احتياطية | Backup restoration
✅ التحقق من السلامة | Integrity validation
✅ تنظيف تلقائي للنسخ القديمة | Automatic old backup cleanup
✅ نسخ احتياطية متعددة | Backup replication
```

---

## 🏗️ البنية المعمارية | Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    BACKUP SYSTEM ARCHITECTURE                │
└─────────────────────────────────────────────────────────────┘

┌────────────────────────────┐
│   API Layer (REST)         │
│  (backups.routes.js)       │
└────────────┬───────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────────┐   ┌───▼────────────┐
│  Enhanced  │   │  Monitoring    │
│  Backup    │   │  Service       │
│  Service   │   └────────────────┘
└───┬────────┘
    │
    ▼
┌────────────────────────────┐
│  Multi-Location Storage    │
│  (backup-multi-location)   │
└────────────┬───────────────┘
             │
    ┌────────┴────────┬───────────┬──────────────┐
    │                 │           │              │
┌───▼──────┐  ┌───────▼───┐ ┌────▼──┐ ┌────────▼────┐
│  Local   │  │   AWS S3  │ │  GCS  │ │    Azure    │
│ Storage  │  │           │ │       │ │   Storage  │
└──────────┘  └───────────┘ └───────┘ └────────────┘
```

---

## 📦 المتطلبات | Requirements

### Node.js & npm

```bash
Node.js >= 14.0.0
npm >= 6.0.0
```

### المكتبات المطلوبة | Required Packages

```json
{
  "dependencies": {
    "express": "^4.17.1",
    "mongoose": "^5.10.0",
    "aws-sdk": "^2.800.0",
    "crypto": "built-in",
    "fs": "built-in",
    "zlib": "built-in"
  },
  "devDependencies": {
    "jest": "^26.0.0",
    "supertest": "^6.0.0"
  }
}
```

### متغيرات البيئة | Environment Variables

```bash
# Backup Configuration
BACKUP_STORAGE_PATH=./backups
BACKUP_ENCRYPTION_KEY=your-32-byte-hex-key
ENABLE_AUTO_BACKUP=true
MAX_BACKUPS=10
BACKUP_RETENTION_DAYS=30

# AWS S3 (Optional)
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-key

# MongoDB
MONGODB_URI=mongodb://localhost:27017/erp_db
```

---

## 🔧 التثبيت والإعداد | Installation & Setup

### الخطوة 1: تثبيت المكتبات | Step 1: Install Dependencies

```bash
npm install express mongoose aws-sdk
npm install --save-dev jest supertest
```

### الخطوة 2: إضافة المتغيرات البيئية | Step 2: Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### الخطوة 3: إنشاء مفتاح التشفير | Step 3: Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### الخطوة 4: تثبيت API Routes | Step 4: Install API Routes

```javascript
// في server.js / In server.js
const backupRoutes = require('./routes/backups.routes');
app.use('/api/backups', backupRoutes);
```

### الخطوة 5: تهيئة الخدمات | Step 5: Initialize Services

```javascript
const enhancedBackup = require('./services/enhanced-backup.service');
const backupMonitoring = require('./services/backup-monitoring.service');

// Start monitoring
backupMonitoring.startHealthCheck();

// Schedule automatic backups
enhancedBackup.scheduleBackups('0 2 * * *'); // 2 AM daily
```

---

## 🔄 سير العمل | Workflows

### سير عمل النسخ الكاملة | Full Backup Workflow

```text
1. إطلاق النسخ الاحتياطية | Create Backup
   └─ التحقق من المتطلبات | Verify prerequisites

2. تنفيذ النسخ | Execute Backup
   └─ تصدير قاعدة البيانات | Export database

3. معالجة ما بعد النسخ | Post-Processing
   ├─ الضغط | Compression
   ├─ التشفير | Encryption
   └─ حساب البصمة | Checksum calculation

4. التحقق | Verification
   └─ اختبار السلامة | Integrity test

5. التخزين | Storage
   ├─ التخزين المحلي | Local storage
   ├─ التخزين السحابي | Cloud storage
   └─ النسخ الاحتياطية | Replication

6. التنظيف | Cleanup
   ├─ حذف النسخ القديمة | Remove old backups
   └─ تحديث البيانات الوصفية | Update metadata
```

### سير عمل الاستعادة | Restore Workflow

```text
1. اختيار النسخة | Select Backup
   └─ التحقق من صحتها | Verify backup

2. فك التشفير (إن وجد) | Decryption
   └─ استخدام مفتاح التشفير | Use encryption key

3. فك الضغط | Decompression
   └─ استخراج البيانات | Extract data

4. استعادة قاعدة البيانات | Restore Database
   └─ mongorestore command

5. التحقق | Verification
   └─ اختبار صحة البيانات | Data integrity test

6. الإبلاغ | Reporting
   └─ توثيق العملية | Log operation
```

---

## 📡 API المراجع | API Reference

### 1. إنشاء نسخة احتياطية | Create Backup

**Request**

```http
POST /api/backups/create
Content-Type: application/json
Authorization: Bearer {token}

{
  "type": "FULL",
  "description": "Manual backup"
}
```

**Response**

```json
{
  "success": true,
  "message": "Backup created successfully",
  "backup": {
    "id": "backup-2026-02-18-abc123",
    "type": "FULL",
    "status": "COMPLETED",
    "size": 1073741824,
    "compressed": true,
    "encrypted": true,
    "verified": true,
    "checksum": "sha256hash...",
    "startTime": "2026-02-18T10:30:00Z",
    "endTime": "2026-02-18T10:35:30Z",
    "duration": 330000
  }
}
```

### 2. قائمة النسخ الاحتياطية | List Backups

**Request**

```http
GET /api/backups/list?type=FULL&status=COMPLETED&limit=50
Authorization: Bearer {token}
```

**Response**

```json
{
  "success": true,
  "count": 15,
  "backups": [
    {
      "id": "backup-2026-02-18-abc123",
      "type": "FULL",
      "status": "COMPLETED",
      "size": 1073741824,
      "startTime": "2026-02-18T10:30:00Z",
      "endTime": "2026-02-18T10:35:30Z"
    }
  ]
}
```

### 3. الحصول على تفاصيل النسخة | Get Backup Details

**Request**

```http
GET /api/backups/{backupId}
Authorization: Bearer {token}
```

**Response**

```json
{
  "success": true,
  "backup": {
    "id": "backup-2026-02-18-abc123",
    "type": "FULL",
    "status": "COMPLETED",
    "size": 1073741824,
    "checksum": "sha256hash...",
    "verified": true,
    "startTime": "2026-02-18T10:30:00Z",
    "fileSize": 1073741824,
    "lastModified": "2026-02-18T10:35:30Z"
  }
}
```

### 4. استعادة من نسخة اح | Restore Backup

**Request**

```http
POST /api/backups/{backupId}/restore
Content-Type: application/json
Authorization: Bearer {token}

{
  "force": false,
  "verify": true
}
```

**Response**

```json
{
  "success": true,
  "message": "Restore completed successfully",
  "result": {
    "success": true,
    "backupId": "backup-2026-02-18-abc123",
    "restoredAt": "2026-02-18T10:40:00Z"
  }
}
```

### 5. حالة الصحة | Health Status

**Request**

```http
GET /api/backups/health/status
Authorization: Bearer {token}
```

**Response**

```json
{
  "success": true,
  "health": {
    "status": "HEALTHY",
    "timestamp": "2026-02-18T10:45:00Z",
    "issues": [],
    "metrics": {
      "successRate": "98.50%",
      "diskSpace": "250.0 GB",
      "lastBackup": "backup-2026-02-18-abc123"
    }
  }
}
```

### 6. المقاييس | Metrics

**Request**

```http
GET /api/backups/metrics/current
Authorization: Bearer {token}
```

**Response**

```json
{
  "success": true,
  "metrics": {
    "totalBackups": 150,
    "successfulBackups": 148,
    "failedBackups": 2,
    "successRate": 0.9867,
    "averageDuration": 330000,
    "averageSize": 1073741824,
    "totalSize": 161061273600,
    "healthStatus": "HEALTHY",
    "activeAlerts": 0
  }
}
```

### 7. حذف نسخة اح | Delete Backup

**Request**

```http
DELETE /api/backups/{backupId}
Authorization: Bearer {token}
```

**Response**

```json
{
  "success": true,
  "message": "Backup deleted successfully"
}
```

---

## 💡 أمثلة الاستخدام | Usage Examples

### مثال 1: إنشاء نسخة احتياطية كاملة | Create Full Backup

```javascript
const enhancedBackup = require('./services/enhanced-backup.service');

async function createFullBackup() {
  try {
    const backup = await enhancedBackup.createBackup({
      type: 'FULL',
      description: 'Monthly full backup',
      triggeredBy: 'ADMIN',
      compress: true,
      encrypt: true,
      verify: true,
    });

    console.log('✅ Backup created:', backup.id);
    console.log('   Size:', backup.size, 'bytes');
    console.log('   Duration:', backup.duration, 'ms');
    return backup;
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
  }
}

// Usage
await createFullBackup();
```

### مثال 2: الاستعادة من نسخة احتياطية | Restore from Backup

```javascript
async function restoreBackup() {
  try {
    const result = await enhancedBackup.restoreBackup('backup-2026-02-18-abc123', {
      force: false,
      verify: true,
    });

    console.log('✅ Restore completed:', result);
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
  }
}

// Usage
await restoreBackup();
```

### مثال 3: جدولة النسخ الاحتياطية التلقائية | Schedule Automatic Backups

```javascript
// في ملف البدء | In startup file
const enhancedBackup = require('./services/enhanced-backup.service');

// جدولة النسخ الاحتياطية اليومية في الساعة 2 صباحاً
// Schedule daily backups at 2 AM
enhancedBackup.scheduleBackups('0 2 * * *');

console.log('✅ Automatic backups scheduled');
```

### مثال 4: مراقبة صحة النظام | Monitor System Health

```javascript
const backupMonitoring = require('./services/backup-monitoring.service');

// الاستماع لأحداث الصحة | Listen to health events
backupMonitoring.on('health:checked', health => {
  console.log('Health Status:', health.status);

  if (health.status !== 'HEALTHY') {
    console.warn('Issues detected:', health.issues);
  }
});

// الحصول على المقاييس الحالية | Get current metrics
const metrics = backupMonitoring.getMetrics();
console.log('Success Rate:', metrics.successRate);
console.log('Active Alerts:', metrics.activeAlerts);
```

### مثال 5: التحقق من سلامة النسخة | Validate Backup

```javascript
async function validateBackup() {
  const validation = await backupMonitoring.validateBackup('backup-2026-02-18-abc123');

  if (validation.valid) {
    console.log('✅ Backup is valid');
  } else {
    console.log('❌ Backup has issues:');
    validation.issues.forEach(issue => console.log('  -', issue));
  }
}

// Usage
await validateBackup();
```

### مثال 6: النسخ إلى عدة مواقع | Replicate to Multiple Locations

```javascript
const multiLocationStorage = require('./services/backup-multi-location.service');

async function replicateBackup() {
  const results = await multiLocationStorage.replicateBackup('backup-2026-02-18-abc123');

  results.forEach(result => {
    console.log(`${result.location}: ${result.status}`);
  });
}

// Usage
await replicateBackup();
```

---

## 📊 المراقبة والتنبيهات | Monitoring & Alerts

### نوع التنبيهات | Alert Types

| الحالة      | الوصف   | الإجراء    |
| ----------- | ------- | ---------- |
| 🔴 CRITICAL | خطأ حرج | تنبيه فوري |
| 🟡 WARNING  | تحذير   | متابعة     |
| 🔵 INFO     | معلومة  | تسجيل      |

### أمثلة التنبيهات | Alert Examples

```javascript
// Backup system unhealthy
{
  id: 'alert-1707138300000',
  level: 'CRITICAL',
  type: 'HEALTH_CHECK',
  message: 'Last backup was 72 hours ago',
  timestamp: '2026-02-18T10:45:00Z',
  resolved: false,
}

// Low disk space
{
  id: 'alert-1707138400000',
  level: 'WARNING',
  type: 'DISK_SPACE',
  message: 'Low disk space: 250 GB available',
  timestamp: '2026-02-18T10:46:00Z',
  resolved: false,
}
```

### إدارة التنبيهات | Alert Management

```javascript
// الحصول على التنبيهات النشطة | Get active alerts
const activeAlerts = backupMonitoring.getActiveAlerts();

// إغلاق تنبيه | Resolve alert
backupMonitoring.resolveAlert('alert-1707138400000', 'Freed up disk space');

// إنشاء تنبيه مخصص | Create custom alert
backupMonitoring.createAlert({
  level: 'WARNING',
  type: 'CUSTOM',
  message: 'Custom alert message',
  autoResolve: true,
});
```

---

## 🚨 التعافي من الكوارث | Disaster Recovery

### خطة الاستعادة | Recovery Plan

**RPO (Recovery Point Objective):** ≤ 1 hour  
**RTO (Recovery Time Objective):** ≤ 4 hours  
**Retention:** 30 days local, 90 days cloud

### خطوات الاستعادة | Recovery Steps

```text
1️⃣ تقييم الوضع | Assess situation
   └─ تحديد نقطة الاستعادة | Identify recovery point

2️⃣ اختيار النسخة | Select backup
   └─ التحقق من آخر نسخة سليمة | Verify last valid backup

3️⃣ الاستعادة | Restore
   └─ تشغيل عملية mongorestore | Execute restore

4️⃣ التحقق | Verify
   └─ اختبار البيانات المستعادة | Test restored data

5️⃣ التوثيق | Document
   └─ تسجيل وقت وتاريخ الاستعادة | Log recovery details
```

---

## 🔍 استكشاف الأخطاء | Troubleshooting

### المشكلة: فشل النسخ الاحتياطية | Backup Fails

**الحل:**

```bash
# 1. تحقق من قاعدة البيانات
mongo --uri $MONGODB_URI --eval "db.version()"

# 2. تحقق من مساحة القرص
df -h

# 3. تحقق من صلاحيات المجلد
ls -la backups/

# 4. راجع السجلات
tail -100 backup.log
```

### المشكلة: التشفير لا يعمل | Encryption Issues

**الحل:**

```bash
# تحقق من مفتاح التشفير
echo $BACKUP_ENCRYPTION_KEY

# توليد مفتاح جديد
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# تحديث .env وإعادة تشغيل الخدمة
systemctl restart backup-service
```

### المشكلة: استعادة بطيئة | Slow Restore

**الحل:**

```bash
# تحقق من أداء MongoDB
mongo --eval "db.adminCommand('serverStatus')"

# تحقق من حجم الملف
ls -lh backup-*.gz

# استخدم خيار --numInsertionWorkersPerCollection
mongorestore --numInsertionWorkersPerCollection 10
```

---

## 📈 أفضل الممارسات | Best Practices

✅ **جدولة منتظمة | Regular Scheduling**

- نسخة احتياطية كاملة يومياً | Daily full backups
- نسخ احتياطية زيادية كل 6 ساعات | Incremental every 6 hours

✅ **تخزين متعدد المواقع | Multi-Location Storage**

- نسخة محلية للاستعادة السريعة | Local for quick recovery
- نسخة سحابية للآمان | Cloud for safety

✅ **التشفير | Encryption**

- استخدام AES-256 دائماً | Always use AES-256
- حفظ مفاتيح التشفير بأمان | Store keys securely

✅ **المراقبة | Monitoring**

- فحوصات صحية يومية | Daily health checks
- التنبيهات الفورية للمشاكل | Immediate alerts for issues

✅ **الاختبار | Testing**

- اختبار الاستعادة شهرياً | Monthly restore tests
- التحقق من سلامة البيانات | Verify data integrity

---

## 📞 الدعم والمساعدة | Support & Help

للمساعدة أو الإبلاغ عن مشاكل:

- 📧 Email: support@example.com
- 🔗 GitHub: github.com/project/issues
- 📖 Wiki: wiki.example.com/backup

---

**آخر تحديث | Last Updated:** February 18, 2026  
**الحالة | Status:** ✅ Production Ready  
**الإصدار | Version:** 2.0.0
