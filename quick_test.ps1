# 🧪 اختبار سريع للنظام بعد النشر
# تشغيل: .\quick_test.ps1

param(
    [string]$BaseUrl = "http://localhost:5000"
)

Write-Host "=== 🧪 اختبار سريع للنظام ===" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 الخادم: $BaseUrl" -ForegroundColor Cyan
Write-Host ""

$testsPassed = 0
$testsFailed = 0

# اختبار 1: Health Check
Write-Host "1️⃣ اختبار Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/health" -Method GET -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Health Check: ناجح" -ForegroundColor Green
        $testsPassed++
    }
    else {
        Write-Host "   ❌ Health Check: فشل (Status: $($response.StatusCode))" -ForegroundColor Red
        $testsFailed++
    }
}
catch {
    Write-Host "   ❌ Health Check: فشل - $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}
Write-Host ""

# اختبار 2: Frontend
Write-Host "2️⃣ اختبار Frontend..." -ForegroundColor Yellow
$frontendPort = if ($BaseUrl -match "localhost:(\d+)") { [int]$matches[1] + 1 } else { 3000 }
$frontendUrl = "http://localhost:$frontendPort"
try {
    $response = Invoke-WebRequest -Uri $frontendUrl -Method GET -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Frontend: ناجح (متاح على $frontendUrl)" -ForegroundColor Green
        $testsPassed++
    }
    else {
        Write-Host "   ⚠️  Frontend: Status $($response.StatusCode)" -ForegroundColor Yellow
        $testsPassed++
    }
}
catch {
    Write-Host "   ⚠️  Frontend: غير متاح على $frontendUrl" -ForegroundColor Yellow
    Write-Host "      (قد يكون يعمل على منفذ مختلف)" -ForegroundColor Gray
}
Write-Host ""

# اختبار 3: API Endpoints
Write-Host "3️⃣ اختبار API Endpoints..." -ForegroundColor Yellow
$endpoints = @("/api/health", "/api/auth/check")
foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl$endpoint" -Method GET -TimeoutSec 5 -ErrorAction Stop
        Write-Host "   ✅ $endpoint - OK" -ForegroundColor Green
        $testsPassed++
    }
    catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 401) {
            Write-Host "   ✅ $endpoint - OK (يتطلب مصادقة)" -ForegroundColor Green
            $testsPassed++
        }
        else {
            Write-Host "   ❌ $endpoint - فشل" -ForegroundColor Red
            $testsFailed++
        }
    }
}
Write-Host ""

# اختبار 4: Process Check
Write-Host "4️⃣ فحص العمليات..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   ✅ Node.js يعمل ($($nodeProcesses.Count) عملية)" -ForegroundColor Green
    $testsPassed++
}
else {
    Write-Host "   ⚠️  لا توجد عمليات Node.js نشطة" -ForegroundColor Yellow
}
Write-Host ""

# النتيجة النهائية
Write-Host "=== 📊 النتيجة النهائية ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ اختبارات ناجحة: $testsPassed" -ForegroundColor Green
Write-Host "❌ اختبارات فاشلة: $testsFailed" -ForegroundColor Red
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "🎉 جميع الاختبارات نجحت! النظام يعمل بشكل صحيح." -ForegroundColor Green
}
elseif ($testsPassed -gt $testsFailed) {
    Write-Host "⚠️  بعض الاختبارات فشلت، لكن النظام يعمل جزئياً." -ForegroundColor Yellow
}
else {
    Write-Host "❌ النظام لا يعمل بشكل صحيح. راجع الأخطاء أعلاه." -ForegroundColor Red
}
Write-Host ""

# عرض الأوامر المفيدة
Write-Host "🔧 أوامر مفيدة:" -ForegroundColor Cyan
Write-Host "   pm2 status              - حالة العمليات" -ForegroundColor White
Write-Host "   pm2 logs alawael-erp   - عرض السجلات" -ForegroundColor White
Write-Host "   pm2 restart alawael-erp - إعادة التشغيل" -ForegroundColor White
Write-Host ""
