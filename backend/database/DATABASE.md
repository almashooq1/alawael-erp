# 🗄️ Al-Awael ERP — قاعدة البيانات / Database Documentation

> نظام إدارة مراكز التأهيل - المملكة العربية السعودية
> Rehabilitation Center Management System - Saudi Arabia

---

## 📋 الفهرس / Table of Contents

1. [نظرة عامة / Overview](#overview)
2. [المتطلبات / Requirements](#requirements)
3. [الإعداد السريع / Quick Setup](#quick-setup)
4. [هيكل قاعدة البيانات / Database Structure](#structure)
5. [الفهارس / Indexes](#indexes)
6. [Migrations](#migrations)
7. [Seeds](#seeds)
8. [النسخ الاحتياطي / Backup](#backup)
9. [فحص الصحة / Health Check](#health)
10. [المتغيرات البيئية / Environment Variables](#env)
11. [أداء الاستعلامات / Query Performance](#performance)
12. [الأمان / Security](#security)

---

## 🌐 نظرة عامة / Overview <a name="overview"></a>

| الخاصية | القيمة |
|---------|--------|
| قاعدة البيانات الرئيسية | MongoDB 7.x |
| ORM | Mongoose 9.x |
| التخزين المؤقت | Redis (ioredis 5.x) |
| بيئة الاختبار | MongoDB Memory Server |
| عدد النماذج | 300+ |
| المجموعات الأساسية | 150+ |

### المكونات الرئيسية

```
backend/
├── config/
│   ├── database.js           # إعدادات الاتصال + Retry Logic
│   ├── redis.js              # إعدادات Redis
│   └── cache.config.js       # إعدادات التخزين المؤقت
│
├── models/                   # نماذج Mongoose (300+ ملف)
│   ├── User.js
│   ├── Beneficiary.js
│   ├── Employee.js
│   ├── HR/                   # نماذج الموارد البشرية
│   └── BeneficiaryManagement/ # نماذج إدارة المستفيدين
│
├── migrations/               # ملفات الترحيل
│   ├── 20250101000000_create-core-indexes.js
│   ├── 20250101000001_add-text-search-indexes.js
│   └── 20250201000000_create-all-collections.js
│
├── seeds/                    # بيانات البذر
│   ├── branches.seed.js
│   ├── advanced-measurements-programs.seed.js
│   └── ...
│
├── database/                 # أدوات قاعدة البيانات
│   ├── indexes/
│   │   └── core-indexes.js   # 🆕 فهارس شاملة لجميع النماذج
│   ├── health/
│   │   └── db-health.js      # 🆕 فحص صحة قاعدة البيانات
│   └── DATABASE.md           # 🆕 هذا الملف
│
└── scripts/
    ├── setup-database.js     # 🆕 إعداد شامل لقاعدة البيانات
    ├── seed-all.js           # 🆕 تشغيل Seeds بترتيب
    ├── db-backup.js          # 🆕 النسخ الاحتياطي والاسترداد
    └── run-migrations.js
```

---

## ⚙️ المتطلبات / Requirements <a name="requirements"></a>

- **Node.js** >= 18.x
- **MongoDB** >= 6.0 (يُنصح بـ 7.x)
- **Redis** >= 6.x (اختياري للـ Caching)
- **MongoDB Database Tools** (لـ mongodump/mongorestore)

---

## 🚀 الإعداد السريع / Quick Setup <a name="quick-setup"></a>

### 1. إعداد المتغيرات البيئية

```bash
cp .env.example .env
# ثم عدّل MONGODB_URI في .env
```

### 2. تشغيل الإعداد الكامل (موصى به)

```bash
# إعداد شامل: اتصال + migrations + فهارس + seeds + health check
npm run db:setup

# أو مباشرة:
node backend/scripts/setup-database.js
```

### 3. التحقق من الإعداد

```bash
npm run db:check
# أو:
node backend/scripts/setup-database.js --check
```

### 4. فحص الصحة

```bash
npm run db:health
# أو:
node backend/database/health/db-health.js
```

---

## 🏗️ هيكل قاعدة البيانات / Database Structure <a name="structure"></a>

### التجمعات الأساسية (Core Collections)

```
┌─────────────────────────────────────────────────────────┐
│ IDENTITY & AUTH                                         │
│   users, sessions, apikeys, tokens                      │
├─────────────────────────────────────────────────────────┤
│ BENEFICIARY MANAGEMENT                                  │
│   beneficiaries, waitlists, guardians, careplanhistories│
│   beneficiaryfiles, beneficiaryprogresses               │
├─────────────────────────────────────────────────────────┤
│ REHABILITATION & PROGRAMS                               │
│   programs, rehabilitationplans, therapysessions        │
│   therapyrooms, appointments, assessments, goals        │
│   virtualsessions, telerehabilitations                  │
├─────────────────────────────────────────────────────────┤
│ HR & WORKFORCE                                          │
│   employees, departments, positions, attendances        │
│   leaves, shifts, payrolls, trainings                   │
├─────────────────────────────────────────────────────────┤
│ FINANCE & ACCOUNTING                                    │
│   invoices, payments, transactions, journalentries      │
│   accounts, budgets, expenses, vatreturns, einvoices    │
├─────────────────────────────────────────────────────────┤
│ BRANCHES & ORGANIZATION                                 │
│   branches, organizations, orgbrandings                 │
├─────────────────────────────────────────────────────────┤
│ FLEET & VEHICLES                                        │
│   vehicles, drivers, trips, transportroutes             │
│   gpslocations, geofences, fleetfuels                   │
├─────────────────────────────────────────────────────────┤
│ DOCUMENTS & ARCHIVE                                     │
│   documents, correspondences, esignatures               │
├─────────────────────────────────────────────────────────┤
│ NOTIFICATIONS & COMMS                                   │
│   notifications, messages, conversations, campaigns     │
├─────────────────────────────────────────────────────────┤
│ SYSTEM                                                  │
│   systemsettings, roles, permissions, auditlogs         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 الفهارس / Indexes <a name="indexes"></a>

### الملف الرئيسي

```
backend/database/indexes/core-indexes.js
```

### تشغيل الفهارس

```bash
# ضمن الإعداد الشامل (موصى به)
npm run db:setup --step indexes

# أو مباشرة عبر Node
node -e "
  const mongoose = require('mongoose');
  const { createAllCoreIndexes } = require('./backend/database/indexes/core-indexes');
  mongoose.connect(process.env.MONGODB_URI).then(() => createAllCoreIndexes(mongoose.connection.db));
"
```

### الفهارس المتوفرة

| المجموعة | نوع الفهرس | الحقول |
|---------|-----------|--------|
| users | unique | email, username |
| users | compound | role + isActive |
| users | TTL (1h) | passwordResetToken |
| users | text | name, email, username |
| beneficiaries | unique | beneficiaryNumber |
| beneficiaries | compound | caseStatus + branchId |
| beneficiaries | text | name.ar, name.en, nationalId |
| employees | unique | employeeId |
| employees | compound | department + position |
| employees | compound | contractEndDate (expiry alerts) |
| attendances | compound | employeeId + date |
| therapysessions | compound | beneficiaryId + sessionDate |
| leaves | compound | employeeId + year |
| payrolls | compound | employeeId + payPeriod |
| invoices | unique | invoiceNumber |
| auditlogs | TTL (90d) | createdAt |
| notifications | TTL (30d) | createdAt |
| sessions | TTL | expiresAt |
| vehicles | unique | plateNumber |

### قواعد الفهارس

1. **جميع الفهارس تُنشأ بـ `background: true`** - لا تؤثر على الأداء أثناء الإنشاء
2. **الفهارس الفريدة (unique) تستخدم `sparse: true`** - تتجاهل الحقول الفارغة
3. **TTL indexes** - تُحدد انتهاء صلاحية البيانات تلقائياً
4. **Text indexes** - تدعم البحث بالعربية والإنجليزية مع `default_language: 'none'`

---

## 🔄 Migrations <a name="migrations"></a>

### تسمية ملفات الـ Migration

```
YYYYMMDDHHMMSS_description.js
مثال: 20250201000000_create-all-collections.js
```

### تشغيل الـ Migrations

```bash
# ضمن الإعداد الشامل (موصى به)
npm run db:setup --step migrate

# أو مباشرة:
node backend/scripts/setup-database.js --step migrate
```

### الـ Migrations المتوفرة

| الملف | الوصف |
|-------|-------|
| 20250101000000_create-core-indexes.js | فهارس أساسية وفريدة |
| 20250101000001_add-text-search-indexes.js | فهارس البحث النصي |
| 20250201000000_create-all-collections.js | 🆕 إنشاء جميع المجموعات مع validators |

### تتبع الـ Migrations

يتم تسجيل الـ migrations المطبقة في مجموعة `_migrations` في قاعدة البيانات:

```javascript
{
  name: "20250201000000_create-all-collections",
  appliedAt: ISODate("2025-02-01T00:00:00Z"),
  env: "production"
}
```

---

## 🌱 Seeds <a name="seeds"></a>

### تشغيل الـ Seeds

```bash
# تشغيل جميع الـ seeds
npm run db:seed

# seed بيئة محددة
npm run db:seed -- --env production

# seed مجموعة محددة
node backend/scripts/seed-all.js --only branches

# معاينة بدون تطبيق
node backend/scripts/seed-all.js --dry-run

# إعادة ضبط وإعادة تحميل
node backend/scripts/seed-all.js --reset
```

### الـ Seeds المتوفرة

| الترتيب | الاسم | البيئة | الوصف |
|--------|-------|--------|-------|
| 1 | system-settings | all | إعدادات النظام الأساسية |
| 2 | branches | all | 13 فرعاً في السعودية |
| 3 | roles-permissions | all | الأدوار والصلاحيات |
| 4 | admin-users | dev/staging | مستخدمون إداريون |
| 5 | programs | all | برامج التأهيل |
| 6 | disability-types | all | أنواع الإعاقة |
| 7 | departments | all | الأقسام والوظائف |
| 8 | measurement-programs | dev/staging | مقاييس متقدمة |
| 9 | leave-types | all | أنواع الإجازات |
| 10 | notification-templates | all | قوالب الإشعارات |
| 11 | chart-of-accounts | all | دليل الحسابات |
| 12 | sample-beneficiaries | dev only | بيانات تجريبية |
| 13 | sample-employees | dev only | موظفون تجريبيون |
| 14 | fiscal-periods | all | الفترات المالية |

---

## 💾 النسخ الاحتياطي / Backup <a name="backup"></a>

### الأوامر

```bash
# نسخة احتياطية كاملة
npm run db:backup

# نسخة من مجموعات محددة
node backend/scripts/db-backup.js backup --collections users,employees,branches

# نسخة من المجموعات الحيوية فقط
node backend/scripts/db-backup.js critical

# عرض النسخ الاحتياطية المتوفرة
node backend/scripts/db-backup.js list

# حذف النسخ القديمة (أكثر من 7 أيام)
node backend/scripts/db-backup.js cleanup --keep 7
```

### جدولة النسخ الاحتياطية (Cron)

```bash
# نسخة احتياطية يومية في الساعة 2 صباحاً
0 2 * * * cd /app && node backend/scripts/db-backup.js backup --label daily

# نسخة أسبوعية يوم الأحد
0 3 * * 0 cd /app && node backend/scripts/db-backup.js backup --label weekly

# تنظيف تلقائي أسبوعي
0 4 * * 0 cd /app && node backend/scripts/db-backup.js cleanup --keep 30
```

---

## 🏥 فحص الصحة / Health Check <a name="health"></a>

### CLI

```bash
# فحص شامل
npm run db:health

# فحص مفصل
node backend/database/health/db-health.js --verbose

# فحص سريع (للـ readiness probes)
node -e "require('./backend/database/health/db-health').runHealthCheck({minimal:true}).then(console.log)"
```

### API Endpoint

```javascript
// في routes/health.js
const { healthEndpointHandler } = require('../database/health/db-health');
router.get('/api/health/db', healthEndpointHandler);

// GET /api/health/db?minimal=true  → اختبار سريع
// GET /api/health/db               → فحص شامل
```

### فحوصات الصحة المتوفرة

| الفحص | الوصف | الحالة |
|-------|-------|--------|
| connection | حالة الاتصال | healthy/critical |
| ping | زمن الاستجابة | healthy/warning/critical |
| database-stats | إحصاءات قاعدة البيانات | healthy/warning |
| server-status | حالة الخادم + connections | healthy/warning |
| collections | المجموعات المطلوبة | healthy/warning |
| indexes | عدد الفهارس | healthy/warning |
| replication | حالة Replica Set | healthy/warning/info |
| error-rate | معدل الأخطاء (آخر ساعة) | healthy/warning/critical |

---

## 🔐 المتغيرات البيئية / Environment Variables <a name="env"></a>

```env
# ═══════════════════════════════════════
# قاعدة البيانات الرئيسية
# ═══════════════════════════════════════
MONGODB_URI=mongodb://localhost:27017/alawael-erp
DB_NAME=alawael-erp

# Connection Pool
DB_POOL_SIZE=10
DB_MIN_POOL_SIZE=2

# Retry Configuration
DB_MAX_RETRIES=5
DB_INITIAL_RETRY_DELAY=1000
DB_MAX_RETRY_DELAY=32000
DB_BACKOFF_MULTIPLIER=2

# TLS (للإنتاج)
DB_TLS=true

# ═══════════════════════════════════════
# Redis (التخزين المؤقت)
# ═══════════════════════════════════════
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TTL=3600

# ═══════════════════════════════════════
# النسخ الاحتياطي
# ═══════════════════════════════════════
DB_BACKUP_DIR=./backups/mongodb
DB_BACKUP_KEEP_DAYS=30
DB_BACKUP_COMPRESS=true
DB_BACKUP_MAX_SIZE_MB=5000

# ═══════════════════════════════════════
# المراقبة والأداء
# ═══════════════════════════════════════
DB_PING_WARNING_MS=100
DB_PING_CRITICAL_MS=500
LOG_ALL_QUERIES=false
SLOW_QUERY_THRESHOLD_MS=500

# ═══════════════════════════════════════
# Seeds
# ═══════════════════════════════════════
ALLOW_PROD_SEED=false

# ═══════════════════════════════════════
# Development/Testing
# ═══════════════════════════════════════
USE_MOCK_DB=false
DISABLE_MOCK_FALLBACK=false
```

---

## ⚡ أداء الاستعلامات / Query Performance <a name="performance"></a>

### نصائح الأداء

1. **استخدم الفهارس دائماً** للحقول المستخدمة في `find()`, `sort()`, `match()`
2. **استخدم `.lean()`** عند القراءة بدون الحاجة لـ Mongoose methods
3. **حدد الحقول** باستخدام `.select('field1 field2')`
4. **استخدم Pagination** مع `.skip().limit()` أو Cursor-based
5. **استخدم Redis** للبيانات المتكررة القراءة
6. **Aggregation Pipeline** أسرع من المعالجة في JavaScript

### مثال على استعلام محسّن

```javascript
// ❌ بطيء
const beneficiaries = await Beneficiary.find({});

// ✅ سريع
const beneficiaries = await Beneficiary
  .find({ caseStatus: 'active', branchId: req.user.branchId })
  .select('name nationalId program therapist')
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit)
  .lean();
```

### تفعيل Slow Query Profiling

```javascript
// في app.js أو server.js
const { enableSlowQueryProfiling } = require('./config/database');
if (process.env.NODE_ENV !== 'production') {
  enableSlowQueryProfiling(200); // تحذير عند > 200ms
}
```

---

## 🔒 الأمان / Security <a name="security"></a>

### قواعد الأمان لقاعدة البيانات

1. **لا تُخزن كلمات المرور كنص صريح** - استخدم bcrypt
2. **TLS إلزامي في الإنتاج** - `DB_TLS=true`
3. **حماية بيانات الاعتماد** - استخدم environment variables
4. **أذونات MongoDB محدودة** - مستخدم DB بأذونات القراءة/الكتابة فقط
5. **Audit Logs** - كل العمليات الحساسة مسجلة
6. **TTL للجلسات** - تنتهي تلقائياً

### مثال: إنشاء مستخدم MongoDB محدود الصلاحيات

```javascript
db.createUser({
  user: "alawael_app",
  pwd: "STRONG_PASSWORD_HERE",
  roles: [
    { role: "readWrite", db: "alawael-erp" },
    { role: "dbAdmin", db: "alawael-erp" }
  ]
});
```

---

## 📋 أوامر npm المتاحة / Available npm Scripts

```bash
# الإعداد
npm run db:setup          # إعداد شامل (migrations + indexes + seeds)
npm run db:setup:prod     # إعداد للإنتاج (بدون seeds تجريبية)
npm run db:check          # فحص الاتصال فقط

# Migrations
npm run db:migrate        # تشغيل الـ migrations الجديدة

# Indexes
npm run db:indexes        # إنشاء/تحديث الفهارس

# Seeds
npm run db:seed           # تشغيل جميع الـ seeds
npm run db:seed:prod      # seeds للإنتاج فقط

# Health
npm run db:health         # فحص صحة قاعدة البيانات

# Backup
npm run db:backup         # نسخة احتياطية كاملة
npm run db:backup:list    # عرض النسخ المتوفرة
```

---

## 🆕 الملفات الجديدة / New Files

| الملف | الوصف |
|-------|-------|
| `backend/database/indexes/core-indexes.js` | فهارس شاملة لـ 20+ مجموعة |
| `backend/database/health/db-health.js` | فحص صحة قاعدة البيانات (8 فحوصات) |
| `backend/database/DATABASE.md` | توثيق شامل (هذا الملف) |
| `backend/migrations/20250201000000_create-all-collections.js` | إنشاء 150+ مجموعة مع validators |
| `backend/scripts/setup-database.js` | سكريبت الإعداد الشامل |
| `backend/scripts/seed-all.js` | مشغّل الـ Seeds المرتب |
| `backend/scripts/db-backup.js` | نظام النسخ الاحتياطي |

---

*تم التوثيق في: 2025 | Al-Awael ERP System*
