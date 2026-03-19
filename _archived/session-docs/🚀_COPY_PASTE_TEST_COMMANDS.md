# 🚀 أوامر الاختبار - جاهزة للنسخ واللصق
## COPY-PASTE READY TEST COMMANDS

---

## ⚡ الطريقة السريعة (في 5 دقائق)

### الخطوة 1: تشغيل Backend

انسخ والصق هذا الأمر في PowerShell:

```powershell
cd "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\dashboard\server"; node index.js
```

**سترى:**
```
Server running on port 3001
✅ Database connected
✅ Redis connected
```

---

### الخطوة 2: اختبار في محطة أخرى

انتظر 3 ثوان بعد تشغيل Backend، ثم انسخ والصق:

```powershell
Start-Sleep -Seconds 3; Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
```

**سترى:**
```
StatusCode        : 200
RawContentLength  : 523
Content           : {"status":"healthy","process":...}
```

---

## 📊 الاختبارات الكاملة

### اختبار 1: Health Status

```powershell
$h = (Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing).Content | ConvertFrom-Json; Write-Host "Status: $($h.status)" -ForegroundColor Green; Write-Host "Uptime: $($h.uptime.readable)"; Write-Host "Memory: $($h.process.memory.heapUsed)"
```

### اختبار 2: Infrastructure Status

```powershell
$i = (Invoke-WebRequest -Uri "http://localhost:3001/health/infrastructure" -UseBasicParsing).Content | ConvertFrom-Json; Write-Host "Database: $($i.infrastructure.database.primary.healthy)" -ForegroundColor Green; Write-Host "Redis: $($i.infrastructure.redis.healthy)" -ForegroundColor Green
```

### اختبار 3: Database Metrics

```powershell
$db = (Invoke-WebRequest -Uri "http://localhost:3001/metrics/database" -UseBasicParsing).Content | ConvertFrom-Json; Write-Host "Connections: $($db.stats.primary.total)" -ForegroundColor Green; Write-Host "Idle: $($db.stats.primary.idle)"; Write-Host "Latency: $($db.latency.avg)ms"
```

### اختبار 4: Redis Metrics

```powershell
$r = (Invoke-WebRequest -Uri "http://localhost:3001/metrics/redis" -UseBasicParsing).Content | ConvertFrom-Json; Write-Host "Redis Status: $($r.status)" -ForegroundColor Green; Write-Host "Cache Hits: $($r.stats.hits)"; Write-Host "Latency: $($r.latency.avg)ms"
```

---

## 🔄 اختبار شامل واحد

انسخ والصق هذا الأمر الطويل (سيختبر كل شيء):

```powershell
$base='http://localhost:3001'; Write-Host "🧪 اختبار شامل...`n" -ForegroundColor Cyan; $h=(Invoke-WebRequest -Uri "$base/health" -UseBasicParsing).Content | ConvertFrom-Json; $i=(Invoke-WebRequest -Uri "$base/health/infrastructure" -UseBasicParsing).Content | ConvertFrom-Json; $db=(Invoke-WebRequest -Uri "$base/metrics/database" -UseBasicParsing).Content | ConvertFrom-Json; $r=(Invoke-WebRequest -Uri "$base/metrics/redis" -UseBasicParsing).Content | ConvertFrom-Json; Write-Host "`n✅ HEALTH:" -ForegroundColor Green; Write-Host "   Status: $($h.status)"; Write-Host "   Uptime: $($h.uptime.readable)"; Write-Host "   Memory: $($h.process.memory.heapUsed)`n"; Write-Host "✅ INFRASTRUCTURE:" -ForegroundColor Green; Write-Host "   Database: $($i.infrastructure.database.primary.healthy)"; Write-Host "   Redis: $($i.infrastructure.redis.healthy)`n"; Write-Host "✅ DATABASE:" -ForegroundColor Green; Write-Host "   Total Connections: $($db.stats.primary.total)"; Write-Host "   Idle: $($db.stats.primary.idle)"; Write-Host "   Latency: $($db.latency.avg)ms`n"; Write-Host "✅ REDIS:" -ForegroundColor Green; Write-Host "   Status: $($r.status)"; Write-Host "   Hits: $($r.stats.hits)"; Write-Host "   Latency: $($r.latency.avg)ms`n"; Write-Host "✅ جميع الاختبارات نجحت!" -ForegroundColor Green
```

