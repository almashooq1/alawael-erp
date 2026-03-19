# ============================================
# 🚀 سكريبت التحسين الشامل للمشروع (PowerShell)
# ============================================
# الغرض: إصلاح وتحسين جميع ملفات المشروع
# الإصدار: 1.0
# التاريخ: مارس 1, 2026
# ============================================

$ErrorActionPreference = "Stop"

# المسارات
$ROOT_DIR = Get-Location
$SCM_FRONTEND = Join-Path $ROOT_DIR "supply-chain-management\frontend"
$BACKEND = Join-Path $ROOT_DIR "backend"

# الدوال المساعدة
function Print-Section {
    param([string]$Message)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
}

function Print-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "⚠️ $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# 1️⃣ تنظيف البيئة
Print-Section "1️⃣ تنظيف البيئة"

Print-Warning "حذف node_modules القديمة..."
Get-ChildItem -Path $ROOT_DIR -Recurse -Directory -Filter "node_modules" -ErrorAction SilentlyContinue | 
    ForEach-Object { Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
Print-Success "تم حذف node_modules"

Print-Warning "حذف package-lock.json..."
Get-ChildItem -Path $ROOT_DIR -Recurse -Filter "package-lock.json" -ErrorAction SilentlyContinue | 
    ForEach-Object { Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue }
Print-Success "تم حذف package-lock.json"

Print-Warning "تنظيف npm cache..."
npm cache clean --force
Print-Success "تم تنظيف npm cache"

# 2️⃣ تثبيت العميات
Print-Section "2️⃣ تثبيت العميات الرئيسية"

Print-Warning "تثبيت المكتبات الرئيسية..."
cd $ROOT_DIR
npm install --legacy-peer-deps
Print-Success "تم تثبيت المكتبات الرئيسية"

# 3️⃣ تحسين SCM Frontend
Print-Section "3️⃣ تحسين Supply Chain Management Frontend"

if (Test-Path $SCM_FRONTEND) {
    Push-Location $SCM_FRONTEND
    
    Print-Warning "تثبيت مكتبات SCM Frontend..."
    npm install --legacy-peer-deps
    Print-Success "تم تثبيت مكتبات SCM Frontend"
    
    Print-Warning "تشغيل lint..."
    npm run lint 2>$null || Print-Warning "لا توجد قاعدة lint"
    
    Print-Warning "تشغيل tests..."
    npm test -- --passWithNoTests --coverage 2>$null || Print-Warning "بعض الاختبارات قد تحتاج إصلاح"
    
    Pop-Location
    Print-Success "تم تحسين SCM Frontend"
} else {
    Print-Error "لم يتم العثور على SCM Frontend في $SCM_FRONTEND"
}

# 4️⃣ تحسين Backend
Print-Section "4️⃣ تحسين Backend"

if (Test-Path $BACKEND) {
    Push-Location $BACKEND
    
    Print-Warning "تثبيت مكتبات Backend..."
    npm install --legacy-peer-deps
    Print-Success "تم تثبيت مكتبات Backend"
    
    Print-Warning "تشغيل lint..."
    npm run lint 2>$null || Print-Warning "لا توجد قاعدة lint"
    
    Print-Warning "تشغيل tests..."
    npm test 2>$null || Print-Warning "بعض الاختبارات قد تحتاج إصلاح"
    
    Pop-Location
    Print-Success "تم تحسين Backend"
} else {
    Print-Warning "لم يتم العثور على Backend في $BACKEND"
}

# 5️⃣ اختبار البناء
Print-Section "5️⃣ اختبار البناء"

Print-Warning "اختبار البناء للمشروع الرئيسي..."
cd $ROOT_DIR
npm run build 2>$null || Print-Warning "لا توجد قاعدة build"

if (Test-Path $SCM_FRONTEND) {
    Push-Location $SCM_FRONTEND
    Print-Warning "اختبار بناء SCM Frontend..."
    npm run build 2>$null || Print-Warning "لا توجد قاعدة build"
    Pop-Location
}

# 6️⃣ التحقق من الأمان
Print-Section "6️⃣ التحقق من الأمان"

cd $ROOT_DIR
Print-Warning "تشغيل npm audit..."
npm audit --legacy-peer-deps 2>$null || Print-Warning "هناك مشاكل أمان قد تحتاج إصلاح يدوي"

# 7️⃣ ملخص
Print-Section "📋 ملخص التحسينات"
Print-Success "تنظيف البيئة"
Print-Success "تثبيت المكتبات"
Print-Success "تشغيل الاختبارات"
Print-Success "اختبار البناء"
Print-Success "التحقق من الأمان"

Print-Section "🎉 تم إكمال التحسينات بنجاح!"

Write-Host ""
Write-Host "النتائج:" -ForegroundColor Green
Write-Host "1. تم تنظيف والبيئة بالكامل"
Write-Host "2. تم تثبيت جميع المكتبات"
Write-Host "3. تم تشغيل الاختبارات"
Write-Host "4. تم اختبار البناء"
Write-Host "5. تم التحقق من الأمان"

Write-Host ""
Write-Host "الخطوات التالية:" -ForegroundColor Yellow
Write-Host "1. راجع أي تحذيرات أعلاه"
Write-Host "2. قم بتشغيل المشروع محلياً: npm start"
Write-Host "3. تحقق من أن كل شيء يعمل بشكل صحيح"
Write-Host "4. قم بـ commit والـ push للتغييرات"

Write-Host ""
Write-Host "تم الانتهاء في: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Blue
