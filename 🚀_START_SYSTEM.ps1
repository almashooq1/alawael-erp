# 🚀 AlAwael ERP - Windows Startup Script
# تشغيل النظام بالكامل على Windows

Clear-Host
Write-Host "🎊 AlAwael ERP - نظام التشغيل التلقائي" -ForegroundColor Cyan -BackgroundColor Black
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# الخطوة 1: إيقاف العمليات القديمة
Write-Host "⏹️  الخطوة 1: إيقاف العمليات القديمة..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "✅ تم" -ForegroundColor Green
Write-Host ""

# الخطوة 2: التحقق من المتطلبات
Write-Host "🔍 الخطوة 2: التحقق من المتطلبات..." -ForegroundColor Yellow

# التحقق من Node.js
$nodeCheck = node --version 2>$null
if ($nodeCheck) {
    Write-Host "  ✅ Node.js: $nodeCheck" -ForegroundColor Green
}
else {
    Write-Host "  ❌ Node.js: غير مثبت" -ForegroundColor Red
    Write-Host "  يرجى تثبيت Node.js من: https://nodejs.org" -ForegroundColor Red
    exit
}

# التحقق من npm
$npmCheck = npm --version 2>$null
if ($npmCheck) {
    Write-Host "  ✅ npm: $npmCheck" -ForegroundColor Green
}
else {
    Write-Host "  ❌ npm: غير مثبت" -ForegroundColor Red
    exit
}

Write-Host ""

# الخطوة 3: الانتقال إلى مجلد المشروع
Write-Host "📁 الخطوة 3: الانتقال إلى مجلد المشروع..." -ForegroundColor Yellow
$projectRoot = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"
Set-Location $projectRoot
Write-Host "  ✅ تم: $projectRoot" -ForegroundColor Green
Write-Host ""

# الخطوة 4: تثبيت Dependencies (إذا لم تكن موجودة)
Write-Host "📦 الخطوة 4: التحقق من المكتبات..." -ForegroundColor Yellow

if (-Not (Test-Path "$projectRoot\backend\node_modules")) {
    Write-Host "  تثبيت Backend dependencies..." -ForegroundColor Yellow
    Set-Location "$projectRoot\backend"
    npm install --silent
    Write-Host "  ✅ تم" -ForegroundColor Green
}

if (-Not (Test-Path "$projectRoot\frontend\node_modules")) {
    Write-Host "  تثبيت Frontend dependencies..." -ForegroundColor Yellow
    Set-Location "$projectRoot\frontend"
    npm install --silent
    Write-Host "  ✅ تم" -ForegroundColor Green
}

Write-Host ""

# الخطوة 5: فتح 3 نوافذ للتشغيل
Write-Host "🚀 الخطوة 5: فتح نوافذ التشغيل..." -ForegroundColor Yellow
Write-Host ""

# نافذة 1: MongoDB
Write-Host "1️⃣  فتح MongoDB..." -ForegroundColor Cyan
$mongoScript = @"
Clear-Host
Write-Host "🗄️  MongoDB Server" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  قبل البدء:" -ForegroundColor Yellow
Write-Host "  إذا رأيت: 'mongod: The term is not recognized'"
Write-Host "  فهذا يعني MongoDB غير مثبت" -ForegroundColor Yellow
Write-Host ""
Write-Host "الحل:" -ForegroundColor Yellow
Write-Host "  1. قم بتثبيت MongoDB من:" -ForegroundColor Yellow
Write-Host "     https://www.mongodb.com/try/download/community-windows" -ForegroundColor Cyan
Write-Host ""
Write-Host "  أو استخدم Chocolatey:" -ForegroundColor Yellow
Write-Host "     choco install mongodb-community" -ForegroundColor Cyan
Write-Host ""
Write-Host "  أو استخدم MongoDB Atlas (سحابة):" -ForegroundColor Yellow
Write-Host "     https://www.mongodb.com/cloud/atlas" -ForegroundColor Cyan
Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host ""

try {
    mongod
} catch {
    Write-Host "❌ فشل تشغيل MongoDB" -ForegroundColor Red
    Write-Host "يرجى تثبيت MongoDB أولاً" -ForegroundColor Red
    Write-Host ""
    Write-Host "اضغط أي مفتاح للخروج..."
    `$null = `$host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
"@
$mongoScript | Out-File -FilePath "$env:TEMP\start-mongo.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-File", "$env:TEMP\start-mongo.ps1"
Start-Sleep -Seconds 1

# نافذة 2: Backend
Write-Host "2️⃣  فتح Backend Server..." -ForegroundColor Cyan
$backendScript = @"
Clear-Host
Write-Host "🔧 AlAwael ERP Backend" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Set-Location "$projectRoot\backend"
npm start
"@
$backendScript | Out-File -FilePath "$env:TEMP\start-backend.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-File", "$env:TEMP\start-backend.ps1"
Start-Sleep -Seconds 2

# نافذة 3: Frontend
Write-Host "3️⃣  فتح Frontend Server..." -ForegroundColor Cyan
$frontendScript = @"
Clear-Host
Write-Host "⚛️  AlAwael ERP Frontend" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Set-Location "$projectRoot\frontend"
npm run dev
"@
$frontendScript | Out-File -FilePath "$env:TEMP\start-frontend.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-File", "$env:TEMP\start-frontend.ps1"

Write-Host ""
Write-Host "✅ تم فتح جميع النوافذ!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 الخوادم ستعمل على:" -ForegroundColor Cyan
Write-Host "  🗄️  MongoDB    : mongodb://localhost:27017" -ForegroundColor Yellow
Write-Host "  🔧 Backend    : http://localhost:3001" -ForegroundColor Yellow
Write-Host "  ⚛️  Frontend   : http://localhost:5173 أو http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔐 بيانات تسجيل الدخول:" -ForegroundColor Cyan
Write-Host "  البريد الإلكتروني: admin@alawael.com" -ForegroundColor Yellow
Write-Host "  كلمة المرور:      Admin@123456" -ForegroundColor Yellow
Write-Host ""
Write-Host "⏱️  انتظر حتى تشاهد 'Server Started' في نافذة Backend" -ForegroundColor Cyan
Write-Host ""
Write-Host "اضغط Ctrl+C لإيقاف جميع الخدمات" -ForegroundColor Red
Write-Host ""

# الانتظار حتى يغلق المستخدم هذه النافذة
Read-Host "اضغط Enter للخروج عند الانتهاء"
