# 🔧 سكريبت الإصلاح الشامل للمشاكل النص والـ Dependencies
# يعمل على جميع المشاريع تلقائياً

param(
    [switch]$CleanOnly,
    [switch]$InstallOnly,
    [switch]$TestOnly,
    [switch]$Full,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"
$startDir = Get-Location
$timestamp = (Get-Date -Format "yyyy-MM-dd_HH-mm-ss")
$logFile = "npm-fix-$timestamp.log"

# الألوان للـ output
$colors = @{
    Success = "Green"
    Error   = "Red"
    Warning = "Yellow"
    Info    = "Cyan"
    Header  = "Magenta"
}

function Write-Log {
    param($Message, $Color = "White", $NoNewLine = $false)
    $timestamp = (Get-Date -Format "HH:mm:ss")
    $output = "[$timestamp] $Message"
    Write-Host $output -ForegroundColor $Color -NoNewLine:$NoNewLine
    Add-Content $logFile $output
}

function Write-Header {
    param($Text)
    Write-Host "`n" -NoNewLine
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -Color $colors.Header
    Write-Log "  $Text" -Color $colors.Header
    Write-Log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -Color $colors.Header
}

function Clean-Project {
    param($ProjectPath, $ProjectName)
    
    Write-Log "🧹 تنظيف: $ProjectName" -Color $colors.Info
    
    if (Test-Path "$ProjectPath/node_modules") {
        Write-Log "  ├─ حذف node_modules..." -Color $colors.Warning
        Remove-Item -Path "$ProjectPath/node_modules" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Log "  ✅ تم" -Color $colors.Success
    }
    
    if (Test-Path "$ProjectPath/package-lock.json") {
        Write-Log "  ├─ حذف package-lock.json..." -Color $colors.Warning
        Remove-Item -Path "$ProjectPath/package-lock.json" -Force -ErrorAction SilentlyContinue
        Write-Log "  ✅ تم" -Color $colors.Success
    }
    
    if (Test-Path "$ProjectPath/.npmrc") {
        Write-Log "  ├─ حذف .npmrc..." -Color $colors.Warning
        Remove-Item -Path "$ProjectPath/.npmrc" -Force -ErrorAction SilentlyContinue
        Write-Log "  ✅ تم" -Color $colors.Success
    }
}

function Fix-PackageJson {
    param($FilePath)
    
    if (-not (Test-Path $FilePath)) {
        Write-Log "  ⚠️  ملف غير موجود: $FilePath" -Color $colors.Warning
        return
    }
    
    try {
        $content = Get-Content $FilePath -Raw
        $json = $content | ConvertFrom-Json
        
        $needsUpdate = $false
        
        # ✅ إصلاح jest
        if ($json.devDependencies.jest -eq "^30.2.0") {
            Write-Log "  🔨 إصلاح jest: 30.2.0 → 29.7.0" -Color $colors.Warning
            $json.devDependencies.jest = "^29.7.0"
            $needsUpdate = $true
        }
        
        # ✅ إصلاح express
        if ($json.dependencies.express -match "5\.[0-9]") {
            Write-Log "  🔨 إصلاح express: 5.x → 4.18.2" -Color $colors.Warning
            $json.dependencies.express = "^4.18.2"
            $needsUpdate = $true
        }
        
        # ✅ إصلاح mongodb-memory-server
        if ($json.devDependencies."mongodb-memory-server" -eq "^10.1.4") {
            Write-Log "  🔨 إصلاح mongodb-memory-server: 10.1.4 → 9.2.0" -Color $colors.Warning
            $json.devDependencies."mongodb-memory-server" = "^9.2.0"
            $needsUpdate = $true
        }
        
        if ($needsUpdate) {
            $updatedContent = $json | ConvertTo-Json -Depth 10
            Set-Content -Path $FilePath -Value $updatedContent -Encoding UTF8
            Write-Log "  ✅ تم تحديث package.json" -Color $colors.Success
        }
        else {
            Write-Log "  ✓ package.json بحالة جيدة" -Color $colors.Success
        }
    }
    catch {
        Write-Log "  ❌ خطأ في معالجة package.json: $_" -Color $colors.Error
    }
}

function Install-Dependencies {
    param($ProjectPath, $ProjectName)
    
    Write-Log "📦 تثبيت: $ProjectName" -Color $colors.Info
    Push-Location $ProjectPath
    
    try {
        Write-Log "  ├─ npm install --legacy-peer-deps --no-audit..." -Color $colors.Warning -NoNewLine
        $output = npm install --legacy-peer-deps --no-audit 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log " ✅" -Color $colors.Success
        }
        else {
            Write-Log " ⚠️" -Color $colors.Warning
            if ($Verbose) {
                Write-Log "   الـ output:" -Color $colors.Warning
                $output | ForEach-Object { Write-Log "   $_" -Color $colors.Warning }
            }
        }
    }
    catch {
        Write-Log "  ❌ خطأ أثناء التثبيت: $_" -Color $colors.Error
    }
    finally {
        Pop-Location
    }
}

