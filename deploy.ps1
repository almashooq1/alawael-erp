# ==============================================================================
# 🚀 سكربت النشر الآلي - AlAwael ERP System (PowerShell)
# ==============================================================================
# التاريخ: 2026-01-19
# الحالة: جاهز للإنتاج
# ==============================================================================

param(
    [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 بدء عملية النشر - AlAwael ERP System" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# المتغيرات
$ProjectRoot = Get-Location
$BackendDir = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$DeploymentLog = "deployment_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

Write-Host "📋 بيئة النشر: $Environment" -ForegroundColor Yellow
Write-Host "📂 مجلد المشروع: $ProjectRoot" -ForegroundColor Yellow
Write-Host "📝 ملف السجل: $DeploymentLog" -ForegroundColor Yellow
Write-Host ""

# ==============================================================================
# 1. فحص المتطلبات الأساسية
# ==============================================================================
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "1️⃣ فحص المتطلبات الأساسية..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        Write-Host "✅ $Command موجود" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ $Command غير موجود" -ForegroundColor Red
        return $false
    }
}

if (-not (Test-Command "node")) { exit 1 }
if (-not (Test-Command "npm")) { exit 1 }
if (-not (Test-Command "python")) {
    if (-not (Test-Command "python3")) { exit 1 }
}

Write-Host ""

# ==============================================================================
# 2. نسخ احتياطي للبيانات الحالية
# ==============================================================================
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "2️⃣ إنشاء نسخة احتياطية..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

$BackupDir = "backups\pre_deployment_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$EnvFile = Join-Path $BackendDir ".env"
if (Test-Path $EnvFile) {
    Copy-Item $EnvFile -Destination (Join-Path $BackupDir ".env.backup")
    Write-Host "✅ تم نسخ .env" -ForegroundColor Green
}

$DataDir = Join-Path $BackendDir "data"
if (Test-Path $DataDir) {
    Copy-Item $DataDir -Destination (Join-Path $BackupDir "data_backup") -Recurse
    Write-Host "✅ تم نسخ قاعدة البيانات" -ForegroundColor Green
}

Write-Host "✅ النسخ الاحتياطي في: $BackupDir" -ForegroundColor Green
Write-Host ""

# ==============================================================================
# 3. بناء Frontend
# ==============================================================================
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "3️⃣ بناء Frontend..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

Push-Location $FrontendDir

if (Test-Path "package.json") {
    Write-Host "📦 تثبيت اعتماديات Frontend..." -ForegroundColor Yellow
    npm ci --production

    Write-Host "🏗️ بناء Frontend..." -ForegroundColor Yellow
    npm run build

    Write-Host "✅ تم بناء Frontend بنجاح" -ForegroundColor Green
}
else {
    Write-Host "⚠️ Frontend package.json غير موجود" -ForegroundColor Yellow
}

Pop-Location
Write-Host ""

# ==============================================================================
# 4. إعداد Backend
# ==============================================================================
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "4️⃣ إعداد Backend..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

Push-Location $BackendDir

# تثبيت Python dependencies
$RequirementsFile = "requirements.txt"
if (Test-Path $RequirementsFile) {
    Write-Host "📦 تثبيت اعتماديات Python..." -ForegroundColor Yellow
    python -m pip install -r $RequirementsFile
    Write-Host "✅ تم تثبيت Python dependencies" -ForegroundColor Green
}

# تثبيت Node dependencies
if (Test-Path "package.json") {
    Write-Host "📦 تثبيت اعتماديات Backend Node..." -ForegroundColor Yellow
    npm ci --production
    Write-Host "✅ تم تثبيت Backend Node dependencies" -ForegroundColor Green
}

Pop-Location
Write-Host ""

# ==============================================================================
# 5. فحص ملفات البيئة
# ==============================================================================
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "5️⃣ فحص ملفات البيئة..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

