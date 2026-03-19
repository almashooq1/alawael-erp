# دليل إعداد CI/CD Pipeline
# CI/CD Setup Guide

<div dir="rtl">

## 📋 نظرة عامة

هذا الدليل يشرح كيفية إعداد وتفعيل نظام CI/CD التلقائي لمشروع ALAWAEL ERP.

## 🎯 الميزات

- ✅ اختبارات تلقائية على كل Push/PR
- ✅ Quality Gates قبل Merge
- ✅ تقارير تلقائية بعد كل Deployment
- ✅ إشعارات فورية عبر Slack/Email
- ✅ تحليل شامل للجودة

## 📦 المتطلبات

### 1. Repository على GitHub
يجب أن يكون المشروع على GitHub لاستخدام GitHub Actions.

### 2. Node.js Environment
- Node.js 20 أو أحدث
- npm مثبت على جميع الخدمات

### 3. اختبارات موجودة
كل خدمة يجب أن تحتوي على:
- `package.json` مع script للاختبار
- ملفات الاختبار في مجلد `test/` أو `__tests__/`

</div>

## 🚀 Setup Instructions

### Step 1: Configure GitHub Secrets

قم بإضافة الـ Secrets التالية في GitHub Repository Settings:

```bash
# Navigate to: Repository → Settings → Secrets and variables → Actions
```

#### Required Secrets:

1. **DASHBOARD_URL** (Optional)
   ```
   https://your-dashboard-url.com
   ```
   URL للـ Dashboard الخاص بك لإرسال النتائج

2. **SLACK_WEBHOOK_URL** (Optional)
   ```
   https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```
   للإشعارات عبر Slack

3. **MAIL_USERNAME** & **MAIL_PASSWORD** (Optional)
   ```
   your-email@gmail.com
   your-app-password
   ```
   للإشعارات عبر Email

4. **NOTIFICATION_EMAIL** (Optional)
   ```
   team@alawael.com
   ```
   البريد الذي سيستقبل الإشعارات

### Step 2: Enable GitHub Actions

<div dir="rtl">

1. اذهب إلى **Settings** → **Actions** → **General**
2. تأكد من تفعيل **Allow all actions and reusable workflows**
3. احفظ التغييرات

</div>

### Step 3: Configure Services

<div dir="rtl">

تأكد أن كل خدمة تحتوي على `package.json` مع:

</div>

```json
{
  "name": "service-name",
  "scripts": {
    "test": "jest --coverage --passWithNoTests",
    "test:ci": "jest --coverage --ci --maxWorkers=2"
  },
  "jest": {
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "src/**/*.js",
      "!src/**/*.test.js"
    ],
    "coverageThresholds": {
      "global": {
        "statements": 70,
        "branches": 65,
        "functions": 70,
        "lines": 70
      }
    }
  }
}
```

### Step 4: Customize Quality Rules

<div dir="rtl">

عدّل ملف `.github/quality-rules.json` حسب احتياجاتك:

</div>

```json
{
  "qualityGates": {
    "minTestCoverage": 70,     // Minimum coverage %
    "minSuccessRate": 80,      // Minimum test success rate %
    "allowedFailures": 2,      // Max number of failing services
    "minTestsPerService": 10   // Minimum tests per service
  },
  "criticalServices": [
    "backend",
    "graphql",
    "supply-chain",
    "frontend"
  ]
}
```

### Step 5: Test the Pipeline

<div dir="rtl">

1. قم بعمل Push لأي ملف:
   ```bash
   git add .
   git commit -m "test: Trigger CI/CD pipeline"
   git push origin develop
   ```

2. اذهب إلى **Actions** tab في GitHub
3. راقب تنفيذ Workflow
4. تحقق من النتائج

</div>

## 📊 Understanding the Workflows

### Quality Gate Workflow

<div dir="rtl">

**الملف:** `.github/workflows/quality-gate.yml`

