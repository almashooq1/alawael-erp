# 🧪 Testing Documentation

# وثائق الاختبارات الشاملة

## 📋 نظرة عامة على الاختبارات

نحن في **المرحلة 3.2 - الاختبارات والتدقيق** من مشروع نظام إدارة المركبات والأسطول الموافق للأنظمة السعودية.

### ملخص الاختبارات المُنشأة:

| الملف                            | النوع             | عدد الاختبارات | التغطية          |
| -------------------------------- | ----------------- | -------------- | ---------------- |
| `saudiComplianceService.test.js` | Unit Tests        | 28+            | خدمات الامتثال   |
| `complianceRoutes.test.js`       | Integration Tests | 32+            | API Endpoints    |
| `security-compliance.test.js`    | Security Tests    | 35+            | الأمان والامتثال |

**إجمالي الاختبارات: 95+ اختبار شامل**

---

## 🏗️ البنية الهرمية

```
backend/
├── __tests__/
│   ├── saudiComplianceService.test.js      (Unit Tests)
│   ├── complianceRoutes.test.js            (Integration Tests)
│   ├── security-compliance.test.js         (Security Tests)
│   └── __mocks__/
│       ├── saudiComplianceService.js
│       ├── Vehicle.js
│       └── complianceRoutes.js
├── jest.config.js                          (Jest Configuration)
├── jest.setup.js                           (Setup & Custom Matchers)
└── package.json                            (Test Scripts)
```

---

## 🧬 تفاصيل كل مجموعة اختبارات

### 1️⃣ Unit Tests - saudiComplianceService.test.js (28+ اختبار)

#### أ) Violation Codes Database

```javascript
✅ should have 16 violation codes
✅ should have required fields for each violation code
✅ violation codes should have valid fines (100-5000 SAR)
✅ violation codes should have valid demerit points (0-12)
```

**الاختبار:**

```bash
npm test -- saudiComplianceService.test.js -t "Violation Codes"
```

#### ب) recordSaudiViolation

```javascript
✅ should record a valid violation
✅ should reject invalid violation code
✅ should update vehicle violations array
✅ should calculate demerit points automatically
```

#### ج) calculateViolationSeverity

```javascript
✅ should return "simple" for 0-1 points
✅ should return "medium" for 2-4 points
✅ should return "serious" for 5-8 points
✅ should return "severe" for 9+ points
```

#### د) checkRegistrationValidity

```javascript
✅ should return valid for non-expired registration
✅ should return invalid for expired registration
✅ should return warning for registration expiring soon (≤30 days)
```

#### هـ) Validity Checks (Insurance & Inspection)

```javascript
✅ should validate Saudi insurance providers
✅ should check insurance policy types
✅ should return schedule for private vehicles
✅ should return schedule for commercial vehicles
```

#### و) validateVehicleData

```javascript
✅ should validate correct vehicle data
✅ should detect missing national ID
✅ should validate national ID format (10 digits)
✅ should calculate data completeness percentage
```

#### ز) Error Handling

```javascript
✅ should handle null vehicle gracefully
✅ should handle missing dates
✅ should handle invalid date formats
```

#### ح) Compliance Score Calculation

```javascript
✅ should calculate 100% score for compliant vehicle
✅ should reduce score for violations
```

---

### 2️⃣ Integration Tests - complianceRoutes.test.js (32+ اختبار)

#### أ) Endpoints للمخالفات (Violations)

```
POST   /api/compliance/violations/record
GET    /api/compliance/violations/codes
```

**الاختبارات:**

```javascript
✅ should return all violation codes (status 200)
✅ should require authentication
✅ should return violation codes with valid structure
✅ should record a valid violation (status 201)
✅ should validate required fields (status 400)
✅ should validate violation code
✅ should require authorization
```

#### ب) Endpoints للفحوصات (Validity Checks)

```
GET    /api/compliance/vehicle/:vehicleId/registration-validity
GET    /api/compliance/vehicle/:vehicleId/insurance-validity
GET    /api/compliance/vehicle/:vehicleId/inspection-validity
GET    /api/compliance/vehicle/:vehicleId/full-check
```

**الاختبارات:**

```javascript
✅ should return registration validity check
✅ should handle non-existent vehicle gracefully
✅ should validate vehicle ID format
✅ should return insurance validity check
✅ should validate insurance provider
✅ should return inspection validity check
✅ should return inspection schedule
✅ should return complete compliance check
✅ should aggregate all checks into summary
```

