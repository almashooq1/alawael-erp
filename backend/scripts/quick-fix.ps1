# ============================================
# Quick Fix Script - إصلاح سريع
# يحل المشاكل الحرجة في 15 دقيقة
# ============================================

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   Quick Fix - الإصلاح السريع" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# التحقق من المسار
$ProjectRoot = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"
if (-not (Test-Path $ProjectRoot)) {
    Write-Host "❌ المسار غير موجود: $ProjectRoot" -ForegroundColor Red
    exit 1
}

Set-Location $ProjectRoot

# ============================================
# 1. إيقاف جميع عمليات Node
# ============================================
Write-Host "🔴 إيقاف جميع عمليات Node..." -ForegroundColor Yellow
try {
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✅ تم إيقاف جميع عمليات Node" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ لا توجد عمليات Node للإيقاف" -ForegroundColor Yellow
}
Start-Sleep -Seconds 2

# ============================================
# 2. تحديث ملفات .env
# ============================================
Write-Host ""
Write-Host "📝 تحديث ملفات .env..." -ForegroundColor Yellow

# Backend .env
$backendEnv = @"
# متغيرات البيئة - Updated $(Get-Date -Format "yyyy-MM-dd HH:mm")
NODE_ENV=development
USE_MOCK_DB=false

# Server
PORT=3001

# MongoDB
MONGODB_URI=mongodb://localhost:27017/alaweal_db
MONGO_DB_NAME=alawael_db

# Security
JWT_SECRET=$(New-Guid | ForEach-Object { $_.Guid.Replace('-','') })
JWT_REFRESH_SECRET=$(New-Guid | ForEach-Object { $_.Guid.Replace('-','') })
SESSION_SECRET=$(New-Guid | ForEach-Object { $_.Guid.Replace('-','') })

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
CORS_ORIGIN=http://localhost:3002
FRONTEND_URL=http://localhost:3002

# API
API_BASE_URL=http://localhost:3001/api/v1
API_VERSION=v1
"@

Set-Content -Path "backend\.env" -Value $backendEnv -Encoding UTF8
Write-Host "✅ تم تحديث backend\.env" -ForegroundColor Green

# Frontend .env
$frontendEnv = @"
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001
PORT=3002
"@

Set-Content -Path "frontend\.env" -Value $frontendEnv -Encoding UTF8
Write-Host "✅ تم تحديث frontend\.env" -ForegroundColor Green

# ============================================
# 3. تنظيف ملفات Log
# ============================================
Write-Host ""
Write-Host "🧹 تنظيف ملفات Log القديمة..." -ForegroundColor Yellow
$logFiles = Get-ChildItem -Path "backend" -Filter "*.log" -File
if ($logFiles.Count -gt 0) {
    $logFiles | Remove-Item -Force
    Write-Host "✅ تم حذف $($logFiles.Count) ملف log" -ForegroundColor Green
}
else {
    Write-Host "✅ لا توجد ملفات log للحذف" -ForegroundColor Green
}

# ============================================
# 4. تثبيت Dependencies
# ============================================
Write-Host ""
Write-Host "📦 تثبيت Dependencies..." -ForegroundColor Yellow

# Backend
Write-Host "   Backend..." -ForegroundColor Cyan
Set-Location "$ProjectRoot\backend"
if (Test-Path "package.json") {
    npm install --silent
    Write-Host "   ✅ Backend dependencies installed" -ForegroundColor Green
}

# Frontend
Write-Host "   Frontend..." -ForegroundColor Cyan
Set-Location "$ProjectRoot\frontend"
if (Test-Path "package.json") {
    npm install --silent
    Write-Host "   ✅ Frontend dependencies installed" -ForegroundColor Green
}

Set-Location $ProjectRoot

# ============================================
# 5. التحقق من MongoDB
# ============================================
Write-Host ""
Write-Host "🗄️ التحقق من MongoDB..." -ForegroundColor Yellow

try {
    $mongoService = Get-Service MongoDB -ErrorAction SilentlyContinue
    if ($mongoService) {
        if ($mongoService.Status -ne 'Running') {
            Start-Service MongoDB
            Write-Host "✅ تم بدء خدمة MongoDB" -ForegroundColor Green
        }
        else {
            Write-Host "✅ MongoDB يعمل بالفعل" -ForegroundColor Green
        }
    }
    else {
        Write-Host "⚠️ MongoDB غير مُثبت محلياً" -ForegroundColor Yellow
        Write-Host "   💡 استخدم MongoDB Atlas أو ثبت MongoDB محلياً" -ForegroundColor Cyan
        Write-Host "   📖 راجع: MONGODB_ATLAS_GUIDE_AR.md" -ForegroundColor Cyan
    }
}
catch {
    Write-Host "⚠️ لم نتمكن من التحقق من MongoDB" -ForegroundColor Yellow
}

# ============================================
# النتيجة
# ============================================
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   ✅ اكتمل الإصلاح السريع!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 الخطوات التالية:" -ForegroundColor Yellow
Write-Host "   1. تأكد من تشغيل MongoDB" -ForegroundColor White
Write-Host "   2. شغل Backend:  cd backend; npm start" -ForegroundColor White
Write-Host "   3. شغل Frontend: cd frontend; npm start" -ForegroundColor White
Write-Host ""
Write-Host "📖 للمزيد من التفاصيل، راجع:" -ForegroundColor Cyan
Write-Host "   🔧_COMPREHENSIVE_PROJECT_FIXES_JAN_20.md" -ForegroundColor White
Write-Host ""

# الرجوع للمسار الأصلي
Set-Location $ProjectRoot
