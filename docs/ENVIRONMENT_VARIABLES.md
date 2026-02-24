# 🌍 Environment Variables Complete Reference

**Version:** 1.0.0  
**Date:** February 24, 2026  
**Status:** Production Ready  

---

## 📋 Overview

This guide covers all environment variables needed for ALAWAEL ERP system across all environments: Development, Testing, Staging, and Production.

---

## 🔑 Core Configuration

```env
# Application Identity
NODE_ENV=production              # development, testing, staging, production
APP_NAME=ALAWAEL ERP           # Application name
APP_VERSION=1.0.0              # Current version
PORT=3000                       # API port
HOST=0.0.0.0                   # Listen on all interfaces

# Environment Specific
DEBUG=false                      # Enable debug mode
LOG_LEVEL=info                  # error, warn, info, debug, trace
```

**Example Combinations:**

```env
# Development
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug

# Production
NODE_ENV=production
DEBUG=false
LOG_LEVEL=warn
```

---

## 📊 Database Configuration

### MongoDB

```env
# Connection
MONGODB_URI=mongodb://user:password@host:port/database
MONGODB_USER=alawael
MONGODB_PASSWORD=secure_password_here
MONGODB_HOST=localhost           # or mongo (docker)
MONGODB_PORT=27017
MONGODB_DATABASE=alawael
MONGODB_AUTH_SOURCE=admin        # Usually 'admin'

# Connection Pool
DB_POOL_SIZE=10                  # Connection pool size
DB_CONNECTION_TIMEOUT=30000      # ms
DB_SOCKET_TIMEOUT=60000         # ms
DB_QUERY_TIMEOUT=60000          # ms
DB_RETRY_ATTEMPTS=3             # Retry count
```

### Replica Set (Production)

```env
MONGODB_REPLICA_SET=rs0
MONGODB_REPLICA_HOSTS=mongodb-1:27017,mongodb-2:27017,mongodb-3:27017
MONGODB_READ_PREFERENCE=secondary
```

### Testing Database

```env
TEST_MONGODB_URI=mongodb://localhost:27017/alawael-test
TEST_DB_CLEAR_ON_START=true
```

---

## 💾 Redis Cache Configuration

```env
# Connection
REDIS_HOST=localhost            # or redis (docker)
REDIS_PORT=6379
REDIS_PASSWORD=                 # Leave empty if no auth
REDIS_DB=0                      # Database number (0-15)
REDIS_URL=redis://localhost:6379

# Cache Settings
CACHE_ENABLED=true
CACHE_TTL=3600                  # Default TTL in seconds (1 hour)
CACHE_PREFIX=alawael:           # Key prefix
REDIS_CLUSTER=false             # Enable cluster mode
REDIS_CLUSTER_NODES=node1,node2,node3

# Sentinel (High Availability)
REDIS_SENTINEL_ENABLED=false
REDIS_SENTINEL_NODES=sentinel-1:26379,sentinel-2:26379
REDIS_SENTINEL_NAME=mymaster
```

---

## 🔐 Security

### Authentication

```env
# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_prod
JWT_EXPIRY=7d                   # 7 days, can use: 1h, 24h, 7d, 30d
JWT_REFRESH_SECRET=refresh_secret_key_here
JWT_REFRESH_EXPIRY=30d

# Session
SESSION_SECRET=your_session_secret_key_here
SESSION_TIMEOUT=1800             # 30 minutes in seconds
SESSION_COOKIE_SECURE=true       # HTTPS only
SESSION_COOKIE_HTTPONLY=true     # No JS access
SESSION_COOKIE_SAMESITE=Strict   # CSRF protection

# Password
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL=true
```

### Encryption

```env
# Data Encryption
ENCRYPTION_KEY=your_encryption_key_change_in_prod
ENCRYPTION_ALGORITHM=aes-256-cbc
HASHING_ALGORITHM=bcrypt

# Bcrypt
BCRYPT_ROUNDS=10               # Higher = slower but more secure (10-12)
```

### CORS & Headers

