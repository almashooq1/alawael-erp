# 🔒 تقرير إصلاحات الأمان والتحسينات — Al-Awael ERP

> **التاريخ:** 2026-04-06
> **النطاق:** تحليل شامل وإصلاح منهجي للمشروع بالكامل

---

## 📋 ملخص تنفيذي

تم إجراء تحليل أمني وتقني شامل لمشروع **Al-Awael ERP** وتم اكتشاف وإصلاح عدة مشاكل حرجة ومتوسطة الخطورة.

---

## 🔴 إصلاحات حرجة (Critical)

### 1. إزالة ملفات `.env` المتعقبة في Git

**المشكلة:** 5 ملفات `.env` تحتوي على أسرار حقيقية (كلمات مرور MongoDB Atlas، JWT secrets) كانت متعقبة في Git:

- `backend/api/.env`
- `gateway/.env`
- `graphql/.env`
- `intelligent-agent/.env`
- `intelligent-agent/backend/.env` (يحتوي على كلمة مرور MongoDB Atlas حقيقية)

**الإصلاح:**

- ✅ إزالة جميع الملفات من Git cache باستخدام `git rm --cached`
- ✅ تحديث `.gitignore` بقواعد شاملة: `**/.env` و `**/.env.*`
- ✅ إضافة استثناءات للملفات النموذجية: `!**/.env.example`

**⚠️ إجراء مطلوب:** يجب تغيير كلمات المرور المسربة فوراً (خاصة MongoDB Atlas credentials).

### 2. تأمين endpoint إعادة تعيين المدير (`/api/_init`)

**المشكلة:**

- كان يعمل بطريقة GET (يمكن أن يُفعّل عبر رابط بسيط)
- كان يستخدم مفتاح سري افتراضي مشفر (`alawael-init-2026`)
- كان يُرجع كلمة المرور في الاستجابة
- كان `requirePasswordChange: false`

**الإصلاح:**

- ✅ تغيير من GET إلى POST
- ✅ حظر في Production ما لم يكن `ALLOW_ADMIN_INIT=true`
- ✅ إزالة المفتاح الافتراضي — يتطلب `SETUP_SECRET_KEY` إلزامياً
- ✅ إزالة كلمة المرور من الاستجابة
- ✅ فرض `requirePasswordChange: true`
- ✅ قبول المفتاح فقط من headers/body (ليس query string)

### 3. تأمين endpoint التشخيص (`/api/_diag`)

**المشكلة:**

- كان يعرض بادئة hash كلمة المرور (`passwordHashPrefix`)
- كان يعرض صحة كلمة المرور (`passwordValid`)
- كان يعرض بيانات كل المدراء
- كان يعمل في Production

**الإصلاح:**

- ✅ حظر كامل في Production
- ✅ إزالة `passwordHashPrefix` و `passwordValid` و `allAdmins` المفصلة
- ✅ إزالة المفتاح الافتراضي — يتطلب `SETUP_SECRET_KEY` إلزامياً
- ✅ قبول المفتاح فقط من headers
- ✅ إخفاء تفاصيل الأخطاء

---

## 🟠 إصلاحات عالية الخطورة (High)

### 4. تحسين Frontend API Client

**المشكلة:** `console.error` و `console.warn` في Production تكشف تفاصيل الأخطاء للمستخدمين.

**الإصلاح:**

- ✅ نقل جميع console.error/warn/info داخل شرط `NODE_ENV === 'development'`
- ✅ إضافة `eslint-disable-next-line` لمنع تحذيرات ESLint

### 5. تحسين `.gitignore`

**الإصلاح:**

- ✅ إضافة قواعد glob شاملة: `**/.env` و `**/.env.*`
- ✅ استثناء ملفات `.env.example` و `.env.production.template`
- ✅ تنظيف وتنظيم الأقسام

### 6. إنشاء `backend/.env.example`

- ✅ ملف نموذجي شامل يوثق كل المتغيرات المطلوبة
- ✅ بدون أي قيم حقيقية — فقط CHANGE_ME placeholders

