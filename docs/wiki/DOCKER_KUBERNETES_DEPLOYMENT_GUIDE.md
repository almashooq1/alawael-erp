# Phase 33: Docker & Production Deployment Guide

## 🚀 تطبيق النظام على بيئة الإنتاج

هذا الدليل يشرح كيفية نشر نظام ERP الكامل باستخدام Docker و Kubernetes.

---

## 📋 جدول المحتويات

1. [Docker Setup](#docker-setup)
2. [Docker Compose](#docker-compose)
3. [Container Registry](#container-registry)
4. [Kubernetes Setup](#kubernetes-setup)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

---

## 🐳 Docker Setup

### المتطلبات

```bash
# تثبيت Docker
# Windows 10/11: https://www.docker.com/products/docker-desktop

# تثبيت Docker Compose
docker --version
docker-compose --version

# التحقق من التثبيت
docker run hello-world
```

### Dockerfile البنية (من مرحلتين)

```dockerfile
# المرحلة 1: بناء الملفات
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# المرحلة 2: التشغيل
FROM node:18-alpine
COPY --from=builder /app/node_modules ./node_modules
COPY . .
USER nodejs
EXPOSE 3001
CMD ["node", "server.js"]
```

**الميزات:**

- ✅ حجم صورة صغير (بناء متعدد المراحل)
- ✅ مستخدم غير جذر للأمان
- ✅ Health checks مدمجة
- ✅ عزل الملفات غير الضرورية

### بناء الصورة محلياً

```bash
# الانتقال للمشروع
cd erp_new_system/backend

# بناء الصورة
docker build -t erp-backend:latest .

# التحقق من الصورة
docker images | grep erp-backend

# تشغيل الحاوية
docker run -p 3001:3001 \
  -e MONGODB_URI="mongodb://localhost:27017/erp_db" \
  -e NODE_ENV="production" \
  erp-backend:latest

# اختبار الخادم
curl http://localhost:3001/health
```

### أفضل الممارسات في Docker

```yaml
✅ Multi-stage builds        # تقليل حجم الصورة
✅ استخدام alpine images    # صور خفيفة الوزن
✅ Non-root users            # أمان أفضل
✅ Health checks             # مراقبة الصحة
✅ Layer caching             # بناء أسرع
✅ Environment variables     # مرونة التكوين
```

---

## 🐳 Docker Compose - Stack كامل

### البنية

```yaml
Services:
├── mongodb      # قاعدة البيانات (StatefulSet محاكاة)
├── redis        # ذاكرة التخزين المؤقت
├── backend      # تطبيق Node.js
└── nginx        # عكس البروكسي (اختياري)
```

### تشغيل Stack كامل

```bash
# الانتقال للمشروع
cd /path/to/erp_project

# إنشاء ملف .env
cp .env.example .env

# تحرير .env بالقيم الفعلية
# MONGO_ROOT_PASSWORD=your-strong-password
# JWT_SECRET=your-jwt-secret

# بدء الخدمات
docker-compose up -d

# التحقق من الخدمات
docker-compose ps

# عرض السجلات
docker-compose logs -f backend

# إيقاف الخدمات
docker-compose down

# إزالة الفقاعات والأرتال
docker-compose down -v
```

### التحقق من الاتصالات

```bash
# اختبار الخادم
curl http://localhost:3001/health

# اختبار MongoDB
docker-compose exec mongodb mongosh admin --eval "db.adminCommand('ping')"

# اختبار Redis
docker-compose exec redis redis-cli ping

# عرض السجلات
docker-compose logs mongodb
docker-compose logs redis
docker-compose logs backend
```

---

## 🔐 Container Registry

### استخدام GitHub Container Registry (GHCR)

```bash
# المصادقة
echo $CR_PAT | docker login ghcr.io -u USERNAME --password-stdin

# وضع العلامة
docker tag erp-backend:latest ghcr.io/username/erp-backend:latest

# الدفع
docker push ghcr.io/username/erp-backend:latest

# الرحم من السجل
docker run ghcr.io/username/erp-backend:latest
```

### استخدام Docker Hub

```bash
# المصادقة
docker login

# وضع العلامة
docker tag erp-backend:latest yourusername/erp-backend:latest

# الدفع
docker push yourusername/erp-backend:latest
```

---

## ☸️ Kubernetes Deployment

### المتطلبات

```bash
# تثبيت kubectl
# Windows: https://kubernetes.io/docs/tasks/tools/install-kubectl-on-windows/

# التحقق من التثبيت
kubectl version --client

# تثبيت Minikube (للاختبار المحلي)
# أو استخدام: Docker Desktop k8s, Kind, K3s, etc.
```

### البنية

```text
k8s/
├── 01-namespace-config.yaml      # Namespace, ConfigMap, Secret, PV
├── 02-mongodb-statefulset.yaml   # MongoDB StatefulSet + Service
├── 03-redis-deployment.yaml      # Redis Deployment + Service
├── 04-backend-deployment.yaml    # Backend Deployment + Service + HPA
└── 05-ingress-network-policy.yaml # Ingress + Network Policies
```

### النشر على Kubernetes

```bash
# العرض المسبق
kubectl apply -f k8s/ --dry-run=client

# التطبيق الفعلي
kubectl apply -f k8s/

# انتظر المحاور
kubectl rollout status deployment/backend -n erp-production --timeout=5m

# التحقق من الحالة
kubectl get pods -n erp-production
kubectl get svc -n erp-production
kubectl get ingress -n erp-production

# عرض السجلات
kubectl logs -f deployment/backend -n erp-production

# الوصول للحاوية
kubectl exec -it pod/backend-xxx -n erp-production -- sh
```

### Horizontal Pod Autoscaling (HPA)

```bash
# عرض الحالة
kubectl get hpa -n erp-production

# مراقبة التوسع
kubectl get hpa -n erp-production --watch

# يدويً (اختياري)
kubectl autoscale deployment backend --min=3 --max=10 --cpu-percent=70
```

---

## 🚀 CI/CD Pipeline (GitHub Actions)

### Workflows المنشأة

```text
.github/workflows/
├── test-build-backend.yml   # اختبار وبناء الصور
└── deploy-k8s.yml          # نشر على Kubernetes
```

### Trigger Events

```yaml
test-build-backend.yml:
  - Push إلى main/develop
  - Pull Request إلى main/develop
  - تغييرات في backend/

deploy-k8s.yml:
  - Push إلى main
  - إكمال test-build-backend.yml بنجاح
  - تغييرات في k8s/ أو docker-compose.yml
```

### Pipeline Stages

```text
┌─────────────────────────────────────────────────────────────┐
│                    Test & Build Pipeline                    │
├─────────────────────────────────────────────────────────────┤
│ 1. Lint              → العثور على أخطاء الكود                 │
│ 2. Unit Tests        → اختبار المنطق                        │
│ 3. Integration Tests → اختبار التكامل                       │
│ 4. Build Docker      → بناء الصورة                          │
│ 5. Push Registry     → دفع للسجل                            │
│ 6. Security Scan     → فحص الأمان                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Deploy Pipeline (Manual)                   │
├─────────────────────────────────────────────────────────────┤
│ 1. Update k8s manifests                                     │
│ 2. Apply configurations                                     │
│ 3. Rollout deployment                                       │
│ 4. Health checks                                            │
│ 5. Slack notification                                       │
└─────────────────────────────────────────────────────────────┘
```

### GitHub Secrets المطلوبة

```yaml
Secrets:
  KUBE_CONFIG           # محتويات ~/.kube/config (base64)
  DOCKER_USERNAME       # اسم المستخدم لـ Docker Registry
  DOCKER_PASSWORD       # كلمة مرور Docker
  SLACK_WEBHOOK_URL     # لتنبيهات Slack
  SNYK_TOKEN            # لفحص الأمان
```

### إضافة Secrets إلى GitHub

```bash
# ترميز kubeconfig
cat ~/.kube/config | base64 > kube_config_base64.txt

# نسخ المحتوى وإضافته إلى GitHub Secrets
# Settings > Secrets and variables > Actions > New repository secret
```

---

## 📊 Monitoring & Logging

### Prometheus Metrics

```bash
# تنبيهات من backend
curl http://localhost:3001/metrics

# الإشارات المتاحة
- http_request_duration_seconds
- http_requests_total
- mongodb_query_duration_seconds
```

### ELK Stack (Elasticsearch, Logstash, Kibana)

```yaml
# تكوين logstash
input {
tcp {
port => 5000
codec => json
}
}

output {
elasticsearch {
hosts => ["elasticsearch:9200"]
index => "backend-%{+YYYY.MM.dd}"
}
}
```

### Structured Logging

```javascript
// مثال من الكود
logger.info('User login', {
  userId: user.id,
  timestamp: new Date(),
  ip: req.ip,
  userAgent: req.get('user-agent'),
});
```

---

## 🔧 Troubleshooting

### المشاكل الشائعة

#### 1. الحاوية تفشل في البدء

```bash
# عرض السجلات
docker-compose logs backend

# الأسباب الشائعة
❌ منفذ مشغول
   → الحل: تغيير PORT أو اغلق العملية

❌ MongoDB غير متاح
   → الحل: انتظر أو تحقق من mongodb service

❌ متغيرات البيئة مفقودة
   → الحل: أضف إلى .env
```

#### 2. خطأ الاتصال بـ MongoDB

```bash
# اختبار الاتصال
docker-compose exec backend \
  npm run test:database

# التحقق من السجلات
docker-compose logs mongodb

# إعادة تعيين البيانات
docker-compose down -v
docker-compose up -d
```

#### 3. تحسين الأداء

```bash
# عرض استهلاك الموارد
docker stats

# الحد الأقصى للموارد في docker-compose.yml
services:
  backend:
    deploy:
      limits:
        cpus: '0.5'
        memory: 512M
```

#### 4. مشاكل Kubernetes

```bash
# تحقق من الحالة
kubectl get events -n erp-production

# استكشف Pod
kubectl describe pod backend-xxx -n erp-production

# السجلات
kubectl logs pod/backend-xxx -n erp-production

# Interface الداخلية
kubectl exec -it pod/backend-xxx -- /bin/sh
```

---

## 📈 قائمة المراجعة للنشر

### قبل النشر

```text
✅ اختبارات محلية تمر
✅ اختبارات وحدة تمر
✅ اختبارات التكامل تمر
✅ Docker image يبني بنجاح
✅ docker-compose stack يعمل محلياً
✅ Kubernetes manifests صحيح
✅ متغيرات البيئة مكتملة
✅ الأسرار المشفرة مضبوطة
✅ Ingress مشفرة (HTTPS)
```

### أثناء النشر

```text
✅ Backup يعمل
✅ Monitoring جاهز
✅ Logging مفعل
✅ Alerts مشفر
✅ Rollback plan جاهز
✅ Documentation محدثة
✅ Team مخطر
```

### بعد النشر

```text
✅ Health checks تمر
✅ الخدمات متاحة
✅ Logs تبدو جيدة
✅ No error spikes
✅ Performance acceptable
✅ Rollout successful
```

---

## 📚 المراجع والموارد

### التوثيق الرسمية

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [GitHub Actions](https://docs.github.com/en/actions)

### الأدوات والخدمات

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Minikube](https://minikube.sigs.k8s.io/)
- [K3s](https://k3s.io/)
- [GitHub Container Registry](https://docs.github.com/en/packages)

### أمان وأفضل الممارسات

- [OWASP Docker Security](https://owasp.org/)
- [Kubernetes Security](https://kubernetes.io/docs/concepts/security/)
- [CIS Benchmarks](https://www.cisecurity.org/)

---

## 🎯 الخطوات التالية

### Phase 34: Advanced Features

```text
[ ] شبكات متقدمة (Advanced Networking)
[ ] التنبؤ بـ AI
[ ] إجراءات متقدمة للتحليل
[ ] الدعم متعدد اللغات
[ ] وضع مظلم
[ ] التكاملات المتقدمة
```

---

## 📞 الدعم

للمساعدة والدعم:

- 📧 Email: support@company.com
- 💬 Chat: #devops في Slack
- 🐛 Issues: https://github.com/repo/issues

---

**Status: ✅ PHASE 33 PRODUCTION DEPLOYMENT READY**
**Version: Phase 33 v1.0.0**
**Last Updated: 2024**

_تم إنشاؤه بعناية وتفاني_ ❤️