function Test-Installation {
    param($ProjectPath, $ProjectName)
    
    Write-Log "🧪 اختبار: $ProjectName" -Color $colors.Info
    Push-Location $ProjectPath
    
    try {
        npm test -- --passWithNoTests 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Log "  ✅ الاختبارات تمر بنجاح" -Color $colors.Success
        }
        else {
            Write-Log "  ⚠️ قد تكون هناك مشاكل في الاختبارات" -Color $colors.Warning
        }
    }
    catch {
        Write-Log "  ⚠️ لم يتمكن من تشغيل الاختبارات" -Color $colors.Warning
    }
    finally {
        Pop-Location
    }
}

# ============================================================================

Write-Header "🚀 بدء سكريبت إصلاح المشاكل والـ Dependencies"
Write-Log "السجل: $logFile" -Color $colors.Info

# تنظيف npm cache
Write-Header "🧼 تنظيف npm Cache"
Write-Log "تنفيذ: npm cache clean --force" -Color $colors.Warning
npm cache clean --force 2>&1 | Out-Null
Write-Log "✅ تم تنظيف الـ cache" -Color $colors.Success

# المشاريع التي سيتم معالجتها
$projects = @(
    @{Path = "."; Name = "📍 الجذر الرئيسي" },
    @{Path = "erp_new_system/backend"; Name = "🔧 ERP Backend" },
    @{Path = "alawael-erp/backend"; Name = "📊 Alawael ERP Backend" },
    @{Path = "alawael-unified"; Name = "🔗 Alawael Unified" }
)

# إصلاح package.json files
Write-Header "🔨 إصلاح Package.json Files"
foreach ($project in $projects) {
    $packageJsonPath = Join-Path $project.Path "package.json"
    Write-Log "معالجة: $($project.Name)" -Color $colors.Info
    Fix-PackageJson $packageJsonPath
}

# تنظيف المشاريع
if (-not $InstallOnly -and -not $TestOnly) {
    Write-Header "🧹 تنظيف المشاريع"
    foreach ($project in $projects) {
        if (Test-Path $project.Path) {
            Clean-Project $project.Path $project.Name
        }
    }
}

# تثبيت Dependencies
if (-not $CleanOnly -and -not $TestOnly) {
    Write-Header "📦 تثبيت Dependencies"
    foreach ($project in $projects) {
        if (Test-Path $project.Path) {
            Install-Dependencies $project.Path $project.Name
        }
    }
}

# اختبار التثبيت
if (-not $CleanOnly -and -not $InstallOnly) {
    Write-Header "🧪 اختبار التثبيت"
    foreach ($project in $projects) {
        if (Test-Path $project.Path) {
            Test-Installation $project.Path $project.Name
        }
    }
}

# ملخص النهائي
Write-Header "📊 الملخص النهائي"
Write-Log "✅ تم إكمال معالجة جميع المشاريع!" -Color $colors.Success
Write-Log "📝 تحقق من السجل: $logFile" -Color $colors.Info
Write-Log "🎯 الخطوات التالية:" -Color $colors.Header
Write-Log "  1. تحقق من الأخطاء في السجل" -Color $colors.Info
Write-Log "  2. شغّل: npm start" -Color $colors.Info
Write-Log "  3. شغّل الاختبارات: npm test" -Color $colors.Info

Pop-Location