---

## 🟡 إصلاحات متوسطة الخطورة (Medium)

### 7. تحسين CI/CD Pipeline

**المشاكل والإصلاحات:**

- ✅ إزالة `-vvv` SSH verbose debug (كان يسرب معلومات SSH الداخلية)
- ✅ إصلاح environment name من `VPS_USER` إلى `production`
- ✅ إصلاح Health Check URL من port 5000 إلى 3001 (مع fallback)

### 8. تحسين Dockerfile

- ✅ إزالة التعليقات المضمنة في ENV (مشكلة بناء)
- ✅ تحسين healthcheck timeout من 10s إلى 5s
- ✅ تحسين start-period من 90s إلى 60s

---

## 🟢 إصلاحات إضافية (الجولة الثانية)

### 9. إعادة كتابة `ensureAdmin.js` — إصلاح حرج 🔴

**المشكلة:** كان يُعيد تعيين كلمة مرور المدير إلى `Admin@2026` المشفرة عند **كل إعادة تشغيل** للسيرفر، مع `requirePasswordChange: false` وتسجيل بيانات الدخول في الـ logs.

**الإصلاح:**

- ✅ يُنشئ حساب المدير **فقط** إذا لم يكن موجوداً (لا يكتب فوق حساب موجود أبداً)
- ✅ يتطلب `ADMIN_PASSWORD` من متغيرات البيئة (بدون fallback مشفر)
- ✅ يفرض `requirePasswordChange: true` للمدير الجديد
- ✅ يتعامل مع race conditions عبر duplicate key check
- ✅ لا يُسجّل كلمات المرور أو بيانات الدخول في الـ logs أبداً

### 10. استبدال `console.log/error/warn` في Backend Services بـ `logger`

**المشكلة:** 3 ملفات خدمات تستخدم `console.log/error/warn/info` مباشرة بدلاً من أداة `logger` المركزية، مما يتجاوز نظام التسجيل المنظم (rotation, levels, JSON format).

**الملفات المُصلحة:**

- ✅ `backend/services/telehealthService.js` — 2 instances (console.error → logger.error, console.warn → logger.warn)
- ✅ `backend/services/referralService.js` — 5 instances (console.error → logger.error, console.info → logger.info)
- ✅ `backend/services/zktecoSdk.service.js` — 9 instances (console.log → logger.info, console.warn → logger.warn, console.error → logger.error)

### 11. تنظيف سكربتات Python من الـ Repository

**المشكلة:** ~252 ملف Python تشخيصي/نشر في المجلد الجذر، ليست جزءاً من التطبيق.

**الإصلاح:**

- ✅ إضافة `/*.py` إلى `.gitignore` لتجاهل كل ملفات Python في الجذر
- ✅ لا يؤثر على ملفات Python في المجلدات الفرعية (scripts/, tests/, etc.)

---

## 🔵 إصلاحات الجولة الثالثة

### 12. إزالة كلمات المرور المشفرة من 5 ملفات 🔴

**المشكلة:** كلمات مرور مشفرة (Admin@2026, Admin@123456) في ملفات تُستخدم مباشرة.

**الإصلاح:**

- ✅ `setup.routes.js`: إعادة كتابة — POST فقط، محظور في Production، بدون fallback
- ✅ `create-admin.js`: يتطلب ADMIN_PASSWORD من env، لا يطبع كلمة المرور
- ✅ `seedDatabase.js`: يتطلب ADMIN_PASSWORD من env، requirePasswordChange: true
- ✅ `run-comprehensive-seeds.js`: إزالة hardcoded password + جدول كلمات المرور
- ✅ `00-DatabaseSeeder.js`: إزالة طباعة كلمات المرور

### 13. إضافة خطوة اختبارات في CI/CD 🟡

**الإصلاح:**

- ✅ إضافة job `test` (npm test + npm audit) قبل build/deploy
- ✅ يمكن تخطيه عبر `skip_tests` في workflow_dispatch

---

