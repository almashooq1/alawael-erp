# 🤝 دليل المساهمة في ALAWAEL ERP

شكراً لاهتمامك بالمساهمة في ALAWAEL ERP! هذا الدليل سيساعدك على فهم عملية المساهمة.

---

## 📋 جدول المحتويات
- [السلوك الأخلاقي](#السلوك-الأخلاقي)
- [كيفية المساهمة](#كيفية-المساهمة)
- [معايير الكود](#معايير-الكود)
- [عملية الـ Pull Request](#عملية-الـ-pull-request)
- [الاختبارات](#الاختبارات)
- [التوثيق](#التوثيق)

---

## 🤝 السلوك الأخلاقي

### التزامنا
نلتزم بجعل هذا المشروع بيئة ترحيبية وشاملة للجميع.

### توقعاتنا
جميع المساهمين يجب أن:
- ✅ يكونوا محترمين وإيجابيين
- ✅ لا يشاركوا في التسلط أو الإساءة
- ✅ يتقبلوا النقد البناء بروح رياضية
- ✅ يركزوا على ما هو الأفضل للمجتمع

---

## 🚀 كيفية المساهمة

### 1️⃣ أنواع المساهمات المقبولة

#### 🐛 إصلاح الأخطاء (Bug Fixes)
```bash
git checkout -b fix/issue-number-short-description
# مثال: fix/123-login-button-not-working
```

#### ✨ إضافة ميزات جديدة (New Features)
```bash
git checkout -b feature/feature-name
# مثال: feature/user-dashboard
```

#### 📚 تحسينات التوثيق (Documentation)
```bash
git checkout -b docs/documentation-name
# مثال: docs/installation-guide
```

#### 🔧 تحسينات الأداء (Performance)
```bash
git checkout -b perf/improvement-name
# مثال: perf/optimize-database-queries
```

#### ♻️ إعادة هندسة الكود (Refactoring)
```bash
git checkout -b refactor/component-name
# مثال: refactor/auth-service
```

### 2️⃣ خطوات المساهمة الأساسية

```bash
# 1. Fork المستودع
# (انقر على زر Fork على GitHub)

# 2. استنساخ الفرع الخاص بك
git clone https://github.com/YOUR_USERNAME/alawael-erp.git
cd alawael-erp

# 3. أضف upstream
git remote add upstream https://github.com/almashooq1/alawael-erp.git

# 4. تحديث من الـ main
git fetch upstream
git checkout main
git merge upstream/main

# 5. أنشئ فرع جديد
git checkout -b feature/your-feature-name

# 6. قم بالتغييرات
# (اكتب الكود، اختبر، الخ)

# 7. Commit التغييرات
git commit -m "فئة: وصف موجز (commit message)"

# 8. Push للفرع
git push origin feature/your-feature-name

# 9. افتح Pull Request على GitHub
```

---

## 📐 معايير الكود

### 🎨 أسلوب الكود

```javascript
// ✅ جيد
const calculateTotal = (items) => {
  return items.reduce((sum, item) => sum + item.price, 0);
};

// ❌ خاطئ
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}
```

### 📌 قواعد الكود

1. **استخدم `const` و `let`** بدلاً من `var`
2. **استخدم arrow functions** للوظائف البسيطة
3. **استخدم template literals** للسلاسل
4. **أضف JSDoc comments** للوظائف المعقدة
5. **لا تترك `console.log`** في الكود النهائي
6. **استخدم naming conventions** واضحة

### ✅ قائمة التحقق من الكود
- [ ] الكود يتبع `ESLint` rules
- [ ] الكود منسق باستخدام `Prettier`
- [ ] جميع الاختبارات تعمل
- [ ] لا توجد تحذيرات في الـ build
- [ ] التوثيق محدثة

---

## 📝 عملية الـ Pull Request

### 1️⃣ قبل فتح PR
```bash
# تأكد من أن الكود يعمل
make test        # تشغيل الاختبارات
make lint        # فحص الكود
make build       # بناء المشروع
```

### 2️⃣ عند فتح PR
**استخدم القالب التالي:**

```markdown
## الوصف
وصف مختصر لما تفعله هذه PR.

## نوع التغيير
- [ ] 🐛 إصلاح خطأ
- [ ] ✨ ميزة جديدة
- [ ] 📚 توثيق
- [ ] ⚡ تحسين أداء
- [ ] ♻️ إعادة هندسة

## التغييرات
- قائمة بالتغييرات الرئيسية
- التغيير الثاني
- التغيير الثالث

## الاختبارات
- [ ] تم اختبار Locally
- [ ] تم إضافة اختبارات جديدة
- [ ] جميع الاختبارات تعمل

## صور/فيديوهات (إن كانت متاحة)
أضف صور أو فيديوهات توضح التغييرات إن أمكن.

## Issues
إغلق: #NUMBER
يتعلق بـ: #NUMBER
```

### 3️⃣ بعد فتح PR
- ✅ سيتم الفحص التلقائي (CI/CD)
- ✅ قد يطلب المراجع تعديلات
- ✅ بمجرد الموافقة، سيتم الـ merge

---

## 🧪 الاختبارات

### كتابة الاختبارات

```javascript
// src/utils/math.test.js
const { calculateTotal } = require('./math');

describe('Math Utils', () => {
  describe('calculateTotal', () => {
    it('should calculate sum of items', () => {
      const items = [{ price: 10 }, { price: 20 }];
      expect(calculateTotal(items)).toBe(30);
    });

    it('should return 0 for empty array', () => {
      expect(calculateTotal([])).toBe(0);
    });
  });
});
```

### تشغيل الاختبارات
```bash
# تشغيل جميع الاختبارات
npm test

# تشغيل اختبار محدد
npm test -- math.test.js

# تشغيل مع تغطية
npm test -- --coverage

# وضع المراقبة
npm test -- --watch
```

### معايير التغطية
- **Lines**: >= 80%
- **Branches**: >= 75%
- **Functions**: >= 80%
- **Statements**: >= 80%

---

## 📚 التوثيق

### تحديث التوثيق

```markdown
# عندما تضيف ميزة جديدة:
1. وثق الميزة في README.md
2. أضف أمثلة استخدام
3. حدث الـ API documentation
4. أضف صور/screenshots إن أمكن

# عندما تصلح خطأ:
1. أضف شرح الخطأ
2. أشر للـ issue
3. أضف اختبار يغطي الخطأ
```

### مثال على التوثيق الجيد

````markdown
## خاصية جديدة: تتبع الشحنات

### الوصف
يمكن للمستخدمين الآن تتبع حالة الشحنات في الوقت الفعلي.

### الاستخدام

```javascript
const tracker = new ShipmentTracker();
const status = await tracker.getStatus('SHIPMENT_ID');
console.log(status); // { status: 'in_transit', ... }
```

### الخصائص
- ✅ تحديثات فورية
- ✅ دعم متعدد اللغات
- ✅ إشعارات تلقائية
````

---

## 🔍 عملية المراجعة

### ما يبحث عنه المراجعون:
1. ✅ **الصحة الوظيفية**: هل يعمل الكود بشكل صحيح؟
2. ✅ **جودة الكود**: هل الكود نظيف وسهل الفهم؟
3. ✅ **الاختبارات**: هل هناك اختبارات كافية؟
4. ✅ **التوثيق**: هل التوثيق كافية ودقيقة؟
5. ✅ **الأداء**: هل هناك تأثير سلبي على الأداء؟
6. ✅ **الأمان**: هل هناك مشاكل أمان؟

---

## 💡 نصائح للنجاح

### ✅ أفضل الممارسات
1. **ابدأ صغيراً** - PR صغيرة أسهل للمراجعة
2. **اختبر محلياً** - تأكد من التشغيل قبل الإرسال
3. **اتبع الأسلوب** - استخدم `make lint-fix`
4. **اكتب رسائل واضحة** - اشرح ماذا وليس فقط كيفية
5. **تفاعل مع التعليقات** - لا تتردد في الأسئلة

### ❌ تجنب
- ❌ PR كبيرة جداً (أكثر من 400 سطر)
- ❌ تغييرات غير مرتبطة في PR واحد
- ❌ ترك `debugger` و `console.log`
- ❌ عدم اتباع معايير الكود
- ❌ عدم كتابة اختبارات

---

## 📊 الإحصائيات المتوقعة

- **وقت المراجعة**: 1-3 أيام عمل
- **معدل الموافقة**: ~70%
- **متوسط الاختبارات**: 3-5 تعليقات
- **وقت الـ merge**: بعد الموافقة مباشرة

---

## 📞 الدعم والأسئلة

- **أسئلة عامة**: استخدم [Discussions](https://github.com/almashooq1/alawael-erp/discussions)
- **الأخطاء**: افتح [Issue](https://github.com/almashooq1/alawael-erp/issues)
- **الدردشة**: [Discord Server](https://discord.gg/alawael)

---

## 🎉 شكراً!

شكراً لمساهمتك! 🙏 كل مساهمة تحسن المشروع للجميع.

**آخر تحديث**: مارس 1, 2026