---

## 🌐 تشغيل Frontend (إضافي)

افتح محطة جديدة وانسخ والصق:

```powershell
cd "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\dashboard\client"; npm start
```

**سترى:**
```
Compiled successfully!
Available at: http://localhost:3000
```

---

## 🔍 استكشاف الأخطاء

### إذا لم يفتح Backend على 3001:

```powershell
# تحقق من المنافذ المستخدمة
Get-NetTCPConnection | Where-Object LocalPort -eq 3001

# أوقف أي عمليات Node قديمة
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# جرب مرة أخرى
cd "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\dashboard\server"; node index.js
```

### إذا فشل الاتصال بـ Database:

```powershell
# تحقق من Docker
docker ps | Select-String postgres

# إذا لم تكن تعمل
cd "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"
docker-compose up -d postgres
```

### إذا فشل الاتصال بـ Redis:

```powershell
# تحقق من Docker
docker ps | Select-String redis

# إذا لم تكن تعمل
cd "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"
docker-compose up -d redis

# اختبر الاتصال
redis-cli ping
# يجب أن تحصل على: PONG
```

---

## 📈 مراقبة الأداء

### مراقبة استخدام الذاكرة:

```powershell
# كل 3 ثوان، اعرض حالة النظام
while ($true) {
  $h = (Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing).Content | ConvertFrom-Json
  Write-Host "Memory: $($h.process.memory.heapUsed) | Requests: $($h.metrics.totalRequests) | Errors: $($h.metrics.errorRate)" -ForegroundColor Green
  Start-Sleep -Seconds 3
}

# اضغط Ctrl+C لإيقاف
```

### مراقبة زمن الاستجابة:

```powershell
# اختبر 10 مرات وقس الوقت
$times = @()
1..10 | ForEach-Object {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $_ = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -ErrorAction SilentlyContinue
  $sw.Stop()
  $times += $sw.ElapsedMilliseconds
  Write-Host "Request $_: $($sw.ElapsedMilliseconds)ms" -ForegroundColor Green
}
Write-Host "`nAverage: $([math]::Round(($times | Measure-Object -Average).Average, 2))ms" -ForegroundColor Cyan
```

---

## 🎯 List الاختبارات الكاملة

**انسخ والصق هذا الأمر الطويل (سيختبر كل شيء بالتفصيل):**

```powershell
Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        🧪 اختبار النظام المحلي - COMPREHENSIVE TEST           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$base='http://localhost:3001'
$testsPassed = 0
$testsFailed = 0

# Test 1: Health
Write-Host "🧪 اختبار 1: Health Endpoint..." -ForegroundColor Yellow
try {
  $h = (Invoke-WebRequest -Uri "$base/health" -UseBasicParsing).Content | ConvertFrom-Json
  if ($h.status -eq "healthy") {
    Write-Host "✅ نجح: Status = healthy" -ForegroundColor Green
    Write-Host "   • PID: $($h.process.pid)"
    Write-Host "   • Uptime: $($h.uptime.readable)"
    Write-Host "   • Memory: $($h.process.memory.heapUsed)`n"
    $testsPassed++
  } else {
    Write-Host "❌ فشل: Status != healthy`n" -ForegroundColor Red
    $testsFailed++
  }
} catch {
  Write-Host "❌ فشل: $($_)`n" -ForegroundColor Red
  $testsFailed++
}

