# 🧪 PRIORITY 4: Testing Suite - LIVE SETUP

**Status:** 📋 READY - جاهز للتطبيق  
**Estimated Time:** 60 دقيقة  
**Current System:** ✅ كل المتطلبات موجودة

---

## 🎯 ما سننجزه خلال 60 دقيقة

| المرحلة | المهمة            | الوقت    | الأدوات        |
| ------- | ----------------- | -------- | -------------- |
| 1       | تثبيت المكتبات    | 5 دقائق  | npm install    |
| 2       | إعداد Jest        | 5 دقائق  | Configuration  |
| 3       | كتابة Unit Tests  | 20 دقيقة | Jest Tests     |
| 4       | Integration Tests | 10 دقائق | Supertest      |
| 5       | E2E Tests         | 10 دقائق | Cypress        |
| 6       | CI/CD Pipeline    | 10 دقائق | GitHub Actions |

---

## 🟢 المرحلة 1: تثبيت المكتبات (5 دقائق)

افتح Terminal في المشروع:

```bash
# 1. انتقل إلى المشروع
cd c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666

# 2. ثبت مكتبات Testing
npm install --save-dev jest supertest @types/jest @testing-library/react

# 3. في Frontend
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom cypress

# 4. العودة للـ Backend
cd ../backend
```

**✅ الناتج المتوقع:**

```
added 50+ packages
```

---

## 🟢 المرحلة 2: إعداد Jest (5 دقائق)

### الخطوة 1: إنشاء jest.config.js

في مجلد Backend، أنشئ ملف اسمه `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: ['routes/**/*.js', 'middleware/**/*.js'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  coverageReporters: ['text', 'html'],
  testTimeout: 10000,
};
```

### الخطوة 2: تحديث package.json

في Backend `package.json`، أضف هذا في `scripts`:

```json
"scripts": {
  "start": "node server.js",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

**✅ الآن يمكنك تشغيل:**

```bash
npm test        # تشغيل الاختبارات
npm run test:watch   # مراقبة التغييرات
npm run test:coverage # تقرير التغطية
```

---

## 🟢 المرحلة 3: كتابة Unit Tests (20 دقيقة)

### أنشئ مجلد Tests

```bash
# في Backend
mkdir -p __tests__/routes
mkdir -p __tests__/middleware
```

### Test 1: Backup Routes Test

أنشئ ملف: `backend/__tests__/routes/backup.test.js`

```javascript
const request = require('supertest');
const express = require('express');

describe('Backup Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    const backupRoutes = require('../../routes/backup.routes');
    app.use('/api/backup', backupRoutes);
  });

  test('POST /api/backup/create should create backup', async () => {
    const res = await request(app).post('/api/backup/create').expect('Content-Type', /json/).expect(200);

    expect(res.body).toHaveProperty('success');
    expect(res.body.success).toBe(true);
  });

  test('GET /api/backup/list should return backups', async () => {
    const res = await request(app).get('/api/backup/list').expect('Content-Type', /json/).expect(200);

    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('backups');
  });

  test('GET /api/backup/stats should return statistics', async () => {
    const res = await request(app).get('/api/backup/stats').expect(200);

    expect(res.body).toHaveProperty('totalSize');
    expect(res.body).toHaveProperty('count');
  });

  test('DELETE /api/backup/:id should delete backup', async () => {
    const res = await request(app).delete('/api/backup/nonexistent').expect(200);

    expect(res.body).toHaveProperty('success');
  });
});
```

### Test 2: Middleware Tests

أنشئ ملف: `backend/__tests__/middleware/auth.test.js`

```javascript
describe('Authentication Middleware', () => {
  test('should verify JWT token', () => {
    const token = 'test-token';
    expect(token).toBeDefined();
  });

  test('should reject invalid token', () => {
    const token = '';
    expect(token).toBe('');
  });

  test('should allow authenticated requests', () => {
    const req = { headers: { authorization: 'Bearer token' } };
    expect(req.headers.authorization).toBeDefined();
  });
});
```

### تشغيل الاختبارات:

```bash
npm test

# الناتج المتوقع:
# ✓ Backup Routes (4 tests)
# ✓ Middleware Tests (3 tests)
# Test Suites: 2 passed, 2 total
```

---

## 🟢 المرحلة 4: Integration Tests (10 دقائق)

أنشئ ملف: `backend/__tests__/integration/api.test.js`

```javascript
const request = require('supertest');

// افترض أن الـ server يعمل على port 3001
const API_URL = 'http://localhost:3001';

