# 📋 دليل العمليات والإجراءات اليومية

**التاريخ:** يونيو 13، 2026 | **النسخة:** 1.0

---

## 🌅 في بداية اليوم

### 1. تحديث البيئة المحلية

```bash
cd backend
npm run check:memory-health          # تحقق من memory المحلي
npm run check:services               # تحقق من MongoDB و Redis
npm install                          # تحديث المكتبات إذا لزم
```

### 2. تشغيل التطبيق

```bash
# الطريقة 1: التطوير مع تحديث تلقائي
npm run dev                          # nodemon على port 3001

# الطريقة 2: تشغيل عادي
npm start

# الطريقة 3: في الخلفية
node start.js &
```

### 3. التحقق من الحالة

```bash
# تحقق من جميع المسارات
npm run check:routes-load

# تحقق من الأمان
npm run lint

# تشغيل الاختبارات
npm run test:sprint                 # اختبارات الدورة
npm test                            # جميع الاختبارات
```

---

## 💻 أثناء التطوير

### إضافة ميزة جديدة

#### الخطوة 1: البدء بـ Wave جديد

```bash
# تحقق من آخر wave number
git log --oneline -10 | grep -oE 'W[0-9]+'

# اختر الرقم التالي (مثلاً: W531)
# اكتبه في رسالة commit لاحقاً
```

#### الخطوة 2: إنشاء النموذج (إن أمكن)

```bash
# في backend/models/
# اسم الملف: FeatureName.js
# اسم النموذج في mongoose: FeatureName

# أضف إلى canonical schemas:
# backend/intelligence/canonical/schemas/featureName.canonical.js

# مثال:
# const { z } = require('zod');
# exports.FeatureNameSchema = z.object({
#   name: z.string(),
#   createdAt: z.date(),
#   branchId: z.string()
# });
```

#### الخطوة 3: إنشاء الخدمة

```bash
# في backend/services/
# اسم الملف: featureName.service.js

// مثال:
const { BaseService } = require('./base.service');

class FeatureNameService extends BaseService {
  constructor({ logger } = {}) {
    super({ logger, enforceMfa: true });  // ⭐ MFA للحساس
  }

  async create(data) { /* ... */ }
  async read(id) { /* ... */ }
  async update(id, data) { /* ... */ }
  async delete(id) { /* ... */ }
}

module.exports = FeatureNameService;
```

#### الخطوة 4: إنشاء المسارات

```bash
# في backend/routes/
# اسم الملف: featureName.routes.js

// مثال:
const router = require('express').Router();
const { requireMfaTier } = require('../middleware/mfaTier.middleware');
const { branchFilter } = require('../middleware/branchScope.middleware');

const svc = new (require('../services/featureName.service'))();

// قراءة (بدون MFA)
router.get('/list', (req, res) => {
  const items = await FeatureModel.find(branchFilter(req));
  res.json(items);
});

// إنشاء (مع MFA tier 1)
router.post(
  '/',
  requireMfaTier(1),
  async (req, res) => {
    const item = await svc.create(req.body);
    res.status(201).json(item);
  }
);

module.exports = router;
```

#### الخطوة 5: الاختبار

```bash
# في backend/__tests__/
# اسم الملف: featureName-wave531.test.js

// مثال بسيط:
describe('FeatureName Wave 531', () => {
  it('should create a feature', async () => {
    const feature = new FeatureName({ name: 'Test' });
    await feature.save();
    expect(feature._id).toBeDefined();
  });
});
```

#### الخطوة 6: تسجيل الاختبار

```bash
# في backend/sprint-tests.txt
# أضف السطر الجديد:
__tests__/featureName-wave531.test.js

# ثم شغل:
npm run sync:sprint-paths       # يحدّث .github/workflows/sprint-tests.yml
```

#### الخطوة 7: فحص الجودة

```bash
# قبل الـ commit:
npm run quality:push            # 7 بوابات فحص

# قبل الـ push:
npm run quality:ci              # اختبارات شاملة

# كليهما:
npm run quality:full
```

---

## 🚀 قبل الـ Commit

### قائمة التحقق

```
✅ جميع الاختبارات تمر:
   npm run test:sprint

✅ بدون أخطاء linting:
   npm run lint

✅ بدون تكرار الكود:
   npm run lint:duplication

✅ جميع المسارات تحمّل:
   npm run check:routes-load

✅ بدون تصادمات موجات:
   npm run check:wave-collision

✅ محفظة الذاكرة بحالة جيدة:
   npm run check:memory-health
```

### رسالة Commit الصحيحة

```bash
# الصيغة:
git commit -m "W531: Short description (tests: NN assertions)"

# الأمثلة:
git commit -m "W531: Add feature name endpoint (tests: 15 assertions)"
git commit -m "W532: Fix beneficiary model validation (tests: 8 assertions)"
git commit -m "W533: Implement MFA tier 2 for approval flow (tests: 22 assertions)"
```

---

## 📤 قبل الـ Push

### فحص مسبق أخير

```bash
# في المشروع الجذر
npm run quality:push            # سيشغل جميع البوابات

# إذا فشل أي بوابة، اقرأ الخطأ واتبع الوصفة السريعة:
# Gate 1 failed? → npm run sync:sprint-paths
# Gate 2 failed? → تحقق من require() في الملفات
# Gate 5 failed? → أعد ترقيم wave في جميع الملفات الثلاثة
```

