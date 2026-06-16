# 🏗️ بنية Backend المنهجية

**المسار:** `66666/backend/`  
**الحجم:** ~1,700 ملف | **الموجات:** W001-W530+ | **الاختبارات:** 792 test suite

---

## 📊 خريطة سريعة للمجلدات

```
backend/
├── 🎯 Core Application
│   ├── app.js                  # نقطة تركيب التطبيق (2,436 LOC)
│   ├── server.js               # بدء الخادم
│   ├── start.js                # script بديل للبدء
│   └── nodemon.json            # إعدادات التطوير
│
├── 🗂️ Data Layer (Models + DB)
│   ├── models/                 # نماذج Mongoose (~100 نموذج)
│   │   ├── Beneficiary.js      # ⭐ النموذج المركزي
│   │   ├── Episode.js          # 🔄 دورة الرعاية
│   │   ├── CarePlan.js         # 📋 خطة الرعاية
│   │   ├── Assessment.js       # 📊 التقييمات
│   │   └── [+95 more models]
│   │
│   ├── database/               # إدارة قاعدة البيانات
│   │   ├── connection.js       # اتصال MongoDB
│   │   ├── indexes.js          # فهارس الأداء
│   │   └── seed.js             # بيانات اختبار أولية
│   │
│   └── repositories/           # Data Access Objects (DAOs)
│       ├── beneficiary.repo.js
│       └── [Repository pattern]
│
├── 🛣️ Routes (API Endpoints)
│   ├── routes/                 # 501 ملف مسار
│   │   ├── beneficiary.routes.js      # (endpoints: ~40)
│   │   ├── episodes.routes.js         # (endpoints: ~30)
│   │   ├── care-plan.routes.js        # (endpoints: ~35)
│   │   ├── assessment.routes.js       # (endpoints: ~40)
│   │   ├── measures.routes.js         # (endpoints: ~25)
│   │   ├── reports.routes.js          # (endpoints: ~20)
│   │   └── [+495 more routes]
│   │
│   ├── api/                    # Helper functions للـ API
│   └── swagger.js              # API Documentation (OpenAPI)
│
├── ⚙️ Services (Business Logic)
│   ├── services/               # الخدمات المنطقية (+100 service)
│   │   ├── beneficiary.service.js     # خدمة المستفيد
│   │   ├── care-planning.service.js   # خدمة تخطيط الرعاية
│   │   ├── assessment.service.js      # خدمة التقييمات
│   │   ├── measure.service.js         # خدمة القياسات
│   │   └── [+96 more services]
│   │
│   ├── rehabilitation-services/       # خدمات التأهيل
│   ├── rehabilitation-assessment/     # تقييمات التأهيل
│   ├── rehabilitation-family/         # خدمات الأسرة
│   └── rehabilitation-ai/             # خدمات الذكاء الاصطناعي
│
├── 🧠 Intelligence (Shared Libs)
│   ├── intelligence/           # ⭐ المكتبات المشتركة (لا تكررها!)
│   │   ├── canonical/          # نماذج Zod الموحدة
│   │   │   └── schemas/        # (21 schema)
│   │   │
│   │   ├── hash-chain.lib.js         # تسلسل التجزئة
│   │   ├── sod.lib.js                # Separation of Duties
│   │   ├── sensitivity-grade.lib.js  # درجات الحساسية
│   │   ├── measure-lifecycle.lib.js  # دورة حياة القياسات
│   │   ├── care-plan-registry.js     # سجل خطط الرعاية
│   │   ├── reason-codes.registry.js  # أكواد الأسباب (31 كود)
│   │   └── parent-chatbot.registry.js # نوايا chatbot
│
├── 🎯 Domains (DDD Architecture)
│   ├── domains/                # 8 مجالات رئيسية
│   │   ├── core/               # المجال الأساسي
│   │   ├── beneficiary/        # مجال المستفيد
│   │   ├── clinical/           # المجال السريري
│   │   ├── episodes/           # مجال الحلقات العلاجية
│   │   ├── timeline/           # مجال الزمن
│   │   ├── quality/            # مجال الجودة
│   │   ├── family/             # مجال الأسرة
│   │   └── hr/                 # مجال الموارد البشرية
│   │
│   ├── domains/<domain>/
│   │   ├── index.js            # واجهة المجال
│   │   ├── models/             # نماذج المجال
│   │   ├── services/           # خدمات المجال
│   │   ├── routes/             # مسارات المجال
│   │   ├── events/             # أحداث المجال
│   │   └── subscribers/        # مشتركو الأحداث
│   │
│   ├── domains/bootstrap.js    # تهيئة المجالات
│   └── dependencies.mapping.js # خريطة الاعتماديات
│
├── 🔌 Integration (Adapters)
│   ├── integration/            # تكامل الأنظمة الخارجية
│   │   ├── integrationBus.js   # مركزي event bus
│   │   ├── modelEventBridge.js # ربط أحداث النماذج
│   │   └── dddCrossModuleSubscribers.js
│   │
│   ├── integrations/           # أدوات التكامل
│   │   ├── sehhatyAdapter.js   # تطبيق Sehhaty
│   │   ├── mudad-wps/          # نظام الرواتب
│   │   ├── nafath/             # التوقيع الرقمي
│   │   ├── hikvision/          # نظام المراقبة
│   │   └── [+12 more integrations]
│
├── 📢 Events (DDD Event System)
│   ├── events/                 # نظام الأحداث
│   │   ├── contracts/          # عقود الأحداث
│   │   │   ├── domainEventContracts.js   # (34 عقد)
│   │   │   └── dddEventContracts.js      # (17 مجال)
│   │   │
│   │   ├── publishers/         # ناشرو الأحداث
│   │   ├── subscribers/        # مشتركو الأحداث
│   │   └── eventHandlers.js    # معالجات الأحداث
│
├── 🔒 Authorization (RBAC + MFA)
│   ├── authorization/          # نظام التفويض
│   │   ├── approvals/          # سير الموافقات
│   │   ├── roles/              # الأدوار والصلاحيات
│   │   ├── permissions.js      # فحوصات الصلاحيات
│   │   └── [18+ role types]
│   │
│   ├── middleware/             # وسائط Express
│   │   ├── auth.middleware.js  # المصادقة
│   │   ├── mfaTier.middleware.js       # MFA 5-layer
│   │   ├── branchScope.middleware.js   # عزل الفروع
│   │   ├── assertBranchMatch.js        # التحقق من الفرع
│   │   └── [+15 more middleware]
│
├── ⏰ Scheduler (Crons)
│   ├── scheduler/              # المهام الدورية
│   │   ├── wallet.scheduler.js # معالج المحفظة
│   │   ├── notifications.scheduler.js
│   │   └── [Legacy schedulers]
│   │
│   └── startup/                # Bootstrap + Sweepers
│       ├── clinicalSweepersBootstrap.js  # (11 sweeper)
│       ├── capaBootstrap.js              # CAPA workflow
│       ├── careplanBootstrap.js          # خطط الرعاية
│       └── [+18 more bootstrap files]
│
├── 📋 Workflow (Automation)
│   ├── workflow/               # محرك سير العمل
│   │   ├── workflow-engine.js  # محرك التنفيذ
│   │   ├── journey.service.js  # خدمة الرحلة
│   │   ├── approval-flow.js    # سير الموافقات
│   │   └── [+8 more workflow]
│
├── 🎓 Students (Montessori Module)
│   ├── students/               # وحدة الطلاب
│   │   ├── student.model.js    # نموذج الطالب
│   │   ├── student.service.js  # خدمة الطالب
│   │   └── routes/
│
├── ✔️ Validation (Input Safety)
│   ├── validators/             # مدققات الإدخال
│   │   ├── beneficiary.validator.js
│   │   ├── assessment.validator.js
│   │   ├── zod-schemas/        # نماذج Zod
│   │   └── sanitizers.js       # تنظيف المدخلات
│
├── ⚠️ Error Handling
│   ├── errors/                 # معالجات الأخطاء
│   │   ├── AppError.js         # فئة الخطأ المخصصة
│   │   ├── ErrorHandler.js     # معالج الأخطاء المركزي
│   │   └── errorCodes.js       # أكواد الأخطاء الموحدة
│
├── 🔐 Security
│   ├── privacy/                # خصوصية البيانات
│   │   ├── encryption.js       # التشفير
│   │   ├── pii-masking.js      # تمويه البيانات الشخصية
│   │   └── consent.model.js    # نموذج الموافقة
│   │
│   ├── config/                 # إعدادات الأمان
│   └── helmet.config.js        # HTTP headers
│
├── 📊 Analytics & Observability
│   ├── intelligence/           # الذكاء التحليلي
│   ├── observability/          # قابلية الملاحظة
│   │   ├── logger.js           # التسجيل المركزي
│   │   ├── metrics.js          # جمع المقاييس
│   │   └── tracing.js          # التتبع الموزع
│   │
│   ├── kpi/                    # مؤشرات الأداء الرئيسية
│   └── dashboard/              # لوحات التحكم
│
├── 🔧 Utilities & Helpers
│   ├── utils/                  # أدوات مساعدة
│   │   ├── date-helpers.js     # معالجات التاريخ
│   │   ├── math-helpers.js     # معالجات الرياضيات
│   │   ├── string-helpers.js   # معالجات النصوص
│   │   └── cache.js            # إدارة الذاكرة المؤقتة
│   │
│   ├── constants/              # ثوابت التطبيق
│   └── enums/                  # قيم enum
│
├── 📚 Assets & Templates
│   ├── assets/                 # ملفات ثابتة
│   ├── templates/              # قوالب البريد والرسائل
│   ├── locales/                # ملفات الترجمة (AR/EN)
│   └── public/                 # ملفات عامة
│
├── 🧪 Testing
│   ├── __tests__/              # اختبارات شاملة (792 ملف)
│   │   ├── beneficiary-*.test.js
│   │   ├── *-wave*.test.js     # اختبارات الموجات
│   │   └── [+787 more tests]
│   │
│   ├── tests/                  # اختبارات إضافية
│   │   ├── unit/               # (1,383 ملف)
│   │   └── integration/
│   │
│   ├── jest.config.js          # إعدادات Jest
│   ├── jest.setup.js           # تعريف مسبق لـ Jest
│   └── __mocks__/              # Mock objects
│
├── 📜 Configuration
│   ├── .env                    # متغيرات البيئة
│   ├── .env.example            # قالب البيئة
│   ├── .env.production         # إنتاج
│   ├── .env.staging            # تجريبي
│   ├── .eslintrc.json          # إعدادات ESLint
│   ├── .prettierrc.json        # إعدادات Prettier
│   ├── jsconfig.json           # إعدادات JavaScript
│   ├── nodemon.json            # إعدادات Nodemon
│   ├── package.json            # المكتبات والـ Scripts
│   └── ecosystem.config.js     # إعدادات PM2
│
├── 📖 Documentation
│   ├── README.md               # دليل المتابعة
│   ├── sprint-tests.txt        # قائمة اختبارات الدورة
│   └── [Config docs]
│
├── 🚀 Scripts
│   ├── scripts/                # أدوات التطوير
│   │   ├── db/                 # سكريبتات قاعدة البيانات
│   │   ├── ci/                 # سكريبتات CI/CD
│   │   ├── seed-*.js           # Seeders
│   │   └── check-*.js          # Checkers (quality gates)
│
└── 📦 Dependencies
    ├── node_modules/          # المكتبات المثبتة
    └── package-lock.json      # قفل الإصدارات
```

