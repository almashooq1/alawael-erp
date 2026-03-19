# ═══════════════════════════════════════════════════════════════
# ALAWAEL ERP - Environment Configuration Reference
# All Environment Variables Used Across the System
# Date: March 2, 2026
# ═══════════════════════════════════════════════════════════════

## NODE ENVIRONMENT SETTINGS
NODE_ENV=production                           # production, development, staging, test
NODE_OPTIONS=--max-old-space-size=4096        # Memory limit for Node process

## 🗄️ DATABASE CONFIGURATION

### PostgreSQL (Main Relational Database)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=alawael_user
POSTGRES_PASSWORD=SecurePass2026!            # ⚠️ CHANGE THIS!
POSTGRES_DB=alawael_erp
DATABASE_URL=postgresql://alawael_user:SecurePass2026!@localhost:5432/alawael_erp

# Connection Pool Settings
POSTGRES_MAX_CONNECTIONS=100
POSTGRES_IDLE_TIMEOUT=30000
POSTGRES_STATEMENT_TIMEOUT=30000
POSTGRES_QUERY_TIMEOUT=30000

# SSL/TLS for database
POSTGRES_SSL=false                            # Set to true in production with certificates

### MongoDB (Document Storage for SCM)
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_USER=admin
MONGODB_PASSWORD=MongoSecure2026!            # ⚠️ CHANGE THIS!
MONGODB_AUTH_SOURCE=admin
MONGODB_DATABASE=alawael_scm
MONGODB_URL=mongodb://admin:MongoSecure2026!@localhost:27017/alawael_scm?authSource=admin

# MongoDB Connection Pool
MONGODB_MAX_POOL_SIZE=50
MONGODB_TIMEOUT=30000

### Redis (Cache & Sessions)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=RedisSecure2026!              # ⚠️ CHANGE THIS!
REDIS_DB=0
REDIS_URL=redis://:RedisSecure2026!@localhost:6379

# Redis Configuration
REDIS_CACHE_TTL=3600                         # 1 hour
REDIS_SESSION_TTL=86400                      # 24 hours
REDIS_KEY_PREFIX=alawael:

---

## 🔐 SECURITY & AUTHENTICATION

### JWT (JSON Web Tokens)
JWT_SECRET=JWTSecureKey2026!RandomString32Chars  # ⚠️ Must be 32+ characters!
JWT_EXPIRES_IN=7d
JWT_ALGORITHM=HS256
JWT_ISSUER=alawael-erp
JWT_AUDIENCE=alawael-api

### Session Management
SESSION_SECRET=SessionSecret2026!RandomString32Chars  # ⚠️ Must be 32+ characters!
SESSION_MAX_AGE=86400000                     # 24 hours in milliseconds
SESSION_SECURE=false                         # Set to true in production with HTTPS
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax

### Encryption
ENCRYPTION_KEY=EncryptionKey2026!Random32Ch  # ⚠️ Must be exactly 32 characters!
ENCRYPTION_ALGORITHM=aes-256-cbc

### API Key (Optional)
API_KEY_SECRET=APISecure2026!RandomString32

---

## 🖥️ SERVICE PORTS & ENDPOINTS

### Backend Services
BACKEND_HOST=0.0.0.0
BACKEND_PORT=3001
BACKEND_URL=http://localhost:3001

SCM_BACKEND_HOST=0.0.0.0
SCM_BACKEND_PORT=3002
SCM_BACKEND_URL=http://localhost:3002

DASHBOARD_SERVER_HOST=0.0.0.0
DASHBOARD_SERVER_PORT=3004
DASHBOARD_SERVER_URL=http://localhost:3004

### Frontend Services
SCM_FRONTEND_PORT=3000
SCM_FRONTEND_URL=http://localhost:3000

DASHBOARD_CLIENT_PORT=3005
DASHBOARD_CLIENT_URL=http://localhost:3005

### Nginx Proxy
NGINX_HOST=0.0.0.0
NGINX_PORT=80
NGINX_SSL_PORT=443

---

## 🌐 CORS & SECURITY

CORS_ORIGIN=http://localhost:3000,http://localhost:3005,http://localhost:3001
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,DELETE,PATCH,OPTIONS
CORS_ALLOW_HEADERS=Content-Type,Authorization,X-Requested-With

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000                  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Login Attempt Limits
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_TIME=900000                       # 15 minutes

---

## 📧 EMAIL CONFIGURATION (Optional)

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@alawael.local
EMAIL_FROM_NAME=ALAWAEL ERP

---

## 📱 SMS CONFIGURATION (Optional - Twilio)

TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

---

## 📁 FILE UPLOAD CONFIGURATION

