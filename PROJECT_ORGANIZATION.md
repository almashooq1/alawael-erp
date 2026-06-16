# 📋 هيكل تنظيم مشروع منصة التأهيل الموحدة والذكية

**آخر تحديث:** يونيو 13، 2026 | **الإصدار:** 1.0

---

## 1️⃣ نظرة عامة على المشروع

**المشروع:** منصة تأهيل موحدة وذكية لذوي الإعاقة (Al-Awael Rehab Platform)  
**المقر:** السعودية | **المكدس التقني:** Node.js + Express + MongoDB + React + Next.js + TypeScript

### المراكز الأساسية

- **Backend (الخادم الفعلي الحي):** `66666/backend/` - Express API مع MongoDB
- **Frontend (الإدارة):** `alawael-rehab-platform/apps/web-admin/` - Next.js 15
- **Frontend (وراثي):** `66666/frontend/` - React 18 (قيد الاستبدال)
- **Mobile:** `66666/mobile/` - React Native

---

## 2️⃣ هيكل المجلدات الرئيسية

```
66666/
├── backend/                    # 🔧 الخادم الفعلي الحي (Express API)
│   ├── __tests__/              # اختبارات شاملة (792 ملف)
│   ├── models/                 # نماذج Mongoose الأساسية
│   ├── routes/                 # مسارات API (501 ملف)
│   ├── services/               # خدمات الأعمال
│   ├── domains/                # منطق مجالات DDD
│   ├── middleware/             # وسيط Express
│   ├── intelligence/           # مكتبات مشتركة (كيف يجب أن تكون)
│   ├── startup/                # تهيئة التطبيق
│   ├── app.js                  # نقطة الدخول الرئيسية
│   └── server.js               # بدء الخادم
│
├── alawael-rehab-platform/     # 🎨 مشروع TypeScript منفصل
│   ├── apps/web-admin/         # Next.js 15 (الإدارة الجديدة)
│   └── packages/               # مكتبات مشتركة (auth, i18n, ui)
│
├── frontend/                   # 📱 React وراثي (قيد الاستبدال)
├── mobile/                     # 📲 React Native
├── contracts/                  # 📜 عقود Solidity
├── supply-chain-management/    # 🏭 نموذج منفصل للإمداد
│
├── docs/                       # 📚 التوثيق
│   ├── architecture/           # القرارات المعمارية (ADRs)
│   ├── blueprint/              # المخططات الأساسية
│   ├── runbooks/               # أدلة التشغيل
│   └── sprints/                # سجلات الدورات
│
├── ops/                        # 🚀 عمليات وتوزيع
│   ├── docker/                 # ملفات Docker
│   └── k8s/                    # تكوينات Kubernetes
│
├── scripts/                    # 🔨 أدوات مساعدة
│   ├── ci/                     # سكريبتات CI/CD
│   └── maintenance/            # سكريبتات الصيانة
│
├── _archived/                  # 📦 ملفات قديمة مؤرشفة
├── logs/                       # 📝 سجلات التطبيق
├── uploads/                    # 📄 الملفات المرفوعة
└── node_modules/               # 📦 المكتبات المثبتة
```

---

## 3️⃣ وظائف المجلدات الأساسية

### `backend/` - الخادم الفعلي الحي

| المجلد          | الوصف                               | الملفات                     |
| --------------- | ----------------------------------- | --------------------------- |
| `__tests__/`    | اختبارات شاملة                      | 792 ملف اختبار              |
| `models/`       | نماذج Mongoose البيانية             | ~100 نموذج                  |
| `routes/`       | مسارات API REST                     | 501 ملف                     |
| `services/`     | خدمات الأعمال المنطقية              | +100 خدمة                   |
| `domains/`      | منطق DDD                            | 8 مجالات رئيسية             |
| `middleware/`   | وسائط Express                       | أمان، مصادقة، معالجة        |
| `intelligence/` | **مكتبات مشتركة** (يجب عدم تكرارها) | hash-chain, SoD, validators |
| `startup/`      | تهيئة التطبيق                       | bootstrap ملفات             |
| `integration/`  | تكامل الأنظمة الخارجية              | Sehhaty, Mudad, إلخ         |
| `scheduler/`    | مهام دورية                          | 47 sweeper/cron             |
| `events/`       | نظام الأحداث DDD                    | event bus, subscribers      |

