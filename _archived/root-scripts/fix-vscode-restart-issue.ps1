# ============================================
# 🔧 حل مشكلة إعادة التشغيل المتكررة في VS Code
# ============================================
# هذا السكريبت يحل مشكلة تعطل VS Code المتكرر

$ErrorActionPreference = "SilentlyContinue"

# المسارات الرئيسية
$APPDATA = $env:APPDATA
$LOCALAPPDATA = $env:LOCALAPPDATA
$VSCodePath = "$APPDATA\Code"
$VSCodeLocalPath = "$LOCALAPPDATA\Code"

function Print-Header {
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

# ============================================
# 1️⃣ حذف السجلات والبيانات المؤقتة
# ============================================
Print-Header "1️⃣ تنظيف ملفات VS Code"

Print-Warning "حذف سجلات VS Code..."
Remove-Item -Path "$VSCodePath\logs" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$VSCodeLocalPath\logs" -Recurse -Force -ErrorAction SilentlyContinue
Print-Success "تم حذف السجلات"

Print-Warning "حذف البيانات المؤقتة..."
Remove-Item -Path "$VSCodePath\.cache" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$VSCodeLocalPath\.cache" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$VSCodePath\CachedExtensionVSIXs" -Recurse -Force -ErrorAction SilentlyContinue
Print-Success "تم حذف البيانات المؤقتة"

# ============================================
# 2️⃣ حذف ملفات workspaceStorage
# ============================================
Print-Header "2️⃣ إعادة تعيين ملفات العمل"

Print-Warning "حذف workspaceStorage..."
Get-ChildItem -Path "$VSCodePath\User\workspaceStorage" -ErrorAction SilentlyContinue | 
    ForEach-Object { Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
Print-Success "تم حذف ملفات العمل"

# ============================================
# 3️⃣ حذف globalStorage (بيانات الإضافات)
# ============================================
Print-Header "3️⃣ تنظيف بيانات الإضافات"

Print-Warning "حذف globalStorage..."
Get-ChildItem -Path "$VSCodePath\User\globalStorage" -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -notlike ".builtin*" } |
    ForEach-Object { Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
Print-Success "تم حذف بيانات الإضافات"

# ============================================
# 4️⃣ إنشاء ملف الإعدادات المحسّن
# ============================================
Print-Header "4️⃣ إنشاء إعدادات موصى بها"

$UserPath = "$VSCodePath\User"
if (-not (Test-Path $UserPath)) {
    New-Item -Path $UserPath -ItemType Directory -Force | Out-Null
}

$SettingsFile = "$UserPath\settings.json"

$SettingsContent = @{
    "editor.enablePreview" = $false
    "editor.maxTokenizationLineLength" = 2000
    "editor.largeFileOptimizations" = $true
    "files.watcherExclude" = @{
        "**/.git" = $true
        "**/node_modules/**" = $true
        "**/dist" = $true
        "**/build" = $true
        "**/.vscode" = $true
        "**/.venv" = $true
    }
    "extensions.verifySignature" = $false
    "telemetry.enableTelemetry" = $false
    "telemetry.enableCrashReporter" = $false
    "typescript.tsserver.maxTsServerMemory" = 3072
    "typescript.tsserver.experimental.enableProjectDiagnostics" = $false
    "editor.formatOnSave" = $false
    "files.maxSize" = 20971520
    "search.maxResults" = 5000
    "update.enableWindowsBackgroundUpdates" = $false
    "update.mode" = "manual"
    "window.zoomLevel" = 0
    "security.workspace.trust.enabled" = $false
} | ConvertTo-Json

Set-Content -Path $SettingsFile -Value $SettingsContent -Encoding UTF8
Print-Success "تم إنشاء ملف الإعدادات"

# ============================================
# 5️⃣ حذف الإضافات المشبوهة
# ============================================
Print-Header "5️⃣ تنظيف الإضافات"

$ExtensionsPath = "$VSCodePath\User\extensions"
if (Test-Path $ExtensionsPath) {
    Print-Warning "حذف مجلد الإضافات..."
    Get-ChildItem -Path $ExtensionsPath -ErrorAction SilentlyContinue |
        ForEach-Object { Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
    Print-Success "تم حذف الإضافات"
} else {
    Print-Success "لا توجد إضافات قديمة"
}

# ============================================
# 6️⃣ تنظيف node_modules الكبيرة
# ============================================
Print-Header "6️⃣ تنظيف node_modules"

Print-Warning "البحث عن مجلدات node_modules..."
$Count = Get-ChildItem -Path (Get-Location) -Recurse -Directory -Filter "node_modules" -ErrorAction SilentlyContinue | 
    Measure-Object | 
    Select-Object -ExpandProperty Count

if ($Count -gt 0) {
    Print-Warning "حذف $Count مجلد node_modules..."
    Get-ChildItem -Path (Get-Location) -Recurse -Directory -Filter "node_modules" -ErrorAction SilentlyContinue |
        ForEach-Object { Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
    Print-Success "تم حذف node_modules"
} else {
    Print-Success "لا توجد مجلدات node_modules"
}

# ============================================
# 7️⃣ إصلاح ملفات النظام
# ============================================
Print-Header "7️⃣ إصلاح إعدادات النظام"

Print-Warning "تنظيف ملفات مؤقتة..."
Remove-Item -Path "$env:Temp\*" -Force -Recurse -ErrorAction SilentlyContinue 2>$null
Remove-Item -Path "$env:LocalAppData\Temp\*" -Force -Recurse -ErrorAction SilentlyContinue 2>$null
Print-Success "تم تنظيف الملفات المؤقتة"

# ============================================
# 8️⃣ تقرير النتائج
# ============================================
Print-Header "🎉 اكتمل الإصلاح"

Write-Host ""
Write-Host "✅ تم إنجاز المهام التالية:" -ForegroundColor Green
Write-Host "✅ حذف سجلات VS Code"
Write-Host "✅ حذف البيانات المؤقتة"
Write-Host "✅ إعادة تعيين ملفات العمل"
Write-Host "✅ حذف بيانات الإضافات"
Write-Host "✅ إنشاء إعدادات محسّنة"
Write-Host "✅ تنظيف الإضافات القديمة"
Write-Host "✅ حذف node_modules الكبيرة"
Write-Host "✅ تنظيف ملفات النظام المؤقتة"

Write-Host ""
Write-Host "الخطوات التالية:" -ForegroundColor Yellow
Write-Host "1. أغلق VS Code تماماً (Ctrl+Q أو من التطبيقات الخلفية)"
Write-Host "2. انتظر 5-10 ثواني"
Write-Host "3. افتح VS Code مجدداً"
Write-Host "4. لا تثبت أي إضافات قديمة"
Write-Host "5. جرّب المشروع مجدداً"

Write-Host ""
Write-Host "إذا استمرت المشكلة:" -ForegroundColor Blue
Write-Host "• أغلق VS Code تماماً"
Write-Host "• احذف المجلد: $VSCodePath"
Write-Host "• احذف المجلد: $VSCodeLocalPath"
Write-Host "• أعد تثبيت VS Code من البداية"
Write-Host "• استخدم الإضافات بحذر"

Write-Host ""
Write-Host "القيام بفحص شامل جداً (إزالة كاملة):" -ForegroundColor Yellow
Write-Host "# احذف VS Code كاملاً:"
Write-Host "Remove-Item -Path '$VSCodePath' -Recurse -Force"
Write-Host "Remove-Item -Path '$VSCodeLocalPath' -Recurse -Force"

Write-Host ""
Write-Host "تم الانتهاء في: $(Get-Date)" -ForegroundColor Blue
Write-Host ""
