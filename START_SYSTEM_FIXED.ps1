# ============================================
# Start System - بدء النظام بالكامل
# يشغل Backend و Frontend معاً
# ============================================

param(
    [switch]$Clean,
    [switch]$NoBrowser
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   🚀 Alawael ERP - بدء النظام" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"
if (-not (Test-Path $ProjectRoot)) {
    Write-Host "❌ المسار غير موجود: $ProjectRoot" -ForegroundColor Red
    exit 1
}

Set-Location $ProjectRoot

# ============================================
# 1. التحقق من المتطلبات
# ============================================
Write-Host "🔍 التحقق من المتطلبات..." -ForegroundColor Yellow

# Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ Node.js غير مُثبت" -ForegroundColor Red
    exit 1
}

# npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ npm غير مُثبت" -ForegroundColor Red
    exit 1
}

# MongoDB
Write-Host "🗄️ التحقق من MongoDB..." -ForegroundColor Yellow
try {
    $mongoService = Get-Service MongoDB -ErrorAction SilentlyContinue
    if ($mongoService) {
        if ($mongoService.Status -eq 'Running') {
            Write-Host "✅ MongoDB يعمل" -ForegroundColor Green
        }
        else {
            Write-Host "⚠️ MongoDB متوقف، جاري البدء..." -ForegroundColor Yellow
            Start-Service MongoDB
            Start-Sleep -Seconds 2
            Write-Host "✅ MongoDB بدأ" -ForegroundColor Green
        }
    }
    else {
        Write-Host "⚠️ MongoDB غير مُثبت محلياً" -ForegroundColor Yellow
        Write-Host "   💡 تأكد من MONGODB_URI في .env" -ForegroundColor Cyan
    }
}
catch {
    Write-Host "⚠️ لم نتمكن من فحص MongoDB" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# 2. إيقاف العمليات السابقة
# ============================================
Write-Host "🔴 إيقاف العمليات السابقة..." -ForegroundColor Yellow
$existingProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($existingProcesses) {
    $existingProcesses | Stop-Process -Force
    Write-Host "✅ تم إيقاف $($existingProcesses.Count) عملية" -ForegroundColor Green
    Start-Sleep -Seconds 2
}
else {
    Write-Host "✅ لا توجد عمليات للإيقاف" -ForegroundColor Green
}

Write-Host ""

# ============================================
# 3. تنظيف (إذا طُلب)
# ============================================
if ($Clean) {
    Write-Host "🧹 تنظيف شامل..." -ForegroundColor Yellow

    # حذف node_modules
    if (Test-Path "backend\node_modules") {
        Write-Host "   حذف backend\node_modules..." -ForegroundColor Cyan
        Remove-Item "backend\node_modules" -Recurse -Force
    }
    if (Test-Path "frontend\node_modules") {
        Write-Host "   حذف frontend\node_modules..." -ForegroundColor Cyan
        Remove-Item "frontend\node_modules" -Recurse -Force
    }

    # إعادة التثبيت
    Write-Host "   إعادة تثبيت Backend..." -ForegroundColor Cyan
    Set-Location "$ProjectRoot\backend"
    npm install --silent

    Write-Host "   إعادة تثبيت Frontend..." -ForegroundColor Cyan
    Set-Location "$ProjectRoot\frontend"
    npm install --silent

    Set-Location $ProjectRoot
    Write-Host "✅ اكتمل التنظيف" -ForegroundColor Green
    Write-Host ""
}

# ============================================
# 4. التحقق من Dependencies
# ============================================
Write-Host "📦 التحقق من Dependencies..." -ForegroundColor Yellow

if (-not (Test-Path "backend\node_modules")) {
    Write-Host "   تثبيت Backend Dependencies..." -ForegroundColor Cyan
    Set-Location "$ProjectRoot\backend"
    npm install --silent
    Set-Location $ProjectRoot
}
Write-Host "✅ Backend Dependencies جاهزة" -ForegroundColor Green

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "   تثبيت Frontend Dependencies..." -ForegroundColor Cyan
    Set-Location "$ProjectRoot\frontend"
    npm install --silent
    Set-Location $ProjectRoot
}
Write-Host "✅ Frontend Dependencies جاهزة" -ForegroundColor Green

Write-Host ""

# ============================================
# 5. بدء Backend
# ============================================
Write-Host "🚀 بدء Backend Server..." -ForegroundColor Yellow

$backendJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    npm start
} -ArgumentList "$ProjectRoot\backend"

Start-Sleep -Seconds 5

# التحقق من Backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend يعمل على http://localhost:3001" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ Backend قد يستغرق بعض الوقت..." -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# 6. بدء Frontend
# ============================================
Write-Host "🚀 بدء Frontend Server..." -ForegroundColor Yellow

$frontendJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    $env:BROWSER = 'none'
    npm start
} -ArgumentList "$ProjectRoot\frontend"

Start-Sleep -Seconds 10

# التحقق من Frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3002" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Frontend يعمل على http://localhost:3002" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ Frontend قد يستغرق بعض الوقت..." -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# 7. عرض المعلومات
# ============================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ✅ النظام يعمل!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 الروابط:" -ForegroundColor Yellow
Write-Host "   Frontend:  http://localhost:3002" -ForegroundColor White
Write-Host "   Backend:   http://localhost:3001" -ForegroundColor White
Write-Host "   API Docs:  http://localhost:3001/api-docs" -ForegroundColor White
Write-Host "   Health:    http://localhost:3001/api/health" -ForegroundColor White
Write-Host ""
Write-Host "📊 الحالة:" -ForegroundColor Yellow
Write-Host "   Backend Job ID:  $($backendJob.Id)" -ForegroundColor White
Write-Host "   Frontend Job ID: $($frontendJob.Id)" -ForegroundColor White
Write-Host ""
Write-Host "⚙️ الأوامر المفيدة:" -ForegroundColor Yellow
Write-Host "   إيقاف النظام:    Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor White
Write-Host "   فحص الحالة:      Get-Job" -ForegroundColor White
Write-Host "   عرض الأخطاء:     Get-Job | Receive-Job" -ForegroundColor White
Write-Host ""
Write-Host "📝 Logs:" -ForegroundColor Yellow
Write-Host "   Backend:  backend\server.log" -ForegroundColor White
Write-Host "   Frontend: frontend\serve.log" -ForegroundColor White
Write-Host ""

# فتح المتصفح
if (-not $NoBrowser) {
    Write-Host "🌐 فتح المتصفح..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:3002"
}

Write-Host "✨ النظام جاهز للاستخدام!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 نصيحة: اضغط Ctrl+C لإيقاف هذا السكريبت" -ForegroundColor Cyan
Write-Host "         (لكن الخوادم ستستمر في العمل)" -ForegroundColor Cyan
Write-Host ""

# الانتظار
Write-Host "⏳ اضغط Enter للخروج (الخوادم ستبقى تعمل)..." -ForegroundColor Yellow
Read-Host

Write-Host "👋 تم الخروج. الخوادم ما زالت تعمل." -ForegroundColor Cyan
Write-Host ""
