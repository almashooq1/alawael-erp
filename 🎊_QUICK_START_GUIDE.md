# 🎊 دليل التشغيل والبدء السريع

# Quick Start & Setup Guide

**التاريخ:** 14 يناير 2026  
**الإصدار:** 1.0  
**الحالة:** ✅ دليل شامل للتشغيل

---

## 🚀 البدء السريع (5 دقائق)

### الخطوة 1: متطلبات النظام

```bash
# تحقق من الإصدارات
python --version    # Python 3.11+
node --version      # Node.js 18+
npm --version       # npm 9+
docker --version    # Docker 24+

# قواعد البيانات
mongodb --version   # MongoDB 7.0+
redis-server --version  # Redis 7.0+
```

### الخطوة 2: استنساخ المشروع

```bash
# استنساخ من Git
git clone https://github.com/your-org/rehabilitation-system.git
cd rehabilitation-system

# أو إنشاء من الصفر
mkdir rehabilitation-system
cd rehabilitation-system
```

### الخطوة 3: إعداد Backend

```bash
cd backend

# إنشاء بيئة افتراضية
python -m venv venv

# تفعيل البيئة
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# تثبيت التبعيات
pip install -r requirements.txt

# نسخ ملف البيئة
copy .env.example .env
# أو
cp .env.example .env

# تعديل .env
# أضف المفاتيح والإعدادات المطلوبة
```

### الخطوة 4: إعداد Frontend

```bash
cd ../frontend

# تثبيت التبعيات
npm install

# نسخ ملف البيئة
copy .env.example .env
# أو
cp .env.example .env

# تعديل .env
# أضف عنوان API
```

### الخطوة 5: تشغيل قواعد البيانات

```bash
# تشغيل MongoDB
mongod --dbpath /data/db

# تشغيل Redis
redis-server

# أو باستخدام Docker
docker-compose up -d mongodb redis
```

### الخطوة 6: تشغيل التطبيق

```bash
# Terminal 1 - Backend
cd backend
python app.py

# Terminal 2 - Frontend
cd frontend
npm start
```

### الخطوة 7: فتح المتصفح

```
Frontend: http://localhost:3000
Backend API: http://localhost:5000/api
```

---

## 🐳 التشغيل باستخدام Docker

### طريقة سريعة (موصى بها)

```bash
# بناء وتشغيل جميع الخدمات
docker-compose up -d

# متابعة السجلات
docker-compose logs -f

# التحقق من الحالة
docker-compose ps

# الوصول للتطبيق
# Frontend: http://localhost
# Backend: http://localhost:5000
```

### بناء صور Docker يدوياً

```bash
# Backend
cd backend
docker build -t rehabilitation/backend:latest .

# Frontend
cd frontend
docker build -t rehabilitation/frontend:latest .

# تشغيل
docker run -d -p 5000:5000 rehabilitation/backend:latest
docker run -d -p 80:80 rehabilitation/frontend:latest
```

---

## ☸️ النشر على Kubernetes

### الطريقة السريعة

```bash
# تطبيق جميع الملفات
kubectl apply -f k8s/

# متابعة الحالة
kubectl get pods -n rehabilitation-system -w

# الحصول على عنوان الخدمة
kubectl get svc -n rehabilitation-system
```

### خطوة بخطوة

```bash
# 1. إنشاء Namespace
kubectl apply -f k8s/namespace.yaml

# 2. إنشاء Secrets
kubectl create secret generic rehabilitation-secrets \
  --from-literal=MONGO_PASSWORD=yourpassword \
  --from-literal=REDIS_PASSWORD=yourpassword \
  --from-literal=JWT_SECRET=yoursecret \
  -n rehabilitation-system

# 3. تطبيق ConfigMaps
kubectl apply -f k8s/configmap.yaml

# 4. نشر قواعد البيانات
kubectl apply -f k8s/mongodb-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml

# 5. انتظار الجاهزية
kubectl wait --for=condition=ready pod -l app=mongodb -n rehabilitation-system --timeout=120s

# 6. نشر التطبيقات
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# 7. تطبيق Ingress
kubectl apply -f k8s/ingress.yaml

# 8. تطبيق HPA
kubectl apply -f k8s/hpa.yaml
```

