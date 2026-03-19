# 🎯 أفضل الممارسات في الاختبارات

**تاريخ الإنشاء:** مارس 1، 2026
**النسخة:** 1.0.0

---

## 📋 قائمة فحص الاختبارات الجيدة

### قبل كتابة الاختبار

- [ ] هل تفهم ما تختبره بالضبط?
- [ ] هل محددة حالات الاختبار برعاية?
- [ ] هل لديك بيانات اختبار جاهزة?
- [ ] هل تعرف النتيجة المتوقعة?

### أثناء كتابة الاختبار

- [ ] هل اسم الاختبار وصفي وواضح?
- [ ] هل يتبع AAA Pattern?
- [ ] هل يختبر حالة واحدة فقط?
- [ ] هل يستخدم المساعدات المتاحة?

### بعد كتابة الاختبار

- [ ] هل الاختبار يفشل عندما يفشل الكود?
- [ ] هل الاختبار ينجح عندما ينجح الكود?
- [ ] هل الاختبار سريع جداً?
- [ ] هل الاختبار قابل للقراءة?

---

## 🏗️ البنية المثالية للاختبار

### النموذج الموصى به

```javascript
describe('FeatureName', () => {
  // 1. Setup: متغيرات الإعداد
  let componentUnderTest;
  let mockDependency;

  // 2. beforeEach: إعداد قبل كل اختبار
  beforeEach(() => {
    jest.clearAllMocks();
    componentUnderTest = new Component();
    mockDependency = {
      method: jest.fn().mockReturnValue('mock-value'),
    };
  });

  // 3. afterEach: تنظيف بعد كل اختبار
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 4. Test suite: مجموعة الاختبارات
  describe('Functionality', () => {
    it('should behave correctly', () => {
      // Arrange: تحضير البيانات
      const input = 'test-input';

      // Act: تنفيذ الإجراء
      const result = componentUnderTest.process(input);

      // Assert: التحقق من النتيجة
      expect(result).toBe('expected-output');
    });
  });
});
```

---

## 📝 كتابة الأوصاف (Descriptions)

### ✅ أوصاف جيدة

```javascript
describe('UserAuthenticationService', () => {
  describe('login method', () => {
    it('should return access token for valid credentials', () => {});
    it('should throw error for invalid password', () => {});
    it('should lock account after 5 failed attempts', () => {});
  });
});
```

### ❌ أوصاف سيئة

```javascript
describe('User', () => {
  it('should work', () => {});
  it('test login', () => {});
  it('authentication', () => {});
});
```

---

## 🔍 أنواع الاختبارات

### 1. اختبارات Unit (الوحدة)

**الهدف:** اختبار وحدة منفردة من الكود

```javascript
// خطأ
describe('Module', () => {
  it('should work with DB and API', () => {
    // يختبر أكثر من وحدة واحدة
  });
});

// صحيح
describe('UserValidator', () => {
  it('should reject invalid email', () => {
    expect(validate('invalid')).toBe(false);
  });
});
```

### 2. اختبارات Integration (التكامل)

**الهدف:** اختبار تفاعل عدة وحدات مع بعضها

```javascript
describe('User API Integration', () => {
  it('should create and retrieve user', async () => {
    // 1. Create
    const created = await api.createUser(userData);

    // 2. Retrieve
    const retrieved = await api.getUser(created.id);

    // 3. Assert
    expect(retrieved).toEqual(created);
  });
});
```

### 3. اختبارات E2E (الطرف إلى الطرف)

**الهدف:** اختبار سير عمل كامل من الطرف للطرف

```javascript
describe('Complete User Registration Flow', () => {
  it('should register, verify email, and login', async () => {
    // 1. Navigate to register page
    // 2. Fill form and submit
    // 3. Check confirmation email
    // 4. Click verification link
    // 5. Login with credentials
    // 6. Verify dashboard loads
  });
});
```

---

## 🎭 استخدام Mocks والـ Stubs

### متى تستخدم Mock?

```javascript
// ✅ استخدم Mock عندما تريد:
// - عزل الكود عن المتعلقات الخارجية
// - اختبار سلوك معين
// - تجنب استدعاءات API الحقيقية

describe('PaymentService', () => {
  it('should process payment with mocked API', () => {
    const mockAPI = {
      charge: jest.fn().mockResolvedValue({ success: true }),
    };

    const service = new PaymentService(mockAPI);
    const result = service.pay(100);

    expect(mockAPI.charge).toHaveBeenCalledWith(100);
  });
});
```

### متى تستخدم بيانات حقيقية?

```javascript
// ✅ استخدم بيانات حقيقية في:
// - اختبارات Integration
// - قاعدة بيانات اختبار مشابهة للحقيقية
// - سكريبتات E2E

describe('Database Integration', () => {
  beforeAll(async () => {
    await connectToTestDB();
  });

  it('should save and retrieve user', async () => {
    const user = await User.create({ name: 'John' });
    const retrieved = await User.findById(user._id);

    expect(retrieved.name).toBe('John');
  });
});
```

---

## 🚀 تحسين الأداء

### مشاكل شائعة وحلولها

#### المشكلة 1: اختبارات بطيئة

```javascript
// ❌ بطيء (انتظار حقيقي)
it('should retry after delay', async () => {
  await setTimeout(() => {}, 1000);
  expect(result).toBe(true);
});

// ✅ سريع (استخدام fake timers)
it('should retry after delay', async () => {
  jest.useFakeTimers();

  const promise = functionThatDelays();
  jest.runAllTimers();

  expect(result).toBe(true);

  jest.restoreAllMocks();
});
```

#### المشكلة 2: اختبارات متعلقة ببعضها

