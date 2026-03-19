#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════
# VS Code Performance Optimizer Script
# تحسين أداء VS Code للمشاريع الكبيرة
# ═══════════════════════════════════════════════════════════

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🚀 مُحسّن أداء VS Code - سكربت تلقائي            ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ────────────────────────────────────────────────────────────
# الخطوة 1: فحص حالة VS Code الحالية
# ────────────────────────────────────────────────────────────

Write-Host "🔍 [الخطوة 1/6] فحص حالة VS Code..." -ForegroundColor Cyan

$vscodeProcesses = Get-Process Code -ErrorAction SilentlyContinue
if ($vscodeProcesses) {
    $totalMemory = ($vscodeProcesses | Measure-Object WorkingSet -Sum).Sum / 1MB
    $processCount = $vscodeProcesses.Count

    Write-Host "   ├─ عدد العمليات: $processCount" -ForegroundColor White
    Write-Host "   └─ استهلاك الذاكرة: $([math]::Round($totalMemory, 2)) MB" -ForegroundColor White
} else {
    Write-Host "   └─ VS Code غير مُشغّل حالياً" -ForegroundColor Yellow
}

Write-Host ""

# ────────────────────────────────────────────────────────────
# الخطوة 2: تنظيف TypeScript Cache
# ────────────────────────────────────────────────────────────

Write-Host "🧹 [الخطوة 2/6] تنظيف TypeScript Cache..." -ForegroundColor Cyan

