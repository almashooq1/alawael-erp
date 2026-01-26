#!/usr/bin/env pwsh
<#
.SYNOPSIS
    MongoDB Atlas Setup Script - سكريبت إعداد MongoDB Atlas تلقائياً
    
.DESCRIPTION
    يقوم هذا السكريبت بإعداد MongoDB Atlas بشكل تلقائي:
    1. التحقق من وجود اتصال MongoDB
    2. تحديث ملف .env
    3. إعادة تشغيل Backend
    4. التحقق من الاتصال
    
.PARAMETER ConnectionString
    سلسلة الاتصال بـ MongoDB Atlas
    
.PARAMETER SkipBackup
    تخطي نسخ احتياطي للإعدادات الحالية
    
.EXAMPLE
    .\Setup-MongoDB.ps1 -ConnectionString "mongodb+srv://user:pass@cluster.mongodb.net/alawael_erp"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$ConnectionString,
    
    [Parameter(Mandatory = $false)]
    [switch]$SkipBackup,
    
    [Parameter(Mandatory = $false)]
    [switch]$Interactive = $true
)

# Colors
$colors = @{
    Success = "Green"
    Error   = "Red"
    Warning = "Yellow"
    Info    = "Cyan"
    Heading = "Magenta"
}

function Write-StepHeader {
    param([string]$Message)
    Write-Host "`n╔════════════════════════════════════════════╗" -ForegroundColor $colors.Heading
    Write-Host "║  $Message" -ForegroundColor White
    Write-Host "╚════════════════════════════════════════════╝`n" -ForegroundColor $colors.Heading
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ✅ $Message" -ForegroundColor $colors.Success
}

function Write-Info {
    param([string]$Message)
    Write-Host "  ℹ️  $Message" -ForegroundColor $colors.Info
}

function Write-Warning {
    param([string]$Message)
    Write-Host "  ⚠️  $Message" -ForegroundColor $colors.Warning
}

function Write-Error {
    param([string]$Message)
    Write-Host "  ❌ $Message" -ForegroundColor $colors.Error
}

# Main Script
Write-Host "`n"
Write-Host "████████████████████████████████████████████" -ForegroundColor $colors.Heading
Write-Host "█  MongoDB Atlas Setup - إعداد MongoDB   █" -ForegroundColor White
Write-Host "████████████████████████████████████████████" -ForegroundColor $colors.Heading
Write-Host "`n"

$BackendPath = Join-Path $PSScriptRoot "backend"
$EnvFile = Join-Path $BackendPath ".env"

# Step 1: Check if .env exists
Write-StepHeader "الخطوة 1: التحقق من ملف .env"

if (-not (Test-Path $EnvFile)) {
    Write-Error "ملف .env غير موجود في: $EnvFile"
    Write-Info "يرجى إنشاء ملف .env أولاً"
    exit 1
}

Write-Success "ملف .env موجود"

# Step 2: Backup current .env
if (-not $SkipBackup) {
    Write-StepHeader "الخطوة 2: نسخ احتياطي للإعدادات الحالية"
    
    $BackupFile = "$EnvFile.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item $EnvFile $BackupFile -Force
    Write-Success "تم إنشاء نسخة احتياطية: $(Split-Path $BackupFile -Leaf)"
}

# Step 3: Get MongoDB Connection String
Write-StepHeader "الخطوة 3: الحصول على Connection String"

