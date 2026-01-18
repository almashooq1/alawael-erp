Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   🚀 STARTING AL-AWAEL EDUCATIONAL ERP SYSTEM    " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# 1. Kill existing node processes to ensure clean slate
Write-Host "🧹 Cleaning up old processes..." -ForegroundColor Yellow
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

# 2. Start Backend
Write-Host "🗄️  Starting Backend Server (Port 3001)..." -ForegroundColor Green
$backendArg = "-NoExit -Command `& { cd backend; `$env:USE_MOCK_DB='true'; `$env:PORT='3001'; npm start; }"
Start-Process powershell -ArgumentList $backendArg

# 3. Start Frontend
Write-Host "💻 Starting Frontend Application (Port 3002)..." -ForegroundColor Green
$frontendArg = "-NoExit -Command `& { cd frontend; `$env:PORT='3002'; `$env:BROWSER='none'; npm start; }"
Start-Process powershell -ArgumentList $frontendArg

Write-Host "⏳ Waiting for servers to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# 4. Open Browser
Write-Host "🌐 Opening System in Browser..." -ForegroundColor Cyan
Start-Process "http://localhost:3002"

Write-Host "✅ System Launch Sequence Initiated!" -ForegroundColor Green
Write-Host "   - Backend: http://localhost:3001"
Write-Host "   - Frontend: http://localhost:3002"
Write-Host "   - Please check the two new PowerShell windows for status logs."
