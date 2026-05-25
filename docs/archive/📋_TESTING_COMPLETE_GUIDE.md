# 📋 دليل الاختبار الشامل

## مقدمة عن الاختبارات

يحتوي هذا المشروع على ثلاث مستويات من الاختبارات:

1. **Unit Tests** - اختبارات الوحدات الفردية
2. **Integration Tests** - اختبارات التكامل بين المكونات
3. **E2E Tests** - اختبارات من طرف المستخدم النهائي

---

## 1. اختبارات Backend (Python - pytest)

### التثبيت

```bash
# تثبيت pytest وإضافاته
pip install pytest pytest-cov pytest-flask pytest-mock
```

### تشغيل الاختبارات

```bash
# تشغيل جميع الاختبارات
pytest

# تشغيل اختبارات محددة
pytest tests/test_routes_auth.py

# تشغيل اختبار محدد
pytest tests/test_routes_auth.py::TestAuthAPI::test_register_success

# تشغيل مع تقرير التغطية
pytest --cov=backend --cov-report=html

# تشغيل مع تفاصيل (verbose)
pytest -v

# تشغيل اختبارات محددة بالعلامة
pytest -m unit
pytest -m integration
```

### هيكل الاختبارات

```text
backend/tests/
├── __init__.py                      # Fixtures والإعدادات
├── test_models_beneficiary.py       # اختبارات نموذج المستفيد
├── test_routes_auth.py              # اختبارات API المصادقة
├── test_routes_beneficiaries.py     # اختبارات API المستفيدين
├── test_routes_reports.py           # اختبارات API التقارير
├── test_routes_sessions.py          # اختبارات API الجلسات
├── test_routes_assessments.py       # اختبارات API التقييمات
├── test_routes_programs.py          # اختبارات API البرامج
└── test_routes_goals.py             # اختبارات API الأهداف
```

### مثال على كتابة اختبار

```python
import pytest
from app import create_app
from models import db

@pytest.fixture
def app():
    """إنشاء تطبيق اختبار"""
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

def test_create_beneficiary(app):
    """اختبار إنشاء مستفيد"""
    with app.app_context():
        beneficiary = Beneficiary(
            first_name='أحمد',
            last_name='محمد',
            # ... باقي الحقول
        )
        db.session.add(beneficiary)
        db.session.commit()

        assert beneficiary.id is not None
```

---

## 2. اختبارات Frontend (JavaScript - Jest)

### التثبيت

```bash
# تثبيت Jest والإضافات
npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-mock-axios redux-mock-store

# تثبيت العاملات الإضافية
npm install --save-dev @babel/preset-react babel-jest
```

### تشغيل الاختبارات

```bash
# تشغيل جميع الاختبارات
npm test

# تشغيل اختبار محدد
npm test -- Login.test.js

# تشغيل مع المراقبة (watch mode)
npm test -- --watch

# تشغيل مع تقرير التغطية
npm test -- --coverage

# تشغيل اختبارات محددة
npm test -- --testNamePattern="Login"
```

### هيكل الاختبارات

```text
frontend/src/__tests__/
├── Login.test.js                    # اختبارات مكون Login
├── Dashboard.test.js                # اختبارات Dashboard
├── BeneficiaryForm.test.js         # اختبارات نموذج المستفيد
├── ReportForm.test.js              # اختبارات نموذج التقرير
├── authSlice.test.js               # اختبارات Redux auth
├── beneficiariesSlice.test.js      # اختبارات Redux beneficiaries
├── api.test.js                      # اختبارات Axios API
└── utils.test.js                    # اختبارات الدوال المساعدة
```

### مثال على اختبار React

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import Login from '../pages/Auth/Login';

test('يجب أن يعرض نموذج تسجيل الدخول', () => {
  render(<Login />);
  expect(screen.getByText(/تسجيل الدخول/i)).toBeInTheDocument();
});

test('يجب تحديث البريد الإلكتروني عند الكتابة', () => {
  render(<Login />);
  const input = screen.getByPlaceholderText(/البريد/i);
  fireEvent.change(input, { target: { value: 'test@example.com' } });
  expect(input.value).toBe('test@example.com');
});
```

---

## 3. اختبارات E2E (Cypress)

### التثبيت

```bash
# تثبيت Cypress
npm install --save-dev cypress

# فتح Cypress GUI
npx cypress open

# تشغيل الاختبارات
npx cypress run

# تشغيل اختبار محدد
npx cypress run --spec "cypress/e2e/login.cy.js"
```

### مثال على E2E Test

```javascript
describe('تسجيل الدخول', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/login');
  });

  it('يجب تسجيل دخول المستخدم بنجاح', () => {
    cy.get('input[placeholder*="البريد"]').type('test@example.com');
    cy.get('input[placeholder*="كلمة المرور"]').type('Test@1234');
    cy.get('button').contains('تسجيل الدخول').click();

    cy.url().should('include', '/dashboard');
    cy.contains('مرحبا').should('be.visible');
  });
});
```

---

## 4. تقارير التغطية

### التغطية للـ Backend

```bash
# توليد تقرير التغطية
pytest --cov=backend --cov-report=html