## ⚠️ مشاكل معلقة تحتاج اهتمام (Backlog)

### P1 — يجب معالجتها قريباً

1. **تغيير كلمات المرور المسربة** — MongoDB Atlas, JWT secrets
2. **كلمات المرور في Seeders** — `02-UsersSeeder.js` يحتوي على كلمات مشفرة. استخدم متغيرات بيئة بدلاً منها.
3. **ملفات middleware المصادقة المكررة** — `auth.js` و `auth.middleware.js` فيهما وظائف متكررة (لكن 300+ ملف يستوردون من `auth.js`).

### P2 — ينصح بمعالجتها

4. **100+ سكربت Python في المجلد الجذر** — سكربتات تشخيص/نشر يجب نقلها إلى `scripts/` أو حذفها.
5. **console.log في Backend** — عشرات الاستخدامات في ملفات الخدمات. استبدلها بـ `logger`.
6. **Frontend bundle size** — 97 route modules تُحمّل lazily لكن يمكن تحسين Code Splitting أكثر.

### P3 — تحسينات مستقبلية

7. **إضافة خطوة اختبارات في CI/CD** — حالياً لا يوجد test step قبل Deploy.
8. **تفعيل Dependabot** لتحديث التبعيات الأمنية.
9. **إضافة `npm audit` في CI pipeline**.

---

## 📁 الملفات المعدلة

| الملف                                    | نوع التغيير                          | الجولة |
| :--------------------------------------- | :----------------------------------- | :----- |
| `.gitignore`                             | تحسين قواعد .env + تجاهل \*.py       | 1+2    |
| `backend/app.js`                         | تأمين endpoints \_init و \_diag      | 1      |
| `frontend/src/services/api.client.js`    | إزالة console.logs في Production     | 1      |
| `.github/workflows/deploy-hostinger.yml` | إصلاح SSH, environment, health check | 1      |
| `backend/.env.example`                   | ملف جديد — نموذج المتغيرات           | 1      |
| `Dockerfile`                             | تحسين ENV و healthcheck              | 1      |
| `backend/utils/ensureAdmin.js`           | إعادة كتابة كاملة — إصلاح حرج        | 2      |
| `backend/services/telehealthService.js`  | استبدال console بـ logger            | 2      |
| `backend/services/referralService.js`    | استبدال console بـ logger            | 2      |
| `backend/services/zktecoSdk.service.js`  | استبدال console بـ logger            | 2      |
| `SECURITY-FIXES.md`                      | تقرير الإصلاحات (هذا الملف)          | 1+2    |

---

## 🔑 الإجراءات الفورية المطلوبة

```bash
# 1. تغيير كلمة مرور MongoDB Atlas فوراً
# (الكلمة القديمة مكشوفة في تاريخ Git)

# 2. توليد JWT Secret جديد
openssl rand -base64 64

# 3. توليد Setup Secret Key جديد
openssl rand -hex 32

# 4. تحديث الأسرار في VPS
ssh user@vps "nano /home/alawael/app/backend/.env"

# 5. عمل commit للتغييرات
git add -A
git commit -m "🔒 security: remove tracked .env files, harden endpoints, improve CI/CD"
```

---

## 🟡 الجولة 4: توحيد نظام السجلات في ملفات الإنتاج

### 9. استبدال console.log/error/warn بـ Winston Logger في 6 ملفات إنتاج

**المشكلة:** ملفات إنتاج أساسية تستخدم `console.log/error/warn` بدلاً من نظام السجلات الموحد (Winston)، مما يعني:

- عدم تسجيل السجلات في ملفات
- عدم وجود مستويات سجلات (info/warn/error)
- عدم وجود metadata منظمة
- صعوبة التتبع في الإنتاج

**الملفات المعدلة (29 عبارة console → logger):**

