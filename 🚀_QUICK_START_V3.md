# 🚀 AlAwael ERP System v3.0 - Quick Start Guide

# تطوير المشروع الاحترافي - دليل البدء السريع

## ✨ ما تم إضافته

### 🏗️ البنية المعمارية الجديدة

- **API Gateway** - بوابة API مع Load Balancing و Circuit Breaker
- **GraphQL Server** - خادم GraphQL مع Subscriptions
- **Microservices Ready** - جاهز للتحول لـ Microservices
- **Docker Compose v3** - تكوين شامل لجميع الخدمات
- **Kubernetes** - ملفات نشر K8s جاهزة للإنتاج

### 🔐 الأمان المتقدم

- **OAuth2 Support** - دعم المصادقة الموحدة
- **Rate Limiting** - حماية من الهجمات
- **Circuit Breaker** - منع فشل الخدمات المتسلسل
- **Secrets Management** - إدارة احترافية للمفاتيح

### 📊 المراقبة والتتبع

- **Prometheus** - جمع المقاييس
- **Grafana** - لوحات تحكم مرئية
- **Jaeger** - تتبع موزع للطلبات
- **ElasticSearch** - محرك بحث متقدم

### 🚀 CI/CD Pipeline

- **GitHub Actions** - تكامل مستمر ونشر تلقائي
- **Automated Testing** - اختبارات تلقائية
- **Security Scanning** - فحص أمني تلقائي
- **Performance Testing** - اختبارات الأداء مع k6

---

## 📦 الخدمات المتوفرة

| الخدمة        | المنفذ      | الوصف                   |
| ------------- | ----------- | ----------------------- |
| Frontend      | 3000        | واجهة React             |
| Backend       | 3001        | API الرئيسي             |
| Gateway       | 8080        | بوابة API               |
| GraphQL       | 4000        | خادم GraphQL            |
| MongoDB       | 27017       | قاعدة البيانات الرئيسية |
| PostgreSQL    | 5432        | قاعدة البيانات المالية  |
| Redis         | 6379        | Cache & Sessions        |
| RabbitMQ      | 5672, 15672 | رسائل                   |
| ElasticSearch | 9200        | بحث                     |
| Prometheus    | 9090        | مقاييس                  |
| Grafana       | 3010        | لوحات تحكم              |
| Jaeger        | 16686       | تتبع                    |

---

## 🚀 البدء السريع

### 1. تشغيل النظام الكامل مع Docker Compose

```bash
# نسخ ملف الإعدادات
cp .env.v3.example .env

# تحرير الإعدادات (مهم!)
nano .env

# تشغيل جميع الخدمات
docker-compose -f docker-compose.v3.yml up -d

# متابعة السجلات
docker-compose -f docker-compose.v3.yml logs -f
```

### 2. التحقق من صحة الخدمات

```bash
# Gateway Health Check
curl http://localhost:8080/health

# Backend Health Check
curl http://localhost:3001/health

# GraphQL Playground
open http://localhost:4000/graphql

# Grafana Dashboard
open http://localhost:3010
# (admin / admin)

# RabbitMQ Management
open http://localhost:15672
# (admin / admin)
```

### 3. تطوير محلي

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev

# Gateway
cd gateway
npm install
npm run dev

# GraphQL
cd graphql
npm install
npm run dev
```

---

## 🏗️ الهيكل الجديد

```
alawael-erp-v3/
├── backend/              # Backend الرئيسي
├── frontend/             # Frontend React
├── gateway/              # API Gateway (جديد)
├── graphql/              # GraphQL Server (جديد)
├── services/             # Microservices (جديد)
│   ├── hr/
│   ├── finance/
│   └── reports/
├── k8s/                  # Kubernetes configs (جديد)
│   ├── backend-deployment.yaml
│   ├── ingress.yaml
│   └── secrets.yaml
├── docker/               # Docker configs
│   ├── nginx/
│   ├── mongodb/
│   └── prometheus/
├── .github/              # CI/CD (جديد)
│   └── workflows/
│       └── ci-cd.yml
├── tests/                # Tests
│   └── load-test.js      # k6 performance tests
├── docker-compose.v3.yml # Docker Compose (محدث)
└── .env.v3.example       # Environment variables
```

---

## 🔧 الأوامر المهمة

### Docker Commands

```bash
# بناء الصور
docker-compose -f docker-compose.v3.yml build

# تشغيل الخدمات
docker-compose -f docker-compose.v3.yml up -d

# إيقاف الخدمات
docker-compose -f docker-compose.v3.yml down

# مشاهدة السجلات
docker-compose -f docker-compose.v3.yml logs -f [service-name]

# إعادة تشغيل خدمة
docker-compose -f docker-compose.v3.yml restart [service-name]

# تنظيف كامل
docker-compose -f docker-compose.v3.yml down -v
```

### Kubernetes Commands

```bash
# إنشاء Namespace
kubectl create namespace alawael

