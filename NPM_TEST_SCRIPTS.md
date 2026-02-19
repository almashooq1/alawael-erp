# 📝 قائمة Npm Scripts للاختبارات

## إضافة هذه الـ Scripts لـ package.json

```json
{
  "scripts": {
    "test": "npm run test:all",
    
    "test:all": "node erp_new_system/backend/tests/masterTestRunner.js",
    
    "test:security": "node erp_new_system/backend/tests/securityAudit.js",
    "test:security:detailed": "node erp_new_system/backend/tests/securityAudit.js 2>&1 | tee test-reports/security.log",
    
    "scan:vulnerabilities": "node erp_new_system/backend/tests/vulnerabilityScanner.js",
    "scan:vulnerabilities:detailed": "node erp_new_system/backend/tests/vulnerabilityScanner.js 2>&1 | tee test-reports/vulnerabilities.log",
    
    "profile:resources": "node erp_new_system/backend/tests/resourceProfiler.js",
    "profile:resources:detailed": "node erp_new_system/backend/tests/resourceProfiler.js 2>&1 | tee test-reports/resources.log",
    
    "test:integration": "node erp_new_system/backend/tests/integrationTest.js",
    "test:integration:detailed": "node erp_new_system/backend/tests/integrationTest.js 2>&1 | tee test-reports/integration.log",
    
    "test:bigdata": "node erp_new_system/backend/tests/bigDataPerformance.js",
    "test:bigdata:detailed": "node erp_new_system/backend/tests/bigDataPerformance.js 2>&1 | tee test-reports/bigdata.log",
    
    "test:e2e": "node erp_new_system/backend/tests/e2eTest.js",
    "test:e2e:detailed": "node erp_new_system/backend/tests/e2eTest.js 2>&1 | tee test-reports/e2e.log",
    
    "test:quick": "npm run test:security && npm run test:integration",
    "test:full": "npm run test:all",
    "test:continuous": "watch 'npm run test:all' ./erp_new_system/backend --wait 5",
    
    "test:report": "cat test-reports/master-report.json | jq .",
    "test:report:html": "open test-reports/report.html || xdg-open test-reports/report.html",
    
    "test:cleanup": "rm -rf test-reports && mkdir test-reports",
    "test:archive": "zip -r test-reports-$(date +%Y%m%d-%H%M%S).zip test-reports/"
  }
}
```

## 📝 تعليمات التثبيت

### 1. أضف الـ Scripts إلى `package.json`

```bash
# انسخ الـ JSON أعلاه إلى scripts section في package.json
nano package.json

# أو استخدم npm-run-all
npm install --save-dev npm-run-all
```

### 2. تثبيت المكتبات المطلوبة الإضافية (اختياري)

```bash
# لمراقبة ملفات الاختبار تلقائياً
npm install --save-dev watch

# لتشغيل الاختبارات بالتوازي
npm install --save-dev concurrently

# لتنسيق أفضل للإخراج
npm install --save-dev chalk
```

---

## 🚀 أمثلة الاستخدام

### تشغيل جميع الاختبارات
```bash
npm test
# أو
npm run test:all
```

### تشغيل اختبار واحد فقط
```bash
npm run test:security
npm run scan:vulnerabilities
npm run profile:resources
npm run test:integration
npm run test:bigdata
npm run test:e2e
```

### تشغيل اختبارات محددة مع التفاصيل
```bash
npm run test:security:detailed
npm run scan:vulnerabilities:detailed
npm run profile:resources:detailed
```

### اختبارات سريعة
```bash
npm run test:quick  # الأمان والتكامل فقط
```

### اختبارات كاملة
```bash
npm run test:full   # جميع الاختبارات
```

### مراقبة مستمرة
```bash
npm run test:continuous  # إعادة التشغيل تلقائياً عند التغييرات
```

### عرض التقارير
```bash
npm run test:report       # عرض JSON
npm run test:report:html  # فتح HTML في المتصفح
```

### إدارة التقارير
```bash
npm run test:cleanup    # حذف التقارير القديمة
npm run test:archive    # ضغط التقارير
```

---

## 🎯 أفضل الممارسات

### جدولة منتظمة

```bash
# يومياً في الساعة 2 صباحاً
# أضف إلى crontab
0 2 * * * cd /path/to/project && npm run test:all

# أو استخدم PM2
pm2 start "npm run test:all" --cron "0 2 * * *" --name tests
```

### تكامل مع CI/CD

```yaml
# GitHub Actions
name: Run Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:all
```

### تشغيل متوازي

