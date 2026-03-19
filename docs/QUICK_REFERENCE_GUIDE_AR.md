# 🚀 مرجع سريع - AlAwael ERP System
## Quick Reference Guide

**آخر تحديث**: فبراير 2026
**الإصدار**: 1.0.0

---

## 📋 الأوامر الأساسية

### بدء التشغيل السريع

```bash
# 1. بدء Backend
cd backend && npm start

# 2. بدء Dashboard Server
cd dashboard/server && npm start

# 3. بدء Dashboard Client
cd dashboard/client && npm start

# 4. بدء Monitoring Stack
cd monitoring && docker-compose up -d
```

### اختبار الجودة

```bash
# فحص جميع الخدمات
cd dashboard/server && node quality-dashboard.js

# فحص خدمة واحدة
npm run quality:ci --prefix backend

# اختبارات سريعة (بدون تغطية)
npm run quality:fast --prefix backend
```

### Slack Notifications

```bash
# إرسال تقرير يومي يدوي
curl -X POST http://localhost:3001/api/slack/daily-summary

# اختبار Slack webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"اختبار"}' \
  YOUR_SLACK_WEBHOOK_URL
```

### Analytics APIs

```bash
# تحليل الأنماط (آخر 30 يوم)
curl http://localhost:3001/api/analytics/patterns/backend?days=30

# توقع الفشل
curl http://localhost:3001/api/analytics/predict/mobile

# حساب المخاطر
curl http://localhost:3001/api/analytics/risk/gateway

# نظرة عامة
curl http://localhost:3001/api/analytics/overview
```

### Monitoring Stack

```bash
# بدء جميع الخدمات
cd monitoring && docker-compose up -d

# إيقاف
docker-compose down

# عرض السجلات
docker-compose logs -f prometheus
docker-compose logs -f grafana

# إعادة تحميل Prometheus config
curl -X POST http://localhost:9090/-/reload

# حالة الخدمات
docker-compose ps
```

---

## 🔗 الروابط المهمة

| الخدمة | الرابط | الدخول |
|--------|--------|---------|
| Dashboard UI | http://localhost:3002 | - |
| Dashboard API | http://localhost:3001 | - |
| Backend API | http://localhost:5000 | - |
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3000 | admin/admin |
| AlertManager | http://localhost:9093 | - |
| Jaeger (Tracing) | http://localhost:16686 | - |

---

## 📁 هيكل الملفات الرئيسية

```
66666/
├── .github/
│   ├── workflows/
│   │   ├── quality-gate.yml          # CI/CD workflow
│   │   └── deployment-report.yml     # Deployment workflow
│   └── quality-rules.json            # Quality gates config
│
├── scripts/
│   └── ci-quality-check.js           # Quality enforcement
│
├── dashboard/
│   ├── server/
│   │   ├── integrations/
│   │   │   └── slack.js              # Slack service
│   │   ├── services/
│   │   │   ├── scheduler.js          # Cron scheduler
│   │   │   ├── ml-analytics.js       # ML analytics engine
│   │   │   └── quality.js            # Quality service (modified)
│   │   ├── routes/
│   │   │   └── api.js                # API routes (modified)
│   │   └── index.js                  # Main server (modified)
│   └── client/
│
├── monitoring/
│   ├── docker-compose.yml            # Monitoring stack
│   ├── prometheus/
│   │   ├── prometheus.yml            # Prometheus config
│   │   └── alert.rules.yml           # Alert rules
│   ├── alertmanager/
│   │   └── alertmanager.yml          # Alert routing
│   ├── grafana/
│   │   └── provisioning/             # Auto-provisioning
│   ├── README.md                     # Setup guide
│   └── OPENTELEMETRY_SETUP.md        # Tracing guide
│
├── docs/
│   ├── CI_CD_SETUP_GUIDE.md          # CI/CD documentation
│   └── COMPREHENSIVE_IMPLEMENTATION_GUIDE.md  # This file
│
└── [services]/
    ├── graphql/test/basic.test.js
    ├── finance-module/backend/test/basic.test.js
    ├── supply-chain-management/frontend/src/__tests__/basic.test.js
    ├── intelligent-agent/test/basic.test.js
    ├── mobile/test/basic.test.js
    ├── gateway/test/basic.test.js
    ├── whatsapp/test/basic.test.js
    └── backend-1/test/basic.test.js
```

