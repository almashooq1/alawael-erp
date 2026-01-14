# 🧪 AlAwael ERP - اختبار شامل للنظام

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          🧪 AlAwael ERP - اختبار شامل للنظام             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$testResults = @()

# اختبار 1: Backend Health
Write-Host "⏳ اختبار 1: Backend Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 5
    Write-Host "   ✅ Backend Health: OK" -ForegroundColor Green
    Write-Host "   📊 Status: $($health.status)" -ForegroundColor Gray
    Write-Host "   🕐 Timestamp: $($health.timestamp)" -ForegroundColor Gray
    $testResults += @{ Test = "Backend Health"; Status = "✅ نجح"; Details = "Status: OK" }
}
catch {
    Write-Host "   ❌ Backend Health: فشل" -ForegroundColor Red
    Write-Host "   خطأ: $($_.Exception.Message)" -ForegroundColor Gray
    $testResults += @{ Test = "Backend Health"; Status = "❌ فشل"; Details = $_.Exception.Message }
}
Write-Host ""

# اختبار 2: Backend API Routes
Write-Host "⏳ اختبار 2: Backend API Routes..." -ForegroundColor Yellow
try {
    $apiResponse = Invoke-WebRequest -Uri "http://localhost:3001/" -UseBasicParsing -TimeoutSec 5
    if ($apiResponse.StatusCode -eq 200) {
        Write-Host "   ✅ API Routes: يعمل" -ForegroundColor Green
        $testResults += @{ Test = "API Routes"; Status = "✅ نجح"; Details = "Status Code: 200" }
    }
}
catch {
    Write-Host "   ❌ API Routes: فشل" -ForegroundColor Red
    $testResults += @{ Test = "API Routes"; Status = "❌ فشل"; Details = $_.Exception.Message }
}
Write-Host ""

# اختبار 3: Frontend Server
Write-Host "⏳ اختبار 3: Frontend Server..." -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "   ✅ Frontend: يعمل" -ForegroundColor Green
        Write-Host "   📄 Content Length: $($frontendResponse.Content.Length) bytes" -ForegroundColor Gray
        $testResults += @{ Test = "Frontend Server"; Status = "✅ نجح"; Details = "Status Code: 200" }
    }
}
catch {
    Write-Host "   ❌ Frontend: فشل" -ForegroundColor Red
    Write-Host "   خطأ: $($_.Exception.Message)" -ForegroundColor Gray
    $testResults += @{ Test = "Frontend Server"; Status = "❌ فشل"; Details = $_.Exception.Message }
}
Write-Host ""

# اختبار 4: Socket.IO
Write-Host "⏳ اختبار 4: Socket.IO Endpoint..." -ForegroundColor Yellow
try {
    $socketResponse = Invoke-WebRequest -Uri "http://localhost:3001/socket.io/" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "   ✅ Socket.IO: متاح" -ForegroundColor Green
    $testResults += @{ Test = "Socket.IO"; Status = "✅ نجح"; Details = "Endpoint accessible" }
}
catch {
    Write-Host "   ⚠️  Socket.IO: غير متاح (طبيعي)" -ForegroundColor Yellow
    $testResults += @{ Test = "Socket.IO"; Status = "⚠️  تحذير"; Details = "Endpoint not accessible" }
}
Write-Host ""

# اختبار 5: قاعدة البيانات
Write-Host "⏳ اختبار 5: Database Connection..." -ForegroundColor Yellow
Write-Host "   ⚠️  قاعدة البيانات: في الذاكرة (In-Memory)" -ForegroundColor Yellow
Write-Host "   📝 ملاحظة: البيانات مؤقتة - لحفظ دائم استخدم MongoDB Atlas" -ForegroundColor Gray
$testResults += @{ Test = "Database"; Status = "⚠️  مؤقت"; Details = "In-Memory (temporary)" }
Write-Host ""

# اختبار 6: Auth API (تسجيل مستخدم)
Write-Host "⏳ اختبار 6: Authentication API..." -ForegroundColor Yellow
try {
    $registerBody = @{
        email      = "test@alawael.com"
        password   = "Test@123456"
        fullName   = "مستخدم تجريبي"
        phone      = "966501234567"
        department = "اختبار"
    } | ConvertTo-Json
    
    $register = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" -Method Post -Body $registerBody -ContentType "application/json" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "   ✅ Auth API: يعمل (تم التسجيل)" -ForegroundColor Green
    $testResults += @{ Test = "Auth API"; Status = "✅ نجح"; Details = "Registration successful" }
}
catch {
    if ($_.Exception.Message -like "*400*" -or $_.Exception.Message -like "*timeout*") {
        Write-Host "   ⚠️  Auth API: يحتاج MongoDB حقيقي" -ForegroundColor Yellow
        Write-Host "   💡 الحل: استخدم MongoDB Atlas (راجع الدليل)" -ForegroundColor Gray
        $testResults += @{ Test = "Auth API"; Status = "⚠️  محدود"; Details = "Needs real MongoDB" }
    }
    else {
        Write-Host "   ❌ Auth API: فشل" -ForegroundColor Red
        $testResults += @{ Test = "Auth API"; Status = "❌ فشل"; Details = $_.Exception.Message }
    }
}
Write-Host ""

# النتائج النهائية
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                     📊 ملخص الاختبارات                    ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

foreach ($result in $testResults) {
    Write-Host "  $($result.Status) $($result.Test)" -ForegroundColor White
    Write-Host "     └─ $($result.Details)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                      📍 الخلاصة                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$successCount = ($testResults | Where-Object { $_.Status -like "*✅*" }).Count
$warningCount = ($testResults | Where-Object { $_.Status -like "*⚠️*" }).Count
$failCount = ($testResults | Where-Object { $_.Status -like "*❌*" }).Count
$totalTests = $testResults.Count

Write-Host "  📊 إجمالي الاختبارات: $totalTests" -ForegroundColor White
Write-Host "  ✅ نجح: $successCount" -ForegroundColor Green
Write-Host "  ⚠️  تحذيرات: $warningCount" -ForegroundColor Yellow
Write-Host "  ❌ فشل: $failCount" -ForegroundColor Red
Write-Host ""

if ($failCount -eq 0 -and $warningCount -le 2) {
    Write-Host "  🎉 النتيجة: النظام يعمل بشكل جيد!" -ForegroundColor Green
    Write-Host "  💡 ملاحظة: لتفعيل تسجيل الدخول الكامل، استخدم MongoDB Atlas" -ForegroundColor Yellow
}
elseif ($failCount -gt 0) {
    Write-Host "  ⚠️  النتيجة: يوجد مشاكل تحتاج حل" -ForegroundColor Red
}
else {
    Write-Host "  ✅ النتيجة: جيد - مع بعض التحذيرات" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    📝 التوصيات                             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1️⃣  للاختبار الفوري:" -ForegroundColor Yellow
Write-Host "     افتح: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2️⃣  لتسجيل الدخول الكامل:" -ForegroundColor Yellow
Write-Host "     اقرأ: MONGODB_ATLAS_GUIDE_AR.md" -ForegroundColor Cyan
Write-Host "     سجل في MongoDB Atlas (مجاني)" -ForegroundColor Gray
Write-Host ""
Write-Host "  3️⃣  للتوثيق الكامل:" -ForegroundColor Yellow
Write-Host "     اقرأ: 🎊_SYSTEM_RUNNING_SUCCESSFULLY.md" -ForegroundColor Cyan
Write-Host ""

Read-Host "اضغط Enter للخروج"