if (-not $ConnectionString) {
    Write-Info "لم يتم توفير Connection String"
    Write-Host "`n"
    Write-Host "════════════════════════════════════════════" -ForegroundColor $colors.Info
    Write-Host "  خيارات الإعداد:" -ForegroundColor White
    Write-Host "════════════════════════════════════════════" -ForegroundColor $colors.Info
    Write-Host "`n"
    Write-Host "  [1] استخدام MongoDB Atlas (موصى به)" -ForegroundColor $colors.Success
    Write-Host "      - قاعدة بيانات سحابية مجانية" -ForegroundColor Gray
    Write-Host "      - 512 MB storage" -ForegroundColor Gray
    Write-Host "      - Backup تلقائي" -ForegroundColor Gray
    Write-Host "`n"
    Write-Host "  [2] استخدام MongoDB محلي" -ForegroundColor White
    Write-Host "      - يجب أن يكون MongoDB مثبتاً" -ForegroundColor Gray
    Write-Host "      - mongodb://localhost:27017" -ForegroundColor Gray
    Write-Host "`n"
    Write-Host "  [3] الاحتفاظ بـ In-Memory DB" -ForegroundColor Yellow
    Write-Host "      - بيانات مؤقتة (للتطوير فقط)" -ForegroundColor Gray
    Write-Host "`n"
    Write-Host "════════════════════════════════════════════`n" -ForegroundColor $colors.Info
    
    if ($Interactive) {
        $choice = Read-Host "اختر الخيار (1/2/3)"
        
        switch ($choice) {
            "1" {
                Write-Host "`n"
                Write-Info "لإعداد MongoDB Atlas:"
                Write-Host "  1. زيارة: https://mongodb.com/cloud/atlas/register" -ForegroundColor White
                Write-Host "  2. إنشاء حساب مجاني" -ForegroundColor White
                Write-Host "  3. إنشاء Cluster جديد (Free M0)" -ForegroundColor White
                Write-Host "  4. إضافة Database User" -ForegroundColor White
                Write-Host "  5. إضافة IP Address: 0.0.0.0/0" -ForegroundColor White
                Write-Host "  6. الحصول على Connection String" -ForegroundColor White
                Write-Host "`n"
                
                $ConnectionString = Read-Host "الصق Connection String هنا"
                
                if (-not $ConnectionString) {
                    Write-Error "لم يتم إدخال Connection String"
                    exit 1
                }
            }
            "2" {
                $ConnectionString = "mongodb://localhost:27017/alawael_erp"
                Write-Success "سيتم استخدام MongoDB المحلي"
            }
            "3" {
                Write-Warning "سيتم الاحتفاظ بـ In-Memory DB"
                Write-Info "لن يتم إجراء أي تغييرات"
                exit 0
            }
            default {
                Write-Error "خيار غير صحيح"
                exit 1
            }
        }
    }
    else {
        Write-Error "يجب توفير -ConnectionString في الوضع غير التفاعلي"
        exit 1
    }
}

# Step 4: Validate Connection String
Write-StepHeader "الخطوة 4: التحقق من صحة Connection String"

if ($ConnectionString -match "^mongodb(\+srv)?://") {
    Write-Success "Connection String صالح"
    
    # Extract database name
    if ($ConnectionString -match "/([^/?]+)(\?|$)") {
        $dbName = $Matches[1]
        Write-Info "اسم قاعدة البيانات: $dbName"
    }
    else {
        Write-Warning "لم يتم العثور على اسم قاعدة البيانات في Connection String"
        Write-Info "سيتم إضافة /alawael_erp تلقائياً"
        
        if ($ConnectionString -notmatch "/$") {
            $ConnectionString += "/"
        }
        $ConnectionString += "alawael_erp"
    }
}
else {
    Write-Error "Connection String غير صالح"
    Write-Info "يجب أن يبدأ بـ mongodb:// أو mongodb+srv://"
    exit 1
}

# Step 5: Update .env file
Write-StepHeader "الخطوة 5: تحديث ملف .env"