**يعمل عند:**
- Push إلى branches: main, develop, feature/*
- Pull requests إلى: main, develop
- يدوياً من Actions tab

**الخطوات:**
1. Checkout الكود
2. Setup Node.js
3. Install dependencies لكل خدمة
4. Run tests مع coverage
5. Upload results
6. Analyze النتائج
7. Enforce quality gates
8. Send notifications

</div>

### Deployment Report Workflow

<div dir="rtl">

**الملف:** `.github/workflows/deployment-report.yml`

**يعمل عند:**
- Push إلى: main, production
- يدوياً من Actions tab

**الخطوات:**
1. Collect deployment info
2. Run final quality checks
3. Analyze test results
4. Generate deployment report
5. Update dashboard
6. Create deployment tag
7. Send notifications

</div>

## 🔍 CI Quality Check Script

<div dir="rtl">

**الملف:** `scripts/ci-quality-check.js`

**الوظيفة:**
- تحليل نتائج الاختبارات
- فرض قواعد الجودة
- إنشاء تقارير مفصلة
- إرسال النتائج للـ Dashboard

**الاستخدام:**
```bash
node scripts/ci-quality-check.js
```

</div>

## 🚦 Quality Gates Explained

<div dir="rtl">

### Gate 1: Test Coverage
يتحقق من أن نسبة التغطية أكبر من أو تساوي الحد الأدنى المطلوب.

### Gate 2: Success Rate
يتحقق من أن نسبة نجاح الاختبارات أكبر من أو تساوي الحد الأدنى المطلوب.

### Gate 3: Critical Services
يتحقق من أن جميع الخدمات الحرجة نجحت في الاختبارات.

### Gate 4: Failure Threshold
يتحقق من أن عدد الخدمات الفاشلة ضمن الحد المسموح.

</div>

## 📧 Notifications Setup

### Slack Integration

<div dir="rtl">

1. اذهب إلى Slack workspace
2. أنشئ Incoming Webhook:
   - Settings → Manage apps
   - Search for "Incoming Webhooks"
   - Add to Slack
   - Choose channel
   - Copy Webhook URL
3. أضف الـ URL كـ Secret في GitHub

</div>

### Email Integration

<div dir="rtl">

للـ Gmail:
1. أنشئ App Password:
   - Google Account → Security
   - 2-Step Verification (يجب تفعيله)
   - App passwords
   - Select app: Mail
   - Generate password
2. أضف البيانات كـ Secrets في GitHub

</div>

## 🔧 Troubleshooting

### Problem: Workflow fails at npm install

<div dir="rtl">

**الحل:**
- تأكد من وجود `package-lock.json`
- استخدم `npm ci` بدلاً من `npm install`
- أضف `--legacy-peer-deps` إذا كانت هناك تعارضات

</div>

### Problem: Tests not running

<div dir="rtl">

**الحل:**
- تأكد من وجود script `test` في `package.json`
- تحقق من وجود ملفات الاختبار
- استخدم `--passWithNoTests` للسماح بعدم وجود اختبارات

</div>

### Problem: Quality gate always fails

<div dir="rtl">

**الحل:**
- راجع متطلبات `.github/quality-rules.json`
- قلّل الحدود المطلوبة مؤقتاً
- أصلح الخدمات الفاشلة
- زِد عدد الاختبارات والتغطية

</div>

### Problem: No artifacts found

<div dir="rtl">

**الحل:**
- تأكد من تشغيل tests بنجاح
- تحقق من إنشاء مجلد `coverage/`
- راجع paths في upload-artifact action

</div>

## 📈 Best Practices

<div dir="rtl">

### 1. Write Quality Tests
- اكتب اختبارات واضحة ومفهومة
- غطِّ الحالات الحرجة
- استخدم descriptive test names

### 2. Maintain Coverage
- حافظ على 70%+ coverage
- أضف tests للكود الجديد
- لا تخفّض thresholds بدون سبب

### 3. Monitor Regularly
- راقب نتائج CI يومياً
- أصلح الفشل فوراً
- راجع trends في Dashboard

### 4. Keep Rules Updated
- راجع quality-rules.json شهرياً
- حدّث thresholds تدريجياً
- أضف critical services الجديدة

### 5. Use Branches Properly
- feature/* للتطوير
- develop للدمج والاختبار
- main للإنتاج فقط

</div>

## 📊 Monitoring & Reports

### GitHub Actions UI

<div dir="rtl">

- اذهب إلى **Actions** tab
- راجع runs الأخيرة
- اضغط على أي run لرؤية التفاصيل
- حمّل artifacts للتقارير الكاملة

</div>

### Dashboard Integration

<div dir="rtl">

إذا كان Dashboard مفعّل:
- http://localhost:3002 (Development)
- اعرض real-time results
- راجع trends and history
- تابع system health

</div>

## 🔄 Updating the Pipeline

<div dir="rtl">

لتحديث workflows:

1. عدّل الملفات في `.github/workflows/`
2. اعمل commit و push
3. الـ workflows الجديدة ستستخدم تلقائياً

لتحديث quality rules:

1. عدّل `.github/quality-rules.json`
2. التغييرات تطبّق فوراً في الـ runs القادمة

</div>

## 🎯 Next Steps

<div dir="rtl">

بعد إعداد CI/CD بنجاح:

1. ✅ أضف المزيد من الاختبارات
2. ✅ فعّل branch protection rules
3. ✅ أعدّ Slack/Email notifications
4. ✅ راجع Dashboard بانتظام
5. ✅ حسّن quality thresholds تدريجياً

</div>

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Jest Testing Framework](https://jestjs.io/)
- [Code Coverage Best Practices](https://martinfowler.com/bliki/TestCoverage.html)
- [CI/CD Best Practices](https://www.atlassian.com/continuous-delivery/principles/continuous-integration-vs-delivery-vs-deployment)

## 💡 Support

<div dir="rtl">

للمساعدة:
- راجع هذا الدليل أولاً
- تحقق من Troubleshooting section
- راجع logs في GitHub Actions
- تواصل مع الفريق التقني

</div>

---

<div dir="rtl" align="center">

**✨ تم بواسطة ALAWAEL ERP Team**

*Last Updated: March 2, 2026*

</div>
