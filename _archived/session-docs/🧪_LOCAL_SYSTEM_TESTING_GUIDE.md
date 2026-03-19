# 🧪 دليل اختبار النظام محلياً
## LOCAL SYSTEM TESTING GUIDE - MARCH 3, 2026

---

## 🎯 ملخص سريع

```
✅ الهدف: اختبار جميع المكونات محليً
⏱️ الوقت المتوقع: 30-45 دقيقة
📊 المكونات المراد اختبارها: 4 رئيسية
```

---

## 🚀 البدء السريع (5 دقائق)

### 1️⃣ تشغيل Backend

```powershell
# في المحطة الأولى:
cd dashboard/server
node index.js

# النتيجة المتوقعة:
# ✅ Server running on port 3001
# ✅ Connected to PostgreSQL
# ✅ Connected to Redis
```

### 2️⃣ التحقق من Health Endpoint

```powershell
# في محطة أخرى:
Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing

# النتيجة المتوقعة:
# StatusCode        : 200
# status           : healthy
# uptime.readable  : X minutes
```

### 3️⃣ تشغيل Frontend (اختياري)

```powershell
# في محطة ثالثة:
cd dashboard/client
npm start

# النتيجة المتوقعة:
# ✅ Compiled successfully
# ✅ Available at http://localhost:3000
```

---

## 📋 الاختبارات التفصيلية

### ✅ **اختبار 1: Health Check**

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
$health = $response.Content | ConvertFrom-Json

# تحقق من:
✓ $health.status = "healthy"
✓ $health.process.pid exists
✓ $health.uptime.readable exists
✓ $health.checks array not empty
```

**النتيجة المتوقعة:**
```json
{
  "status": "healthy",
  "process": {
    "pid": 12345,
    "memory": {
      "heapUsed": "45 MB",
      "heapTotal": "128 MB",
      "rss": "120 MB"
    }
  },
  "uptime": {
    "readable": "5 minutes",
    "milliseconds": 300000
  },
  "checks": [
    {
      "name": "Memory Usage",
      "status": "healthy",
      "value": "45 MB",
      "threshold": "512 MB"
    }
  ]
}
```

---

### ✅ **اختبار 2: Infrastructure Check**

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3001/health/infrastructure" -UseBasicParsing
$infra = $response.Content | ConvertFrom-Json

# تحقق من:
✓ $infra.status = "healthy"
✓ $infra.infrastructure.database.primary.healthy = true
✓ $infra.infrastructure.redis.healthy = true
✓ $infra.infrastructure.mongodb.healthy = true (إذا كان مستخدماً)
```

**النتيجة المتوقعة:**
```json
{
  "status": "healthy",
  "infrastructure": {
    "database": {
      "primary": {
        "healthy": true,
        "connections": "5/10",
        "latency": "2ms"
      }
    },
    "redis": {
      "healthy": true,
      "connected": true,
      "latency": "1ms"
    }
  }
}
```

---

### ✅ **اختبار 3: Database Metrics**

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3001/metrics/database" -UseBasicParsing
$dbMetrics = $response.Content | ConvertFrom-Json

# تحقق من:
✓ $dbMetrics.status = "connected"
✓ $dbMetrics.stats.primary.total > 0
✓ $dbMetrics.latency.avg < 10 (milliseconds)
```

**النتيجة المتوقعة:**
```json
{
  "status": "connected",
  "stats": {
    "primary": {
      "total": 5,
      "idle": 3,
      "active": 2
    }
  },
  "latency": {
    "min": 1,
    "avg": 3,
    "max": 8
  }
}
```

---

### ✅ **اختبار 4: Redis Metrics**

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3001/metrics/redis" -UseBasicParsing
$redisMetrics = $response.Content | ConvertFrom-Json

# تحقق من:
✓ $redisMetrics.status = "connected"
✓ $redisMetrics.stats.hits >= 0
✓ $redisMetrics.latency.avg < 5 (milliseconds)
```

**النتيجة المتوقعة:**
```json
{
  "status": "connected",
  "stats": {
    "commands": {
      "total": 100,
      "get": 50,
      "set": 30
    },
    "hits": 45,
    "misses": 55
  },
  "latency": {
    "avg": 2,
    "p95": 5
  }
}
```

---

## 🔧 سكريبت الاختبار الشامل

### تشغيل جميع الاختبارات (Copy-Paste Ready)