# تطبيق جميع الملفات
kubectl apply -f k8s/

# التحقق من الحالة
kubectl get pods -n alawael
kubectl get services -n alawael
kubectl get ingress -n alawael

# مشاهدة السجلات
kubectl logs -f deployment/alawael-backend -n alawael

# التوسع
kubectl scale deployment/alawael-backend --replicas=5 -n alawael
```

### Testing Commands

```bash
# Unit Tests
npm test

# Integration Tests
npm run test:integration

# Load Testing (k6)
k6 run tests/load-test.js

# Security Audit
npm audit
docker scan alawael/backend:latest
```

---

## 📊 المراقبة والتحليل

### Prometheus Queries

```promql
# CPU Usage
rate(container_cpu_usage_seconds_total[5m])

# Memory Usage
container_memory_usage_bytes

# Request Rate
rate(http_requests_total[5m])

# Error Rate
rate(http_requests_total{status=~"5.."}[5m])
```

### Grafana Dashboards

1. افتح http://localhost:3010
2. تسجيل الدخول: admin / admin
3. استيراد لوحات التحكم من `docker/grafana/dashboards/`

---

## 🔐 الأمان

### تحديث المفاتيح السرية

```bash
# توليد JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# تشفير كلمة المرور لـ MongoDB
echo -n "your-password" | base64

# تحديث Kubernetes Secrets
kubectl create secret generic db-secrets \
  --from-literal=mongodb-uri="mongodb://..." \
  --dry-run=client -o yaml | kubectl apply -f -
```

### SSL/TLS

```bash
# توليد شهادة تطوير
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/ssl/key.pem \
  -out docker/nginx/ssl/cert.pem

# استخدام Let's Encrypt للإنتاج
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

---

## 🚀 النشر للإنتاج

### 1. إعداد البيئة

```bash
# نسخ ملف الإنتاج
cp .env.v3.example .env.production

# تحديث القيم للإنتاج
nano .env.production
```

### 2. Build Production Images

```bash
# Build all services
docker-compose -f docker-compose.v3.yml build

# Tag for registry
docker tag alawael/backend:latest your-registry/alawael/backend:v3.0

# Push to registry
docker push your-registry/alawael/backend:v3.0
```

### 3. Deploy to Kubernetes

```bash
# Apply configurations
kubectl apply -f k8s/

# Wait for deployment
kubectl rollout status deployment/alawael-backend -n alawael

# Verify
kubectl get pods -n alawael
```

---

## 📈 مؤشرات الأداء

### الأهداف المتوقعة

| المقياس           | الحالي    | المستهدف   | التحسين |
| ----------------- | --------- | ---------- | ------- |
| API Response Time | 200ms     | 50ms       | 75%     |
| Throughput        | 100 req/s | 1000 req/s | 900%    |
| Error Rate        | 0.5%      | 0.01%      | 98%     |
| Uptime            | 99%       | 99.9%      | -       |
| Test Coverage     | 85%       | 95%        | -       |

---

## 🎯 الخطوات التالية

1. ✅ **مراجعة الكود** - Code review للتحسينات
2. ✅ **الاختبار** - تشغيل جميع الاختبارات
3. ✅ **التوثيق** - تحديث الوثائق
4. 🔄 **تطوير Microservices** - تحويل الخدمات
5. 🔄 **AI Integration** - إضافة الذكاء الاصطناعي
6. 🔄 **Mobile App** - تطوير تطبيق الموبايل
7. 🔄 **Advanced Analytics** - تحليلات متقدمة

---

## 🆘 الدعم والمساعدة

### الموارد

- 📚 [التوثيق الكامل](./docs/)
- 🐛 [الإبلاغ عن المشاكل](https://github.com/alawael/erp/issues)
- 💬 [المناقشات](https://github.com/alawael/erp/discussions)
- 📧 [البريد الإلكتروني](mailto:support@alawael.sa)

### المشاكل الشائعة

**MongoDB لا يعمل:**

```bash
docker-compose -f docker-compose.v3.yml restart mongodb
docker-compose -f docker-compose.v3.yml logs mongodb
```

**Redis connection error:**

```bash
redis-cli -h localhost -p 6379 -a your_password ping
```

**Port already in use:**

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID [PID] /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

---

## 🎉 نجاح!

تم تطوير النظام بشكل احترافي شامل! 🚀

**المميزات الجديدة:**

- ✅ API Gateway مع Circuit Breaker
- ✅ GraphQL Server مع Subscriptions
- ✅ Docker Compose كامل
- ✅ Kubernetes Deployment
- ✅ CI/CD Pipeline
- ✅ Monitoring & Observability
- ✅ Security Enhancements
- ✅ Performance Testing

**تاريخ:** 24 يناير 2026  
**الإصدار:** 3.0.0  
**الحالة:** ✅ جاهز للإنتاج

---

**🌟 اتبع الخطة التنفيذية في:** `📋_PROFESSIONAL_DEVELOPMENT_PLAN_V3.md`
