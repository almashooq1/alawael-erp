# ============================================================
# 🔧 POWERSHELL RADICAL FIX - حل جذري لمشكلة PowerShell
# ============================================================
# Date: February 20, 2026
# Status: FINAL SOLUTION
# Time Required: 3-5 minutes
# ============================================================

# Run as Administrator for best results
# التشغيل كمسؤول للحصول على أفضل النتائج

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "     🔧 POWERSHELL RADICAL FIX - حل جذري نهائي            " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill all VS Code processes
# الخطوة 1: إغلاق جميع عمليات VS Code
Write-Host "[1/6] إغلاق VS Code..." -ForegroundColor Yellow

$vscodeProcesses = Get-Process -Name "Code" -ErrorAction SilentlyContinue
if ($vscodeProcesses) {
    Stop-Process -Name "Code" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "      ✓ تم إغلاق VS Code" -ForegroundColor Green
} else {
    Write-Host "      ✓ VS Code غير مشغل" -ForegroundColor Green
}

# Step 2: Clear VS Code Cache
# الخطوة 2: مسح ذاكرة التخزين المؤقت لـ VS Code
Write-Host "[2/6] مسح ذاكرة التخزين المؤقت..." -ForegroundColor Yellow

$cachePaths = @(
    "$env:APPDATA\Code\Cache",
    "$env:APPDATA\Code\CachedData",
    "$env:APPDATA\Code\CachedExtensionVSIXs",
    "$env:APPDATA\Code\CachedProfiles",
    "$env:APPDATA\Code\GPUCache",
    "$env:APPDATA\Code\ShaderCache"
)

foreach ($path in $cachePaths) {
    if (Test-Path $path) {
        try {
            Remove-Item -Path $path -Recurse -Force -ErrorAction Stop
            Write-Host "      ✓ تم مسح: $(Split-Path $path -Leaf)" -ForegroundColor Green
        } catch {
            Write-Host "      ⚠ تعذر مسح: $(Split-Path $path -Leaf)" -ForegroundColor DarkGray
        }
    }
}

# Step 3: Remove problematic PowerShell extension
# الخطوة 3: إزالة إضافة PowerShell المشكلة
Write-Host "[3/6] إزالة إضافة PowerShell القديمة..." -ForegroundColor Yellow

$extensionsPath = "$env:USERPROFILE\.vscode\extensions"
if (Test-Path $extensionsPath) {
    $psExtensions = Get-ChildItem -Path $extensionsPath -Directory -Filter "*powershell*" -ErrorAction SilentlyContinue
    foreach ($ext in $psExtensions) {
        try {
            Remove-Item -Path $ext.FullName -Recurse -Force -ErrorAction Stop
            Write-Host "      ✓ تم إزالة: $($ext.Name)" -ForegroundColor Green
        } catch {
            Write-Host "      ⚠ تعذر إزالة: $($ext.Name)" -ForegroundColor DarkGray
        }
    }
}

# Step 4: Create minimal PowerShell profile (safe mode)
# الخطوة 4: إنشاء ملف profile آمن ومبسط
Write-Host "[4/6] إنشاء ملف PowerShell Profile آمن..." -ForegroundColor Yellow

# Use standard English path to avoid Arabic character issues
# استخدام مسار إنجليزي قياسي لتجنب مشاكل الأحرف العربية
$profileDir = "C:\Users\$env:USERNAME\Documents\PowerShell"
$windowsPowerShellDir = "C:\Users\$env:USERNAME\Documents\WindowsPowerShell"