```powershell
# تشغيل Backend
Write-Host "🚀 بدء Backend..." -ForegroundColor Green
cd "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\dashboard\server"
Start-Process node -ArgumentList "index.js" -NoNewWindow
Start-Sleep -Seconds 3

# اختبار Health
Write-Host "`n✅ اختبار Health Endpoint..." -ForegroundColor Cyan
$health = (Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "   Status: $($health.status)"
Write-Host "   PID: $($health.process.pid)"
Write-Host "   Uptime: $($health.uptime.readable)"
Write-Host "   Memory: $($health.process.memory.heapUsed)"

# اختبار Infrastructure
Write-Host "`n✅ اختبار Infrastructure..." -ForegroundColor Cyan
$infra = (Invoke-WebRequest -Uri "http://localhost:3001/health/infrastructure" -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "   Database: $($infra.infrastructure.database.primary.healthy)"
Write-Host "   Redis: $($infra.infrastructure.redis.healthy)"

# اختبار Database Metrics
Write-Host "`n✅ اختبار Database Metrics..." -ForegroundColor Cyan
$db = (Invoke-WebRequest -Uri "http://localhost:3001/metrics/database" -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "   Connections: $($db.stats.primary.total)"
Write-Host "   Latency: $($db.latency.avg)ms"

# اختبار Redis Metrics
Write-Host "`n✅ اختبار Redis Metrics..." -ForegroundColor Cyan
$redis = (Invoke-WebRequest -Uri "http://localhost:3001/metrics/redis" -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "   Status: $($redis.status)"
Write-Host "   Cache Hits: $($redis.stats.hits)"
Write-Host "   Latency: $($redis.latency.avg)ms"

Write-Host "`n✅ جميع الاختبارات مكتملة!" -ForegroundColor Green
```

---

## 📊 مصفوفة الاختبارات

| الاختبار | الـ Endpoint | المتوقع | الحالة |
|---------|-------------|--------|--------|
| Health | `/health` | 200 OK | ✅ |
| Infrastructure | `/health/infrastructure` | healthy | ✅ |
| Database | `/metrics/database` | connected | ⏳ |
| Redis | `/metrics/redis` | connected | ⏳ |
| Frontend | `http://localhost:3000` | React App | ⏳ |

---

## 🔍 استكشاف الأخطاء

### المشكلة: Backend لا يفتح على 3001

```powershell
# الحل:
1. تحقق من المنافذ المستخدمة:
   Get-NetTCPConnection | Where-Object LocalPort -eq 3001

2. إذا كانت مشغولة، أوقفها:
   Get-Process -Name node | Stop-Process -Force

3. نفذ Backend مرة أخرى:
   cd dashboard/server
   node index.js
```

### المشكلة: قاعدة البيانات غير متصلة

```powershell
# تحقق من PostgreSQL:
docker ps | grep postgres

# إذا لم تكن تعمل:
docker-compose up -d postgres

# تحقق من الاتصال:
$health = (Invoke-WebRequest -Uri "http://localhost:3001/health/infrastructure" -UseBasicParsing).Content | ConvertFrom-Json
$health.infrastructure.database.primary.healthy
```

### المشكلة: Redis غير متصل

```powershell
# تحقق من Redis:
docker ps | grep redis

# إذا لم تكن تعمل:
docker-compose up -d redis

# تحقق من الاتصال:
redis-cli ping
# يجب أن تحصل على: PONG
```

---

## ✅ List التحقق

```
🔵 قبل البدء:
   ☐ تأكد من تثبيت Node.js
   ☐ تأكد من تثبيت npm
   ☐ تأكد من تثبيت Docker (إذا كنت تستخدم containers)

🟢 Backend:
   ☐ cd dashboard/server
   ☐ npm install (إذا لزم)
   ☐ node index.js
   ☐ تحقق من http://localhost:3001/health

🟢 Database:
   ☐ تحقق من PostgreSQL
   ☐ تحقق من اتصالات قاعدة البيانات
   ☐ تحقق من /metrics/database endpoint

🟢 Cache:
   ☐ تحقق من Redis
   ☐ تحقق من اتصالات Redis
   ☐ تحقق من /metrics/redis endpoint

🟠 Frontend (اختياري):
   ☐ cd dashboard/client
   ☐ npm install
   ☐ npm start
   ☐ افتح http://localhost:3000
```

---

## 📈 معايير النجاح

| الاختبار | نجح | فشل |
|---------|-----|-----|
| Backend يستجيب | ✅ 200 OK | ❌ timeout |
| Health status | ✅ healthy | ❌ unhealthy |
| Database متصل | ✅ connections > 0 | ❌ 0 connections |
| Redis متصل | ✅ true | ❌ false |
| Response time | ✅ < 100ms | ❌ > 500ms |
| Frontend يحمل | ✅ React App | ❌ blank page |

---

## 🎯 الملخص

```
✅ Backend Test:      جاهز للاختبار
✅ API Endpoints:     جاهزة
✅ Database Check:    جاهز
✅ Cache Check:       جاهز
✅ Frontend:          اختياري

⏰ الوقت المتوقع:    30-45 دقيقة
📊 النتيجة:         يجب أن تكون جميع الاختبارات خضراء
```

---

## 📞 الخطوات التالية

### بعد الاختبار الناجح:

1. **توثيق النتائج** - احفظ نتائج الاختبار
2. **التحقق من الأداء** - تحقق من أوقات الاستجابة
3. **اختبار العمليات** - جرب العمليات الأساسية
4. **الاختبار تحت الضغط** - جرب مع حمل أكبر

---

**إنشاء:** 3 مارس 2026
**الحالة:** جاهز للاختبار
**الدعم:** اتبع خطوات الاستكشاف أعلاه إذا حدثت مشاكل