MAX_FILE_SIZE=52428800                       # 50MB
UPLOAD_DIR=./uploads
UPLOAD_TEMP_DIR=./uploads/temp
ALLOWED_FILE_TYPES=jpeg,jpg,png,pdf,xls,xlsx,doc,docx
ALLOWED_IMAGE_TYPES=jpeg,jpg,png,gif,webp

---

## 📊 LOGGING CONFIGURATION

LOG_LEVEL=info                                # error, warn, info, debug, trace
LOG_DIR=./logs
LOG_FORMAT=json                               # json, text
LOG_MAX_FILES=14d                             # Retention period
LOG_MAX_SIZE=20m                              # File size before rotation
LOG_COLORIZE=true

# Specific Service Logs
LOG_BACKEND=./logs/backend.log
LOG_SCM=./logs/scm.log
LOG_DASHBOARD=./logs/dashboard.log
LOG_ERROR=./logs/error.log

---

## 🔍 MONITORING & METRICS

ENABLE_METRICS=true
METRICS_PORT=9090
ENABLE_HEALTH_CHECK=true
HEALTH_CHECK_INTERVAL=30000

# APM (Application Performance Monitoring)
APM_ENABLED=false
APM_SERVICE_NAME=alawael-erp
APM_SERVER_URL=http://apm-server:8200

---

## 🎯 FEATURE FLAGS

ENABLE_SWAGGER=true
ENABLE_GRAPHQL=false
ENABLE_ANALYTICS=true
ENABLE_NOTIFICATIONS=true
ENABLE_AUDIT_LOG=true
ENABLE_RBAC=true
ENABLE_ADVANCED_FEATURES=true

---

## 💾 BACKUP & DATABASE SETTINGS

BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=30
AUTO_BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *                    # 2 AM daily

# Database Migrations
DB_MIGRATION_DIR=./migrations
AUTO_RUN_MIGRATIONS=true

---

## 🔧 DEVELOPMENT SETTINGS (Development Only)

DEBUG=alawael:*
REQUEST_LOGGING=true
RESPONSE_COMPRESSION=false
DETAILED_ERROR_MESSAGES=true
SQL_LOGGING=false

---

## 🚀 PERFORMANCE TUNING

CACHE_ENABLED=true
CACHE_TTL=3600                               # 1 hour
MAX_CONNECTIONS=100
QUERY_TIMEOUT=30000                          # 30 seconds
API_TIMEOUT=60000                            # 60 seconds

# Request Optimization
ENABLE_COMPRESSION=true
COMPRESSION_LEVEL=6
COMPRESSION_THRESHOLD=1024

---

## 📈 ANALYTICS & REPORTING

ANALYTICS_ENABLED=true
ANALYTICS_RETENTION_DAYS=90
GENERATE_REPORTS=true
REPORT_SCHEDULE=0 0 * * 0                    # Weekly Sunday 00:00

---

## 🌍 MULTI-LANGUAGE & LOCALIZATION

DEFAULT_LANGUAGE=ar
SUPPORTED_LANGUAGES=ar,en,fr
DEFAULT_TIMEZONE=Asia/Riyadh
CURRENCY=SAR

---

## 🔗 THIRD-PARTY INTEGRATIONS (Future)

# Stripe (Payment Processing)
STRIPE_PUBLIC_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx

# AWS Services
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Google Services
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

---

## 🆔 DOCKER CONTAINER ENVIRONMENT

CONTAINER_NAME=alawael-backend
CONTAINER_REGISTRY=docker.io
CONTAINER_IMAGE_TAG=1.0.0

---

## ✨ SYSTEM CONFIGURATION SUMMARY

```
Environment: Production
Mode: Full Stack (PostgreSQL + MongoDB + Redis)
Region: Saudi Arabia (GMT+3)
Language: Arabic (Default)
Timezone: Asia/Riyadh
Security: JWT + Session-based
Logging: JSON format
Monitoring: Enabled for all services
Backup: Daily automated backups
```

---

## 📝 NOTES FOR OPERATIONS TEAM

1. **Password Requirements:**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Change every 90 days
   - Do NOT commit to git

2. **JWT Secret Requirements:**
   - Minimum 32 random characters
   - Use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

3. **Certificate Setup (HTTPS):**
   - Copy SSL certificates to `./nginx/ssl/`
   - Update nginx.conf with certificate paths
   - Set SESSION_SECURE=true

4. **Database Backups:**
   - Automated daily at 2 AM
   - Retained for 30 days
   - Location: `./backups/`

5. **Emergency Recovery:**
   - Use `rollback.ps1` for quick recovery
   - Backups are automatically restored
   - Data preserved by default

---

## 🔄 Configuration Update Process

1. Edit environment file
2. Restart affected services
3. Verify health checks pass
4. Monitor error logs for issues
5. Document changes in changelog

---

**Last Updated:** March 2, 2026
**Version:** 1.0.0
**Status:** Production Ready

