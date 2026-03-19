# 🛠️ دليل تحسين الاختبارات - نسخة عملية قابلة للتطبيق

**إصدار:** v1.0
**آخر تحديث:** 28 فبراير 2026

---

## 📌 جدول المحتويات

1. [Quick Wins (تحسينات سريعة)](#quick-wins)
2. [أفضل الممارسات المجربة](#best-practices)
3. [أمثلة قابلة للنسخ واللصق](#copy-paste-examples)
4. [أداوات التشخيص](#diagnostic-tools)

---

## 🎯 Quick Wins

هذه التحسينات يمكن تنفيذها في ساعات وستعطي نتائج فورية:

### ✅ Quick Win #1: إصلاح Assertions الضعيفة

**الوقت المطلوب:** 30 دقيقة لمشروع واحد

#### قبل:
```javascript
// ❌ سيء - يقبل أي حالة
expect([200, 201, 400, 401, 403, 404]).toContain(res.status);
expect(res.body.success).toBe(true);
```

#### بعد:
```javascript
// ✅ جيد - محدد جداً
expect(res.status).toBe(201);
expect(res.body).toHaveProperty('success', true);
expect(res.body.data).toHaveProperty('accessToken');
expect(typeof res.body.data.accessToken).toBe('string');
expect(res.body.data.accessToken.length).toBeGreaterThan(10);
```

**الفائدة:**
- تحديد دقيق للأخطاء
- اكتشاف مشاكل أسرع
- رسائل خطأ واضحة

---

### ✅ Quick Win #2: إضافة Error Cases

**الوقت المطلوب:** 1 ساعة

لكل اختبار ناجح، أضف اختبار فشل:

```javascript
describe('POST /api/auth/register', () => {
  // ✅ الحالة الناجحة
  it('should register successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@test.com', password: 'SecurePass123!' })
      .expect(201);
    
    expect(res.body.data.user.email).toBe('new@test.com');
  });

  // ❌ أضف هذه الاختبارات:
  it('should reject invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid', password: 'SecurePass123!' })
      .expect(400);
    
    expect(res.body.errors).toBeDefined();
  });

  it('should reject weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: '123' })
      .expect(400);
    
    expect(res.body.errors).toBeDefined();
  });

  it('should reject duplicate email', async () => {
    // سجل المستخدم الأول
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'duplicate@test.com', password: 'SecurePass123!' });
    
    // جرب المستخدم الثاني بنفس البريد
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'duplicate@test.com', password: 'SecurePass123!' })
      .expect(409);
    
    expect(res.body.message).toMatch(/already exists/i);
  });
});
```

---

### ✅ Quick Win #3: تنظيف قاعدة البيانات

**الوقت المطلوب:** 15 دقيقة

```javascript
// ❌ قديم
describe('Auth Tests', () => {
  beforeAll(() => {
    db.write({ users: [] });
  });

  // مشكلة: البيانات تتراكم بين الاختبارات
});

// ✅ صحيح
describe('Auth Tests', () => {
  beforeEach(async () => {
    await User.deleteMany({}); // نظف قبل كل اختبار
  });

  afterEach(async () => {
    jest.clearAllMocks(); // امسح جميع الـ mocks
  });

  afterAll(async () => {
    await db.close(); // أغلق الاتصال في النهاية
  });
});
```

**لماذا هذا مهم؟**
- يمنع تأثير الاختبارات ببعضها
- يمنع الاختبارات الفاشلة (Flaky Tests)
- يجعل الاختبارات موثوقة

---

### ✅ Quick Win #4: إنشاء Test Factory Functions

**الوقت المطلوب:** 2 ساعة

```javascript
// ✅ __tests__/factories/user.factory.js
const User = require('../../models/User');

class UserFactory {
  static async create(overrides = {}) {
    const defaults = {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'SecurePass123!',
      role: 'user',
      ...overrides,
    };

    return await User.create(defaults);
  }

  static async createAdmin(overrides = {}) {
    return this.create({ role: 'admin', ...overrides });
  }

  static async createMultiple(count, overrides = {}) {
    return Promise.all(
      Array(count)
        .fill(null)
        .map((_, i) =>
          this.create({
            email: `user${i}@example.com`,
            ...overrides,
          })
        )
    );
  }
}

module.exports = UserFactory;
```

**الاستخدام:**
```javascript
describe('User Tests', () => {
  it('should get user profile', async () => {
    // بدلاً من إنشاء بيانات يدوياً
    const user = await UserFactory.create({
      email: 'john@example.com',
    });

    const res = await request(app)
      .get(`/api/users/${user._id}`)
      .expect(200);

    expect(res.body.user.email).toBe('john@example.com');
  });
});
```

**الفائدة:**
- اختبارات أنظف
- إعادة استخدام البيانات
- سهولة في الصيانة

---

## 🏆 أفضل الممارسات

### 1️⃣ إنشاء Test Structure الواضحة

```
__tests__/
├── fixtures/          # بيانات ثابتة
│   └── mockData.js
├── factories/         # مصانع البيانات
│   ├── user.factory.js
│   └── transaction.factory.js
├── helpers/           # دوال مساعدة
│   ├── testSetup.js
│   ├── assertions.js
│   └── mocking.js
├── unit/              # اختبارات وحدية
│   ├── auth.test.js
│   └── finance.test.js
├── integration/       # اختبارات تكامل
│   ├── auth-flow.test.js
│   └── payment-flow.test.js
└── e2e/               # اختبارات شاملة
    └── user-journey.test.js
```

---

### 2️⃣ استخدام Describe Blocks بشكل فعال

```javascript
// ✅ منظم جيداً
describe('User Authentication', () => {
  describe('POST /api/auth/register', () => {
    describe('Valid Input', () => {
      it('should register with valid email...', () => {});
      it('should hash password...', () => {});
    });

    describe('Invalid Input', () => {
      it('should reject invalid email...', () => {});
      it('should reject weak password...', () => {});
    });

    describe('Edge Cases', () => {
      it('should handle duplicate email...', () => {});
      it('should handle database errors...', () => {});
    });
  });

  describe('POST /api/auth/login', () => {
    // ...
  });
});
```

**الفائدة:**
- سهل الملاحة
- واضح البنية
- سهل البحث عن الاختبارات

---

### 3️⃣ استخدام Custom Matchers

```javascript
// ✅ __tests__/helpers/matchers.js
expect.extend({
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`,
    };
  },

  toBeValidPassword(received) {
    const hasNumbers = /\d/.test(received);
    const hasUpperCase = /[A-Z]/.test(received);
    const hasLowerCase = /[a-z]/.test(received);
    const isLongEnough = received.length >= 8;

    const pass = hasNumbers && hasUpperCase && hasLowerCase && isLongEnough;

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid password`
          : `expected ${received} to be a valid password (need uppercase, lowercase, number, 8+ chars)`,
    };
  },

  toHaveStatus(response, expectedStatus) {
    const pass = response.status === expectedStatus;

    return {
      pass,
      message: () =>
        pass
          ? `expected status not to be ${expectedStatus}`
          : `expected status to be ${expectedStatus} but got ${response.status}`,
    };
  },
});

module.exports = {};
```

**الاستخدام:**
```javascript
it('should validate email', () => {
  expect('test@example.com').toBeValidEmail();
  expect('invalid').not.toBeValidEmail();

  expect('SecurePass123').toBeValidPassword();
  expect('weak').not.toBeValidPassword();
});
```

---

### 4️⃣ تقليل Mocking - استخدم Real Data عندما يمكن

```javascript
// ❌ Over-mocking
jest.mock('../services/userService', () => ({
  getUser: jest.fn().mockResolvedValue({
    id: 'user123',
    name: 'Test',
  }),
}));

// ✅ اختبر الخدمة الفعلية مع مثيل قاعدة بيانات حقيقي
describe('UserService Integration', () => {
  let user;

  beforeEach(async () => {
    await User.deleteMany({});
    user = await User.create({
      name: 'Test User',
      email: 'test@test.com',
    });
  });

  it('should find user in database', async () => {
    const foundUser = await UserService.getUser(user._id);
    expect(foundUser.name).toBe('Test User');
  });
});
```

**متى تستخدم Mocking:**
- خدمات خارجية (APIs)
- قاعدة بيانات منفصلة
- عمليات معقدة جداً

**متى تستخدم Real Data:**
- وحداتك الخاصة
- قاعدة بيانات محلية (في الذاكرة)
- التدفقات الرئيسية

---

## 🔧 Copy-Paste Examples

### مثال 1: اختبار API كامل

```javascript
// ✅ __tests__/integration/payment.integration.test.js
const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');

describe('Payment Integration Flow', () => {
  let user, authToken;

  beforeEach(async () => {
    await User.deleteMany({});
    await Transaction.deleteMany({});

    user = await User.create({
      email: 'buyer@test.com',
      password: 'SecurePass123!',
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'buyer@test.com',
        password: 'SecurePass123!',
      });

    authToken = loginRes.body.data.accessToken;
  });

  describe('Complete Payment Workflow', () => {
    it('should complete payment from start to finish', async () => {
      // Step 1: Get payment options
      const optionsRes = await request(app)
        .get('/api/payments/options')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(optionsRes.body.data).toContain('credit_card');
      expect(optionsRes.body.data).toContain('paypal');

      // Step 2: Create payment intent
      const intentRes = await request(app)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 10000,
          currency: 'SAR',
        })
        .expect(201);

      const { paymentIntentId } = intentRes.body.data;
      expect(paymentIntentId).toBeDefined();

      // Step 3: Process payment
      const payRes = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentIntentId,
          method: 'credit_card',
          cardToken: 'tok_visa',
        })
        .expect(200);

      expect(payRes.body.data.status).toBe('succeeded');

      // Step 4: Verify transaction in database
      const transaction = await Transaction.findOne({
        userId: user._id,
        paymentIntentId,
      });

      expect(transaction).toBeDefined();
      expect(transaction.status).toBe('completed');
      expect(transaction.amount).toBe(10000);
    });
  });

  describe('Payment Error Handling', () => {
    it('should reject payment with invalid amount', async () => {
      const res = await request(app)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: -100,
          currency: 'SAR',
        })
        .expect(400);

      expect(res.body.errors[0].field).toBe('amount');
    });

    it('should fail payment with invalid card', async () => {
      const intentRes = await request(app)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 1000, currency: 'SAR' });

      const res = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentIntentId: intentRes.body.data.paymentIntentId,
          method: 'credit_card',
          cardToken: 'tok_chargeDeclined',
        })
        .expect(402); // Payment Required

      expect(res.body.data.status).toBe('failed');
    });
  });
});
```

---

### مثال 2: اختبار مكون React

```javascript
// ✅ src/__tests__/components/UserProfile.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserProfile from '../../components/UserProfile';
import * as userService from '../../services/userService';

jest.mock('../../services/userService');

describe('UserProfile Component', () => {
  const mockUser = {
    id: 'user123',
    name: 'Ahmed Hassan',
    email: 'ahmed@test.com',
    phone: '+966501234567',
    avatar: 'https://example.com/avatar.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    userService.getUser.mockResolvedValue(mockUser);
  });

  it('should display user information correctly', async () => {
    render(<UserProfile userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('Ahmed Hassan')).toBeInTheDocument();
      expect(screen.getByText('ahmed@test.com')).toBeInTheDocument();
      expect(screen.getByText('+966501234567')).toBeInTheDocument();
    });

    const avatar = screen.getByAltText(/profile picture/i);
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('should handle edit mode', async () => {
    render(<UserProfile userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText('Ahmed Hassan')).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    const nameInput = screen.getByDisplayValue('Ahmed Hassan');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).not.toBeDisabled();
  });

  it('should save changes', async () => {
    userService.updateUser.mockResolvedValue({
      ...mockUser,
      name: 'Ahmed Hassan Updated',
    });

    render(<UserProfile userId="user123" />);

    const editButton = await screen.findByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    const nameInput = screen.getByDisplayValue('Ahmed Hassan');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Ahmed Hassan Updated');

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(userService.updateUser).toHaveBeenCalledWith('user123', {
        name: 'Ahmed Hassan Updated',
      });
    });
  });

  it('should show loading state', () => {
    userService.getUser.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<UserProfile userId="user123" />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should handle error gracefully', async () => {
    userService.getUser.mockRejectedValue(new Error('Failed to load user'));

    render(<UserProfile userId="user123" />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });
});
```

---

### مثال 3: اختبار خدمة معقدة

```javascript
// ✅ __tests__/unit/payrollService.test.js
const PayrollService = require('../../services/PayrollService');
const Employee = require('../../models/Employee');
const Payroll = require('../../models/Payroll');
const SalaryCalculator = require('../../utils/SalaryCalculator');

jest.mock('../../models/Employee');
jest.mock('../../models/Payroll');
jest.mock('../../utils/SalaryCalculator');

describe('PayrollService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateMonthlyPayroll', () => {
    it('should calculate payroll correctly for multiple employees', async () => {
      const employees = [
        { _id: 'emp1', name: 'Employee 1', baseSalary: 5000 },
        { _id: 'emp2', name: 'Employee 2', baseSalary: 6000 },
      ];

      Employee.find.mockResolvedValue(employees);
      SalaryCalculator.calculate.mockImplementation(employee => ({
        baseSalary: employee.baseSalary,
        bonuses: 500,
        deductions: 200,
        netSalary: employee.baseSalary + 500 - 200,
      }));

      const result = await PayrollService.calculateMonthlyPayroll(
        new Date(2024, 0, 1) // January 2024
      );

      expect(result).toHaveProperty('success', true);
      expect(result.payslips).toHaveLength(2);
      expect(result.payslips[0]).toMatchObject({
        employeeId: 'emp1',
        baseSalary: 5000,
        netSalary: 5300,
      });
      expect(result.total).toBe(11300);
    });

    it('should handle missing employee data', async () => {
      Employee.find.mockResolvedValue([]);

      const result = await PayrollService.calculateMonthlyPayroll(
        new Date(2024, 0, 1)
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/no employees/i);
    });

    it('should skip inactive employees', async () => {
      const employees = [
        { _id: 'emp1', name: 'Active', baseSalary: 5000, status: 'active' },
        {
          _id: 'emp2',
          name: 'Inactive',
          baseSalary: 6000,
          status: 'inactive',
        },
      ];

      Employee.find.mockResolvedValue(employees);
      SalaryCalculator.calculate.mockReturnValue({
        baseSalary: 5000,
        netSalary: 5000,
      });

      const result = await PayrollService.calculateMonthlyPayroll(
        new Date(2024, 0, 1)
      );

      expect(result.payslips).toHaveLength(1);
      expect(result.payslips[0].employeeId).toBe('emp1');
    });
  });

  describe('generatePayslips', () => {
    it('should generate valid payslips', async () => {
      const payrollData = {
        month: new Date(2024, 0, 1),
        payslips: [
          {
            employeeId: 'emp1',
            baseSalary: 5000,
            bonuses: 500,
            deductions: 200,
            netSalary: 5300,
          },
        ],
      };

      Payroll.insertMany.mockResolvedValue([{ _id: 'payslip1' }]);

      const result = await PayrollService.generatePayslips(payrollData);

      expect(result.success).toBe(true);
      expect(result.generatedPayslips).toHaveLength(1);
      expect(Payroll.insertMany).toHaveBeenCalled();
    });
  });
});
```

---

## 🔍 أداوات التشخيص

### أداة 1: Test Coverage Report

```bash
# تشغيل الاختبارات مع تقرير التغطية
npm test -- --coverage

# تقرير HTML للتفاصيل
npm test -- --coverage --collectCoverageFrom="src/**/*.js"

# ملاحظة الملفات بأقل تغطية
npm test -- --coverage --verbose | grep -E "(UNCOVERED|<25%)"
```

### أداة 2: Find Flaky Tests

```javascript
// ✅ __tests__/helpers/flaky-test-detector.js
async function runTestMultipleTimes(testName, times = 10) {
  const results = [];

  for (let i = 0; i < times; i++) {
    try {
      // شغل الاختبار
      results.push({ attempt: i + 1, passed: true });
    } catch (error) {
      results.push({ attempt: i + 1, passed: false, error });
    }
  }

  const passCount = results.filter(r => r.passed).length;
  const isFlakey = passCount < times && passCount > 0;

  console.log(`${testName}: ${passCount}/${times} passed`);
  if (isFlakey) {
    console.warn(`⚠️ This test is FLAKY! Fix it immediately.`);
  }

  return { isFlakey, results };
}

module.exports = { runTestMultipleTimes };
```

---

## ✅ قائمة التدقيق للتحسين

استخدم هذي القائمة لتتبع التحسينات:

```
[ ] أصلح جميع الـ Assertions الضعيفة
[ ] أضفت اختبارات Error Cases
[ ] نظفت قاعدة البيانات بشكل صحيح
[ ] أنشأت Test Factories
[ ] وثقت الاختبارات بتعليقات واضحة
[ ] أضفت اختبارات Performance
[ ] أضفت اختبارات Security
[ ] Integration Tests جاهزة
[ ] CI/CD يشغل الاختبارات تلقائياً
[ ] التغطية 80%+ للـ Critical Paths
```

---

**النسخة:** v1.0 | **آخر تحديث:** 28-02-2026 | **الحالة:** جاهز للاستخدام

