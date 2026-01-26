# تشغيل Backend + Frontend محلياً
# تشغيل: .\start_local.ps1

Write-Host ""
Write-Host "════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "      Starting Local Development Server      " -ForegroundColor Green
Write-Host "════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Get-Location

# 1. تشغيل Backend
Write-Host "1. Starting Backend (port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\backend'; Write-Host 'Backend Server' -ForegroundColor Green; npm start" -WindowStyle Normal

Start-Sleep -Seconds 3

# 2. تشغيل Frontend
Write-Host "2. Starting Frontend (port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\frontend'; Write-Host 'Frontend Server' -ForegroundColor Green; npm start" -WindowStyle Normal

Write-Host ""
Write-Host "════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Servers are starting..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Wait 10-15 seconds, then:" -ForegroundColor Yellow
Write-Host "  Backend:  http://localhost:5000/api/health" -ForegroundColor White
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Login credentials:" -ForegroundColor Cyan
Write-Host "  Email:    admin@example.com" -ForegroundColor White
Write-Host "  Password: Admin@123" -ForegroundColor White
Write-Host ""
Write-Host "════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

# انتظار وفتح المتصفح
Write-Host "Opening browser in 15 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Done! Check the new windows." -ForegroundColor Green
Write-Host ""
