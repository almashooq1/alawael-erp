#!/usr/bin/env powershell
# 🔄 MongoDB Configuration Switcher
# دليل تبديل سريع بين Local و MongoDB Atlas

param(
    [string]$mode = "help"
)

# Colors
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Cyan = "Cyan"

function Show-Help {
    Write-Host "`n" -ForegroundColor $Green
    Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor $Cyan
    Write-Host "║     🔄 MongoDB Configuration Switcher                    ║" -ForegroundColor $Cyan
    Write-Host "║     دليل تبديل قواعد البيانات                            ║" -ForegroundColor $Cyan
    Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor $Cyan
    Write-Host "`nالاستخدام:`n" -ForegroundColor $Yellow
    Write-Host "  .\Switch-MongoDB.ps1 local        → استخدم Local MongoDB" -ForegroundColor $Green
    Write-Host "  .\Switch-MongoDB.ps1 atlas        → استخدم MongoDB Atlas" -ForegroundColor $Green
    Write-Host "  .\Switch-MongoDB.ps1 status       → فحص الحالة الحالية" -ForegroundColor $Green
    Write-Host "  .\Switch-MongoDB.ps1 test         → اختبر الاتصال" -ForegroundColor $Green
    Write-Host "`n"
}

function Get-Config {
    $envPath = "backend\.env"
    if (Test-Path $envPath) {
        $content = Get-Content $envPath -Raw
        return $content
    }
    return $null
}

function Show-Status {
    Write-Host "`n📊 الحالة الحالية:`n" -ForegroundColor $Cyan
    
    $config = Get-Config
    if ($config -match 'USE_MOCK_DB\s*=\s*true') {
        Write-Host "✅ Mode: LOCAL (In-Memory + File)" -ForegroundColor $Green
        Write-Host "📍 Port: 3001" -ForegroundColor $Green
        Write-Host "🗄️  Database: JSON File" -ForegroundColor $Green
        Write-Host "⚠️  Note: Data lost on restart" -ForegroundColor $Yellow
    }
    elseif ($config -match 'USE_MOCK_DB\s*=\s*false') {
        Write-Host "✅ Mode: MONGODB ATLAS (Cloud)" -ForegroundColor $Green
        Write-Host "📍 Port: 3001" -ForegroundColor $Green
        Write-Host "🗄️  Database: MongoDB Cloud" -ForegroundColor $Green
        Write-Host "✅ Data persistent" -ForegroundColor $Green
        
        # Extract connection string (safe display)
        if ($config -match 'MONGODB_URI=mongodb\+srv://([^:]+):') {
            $user = $matches[1]
            Write-Host "👤 User: $user" -ForegroundColor $Cyan
        }
    }
    else {
        Write-Host "⚠️  Status Unknown" -ForegroundColor $Red
    }
}

function Switch-To-Local {
    Write-Host "`n🔄 تبديل إلى LOCAL MongoDB...`n" -ForegroundColor $Yellow
    
    $envPath = "backend\.env"
    $localConfig = @"
# Frontend Configuration - Updated 2026-01-24
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_API_BASE_URL=http://localhost:3001/api/v1
REACT_APP_WS_URL=ws://localhost:3001

# Development Server
PORT=3004
# HOST=localhost

# Features
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_NOTIFICATIONS=true

# Build
GENERATE_SOURCEMAP=false

# MongoDB Configuration - LOCAL MODE
NODE_ENV=development
USE_MOCK_DB=true
MONGODB_URI=mongodb://localhost:27017/alawael_db
MONGO_DB_NAME=alawael_db

# Security - Generated 2026-01-20
JWT_SECRET=Q2TaiUZXYrMmqAHd6lnJjE0RODNGSW9stVyhk573BLowPcgx8bpCKfeu4I1zvF
JWT_REFRESH_SECRET=nSzIQ6b1j9WGKpA5CmtdPfhcri0EDXZsY27UkvHVORw8e3F4BxyqgluNaMLToJ
SESSION_SECRET=UwrQt4JfkFyYTuR69ZaX10mdW8CDliKB52vHAVc3ML7zOINxbsnqSoeGjEphgP
JWT_EXPIRY=86400
JWT_REFRESH_EXPIRY=604800

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3004,http://localhost:3005
CORS_ORIGIN=http://localhost:3004
FRONTEND_URL=http://localhost:3004

# API
API_BASE_URL=http://localhost:3001/api
API_VERSION=v1
WS_URL=ws://localhost:3001

# Files
MAX_CONTENT_LENGTH=52428800
UPLOAD_FOLDER=uploads

# Redis (Optional)
DISABLE_REDIS=true
REDIS_HOST=localhost
REDIS_PORT=6379

# Monitoring
LOG_LEVEL=info
ENABLE_MONITORING=true
ENABLE_COMPRESSION=true

# Application
APP_NAME=نظام Alawael لإدارة المراكز
COMPANY_NAME=مراكز الأوائل للتأهيل
TIMEZONE=Asia/Riyadh
"@

    $backendEnvPath = "backend\.env"
    Set-Content -Path $backendEnvPath -Value $localConfig -Force
    
    Write-Host "✅ تم التبديل إلى LOCAL" -ForegroundColor $Green
    Write-Host "📝 ملف .env تم تحديثه" -ForegroundColor $Green
    Write-Host "`n⚠️  الخطوة التالية: أعد تشغيل Backend" -ForegroundColor $Yellow
    Write-Host "   cd backend" -ForegroundColor $Cyan
    Write-Host "   npm start" -ForegroundColor $Cyan
}

