# 🚀 نظام ERP - سكريبت التشغيل السريع
# Quick Start Script for ERP System

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   🚀 نظام ERP - بدء التشغيل   " -ForegroundColor Yellow
Write-Host "   ERP System - Quick Start" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Check if node is installed
Write-Host "✓ التحقق من Node.js..." -ForegroundColor Green
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "✗ خطأ: Node.js غير مثبت!" -ForegroundColor Red
    Write-Host "  يرجى تثبيت Node.js من: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}
Write-Host "  Node.js version: $nodeVersion" -ForegroundColor Gray
Write-Host ""

# Check if npm is installed
$npmVersion = npm --version 2>$null
if (-not $npmVersion) {
    Write-Host "✗ خطأ: npm غير مثبت!" -ForegroundColor Red
    exit 1
}
Write-Host "  npm version: $npmVersion" -ForegroundColor Gray
Write-Host ""

# Install backend dependencies
Write-Host "📦 تثبيت Backend dependencies..." -ForegroundColor Cyan
Push-Location backend
if (-not (Test-Path "node_modules")) {
    npm install --silent
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ فشل تثبيت Backend dependencies" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}
Write-Host "✓ Backend dependencies جاهزة" -ForegroundColor Green
Pop-Location
Write-Host ""

# Install frontend dependencies
Write-Host "📦 تثبيت Frontend dependencies..." -ForegroundColor Cyan
Push-Location frontend
if (-not (Test-Path "node_modules")) {
    npm install --silent
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ فشل تثبيت Frontend dependencies" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}
Write-Host "✓ Frontend dependencies جاهزة" -ForegroundColor Green
Pop-Location
Write-Host ""

# Create .env file if not exists
if (-not (Test-Path "backend\.env")) {
    Write-Host "📝 إنشاء ملف .env..." -ForegroundColor Cyan
    @"
PORT=3005
NODE_ENV=development
DATABASE_URL=mongodb://localhost:27017/erp_new
JWT_SECRET=dev_secret_key_123456789
CORS_ORIGIN=http://localhost:3000
"@ | Out-File -FilePath "backend\.env" -Encoding UTF8
    Write-Host "✓ ملف .env تم إنشاؤه" -ForegroundColor Green
    Write-Host ""
}

if (-not (Test-Path "frontend\.env")) {
    Write-Host "📝 إنشاء ملف frontend .env..." -ForegroundColor Cyan
    @"
REACT_APP_API_URL=http://localhost:3005/api
"@ | Out-File -FilePath "frontend\.env" -Encoding UTF8
    Write-Host "✓ ملف frontend .env تم إنشاؤه" -ForegroundColor Green
    Write-Host ""
}

# Start backend server
Write-Host "🚀 بدء Backend Server (Port 3005)..." -ForegroundColor Yellow
$backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptDir\backend'; npm run dev" -PassThru -WindowStyle Minimized
Write-Host "✓ Backend Server بدأ (PID: $($backendJob.Id))" -ForegroundColor Green
Write-Host "  URL: http://localhost:3005" -ForegroundColor Gray
Write-Host ""

# Wait for backend to start
Write-Host "⏳ انتظار Backend Server..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test backend health
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3005/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✓ Backend Server يعمل بنجاح!" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "⚠ Backend Server لم يستجب بعد..." -ForegroundColor Yellow
    Write-Host "  سيتم المتابعة على أي حال..." -ForegroundColor Gray
    Write-Host ""
}

# Start frontend server
Write-Host "🚀 بدء Frontend Server (Port 3000)..." -ForegroundColor Yellow
$frontendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptDir\frontend'; npm start" -PassThru -WindowStyle Minimized
Write-Host "✓ Frontend Server بدأ (PID: $($frontendJob.Id))" -ForegroundColor Green
Write-Host "  URL: http://localhost:3000" -ForegroundColor Gray
Write-Host ""

# Wait for services to start
Write-Host "⏳ انتظار بدء الخدمات..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   ✅ النظام جاهز للاستخدام!   " -ForegroundColor Green
Write-Host "   System Ready!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 الروابط / Links:" -ForegroundColor Yellow
Write-Host "   Frontend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Backend:   http://localhost:3005" -ForegroundColor Cyan
Write-Host "   Health:    http://localhost:3005/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 الأنظمة المتاحة / Available Systems:" -ForegroundColor Yellow
Write-Host "   ✓ AI Predictions (5 algorithms)" -ForegroundColor Green
Write-Host "   ✓ Reports System (4 export formats)" -ForegroundColor Green
Write-Host "   ✓ Notifications (Multi-channel)" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 الأوامر / Commands:" -ForegroundColor Yellow
Write-Host "   - لإيقاف النظام: أغلق نوافذ PowerShell" -ForegroundColor Gray
Write-Host "   - To stop: Close the PowerShell windows" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 الملفات / Files:" -ForegroundColor Yellow
Write-Host "   Backend PID:  $($backendJob.Id)" -ForegroundColor Gray
Write-Host "   Frontend PID: $($frontendJob.Id)" -ForegroundColor Gray
Write-Host ""

# Open browser
Write-Host "🌐 فتح المتصفح..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "✅ تم! النظام يعمل الآن..." -ForegroundColor Green
Write-Host "   اضغط Ctrl+C للخروج من هذا السكريبت" -ForegroundColor Gray
Write-Host ""

# Keep script running
Write-Host "📊 حالة النظام / System Status:" -ForegroundColor Yellow
Write-Host "   اضغط Ctrl+C لإيقاف مراقبة الحالة" -ForegroundColor Gray
Write-Host ""

# Monitor processes
while ($true) {
    Start-Sleep -Seconds 30
    
    $backendAlive = Get-Process -Id $backendJob.Id -ErrorAction SilentlyContinue
    $frontendAlive = Get-Process -Id $frontendJob.Id -ErrorAction SilentlyContinue
    
    $status = Get-Date -Format "HH:mm:ss"
    Write-Host "[$status] " -NoNewline -ForegroundColor Gray
    
    if ($backendAlive) {
        Write-Host "Backend: " -NoNewline -ForegroundColor Green
        Write-Host "✓ " -NoNewline -ForegroundColor Green
    }
    else {
        Write-Host "Backend: " -NoNewline -ForegroundColor Red
        Write-Host "✗ " -NoNewline -ForegroundColor Red
    }
    
    if ($frontendAlive) {
        Write-Host "Frontend: " -NoNewline -ForegroundColor Green
        Write-Host "✓" -ForegroundColor Green
    }
    else {
        Write-Host "Frontend: " -NoNewline -ForegroundColor Red
        Write-Host "✗" -ForegroundColor Red
    }
    
    # If both stopped, exit
    if (-not $backendAlive -and -not $frontendAlive) {
        Write-Host ""
        Write-Host "⚠ كلا الخدمتين توقفت. إنهاء المراقبة..." -ForegroundColor Yellow
        break
    }
}
