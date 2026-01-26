# START_SERVERS.ps1 - Start both Backend and Frontend servers

Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 Starting Servers..." -ForegroundColor Green
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Stop any running Node processes
Write-Host "🛑 Stopping any running Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "✅ Done" -ForegroundColor Green
Write-Host ""

# Start Backend
Write-Host "🔧 Starting Backend Server..." -ForegroundColor Yellow
$backendPath = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '════════════════════════════════════════' -ForegroundColor Cyan; Write-Host '  🚀 Backend Server' -ForegroundColor Green; Write-Host '════════════════════════════════════════' -ForegroundColor Cyan; Write-Host ''; node simple_server.js" -WindowStyle Normal
Write-Host "✅ Backend starting in new window..." -ForegroundColor Green
Write-Host ""

# Wait for Backend
Write-Host "⏳ Waiting for Backend to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
$backendReady = $false
for ($i = 1; $i -le 5; $i++) {
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 3
        $backendReady = $true
        Write-Host "✅ Backend is ready!" -ForegroundColor Green
        break
    }
    catch {
        Write-Host "   Attempt $i/5..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $backendReady) {
    Write-Host "❌ Backend failed to start!" -ForegroundColor Red
    Write-Host "Please check the Backend window for errors." -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Start Frontend
Write-Host "🔧 Starting Frontend Server..." -ForegroundColor Yellow
$frontendPath = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\frontend\build"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '════════════════════════════════════════' -ForegroundColor Cyan; Write-Host '  🚀 Frontend Server' -ForegroundColor Green; Write-Host '════════════════════════════════════════' -ForegroundColor Cyan; Write-Host ''; Write-Host '🌐 Frontend URL: http://localhost:3002' -ForegroundColor Green; Write-Host ''; python -m http.server 3002" -WindowStyle Normal
Write-Host "✅ Frontend starting in new window..." -ForegroundColor Green
Write-Host ""

# Wait for Frontend
Write-Host "⏳ Waiting for Frontend to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
$frontendReady = $false
for ($i = 1; $i -le 5; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3002" -UseBasicParsing -TimeoutSec 3
        $frontendReady = $true
        Write-Host "✅ Frontend is ready!" -ForegroundColor Green
        break
    }
    catch {
        Write-Host "   Attempt $i/5..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $frontendReady) {
    Write-Host "❌ Frontend failed to start!" -ForegroundColor Red
    Write-Host "Please check the Frontend window for errors." -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Final Status
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ ALL SERVERS RUNNING!" -ForegroundColor Green
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Backend:  http://localhost:5000/api/health" -ForegroundColor White
Write-Host "🌐 Frontend: http://localhost:3002" -ForegroundColor White
Write-Host ""
Write-Host "Test Login Credentials:" -ForegroundColor Yellow
Write-Host "   Email:    admin@example.com" -ForegroundColor White
Write-Host "   Password: Admin@123" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Open http://localhost:3002 in your browser" -ForegroundColor White
Write-Host "   2. Login with the credentials above" -ForegroundColor White
Write-Host "   3. Check Network tab in browser DevTools" -ForegroundColor White
Write-Host ""
Write-Host "Servers are running. Keep these windows open." -ForegroundColor Gray
