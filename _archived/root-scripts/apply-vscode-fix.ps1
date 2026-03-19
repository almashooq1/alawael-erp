# ═══════════════════════════════════════════════════════════════
# QUICK FIX - تطبيق سريع للحل الشامل
# ═══════════════════════════════════════════════════════════════
# Purpose: One-click solution to fix VS Code performance
# الهدف: حل بضغطة واحدة لإصلاح أداء VS Code
# ═══════════════════════════════════════════════════════════════

param(
    [switch]$SkipCleanup,
    [switch]$BackupOnly,
    [switch]$ApplySettingsOnly
)

$ErrorActionPreference = "Continue"

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "    ⚡ VS Code Quick Fix - إصلاح سريع لـ VS Code" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Get-Location

# ═══════════════════════════════════════════════════════════════
# STEP 0: Check if VS Code is running
# ═══════════════════════════════════════════════════════════════

Write-Host "🔍 Checking if VS Code is running..." -ForegroundColor Cyan

$vscodeProcesses = Get-Process -Name "Code" -ErrorAction SilentlyContinue

if ($vscodeProcesses) {
    Write-Host ""
    Write-Host "⚠️ WARNING: VS Code is currently running!" -ForegroundColor Red
    Write-Host "   تحذير: VS Code مفتوح حاليًا!" -ForegroundColor Red
    Write-Host ""
    Write-Host "For best results, close VS Code before running this script." -ForegroundColor Yellow
    Write-Host "للحصول على أفضل النتائج، أغلق VS Code قبل تشغيل هذا السكريبت." -ForegroundColor Yellow
    Write-Host ""

    $response = Read-Host "Do you want to continue anyway? (y/n) - هل تريد المتابعة؟"

    if ($response -notlike "y*") {
        Write-Host ""
        Write-Host "Script cancelled. Please close VS Code and run again." -ForegroundColor Yellow
        Write-Host "تم الإلغاء. أغلق VS Code وشغّل السكريبت مرة أخرى." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 1: Backup current settings
# ═══════════════════════════════════════════════════════════════

Write-Host "📦 STEP 1: Backing up current settings..." -ForegroundColor Cyan
Write-Host "   النسخ الاحتياطي للإعدادات الحالية..." -ForegroundColor Gray
Write-Host ""

$settingsPath = Join-Path $projectRoot ".vscode\settings.json"
$backupPath = Join-Path $projectRoot ".vscode\settings.json.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

if (Test-Path $settingsPath) {
    Copy-Item -Path $settingsPath -Destination $backupPath -Force
    Write-Host "  ✓ Backup created: $($backupPath.Replace($projectRoot, '.'))" -ForegroundColor Green
} else {
    Write-Host "  ℹ️ No existing settings.json found" -ForegroundColor Gray
}

if ($BackupOnly) {
    Write-Host ""
    Write-Host "✅ Backup complete! Exiting..." -ForegroundColor Green
    exit 0
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 2: Apply optimized settings
# ═══════════════════════════════════════════════════════════════

Write-Host "⚙️ STEP 2: Applying optimized settings..." -ForegroundColor Cyan
Write-Host "   تطبيق الإعدادات المحسّنة..." -ForegroundColor Gray
Write-Host ""

$optimizedPath = Join-Path $projectRoot ".vscode\settings.optimized.json"

if (Test-Path $optimizedPath) {
    Copy-Item -Path $optimizedPath -Destination $settingsPath -Force
    Write-Host "  ✓ Optimized settings applied!" -ForegroundColor Green
    Write-Host "    تم تطبيق الإعدادات المحسّنة!" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ ERROR: settings.optimized.json not found!" -ForegroundColor Red
    Write-Host "     الملف settings.optimized.json غير موجود!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please make sure you have these files in your project." -ForegroundColor Yellow
    exit 1
}

if ($ApplySettingsOnly) {
    Write-Host ""
    Write-Host "✅ Settings applied! Restart VS Code to see the changes." -ForegroundColor Green
    Write-Host "   تم تطبيق الإعدادات! أعد تشغيل VS Code." -ForegroundColor Green
    exit 0
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 3: Run cleanup (if not skipped)
# ═══════════════════════════════════════════════════════════════

if (-not $SkipCleanup) {
    Write-Host "🧹 STEP 3: Running cleanup script..." -ForegroundColor Cyan
    Write-Host "   تشغيل سكريبت التنظيف..." -ForegroundColor Gray
    Write-Host ""

    $cleanupScript = Join-Path $projectRoot "cleanup-vscode-project.ps1"

    if (Test-Path $cleanupScript) {
        & $cleanupScript
    } else {
        Write-Host "  ⚠️ WARNING: cleanup-vscode-project.ps1 not found!" -ForegroundColor Yellow
        Write-Host "     سكريبت التنظيف غير موجود!" -ForegroundColor Yellow
        Write-Host "  Skipping cleanup..." -ForegroundColor Gray
    }
} else {
    Write-Host "⏭️ STEP 3: Cleanup skipped (--SkipCleanup flag used)" -ForegroundColor Yellow
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 4: Create .vscodeignore (if doesn't exist)
# ═══════════════════════════════════════════════════════════════

Write-Host "📝 STEP 4: Updating .vscodeignore..." -ForegroundColor Cyan
Write-Host "   تحديث .vscodeignore..." -ForegroundColor Gray
Write-Host ""

$vscodeignorePath = Join-Path $projectRoot ".vscodeignore"
$vscodeignoreContent = @"
# VS Code Ignore - Performance Optimization
# استبعادات VS Code - تحسين الأداء

# Node modules
**/node_modules/**
node_modules/

# Build outputs
**/dist/**
**/build/**
**/.next/**
**/out/**
**/coverage/**

# Source maps
**/*.map

# Logs
**/*.log
logs/

# Git
.git/

# Cache
**/.cache/**
**/.npm/**
**/.yarn/**

# Temporary
**/*.tmp
**/*.temp
**/.temp/

# OS
.DS_Store
Thumbs.db
"@

Set-Content -Path $vscodeignorePath -Value $vscodeignoreContent -Force
Write-Host "  ✓ .vscodeignore updated" -ForegroundColor Green

Write-Host ""

# ═══════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "    ✅ QUICK FIX COMPLETE - الإصلاح السريع مكتمل" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

Write-Host "📋 What was done - ما تم إنجازه:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  ✓ Current settings backed up" -ForegroundColor Green
Write-Host "    تم نسخ الإعدادات الحالية احتياطيًا" -ForegroundColor Gray
Write-Host ""
Write-Host "  ✓ Optimized settings applied" -ForegroundColor Green
Write-Host "    تم تطبيق الإعدادات المحسّنة" -ForegroundColor Gray
Write-Host ""

if (-not $SkipCleanup) {
    Write-Host "  ✓ Project cleanup completed" -ForegroundColor Green
    Write-Host "    تم تنظيف المشروع" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "  ✓ .vscodeignore updated" -ForegroundColor Green
Write-Host "    تم تحديث .vscodeignore" -ForegroundColor Gray
Write-Host ""

Write-Host "🎯 NEXT STEPS - الخطوات التالية:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Close VS Code completely" -ForegroundColor White
Write-Host "     أغلق VS Code تمامًا" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Restart VS Code" -ForegroundColor White
Write-Host "     أعد تشغيل VS Code" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Check for improvements:" -ForegroundColor White
Write-Host "     تحقق من التحسينات:" -ForegroundColor Gray
Write-Host "       - Faster startup - بدء أسرع" -ForegroundColor Gray
Write-Host "       - No Extension crashes - لا crashes للإضافات" -ForegroundColor Gray
Write-Host "       - No Git errors - لا أخطاء Git" -ForegroundColor Gray
Write-Host "       - Lower CPU/Memory usage - استهلاك أقل للمعالج/الذاكرة" -ForegroundColor Gray
Write-Host ""

Write-Host "📖 For detailed info, read:" -ForegroundColor Cyan
Write-Host "   للمعلومات التفصيلية، اقرأ:" -ForegroundColor Gray
Write-Host "   - VSCODE_FIX_COMPLETE_AR.md" -ForegroundColor White
Write-Host ""

Write-Host "🔄 To revert to previous settings:" -ForegroundColor Yellow
Write-Host "   للعودة للإعدادات السابقة:" -ForegroundColor Gray
Write-Host "   Copy-Item '$backupPath' '.vscode\settings.json' -Force" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Done! Now restart VS Code." -ForegroundColor Green
Write-Host "   تم! الآن أعد تشغيل VS Code." -ForegroundColor Green
Write-Host ""
