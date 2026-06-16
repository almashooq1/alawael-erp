# 🎯 دليل البدء السريع - للمبتدئين

**للمطورين الجدد على المشروع**  
**الوقت المقدّر للقراءة:** 15 دقيقة

---

## ⚡ البدء في 5 دقائق

### 1. استنساخ والتجهيز

```bash
# استنسخ المشروع
git clone https://github.com/almashooq1/alawael-erp.git
cd alawael-erp

# ثبت المكتبات
cd backend
npm install

# شغّل الخادم
npm run dev
# 🟢 الآن الخادم يعمل على http://localhost:3001
```

### 2. الملفات الأساسية للقراءة

1. **هذا الملف** - تفهم البنية الأساسية (أنت هنا!)
2. [PROJECT_ORGANIZATION.md](./PROJECT_ORGANIZATION.md) - خريطة المشروع كاملة
3. [BACKEND_STRUCTURE.md](./BACKEND_STRUCTURE.md) - تفاصيل backend
4. [DAILY_OPERATIONS.md](./DAILY_OPERATIONS.md) - الإجراءات اليومية

### 3. جرّب أول اختبار

```bash
# اذهب إلى مجلد backend
cd backend

# شغّل اختبار واحد
npm test -- beneficiary-wave324.test.js

# 🎉 رائع! الاختبارات تعمل
```

---

## 🏗️ البنية الأساسية (الصورة الكبيرة)

### المشروع ينقسم إلى 3 طبقات:

```
📱 الواجهات (Frontends)
    ↓
🔧 الخادم (Backend API) ← أنت ستعمل هنا 90%
    ↓
📦 قاعدة البيانات (MongoDB)
```

### أين تعمل؟

| ما تريد فعله        | المسار                | الملف                     |
| ------------------- | --------------------- | ------------------------- |
| إضافة endpoint جديد | `backend/routes/`     | `feature.routes.js`       |
| إضافة منطق عمل      | `backend/services/`   | `feature.service.js`      |
| إضافة نموذج بيانات  | `backend/models/`     | `Feature.js`              |
| كتابة اختبار        | `backend/__tests__/`  | `feature-waveNNN.test.js` |
| إضافة middleware    | `backend/middleware/` | `feature.middleware.js`   |
| التحقق من الإدخال   | `backend/validators/` | `feature.validator.js`    |

---

## 🎓 المفاهيم الأساسية

### 1️⃣ النموذج (Model)

يصف **شكل البيانات** في قاعدة البيانات

```javascript
// backend/models/Beneficiary.js
const schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true },
  branchId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Beneficiary', schema);
```

### 2️⃣ الخدمة (Service)

تحتوي على **منطق الأعمال** (البحث، الحفظ، الحسابات)

```javascript
// backend/services/beneficiary.service.js
class BeneficiaryService {
  async create(data) {
    // تحقق من الصحة
    // احفظ في قاعدة البيانات
    // أرجع النتيجة
    return beneficiary;
  }
}
```

### 3️⃣ المسار (Route)

يربط بين **الطلب HTTP** و**الخدمة**

```javascript
// backend/routes/beneficiary.routes.js
router.post('/', async (req, res) => {
  const beneficiary = await svc.create(req.body);
  res.status(201).json(beneficiary);
});

// الآن يمكن استدعاء:
// POST /api/beneficiary
```

### 4️⃣ الاختبار (Test)

تتحقق من أن **الكود يعمل بشكل صحيح**

```javascript
// backend/__tests__/beneficiary-wave531.test.js
describe('Beneficiary', () => {
  it('should create a beneficiary', async () => {
    const ben = await svc.create({
      name: 'أحمد',
      email: 'ahmed@test.com',
    });
    expect(ben._id).toBeDefined();
  });
});
```

---

## 🚀 أول تطوير (مثال عملي)

### المطلوب: إضافة endpoint جديد لتحديث اسم المستفيد

#### الخطوة 1: اكتب الاختبار أولاً ✍️

```javascript
// backend/__tests__/beneficiary-update-wave531.test.js
describe('Update Beneficiary Name', () => {
  it('should update beneficiary name', async () => {
    // أنشئ مستفيد اختبار
    const ben = new Beneficiary({
      name: 'أحمد',
      email: 'ahmed@test.com',
      branchId: 'branch1',
    });
    await ben.save();

    // حدثّ الاسم
    const svc = new BeneficiaryService();
    const updated = await svc.updateName(ben._id, 'محمد');

    // تحقق من النتيجة
    expect(updated.name).toBe('محمد');
  });
});
```

#### الخطوة 2: اكتب الخدمة 🛠️

```javascript
// في backend/services/beneficiary.service.js
class BeneficiaryService {
  // ... methods موجودة ...

  async updateName(beneficiaryId, newName) {
    // تحقق من الإدخال
    if (!newName || newName.trim().length === 0) {
      throw new Error('Name cannot be empty');
    }

    // ابحث عن المستفيد
    const beneficiary = await Beneficiary.findById(beneficiaryId);
    if (!beneficiary) {
      throw new Error('Beneficiary not found');
    }

    // حدثّ الاسم
    beneficiary.name = newName;
    await beneficiary.save();

    return beneficiary;
  }
}
```

