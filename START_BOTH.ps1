# Stop any running Node processes
Write-Host "Stopping Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start Backend
Write-Host "Starting Backend..." -ForegroundColor Green
$backendPath = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; node simple_server.js" -WindowStyle Normal

# Wait for Backend
Start-Sleep -Seconds 5
Write-Host "Checking Backend..." -ForegroundColor Yellow
$backendReady = $false
for ($i = 1; $i -le 5; $i++) {
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 3
        $backendReady = $true
        Write-Host "Backend is ready!" -ForegroundColor Green
        break
    } catch {
        Write-Host "Waiting for backend... ($i/5)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $backendReady) {
    Write-Host "Backend failed to start!" -ForegroundColor Red
    exit 1
}

# Start Frontend
Write-Host "Starting Frontend..." -ForegroundColor Green
$frontendPath = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\frontend\build"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; python -m http.server 3002" -WindowStyle Normal

# Wait for Frontend
Start-Sleep -Seconds 3
Write-Host "Checking Frontend..." -ForegroundColor Yellow
$frontendReady = $false
for ($i = 1; $i -le 5; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3002" -UseBasicParsing -TimeoutSec 3
        $frontendReady = $true
        Write-Host "Frontend is ready!" -ForegroundColor Green
        break
    } catch {
        Write-Host "Waiting for frontend... ($i/5)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $frontendReady) {
    Write-Host "Frontend failed to start!" -ForegroundColor Red
    exit 1
}

# Success
Write-Host ""
Write-Host "ALL SERVERS RUNNING!" -ForegroundColor Green
Write-Host "Backend: http://localhost:5000" -ForegroundColor White
Write-Host "Frontend: http://localhost:3002" -ForegroundColor White
Write-Host ""
Write-Host "Login with:" -ForegroundColor Yellow
Write-Host "  Email: admin@example.com" -ForegroundColor White
Write-Host "  Password: Admin@123" -ForegroundColor White
Write-Host ""
Write-Host "Open http://localhost:3002 in your browser" -ForegroundColor Cyan
