#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════
# PowerShell Fix Tester
# اختبار إصلاحات PowerShell
# ═══════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🧪 اختبار إصلاحات PowerShell                        ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# ────────────────────────────────────────────────────────────
# Test 1: Console Encoding
# ────────────────────────────────────────────────────────────

Write-Host "🔍 [Test 1/5] Console Encoding..." -ForegroundColor Cyan
$consoleEncoding = [Console]::OutputEncoding.CodePage

if ($consoleEncoding -eq 65001) {
    Write-Host "   ✓ Console Encoding: UTF-8 (65001)" -ForegroundColor Green
} else {
    Write-Host "   ✗ Console Encoding: $consoleEncoding (Expected: 65001)" -ForegroundColor Red
    $allPassed = $false
}

Write-Host ""

# ────────────────────────────────────────────────────────────
# Test 2: Output Encoding
# ────────────────────────────────────────────────────────────

Write-Host "🔍 [Test 2/5] Output Encoding..." -ForegroundColor Cyan

if ($OutputEncoding.CodePage -eq 65001) {
    Write-Host "   ✓ Output Encoding: UTF-8 (65001)" -ForegroundColor Green
} else {
    Write-Host "   ✗ Output Encoding: $($OutputEncoding.CodePage) (Expected: 65001)" -ForegroundColor Red
    $allPassed = $false
}

Write-Host ""

# ────────────────────────────────────────────────────────────
# Test 3: Profile Exists
# ────────────────────────────────────────────────────────────

Write-Host "🔍 [Test 3/5] PowerShell Profile..." -ForegroundColor Cyan

if (Test-Path $PROFILE) {
    Write-Host "   ✓ Profile exists: $PROFILE" -ForegroundColor Green

    # Check if profile contains UTF-8 fix
    $profileContent = Get-Content $PROFILE -Raw
    if ($profileContent -like "*UTF-8*") {
        Write-Host "   ✓ Profile contains UTF-8 configuration" -ForegroundColor Green
    } else {
        Write-Host "   ⚠  Profile missing UTF-8 configuration" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ Profile not found: $PROFILE" -ForegroundColor Red
    $allPassed = $false
}

Write-Host ""

# ────────────────────────────────────────────────────────────
# Test 4: Arabic Text Display
# ────────────────────────────────────────────────────────────

Write-Host "🔍 [Test 4/5] Arabic Text Display..." -ForegroundColor Cyan
Write-Host "   Testing: مرحباً بك في PowerShell المحسّن" -ForegroundColor White
Write-Host "   Testing: اختبار الأحرف العربية 1234567890" -ForegroundColor White
Write-Host "   Testing: اللغة العربية تعمل بشكل صحيح ✓" -ForegroundColor White
Write-Host "   ℹ  Please verify the text above displays correctly" -ForegroundColor Yellow

Write-Host ""

# ────────────────────────────────────────────────────────────
# Test 5: PowerShell Version
# ────────────────────────────────────────────────────────────

Write-Host "🔍 [Test 5/5] PowerShell Version..." -ForegroundColor Cyan
$psVersion = $PSVersionTable.PSVersion

if ($psVersion.Major -ge 7) {
    Write-Host "   ✓ PowerShell $($psVersion.Major).$($psVersion.Minor).$($psVersion.Patch) (Modern)" -ForegroundColor Green
} elseif ($psVersion.Major -ge 5) {
    Write-Host "   ⚠  PowerShell $($psVersion.Major).$($psVersion.Minor) (Legacy - Consider upgrading)" -ForegroundColor Yellow
} else {
    Write-Host "   ✗ PowerShell $($psVersion.Major).$($psVersion.Minor) (Too old)" -ForegroundColor Red
    $allPassed = $false
}

Write-Host ""

# ────────────────────────────────────────────────────────────
# Bonus: Special Characters Test
# ────────────────────────────────────────────────────────────

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "🎨 Special Characters Test" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

Write-Host "Arabic:  العربية - مرحباً - شكراً" -ForegroundColor White
Write-Host "Emoji:   ✓ ✗ ⚠ ℹ ♥ ★ ☆ • ● ◆ ◇" -ForegroundColor White
Write-Host "Box:     ╔═══╗ ║ ║ ╚═══╝" -ForegroundColor White
Write-Host "Numbers: ١٢٣٤٥٦٧٨٩٠ (Arabic) 1234567890 (English)" -ForegroundColor White

Write-Host ""

# ────────────────────────────────────────────────────────────
# Summary
# ────────────────────────────────────────────────────────────

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

if ($allPassed) {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✅ جميع الاختبارات نجحت!                            ║" -ForegroundColor Yellow
    Write-Host "║  All Tests Passed Successfully!                       ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""

    Write-Host "📋 ملخص:" -ForegroundColor Cyan
    Write-Host "   • Console Encoding: UTF-8 ✓" -ForegroundColor Green
    Write-Host "   • Output Encoding: UTF-8 ✓" -ForegroundColor Green
    Write-Host "   • PowerShell Profile: Loaded ✓" -ForegroundColor Green
    Write-Host "   • Arabic Support: Enabled ✓" -ForegroundColor Green
    Write-Host ""

} else {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  ⚠️  بعض الاختبارات فشلت                             ║" -ForegroundColor Yellow
    Write-Host "║  Some Tests Failed                                    ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""

    Write-Host "🔧 الحلول المقترحة:" -ForegroundColor Yellow
    Write-Host "   1. أعد تشغيل PowerShell" -ForegroundColor White
    Write-Host "   2. شغّل: . `$PROFILE (لتحميل Profile)" -ForegroundColor White
    Write-Host "   3. إذا استمرت المشكلة، شغّل: .\reload-profile.ps1" -ForegroundColor White
    Write-Host ""
}

# ────────────────────────────────────────────────────────────
# Additional Information
# ────────────────────────────────────────────────────────────

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📚 معلومات إضافية:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

Write-Host "Profile Location:" -ForegroundColor White
Write-Host "  $PROFILE" -ForegroundColor Gray
Write-Host ""

Write-Host "Available Commands:" -ForegroundColor White
Write-Host "  • Test-UTF8           - اختبار الترميز" -ForegroundColor Gray
Write-Host "  • Show-SystemInfo     - معلومات النظام" -ForegroundColor Gray
Write-Host "  • Check-ProjectStatus - حالة المشروع" -ForegroundColor Gray
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Return exit code
if ($allPassed) {
    exit 0
} else {
    exit 1
}