### الـ Push الآمن

```bash
# الطريقة العادية:
git push origin main

# مع تخطي البوابات (نادر جداً):
CHECK_WAVE_SKIP=1 git push origin main  # فقط إذا كان هناك سبب موثّق
```

---

## 🔧 المشاكل والحلول السريعة

### ❌ Gate 1: sprint-paths تفشل

```bash
# الحل السريع:
npm run sync:sprint-paths
# ثم أضف الملف إلى git:
git add backend/sprint-tests.txt .github/workflows/sprint-tests.yml
git commit --amend --no-edit
```

### ❌ Gate 2: routes-load تفشل

```bash
# المشكلة: require() خطأ في مسار
# الحل: افتح الملف وتحقق من:
# 1. هل كل require() في الأعلى؟
# 2. هل المسارات صحيحة؟
# 3. هل لا توجد أخطاء syntax؟

# إذا كنت متأكداً، استخدم:
npm run check:routes-load --verbose
```

### ❌ Gate 3: gitignored-sources تفشل

```bash
# المشكلة: ملف source مستتبع وأيضاً في .gitignore
# الحل الأمثل:
git rm --cached <file>         # أزل من git tracking
# أو أضف negation في .gitignore:
!path/to/important-file.js
```

### ❌ Gate 4: hook-style تفشل

```bash
# المشكلة: Mongoose hooks مختلطة (async + callback)
# الحل: وحّد جميع hooks للنفس الـ event:
// Before:
schema.pre('save', function(next) { next(); });       // callback
schema.post('save', async () => { ... });             // async

// After:
schema.pre('save', async function() { /* ... */ });   // async
schema.post('save', async function() { /* ... */ });  // async
```

### ❌ Gate 5: wave-collision تفشل

```bash
# المشكلة: رقم موجة مستخدم بالفعل
# الحل:
# 1. تحقق من آخر wave number:
git log --oneline -20 | grep -oE 'W[0-9]+'
# 2. اختر الرقم التالي الخالي
# 3. أعد ترقيم في جميع الملفات الثلاثة:
#    - backend/routes/feature.routes.js (في test route)
#    - backend/__tests__/feature-waveNNN.test.js
#    - backend/sprint-tests.txt
# 4. شغل:
npm run sync:sprint-paths
# 5. عدّل .github/workflows/sprint-tests.yml يدويّاً لحذف الإدخالات القديمة
```

### ❌ الاختبار يفشل

```bash
# اشغل اختبار واحد:
npx jest --config=jest.config.js __tests__/feature-wave531.test.js

# مع التفاصيل:
npx jest --config=jest.config.js __tests__/feature-wave531.test.js --verbose

# بدون timeout:
npx jest --config=jest.config.js __tests__/feature-wave531.test.js --testTimeout=30000
```

---

## 🌙 في نهاية اليوم

### قائمة الإغلاق

```
✅ جميع التغييرات مرتكبة:
   git status              # يجب أن يكون النتيجة "nothing to commit"

✅ جميع الـ branches محدّثة:
   git log --oneline -5   # تحقق من الالتزامات الأخيرة

✅ لا توجد ملفات unsaved:
   Ctrl+Shift+P > "File: Save All"

✅ الـ memory آمن:
   npm run check:memory-health

✅ الـ database معروف:
   # تحقق من أن جميع collections موجودة
```

---

## 📊 الأوامر الأساسية بسرعة

```bash
# 🔥 الأساسيات
npm run dev                           # تطوير مع auto-reload
npm start                             # بدء الخادم
npm test                              # اختبارات كاملة
npm run test:sprint                   # اختبارات الدورة فقط

# 🛡️ الجودة
npm run lint                          # فحص الأسلوب
npm run format                        # تنسيق تلقائي
npm run quality:push                  # فحص قبل push
npm run quality:ci                    # فحص CI كامل

# 🔍 الفحوصات
npm run check:routes-load             # تحميل المسارات
npm run check:wave-collision          # تصادمات الموجات
npm run check:memory-health           # صحة الذاكرة
npm run check:duplication             # تكرار الأكواد

# 🗄️ قاعدة البيانات
npm run db:seed                       # ملء بيانات اختبار
npm run db:migrate                    # تطبيق migrations

# 📖 الوثائق
npm run swagger                       # تحديث API docs
npm run lint:docs                     # فحص الوثائق
```

---

## 🎯 الخطوات اليومية المختصرة

### للتطوير السريع (صباح)

```bash
cd backend
npm run dev                          # شغّل الخادم
# في terminal جديد:
npm run test:sprint -- --watch      # اختبارات مراقبة
```

### قبل الانتهاء (مساء)

```bash
git status                           # تحقق من الملفات
npm run quality:full                 # فحص كامل
git add .                           # أضف الملفات
git commit -m "W531: ..."           # التزم
git push origin main                # ادفع
npm run check:memory-health         # آمن الذاكرة
```

---

**ملاحظات:**

- ⏱️ جميع العمليات تأخذ <2 دقيقة على معايير Windows
- 🔒 لا تتخطى بوابات الفحص بدون سبب موثّق
- 📝 وثّق أي مشاكل غير عادية في memory notes
- 🤝 اطلب مساعدة إذا كانت بوابة الفحص غير واضحة

**آخر تحديث:** يونيو 13، 2026
