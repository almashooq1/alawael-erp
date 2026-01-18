$env:PORT=3001
Write-Host "Starting Smart Server (Phase 108 Digital Twin Test) on Port 3001..." -ForegroundColor Cyan

$serverProcess = Start-Process -FilePath "node" -ArgumentList "backend/server_smart.js" -PassThru -NoNewWindow

Start-Sleep -Seconds 5

try {
    Write-Host "Running Verification Script..." -ForegroundColor Yellow
    node tests/verify_phases_108.js
}
finally {
    Stop-Process -Id $serverProcess.Id -Force
    Write-Host "Server Stopped." -ForegroundColor Green
}
