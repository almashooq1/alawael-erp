# الاختبار الشامل

## Unit Tests

- تشغيل: npm run test:unit
- أمثلة: tests/unit/fieldEncryption.test.js, tests/unit/csrfProtection.test.js

## حزمة الاختبارات الأساسية

- تشغيل: npm run test:all

## Integration Tests

- تشغيل: npm run test:integration
- أمثلة: tests/\*.test.js

## Security Tests

- تشغيل: npm run test:security
- أمثلة: tests/security/security-headers.test.js

## E2E Tests

- ضبط المتغير: E2E_BASE_URL=http://localhost:3001
- تشغيل: npm run test:e2e

## Load Testing

- تثبيت k6 ثم تشغيل:
  - BASE_URL=http://localhost:3001 npm run test:load

### تثبيت k6 (Windows)

- عبر Chocolatey: choco install k6
- أو عبر winget: winget install k6

## ملاحظات

- تأكد من تشغيل الخادم قبل اختبارات E2E و Load.
- يمكن تعطيل CSRF أثناء الاختبارات بوضع CSRF_PROTECTION_ENABLED=false عند
  الحاجة.