try {
    $envContent = Get-Content $EnvFile -Raw
    
    # Update USE_MOCK_DB
    if ($envContent -match "USE_MOCK_DB\s*=\s*true") {
        $envContent = $envContent -replace "USE_MOCK_DB\s*=\s*true", "USE_MOCK_DB=false"
        Write-Success "تم تعطيل In-Memory DB"
    }
    elseif ($envContent -notmatch "USE_MOCK_DB") {
        $envContent += "`nUSE_MOCK_DB=false"
        Write-Success "تمت إضافة USE_MOCK_DB=false"
    }
    
    # Update MONGODB_URI
    if ($envContent -match "MONGODB_URI\s*=") {
        $envContent = $envContent -replace "MONGODB_URI\s*=.*", "MONGODB_URI=$ConnectionString"
        Write-Success "تم تحديث MONGODB_URI"
    }
    else {
        $envContent += "`nMONGODB_URI=$ConnectionString"
        Write-Success "تمت إضافة MONGODB_URI"
    }
    
    # Save changes
    Set-Content -Path $EnvFile -Value $envContent -NoNewline
    Write-Success "تم حفظ التغييرات في .env"
}
catch {
    Write-Error "فشل تحديث ملف .env: $_"
    exit 1
}

# Step 6: Stop current Backend
Write-StepHeader "الخطوة 6: إيقاف Backend الحالي"

$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Success "تم إيقاف جميع عمليات Node.js"
}
else {
    Write-Info "لا توجد عمليات Node.js نشطة"
}

# Step 7: Start Backend
Write-StepHeader "الخطوة 7: تشغيل Backend مع MongoDB"

Write-Info "بدء Backend..."
Write-Warning "قد يستغرق هذا 10-15 ثانية..."

Push-Location $BackendPath

# Start Backend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run start" -WindowStyle Minimized

Pop-Location

Write-Success "تم بدء Backend"

# Step 8: Wait for Backend to start
Write-StepHeader "الخطوة 8: انتظار بدء Backend"

$maxAttempts = 15
$attempt = 0
$backendReady = $false

while ($attempt -lt $maxAttempts -and -not $backendReady) {
    $attempt++
    Write-Host "  محاولة $attempt من $maxAttempts..." -ForegroundColor Gray -NoNewline
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 2 -ErrorAction Stop
        if ($response.status -eq "OK") {
            $backendReady = $true
            Write-Host " ✅" -ForegroundColor $colors.Success
        }
    }
    catch {
        Write-Host " ⏳" -ForegroundColor $colors.Warning
        Start-Sleep -Seconds 2
    }
}

if (-not $backendReady) {
    Write-Error "فشل بدء Backend بعد $maxAttempts محاولة"
    Write-Info "يرجى التحقق من سجلات Backend للأخطاء"
    exit 1
}

# Step 9: Verify MongoDB Connection
Write-StepHeader "الخطوة 9: التحقق من اتصال MongoDB"

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    
    Write-Success "Backend يعمل بنجاح"
    Write-Info "Status: $($response.status)"
    Write-Info "Message: $($response.message)"
    Write-Info "Environment: $($response.environment)"
    
    # Check logs for MongoDB connection
    Start-Sleep -Seconds 2
    
    Write-Host "`n"
    Write-Host "════════════════════════════════════════════" -ForegroundColor $colors.Success
    Write-Host "  ✅ MongoDB Atlas Setup مكتمل!" -ForegroundColor White
    Write-Host "════════════════════════════════════════════" -ForegroundColor $colors.Success
    Write-Host "`n"
    
    Write-Info "تم الاتصال بـ MongoDB بنجاح"
    Write-Info "قاعدة البيانات: $dbName"
    Write-Info "Backend URL: http://localhost:3001"
    Write-Host "`n"
    
    Write-Host "الخطوات التالية:" -ForegroundColor $colors.Heading
    Write-Host "  1. تحميل البيانات الأولية (Seeding)" -ForegroundColor White
    Write-Host "     POST http://localhost:3001/api/admin/seed-database" -ForegroundColor Gray
    Write-Host "`n"
    Write-Host "  2. اختبار Login" -ForegroundColor White
    Write-Host "     POST http://localhost:3001/api/auth/login" -ForegroundColor Gray
    Write-Host "     Body: { email: 'admin@test.com', password: 'Admin@123' }" -ForegroundColor Gray
    Write-Host "`n"
    
}
catch {
    Write-Error "فشل الاتصال بـ Backend"
    Write-Info "Error: $_"
    exit 1
}

Write-Host "════════════════════════════════════════════`n" -ForegroundColor $colors.Success

exit 0