---

## 🎯 الملفات الحرجة والمسؤوليات

### 1️⃣ نقطة الدخول (`app.js` و `server.js`)

- **مسؤول عن:** تركيب middleware، تحميل الطرق، معالجة الأخطاء
- **الحد الأقصى:** 2,436 LOC (مقسم إلى bootstrap files)
- **التحديث:** انظر W277 Pass 1-6 للتقسيم الحالي

### 2️⃣ النماذج (`models/`)

- **معايير:**
  - ✅ استخدام Mongoose schemas
  - ✅ إضافة `__invariants` virtual لكل قاعدة
  - ✅ عدم تكرار النماذج عبر الملفات
- **الفحص:** `npm run check:no-duplicate-model-registration`

### 3️⃣ الخدمات (`services/`)

- **معايير:**
  - ✅ منطق العمل فقط (بدون HTTP)
  - ✅ `enforceMfa: true` للعمليات الحساسة
  - ✅ معالجة أخطاء واضحة
- **الفحص:** `npm run lint:duplication`

### 4️⃣ المسارات (`routes/`)

- **معايير:**
  - ✅ middleware `requireMfaTier(N)` للعمليات الحساسة
  - ✅ `branchFilter(req)` أو `assertBranchMatch()` للعزل
  - ✅ `mongoose.isValidObjectId()` على كل param ID
