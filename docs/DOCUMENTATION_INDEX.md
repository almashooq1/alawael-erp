# 📖 فهرس التوثيق الشامل

**تاريخ الإنشاء:** يونيو 13، 2026 | **الحالة:** ✅ كامل

---

## 🎯 الوثائق التنظيمية الأساسية

### للمبتدئين 👶

| الوثيقة                                               | الغرض                  | الوقت    |
| ----------------------------------------------------- | ---------------------- | -------- |
| [QUICKSTART_AR.md](./QUICKSTART_AR.md)                | البدء السريع - 5 دقائق | 5 دقائق  |
| [PROJECT_ORGANIZATION.md](../PROJECT_ORGANIZATION.md) | خريطة المشروع الكاملة  | 15 دقيقة |
| [BACKEND_STRUCTURE.md](./BACKEND_STRUCTURE.md)        | تفاصيل بنية Backend    | 20 دقيقة |

### للمطورين النشطين 👨‍💻

| الوثيقة                                      | الغرض               | الوقت    |
| -------------------------------------------- | ------------------- | -------- |
| [DAILY_OPERATIONS.md](./DAILY_OPERATIONS.md) | الإجراءات اليومية   | 10 دقائق |
| [DEVELOPMENT.md](./DEVELOPMENT.md)           | دليل التطوير الشامل | 30 دقيقة |
| [MODULES.md](./MODULES.md)                   | فهرس جميع المجالات  | 20 دقيقة |

### للمسؤولين والمعماريين 🏗️

| الوثيقة                                                                      | الغرض              | الوقت    |
| ---------------------------------------------------------------------------- | ------------------ | -------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md)                                         | المعمارية الأساسية | 45 دقيقة |
| [blueprint/00-master-architecture.md](./blueprint/00-master-architecture.md) | المرجع المعماري    | 1 ساعة   |
| [MIGRATION_LEDGER.md](./MIGRATION_LEDGER.md)                                 | سجل القرارات       | 30 دقيقة |

---

## 🏛️ القرارات المعمارية (ADRs)

**المجلد:** `docs/architecture/decisions/`

### المجموعة الأولى (الأساسية)

| رقم     | العنوان               | الحالة      | النقطة الرئيسية                        |
| ------- | --------------------- | ----------- | -------------------------------------- |
| ADR-001 | DDD vs Layered        | ✅ ACCEPTED | استخدام DDD للمجالات المعقدة           |
| ADR-002 | Monorepo vs Multirepo | ✅ ACCEPTED | 66666 + alawael-rehab-platform منفصلان |
| ADR-003 | API Versioning        | ✅ ACCEPTED | `/api/v1/` و `/api/` متوازنان          |
| ADR-004 | Auth Strategy         | ✅ ACCEPTED | JWT + OAuth2 + MFA 5-layer             |
| ADR-005 | Database Modeling     | ✅ ACCEPTED | Mongoose + MongoDB Atlas               |

### المجموعة الثانية (المجالات)

| رقم     | العنوان              | الحالة      | النقطة الرئيسية                |
| ------- | -------------------- | ----------- | ------------------------------ |
| ADR-019 | MFA Tier Enforcement | ✅ ACCEPTED | 5 طبقات أمان (W273-W278)       |
| ADR-020 | Event System         | ✅ ACCEPTED | DDD Event Bus (W374-W408)      |
| ADR-021 | Model Duplication    | ✅ ACCEPTED | تفادي Duplicate Models (W340+) |
| ADR-022 | Beneficiary Model    | ✅ ACCEPTED | Canonical Beneficiary (W324+)  |
| ADR-023 | Care Plan Registry   | ✅ ACCEPTED | سجل موحد للخطط (W41)           |

### المجموعة الثالثة (التقرير)

| رقم     | العنوان                | الحالة      | النقطة الرئيسية                  |
| ------- | ---------------------- | ----------- | -------------------------------- |
| ADR-025 | Module Dependencies    | ✅ ACCEPTED | 8-tier DAG للمجالات              |
| ADR-026 | IEP/IFSP Fragmentation | 🟡 PROPOSED | توحيد خطط التعليم المبكر         |
| ADR-027 | Event Contract Wiring  | ✅ ACCEPTED | 14/14 wires verified (W385-W386) |
| ADR-030 | Dormant Modules        | ✅ ACCEPTED | استراتيجية الوحدات الموقوفة      |

---

## 📋 الأدلة الإجرائية (Runbooks)

**المجلد:** `docs/runbooks/`

### التطوير

- `DEVELOPMENT.md` - دليل التطوير الشامل
- `DAILY_OPERATIONS.md` - الإجراءات اليومية
- `git-workflow.md` - سير العمل مع Git

### الاختبار والجودة

- `TESTING_STRATEGY.md` - استراتيجية الاختبار
- `CI_CD_SETUP_GUIDE.md` - إعداد CI/CD
- `QUALITY_GATES.md` - بوابات الفحص السبع

### النشر والتشغيل