#### ج) Endpoints للتقارير (Reports)

```
GET    /api/compliance/vehicle/:vehicleId/compliance-report
POST   /api/compliance/fleet/compliance-report
GET    /api/compliance/fleet/critical-issues
```

**الاختبارات:**

```javascript
✅ should generate comprehensive compliance report
✅ should calculate compliance score between 0-100
✅ should provide actionable recommendations
✅ should generate fleet compliance report
✅ should validate array of vehicle IDs
✅ should require fleet-manager authorization
✅ should return list of critical issues
✅ should prioritize issues by severity
```

#### د) Endpoints للتحقق والإحصائيات

```
POST   /api/compliance/vehicle/validate-data
GET    /api/compliance/inspection-schedule/:vehicleType
GET    /api/compliance/statistics/vehicles-compliance
```

**الاختبارات:**

```javascript
✅ should validate correct vehicle data
✅ should detect missing required fields
✅ should report completion percentage
✅ should return schedule for private vehicle
✅ should return schedule for commercial vehicle
✅ should handle invalid vehicle types
✅ should return compliance statistics
✅ should require fleet-manager authorization
```

#### هـ) Error Handling & Response Format

```javascript
✅ should return 500 for server errors
✅ should return descriptive error messages
✅ should validate content-type headers
✅ should follow consistent response format
✅ should include timestamps in responses
```

---

### 3️⃣ Security Tests - security-compliance.test.js (35+ اختبار)

#### أ) Data Protection & Encryption (3 اختبارات)

```javascript
✅ should encrypt sensitive data (AES-256)
✅ should decrypt encrypted data correctly
✅ should use different IV for each encryption
```

**الاختبار:**

```bash
npm test -- security-compliance.test.js -t "Encryption"
```

#### ب) Authentication & Authorization (4 اختبارات)

```javascript
✅ should validate JWT tokens
✅ should reject expired tokens
✅ should enforce role-based access control
✅ should validate user permissions for sensitive operations
```

#### ج) Input Validation & Sanitization (6 اختبارات)

```javascript
✅ should validate National ID format (10 digits)
✅ should validate violation codes format
✅ should prevent SQL Injection
✅ should prevent XSS attacks
✅ should validate email format
✅ should limit input length for text fields
```

#### د) OWASP Top 10 Prevention (10 اختبارات)

```
✅ A1: Injection
✅ A2: Broken Authentication
✅ A3: Sensitive Data Exposure
✅ A4: XML External Entity (XXE)
✅ A5: Broken Access Control
✅ A6: Security Misconfiguration
✅ A7: Cross-Site Scripting (XSS)
✅ A8: Insecure Deserialization
✅ A9: Using Components with Known Vulnerabilities
✅ A10: Insufficient Logging & Monitoring
```

#### هـ) Audit Logging (4 اختبارات)

```javascript
✅ should log all data access
✅ should log data modifications
✅ should log failed access attempts
✅ should include IP address in audit logs
```

#### و) GDPR Compliance (5 اختبارات)

```javascript
✅ should track user consent
✅ should support data access requests (SAR)
✅ should support data deletion (Right to be Forgotten)
✅ should maintain data retention policy (6 years)
✅ should log data export requests
```

#### ز) Rate Limiting & DoS Prevention (3 اختبارات)

```javascript
✅ should enforce rate limits on API endpoints
✅ should implement exponential backoff
✅ should block repeated failed login attempts
```

#### ح) Secure Configuration (3 اختبارات)

```javascript
✅ should use environment variables for secrets
✅ should not expose sensitive data in logs
✅ should implement CORS properly
```

---

## 🚀 تشغيل الاختبارات

### 1️⃣ تشغيل جميع الاختبارات

```bash
npm test
```

### 2️⃣ تشغيل اختبارات محددة

```bash
# Unit Tests فقط
npm test -- saudiComplianceService.test.js

# Integration Tests فقط
npm test -- complianceRoutes.test.js

# Security Tests فقط
npm test -- security-compliance.test.js
```

### 3️⃣ تشغيل باسم معين

```bash
# اختبارات Violation Codes فقط
npm test -- -t "Violation Codes"

# اختبارات API Endpoints فقط
npm test -- -t "GET /api/compliance"
```

