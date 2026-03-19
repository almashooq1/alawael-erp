#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════
# Reload PowerShell Profile
# إعادة تحميل PowerShell Profile
# ═══════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🔄 إعادة تحميل PowerShell Profile                   ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if profile exists
if (Test-Path $PROFILE) {
    Write-Host "📂 Profile Location: $PROFILE" -ForegroundColor White
    Write-Host ""

    Write-Host "⏳ جاري إعادة التحميل..." -ForegroundColor Yellow

    try {
        # Reload the profile
        . $PROFILE

        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║  ✅ تم إعادة تحميل Profile بنجاح!                   ║" -ForegroundColor Yellow
        Write-Host "║  Profile Reloaded Successfully!                       ║" -ForegroundColor Yellow
        Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""

        # Test UTF-8
        Write-Host "🧪 اختبار سريع:" -ForegroundColor Cyan
        Write-Host "   العربية: مرحباً بك ✓" -ForegroundColor White
        Write-Host "   Encoding: $([Console]::OutputEncoding.EncodingName)" -ForegroundColor White
        Write-Host ""

    } catch {
        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Red
        Write-Host "║  ❌ خطأ في إعادة التحميل                             ║" -ForegroundColor Yellow
        Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Red
        Write-Host ""

        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""

        Write-Host "🔧 الحل:" -ForegroundColor Yellow
        Write-Host "   1. أعد تشغيل PowerShell" -ForegroundColor White
        Write-Host "   2. أو راجع ملف Profile للتأكد من صحته:" -ForegroundColor White
        Write-Host "      code `$PROFILE" -ForegroundColor Gray
        Write-Host ""

        exit 1
    }

} else {
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  ⚠️  Profile غير موجود!                              ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""

    Write-Host "Expected Location: $PROFILE" -ForegroundColor White
    Write-Host ""

    Write-Host "🔧 لإنشاء Profile جديد:" -ForegroundColor Yellow
    Write-Host "   New-Item -Path `$PROFILE -ItemType File -Force" -ForegroundColor Gray
    Write-Host ""

    exit 1
}

Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