---

## ⚙️ ملفات التكوين

### 1. Environment Variables (`.env`)

```bash
# dashboard/server/.env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX
SLACK_CHANNEL=#quality-alerts
ENABLE_SCHEDULER=true
DASHBOARD_PUBLIC_URL=http://localhost:3002
PORT=3001

# Optional: Email
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
NOTIFICATION_EMAIL=team@alawael.com
```

### 2. GitHub Secrets

```yaml
# Settings → Secrets → Actions
DASHBOARD_URL: https://your-dashboard.com
SLACK_WEBHOOK_URL: https://hooks.slack.com/services/XXX
MAIL_USERNAME: your-email@gmail.com
MAIL_PASSWORD: your-app-password
NOTIFICATION_EMAIL: team@alawael.com
```

### 3. Quality Rules (`.github/quality-rules.json`)

```json
{
  "qualityGates": {
    "minTestCoverage": 70,
    "minSuccessRate": 80,
    "allowedFailures": 2
  },
  "criticalServices": [
    "backend",
    "graphql",
    "supply-chain",
    "frontend"
  ]
}
```

---

## 🧪 سيناريوهات الاختبار

### السيناريو 1: فحص جودة شامل

```bash
# 1. تشغيل quality scan
cd dashboard/server
node quality-dashboard.js

# 2. عرض النتائج
cat quality-artifacts/*.json

# 3. إنشاء تقرير
npm run report:generate
```

### السيناريو 2: تشغيل CI/CD محلياً

```bash
# 1. تثبيت act (GitHub Actions local runner)
# Windows (chocolatey):
choco install act-cli

# 2. تشغيل workflow محلياً
act push -W .github/workflows/quality-gate.yml

# 3. عرض النتائج
cat /tmp/quality-report.md
```

### السيناريو 3: اختبار Slack Integration

```bash
# 1. تعيين webhook URL
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/XXX"

# 2. إرسال اختبار
curl -X POST http://localhost:3001/api/slack/daily-summary

# 3. التحقق من Slack channel
# يجب أن تصل رسالة في #quality-alerts
```

### السيناريو 4: استخدام ML Analytics

```bash
# 1. تحليل patterns لخدمة
curl http://localhost:3001/api/analytics/patterns/backend?days=30

# 2. توقع failure
curl http://localhost:3001/api/analytics/predict/mobile

# 3. حساب risk score
curl http://localhost:3001/api/analytics/risk/gateway

# 4. نظرة عامة على جميع الخدمات
curl http://localhost:3001/api/analytics/overview
```

### السيناريو 5: مراقبة الأداء

```bash
# 1. بدء monitoring stack
cd monitoring
docker-compose up -d

# 2. فتح Prometheus
# http://localhost:9090

# 3. استعلام metrics
# في Prometheus UI > Graph:
rate(http_requests_total[5m])
quality_test_coverage_percent
node_memory_usage_bytes

# 4. فتح Grafana
# http://localhost:3000 (admin/admin)

# 5. إنشاء dashboard
# Create → Dashboard → Add Panel
# اختر Prometheus datasource
```

---

## 🔧 أوامر الصيانة

### تنظيف المشروع

```bash
# حذف node_modules
Get-ChildItem -Path . -Recurse -Directory -Filter "node_modules" |
  Remove-Item -Recurse -Force

# حذف coverage reports
Get-ChildItem -Path . -Recurse -Directory -Filter "coverage" |
  Remove-Item -Recurse -Force

# حذف build artifacts
Get-ChildItem -Path . -Recurse -Directory -Filter "dist" |
  Remove-Item -Recurse -Force

# إعادة التثبيت
npm install
```

