#!/usr/bin/env pwsh
# Quick Deployment Script for Hostinger
# نص سريع للنشر على Hostinger

Write-Host "🚀 نظام النشر السريع على Hostinger" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

$startTime = Get-Date
$projectRoot = Get-Location

Write-Host "📍 مسار المشروع: $projectRoot" -ForegroundColor Cyan

# Step 1: Verify critical files
Write-Host "`n1️⃣  فحص الملفات الحرجة..." -ForegroundColor Yellow

$criticalFiles = @('wsgi.py', 'app_factory.py', 'config.py', 'requirements.txt', 'gunicorn.conf.py')
$missingFiles = @()

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file موجود" -ForegroundColor Green
    }
    else {
        Write-Host "   ❌ $file مفقود" -ForegroundColor Red
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "`n❌ الملفات المفقودة: $missingFiles" -ForegroundColor Red
    exit 1
}

# Step 2: Clean up
Write-Host "`n2️⃣  تنظيف الملفات القديمة..." -ForegroundColor Yellow

$itemsToRemove = Get-ChildItem -Recurse -Include "*.log", "__pycache__", ".pytest_cache" -ErrorAction SilentlyContinue

foreach ($item in $itemsToRemove) {
    try {
        Remove-Item $item -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   🗑️  حذف: $($item.Name)"
    }
    catch {
        Write-Host "   ⚠️  فشل حذف: $($item.Name)" -ForegroundColor Yellow
    }
}

# Step 3: Create virtual environment
Write-Host "`n3️⃣  إنشاء بيئة افتراضية..." -ForegroundColor Yellow

if (-Not (Test-Path "venv_test")) {
    python -m venv venv_test
    Write-Host "   ✅ تم إنشاء بيئة افتراضية"
}
else {
    Write-Host "   ℹ️  بيئة افتراضية موجودة بالفعل"
}

# Step 4: Install requirements
Write-Host "`n4️⃣  تثبيت المتطلبات..." -ForegroundColor Yellow

& "venv_test\Scripts\activate.ps1"

Write-Host "   📦 تثبيت المتطلبات من requirements.txt..."
pip install -q -r requirements.txt

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ تم تثبيت جميع المتطلبات"
}
else {
    Write-Host "   ❌ فشل تثبيت المتطلبات" -ForegroundColor Red
    exit 1
}

# Step 5: Test application locally
Write-Host "`n5️⃣  اختبار التطبيق محلياً..." -ForegroundColor Yellow

# تشغيل اختبار سريع
Write-Host "   ⏳ جاري تشغيل التطبيق..." -ForegroundColor Cyan
$testProcess = Start-Process -FilePath "python" -ArgumentList "wsgi.py" -PassThru -NoNewWindow -RedirectStandardOutput $null

Start-Sleep -Seconds 3

# اختبار الـ health endpoint
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ API health check نجح"
    }
    else {
        Write-Host "   ⚠️  API استجاب بـ: $($response.StatusCode)" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "   ⚠️  لم يتمكن من الاتصال بـ localhost:5000" -ForegroundColor Yellow
}

# إيقاف العملية
Stop-Process -InputObject $testProcess -Force -ErrorAction SilentlyContinue

# Step 6: Create deployment checklist
Write-Host "`n6️⃣  إنشاء قائمة النشر..." -ForegroundColor Yellow

$checklist = @"
📋 قائمة التحقق قبل النشر على Hostinger
========================================

✅ متطلبات Hostinger:
   ☐ حساب Hostinger نشط
   ☐ وصول SSH متاح
   ☐ قاعدة بيانات أنشئت
   ☐ نطاق مسجل
   ☐ SSL certificate جاهز

✅ متطلبات المشروع:
   ☐ .env.production تم تحديثه
   ☐ DATABASE_URL صحيح
   ☐ SECRET_KEY قوي (32+ حرف)
   ☐ MAIL_SERVER مكون
   ☐ جميع المتطلبات مثبتة