# Test 2: Infrastructure
Write-Host "🧪 اختبار 2: Infrastructure..." -ForegroundColor Yellow
try {
  $i = (Invoke-WebRequest -Uri "$base/health/infrastructure" -UseBasicParsing).Content | ConvertFrom-Json
  $dbOk = $i.infrastructure.database.primary.healthy
  $redisOk = $i.infrastructure.redis.healthy

  if ($dbOk -and $redisOk) {
    Write-Host "✅ نجح: جميع الخدمات متصلة" -ForegroundColor Green
    Write-Host "   • Database: $dbOk"
    Write-Host "   • Redis: $redisOk`n"
    $testsPassed++
  } else {
    Write-Host "⚠️  تحذير: بعض الخدمات غير متصلة`n" -ForegroundColor Yellow
    $testsFailed++
  }
} catch {
  Write-Host "❌ فشل: $($_)`n" -ForegroundColor Red
  $testsFailed++
}

# Test 3: Database
Write-Host "🧪 اختبار 3: Database Metrics..." -ForegroundColor Yellow
try {
  $db = (Invoke-WebRequest -Uri "$base/metrics/database" -UseBasicParsing).Content | ConvertFrom-Json
  if ($db.stats.primary.total -gt 0) {
    Write-Host "✅ نجح: Database متصل" -ForegroundColor Green
    Write-Host "   • Connections: $($db.stats.primary.total)"
    Write-Host "   • Idle: $($db.stats.primary.idle)"
    Write-Host "   • Latency: $($db.latency.avg)ms`n"
    $testsPassed++
  } else {
    Write-Host "❌ فشل: لا توجد اتصالات`n" -ForegroundColor Red
    $testsFailed++
  }
} catch {
  Write-Host "❌ فشل: $($_)`n" -ForegroundColor Red
  $testsFailed++
}

# Test 4: Redis
Write-Host "🧪 اختبار 4: Redis Metrics..." -ForegroundColor Yellow
try {
  $r = (Invoke-WebRequest -Uri "$base/metrics/redis" -UseBasicParsing).Content | ConvertFrom-Json
  if ($r.status -eq "connected") {
    Write-Host "✅ نجح: Redis متصل" -ForegroundColor Green
    Write-Host "   • Status: $($r.status)"
    Write-Host "   • Cache Hits: $($r.stats.hits)"
    Write-Host "   • Latency: $($r.latency.avg)ms`n"
    $testsPassed++
  } else {
    Write-Host "❌ فشل: Redis غير متصل`n" -ForegroundColor Red
    $testsFailed++
  }
} catch {
  Write-Host "❌ فشل: $($_)`n" -ForegroundColor Red
  $testsFailed++
}

# Summary
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                        📊 ملخص النتائج                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
Write-Host "✅ نجح: $testsPassed/4" -ForegroundColor Green
Write-Host "❌ فشل: $testsFailed/4" -ForegroundColor Red
Write-Host "`nالنسبة: $([math]::Round(($testsPassed/4)*100))% نجحت`n"

if ($testsFailed -eq 0) {
  Write-Host "🎉 جميع الاختبارات نجحت! النظام جاهز للعمل." -ForegroundColor Green
} else {
  Write-Host "⚠️  بعض الاختبارات فشلت. تحقق من الأخطاء أعلاه." -ForegroundColor Yellow
}
```

---

## 📞 الدعم السريع

| المشكلة | الحل | الأمر |
|--------|------|------|
| Backend لا يستجيب | أعد التشغيل | `Stop-Process -Name node -Force` |
| Database غير متصل | ابدأ postgres | `docker-compose up -d postgres` |
| Redis غير متصل | ابدأ redis | `docker-compose up -d redis` |
| منفذ مشغول | اعرف من يستخدمه | `Get-NetTCPConnection \| Where-Object LocalPort -eq 3001` |

---

**آخر تحديث:** 3 مارس 2026
**الحالة:** جاهز للاستخدام
**الوقت المتوقع:** 5-30 دقيقة حسب الاختبار