### 4️⃣ Watch Mode (مراقبة التغييرات)

```bash
npm test -- --watch
```

### 5️⃣ Coverage Report (تقرير التغطية)

```bash
npm test -- --coverage
```

### 6️⃣ Verbose Output (إخراج مفصل)

```bash
npm test -- --verbose
```

---

## 📊 معايير النجاح

### التغطية المطلوبة:

| المقياس    | النسبة المطلوبة | الحالة |
| ---------- | --------------- | ------ |
| Lines      | 80%             | ✅     |
| Functions  | 80%             | ✅     |
| Branches   | 75%             | ✅     |
| Statements | 80%             | ✅     |

### درجات الاختبار:

- ✅ **Passed**: جميع الاختبارات يجب أن تمر
- ✅ **Coverage**: يجب أن يتجاوز 80%
- ✅ **Performance**: كل اختبار < 1 ثانية
- ✅ **Security**: جميع فحوصات الأمان يجب أن تمر

---

## 🔧 Custom Jest Matchers

تم إضافة matchers مخصصة للاختبارات السعودية:

### 1️⃣ toBeValidDate

```javascript
expect(new Date()).toBeValidDate();
```

### 2️⃣ toBeValidNationalId

```javascript
expect('1234567890').toBeValidNationalId();
expect('123').not.toBeValidNationalId(); // فشل (أقل من 10 أرقام)
```

### 3️⃣ toBeValidViolationCode

```javascript
expect('101').toBeValidViolationCode();
expect('999').not.toBeValidViolationCode(); // فشل (كود غير صحيح)
```

### 4️⃣ toHaveComplianceScore

```javascript
expect(report).toHaveComplianceScore(); // يتحقق من أن score بين 0-100
```

---

## 📝 مثال على كتابة اختبار جديد

```javascript
describe('New Feature Tests', () => {
  test('should perform action X correctly', () => {
    // Arrange (التحضير)
    const input = {
      /* test data */
    };

    // Act (التنفيذ)
    const result = service.performAction(input);

    // Assert (التحقق)
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  test('should handle errors gracefully', () => {
    const invalidInput = {
      /* invalid data */
    };

    expect(() => {
      service.performAction(invalidInput);
    }).toThrow();
  });
});
```

---

## 🔍 عملية التصحيح (Debugging)

### 1️⃣ تشغيل اختبار واحد فقط

```bash
npm test -- --testNamePattern="should record a valid violation"
```

### 2️⃣ استخدام console.log

```javascript
test('debug test', () => {
  const value = getValue();
  console.log('Value:', value); // سيظهر في الإخراج
  expect(value).toBeDefined();
});
```

### 3️⃣ استخدام debugger

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## 📈 التقارير المتقدمة

### تقرير HTML

```bash
npm test -- --coverage
# سيتم إنشاء coverage/index.html
```

### تقرير JUnit XML

```bash
npm test -- --coverage --reporters=jest-junit
# النتيجة في: test-results/junit.xml
```

### تقرير LCOV

```bash
npm test -- --coverage --collectCoverageFrom="src/**/*.js"
# يمكن استخدامه مع Codecov أو أدوات أخرى
```

---

## ✅ Checklist قبل Production

- [ ] جميع الاختبارات تمر (100%)
- [ ] التغطية > 80%
- [ ] لا توجد تحذيرات
- [ ] أداء الاختبارات < 5 دقائق
- [ ] Security Tests تمر كلياً
- [ ] GDPR Compliance تمر كلياً
- [ ] توثيق الاختبارات كامل
- [ ] جميع Edge Cases مغطاة

---

## 📞 الدعم والمساعدة

في حالة وجود مشاكل في الاختبارات:

1. **تحقق من السجلات** (logs)
2. **اقرأ رسالة الخطأ بعناية**
3. **شغّل الاختبار بـ verbose mode**
4. **استخدم debugger**
5. **تحقق من Mock objects**

---

## 📚 مراجع إضافية

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://jestjs.io/docs/testing-library)
- [Supertest for API Testing](https://github.com/visionmedia/supertest)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

**آخر تحديث:** 2026-01-14  
**الإصدار:** Phase 3.2 - Testing & Audit  
**الحالة:** ✅ جاهز للتشغيل