- `DEPLOYMENT_RUNBOOK.md` - دليل النشر
- `PRODUCTION_DEPLOYMENT.md` - نشر الإنتاج
- `GO_LIVE_RUNBOOK_2026-06-11.md` - خطة الإطلاق
- `MONITORING_GUIDE.md` - دليل المراقبة

### العمليات الإدارية

- `SECURITY_CHECKLIST.md` - قائمة الأمان
- `HR_COMPLIANCE_GUIDE.md` - التوافق الإداري
- `OPERATIONS.md` - العمليات العامة

---

## 🏗️ الخطط والمراحل

**المجلد:** `docs/sprints/` و `docs/`

### المراحل الرئيسية

| المرحلة | الحالة | الملف                         | الملخص                 |
| ------- | ------ | ----------------------------- | ---------------------- |
| Phase A | ✅     | N/A                           | منصة أساسية (323 موجة) |
| Phase B | ✅     | SESSION_2026-05-25_HANDOFF.md | أصوات وحقوق (60 موجة)  |
| Phase 3 | ✅     | PHASE3_PLAN.md                | حوكمة وذكاء (40 موجة)  |
| Phase 4 | 🔄     | (current)                     | خدمات إضافية (جاري)    |

### السجلات بالموجات

- `BUILD_SEQUENCE_PLAN.md` - خطة البناء
- `PHASE_9_REHAB_ENGINE_RUNBOOK.md` - محرك التأهيل
- `PHASE_10_REPORTING_RUNBOOK.md` - التقارير
- `PILOT_CYCLE_1.md` - دورة الاختبار الأولى

---

## 🔐 الأمان والامتثال

**المجلد:** `docs/security/`

### الوثائق الأمنية

- `SECURITY.md` - ملخص الأمان العام
- `SECURITY_CHECKLIST.md` - قائمة التحقق الأمنية
- `HR_COMPLIANCE_GUIDE.md` - التوافق القانوني

### معايير الامتثال

- **CBAHI**: 45 معايير (W360-W370)
- **PDPL**: خصوصية البيانات السعودية (TTL 30 يوم)
- **CRPD**: حقوق الأشخاص ذوي الإعاقة (Phase B)

---

## 📊 التقارير والتحليلات

**المجلد:** `docs/`

### التقارير الحالية

| التقرير                                 | التاريخ    | الملخص                 |
| --------------------------------------- | ---------- | ---------------------- |
| PRODUCTION_DATA_REALITY_2026-06-11.md   | 2026-06-11 | واقع البيانات الفعلية  |
| FRONTEND_AUDIT_W356_W384.md             | 2026-05-25 | تدقيق الواجهة الأمامية |
| OPEN_ISSUES_INVENTORY.md                | جاري       | قائمة المشاكل المفتوحة |
| DDD_VS_LEGACY_MODEL_SPLIT_2026-06-12.md | 2026-06-12 | تقسيم DDD vs Legacy    |

### التقييمات والدراسات

- `MODULE_AUDIT_2026-05-25.md` - تدقيق الوحدات
- `PRODUCTION_GAPS_BEFORE_LIVE.md` - الفجوات قبل الإطلاق
- `E2E_TESTING_COMPLETE_SUMMARY.md` - ملخص الاختبار الشامل

---

## 📱 التوثيق التقني

**المجلد:** `docs/`

### API والمسارات

- `swagger.js` - توثيق Swagger/OpenAPI
- `asyncapi/` - توثيق الأحداث
- `api/` - تفاصيل نقاط النهاية

### قاعدة البيانات

- `database/` - مخطط قاعدة البيانات
- `models.md` - فهرس النماذج
- موثق Mongoose schemas في كل ملف

### الخدمات الخارجية

- `integrations/` - توثيق التكاملات
- `SLACK_INTEGRATION_GUIDE.md` - دليل Slack
- `GITHUB_INTEGRATION_GUIDE.md` - دليل GitHub

---

## 🎓 الموارد التعليمية

**المجلد:** `docs/` و `docs/user-guide/`

### الأدلة التعليمية

- `REHAB_ERP_IMPLEMENTATION_GUIDE.md` - دليل التنفيذ
- `REHAB_CENTER_ERP_SYSTEM.md` - نظام المركز الشامل
- `QUICK_REFERENCE_GUIDE_AR.md` - المرجع السريع (عربي)

### الشرح التفاعلي

- `THERAPEUTIC_SESSION_USE_CASES.js` - حالات الاستخدام
- `rehabilitation-dashboard.html` - لوحة تحكم تجريبية
- `rehabilitation-plan-template.html` - قالب خطة التأهيل

---

## 🔗 الملفات المرجعية السريعة