```javascript
// ❌ خطأ (اختبارات متعلقة)
describe('User', () => {
  let userId;

  it('should create user', () => {
    userId = createUser();
  });

  it('should find user', () => {
    // يعتمد على الاختبار السابق
    expect(findUser(userId)).toBeDefined();
  });
});

// ✅ صحيح (اختبارات مستقلة)
describe('User', () => {
  it('should create user', () => {
    const userId = createUser();
    expect(userId).toBeDefined();
  });

  it('should find user', () => {
    const userId = createUser();
    expect(findUser(userId)).toBeDefined();
  });
});
```

---

## 🛡️ اختبار الأمان

### اختبارات الأمان يجب أن تغطي

```javascript
describe('Security', () => {
  // 1. معالجة رموز الوصول (Tokens)
  it('should reject expired token', () => {
    const expiredToken = generateExpiredToken();
    expect(() => validateToken(expiredToken)).toThrow();
  });

  // 2. تشفير البيانات
  it('should encrypt sensitive data', () => {
    const encrypted = encrypt('password');
    expect(encrypted).not.toBe('password');
  });

  // 3. التحقق من الصلاحيات
  it('should block unauthorized access', () => {
    const response = api.getAdmin({ role: 'user' });
    expect(response.status).toBe(403);
  });

  // 4. حقن SQL والمدخلات الضارة
  it('should sanitize user input', () => {
    const result = sanitize("' OR 1=1 --");
    expect(result).not.toContain("'");
  });

  // 5. تحديد المعدل (Rate Limiting)
  it('should limit repeated requests', async () => {
    for (let i = 0; i < 101; i++) {
      api.request();
    }
    expect(lastResponse.status).toBe(429);
  });
});
```

---

## 📊 قياس التغطية

### الأهداف المثالية

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 70,      // 70% من فروع الكود
    functions: 75,     // 75% من الدوال
    lines: 80,         // 80% من الأسطر
    statements: 80,    // 80% من الجمل
  },
  // معايير أعلى للملفات الحرجة
  './backend/services/': {
    branches: 90,
    functions: 95,
    lines: 95,
    statements: 95,
  }
}
```

### كيفية قياس التغطية

```bash
# تشغيل مع التغطية
npm test -- --coverage

# عرض التقرير HTML
open coverage/lcov-report/index.html  # Mac
xdg-open coverage/lcov-report/index.html  # Linux
start coverage/lcov-report/index.html  # Windows
```

---

## 🔧 نصائح عملية

### 1. استخدام Data Builders

```javascript
// ❌ سيء (تكرار كثير)
it('should process user', () => {
  const user = {
    name: 'John',
    email: 'john@example.com',
    age: 30,
    role: 'user',
    status: 'active'
  };
});

// ✅ جيد (استخدام Builder)
const createUser = (overrides = {}) => ({
  name: 'John',
  email: 'john@example.com',
  age: 30,
  role: 'user',
  status: 'active',
  ...overrides,
});

it('should process admin', () => {
  const admin = createUser({ role: 'admin' });
});
```

### 2. استخدام Fixtures

```javascript
// fixtures/users.json
{
  "user": {
    "id": "user-1",
    "name": "Test User"
  }
}

// استخدام الـ fixture
const userData = require('./fixtures/users.json');

it('should process user', () => {
  expect(userData.user.name).toBe('Test User');
});
```

### 3. استخدام Parameterized Tests

```javascript
// ✅ اختبر عدة حالات دفعة واحدة
describe.each([
  ['valid@email.com', true],
  ['invalid-email', false],
  ['', false],
])('Email validation', (email, expected) => {
  it(`should ${expected ? 'accept' : 'reject'} ${email}`, () => {
    expect(validateEmail(email)).toBe(expected);
  });
});
```

---

## 📖 مثال كامل

```javascript
// UserService.test.js
const { UserService } = require('../services/UserService');
const { AuthHelper, DataGenerator, AssertionHelper } = require('../test-utils');

describe('UserService', () => {
  let userService;
  let mockDatabase;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDatabase = {
      save: jest.fn().mockResolvedValue({ id: '123' }),
      findById: jest.fn().mockResolvedValue({}),
    };

    userService = new UserService(mockDatabase);
  });

  describe('create', () => {
    it('should create user with valid data', async () => {
      // Arrange
      const userData = DataGenerator.generateUser();

      // Act
      const result = await userService.create(userData);

      // Assert
      expect(mockDatabase.save).toHaveBeenCalledWith(userData);
      expect(result.id).toBe('123');
    });

    it('should reject invalid email', async () => {
      // Arrange
      const invalidUser = DataGenerator.generateUser({
        email: 'invalid-email'
      });

      // Act & Assert
      await expect(userService.create(invalidUser))
        .rejects
        .toThrow('Invalid email');
    });
  });

  describe('findById', () => {
    it('should return user by ID', async () => {
      // Arrange
      const userId = '123';
      mockDatabase.findById.mockResolvedValue({
        id: userId,
        name: 'John'
      });

      // Act
      const result = await userService.findById(userId);

      // Assert
      expect(result.id).toBe(userId);
      expect(mockDatabase.findById).toHaveBeenCalledWith(userId);
    });
  });
});
```

---

## 🎓 الخلاصة

الاختبارات الجيدة:
1. ✅ واضحة ومنظمة
2. ✅ مستقلة عن بعضها
3. ✅ سريعة في التنفيذ
4. ✅ سهلة الصيانة والتحديث
5. ✅ قابلة للقراءة والفهم

اتبع هذه الممارسات لكود أفضل وأكثر أماناً وموثوقية!

---

**آخر تحديث:** 1 مارس، 2026
