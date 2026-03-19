# 🚀 تكامل نظام التقارير التلقائي
# Automated Reports System Integration

Write-Host "`n" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  تكامل نظام التقارير - Reports System Integration" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# Step 1: التحقق من الموقع
# ============================================================================
Write-Host "📍 Step 1: التحقق من المسار..." -ForegroundColor Yellow

if (!(Test-Path "package.json")) {
    Write-Host "❌ خطأ: لم يتم العثور على package.json" -ForegroundColor Red
    Write-Host "   يرجى تشغيل هذا السكريبت من مجلد backend" -ForegroundColor Red
    exit 1
}

Write-Host "✅ الموقع صحيح" -ForegroundColor Green

# ============================================================================
# Step 2: تثبيت المكتبات
# ============================================================================
Write-Host "`n📦 Step 2: تثبيت المكتبات المطلوبة..." -ForegroundColor Yellow

$packages = @("pdfkit", "exceljs", "node-cron")
Write-Host "   المكتبات: $($packages -join ', ')" -ForegroundColor Cyan

try {
    npm install pdfkit exceljs node-cron --save
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ تم تثبيت المكتبات بنجاح" -ForegroundColor Green
    } else {
        throw "فشل التثبيت"
    }
} catch {
    Write-Host "❌ خطأ في تثبيت المكتبات" -ForegroundColor Red
    Write-Host "   حاول يدوياً: npm install pdfkit exceljs node-cron" -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# Step 3: التحقق من ملف reports.js
# ============================================================================
Write-Host "`n📄 Step 3: التحقق من ملف reports.js..." -ForegroundColor Yellow

if (!(Test-Path "routes/reports.js")) {
    Write-Host "❌ ملف routes/reports.js غير موجود" -ForegroundColor Red
    Write-Host "   يرجى التأكد من وجود الملف" -ForegroundColor Red
    exit 1
}

Write-Host "✅ ملف reports.js موجود" -ForegroundColor Green

# ============================================================================
# Step 4: التحقق من middleware
# ============================================================================
Write-Host "`n🔒 Step 4: التحقق من middleware التوثيق..." -ForegroundColor Yellow

$authFiles = @(
    "middleware/authenticate.js",
    "middleware/auth.middleware.js",
    "middleware/jwtAuth.js",
    "security/jwtManager.js"
)

$authFound = $false
foreach ($file in $authFiles) {
    if (Test-Path $file) {
        Write-Host "✅ وجدت: $file" -ForegroundColor Green
        $authFound = $true
        break
    }
}

if (!$authFound) {
    Write-Host "⚠️  لم يتم العثور على middleware التوثيق القياسي" -ForegroundColor Yellow
    Write-Host "   سيتم استخدام jwtMiddleware من server.js" -ForegroundColor Yellow
}

# ============================================================================
# Step 5: نسخة احتياطية من server.js
# ============================================================================
Write-Host "`n💾 Step 5: إنشاء نسخة احتياطية من server.js..." -ForegroundColor Yellow

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "server.js.backup_$timestamp"

try {
    Copy-Item "server.js" $backupFile
    Write-Host "✅ تم إنشاء نسخة احتياطية: $backupFile" -ForegroundColor Green
} catch {
    Write-Host "⚠️  تحذير: لم يتم إنشاء نسخة احتياطية" -ForegroundColor Yellow
}

# ============================================================================
# Step 6: إضافة route إلى server.js
# ============================================================================
Write-Host "`n🔗 Step 6: التحقق من تكامل server.js..." -ForegroundColor Yellow

$serverContent = Get-Content "server.js" -Raw

# التحقق من وجود route بالفعل
if ($serverContent -match "require\(['\`"]\.\/routes\/reports['\`"]\)") {
    Write-Host "✅ Route موجود بالفعل في server.js" -ForegroundColor Green
} else {
    Write-Host "⚠️  Route غير موجود - يجب إضافته يدوياً" -ForegroundColor Yellow
    Write-Host "`n📝 أضف هذه الأسطر في server.js:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "// Reports System (NEW) - نظام التقارير" -ForegroundColor White
    Write-Host "const reportsSystemRoutes = require('./routes/reports');" -ForegroundColor White
    Write-Host ""
    Write-Host "// في قسم Routes:" -ForegroundColor White
    Write-Host "app.use('/api/v1/reports', authenticate, reportsSystemRoutes);" -ForegroundColor White
    Write-Host ""
}

# ============================================================================
# Step 7: اختبار النظام
# ============================================================================
Write-Host "`n🧪 Step 7: التحقق من البنية..." -ForegroundColor Yellow

$requiredFiles = @{
    "routes/reports.js" = "ملف النظام الرئيسي"
    "REPORTS_DOCUMENTATION.md" = "التوثيق"
    "reports-examples.sh" = "الأمثلة"
}

$allFilesExist = $true
foreach ($file in $requiredFiles.Keys) {
    if (Test-Path $file) {
        Write-Host "✅ $($requiredFiles[$file]): موجود" -ForegroundColor Green
    } else {
        Write-Host "❌ $($requiredFiles[$file]): غير موجود" -ForegroundColor Red
        $allFilesExist = $false
    }
}

# ============================================================================
# النتيجة النهائية
# ============================================================================
Write-Host "`n" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  📊 ملخص التكامل" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ تم تثبيت المكتبات" -ForegroundColor Green
Write-Host "✅ ملف reports.js موجود" -ForegroundColor Green

if ($allFilesExist) {
    Write-Host "✅ جميع الملفات موجودة" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎯 الخطوات التالية:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. تأكد من إضافة route في server.js (إن لم يكن موجوداً)" -ForegroundColor Cyan
Write-Host "2. شغل الخادم: npm start" -ForegroundColor Cyan
Write-Host "3. اختبر: curl http://localhost:3001/api/v1/reports/templates" -ForegroundColor Cyan
Write-Host ""

Write-Host "📖 للتفاصيل الكاملة:" -ForegroundColor Yellow
Write-Host "   - REPORTS_INTEGRATION_STEPS.md" -ForegroundColor Cyan
Write-Host "   - REPORTS_DOCUMENTATION.md" -ForegroundColor Cyan
Write-Host "   - reports-examples.sh" -ForegroundColor Cyan
Write-Host ""

Write-Host "✨ نظام التقارير جاهز!" -ForegroundColor Green
Write-Host ""
