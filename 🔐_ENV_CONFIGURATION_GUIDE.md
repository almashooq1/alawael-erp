# 🔐 .ENV Files - Template & Configuration

**التاريخ**: يناير 17, 2026  
**الأولوية**: 🔴 CRITICAL  
**الحالة**: شامل وجاهز للاستخدام

---

## 📋 .env.example - نموذج البيئة

```env
# ================================
# 🌐 البيئة الأساسية
# ================================

NODE_ENV=development
PORT=3001
HOST=localhost

# ================================
# 🔐 أمان التطبيق
# ================================

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024
JWT_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ================================
# 🗄️ قاعدة البيانات
# ================================

# Development (SQLite)
DB_TYPE=sqlite
DB_PATH=./data/app.db

# Production (MySQL/PostgreSQL)
# DB_TYPE=mysql
# DB_HOST=db.example.com
# DB_PORT=3306
# DB_USER=db_user
# DB_PASSWORD=secure-password
# DB_NAME=alawael_erp

# ================================
# 📧 البريد الإلكتروني
# ================================

MAIL_SERVICE=gmail
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_FROM_EMAIL=noreply@alawael.com
MAIL_FROM_NAME=نظام الألوايل
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# ================================
# 🔔 إخطارات SMS (اختياري)
# ================================

SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# ================================
# 📱 المصادقة الثنائية
# ================================

TOTP_WINDOW=30
TOTP_ISSUER=AlAwael-ERP
TOTP_APP_NAME=نظام الألوايل ERP

# ================================
# 🔗 خدمات خارجية (اختياري)
# ================================

# Redis (للـ Caching و Sessions)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# MongoDB (بديل للـ SQLite)
MONGODB_ENABLED=false
MONGODB_URI=mongodb://localhost:27017/alawael_erp

# ================================
# 📊 المراقبة والتسجيل
# ================================

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=./logs/app.log
LOG_MAX_FILES=10

# Error Tracking (Sentry)
SENTRY_ENABLED=false
SENTRY_DSN=https://your-sentry-dsn@sentry.io/123456

# ================================
# 🚀 النشر والـ DevOps
# ================================

# Frontend URL (للـ CORS وإعادة التوجيه)
FRONTEND_URL=http://localhost:5173

# API Documentation
API_DOCS_ENABLED=true
API_DOCS_URL=/api/docs

# Health Check
HEALTH_CHECK_ENABLED=true

# ================================
# 🔄 مهام في الخلفية (Background Jobs)
# ================================

BACKGROUND_JOBS_ENABLED=false
QUEUE_PROVIDER=bull
BULL_REDIS_URL=redis://localhost:6379

# ================================
# 📈 الإحصائيات والتحليل (اختياري)
# ================================

ANALYTICS_ENABLED=false
ANALYTICS_KEY=your-analytics-key

# ================================
# 🛡️ متقدم
# ================================

# HTTPS/SSL
HTTPS_ENABLED=false
SSL_CERT_PATH=
SSL_KEY_PATH=

# API Rate Limiting (متقدم)
ENABLE_RATE_LIMIT=true
RATE_LIMIT_STORAGE=memory

# Request Timeout (بالميلي ثانية)
REQUEST_TIMEOUT=30000

# Max JSON Payload Size
MAX_JSON_SIZE=10mb

# ================================
# ⚙️ تطوير فقط
# ================================

# Debug Mode
DEBUG=false
DEBUG_NAMESPACE=*

# Test Database
TEST_DB_PATH=./data/test.db

# Mock External Services
MOCK_EMAIL=false
MOCK_SMS=false
```

---

## 📝 .env.development - البيئة التطويرية

```env
NODE_ENV=development
PORT=3001
HOST=localhost

# Security (أقل من الإنتاج - للتطوير)
JWT_SECRET=dev-jwt-secret-2024-development
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173

# Database
DB_TYPE=sqlite
DB_PATH=./data/dev.db

# Email (Mock أو Mailtrap)
MAIL_SERVICE=mailtrap
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=your-mailtrap-user
MAIL_PASSWORD=your-mailtrap-password

# Logging
LOG_LEVEL=debug
LOG_FORMAT=text
DEBUG=true

# Features
API_DOCS_ENABLED=true
HEALTH_CHECK_ENABLED=true

# Redis (disabled في التطوير)
REDIS_ENABLED=false

# Background Jobs
BACKGROUND_JOBS_ENABLED=false

# Mock Services (للتطوير)
MOCK_EMAIL=true
MOCK_SMS=true
```

---

## 🚀 .env.production - بيئة الإنتاج