```bash
npm install --save-dev concurrently

# أضف هذا لـ package.json
"test:parallel": "concurrently 'npm run test:security' 'npm run test:integration' 'npm run test:bigdata'"
```

### إرسال التنبيهات

```javascript
// في masterTestRunner.js
if (failedTests > 0) {
  console.error('❌ هناك اختبارات فاشلة!');
  // أرسل بريد إلكتروني أو إشعار Slack
  notifyTeam({
    status: 'FAILED',
    failedCount: failedTests
  });
}
```

---

## 📊 نموذج التقرير الكامل

بعد تشغيل `npm test`:

```
╔════════════════════════════════════════════════════════════╗
║    🧪 مشغل الاختبارات الشامل - Master Test Runner        ║
╚════════════════════════════════════════════════════════════╝

📋 معلومات الاختبار:
   التاريخ: 18/02/2026, 10:30:45
   الخادم: http://localhost:5000/api/v1
   الاختبارات: security, vulnerability, resources, integration, bigdata, e2e

╔════════════════════════════════════════════════════════════╗
║              📊 ملخص نتائج جميع الاختبارات               ║
╚════════════════════════════════════════════════════════════╝

اختبارات الأمان             | ✅ PASSED | 10 نجح, 0 فشل
فحص الثغرات                 | 🟠 HAS_ISSUES | 2 حرج, 5 عالي
اختبار الموارد               | ➡️ COMPLETED | 8 اختبار
اختبار التكامل               | ✅ PASSED | 25 نجح, 0 فشل
اختبار البيانات الضخمة      | ➡️ COMPLETED | 10 اختبار
اختبارات E2E                | ✅ PASSED | 5 نجح, 0 فشل

════════════════════════════════════════════════════════════

📈 الملخص العام:
   عدد مجموعات الاختبار: 6
   الوقت الإجمالي: 12.34s
   البيئة: linux (x64)
   إصدار Node: v16.13.0
   عدد المعالجات: 4

📁 تم حفظ التقارير في: ./test-reports
   ✅ master-report.json
   ✅ report.html
   ✅ report.md
```

---

## 🔧 تخصيص الـ Scripts

### إنشاء نص برمجي مخصص

```bash
#!/bin/bash
# ./scripts/full-test.sh

echo "🧪 بدء الاختبارات الشاملة..."

# تنظيف التقارير القديمة
npm run test:cleanup

# تشغيل الاختبارات
echo "📝 الاختبار 1: الأمان..."
npm run test:security

echo "📝 الاختبار 2: الثغرات..."
npm run scan:vulnerabilities

echo "📝 الاختبار 3: الموارد..."
npm run profile:resources

echo "📝 الاختبار 4: التكامل..."
npm run test:integration

echo "📝 الاختبار 5: البيانات الضخمة..."
npm run test:bigdata

echo "📝 الاختبار 6: E2E..."
npm run test:e2e

# عرض النتائج
echo "📊 النتائج:"
npm run test:report

# حفظ تاريخي
npm run test:archive

echo "✅ انتهت الاختبارات!"
```

### إنشاء نص مراقبة

```bash
#!/bin/bash
# ./scripts/watch-tests.sh

while true; do
  npm run test:quick
  echo "⏳ انتظار التغييرات... (Ctrl+C للخروج)"
  sleep 60
done
```

---

## 💾 حفظ النتائج التاريخية

```javascript
// scripts/archive-results.js
const fs = require('fs');
const path = require('path');

const timestamp = new Date().toISOString().replace(/:/g, '-');
const archivePath = `./test-history/${timestamp}.json`;

fs.copyFileSync(
  './test-reports/master-report.json',
  archivePath
);

console.log(`✅ تم حفظ النتائج في: ${archivePath}`);
```

ثم أضف:
```json
"test:history": "node scripts/archive-results.js"
```

---

## 📈 مقارنة النتائج

```javascript
// scripts/compare-results.js
const fs = require('fs');

const current = JSON.parse(fs.readFileSync('./test-reports/master-report.json'));
const previous = JSON.parse(fs.readFileSync('./test-history/latest.json'));

console.log('📊 مقارنة النتائج:');
console.log(`الوقت السابق: ${previous.totalDuration / 1000}s`);
console.log(`الوقت الحالي: ${current.totalDuration / 1000}s`);
console.log(`الفارق: ${((current.totalDuration - previous.totalDuration) / 1000).toFixed(2)}s`);
```

---

**آخر تحديث:** 2026-02-18  
**الإصدار:** 1.0.0