```env
# CORS
CORS_ENABLED=true
CORS_ORIGIN=http://localhost:3001,https://yourdomain.com
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,DELETE,PATCH
CORS_HEADERS=Content-Type,Authorization

# Security Headers
HELMET_ENABLED=true
HELMET_HSTS_MAX_AGE=31536000    # 1 year
HELMET_FRAME_GUARD=deny
HELMET_CONTENT_SECURITY_POLICY=true
```

---

## 📧 Communication Services

### Email (SMTP)

```env
# Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true               # Use TLS/SSL
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password

# SendGrid
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxx

# AWS SES
EMAIL_PROVIDER=aws-ses
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY=
AWS_SES_SECRET_KEY=

# General
SMTP_FROM=noreply@alawael.com
SMTP_FROM_NAME=ALAWAEL ERP
EMAIL_TEMPLATES_PATH=./templates/emails
```

### SMS

```env
# Twilio
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE=+1234567890

# Nexmo
SMS_PROVIDER=nexmo
NEXMO_API_KEY=your_key
NEXMO_API_SECRET=your_secret
NEXMO_FROM=ALAWAEL

# AWS SNS
SMS_PROVIDER=aws-sns
AWS_SNS_REGION=us-east-1
AWS_SNS_ACCESS_KEY=
AWS_SNS_SECRET_KEY=
```

### WhatsApp

```env
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=twilio        # or meta
WHATSAPP_ACCOUNT_SID=
WHATSAPP_AUTH_TOKEN=
WHATSAPP_PHONE=+1234567890
```

---

## 🌐 Cloud Services

### AWS

```env
# Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# S3 (File Storage)
S3_BUCKET=alawael-uploads
S3_BUCKET_REGION=us-east-1
S3_ACL=private
S3_ENCRYPTION=AES256

# CloudFront (CDN)
CLOUDFRONT_DISTRIBUTION_ID=E1234EXAMPLE
CLOUDFRONT_DOMAIN=d123456.cloudfront.net

# SQS (Message Queue)
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456/alawael
SQS_REGION=us-east-1
```

### Google Cloud

```env
# Credentials
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
GCP_PROJECT_ID=alawael-project
GCP_REGION=us-central1

# Cloud Storage
GCS_BUCKET=alawael-uploads
GCS_KEYFILE=/path/to/keyfile.json

# Firebase
FIREBASE_PROJECT_ID=alawael-firebase
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL=firebase-admin@alawael.iam.gserviceaccount.com
```

---

## 📱 Push Notifications

### Firebase Cloud Messaging

```env
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
FIREBASE_CLIENT_EMAIL=firebase-admin@...iam.gserviceaccount.com
FCM_API_KEY=
```

### OneSignal

```env
ONESIGNAL_APP_ID=
ONESIGNAL_REST_API_KEY=
ONESIGNAL_USER_AUTH_KEY=
```

---

## 📊 Monitoring & Logging

### Sentry (Error Tracking)

```env
SENTRY_ENABLED=true
SENTRY_DSN=https://xxxxx@sentry.io/projectid
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Datadog (APM & Monitoring)

```env
DATADOG_ENABLED=true
DATADOG_API_KEY=
DATADOG_APP_KEY=
DATADOG_SITE=datadoghq.com
DATADOG_SERVICE_NAME=alawael-backend
DATADOG_ENVIRONMENT=production
DATADOG_TRACE_ENABLED=true
DATADOG_METRICS_ENABLED=true
```

### CloudWatch (AWS Logs)

```env
CLOUDWATCH_ENABLED=true
CLOUDWATCH_REGION=us-east-1
CLOUDWATCH_LOG_GROUP=/alawael/backend
CLOUDWATCH_LOG_STREAM=production
```

### ELK Stack (Elasticsearch, Logstash, Kibana)

```env
ELK_ENABLED=true
ELASTICSEARCH_HOST=localhost:9200
ELASTICSEARCH_NODE=http://elasticsearch:9200
LOGSTASH_HOST=localhost:5000
KIBANA_URL=http://localhost:5601
```

---

## 🎯 Feature Flags

```env
# Features
FEATURE_TELEMEDICINE=true
FEATURE_SUPPLY_CHAIN=true
FEATURE_ADVANCED_ANALYTICS=true
FEATURE_GPS_TRACKING=true
FEATURE_NOTIFICATIONS=true
FEATURE_OFFLINE_SYNC=true
FEATURE_AI_PREDICTIONS=true