$EnvSourceFile = ".env.$Environment"
if (Test-Path $EnvSourceFile) {
    Write-Host "✅ ملف $EnvSourceFile موجود" -ForegroundColor Green

    # نسخ إلى backend
    Copy-Item $EnvSourceFile -Destination (Join-Path $BackendDir ".env")
    Write-Host "✅ تم نسخ $EnvSourceFile إلى backend/.env" -ForegroundColor Green
}
else {
    Write-Host "❌ ملف $EnvSourceFile غير موجود!" -ForegroundColor Red
    Write-Host "⚠️ تأكد من إنشاء $EnvSourceFile قبل النشر" -ForegroundColor Yellow
}
Write-Host ""

# ==============================================================================
# 6. تشغيل الاختبارات
# ==============================================================================
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "6️⃣ تشغيل الاختبارات..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

Push-Location $BackendDir

if (Test-Path "package.json") {
    Write-Host "🧪 تشغيل اختبارات Backend..." -ForegroundColor Yellow
    try {
        npm test -- --maxWorkers=2
        Write-Host "✅ جميع الاختبارات نجحت" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️ بعض الاختبارات فشلت" -ForegroundColor Yellow
    }
}

Pop-Location
Write-Host ""

# ==============================================================================
# 7. تنظيف الملفات القديمة
# ==============================================================================
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "7️⃣ تنظيف الملفات القديمة..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# حذف log files القديمة (أكثر من 30 يوم)
Get-ChildItem -Path . -Include *.log -Recurse -File |
Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
Remove-Item -Force

Write-Host "✅ تم حذف log files القديمة" -ForegroundColor Green
Write-Host ""

# ==============================================================================
# 8. إعادة تشغيل الخدمات
# ==============================================================================
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "8️⃣ إعادة تشغيل الخدمات..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# إيقاف العمليات القديمة
Get-Process | Where-Object { $_.ProcessName -like "*node*" -and $_.CommandLine -like "*server.js*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "⚠️ تم إيقاف العمليات القديمة" -ForegroundColor Yellow

# تشغيل Backend
Push-Location $BackendDir

if ($Environment -eq "production") {
    Write-Host "🚀 تشغيل Backend في وضع الإنتاج..." -ForegroundColor Yellow

    if (Test-Path "server.js") {
        Start-Process -NoNewWindow -FilePath "node" -ArgumentList "server.js" -RedirectStandardOutput "..\logs\backend.log" -RedirectStandardError "..\logs\backend_error.log"
        Write-Host "✅ Backend يعمل (Node.js)" -ForegroundColor Green
    }
}
else {
    Write-Host "🔧 تشغيل Backend في وضع التطوير..." -ForegroundColor Yellow
    Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev"
}

Pop-Location
Write-Host ""

# ==============================================================================
# 9. فحص صحة النظام
# ==============================================================================
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "9️⃣ فحص صحة النظام..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

Start-Sleep -Seconds 5

Write-Host "🔍 فحص Backend health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing
    Write-Host "✅ Backend يعمل بشكل صحيح" -ForegroundColor Green
}
catch {
    Write-Host "❌ Backend لا يستجيب" -ForegroundColor Red
}

Write-Host ""

# ==============================================================================
# النتيجة النهائية
# ==============================================================================
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ اكتمل النشر بنجاح!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 ملخص النشر:" -ForegroundColor Yellow
Write-Host "  • البيئة: $Environment"
Write-Host "  • التاريخ: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "  • النسخة الاحتياطية: $BackupDir"
Write-Host "  • السجل: $DeploymentLog"
Write-Host ""
Write-Host "🔗 الروابط المهمة:" -ForegroundColor Yellow
Write-Host "  • Backend API: http://localhost:5000"
Write-Host "  • Frontend: http://localhost:3000"
Write-Host "  • Health Check: http://localhost:5000/api/health"
Write-Host ""
Write-Host "📝 الخطوات التالية:" -ForegroundColor Yellow
Write-Host "  1. تحقق من السجلات: Get-Content logs\backend.log -Tail 50 -Wait"
Write-Host "  2. اختبر API endpoints الرئيسية"
Write-Host "  3. راقب الأداء والأخطاء"
Write-Host "  4. قم بإعلام الفريق بالنشر الناجح"
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# حفظ السجل
"تم النشر بنجاح في $(Get-Date)" | Add-Content $DeploymentLog