- **الفحص:** `npm run check:routes-load`

### 5️⃣ المكتبات المشتركة (`intelligence/`)

- **ملاحظة:** ⭐ **لا تكررها في مجالات أخرى!**
- **المكتبات الأساسية:**
  - `hash-chain.lib.js` - التسلسل
  - `sod.lib.js` - Separation of Duties
  - `measure-lifecycle.lib.js` - دورات القياسات
  - `sensitivity-grade.lib.js` - درجات الحساسية
- **عند الحاجة:** `require('../intelligence/X.lib')`

---

## ✅ قائمة التحقق عند إضافة ميزة جديدة

- [ ] **نموذج:** أنشئ في `models/` وسجل في `intelligence/canonical/schemas/`
- [ ] **خدمة:** أنشئ في `services/` مع `enforceMfa: true`
- [ ] **مسارات:** أنشئ في `routes/` مع middleware MFA و branch-check
- [ ] **اختبار:** أضف اختبار في `__tests__/` مع رقم موجة
- [ ] **نقل الاختبار:** أضف المسار إلى `sprint-tests.txt`
- [ ] **فحص:** شغل `npm run quality:push`

---

## 🔥 المشاكل الشائعة والحلول

| المشكلة               | السبب                   | الحل                                                              |
| --------------------- | ----------------------- | ----------------------------------------------------------------- |
| Routes not loading    | `require()` خطأ في مسار | `npm run check:routes-load`                                       |
| Duplicate model error | نفس النموذج في ملفين    | استخدم `module.exports = mongoose.models.X \|\| mongoose.model()` |
| Tests not in sprint   | اختبار جديد لم يُضاف    | `npm run sync:sprint-paths`                                       |
| Wave collision        | رقم موجة مستخدم         | تحقق من `git log --oneline -50 \| grep WN`                        |
| MFA bypass            | middleware غير مرتب     | اطلب `requireMfaTier()` قبل middleware أخرى                       |

---

**آخر تحديث:** يونيو 13، 2026  
**المسؤول:** فريق Backend  
**الحالة:** ✅ نشط ومتطور