### `alawael-rehab-platform/` - المشروع الجديد

- **مستقل تماماً** عن `66666/`
- TypeScript strict mode
- Next.js 15 في `apps/web-admin/`
- مكتبات مشتركة في `packages/` (auth, ui, validators, i18n)
- **الاتصال:** يستدعي `66666/backend` عبر `NEXT_PUBLIC_API_URL`

### `docs/` - التوثيق الموحدة

| الملف                                 | الغرض                             |
| ------------------------------------- | --------------------------------- |
| `architecture/decisions/`             | القرارات المعمارية (ADRs 001-030) |
| `blueprint/00-master-architecture.md` | المرجع الأساسي                    |
| `MODULES.md`                          | فهرس جميع المجالات والوحدات       |
| `MIGRATION_LEDGER.md`                 | سجل الترحيل والقرارات             |
| `runbooks/`                           | أدلة التشغيل الإجرائية            |

---

## 4️⃣ معايير الترميز والتطوير

### 🎯 المبادئ الأساسية

1. **ملف مستفيد واحد** - كل مستفيد له ملف طولي واحد (Beneficiary canonical)
2. **حلقة علاجية موحدة** - Episode of Care واحد لكل مسار
3. **نموذج بيانات موحد** - Canonical Data Model واحد فقط
4. **لا تكرار البيانات** - منع الازدواجية في الإدخال
5. **لا مكتبات مشتركة مكررة** - `intelligence/` هي المرجع الوحيد

### 🔒 الأمان والامتثال

- **MFA 5-Layer Stack** - ADR-019
- **Cross-branch isolation** - W269 Series
- **CBAHI 45-Standard Compliance** - W360-W370
- **PDPL-Aligned TTL** - 30 يوم للبيانات الشخصية

### ✅ التحقق من الجودة

```bash
# قبل كل commit:
npm run quality:push              # 7 بوابات فحص
npm run test:sprint              # اختبارات الدورة الشاملة
npm run check:wave-collision     # التحقق من تصادمات الموجات
```

---

## 5️⃣ إدارة الموجات (Waves)

**نظام الترقيم:** `W001`, `W002`, ... (حالياً في **W530+**)

كل موجة تمثل:

- ✅ ميزة واحدة أو إصلاح واحد
- ✅ حد أدنى من الالتزام الذري
- ✅ اختبارات شاملة

### بوابات الفحص المسبق (Pre-push)

| #   | البوابة            | الغرض                             | الحل السريع                     |
| --- | ------------------ | --------------------------------- | ------------------------------- |
| 1   | sprint-paths       | مزامنة مسارات الاختبار            | `npm run sync:sprint-paths`     |
| 2   | routes-load        | تحميل الطرق بدون أخطاء            | تحقق من `require()`             |
| 3   | gitignored-sources | لا ملفات مصدر مُتابعة ومُتجاهلة   | استخدم negation في `.gitignore` |
| 4   | hook-style         | توحيد Mongoose hooks              | `async function() { ... }`      |
| 5   | wave-collision     | عدم تصادم أرقام الموجات           | أعد ترقيم المجلدات              |
| 6   | phantom-writes     | لا كتابات شبحية في النماذج        | تحقق من `create()` schemas      |
| 7   | route-shadowing    | لا مسارات معكوسة غير قابلة للوصول | افصل `:param` و `literal`       |

---

## 6️⃣ الملفات الميتة والأرشيفة

### `_archived/` - لماذا موجودة؟

- **السجل التاريخي** للقرارات المرفوضة
- **نقاط مرجعية** للأنماط القديمة
- **توثيق "ماذا لم نستخدم"**

### محتويات `_archived/`

```
dead-models/           # نماذج لم يتم استخدامها (Patient, BeneficiaryProfile)
dead-routes/           # مسارات API قديمة
dead-services/         # خدمات موقوفة
dead-microservices/    # المحاولات السابقة للخدمات الدقيقة
dead-k8s/              # تكوينات Kubernetes القديمة
dead-monitoring/       # حل المراقبة السابق
github-workflows/      # سير العمل القديم
legacy-backups/        # نسخ احتياطية من النسخة السابقة
```