function Switch-To-Atlas {
    Write-Host "`n🔄 تبديل إلى MONGODB ATLAS...`n" -ForegroundColor $Yellow
    
    Write-Host "👤 الرجاء إدخال بيانات MongoDB Atlas:`n" -ForegroundColor $Cyan
    
    $username = Read-Host "أدخل اسم المستخدم (username)"
    $password = Read-Host "أدخل كلمة المرور (password)" -AsSecureString
    $clusterName = Read-Host "أدخل اسم الـ Cluster (مثال: AlAwaelCluster)"
    $clusterId = Read-Host "أدخل الـ Cluster ID (مثال: h1w2n)"
    
    # Convert secure string to plain text
    $passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($password))
    
    # Build connection string
    $connectionString = "mongodb+srv://${username}:${passwordPlain}@${clusterName}.${clusterId}.mongodb.net/alawael_db?retryWrites=true&w=majority"
    
    Write-Host "`n📋 Connection String (يُحفظ في .env):" -ForegroundColor $Cyan
    Write-Host "mongodb+srv://${username}:***@${clusterName}.${clusterId}.mongodb.net/alawael_db" -ForegroundColor $Green
    
    # Read current backend .env
    $backendEnvPath = "backend\.env"
    $content = Get-Content $backendEnvPath -Raw
    
    # Update configuration
    $content = $content -replace 'USE_MOCK_DB\s*=\s*true', 'USE_MOCK_DB=false'
    $content = $content -replace 'MONGODB_URI\s*=\s*mongodb[^\s]+', "MONGODB_URI=$connectionString"
    
    Set-Content -Path $backendEnvPath -Value $content -Force
    
    Write-Host "`n✅ تم التبديل إلى MONGODB ATLAS" -ForegroundColor $Green
    Write-Host "📝 ملف .env تم تحديثه" -ForegroundColor $Green
    Write-Host "`n⚠️  الخطوة التالية: أعد تشغيل Backend" -ForegroundColor $Yellow
    Write-Host "   cd backend" -ForegroundColor $Cyan
    Write-Host "   npm start" -ForegroundColor $Cyan
}

function Test-Connection {
    Write-Host "`n🧪 اختبار الاتصال...`n" -ForegroundColor $Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Backend يستجيب" -ForegroundColor $Green
            Write-Host "📊 Status Code: $($response.StatusCode)" -ForegroundColor $Green
            
            # Try to parse JSON
            $body = $response.Content | ConvertFrom-Json
            Write-Host "💾 Database Status:" -ForegroundColor $Cyan
            $body.PSObject.Properties | ForEach-Object {
                Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor $Green
            }
        }
    }
    catch {
        Write-Host "❌ فشل الاتصال" -ForegroundColor $Red
        Write-Host "الخطأ: $($_.Exception.Message)" -ForegroundColor $Red
        Write-Host "`n💡 تأكد من:" -ForegroundColor $Yellow
        Write-Host "  1. Backend يعمل (npm start)" -ForegroundColor $Cyan
        Write-Host "  2. المنفذ 3001 غير مشغول" -ForegroundColor $Cyan
        Write-Host "  3. لا توجد مشاكل في الاتصال" -ForegroundColor $Cyan
    }
}

# Main switch
switch ($mode.ToLower()) {
    "local" { Switch-To-Local }
    "atlas" { Switch-To-Atlas }
    "status" { Show-Status }
    "test" { Test-Connection }
    default { Show-Help }
}

Write-Host ""