# الوصول للتقرير
open htmlcov/index.html
```

### التغطية للـ Frontend

```bash
# توليد تقرير التغطية
npm test -- --coverage

# الوصول للتقرير
open coverage/lcov-report/index.html
```

### أهداف التغطية

```text
Backend:
- Models:          90%+
- Routes:          85%+
- Services:        80%+
- Overall:         80%+

Frontend:
- Components:      70%+
- Redux:           80%+
- Utils:           85%+
- Overall:         75%+
```

---

## 5. اختبار الأداء

### أداة Apache Benchmark

```bash
# اختبار أداء الـ API
ab -n 100 -c 10 http://localhost:5000/api/beneficiaries

# اختبار مع المصادقة
ab -n 100 -c 10 -H "Authorization: Bearer TOKEN" \
   http://localhost:5000/api/beneficiaries
```

### اختبار الحمل

```bash
# استخدام Locust
pip install locust

# إنشاء ملف locustfile.py
# تشغيل الاختبار
locust -f locustfile.py --host=http://localhost:5000
```

---

## 6. الاختبار اليدوي

### سيناريوهات الاختبار

#### 1️⃣ المصادقة

- [ ] التسجيل بحساب جديد
- [ ] تسجيل الدخول برسالة وكلمة مرور صحيحة
- [ ] محاولة تسجيل الدخول ببيانات خاطئة
- [ ] تحديث كلمة المرور
- [ ] تحديث الملف الشخصي
- [ ] تسجيل الخروج

#### 2️⃣ إدارة المستفيدين

- [ ] عرض قائمة المستفيدين
- [ ] البحث في المستفيدين
- [ ] إضافة مستفيد جديد
- [ ] عرض تفاصيل المستفيد
- [ ] تعديل بيانات المستفيد
- [ ] حذف مستفيد
- [ ] عرض جلسات المستفيد

#### 3️⃣ إدارة الجلسات

- [ ] عرض قائمة الجلسات
- [ ] إضافة جلسة جديدة
- [ ] تعديل الجلسة
- [ ] تحديد الجلسة كمكتملة
- [ ] إلغاء جلسة
- [ ] تصفية الجلسات حسب الحالة

#### 4️⃣ إدارة التقارير

- [ ] عرض قائمة التقارير
- [ ] إضافة تقرير جديد
- [ ] عرض تفاصيل التقرير
- [ ] إضافة تعليقات على التقرير
- [ ] تصدير التقرير إلى PDF
- [ ] حذف التقرير

#### 5️⃣ التقييمات والأهداف

- [ ] إضافة تقييم جديد
- [ ] إضافة هدف SMART جديد
- [ ] تحديث تقدم الهدف
- [ ] عرض تاريخ التقدم

---

## 7. قائمة التحقق قبل النشر

```text
قبل نشر الكود:

Backend:
- [ ] جميع اختبارات Unit تمر
- [ ] لا توجد أخطاء في Linting
- [ ] التغطية >= 80%
- [ ] Secrets مختبئة في .env
- [ ] CORS محفوظ

Frontend:
- [ ] جميع الاختبارات تمر
- [ ] لا توجد تحذيرات Console
- [ ] Performance جيد
- [ ] RTL يعمل بشكل صحيح
- [ ] Responsive على الجوال

عام:
- [ ] لا توجد console.logs
- [ ] جميع Error cases معالجة
- [ ] التوثيق محدث
- [ ] Version update محدث
```

---

## 8. المشاكل الشائعة والحلول

### Backend

**المشكلة:** `ModuleNotFoundError: No module named 'pytest'`

```bash
# الحل
pip install pytest pytest-cov pytest-flask
```

**المشكلة:** قاعدة البيانات مقفلة

```python
# الحل
db.session.rollback()
db.drop_all()
db.create_all()
```

### Frontend

**المشكلة:** `Cannot find module '@testing-library/react'`

```bash
# الحل
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

**المشكلة:** Async tests timeout

```javascript
// الحل - استخدام waitFor
await waitFor(() => {
  expect(element).toBeInTheDocument();
});
```

---

## 9. سير العمل المستمر (CI/CD)

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Backend Tests
        run: |
          pip install -r backend/requirements.txt
          pytest backend/tests --cov
      - name: Frontend Tests
        run: |
          npm ci
          npm test -- --coverage
```

---

## 10. الموارد الإضافية

- [Pytest Documentation](https://docs.pytest.org/)
- [React Testing Library](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/)
- [Cypress Documentation](https://cypress.io/)
- [Coverage.py](https://coverage.readthedocs.io/)

---

**آخر تحديث**: 15 يناير 2026
**الحالة**: جاهز للاستخدام الفوري