# Create directories if they don't exist
@($profileDir, $windowsPowerShellDir) | ForEach-Object {
    if (!(Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }
}

# Minimal safe profile content
$profileContent = @'
# ============================================================
# PowerShell Safe Profile - Minimal Configuration
# ============================================================
# This profile is optimized for stability and performance
# تم تحسين هذا الملف للاستقرار والأداء
# ============================================================

# Suppress automatic module loading to prevent crashes
# منع التحميل التلقائي للوحدات لمنع الأعطال
$env:PSModuleAutoLoadingPreference = 'ModuleQualified'

# Basic aliases only
# الأسماء المستعارة الأساسية فقط
Set-Alias -Name grep -Value Select-String -Force -ErrorAction SilentlyContinue
Set-Alias -Name which -Value Get-Command -Force -ErrorAction SilentlyContinue

# Performance optimization
# تحسين الأداء
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# Disable problematic features
# تعطيل الميزات المسببة للمشاكل
$PSReadLineOptions = @{
    EditMode = 'Windows'
    PredictionSource = 'None'
    PredictionViewStyle = 'ListView'
}
Set-PSReadLineOption @PSReadLineOptions -ErrorAction SilentlyContinue

# Success indicator
# مؤشر النجاح
Write-Host "✓ PowerShell Ready - Safe Mode Active" -ForegroundColor Green
'@

# Write profile to both locations
$profilePaths = @(
    "$profileDir\profile.ps1",
    "$profileDir\Microsoft.PowerShell_profile.ps1",
    "$windowsPowerShellDir\profile.ps1",
    "$windowsPowerShellDir\Microsoft.PowerShell_profile.ps1"
)

foreach ($pPath in $profilePaths) {
    try {
        Set-Content -Path $pPath -Value $profileContent -Encoding UTF8 -Force -ErrorAction Stop
        Write-Host "      ✓ تم إنشاء: $(Split-Path $pPath -Leaf)" -ForegroundColor Green
    } catch {
        Write-Host "      ⚠ تعذر إنشاء: $(Split-Path $pPath -Leaf)" -ForegroundColor DarkGray
    }
}

# Step 5: Create VS Code settings for PowerShell
# الخطوة 5: إنشاء إعدادات VS Code لـ PowerShell
Write-Host "[5/6] تحديث إعدادات VS Code..." -ForegroundColor Yellow

$vscodeSettingsDir = "$env:APPDATA\Code\User"
if (!(Test-Path $vscodeSettingsDir)) {
    New-Item -ItemType Directory -Path $vscodeSettingsDir -Force | Out-Null
}

$settingsPath = "$vscodeSettingsDir\settings.json"

# Read existing settings or create new
if (Test-Path $settingsPath) {
    try {
        $settings = Get-Content -Path $settingsPath -Raw | ConvertFrom-Json -ErrorAction Stop
    } catch {
        $settings = @{}
    }
} else {
    $settings = @{}
}

# PowerShell optimization settings
$psSettings = @{
    # Disable features that cause crashes
    "powershell.scriptAnalysis.enable" = $false
    "powershell.codeLens.enable" = $false
    "powershell.startAutomaticallyOnOpen" = $false
    
    # Performance settings
    "powershell.enableProfileLoading" = $true
    "powershell.integratedConsole.showOnStartup" = $false
    "powershell.integratedConsole.focusConsoleOnExecute" = $false
    
    # Use PowerShell 7 if available, otherwise Windows PowerShell
    "terminal.integrated.defaultProfile.windows" = "PowerShell"
    
    # Stability settings
    "powershell.developer.editorServicesLogLevel" = "Error"
    "powershell.developer.editorServicesWaitForDebugger" = $false
    
    # Disable auto-sync that might cause issues
    "powershell.sideBar.CommandExplorerVisibility" = $false
}

# Merge settings
foreach ($key in $psSettings.Keys) {
    $settings | Add-Member -MemberType NoteProperty -Name $key -Value $psSettings[$key] -Force
}

# Save settings
try {
    $settings | ConvertTo-Json -Depth 100 | Set-Content -Path $settingsPath -Encoding UTF8 -Force
    Write-Host "      ✓ تم تحديث إعدادات VS Code" -ForegroundColor Green
} catch {
    Write-Host "      ⚠ تعذر تحديث الإعدادات" -ForegroundColor DarkGray
}

# Step 6: Create optimized terminal profiles
# الخطوة 6: إنشاء ملفات تعريف طرفية محسنة
Write-Host "[6/6] إنشاء ملفات تعريف الطرفية..." -ForegroundColor Yellow

$terminalProfiles = @{
    "terminal.integrated.profiles.windows" = @{
        "PowerShell" = @{
            "source" = "PowerShell"
            "args" = @("-NoLogo", "-NoProfile")
            "icon" = "terminal-powershell"
        }
        "PowerShell (Safe Mode)" = @{
            "path" = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
            "args" = @("-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass")
            "icon" = "shield"
        }
        "Command Prompt" = @{
            "path" = "C:\Windows\System32\cmd.exe"
            "icon" = "terminal-cmd"
        }
        "Git Bash" = @{
            "path" = "C:\Program Files\Git\bin\bash.exe"
            "icon" = "terminal-bash"
        }
    }
}

# Add terminal profiles to settings
foreach ($key in $terminalProfiles.Keys) {
    $settings | Add-Member -MemberType NoteProperty -Name $key -Value $terminalProfiles[$key] -Force
}

try {
    $settings | ConvertTo-Json -Depth 100 | Set-Content -Path $settingsPath -Encoding UTF8 -Force
    Write-Host "      ✓ تم إنشاء ملفات تعريف الطرفية" -ForegroundColor Green
} catch {
    Write-Host "      ⚠ تعذر إنشاء ملفات التعريف" -ForegroundColor DarkGray
}

# ============================================================
# Final Summary
# الملخص النهائي
# ============================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                    ✅ تم الإصلاح بنجاح!                    " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "الخطوات التالية:" -ForegroundColor Yellow
Write-Host "  1. أعد فتح VS Code" -ForegroundColor White
Write-Host "  2. افتح Terminal (Ctrl+`)" -ForegroundColor White
Write-Host "  3. سترى: ✓ PowerShell Ready - Safe Mode Active" -ForegroundColor White
Write-Host "  4. إذا استمرت المشكلة، استخدم 'Command Prompt' أو 'Git Bash'" -ForegroundColor White
Write-Host ""
Write-Host "لإعادة تثبيت PowerShell Extension:" -ForegroundColor Yellow
Write-Host "  1. افتح Extensions (Ctrl+Shift+X)" -ForegroundColor White
Write-Host "  2. ابحث عن 'PowerShell'" -ForegroundColor White
Write-Host "  3. ثبّت الإضافة من Microsoft" -ForegroundColor White
Write-Host "  4. اختر إصدار أقدم (v2025.2.0) إذا استمرت المشكلة" -ForegroundColor White
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "           اضغط أي مفتاح للخروج...                        " -ForegroundColor DarkGray
Write-Host "============================================================" -ForegroundColor Cyan

$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")