---

## ⚙️ ملفات البيئة

### Backend (.env)

```bash
# Flask
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-super-secret-key-change-in-production

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rehabilitation
MONGO_URI=mongodb://localhost:27017/rehabilitation

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET=your-jwt-secret-change-in-production

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Email
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=noreply@rehabilitation.com

# SMS
SMS_API_KEY=your-sms-api-key
SMS_API_URL=https://api.sms-provider.com

# Security
BCRYPT_LOG_ROUNDS=12

# CORS
CORS_ORIGINS=http://localhost:3000,https://rehabilitation.example.com

# Rate Limiting
RATELIMIT_STORAGE_URL=redis://localhost:6379/1

# Logging
LOG_LEVEL=INFO

# Maintenance
MAINTENANCE_MODE=False
```

### Frontend (.env)

```bash
# API
REACT_APP_API_URL=http://localhost:5000/api

# WebSocket
REACT_APP_WS_URL=ws://localhost:5000

# Features
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_AI_FEATURES=true

# External Services
REACT_APP_GOOGLE_MAPS_KEY=your-google-maps-key
REACT_APP_FIREBASE_CONFIG=your-firebase-config
```

---

## 📊 إعداد قاعدة البيانات

### PostgreSQL

```bash
# إنشاء قاعدة البيانات
createdb rehabilitation

# تشغيل الهجرات
cd backend
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

### MongoDB

```bash
# الاتصال بـ MongoDB
mongosh

# إنشاء قاعدة البيانات
use rehabilitation

# إنشاء مستخدم
db.createUser({
  user: "admin",
  pwd: "password",
  roles: [
    { role: "readWrite", db: "rehabilitation" }
  ]
})

# إنشاء مجموعات
db.createCollection("reports")
db.createCollection("sessions")
db.createCollection("assessments")

# إنشاء فهارس
db.reports.createIndex({ "user_id": 1, "created_at": -1 })
db.reports.createIndex({ "report_type": 1 })
db.reports.createIndex({ "beneficiary_id": 1 })
```

### Redis

```bash
# الاتصال بـ Redis
redis-cli

# تعيين كلمة مرور
CONFIG SET requirepass "yourpassword"
AUTH yourpassword

# اختبار
PING
# PONG
```

---

## 🔧 أوامر مفيدة

### Backend

```bash
# تشغيل التطوير
python app.py

# تشغيل الإنتاج
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# تشغيل الاختبارات
pytest

# تشغيل مع تغطية
pytest --cov=.

# فحص الكود
flake8 .
black .

# الهجرات
flask db migrate
flask db upgrade
flask db downgrade

# إنشاء مستخدم admin
python manage.py create_admin

# تحميل بيانات تجريبية
python manage.py seed_data
```

### Frontend

```bash
# تشغيل التطوير
npm start

# بناء للإنتاج
npm run build

# تشغيل الاختبارات
npm test

# تشغيل مع تغطية
npm test -- --coverage

# فحص الكود
npm run lint

# تنسيق الكود
npm run format

# تحليل حجم البناء
npm run build
npm install -g source-map-explorer
source-map-explorer 'build/static/js/*.js'
```

### Docker

```bash
# بناء
docker-compose build

# تشغيل
docker-compose up -d

# إيقاف
docker-compose down

# إيقاف مع حذف البيانات
docker-compose down -v

# متابعة السجلات
docker-compose logs -f [service_name]

# إعادة بناء خدمة محددة
docker-compose up -d --build backend

# تنفيذ أمر داخل حاوية
docker-compose exec backend bash
docker-compose exec mongodb mongosh

# تنظيف
docker system prune -a
```

### Kubernetes

```bash
# الحصول على الموارد
kubectl get all -n rehabilitation-system

