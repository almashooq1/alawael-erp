#!/usr/bin/env powershell
<#
.DESCRIPTION
سكريبت شامل لإعادة تشغيل النظام بأكمله
Comprehensive system recovery script
#>

param(
    [switch]$Force = $false,
    [switch]$SkipDocker = $false,
    [int]$WaitSeconds = 5
)

$colors = @{
    green  = "Green"
    red    = "Red"
    yellow = "Yellow"
    cyan   = "Cyan"
    blue   = "Blue"
}

function Write-Color {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    $timestamp = Get-Date -Format "HH:mm:ss"
    $icon = @{
        "INFO"    = "ℹ️"
        "SUCCESS" = "✅"
        "ERROR"   = "❌"
        "WARNING" = "⚠️"
    }[$Level]

    Write-Color "$timestamp $icon $Message" -Color @{
        "INFO"    = $colors.cyan
        "SUCCESS" = $colors.green
        "ERROR"   = $colors.red
        "WARNING" = $colors.yellow
    }[$Level]
}

# العنوان
Write-Color "`n" + "="*70 + "`n" -Color $colors.blue
Write-Color " 🚀 استرجاع النظام بشكل جذري - System Recovery Script" -Color $colors.blue
Write-Color "="*70 + "`n" -Color $colors.blue

$projectPath = "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"
if (-not (Test-Path $projectPath)) {
    Log "مسار المشروع غير موجود: $projectPath" "ERROR"
    exit 1
}

Set-Location $projectPath
Log "مسار المشروع: $projectPath" "INFO"

# 1️⃣ التحقق من npm و node
Log "`n[1/5] التحقق من بيئة Node.js..." "INFO"
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Log "Node.js: $nodeVersion" "SUCCESS"
    Log "npm: $npmVersion" "SUCCESS"
}
catch {
    Log "فشل التحقق من Node.js/npm" "ERROR"
    exit 1
}

# 2️⃣ تنظيف المشاريع القديمة
Log "`n[2/5] تنظيف الحاويات والصور القديمة..." "INFO"
if (-not $SkipDocker) {
    try {
        $containers = docker ps -aq 2>$null
        if ($containers) {
            Log "إيقاف الحاويات..." "WARNING"
            docker stop $containers 2>$null
            docker rm $containers 2>$null
        }
        Log "تم تنظيف الحاويات" "SUCCESS"
    }
    catch {
        Log "عدم القدرة على الوصول إلى Docker (قد يكون معطلاً)" "WARNING"
    }
}
else {
    Log "تم تخطي تنظيف Docker" "INFO"
}

# 3️⃣ إعادة تثبيت المكتبات
Log "`n[3/5] إعادة تثبيت المكتبات..." "INFO"
try {
    if (Test-Path "node_modules") {
        Log "حذف node_modules القديم..." "INFO"
        Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
    }

    Log "تثبيت المكتبات الجديدة..." "INFO"
    npm install --legacy-peer-deps
    Log "تم تثبيت المكتبات بنجاح" "SUCCESS"
}
catch {
    Log "فشل تثبيت المكتبات: $_" "ERROR"
    exit 1
}

# 4️⃣ بناء الصور وتشغيل Docker
Log "`n[4/5] بناء وتشغيل Docker Compose..." "INFO"
if (-not $SkipDocker) {
    try {
        Log "بناء الصور..." "INFO"
        docker-compose build --no-cache 2>&1

        Log "تشغيل الخدمات..." "INFO"
        docker-compose up -d

        Log "الانتظار لتشغيل الخدمات..." "INFO"
        Start-Sleep -Seconds $WaitSeconds

        $status = docker-compose ps 2>$null
        if ($status) {
            Log "حالة الخدمات:" "SUCCESS"
            Write-Host ($status | Out-String)
        }
    }
    catch {
        Log "فشل بناء/تشغيل Docker: $_" "ERROR"
    }
}
else {
    Log "تم تخطي Docker Compose" "INFO"
}

# 5️⃣ فحص الصحة
Log "`n[5/5] فحص صحة الخدمات..." "INFO"
Start-Sleep -Seconds 2

try {
    Log "فحص الخدمات المحلية..." "INFO"
    node scripts/monitoring/health-check-local.js
    Log "تم فحص الخدمات" "SUCCESS"
}
catch {
    Log "تعذر فحص الخدمات: $_" "WARNING"
}

# 📊 ملخص النهاية
Log "`n" + "="*70 -Color $colors.blue
Log " 🎉 استرجاع النظام اكتمل" -Color $colors.green
Log "="*70 -Color $colors.blue

Write-Color "`n📋 الأوامر المتاحة:" -Color $colors.cyan
Write-Color "  npm run health:check        - فحص الصحة مرة واحدة" -Color $colors.blue
Write-Color "  npm run monitor:all         - مراقبة مستمرة" -Color $colors.blue
Write-Color "  npm run dev                 - تطوير محلي" -Color $colors.blue
Write-Color "  docker-compose logs -f      - عرض السجلات" -Color $colors.blue
Write-Color "`n"