### تحديث Dependencies

```bash
# فحص التحديثات المتاحة
npm outdated

# تحديث جميع packages
npm update

# تحديث package معين
npm install package-name@latest --save

# فحص الثغرات الأمنية
npm audit

# إصلاح تلقائي
npm audit fix
```

### إعادة بناء Docker Images

```bash
# إعادة بناء monitoring stack
cd monitoring
docker-compose build --no-cache

# إعادة التشغيل
docker-compose up -d

# حذف volumes قديمة
docker-compose down -v
docker-compose up -d
```

---

## 📊 Metrics المتاحة

### Quality Metrics

```promql
# Test coverage percentage
quality_test_coverage_percent{service="backend"}

# Test success rate
quality_test_success_rate{service="backend"}

# Test duration
quality_test_duration_seconds{service="backend"}

# Failed tests count
quality_tests_failed{service="backend"}

# Total tests count
quality_tests_total{service="backend"}
```

### Infrastructure Metrics

```promql
# CPU usage
node_cpu_usage{instance="localhost:9100"}

# Memory usage
node_memory_usage_bytes{instance="localhost:9100"}

# Disk I/O
rate(node_disk_io_time_seconds_total[5m])

# Network traffic
rate(node_network_receive_bytes_total[5m])
```

### Application Metrics

```promql
# HTTP request rate
rate(http_requests_total[5m])

# HTTP request duration
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) /
rate(http_requests_total[5m])
```

---

## 🚨 Alert Rules

### Quality Alerts

| القاعدة | الشرط | الخطورة |
|---------|--------|---------|
| HighTestFailureRate | failure rate > 30% لمدة 5 دقائق | critical |
| LowTestCoverage | coverage < 60% لمدة 10 دقائق | warning |
| ConsecutiveFailures | 5 فشل متتالي | high |

### Infrastructure Alerts

| القاعدة | الشرط | الخطورة |
|---------|--------|---------|
| HighCPUUsage | CPU > 80% لمدة 5 دقائق | warning |
| HighMemoryUsage | Memory > 85% لمدة 5 دقائق | warning |
| DiskSpaceLow | Disk < 15% لمدة 10 دقائق | critical |
| ServiceDown | Service down لمدة دقيقة | critical |

### Performance Alerts

| القاعدة | الشرط | الخطورة |
|---------|--------|---------|
| SlowTestDuration | duration > 120s لمدة 10 دقائق | warning |
| HighErrorRate | error rate > 5% لمدة 5 دقائق | critical |

---

## 📧 قنوات الإشعارات

### Slack Channels

| القناة | النوع | التكرار |
|--------|-------|---------|
| #critical | خطير جداً | فوري (0s wait) |
| #quality-alerts | جودة | كل 5 دقائق |
| #ops-team | بنية تحتية | كل 10 دقائق |
| #performance | أداء | كل 8 ساعات |

### Email Recipients

```yaml
# alertmanager.yml
receivers:
  - name: quality-team
    email_configs:
      - to: 'quality@alawael.com'
        from: 'alerts@alawael.com'
        smarthost: 'smtp.gmail.com:587'
```

---

## 🔍 استكشاف الأخطاء السريع

### Slack Notifications لا تعمل

```bash
# 1. اختبار webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test"}' \
  YOUR_SLACK_WEBHOOK_URL

# 2. التحقق من .env
cat dashboard/server/.env | grep SLACK

# 3. إعادة تشغيل server
cd dashboard/server && npm start
```

### Prometheus Targets DOWN

```bash
# 1. فحص metrics endpoint
curl http://localhost:3001/metrics
curl http://localhost:5000/metrics

# 2. إعادة تحميل config
curl -X POST http://localhost:9090/-/reload

# 3. فحص docker network
docker exec -it prometheus ping host.docker.internal
```

### Tests Failing

