# 🔧 استكشاف أخطاء الاختبارات وإصلاحها

**تاريخ الإنشاء:** مارس 1، 2026
**النسخة:** 1.0.0

---

## 📋 قائمة استكشاف الأخطاء السريعة

### مشكلة شائعة: الاختبار يفشل بشكل عشوائي

**الأعراض:**
- الاختبار يفشل أحياناً ولا يفشل أحياناً أخرى
- النتائج غير متسقة

**الأسباب المحتملة:**
1. ترتيب الاختبارات غير متسق
2. حالات مشتركة بين الاختبارات
3. اعتماديات خارجية غير متوقعة

**الحل:**
```javascript
// ✅ تأكد من استخدام beforeEach/afterEach
beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  setupFreshData();
});

afterEach(() => {
  cleanupData();
  jest.restoreAllMocks();
});

// ✅ تجنب الحالات المشتركة
// ❌ خطأ
let sharedData = null;
it('test 1', () => { sharedData = { id: 1 }; });
it('test 2', () => { expect(sharedData.id).toBe(1); }); // يعتمد على test 1

// ✅ صحيح
it('test 1', () => { const data = { id: 1 }; expect(data.id).toBe(1); });
it('test 2', () => { const data = { id: 2 }; expect(data.id).toBe(2); });
```

---

### مشكلة: الاختبار بطيء جداً

**الأعراض:**
- اختبار واحد يستغرق أكثر من 30 ثانية
- جميع الاختبارات بطيئة

**الأسباب:**
1. استخدام setTimeout/delay في الاختبارات
2. استدعاءات قاعدة بيانات حقيقية
3. اختبارات ثقيلة جداً

**الحل:**
```javascript
// ❌ بطيء
it('should retry after 5 seconds', async () => {
  const promise = retryAfter5Seconds();
  await new Promise(r => setTimeout(r, 5000));
  expect(result).toBe('success');
});

// ✅ سريع
it('should retry after 5 seconds', async () => {
  jest.useFakeTimers();

  const promise = retryAfter5Seconds();
  jest.advanceTimersByTime(5000);

  expect(result).toBe('success');

  jest.useRealTimers();
});

// ✅ استخدم قاعدة بيانات في الذاكرة بدلاً من الحقيقية
// في jest.setup.js أو قبل الاختبار
jest.mock('../database', () => ({
  connect: jest.fn().mockResolvedValue(true),
  save: jest.fn().mockResolvedValue({ id: '123' }),
}));
```

---

### مشكلة: "Cannot find module"

**الأعراض:**
```
Error: Cannot find module '../utils/helpers'
```

**الأسباب:**
1. مسار خاطئ
2. ملف غير موجود
3. مشكلة في الـ path resolution

**الحل:**
```javascript
// ✅ استخدم مسارات مطلقة أو alias
// في jest.config.js
moduleNameMapper: {
  '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  '^@services/(.*)$': '<rootDir>/src/services/$1',
}

// استخدام في الاختبار
const helpers = require('@utils/helpers');

// ✅ تأكد من وجود الملف
// استخدم معرف المسار قبل require
const path = require('path');
const modulePath = path.resolve(__dirname, '../utils/helpers');
// تحقق من وجود الملف
console.log(require('fs').existsSync(modulePath));
```

---

### مشكلة: "timeout exceeded"

**الأعراض:**
```
JestRuntime: Timeout - Async callback was not invoked within the 5000 ms timeout specified by jest.setTimeout.
```

**الأسباب:**
1. async operation لا تنتهي
2. promise لم يتم حلها
3. timeout قصير جداً

**الحل:**
```javascript
// ✅ تأكد من وجود await أو return
it('should complete async operation', async () => {
  // ❌ خطأ - بدون await
  asyncOperation();

  // ✅ صحيح
  await asyncOperation();
});

// ✅ زيادة timeout إذا لزم الأمر
it('should complete slow operation', async () => {
  jest.setTimeout(30000); // 30 ثانية
  await slowOperation();
}, 35000); // أو هنا

// ✅ تأكد من حل Promise
it('should handle promise', () => {
  return fetchData() // أو await fetchData()
    .then(data => {
      expect(data).toBeDefined();
    });
});
```

---

### مشكلة: Mocks لا تعمل كما متوقع

**الأعراض:**
```
Expected mock function to have been called
Mock function was not called with expected arguments
```

**الأسباب:**
1. الـ mock لم يتم إعداده بشكل صحيح
2. ترتيب الاستدعاءات خاطئ
3. Mocks لم تُنظف بشكل صحيح

**الحل:**
```javascript
// ✅ إعداد الـ mock بشكل صحيح
const mockFn = jest.fn();
mockFn.mockResolvedValue({ id: '123' }); // للـ async
mockFn.mockReturnValue('direct-value');   // للـ sync
mockFn.mockImplementation((a, b) => a + b);

// ✅ التحقق من الاستدعاء
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('expected', 'args');
expect(mockFn).toHaveBeenCalledTimes(1);

// ✅ تنظيف الـ mocks
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ✅ التحقق من الترتيب
const mockA = jest.fn();
const mockB = jest.fn();

function operation() {
  mockA();
  mockB();
}

operation();

expect(mockA).toHaveBeenCalled();
expect(mockB).toHaveBeenCalled();
expect(mockA.mock.invocationCallOrder[0])
  .toBeLessThan(mockB.mock.invocationCallOrder[0]);
```

