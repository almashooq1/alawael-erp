Clear-Host

Write-Host "`n================================================"
Write-Host "    AlAwael ERP - Starting Now...        "
Write-Host "================================================`n" -ForegroundColor Cyan

$projectRoot = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"

# 1. Stop old processes
Write-Host "[1] Stopping old Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 2. Start Backend
Write-Host "[2] Starting Backend (port 3001)..." -ForegroundColor Green
Push-Location "$projectRoot\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start"
Pop-Location
Start-Sleep -Seconds 3

# 3. Start Frontend
Write-Host "[3] Starting Frontend (port 3000)..." -ForegroundColor Green
Push-Location "$projectRoot\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
Pop-Location
Start-Sleep -Seconds 3

# 4. Open Browser
Write-Host "[4] Opening browser..." -ForegroundColor Cyan
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"

# 5. Show info
Write-Host "`n================================================"
Write-Host "    SYSTEM READY TO USE                "
Write-Host "================================================"
Write-Host "Backend:  http://localhost:3001"
Write-Host "Frontend: http://localhost:3000"
Write-Host ""
Write-Host "Login:"
Write-Host "  Email: admin@alawael.com"
Write-Host "  Password: Admin@123456"
Write-Host ""
Write-Host "Database: In-Memory (temporary)"
Write-Host "For permanent storage, read: CHOOSE_YOUR_PATH.md"
Write-Host "================================================`n" -ForegroundColor Green

Write-Host "Waiting for services..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "`nAll set! Enjoy the system!`n" -ForegroundColor Green