# Beta Features
FEATURE_NEW_UI=false
FEATURE_EXPERIMENTAL_API=false

# Limits
FEATURE_MAX_CONCURRENT_USERS=1000
FEATURE_API_RATE_LIMIT=100        # requests per minute
FEATURE_FILE_UPLOAD_SIZE=104857600 # 100MB
```

---

## 🗺️ Deployment Specific Variables

### Development

```env
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:3001,http://localhost:3002
SECURE_COOKIES=false
RATE_LIMITING_ENABLED=false
```

### Staging

```env
NODE_ENV=staging
DEBUG=false
LOG_LEVEL=info
CORS_ORIGIN=https://staging.yourdomain.com
SECURE_COOKIES=true
RATE_LIMITING_ENABLED=true
```

### Production

```env
NODE_ENV=production
DEBUG=false
LOG_LEVEL=warn
CORS_ORIGIN=https://yourdomain.com
SECURE_COOKIES=true
SESSION_COOKIE_SECURE=true
RATE_LIMITING_ENABLED=true
RATE_LIMIT=100
```

---

## 🔍 How to Set Environment Variables

### Method 1: .env File (Local Development)

```bash
# Create backend/.env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/alawael
REDIS_HOST=localhost
JWT_SECRET=dev_secret_key
```

### Method 2: Command Line

```bash
export NODE_ENV=production
export MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/alawael
npm start
```

### Method 3: Docker

```bash
docker run -e NODE_ENV=production \
           -e MONGODB_URI=mongodb://mongo:27017/alawael \
           alawael-backend:1.0.0
```

### Method 4: Docker Compose

```yaml
services:
  backend:
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://mongo:27017/alawael
```

### Method 5: Kubernetes Secrets

```bash
kubectl create secret generic alawael-env \
  --from-literal=MONGODB_URI=mongodb://... \
  --from-literal=JWT_SECRET=...

# Reference in pod
env:
  - name: MONGODB_URI
    valueFrom:
      secretKeyRef:
        name: alawael-env
        key: MONGODB_URI
```

---

## ✅ Validation

### Environment Checker Script

```bash
#!/bin/bash
# check-env.sh

required_vars=(
  "NODE_ENV"
  "MONGODB_URI"
  "REDIS_HOST"
  "JWT_SECRET"
  "SMTP_HOST"
)

missing=()
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    missing+=($var)
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "❌ Missing variables: ${missing[@]}"
  exit 1
fi

echo "✅ All required variables set"
```

---

## 🔒 Security Best Practices

1. **Never commit .env files** - Add to `.gitignore`
2. **Use different secrets per environment**
3. **Rotate secrets regularly** (quarterly minimum)
4. **Use strong random secrets** (32+ characters)
5. **Enable encryption** for sensitive data
6. **Audit access logs** regularly
7. **Use vaults** for secret management (AWS Secrets Manager, HashiCorp Vault)
8. **Restrict variable access** by role/permission

---

## 📚 Reference Table

| Variable | Type | Required | Default | Example |
|----------|------|----------|---------|---------|
| NODE_ENV | string | Yes | - | production |
| MONGODB_URI | string | Yes | - | mongodb://localhost:27017/alawael |
| JWT_SECRET | string | Yes | - | random_32_char_string |
| REDIS_HOST | string | No | localhost | redis |
| SMTP_HOST | string | No | - | smtp.gmail.com |
| CORS_ORIGIN | string | No | * | https://domain.com |

---

## 🆘 Troubleshooting

**Missing variable error?**
```bash
# Check if variable is set
echo $MONGODB_URI

# Check .env file
cat backend/.env | grep MONGODB_URI

# Load env file
source backend/.env
```

**Wrong value?**
```bash
# Verify loaded value
node -e "console.log(process.env.MONGODB_URI)"

# Check for typos in .env
grep MONGODB backend/.env | wc -l
```

---

**Last Updated:** February 24, 2026  
**Version:** 1.0.0