---

### مشكلة: خطأ في التحقق من الـ Assertions

**الأعراض:**
```
Expected: true
Received: false
```

**الأسباب:**
1. التحقق من قيمة خاطئة
2. عدم فهم الـ assertion

**الحل:**
```javascript
// ✅ assertions مفيدة
expect(value).toBeDefined();           // موجود
expect(value).toBeNull();              // null
expect(value).toBeTruthy();            // true أو قريب
expect(value).toBe(5);                 // تطابق دقيق (===)
expect(value).toEqual({id: 1});        // تطابق عميق
expect(array).toContain('item');       // يحتوي على
expect(fn).toThrow();                  // يرمي error
expect(promise).rejects.toThrow();     // promise يرفع error

// ❌ assertions ضعيفة
expect(true).toBe(true);               // لا معنى
expect(value).toBeDefined();           // غير محدد

// ✅ أفضل ممارسة
it('should return user object', () => {
  const result = getUser();

  expect(result).toBeDefined();
  expect(result).toHaveProperty('id');
  expect(result).toHaveProperty('name');
  expect(result.role).toBe('user');
});
```

---

### مشكلة: اختبار لا ينجح مع قاعدة البيانات

**الأعراض:**
- اختبار يفشل عند الاتصال بـ DB
- Connection refused

**الأسباب:**
1. قاعدة البيانات غير مشغلة
2. بيانات اختبار قديمة
3. مشكلة في الاتصال

**الحل:**
```javascript
// ✅ استخدم قاعدة بيانات في الذاكرة أو مزيفة
jest.mock('../database', () => ({
  connect: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn().mockResolvedValue(true),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue({ id: '1' }),
}));

// ✅ أو استخدم قاعدة اختبار منفصلة
beforeAll(async () => {
  await connectToTestDB();
});

afterAll(async () => {
  await disconnectFromTestDB();
});

// ✅ نظف البيانات بين الاختبارات
beforeEach(async () => {
  await clearTestData();
});

// ✅ تحقق من الاتصال أولاً
describe('Database', () => {
  it('should be able to connect', async () => {
    const connection = await db.connect();
    expect(connection).toBeTruthy();
  });
});
```

---

### مشكلة: التقارير غير واضحة

**الأعراض:**
- رسائل خطأ غير مفهومة
- لا تعرف أين يفشل الاختبار

**الحل:**
```javascript
// ✅ أضف رسائل واضحة
it('should validate email format', () => {
  const email = 'invalid-email';

  // ❌ غير واضح
  expect(validate(email)).toBe(false);

  // ✅ واضح
  expect(validate(email)).toBe(
    false,
    'Email "invalid-email" should be rejected'
  );

  // ✅ شرح مفصل
  try {
    const result = validate(email);
    expect(result).toBe(false);
  } catch (error) {
    console.error('Validation failed for email:', email);
    console.error('Error:', error.message);
    throw error;
  }
});

// ✅ استخدم descriptive assertion messages
expect(user.email).toMatch(
  /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/,
  'User email should be valid format'
);
```

---

## 📊 أدوات التشخيص

### الأمر 1: تشغيل اختبار واحد فقط

```bash
# اختبار ملف محدد
npm test -- MyModule.test.js

# اختبار مع نمط معين
npm test -- --testNamePattern="should validate"

# وضع watch للتطوير السريع
npm test -- --watch MyModule.test.js
```

### الأمر 2: الحصول على معلومات تفصيلية

```bash
# معلومات مفصلة
npm test -- --verbose

# عرض مكان الأخطاء بالضبط
npm test -- --detectOpenHandles

# معلومات عن الحالات المتوازية
npm test -- --runInBand

# عرض المقدار المستخدم من الذاكرة
npm test -- --logHeapUsage
```

### الأمر 3: Debug

```javascript
// في الاختبار
describe('MyTest', () => {
  it('debug test', () => {
    const value = complexCalculation();

    // اطبع القيمة للتحقق
    console.log('Debug value:', value);

    // أو استخدم debugger
    debugger; // سيتوقف هنا عند التشغيل مع --inspect

    expect(value).toBe('expected');
  });
});

// في الطرفية
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

---

## 🎯 قائمة فحص سريعة

عندما لا يعمل الاختبار:

- [ ] هل الملف موجود?
- [ ] هل اسم الدالة صحيح?
- [ ] هل beforeEach و afterEach يعملان?
- [ ] هل الـ mocks معدة بشكل صحيح?
- [ ] هل الـ assertions صحيحة؟
- [ ] هل هناك مشكلة في التوقيت (async)?
- [ ] هل هناك errors في الـ console?
- [ ] هل الاختبار يفشل دائماً أم عشوائياً?

---

## 📞 طلب مساعدة

إذا لم تتمكن من حل المشكلة:

1. تحقق من الـ console output
2. أضف `console.log()` في الاختبار
3. استخدم `--verbose` flag
4. ابحث عن مشاكل مشابهة
5. اطلب من الفريق التقني

---

**آخر تحديث:** 1 مارس، 2026