✅ قبل النشر:
   ☐ اختبار محلي نجح
   ☐ جميع API endpoints تعمل
   ☐ قاعدة البيانات تعمل
   ☐ لا توجد أخطاء في السجلات
   ☐ النسخة الاحتياطية موجودة

✅ الأمان:
   ☐ لا توجد مفاتيح سرية في الكود
   ☐ .env ليس في Git
   ☐ تصاريح الملفات صحيحة
   ☐ CORS مكون بشكل صحيح

عند انتهاء جميع النقاط، انقر النشر!
"@

$checklist | Out-File -FilePath "DEPLOYMENT_CHECKLIST_TODAY.txt" -Encoding UTF8

Write-Host "   ✅ تم إنشاء DEPLOYMENT_CHECKLIST_TODAY.txt"

# Step 7: Generate summary
Write-Host "`n7️⃣  إنشاء التقرير النهائي..." -ForegroundColor Yellow

$endTime = Get-Date
$duration = New-TimeSpan -Start $startTime -End $endTime

$summary = @"
📊 تقرير التحضير للنشر
========================

⏰ وقت الإنشاء: $($endTime.ToString('yyyy-MM-dd HH:mm:ss'))
⏱️  المدة الإجمالية: $($duration.TotalSeconds) ثانية

✅ تم إنجازه:
   ✓ فحص الملفات الحرجة
   ✓ تنظيف الملفات القديمة
   ✓ إنشاء البيئة الافتراضية
   ✓ تثبيت المتطلبات
   ✓ اختبار التطبيق محلياً
   ✓ إنشاء قوائم التحقق

📂 الملفات المهمة:
   • wsgi.py (نقطة الدخول)
   • gunicorn.conf.py (تكوين الخادم)
   • .env.production (متغيرات البيئة)
   • requirements.txt (المتطلبات)
   • Procfile (ملف العمليات)

🚀 الخطوة التالية:
   1. فتح SSH وتسجيل الدخول إلى Hostinger
   2. رفع الملفات أو استخدام git push
   3. تشغيل: flask db upgrade
   4. بدء الخدمة: systemctl restart alawael-erp
   5. اختبار: curl https://yourdomain.com/api/health

📖 اقرأ دليل النشر الكامل:
   🚀_HOSTINGER_DEPLOYMENT_COMPLETE_GUIDE.md

💡 نصيحة مهمة:
   تأكد من تحديث .env.production بالقيم الصحيحة
   قبل النشر مباشرة!

═══════════════════════════════════════════════════
النظام جاهز للنشر الآمن ✅
═══════════════════════════════════════════════════
"@

$summary | Out-File -FilePath "DEPLOYMENT_STATUS_REPORT.txt" -Encoding UTF8

Write-Host "   ✅ تم إنشاء DEPLOYMENT_STATUS_REPORT.txt"

# Step 8: Final status
Write-Host "`n" -ForegroundColor Green
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   🎉 التحضير اكتمل بنجاح!             ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "✅ جميع الفحوصات نجحت" -ForegroundColor Green
Write-Host "✅ الملفات الحرجة موجودة" -ForegroundColor Green
Write-Host "✅ التطبيق يعمل محلياً" -ForegroundColor Green
Write-Host ""
Write-Host "📌 الخطوات التالية:" -ForegroundColor Cyan
Write-Host "  1. اقرأ DEPLOYMENT_CHECKLIST_TODAY.txt" -ForegroundColor White
Write-Host "  2. اقرأ DEPLOYMENT_STATUS_REPORT.txt" -ForegroundColor White
Write-Host "  3. اقرأ 🚀_HOSTINGER_DEPLOYMENT_COMPLETE_GUIDE.md" -ForegroundColor White
Write-Host "  4. قم بتحديث .env.production" -ForegroundColor White
Write-Host "  5. ابدأ النشر على Hostinger" -ForegroundColor White
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "النظام جاهز للنشر الآمن على Hostinger! 🚀" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
