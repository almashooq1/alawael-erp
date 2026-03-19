# 🚀 دليل عملي لتحسين الاختبارات الموجودة

## 📌 جدول المحتويات
- [الخطوات السريعة](#خطوات-سريعة)
- [تحويل الاختبارات الضعيفة](#تحويل-الاختبارات-الضعيفة)
- [زيادة التغطية بسرعة](#زيادة-التغطية-بسرعة)
- [أمثلة من الواقع](#أمثلة-من-الواقع)

---

## ⚡ خطوات سريعة

### الخطوة 1: قياس السوء (10 دقائق)
```bash
# تشغيل الاختبارات وقياس التغطية
npm test -- --coverage

# النتيجة المتوقعة:
# ======================== Coverage summary =========================
# Statements   : 25% ( 100/400 )
# Branches     : 20% ( 30/150 )
# Functions    : 30% ( 50/167 )
# Lines        : 28% ( 112/400 )
# ====================================================================
```

### الخطوة 2: التحسين تدريجي (أسبوع 1-4)

```
الأسبوع 1:  25% → 40%  (تحسين 15%)
الأسبوع 2:  40% → 55%  (تحسين 15%)
الأسبوع 3:  55% → 70%  (تحسين 15%)
الأسبوع 4:  70% → 80%+ (تحسين 10%+)
```

### الخطوة 3: الأتمتة
```bash
# npm test:coverage يجب أن ينجح دائماً!
# أضف إلى pre-commit hook
```

---

## 🔄 تحويل الاختبارات الضعيفة

### ❌ اختبار ضعيف من الواقع:
```javascript
// من tests/routes/attendance.routes.test.js
test('should return 200 on successful retrieval', () => {
  const status = 200;
  expect(status).toBe(200);  // ❌ لا يختبر شيء!
});
```

### ✅ نسخة محسّنة:
```javascript
test('should return attendance report successfully', async () => {
  // Arrange - إعداد البيانات
  const beneficiaryId = 'benef-001';
  const mockReport = {
    beneficiaryId,
    totalDays: 30,
    presentDays: 28,
    absentDays: 2,
  };

  // Stub the database
  jest.spyOn(AttendanceService, 'generateReport')
    .mockResolvedValue(mockReport);

  // Act - تنفيذ الطلب الفعلي
  const response = await request(app)
    .get(`/api/attendance/${beneficiaryId}/report`);

  // Assert - التحقق الفعلي
  expect(response.status).toBe(200);
  expect(response.body).toEqual(mockReport);
  expect(response.body.totalDays).toBe(30);
  expect(response.body.presentDays).toBe(28);
});
```

---

## 📈 زيادة التغطية بسرعة

### الطريقة 1️⃣: ابدأ بـ Utilities (سهل جداً)
```javascript
// ❌ قديم - بدون اختبارات
// src/utils/validators.js
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  return /^[\d-+()]+$/.test(phone);
}

// ✅ جديد - مع اختبارات
// tests/utils/validators.test.js
describe('validators utility', () => {
  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should accept valid phone numbers', () => {
      expect(validatePhone('123-456-7890')).toBe(true);
      expect(validatePhone('+966501234567')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('abc')).toBe(false);
      expect(validatePhone('')).toBe(false);
    });
  });
});
```

**النتيجة:** +10% coverage بـ 5 دقائق! ✨

### الطريقة 2️⃣: ركز على الـ Services (المنطق الأساسي)
```javascript
// services/BarcodeService.js - زيادة التغطية
describe('BarcodeService.generateQRCode - تحسين', () => {
  // ✅ حالات موجبة
  it('should generate QR code for valid data', async () => {
    const result = await BarcodeService.generateQRCode('https://example.com');
    expect(result).toMatch(/^data:image\/png;base64/);
  });

  // ✅ حالات سالبة - ركز هنا!
  it('should throw error for empty data', () => {
    expect(() => BarcodeService.generateQRCode(''))
      .toThrow('Data is required');
  });

  it('should throw error for null input', () => {
    expect(() => BarcodeService.generateQRCode(null))
      .toThrow('Data is required');
  });

  // ✅ حالات حدية - أضفها!
  it('should handle very long data', async () => {
    const longData = 'x'.repeat(10000);
    const result = await BarcodeService.generateQRCode(longData);
    expect(result).toBeDefined();
  });

  // ✅ اختبارات مختلفة الأنواع
  it.each(['L', 'M', 'Q', 'H'])(
    'should generate with error correction level %s',
    (level) => {
      const result = BarcodeService.generateQRCode('test', level);
      expect(result).toBeDefined();
    }
  );
});
```

**النتيجة:** +15-20% coverage! 🎯

### الطريقة 3️⃣: Integration Tests للـ Routes
```javascript
// ❌ اختبار قديم ضعيف
test('POST /api/users should return 201', () => {
  const expectedStatus = 201;
  expect(expectedStatus).toBe(201);  // ❌ لا معنى!
});

// ✅ اختبار محسّن فعلي
describe('POST /api/users - Integration', () => {
  it('should create user with valid data', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        name: 'أحمد',
        email: 'ahmed@example.com',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('ahmed@example.com');
  });

  it('should validate required fields', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'أحمد' });  // email missing

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('email');
  });

  it('should reject duplicate email', async () => {
    await request(app)
      .post('/api/users')
      .send({ name: 'أول', email: 'dup@example.com' });

    const response = await request(app)
      .post('/api/users')
      .send({ name: 'ثاني', email: 'dup@example.com' });

    expect(response.status).toBe(409);
  });
});
```

**النتيجة:** +20-30% coverage! 🚀

---

## 📚 أمثلة من الواقع

### مثال 1️⃣: تحسين UserManagement Tests

**قبل:**
```typescript
it('should create a user', () => {
  const user = um.createUser({ username: 'ali', email: 'ali@email.com', roles: ['admin'] });
  expect(user).toHaveProperty('id');
  expect(user.username).toBe('ali');
});
```

**بعد:**
```typescript
describe('UserManagement.createUser', () => {
  // الحالات الموجبة
  describe('valid input', () => {
    it('should create user with all properties', () => {
      const input = {
        username: 'ali',
        email: 'ali@email.com',
        roles: ['admin'],
      };

      const user = um.createUser(input);

      expect(user).toBeDefined();
      expect(user).toHaveProperty('id');
      expect(user.username).toBe('ali');
      expect(user.email).toBe('ali@email.com');
      expect(user.roles).toEqual(['admin']);
      expect(user).toHaveProperty('createdAt');
    });

    it('should generate unique IDs', () => {
      const user1 = um.createUser({ username: 'a', email: 'a@test.com', roles: [] });
      const user2 = um.createUser({ username: 'b', email: 'b@test.com', roles: [] });

      expect(user1.id).not.toBe(user2.id);
    });
  });

  // الحالات السالبة
  describe('invalid input', () => {
    it('should throw error for missing username', () => {
      expect(() => um.createUser({ email: 'test@test.com', roles: [] }))
        .toThrow('Username is required');
    });

    it('should throw error for invalid email', () => {
      expect(() => um.createUser({ username: 'test', email: 'invalid', roles: [] }))
        .toThrow('Invalid email format');
    });

    it('should throw error for empty roles', () => {
      expect(() => um.createUser({ username: 'test', email: 'test@test.com', roles: [] }))
        .toThrow('At least one role is required');
    });
  });

  // الحالات الحدية
  describe('edge cases', () => {
    it('should handle very long username', () => {
      const longUsername = 'a'.repeat(1000);
      expect(() => um.createUser({ 
        username: longUsername, 
        email: 'test@test.com', 
        roles: ['user'] 
      })).toThrow('Username too long');
    });

    it('should trim whitespace', () => {
      const user = um.createUser({
        username: '  ali  ',
        email: '  ali@test.com  ',
        roles: ['user'],
      });

      expect(user.username).toBe('ali');
      expect(user.email).toBe('ali@test.com');
    });
  });
});
```

### مثال 2️⃣: تحسين Barcode Tests

**تحسين coverage من 30% → 75%:**

```javascript
describe('BarcodeService - محسّن', () => {
  // إضافة اختبارات للحالات المفقودة
  describe('error handling', () => {
    it('should handle QR generation errors', async () => {
      jest.spyOn(qrcode, 'toDataURL')
        .mockRejectedValue(new Error('QR generation failed'));

      await expect(BarcodeService.generateQRCode('test'))
        .rejects.toThrow('QR generation failed');
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(BarcodeLog, 'create')
        .mockRejectedValue(new Error('Database error'));

      // يجب أن يرجع QR حتى لو فشل logging
      const result = await BarcodeService.generateQRCode('test');
      expect(result).toBeDefined();
    });
  });

  describe('special characters', () => {
    it('should handle Arabic text in QR', async () => {
      const arabic = 'مرحبا بك في النظام';
      const result = await BarcodeService.generateQRCode(arabic);
      expect(result).toMatch(/^data:image\/png;base64/);
    });

    it('should handle emojis', async () => {
      const emoji = '🎉🚀✨';
      const result = await BarcodeService.generateQRCode(emoji);
      expect(result).toBeDefined();
    });
  });

  describe('performance', () => {
    it('should generate QR within 100ms', async () => {
      const start = Date.now();
      await BarcodeService.generateQRCode('test');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});
```

---

## 🎁 قائمة مهام سريعة

### إرسال 1 (15 دقيقة)
- [ ] تشغيل `npm test -- --coverage`
- [ ] تحديد أضعف ملفات (coverage < 30%)
- [ ] إضافة 5 اختبارات للـ utilities

### اسبوع 2 (3 ساعات)
- [ ] تحسين 3 service tests
- [ ] إضافة اختبارات الأخطاء
- [ ] Target: 40% coverage

### أسبوع 3-4 (8 ساعات)
- [ ] Integration tests للـ APIs
- [ ] اختبارات الحالات الحدية
- [ ] Target: 70%+ coverage

---

## 📊 النتائج المتوقعة

| الملف | قبل | بعد | التحسن |
|------|-----|-----|--------|
| validators.js | 0% | 95% | 🟢 ممتاز |
| BarcodeService | 35% | 80% | 🟢 ممتاز |
| UserManagement | 40% | 85% | 🟢 ممتاز |
| API Routes | 15% | 70% | 🟢 جيد جداً |

**المجموع:** 25% → 75% ✅

---

## 🛠️ أوامر مفيدة

```bash
# عرض ملفات بدون اختبارات
npm test -- --coverage --collectCoverageFrom='src/**/*.js'

# تشغيل اختبار واحد فقط
npm test -- --testNamePattern="should create user"

# اختبارات ملف واحد فقط
npm test -- --testPathPattern="validators"

# مع watch mode
npm test -- --watch

# Debug mode
npm test -- --inspect-brk

# تحديث snapshots
npm test -- --updateSnapshot

# اختبارات محددة بـ tag
npm test -- --testNamePattern="@critical"
```

---

## 🌟 نصيحة ذهبية

**اكتب الاختبار أولاً ثم الكود!**

```javascript
// خطأ: كود أولاً ثم اختبار ضعيف
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);  // ✅ كود جيد
}

test('should work', () => {  // ❌ اختبار ضعيف
  expect(validateEmail('test@test.com')).toBe(true);
});

// صحيح: اختبار أولاً (TDD)
test('should accept valid email', () => {
  expect(validateEmail('test@example.com')).toBe(true);
});

test('should accept emails with subdomain', () => {
  expect(validateEmail('user@mail.example.com')).toBe(true);
});

test('should reject no @', () => {
  expect(validateEmail('testexample.com')).toBe(false);
});

// ... ثم اكتب الـ function لتمرير الاختبارات
```

---

**آخر تحديث:** 28 فبراير 2026  
**الحالة:** جاهز للتطبيق الفوري 🚀