| الملف                                          | العبارات | التغييرات                                                    |
| ---------------------------------------------- | -------- | ------------------------------------------------------------ |
| `database/cache/cache-service.js`              | 10       | إضافة `logger` + استبدال جميع console statements             |
| `routes/nphies.routes.js`                      | 11       | إضافة `logger` + استبدال 11 console.error في route handlers  |
| `services/attendanceProcessing.service.js`     | 4        | إضافة `logger` + استبدال console.log/error                   |
| `controllers/rehabilitationPlan.controller.js` | 2        | إضافة `logger` + استبدال console.warn/error                  |
| `config/database.js`                           | 1        | استبدال console.warn → logger.warn (كان يستخدم logger أصلاً) |
| `services/kpiCalculation.service.js`           | 1        | إضافة `logger` + استبدال console.error                       |

**النمط الموحد:**

```javascript
// قبل
console.error('NPHIES Error:', error.message);

// بعد
logger.error('NPHIES Error:', { error: error.message });
```

**الملفات المتجاوزة (مقبولة):**

- `infrastructure/migrationRunner.js` — يستخدم logger مع fallback + CLI output
- `database/health/db-health.js` — CLI runner فقط يستخدم console
- `services/realtime.service.js` — ✅ يستخدم logger أصلاً

---

## 🔴 الجولة 5: تأمين مسارات حرجة وإصلاح أخطاء صامتة

### 14. تأمين Migration API Routes — إصلاح حرج 🔴

**المشكلة:** مسارات `/api/v2/migrations` (status/up/down) كانت متاحة لأي شخص **بدون أي مصادقة**، مما يتيح:

- عرض حالة الترحيلات
- تطبيق ترحيلات جديدة على قاعدة البيانات
- **التراجع عن ترحيلات** (حذف بيانات/indexes)

**الإصلاح (`backend/infrastructure/migrationRunner.js`):**

- ✅ حظر في Production ما لم يكن `ALLOW_MIGRATIONS=true`
- ✅ إضافة `requireAuth` + `requireAdmin` middleware
- ✅ Fallback: حظر كامل في Production إذا لم يتوفر auth middleware

### 15. إصلاح 11 Empty Catch Block في بوابة ولي الأمر 🟠

**المشكلة:** 11 كتلة `catch {}` فارغة في `parentPortal.routes.js` تبتلع أخطاء قاعدة البيانات بصمت:

- فشل جلب المواعيد/الجلسات/التقدم/الفواتير/الإشعارات/النقل — كلها تُرجع مصفوفات فارغة بدون أي تسجيل

**الإصلاح (`backend/routes/parentPortal.routes.js`):**

- ✅ إضافة `logger.warn()` مع context مناسب في كل catch block
- ✅ استخدام `logger.debug()` للعمليات غير الحرجة (Socket.IO notifications)

| الموقع                    | التغيير                                              |
| :------------------------ | :--------------------------------------------------- |
| Dashboard nextAppointment | `logger.warn('Failed to fetch next appointment...')` |
| Children sessions         | `logger.warn('Failed to fetch sessions...')`         |
| Children progress         | `logger.warn('Failed to fetch progress...')`         |
| Appointments list         | `logger.warn('Failed to fetch appointments...')`     |
| Cancel appointment        | `logger.warn('Failed to cancel appointment...')`     |
| Transport live            | `logger.warn('Failed to fetch live transport...')`   |
| Invoices list             | `logger.warn('Failed to fetch invoices...')`         |
| Invoice detail            | `logger.warn('Failed to fetch invoice detail...')`   |
| Socket.IO emit            | `logger.debug('Socket.IO staff notification...')`    |
| Notifications list        | `logger.warn('Failed to fetch notifications...')`    |
| Notifications mark-read   | `logger.warn('Failed to mark notifications...')`     |

### 16. إصلاح ثغرة أمنية في التبعيات 🟡

**المشكلة:** ثغرة عالية الخطورة في مكتبة `lodash` (Prototype Pollution).

**الإصلاح:**

- ✅ تشغيل `npm audit fix` — تحديث الحزمة المتأثرة
- ✅ النتيجة: **0 ثغرات** في `npm audit`

---

_تقرير أُعد بواسطة تحليل أمني شامل للمشروع._
