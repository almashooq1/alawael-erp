# Script لطباعة ملفات المشروع
Write-Host "================================" -ForegroundColor Green
Write-Host "🖨️  بدء طباعة الملفات الأساسية" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# الملف الأول: QUICK_START_26_FEB.md
Write-Host "📄 طباعة QUICK_START_26_FEB.md..." -ForegroundColor Yellow
try {
    $quickStart = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\QUICK_START_26_FEB.md"
    if (Test-Path $quickStart) {
        # محاولة الطباعة المباشرة
        & rundll32 printui.dll PrintUIEntry /p /n "$quickStart"
        Write-Host "✅ تم إرسال QUICK_START إلى الطابعة" -ForegroundColor Green
    } else {
        Write-Host "❌ لم يتم العثور على الملف" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️  خطأ في الطباعة: $_" -ForegroundColor Red
}

Write-Host ""

# الملف الثاني: DAILY_EXECUTION_CHECKLIST.md (نسختان)
Write-Host "📄 طباعة DAILY_EXECUTION_CHECKLIST.md (نسختان)..." -ForegroundColor Yellow
try {
    $checklist = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\DAILY_EXECUTION_CHECKLIST.md"
    if (Test-Path $checklist) {
        # طباعة نسخة أولى
        & rundll32 printui.dll PrintUIEntry /p /n "$checklist"
        Write-Host "✅ تم إرسال النسخة الأولى" -ForegroundColor Green
        
        Start-Sleep -Seconds 2
        
        # طباعة نسخة ثانية
        & rundll32 printui.dll PrintUIEntry /p /n "$checklist"
        Write-Host "✅ تم إرسال النسخة الثانية" -ForegroundColor Green
    } else {
        Write-Host "❌ لم يتم العثور على الملف" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️  خطأ في الطباعة: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "✅ انتهت الطباعة!" -ForegroundColor Green
Write-Host "⏱️  وقت الانتظار: 5-10 دقائق" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Green