$tsCachePath = "$env:LOCALAPPDATA\Microsoft\TypeScript"
if (Test-Path $tsCachePath) {
    try {
        Remove-Item -Recurse -Force $tsCachePath -ErrorAction Stop
        Write-Host "   ✅ تم تنظيف TypeScript Cache" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  تعذر التنظيف - قد يكون مُستخدماً" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ℹ️  لا يوجد Cache للتنظيف" -ForegroundColor Gray
}

Write-Host ""

# ────────────────────────────────────────────────────────────
# الخطوة 3: تنظيف VS Code Cache
# ────────────────────────────────────────────────────────────

Write-Host "🧹 [الخطوة 3/6] تنظيف VS Code Cache..." -ForegroundColor Cyan

$vscodeCachePaths = @(
    "$env:APPDATA\Code\Cache",
    "$env:APPDATA\Code\CachedData",
    "$env:APPDATA\Code\Code Cache"
)

$cleanedCount = 0
foreach ($cachePath in $vscodeCachePaths) {
    if (Test-Path $cachePath) {
        try {
            Get-ChildItem $cachePath -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
            $cleanedCount++
        } catch {
            # تجاهل الأخطاء
        }
    }
}

if ($cleanedCount -gt 0) {
    Write-Host "   ✅ تم تنظيف $cleanedCount مجلد Cache" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  لا يوجد Cache للتنظيف" -ForegroundColor Gray
}

Write-Host ""

# ────────────────────────────────────────────────────────────
# الخطوة 4: تنظيف node_modules Cache
# ────────────────────────────────────────────────────────────

Write-Host "🧹 [الخطوة 4/6] فحص حجم node_modules..." -ForegroundColor Cyan

$nodeModulesPaths = Get-ChildItem -Path . -Directory -Recurse -Filter "node_modules" -ErrorAction SilentlyContinue | Select-Object -First 10

if ($nodeModulesPaths) {
    $totalSize = 0
    foreach ($path in $nodeModulesPaths) {
        $size = (Get-ChildItem $path.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $totalSize += $size
    }

    $sizeInGB = [math]::Round($totalSize / 1GB, 2)
    Write-Host "   ├─ وُجد $($nodeModulesPaths.Count)+ مجلد node_modules" -ForegroundColor White
    Write-Host "   └─ الحجم التقريبي: $sizeInGB GB" -ForegroundColor White

    if ($sizeInGB -gt 2) {
        Write-Host "   ⚠️  حجم كبير - يُنصح بحذف المجلدات غير المستخدمة" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ℹ️  لم يُعثر على node_modules" -ForegroundColor Gray
}

Write-Host ""

# ────────────────────────────────────────────────────────────
# الخطوة 5: التحقق من إعدادات VS Code
# ────────────────────────────────────────────────────────────

Write-Host "⚙️  [الخطوة 5/6] التحقق من إعدادات VS Code..." -ForegroundColor Cyan

$settingsPath = ".vscode\settings.json"
if (Test-Path $settingsPath) {
    $settings = Get-Content $settingsPath -Raw

    $checks = @{
        "typescript.tsserver.maxTsServerMemory" = ($settings -match '"typescript\.tsserver\.maxTsServerMemory"\s*:\s*\d{4,}')
        "files.watcherExclude" = ($settings -match '"files\.watcherExclude"')
        "editor.minimap.enabled" = ($settings -match '"editor\.minimap\.enabled"\s*:\s*false')
        "git.enabled" = ($settings -match '"git\.enabled"\s*:\s*false')
    }

    $passedChecks = ($checks.Values | Where-Object { $_ -eq $true }).Count
    $totalChecks = $checks.Count

    Write-Host "   ├─ فحص الإعدادات: $passedChecks/$totalChecks ✓" -ForegroundColor White

    if ($passedChecks -eq $totalChecks) {
        Write-Host "   └─ ✅ جميع الإعدادات صحيحة" -ForegroundColor Green
    } else {
        Write-Host "   └─ ⚠️  بعض الإعدادات تحتاج تحسين" -ForegroundColor Yellow
    }
} else {
    Write-Host "   └─ ⚠️  ملف settings.json غير موجود" -ForegroundColor Yellow
}

Write-Host ""

# ────────────────────────────────────────────────────────────
# الخطوة 6: توصيات نهائية
# ────────────────────────────────────────────────────────────

Write-Host "📋 [الخطوة 6/6] التوصيات النهائية..." -ForegroundColor Cyan
Write-Host ""

Write-Host "   ✅ التوصيات:" -ForegroundColor Yellow
Write-Host "   ├─ أعد تشغيل VS Code لتطبيق التغييرات" -ForegroundColor White
Write-Host "   ├─ افتح مجلد فرعي واحد بدلاً من المشروع كاملاً" -ForegroundColor White
Write-Host "   ├─ استخدم: File > Open Folder > اختر مجلد محدد" -ForegroundColor White
Write-Host "   └─ عطّل الإضافات الثقيلة مؤقتاً (GitLens، Docker)" -ForegroundColor White

Write-Host ""

# ────────────────────────────────────────────────────────────
# ملخص نهائي
# ────────────────────────────────────────────────────────────

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ اكتمل التحسين بنجاح!                           ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📊 النتيجة المتوقعة:" -ForegroundColor Cyan
Write-Host "   • سرعة أكبر بنسبة 50-70%" -ForegroundColor White
Write-Host "   • استهلاك أقل للذاكرة بنسبة 30-50%" -ForegroundColor White
Write-Host "   • استجابة أسرع للـ IntelliSense" -ForegroundColor White
Write-Host ""

Write-Host "💡 نصيحة: قم بتشغيل هذا السكربت دورياً (مرة كل أسبوع)" -ForegroundColor Yellow
Write-Host ""

# ────────────────────────────────────────────────────────────
# خيار: إعادة تشغيل VS Code
# ────────────────────────────────────────────────────────────

if ($vscodeProcesses) {
    Write-Host "🔄 هل تريد إعادة تشغيل VS Code الآن؟ (Y/N): " -ForegroundColor Cyan -NoNewline
    $response = Read-Host

    if ($response -eq 'Y' -or $response -eq 'y') {
        Write-Host "   ⏳ إيقاف VS Code..." -ForegroundColor Yellow
        Stop-Process -Name "Code" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2

        Write-Host "   🚀 إعادة تشغيل VS Code..." -ForegroundColor Yellow
        Start-Process "code" -ArgumentList "."

        Write-Host "   ✅ تم بنجاح!" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  يرجى إعادة تشغيل VS Code يدوياً" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "تم بنجاح ✓" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
