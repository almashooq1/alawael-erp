# Unified starter for backend (server_ultimate.js) and frontend (serve.js)
# Usage:
#   ./RUN_ALL_SERVERS.ps1              # normal (uses .env defaults)
#   ./RUN_ALL_SERVERS.ps1 -UseMockDb   # force in-memory mode

param(
    [switch]$UseMockDb
)

Clear-Host
$projectRoot = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "   Starting AlAwael ERP (Backend + Frontend)" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# 0) Stop old Node/Python to avoid port conflicts
Write-Host "[0] Stopping old Node/Python processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 1) Start Backend (port 5000)
Write-Host "[1] Starting backend (server_ultimate.js on 5000)..." -ForegroundColor Green
$backendEnv = if ($UseMockDb) { "$env:USE_MOCK_DB='true'; " } else { "" }
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\backend'; $env:PORT=5000; $backendEnv node server_ultimate.js" | Out-Null
Start-Sleep -Seconds 3

# 2) Start Frontend (serve.js on 3002 serving build)
Write-Host "[2] Starting frontend static server (serve.js on 3002)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\frontend'; $env:PORT=3002; node serve.js" | Out-Null
Start-Sleep -Seconds 2

# 3) Quick health checks (best-effort)
Write-Host "[3] Checking backend health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 4
    Write-Host "   Backend: $($health.status) (DB=$($health.database))" -ForegroundColor Green
}
catch {
    Write-Host "   Backend not reachable yet" -ForegroundColor Red
}

# 4) Open browser to frontend
Write-Host "[4] Opening browser to communications-system..." -ForegroundColor Cyan
Start-Process "http://localhost:3002/communications-system" | Out-Null

Write-Host "`nDone. Two PowerShell windows keep backend/frontend running." -ForegroundColor Green
Write-Host "Backend:  http://localhost:5000/api/health" -ForegroundColor Gray
Write-Host "Frontend: http://localhost:3002/communications-system" -ForegroundColor Gray
Write-Host "Use Ctrl+C in each window to stop servers." -ForegroundColor Gray