```bash
# 1. تثبيت dependencies
npm install --save-dev jest @types/jest

# 2. التحقق من test script
cat package.json | grep "test"

# 3. تشغيل بـ verbose
npm test -- --verbose
```

### CI/CD Pipeline Fails

```bash
# 1. فحص GitHub Secrets
# Settings → Secrets → Actions

# 2. فحص workflow file
cat .github/workflows/quality-gate.yml

# 3. تشغيل محلياً
act push -W .github/workflows/quality-gate.yml
```

---

## 📚 موارد إضافية

### التوثيق الداخلي

- [CI/CD Setup Guide](./CI_CD_SETUP_GUIDE.md)
- [Monitoring Setup](../monitoring/README.md)
- [OpenTelemetry Guide](../monitoring/OPENTELEMETRY_SETUP.md)
- [Comprehensive Implementation Guide](./COMPREHENSIVE_IMPLEMENTATION_GUIDE.md)

### الأدوات المستخدمة

| الأداة | الإصدار | الغرض |
|-------|---------|-------|
| Node.js | 20+ | Runtime |
| Jest | 29+ | Testing |
| Prometheus | 2.45+ | Metrics |
| Grafana | 10+ | Visualization |
| Docker | 24+ | Containers |
| GitHub Actions | - | CI/CD |

### المكتبات الرئيسية

```json
{
  "node-cron": "^3.0.3",
  "axios": "^1.6.0",
  "prom-client": "^15.0.0",
  "@opentelemetry/sdk-node": "^0.45.0",
  "express": "^4.18.2",
  "jest": "^29.7.0"
}
```

---

## 🎯 Checklist النشر

### Pre-Deployment

- [ ] تحديث .env variables
- [ ] إضافة GitHub Secrets
- [ ] إنشاء Slack webhook
- [ ] إعداد Email notifications
- [ ] فحص جميع tests تعمل
- [ ] مراجعة quality rules

### Deployment

- [ ] push إلى GitHub
- [ ] التحقق من CI/CD workflow
- [ ] نشر monitoring stack
- [ ] تكوين Grafana dashboards
- [ ] اختبار Slack notifications
- [ ] اختبار Analytics APIs

### Post-Deployment

- [ ] مراقبة metrics لمدة ساعة
- [ ] التحقق من alerts تعمل
- [ ] اختبار daily summary
- [ ] مراجعة test coverage
- [ ] توثيق أي مشاكل
- [ ] إعداد backup strategy

---

## 💡 نصائح مفيدة

### تحسين الأداء

1. **Cache NPM Packages**:
```bash
# .github/workflows/quality-gate.yml
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

2. **Parallel Test Execution**:
```bash
# Run tests in parallel
npm test -- --maxWorkers=4
```

3. **Reduce Docker Image Size**:
```dockerfile
# Use alpine images
FROM node:20-alpine
```

### أفضل الممارسات

1. **Git Commit Messages**:
```bash
feat: Add Slack integration
fix: Correct metrics endpoint
docs: Update setup guide
test: Add coverage for auth module
```

2. **Branch Strategy**:
```bash
main      # Production
develop   # Development
feature/* # New features
hotfix/*  # Urgent fixes
```

3. **Test Organization**:
```
test/
├── unit/          # Unit tests
├── integration/   # Integration tests
├── e2e/           # End-to-end tests
└── fixtures/      # Test data
```

---

## 🆘 الدعم

### الحصول على المساعدة

1. **التوثيق**: راجع الملفات في `/docs`
2. **Logs**: فحص سجلات الخدمات
3. **GitHub Issues**: إنشاء issue جديد
4. **Slack**: #alawael-support

### المعلومات للإبلاغ عن مشكلة

```bash
# جمع معلومات النظام
node --version
npm --version
docker --version

# جمع logs
npm start 2>&1 | tee app.log

# معلومات البيئة
cat .env | grep -v PASSWORD
```

---

**آخر تحديث**: فبراير 2026
**Version**: 1.0.0
**Maintainer**: AlAwael Team

