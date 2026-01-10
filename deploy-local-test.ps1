# 🚀 AlAwael ERP Local Testing Script (Windows PowerShell)
# نسخة محلية للاختبار على Windows

Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  🚀 AlAwael ERP - Local Testing on Windows              ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Colors
function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }
function Write-Error { Write-Host "❌ $args" -ForegroundColor Red }
function Write-Warning { Write-Host "⚠️  $args" -ForegroundColor Yellow }

# Step 1: Check Node.js
Write-Info "خطوة 1: التحقق من Node.js..."
try {
    $nodeVersion = node --version
    Write-Success "Node.js مثبت: $nodeVersion"
}
catch {
    Write-Error "Node.js غير مثبت! قم بتثبيته من https://nodejs.org"
    exit 1
}

# Step 2: Backend Setup
Write-Info "`nخطوة 2: إعداد Backend..."
Set-Location "$projectRoot\backend"

if (-not (Test-Path "node_modules")) {
    Write-Info "تثبيت Backend dependencies..."
    npm install --silent
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Backend dependencies مثبتة"
    }
    else {
        Write-Error "فشل تثبيت Backend dependencies"
        exit 1
    }
}
else {
    Write-Success "Backend dependencies موجودة مسبقاً"
}

# Create .env if not exists
if (-not (Test-Path ".env")) {
    Write-Info "إنشاء ملف .env للـ Backend..."
    @"
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-in-production
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Success "ملف .env تم إنشاؤه"
}
else {
    Write-Success "ملف .env موجود مسبقاً"
}

# Step 3: Frontend Setup
Write-Info "`nخطوة 3: إعداد Frontend..."
Set-Location "$projectRoot\frontend"

if (-not (Test-Path "node_modules")) {
    Write-Info "تثبيت Frontend dependencies..."
    npm install --silent
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Frontend dependencies مثبتة"
    }
    else {
        Write-Error "فشل تثبيت Frontend dependencies"
        exit 1
    }
}
else {
    Write-Success "Frontend dependencies موجودة مسبقاً"
}

# Create .env if not exists
if (-not (Test-Path ".env")) {
    Write-Info "إنشاء ملف .env للـ Frontend..."
    @"
REACT_APP_API_URL=http://localhost:3001
REACT_APP_API_BASE=/api
PORT=3000
BROWSER=none
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Success "ملف .env تم إنشاؤه"
}
else {
    Write-Success "ملف .env موجود مسبقاً"
}

# Step 4: Build Frontend
Write-Info "`nخطوة 4: بناء Frontend..."
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Success "Frontend تم بناؤه بنجاح"
}
else {
    Write-Warning "فشل بناء Frontend (يمكن المتابعة)"
}

# Step 5: Start Backend (Background)
Write-Info "`nخطوة 5: تشغيل Backend..."
Set-Location "$projectRoot\backend"

# Stop any existing node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start Backend in background
$backendJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    node server.js
} -ArgumentList "$projectRoot\backend"

Write-Success "Backend بدأ في الخلفية (Job ID: $($backendJob.Id))"
Start-Sleep -Seconds 3

# Check if Backend is running
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Success "Backend يعمل بنجاح على http://localhost:3001"
}
catch {
    Write-Error "Backend لم يبدأ بشكل صحيح"
    Write-Warning "تحقق من السجلات: Receive-Job -Id $($backendJob.Id)"
}

# Step 6: Start Frontend (Background)
Write-Info "`nخطوة 6: تشغيل Frontend..."
Set-Location "$projectRoot\frontend"

$frontendJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    $env:BROWSER = "none"
    npm start
} -ArgumentList "$projectRoot\frontend"

Write-Success "Frontend بدأ في الخلفية (Job ID: $($frontendJob.Id))"
Start-Sleep -Seconds 5

# Check if Frontend is running
try {
    $front = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10 -UseBasicParsing
    Write-Success "Frontend يعمل بنجاح على http://localhost:3000"
}
catch {
    Write-Warning "Frontend قد يحتاج وقت إضافي للبدء"
}

# Summary
Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ النظام يعمل الآن!                                     ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "📊 معلومات الوصول:" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:3001" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "`n🔐 بيانات تسجيل الدخول:" -ForegroundColor Cyan
Write-Host "   Email:    admin@alawael.com" -ForegroundColor Yellow
Write-Host "   Password: Admin@123456" -ForegroundColor Yellow

Write-Host "`n📝 الأوامر المفيدة:" -ForegroundColor Cyan
Write-Host "   عرض سجلات Backend:  Receive-Job -Id $($backendJob.Id) -Keep" -ForegroundColor Gray
Write-Host "   عرض سجلات Frontend: Receive-Job -Id $($frontendJob.Id) -Keep" -ForegroundColor Gray
Write-Host "   إيقاف الخدمات:      Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor Gray

Write-Host "`n⚠️  ملاحظة: هذا للاختبار المحلي فقط!" -ForegroundColor Yellow
Write-Host "   للنشر الفعلي على Hostinger، استخدم deploy-hostinger.sh`n" -ForegroundColor Yellow

# Open browser
Write-Host "🌐 فتح المتصفح..." -ForegroundColor Cyan
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"

Write-Host "`n✨ تم! النظام جاهز للاختبار`n" -ForegroundColor Green