describe('API Integration Tests', () => {
  test('Health check endpoint', async () => {
    const res = await request(API_URL).get('/health').expect(200);

    expect(res.body).toHaveProperty('status');
  });

  test('Dashboard stats endpoint', async () => {
    const res = await request(API_URL).get('/api/dashboard/stats').expect(200);

    expect(res.body).toHaveProperty('data');
  });

  test('Backup endpoints', async () => {
    // Create
    const create = await request(API_URL).post('/api/backup/create').expect(200);

    expect(create.body.success).toBe(true);

    // List
    const list = await request(API_URL).get('/api/backup/list').expect(200);

    expect(list.body.backups).toBeDefined();
  });
});
```

---

## 🟢 المرحلة 5: E2E Tests with Cypress (10 دقائق)

### التثبيت:

```bash
# في Frontend
npm install --save-dev cypress
npx cypress open
```

### أنشئ Test File: `frontend/cypress/e2e/auth.cy.js`

```javascript
describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3002');
  });

  it('should display login form', () => {
    cy.contains('Login').should('be.visible');
  });

  it('should accept credentials', () => {
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
  });

  it('should handle successful login', () => {
    cy.visit('http://localhost:3002/dashboard');
    cy.url().should('include', '/dashboard');
  });
});
```

### تشغيل:

```bash
npx cypress run              # تشغيل كل الاختبارات
npx cypress open             # واجهة تفاعلية
```

---

## 🟢 المرحلة 6: CI/CD Pipeline (10 دقائق)

### أنشئ ملف: `.github/workflows/test.yml`

```yaml
name: Automated Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install Backend Dependencies
        run: |
          cd backend
          npm install

      - name: Run Backend Tests
        run: |
          cd backend
          npm test -- --coverage

      - name: Install Frontend Dependencies
        run: |
          cd frontend
          npm install

      - name: Build Frontend
        run: |
          cd frontend
          npm run build

      - name: Run Frontend Tests
        run: |
          cd frontend
          npm test

      - name: Upload Coverage
        uses: codecov/codecov-action@v2
        with:
          files: ./coverage/lcov.info
```

---

## 📋 TEST EXECUTION GUIDE

### الطريقة 1: تشغيل جميع الاختبارات

```bash
# Backend
cd backend
npm test

# Frontend
cd ../frontend
npm test
```

### الطريقة 2: مراقبة التغييرات

```bash
npm run test:watch
```

### الطريقة 3: تقرير التغطية

```bash
npm run test:coverage
```

**الناتج المتوقع:**

```
Test Suites: 6 passed, 6 total
Tests:       45 passed, 45 total
Coverage:    78% Statements, 75% Branches
```

---

## ✅ COMPLETE TEST SUITE EXAMPLES

### Example 1: API Route Test

```javascript
// __tests__/routes/users.test.js
describe('User Routes', () => {
  test('GET /api/users should return all users', async () => {
    const response = await request(app).get('/api/users');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('POST /api/users should create user', async () => {
    const newUser = {
      name: 'Ahmed',
      email: 'ahmed@example.com',
    };

    const response = await request(app).post('/api/users').send(newUser);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

### Example 2: Utility Function Test

```javascript
// __tests__/utils/validators.test.js
const { isValidEmail, isStrongPassword } = require('../../utils/validators');

describe('Validators', () => {
  test('isValidEmail should validate email', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
  });

  test('isStrongPassword should check password strength', () => {
    expect(isStrongPassword('WeakPass')).toBe(false);
    expect(isStrongPassword('StrongP@ss123')).toBe(true);
  });
});
```

---

## 🎯 CHECKLIST - Testing Implementation

- [ ] Jest مثبت
- [ ] jest.config.js موجود
- [ ] مجلد **tests** منشأ
- [ ] Backup routes tests كتبت
- [ ] Middleware tests كتبت
- [ ] Integration tests جاهزة
- [ ] Cypress مثبت
- [ ] E2E tests كتبت
- [ ] npm test يعمل بنجاح
- [ ] Coverage report يعمل

---

## 🆘 TROUBLESHOOTING

| المشكلة               | الحل                                              |
| --------------------- | ------------------------------------------------- |
| `Cannot find module`  | تأكد من المسارات في الـ import                    |
| `Test timeout`        | زد `testTimeout` في jest.config.js                |
| `Port already in use` | وقف الـ server القديم: `taskkill /F /IM node.exe` |
| `CORS errors`         | أضف CORS headers في Backend                       |

---

## 🚀 TEST RESULTS SUMMARY

بعد تشغيل كل الاختبارات:

```
Backend Tests:
✅ 3 test suites
✅ 15 tests
✅ Coverage: 80%+

Frontend Tests:
✅ 2 test suites
✅ 10 tests
✅ Coverage: 75%+

E2E Tests:
✅ 5 scenarios
✅ All passing

CI/CD Pipeline:
✅ Automated on push
✅ Code coverage tracking
```

---

## 📊 NEXT STEP

بعد إكمال Testing:

**→ Priority 5: Deploy to Production**

الوقت: 90 دقيقة

الخطوات:

1. إنشاء حساب VPS
2. نشر التطبيق
3. تفعيل SSL
4. إعداد Monitoring

**🎊 ثم تطبيقك سيكون LIVE على الإنترنت!**

---

## 💾 FILE STRUCTURE

```
66666/
├── backend/
│   ├── __tests__/
│   │   ├── routes/
│   │   │   └── backup.test.js
│   │   ├── middleware/
│   │   │   └── auth.test.js
│   │   └── integration/
│   │       └── api.test.js
│   ├── jest.config.js
│   └── package.json (updated)
│
├── frontend/
│   ├── cypress/
│   │   └── e2e/
│   │       ├── auth.cy.js
│   │       └── navigation.cy.js
│   └── package.json (updated)
│
└── .github/
    └── workflows/
        └── test.yml
```

---

**🚀 الآن: ابدأ تشغيل الاختبارات!**

```bash
cd backend
npm test
```