#### الخطوة 3: اكتب المسار 🌐

```javascript
// في backend/routes/beneficiary.routes.js
router.patch('/:id/name', async (req, res) => {
  try {
    const { name } = req.body;

    // استدع الخدمة
    const updated = await svc.updateName(req.params.id, name);

    // أرجع النتيجة
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
```

#### الخطوة 4: اختبر 🧪

```bash
cd backend

# شغّل الاختبار
npm test -- beneficiary-update-wave531.test.js

# 🎉 النتيجة: PASS
```

#### الخطوة 5: التزم وادفع 📤

```bash
# أضف الملفات
git add .

# التزم
git commit -m "W531: Add endpoint to update beneficiary name (tests: 3 assertions)"

# ادفع
git push origin main
```

---

## 🔍 كيف تفهم الكود الموجود؟

### 1. ابحث عن endpoint في المتصفح

```
من هنا تريد أن تذهب؟
GET /api/beneficiary/list
```

### 2. ابحث عن المسار

```bash
grep -r "beneficiary/list" backend/routes/
# النتيجة:
# backend/routes/beneficiary.routes.js: router.get('/list', ...)
```

### 3. ادرس المسار

```bash
# افتح الملف:
code backend/routes/beneficiary.routes.js
# ابحث عن '/list'
# اقرأ الكود حول هذا المسار
```

### 4. اتبع الخدمة

```javascript
// المسار يستدعي: svc.list()
// ابحث عن list في الخدمة:
code backend/services/beneficiary.service.js
```

### 5. اتبع النموذج

```javascript
// الخدمة تستخدم: Beneficiary.find()
// ابحث عن النموذج:
code backend/models/Beneficiary.js
```

---

## ⚠️ الأشياء المهمة (لا تنسها!)

### ✅ يجب أن تفعل

- ✅ **كتابة اختبار أولاً** قبل الكود
- ✅ **المصادقة والتفويض** على كل endpoint
- ✅ **فحص المدخلات** (validation)
- ✅ **معالجة الأخطاء** بشكل واضح
- ✅ **توثيق التغييرات** في commit message

### ❌ لا تفعل

- ❌ لا تعدل `.env` وتلتزم بها
- ❌ لا تحذف ملفات من `_archived/` بدون سبب
- ❌ لا تستخدم console.log (استخدم logger)
- ❌ لا تكتب نفس المنطق في ملفين (استخدم `intelligence/`)
- ❌ لا تسرّع القوانين الأمنية

---

## 📚 الموارد

### الملفات الأساسية

- `PROJECT_ORGANIZATION.md` - الخريطة الكاملة
- `BACKEND_STRUCTURE.md` - تفاصيل backend
- `DAILY_OPERATIONS.md` - الأوامر اليومية
- `CLAUDE.md` - سجل المشروع الشامل

### الأوامر المفيدة

```bash
# شغّل الخادم
npm run dev

# شغّل الاختبارات
npm run test:sprint

# تحقق من الجودة
npm run quality:push

# اقرأ السجلات
npm run logs
```

### الأسئلة الشائعة

**س: ماذا لو فشل اختباري؟**  
ج: اقرأ الخطأ، افهمه، صحح الكود، شغّل الاختبار مرة أخرى

**س: أين أضع الثوابت (مثل MAX_USERS)؟**  
ج: في `backend/constants/` أو `backend/config/`

**س: كيف أستخدم متغيرات البيئة؟**  
ج: اقرأها من `process.env` مثل `process.env.DATABASE_URL`

**س: هل يمكنني تعديل قاعدة البيانات مباشرة؟**  
ج: لا، أنشئ migration أو استخدم backend

**س: كيف أتصحح الأخطاء (debug)؟**  
ج: استخدم `npm run dev` مع console.log أو debugger

---

## 🎯 الخطوات التالية

بعد قراءة هذا:

1. [ ] اقرأ `PROJECT_ORGANIZATION.md`
2. [ ] شغّل `npm run dev` واختبر endpoint واحد
3. [ ] اكتب اختبار صغير (نسخ موجود وعدّله)
4. [ ] اطلب من مطور أول مراجعة كودك
5. [ ] ادرس الأشياء التي لم تفهمها بعد

---

## 🆘 هل تحتاج مساعدة؟

```bash
# تحقق من الأخطاء الشائعة:
npm run check:routes-load

# شغّل الاختبارات:
npm run test:sprint

# اقرأ الـ logs:
tail -f logs/app.log

# اطلب من الفريق:
# في Slack أو في اجتماع الفريق
```

---

**ملاحظة أخيرة:**  
الكود الذي تكتبه اليوم سيستخدمه المرضى غداً. اكتب بشكل آمن وواضح! 🚀

**آخر تحديث:** يونيو 13، 2026  
**المسؤول:** فريق التطوير