**القاعدة:** لا تُحذف من `_archived/` إلا إذا:

- ✅ تم استخدام المحتوى فعلياً في مكان آخر
- ✅ موثقة القرار في ADR أو commit message
- ✅ تم التحقق من عدم وجود روابط إليها

---

## 7️⃣ المكتبات المشتركة الأساسية

### ✋ **اليد الذهبية:** `backend/intelligence/`

**لا تكررها - استورد منها!**

```
intelligence/
├── canonical/          # نماذج Zod الموحدة (source of truth)
├── measure-lifecycle.lib.js   # دورة حياة القياسات
├── hash-chain.lib.js          # تسلسل التجزئة للتدقيق
├── sensitivity-grade.lib.js   # درجات الحساسية
├── sod.lib.js                 # Separation of Duties
├── care-planning.registry.js  # سجل خطط الرعاية
├── reason-codes.registry.js   # أكواد الأسباب (31+ كود)
└── parent-chatbot.registry.js # قائمة النوايا
```

---

## 8️⃣ مسارات الملفات الحرجة

### 🔑 الملفات التي **لا تُحرّر** بدون فهم

- `backend/app.js` - نقطة التطبيق الرئيسية
- `backend/server.js` - بدء الخادم
- `backend/jest.config.js` - إعدادات الاختبار
- `backend/.husky/pre-push` - بوابات الفحص
- `.github/workflows/` - CI/CD automation
- `docs/architecture/decisions/` - القرارات الملزمة

### 📝 الملفات التي **يجب تحديثها** بتزامن

- `backend/sprint-tests.txt` ↔ `.github/workflows/sprint-tests.yml`
- `backend/models/` ↔ `backend/intelligence/canonical/schemas/`
- `backend/routes/` ↔ `backend/services/`

---

## 9️⃣ الدورات الحالية (Sprints)

| الدورة                        | الحالة    | الملخص   |
| ----------------------------- | --------- | -------- |
| Phase A (منصة أساسية)         | ✅ مكتملة | 323 موجة |
| Phase B (الأصوات والحقوق)     | ✅ مكتملة | 60 موجة  |
| Phase 3 (الحوكمة والذكاء)     | ✅ مكتملة | 40 موجة  |
| W356–W376 (الخدمات السريرية)  | ✅ مكتملة | 21 موجة  |
| W401–W430 (العمليات الدورية)  | ✅ مكتملة | 30 موجة  |
| **Current (التطوير المستمر)** | 🔄 جاري   | W531+    |

---

## 🔟 قائمة التحقق للبدء الجديد

### ✅ عند البدء في تطوير جديد

```bash
# 1. تحديث الذاكرة المحلية
cd backend
npm run check:memory-health

# 2. تشغيل بوابات الفحص
npm run quality:push

# 3. تشغيل الاختبارات الشاملة
npm run test:sprint

# 4. اختيار رقم موجة جديد
# تحقق من: git log --oneline -10 | grep -oE 'W[0-9]+'
```

### ✅ عند الانتهاء من ميزة

```bash
# 1. تحديث رقم الموجة في الملفات الثلاثة
# 2. تشغيل الفحص الكامل
npm run quality:full

# 3. Commit مع الرسالة الوصفية
git commit -m "WxxxY: short description (tests: NN assertions)"

# 4. Push مع التحقق المسبق
git push origin main
```

---

## 🎯 الخطوات التالية

### قصيرة المدى (أسابيع)

- [ ] توحيد config files في `.env` template واحد
- [ ] إنشاء migration guide من Phase 2 إلى Phase 4
- [ ] توثيق API endpoints في OpenAPI/AsyncAPI

### متوسطة المدى (أشهر)

- [ ] استكمال W401-W430 series
- [ ] تقييم نقل الخدمات الدقيقة من `services/` إلى البوابة
- [ ] تنفيذ Real-time collaboration عبر WebSockets

### طويلة المدى (ربع سنة)

- [ ] إغلاق Phase 4 (الخدمات الإضافية)
- [ ] استعداد للإطلاق الرسمي
- [ ] استراتيجية الدعم والصيانة

---

**آخر تحديث:** يونيو 13، 2026  
**المالك:** فريق التطوير  
**الحالة:** ✅ نشط - يتطور باستمرار
