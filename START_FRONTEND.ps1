# START_FRONTEND.ps1 - Start Frontend Server

Write-Host "Starting AlAwael ERP Frontend..." -ForegroundColor Cyan

if (-not (Test-Path ".\frontend")) {
    Write-Host "ERROR: frontend folder not found!" -ForegroundColor Red
    exit 1
}

Set-Location .\frontend

if (-not (Test-Path ".\node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Starting frontend on http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Backend:  http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "Login: admin@alawael.com / Admin@123456" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

npm start