```env
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Security (عالي جداً)
JWT_SECRET=CHANGE-THIS-TO-SECURE-RANDOM-KEY-IN-PRODUCTION
JWT_EXPIRY=1d
JWT_REFRESH_EXPIRY=30d
CORS_ORIGIN=https://alawael.com,https://app.alawael.com
CORS_CREDENTIALS=true

# Database (MySQL/PostgreSQL قوي)
DB_TYPE=mysql
DB_HOST=prod-db.example.com
DB_PORT=3306
DB_USER=alawael_prod_user
DB_PASSWORD=STRONG-PASSWORD-HERE
DB_NAME=alawael_erp_prod
DB_POOL_MIN=5
DB_POOL_MAX=20

# Email (Gmail أو خدمة بريد موثوقة)
MAIL_SERVICE=gmail
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_FROM_EMAIL=noreply@alawael.com
MAIL_FROM_NAME=نظام الألوايل
MAIL_USER=your-prod-email@gmail.com
MAIL_PASSWORD=your-app-password

# Redis (مفعل للإنتاج)
REDIS_ENABLED=true
REDIS_HOST=prod-redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=STRONG-REDIS-PASSWORD
REDIS_DB=0

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=/var/log/alawael/app.log
LOG_MAX_FILES=30

# Error Tracking
SENTRY_ENABLED=true
SENTRY_DSN=https://your-sentry-dsn@sentry.io/123456
SENTRY_ENVIRONMENT=production

# Frontend
FRONTEND_URL=https://alawael.com

# HTTPS
HTTPS_ENABLED=true
SSL_CERT_PATH=/etc/ssl/certs/alawael.crt
SSL_KEY_PATH=/etc/ssl/private/alawael.key

# Performance
REQUEST_TIMEOUT=60000
MAX_JSON_SIZE=5mb

# Rate Limiting (أكثر صرامة)
ENABLE_RATE_LIMIT=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Background Jobs
BACKGROUND_JOBS_ENABLED=true
QUEUE_PROVIDER=bull
BULL_REDIS_URL=redis://:REDIS-PASSWORD@prod-redis.example.com:6379

# Monitoring
HEALTH_CHECK_ENABLED=true
API_DOCS_ENABLED=false

# Debug (معطل تماماً)
DEBUG=false
MOCK_EMAIL=false
MOCK_SMS=false
```

---

## 🧪 .env.test - بيئة الاختبارات

```env
NODE_ENV=test
PORT=3002
HOST=localhost

# Security (اختبار فقط)
JWT_SECRET=test-jwt-secret-do-not-use-production
JWT_EXPIRY=1h

# Database (In-memory أو SQLite منفصل)
DB_TYPE=sqlite
DB_PATH=./data/test.db

# Email & SMS (Mock)
MOCK_EMAIL=true
MOCK_SMS=true

# Redis (معطل)
REDIS_ENABLED=false

# Logging
LOG_LEVEL=error
DEBUG=false

# Features
API_DOCS_ENABLED=false
HEALTH_CHECK_ENABLED=false

# Test Mode
TEST_MODE=true
TEST_DB_SEED=true
```

---

## 🔐 نموذج .env.production.vault - ملف محمي

```
# استخدم هذا مع أدوات مثل dotenv-vault

# Encrypted Production Secrets

VAULT_ENCRYPTION_KEY=your-encryption-key
VAULT_VERSION=1.0

# Encrypted Values (مثال)
JWT_SECRET__VAULT=s/KQmVeHs7NXX...
DB_PASSWORD__VAULT=s/fDkxKKpZxQX...
MAIL_PASSWORD__VAULT=s/QpLmNwRsVxX...
REDIS_PASSWORD__VAULT=s/AbCdEfGhJkX...
```

---

## 📋 إعدادات Docker (.env للـ Docker)

```env
# .env.docker

# Docker Container Names
APP_CONTAINER=alawael-app
DB_CONTAINER=alawael-db
REDIS_CONTAINER=alawael-redis

# Database (للـ Docker Compose)
DB_ROOT_PASSWORD=root-password-docker
DB_USER=alawael_user
DB_PASSWORD=alawael_password
DB_NAME=alawael_erp

# Network
NETWORK_NAME=alawael-network

# Volumes
VOLUME_DB=/var/lib/mysql
VOLUME_LOGS=/var/log/alawael
```

---

## ✅ Checklist: إعدادات البيئة

```
قبل التطوير:
☐ انسخ .env.example إلى .env
☐ عدّل القيم حسب إعدادات التطوير
☐ تأكد من أن الملفات الحساسة في .gitignore
☐ اختبر الاتصال بقاعدة البيانات

قبل الاختبار:
☐ استخدم .env.test
☐ تأكد من DB منفصلة
☐ المخدمات الخارجية مقلدة (Mocked)

قبل الإنتاج:
☐ استخدم .env.production
☐ قيم أمان قوية جداً
☐ استخدم خدمات آمنة موثوقة
☐ فعّل جميع ميزات الأمان
☐ استخدم HTTPS و SSL
☐ إجازات من فريق الأمان

بعد التطبيق:
☐ دوّر الأسرار بانتظام
☐ راقب ملفات السجل
☐ اختبر الاتصالات الدورية
```

---

## 🛡️ نصائح الأمان

```
✅ المهم جداً:
1. لا تضع أسرار في الكود أبداً
2. استخدم متغيرات البيئة فقط
3. أضف .env إلى .gitignore
4. استخدم أسرار قوية (32+ حرف)
5. غيّر الأسرار بانتظام
6. لا تشارك الأسرار عبر البريد
7. استخدم أداة إدارة أسرار آمنة (مثل Vault)
```

---

**الحالة**: ✅ جاهز للاستخدام الفوري  
**آخر تحديث**: يناير 17, 2026
