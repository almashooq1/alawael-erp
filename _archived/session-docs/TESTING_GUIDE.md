# 📚 دليل الاختبارات الشامل

**تاريخ الإنشاء:** مارس 1، 2026
**النسخة:** 1.0.0

---

## 📖 المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [البدء السريع](#البدء-السريع)
3. [بنية الاختبارات](#بنية-الاختبارات)
4. [كتابة الاختبارات](#كتابة-الاختبارات)
5. [تشغيل الاختبارات](#تشغيل-الاختبارات)
6. [أفضل الممارسات](#أفضل-الممارسات)
7. [استكشاف الأخطاء](#استكشاف-الأخطاء)

---

## نظرة عامة

### ماذا يغطي هذا الدليل؟

هذا الدليل يشرح:
- ✅ كيفية كتابة اختبارات فعّالة
- ✅ تنظيم الاختبارات بشكل موحد
- ✅ استخدام النماذج والأدوات المتاحة
- ✅ تشغيل وفحص الاختبارات
- ✅ قياس التغطية والأداء

### الأدوات المستخدمة

- **Jest**: إطار عمل الاختبارات الأساسي
- **Supertest**: اختبار HTTP/REST APIs
- **Node.js**: بيئة التشغيل

---

## البدء السريع

### 1. تثبيت الاعتماديات

```bash
npm install --save-dev jest supertest @babel/preset-env
```

### 2. تكوين Jest

انسخ `jest.config.improved.js` إلى `jest.config.js`:

```bash
cp jest.config.improved.js jest.config.js
cp jest.setup.improved.js jest.setup.js
```

### 3. إضافة أوامر npm

أضف في `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern='(__tests__|test)' --testPathIgnorePatterns='(integration|e2e|security)'",
    "test:integration": "jest --testPathPattern='integration'",
    "test:e2e": "jest --testPathPattern='e2e'",
    "test:security": "jest --testPathPattern='security'",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e && npm run test:security"
  }
}
```

### 4. تشغيل أول اختبار

```bash
npm test
```

---

## بنية الاختبارات

### المجلد الموصى به

```
project/
├── backend/
│   ├── __tests__/              # اختبارات Unit
│   │   ├── unit/
│   │   ├── integration/
│   │   ├── e2e/
│   │   └── security/
│   ├── tests/
│   └── src/
├── test-templates/             # نماذج الاختبارات
│   ├── unit.template.js
│   ├── integration.template.js
│   └── e2e.template.js
├── test-utils/                 # أدوات ومساعدات
│   └── test-helpers.js
└── scripts/                    # سكريبتات الاختبارات
    ├── run-all-tests.js
    └── test-coverage.js
```

### تسمية الملفات

```javascript
// Unit test
MyModule.test.js
MyModule.spec.js

// Integration test
MyIntegration.integration.test.js
MyAPI.integration.spec.js

// E2E test
UserWorkflow.e2e.test.js
CompleteFlow.e2e.spec.js

// Security test
SecurityHeaders.security.test.js
```

---

## كتابة الاختبارات

### 1. اختبار Unit (الوحدة)

استخدم المحتوى التالي كنموذج:

```javascript
describe('YourModule', () => {
  let module;

  beforeEach(() => {
    jest.clearAllMocks();
    module = require('../YourModule');
  });

  describe('functionality', () => {
    it('should do something', () => {
      const result = module.someMethod();
      expect(result).toBeDefined();
    });
  });
});
```

### 2. اختبار Integration (التكامل)

```javascript
const request = require('supertest');
const app = require('../app');

describe('API: /users', () => {
  it('should create a user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John' })
      .expect(201);

    expect(response.body.success).toBe(true);
  });
});
```

### 3. اختبار E2E (الطرف إلى الطرف)

```javascript
describe('User Workflow', () => {
  it('should complete full workflow', async () => {
    // 1. Register
    const register = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password' });

    const token = register.body.data.token;

    // 2. Login
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    // 3. Use protected resource
    const profile = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(profile.status).toBe(200);
  });
});
```

---

## استخدام المساعدات والأدوات

### DataGenerator - توليد البيانات

```javascript
const { DataGenerator } = require('../test-utils/test-helpers');

describe('User Tests', () => {
  it('should create user', () => {
    const user = DataGenerator.generateUser({
      email: 'custom@example.com'
    });

    // استخدم user في الاختبار
  });
});
```

### AuthHelper - توليد التوكن

```javascript
const { AuthHelper } = require('../test-utils/test-helpers');

describe('Protected API', () => {
  it('should access with token', async () => {
    const token = AuthHelper.generateToken('user-id');

    const headers = AuthHelper.createAuthHeader(token);

    const response = await request(app)
      .get('/api/protected')
      .set(headers);
  });
});
```

### AssertionHelper - التحقق المخصص

```javascript
const { AssertionHelper } = require('../test-utils/test-helpers');

describe('Assertions', () => {
  it('should validate response', () => {
    const response = { body: { success: true, data: {} } };

    const data = AssertionHelper.assertSuccessResponse(response);

    expect(data).toBeDefined();
  });
});
```

---

## تشغيل الاختبارات

### تشغيل جميع الاختبارات

```bash
npm test
```

### تشغيل نوع معين

```bash
# اختبارات Unit فقط
npm run test:unit

# اختبارات Integration فقط
npm run test:integration

# اختبارات E2E فقط
npm run test:e2e
```

### مراقبة مستمرة (Watch Mode)

```bash
npm run test:watch
```

### قياس التغطية

```bash
npm run test:coverage
```

### تشغيل اختبار محدد

```bash
npm test -- MyModule.test.js
npm test -- --testNamePattern="should do something"
```

---

## أفضل الممارسات

### ✅ يجب عليك

1. **اكتب اختبارات وصفية واضحة**
   ```javascript
   ✅ it('should create user with valid email', () => {})
   ❌ it('should work', () => {})
   ```

2. **استخدم AAA Pattern** (Arrange, Act, Assert)
   ```javascript
   it('should calculate total', () => {
     // Arrange
     const items = [{ price: 10 }, { price: 20 }];

     // Act
     const total = calculateTotal(items);

     // Assert
     expect(total).toBe(30);
   });
   ```

3. **اختبر حالة واحدة فقط في الاختبار الواحد**
   ```javascript
   ✅ One assertion per test
   ❌ Multiple unrelated assertions
   ```

4. **استخدم beforeEach/afterEach للإعداد والتنظيف**
   ```javascript
   beforeEach(() => setupData());
   afterEach(() => cleanupData());
   ```

5. **اختبر الحالات الاستثنائية والخاطئة**
   ```javascript
   it('should reject invalid input', () => {
     expect(() => validate(null)).toThrow();
   });
   ```

### ❌ تجنب

1. **الاختبارات المترابطة**
   ```javascript
   ❌ يعتمد الاختبار الثاني على نتائج الأول
   ✅ كل اختبار مستقل تماماً
   ```

2. **استخدام sleep/delay في الاختبارات**
   ```javascript
   ❌ await new Promise(r => setTimeout(r, 1000));
   ✅ استخدم jest.useFakeTimers() أو library مناسبة
   ```

3. **الاختبارات البطيئة جداً**
   ```javascript
   ❌ اختبار يتطلب دقيقة
   ✅ اختبار يكتمل في أقل من ثانية
   ```

4. **غياب الـ assertions**
   ```javascript
   ❌ it('should do something', () => { functionCall(); });
   ✅ it('should do something', () => { expect(result).toBe(true); });
   ```

---

## استكشاف الأخطاء

### المشكلة: الاختبار يفشل بشكل عشوائي

**الحل:**
- تحقق من الاعتماديات والترتيب
- استخدم `beforeEach` لإعادة تعيين الحالات
- تجنب `setTimeout` و`async` المعقدة

### المشكلة: الاختبارات بطيئة جداً

**الحل:**
- قسّم الاختبارات إلى ملفات منفصلة
- استخدم `maxWorkers` في Jest config
- قلل حجم بيانات الاختبار

### المشكلة: الـ Mock لا يعمل بشكل صحيح

**الحل:**
```javascript
jest.clearAllMocks();          // قبل كل اختبار
jest.restoreAllMocks();        // بعد كل اختبار
jest.resetModules();           // إعادة تعيين كامل
```

### المشكلة: خطأ "Cannot find module"

**الحل:**
- تحقق من مسارات الـ require
- استخدم `moduleNameMapper` في Jest config
- تأكد من وجود الملف

---

## الموارد الإضافية

### ملفات مهمة

- [jest.config.improved.js](../jest.config.improved.js) - إعدادات Jest
- [jest.setup.improved.js](../jest.setup.improved.js) - إعداد عام
- [test-templates/](../test-templates/) - نماذج الاختبارات
- [test-utils/test-helpers.js](../test-utils/test-helpers.js) - الأدوات المساعدة

### روابط خارجية

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)

---

## أسئلة شائعة

### س: كيف أختبر دالة متزامنة (async)?

```javascript
it('should handle async', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

### س: كيف أختبر مع قاعدة بيانات فعلية?

```javascript
beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await cleanupTestDB();
});
```

### س: كيف أختبر المتغيرات الخاصة (Private)?

```javascript
// اختبر من خلال الواجهة العامة
const module = require('./module');
const result = module.publicMethod(privateData);
```

### س: كيف أقيس تغطية الاختبار?

```bash
npm run test:coverage
# ستجد التقرير في coverage/lcov-report/index.html
```

---

## الدعم والمساعدة

إذا واجهت مشاكل:

1. تحقق من [TEST_TROUBLESHOOTING.md](./TEST_TROUBLESHOOTING.md)
2. راجع [TEST_BEST_PRACTICES.md](./TEST_BEST_PRACTICES.md)
3. ابحث في ملفات الاختبارات الموجودة
4. اطلب المساعدة من الفريق

---

**آخر تحديث:** 1 مارس، 2026