| الملف                  | المسار   | الغرض                   |
| ---------------------- | -------- | ----------------------- |
| **CLAUDE.md**          | الجذر    | سجل المشروع الشامل جداً |
| **README.md**          | الجذر    | نظرة عامة المشروع       |
| **CONTRIBUTING.md**    | الجذر    | دليل المساهمة           |
| **.github/workflows/** | الجذر    | تكوينات CI/CD           |
| **jest.config.js**     | backend/ | إعدادات الاختبار        |
| **package.json**       | backend/ | قائمة المكتبات والأوامر |
| **eslint.config.js**   | backend/ | قواعد الأسلوب           |
| **.env.example**       | backend/ | متغيرات البيئة          |

---

## 🗺️ خريطة القراءة حسب الدور

### 🆕 مطور جديد

1. اقرأ: `QUICKSTART_AR.md` (5 دقائق)
2. اقرأ: `PROJECT_ORGANIZATION.md` (15 دقيقة)
3. اقرأ: `BACKEND_STRUCTURE.md` (20 دقيقة)
4. جرّب: `npm run dev` + `npm test` (10 دقائق)
5. **المجموع: 50 دقيقة**

### 👨‍💼 قائد الفريق

1. اقرأ: `ARCHITECTURE.md` (45 دقيقة)
2. اقرأ: `MODULES.md` (20 دقيقة)
3. اقرأ: `MIGRATION_LEDGER.md` (30 دقيقة)
4. استعرض: ADRs الرئيسية (30 دقيقة)
5. **المجموع: 2 ساعة**

### 🏗️ معماري النظام

1. اقرأ: `blueprint/00-master-architecture.md` (1 ساعة)
2. اقرأ: جميع ADRs (1.5 ساعة)
3. اقرأ: `MIGRATION_LEDGER.md` (30 دقيقة)
4. استعرض: رسوم المعمارية (30 دقيقة)
5. **المجموع: 3.5 ساعة**

### 🚀 مهندس DevOps

1. اقرأ: `DEPLOYMENT_RUNBOOK.md` (20 دقيقة)
2. اقرأ: `MONITORING_GUIDE.md` (30 دقيقة)
3. اقرأ: `GO_LIVE_RUNBOOK_2026-06-11.md` (20 دقيقة)
4. راجع: `docker-compose.yml` و `.env` (20 دقيقة)
5. **المجموع: 1.5 ساعة**

---

## 🔍 البحث السريع

### أريد أن أعرف...

**"كيف أضيف ميزة جديدة؟"**
→ اقرأ: [DAILY_OPERATIONS.md](./DAILY_OPERATIONS.md) → "إضافة ميزة جديدة"

**"ما هي معايير الأمان؟"**
→ اقرأ: [SECURITY_CHECKLIST.md](./security/SECURITY_CHECKLIST.md)

**"كيف ترتبط المجالات ببعضها؟"**
→ اقرأ: [ARCHITECTURE.md](./ARCHITECTURE.md) → "DDD Domains"

**"ما هي الموجات التي تم إكمالها؟"**
→ اقرأ: [MIGRATION_LEDGER.md](./MIGRATION_LEDGER.md)

**"كيف أشغّل الاختبارات؟"**
→ اقرأ: [DAILY_OPERATIONS.md](./DAILY_OPERATIONS.md) → "الأوامر الأساسية"

**"أين تكون قاعدة البيانات؟"**
→ اقرأ: `.env.example` و `backend/database/`

**"كيف أستخدم الـ Events؟"**
→ اقرأ: `ADR-020` و `backend/events/`

---

## 📌 الملاحظات الهامة

### ⚠️ الأشياء المهمة

- ✅ **CLAUDE.md** = السجل الشامل (قد يكون قديماً محليّاً)
- ✅ **ADRs** = القرارات الملزمة (أساسي الفهم)
- ✅ **sprint-tests.txt** = اختبارات الدورة الحالية
- ✅ **DAILY_OPERATIONS.md** = المرجع اليومي

### 📚 التحديث المنتظم

هذه الملفات يتم تحديثها مع كل موجة جديدة:

- `PROJECT_ORGANIZATION.md` (موجات جديدة)
- `MODULES.md` (مجالات جديدة)
- `MIGRATION_LEDGER.md` (قرارات جديدة)

### 🔄 الملفات الديناميكية

قد تتغير بدون إشعار:

- `sprint-tests.txt`
- `.env.example`
- `.github/workflows/`

---

## 🎯 الخطوات التالية

1. **اختر دورك** من قسم "خريطة القراءة حسب الدور"
2. **ابدأ بالملفات الأولى** الموصى بها
3. **ضع عنشة على الملفات** التي تقرأها مهمة
4. **رجع إليها لاحقاً** عند الحاجة
5. **شارك الملاحظات** إذا كان هناك التباس

---

## 📞 الدعم والمساعدة

| المشكلة            | الحل                       |
| ------------------ | -------------------------- |
| وثيقة غير واضحة    | اقرأ الملف المرجعي المرتبط |
| لا أعرف أين أبدأ   | ابدأ بـ QUICKSTART_AR.md   |
| لدي سؤال تقني      | راجع ADRs ذات الصلة        |
| أريد مثالاً        | اقرأ DAILY_OPERATIONS.md   |
| أحتاج مساعدة فورية | اسأل في Slack أو الاجتماع  |

---

**آخر تحديث:** يونيو 13، 2026  
**المسؤول:** فريق التوثيق  
**الحالة:** ✅ كامل وجاهز للاستخدام
