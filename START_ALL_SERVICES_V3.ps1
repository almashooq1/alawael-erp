# 🚀 تشغيل جميع خدمات AlAwael ERP v3.0
# START ALL SERVICES - Complete System Launch

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "  🚀 AlAwael ERP System v3.0 - Starting All Services" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

$baseDir = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

# 1. Check MongoDB
Write-Host "1️⃣  Checking MongoDB..." -ForegroundColor Yellow
$mongoProcess = Get-Process | Where-Object { $_.ProcessName -like "*mongod*" }
if ($mongoProcess) {
    Write-Host "   ✅ MongoDB is running (PID: $($mongoProcess.Id))" -ForegroundColor Green
}
else {
    Write-Host "   ⚠️  MongoDB is not running!" -ForegroundColor Red
    Write-Host "   📌 Please start MongoDB first:" -ForegroundColor Yellow
    Write-Host "      mongod --dbpath C:\data\db" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "   Continue anyway? (y/n)"
    if ($continue -ne 'y') {
        exit
    }
}
Write-Host ""

# 2. Check if ports are available
Write-Host "2️⃣  Checking ports availability..." -ForegroundColor Yellow

$ports = @{
    "Backend"  = 3001
    "Frontend" = 3004
    "Gateway"  = 8080
    "GraphQL"  = 4000
}

$portIssues = $false
foreach ($service in $ports.Keys) {
    $port = $ports[$service]
    if (Test-Port -Port $port) {
        Write-Host "   ⚠️  Port $port ($service) is already in use!" -ForegroundColor Red
        $portIssues = $true
    }
    else {
        Write-Host "   ✅ Port $port ($service) is available" -ForegroundColor Green
    }
}

if ($portIssues) {
    Write-Host ""
    Write-Host "   💡 To free ports, use:" -ForegroundColor Cyan
    Write-Host "      Get-NetTCPConnection -LocalPort <PORT> | Select OwningProcess" -ForegroundColor White
    Write-Host "      Stop-Process -Id <PID> -Force" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "   Continue anyway? (y/n)"
    if ($continue -ne 'y') {
        exit
    }
}
Write-Host ""

# 3. Start Backend
Write-Host "3️⃣  Starting Backend Service..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    Set-Location '$baseDir\backend'
    Write-Host '=' * 70 -ForegroundColor Cyan
    Write-Host '  🔧 BACKEND SERVICE - Port 3001' -ForegroundColor Blue
    Write-Host '=' * 70 -ForegroundColor Cyan
    Write-Host ''
    Write-Host '📡 API Documentation: http://localhost:3001/api-docs' -ForegroundColor Green
    Write-Host '🏥 Health Check: http://localhost:3001/health' -ForegroundColor Green
    Write-Host ''
    npm start
"@
Write-Host "   ✅ Backend started in new window" -ForegroundColor Green
Start-Sleep -Seconds 2

# 4. Start Frontend
Write-Host ""
Write-Host "4️⃣  Starting Frontend Application..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    Set-Location '$baseDir\frontend'
    Write-Host '=' * 70 -ForegroundColor Cyan
    Write-Host '  🎨 FRONTEND APPLICATION - Port 3004' -ForegroundColor Blue
    Write-Host '=' * 70 -ForegroundColor Cyan
    Write-Host ''
    Write-Host '🌐 Application: http://localhost:3004' -ForegroundColor Green
    Write-Host '👤 Login: admin / admin123' -ForegroundColor Yellow
    Write-Host ''
    npm run start
"@
Write-Host "   ✅ Frontend started in new window" -ForegroundColor Green
Start-Sleep -Seconds 2

# 5. Start Gateway
Write-Host ""
Write-Host "5️⃣  Starting API Gateway..." -ForegroundColor Yellow

# Create .env for Gateway if not exists
$gatewayEnv = "$baseDir\gateway\.env"
if (-not (Test-Path $gatewayEnv)) {
    @"
NODE_ENV=development
GATEWAY_PORT=8080
AUTH_SERVICE_URL=http://localhost:3001
HR_SERVICE_URL=http://localhost:3001
FINANCE_SERVICE_URL=http://localhost:3001
REPORTS_SERVICE_URL=http://localhost:3001
NOTIFICATIONS_SERVICE_URL=http://localhost:3001
"@ | Out-File -FilePath $gatewayEnv -Encoding UTF8
    Write-Host "   📝 Created .env file for Gateway" -ForegroundColor Cyan
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    Set-Location '$baseDir\gateway'
    Write-Host '=' * 70 -ForegroundColor Cyan
    Write-Host '  🌐 API GATEWAY - Port 8080' -ForegroundColor Blue
    Write-Host '=' * 70 -ForegroundColor Cyan
    Write-Host ''
    Write-Host '📊 Gateway API: http://localhost:8080' -ForegroundColor Green
    Write-Host '🏥 Health Check: http://localhost:8080/health' -ForegroundColor Green
    Write-Host '📚 API Docs: http://localhost:8080/api/docs' -ForegroundColor Green
    Write-Host ''
    npm start
"@
Write-Host "   ✅ Gateway started in new window" -ForegroundColor Green
Start-Sleep -Seconds 2

# Summary
Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "  ✅ All Services Started Successfully!" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

Write-Host "📊 Service Status:" -ForegroundColor Yellow
Write-Host "   🔧 Backend:   http://localhost:3001      (API + Swagger)" -ForegroundColor White
Write-Host "   🎨 Frontend:  http://localhost:3004      (React App)" -ForegroundColor White
Write-Host "   🌐 Gateway:   http://localhost:8080      (API Gateway)" -ForegroundColor White
Write-Host "   📊 MongoDB:   mongodb://localhost:27017  (Database)" -ForegroundColor White
Write-Host ""

Write-Host "🔗 Quick Links:" -ForegroundColor Yellow
Write-Host "   API Docs:     http://localhost:3001/api-docs" -ForegroundColor Cyan
Write-Host "   Health Check: http://localhost:8080/health" -ForegroundColor Cyan
Write-Host "   Frontend App: http://localhost:3004" -ForegroundColor Cyan
Write-Host ""

Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "   • Press Ctrl+C in each window to stop services" -ForegroundColor White
Write-Host "   • Check logs in each window for errors" -ForegroundColor White
Write-Host "   • Default login: admin / admin123" -ForegroundColor White
Write-Host ""

Write-Host "📖 Documentation:" -ForegroundColor Yellow
Write-Host "   • Complete Guide: 📖_COMPLETE_FOLLOWUP_GUIDE.md" -ForegroundColor White
Write-Host "   • Quick Start: 🚀_QUICK_START_V3.md" -ForegroundColor White
Write-Host "   • Dev Plan: 📋_PROFESSIONAL_DEVELOPMENT_PLAN_V3.md" -ForegroundColor White
Write-Host ""

# Wait and test services
Write-Host "⏳ Waiting 10 seconds for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "🔍 Testing services..." -ForegroundColor Yellow

# Test Backend
try {
    $backendHealth = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 5
    Write-Host "   ✅ Backend is responding" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  Backend is not responding yet" -ForegroundColor Yellow
}

# Test Gateway
try {
    $gatewayHealth = Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET -TimeoutSec 5
    Write-Host "   ✅ Gateway is responding" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  Gateway is not responding yet" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 System is ready! Happy coding! 🚀" -ForegroundColor Green
Write-Host ""

# Keep window open
Read-Host "Press Enter to close this window..."