# وصف مورد
kubectl describe pod <pod-name> -n rehabilitation-system

# متابعة السجلات
kubectl logs -f <pod-name> -n rehabilitation-system

# تنفيذ أمر داخل pod
kubectl exec -it <pod-name> -n rehabilitation-system -- bash

# Port forwarding
kubectl port-forward svc/backend 5000:5000 -n rehabilitation-system

# حذف pod (سيعاد إنشاؤه)
kubectl delete pod <pod-name> -n rehabilitation-system

# إعادة تشغيل deployment
kubectl rollout restart deployment backend -n rehabilitation-system

# التحقق من حالة rollout
kubectl rollout status deployment backend -n rehabilitation-system

# التراجع عن deployment
kubectl rollout undo deployment backend -n rehabilitation-system

# عرض أحداث
kubectl get events -n rehabilitation-system --sort-by='.lastTimestamp'
```

---

## 🧪 الاختبار

### Backend Tests

```bash
# تشغيل جميع الاختبارات
pytest

# تشغيل ملف محدد
pytest tests/test_auth.py

# تشغيل اختبار محدد
pytest tests/test_auth.py::test_login

# مع تغطية
pytest --cov=. --cov-report=html

# مع تقرير مفصل
pytest -v

# إيقاف عند أول فشل
pytest -x
```

### Frontend Tests

```bash
# تشغيل جميع الاختبارات
npm test

# تشغيل ملف محدد
npm test -- Login.test.js

# مع تغطية
npm test -- --coverage

# في وضع المراقبة
npm test -- --watch
```

---

## 📈 المراقبة

### Health Checks

```bash
# Backend
curl http://localhost:5000/health

# Frontend
curl http://localhost:3000

# Database
mongosh --eval "db.adminCommand('ping')"
redis-cli ping
```

### Logs

```bash
# Backend logs
tail -f backend/app.log

# Docker logs
docker-compose logs -f

# Kubernetes logs
kubectl logs -f deployment/backend -n rehabilitation-system
```

---

## 🔐 الأمان

### توليد مفاتيح

```python
# Python - توليد SECRET_KEY
import secrets
print(secrets.token_urlsafe(32))

# Python - توليد JWT_SECRET
import secrets
print(secrets.token_hex(32))
```

### SSL/TLS

```bash
# توليد شهادة للتطوير
openssl req -x509 -newkey rsa:4096 \
  -keyout key.pem -out cert.pem \
  -days 365 -nodes

# Let's Encrypt للإنتاج
certbot certonly --standalone \
  -d rehabilitation.example.com \
  -d api.rehabilitation.example.com
```

---

## 🐛 استكشاف الأخطاء

### مشاكل شائعة

**1. Backend لا يعمل**

```bash
# التحقق من المنفذ
netstat -ano | findstr :5000

# التحقق من البيئة
python -c "from config import Config; print(Config.DATABASE_URL)"

# إعادة تثبيت التبعيات
pip install -r requirements.txt --force-reinstall
```

**2. Frontend لا يعمل**

```bash
# مسح cache
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# التحقق من المنفذ
netstat -ano | findstr :3000
```

**3. قاعدة البيانات لا تتصل**

```bash
# MongoDB
mongosh --eval "db.adminCommand('ping')"

# Redis
redis-cli ping

# PostgreSQL
psql -U postgres -c "SELECT 1"
```

**4. Docker مشاكل**

```bash
# إعادة بناء كاملة
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d

# التحقق من السجلات
docker-compose logs
```

---

## 📚 موارد إضافية

### الوثائق

- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://react.dev/)
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

### الدعم

- GitHub Issues: https://github.com/your-org/rehabilitation-system/issues
- Email: support@rehabilitation.com
- Documentation: https://docs.rehabilitation.com

---

**آخر تحديث:** 14 يناير 2026  
**الحالة:** ✅ دليل شامل وجاهز
