# Test Wrapper for Phase 101 (Command Center)
$env:PORT = 3000
$env:SMART_TEST_MODE = "true"

Write-Host "Starting Smart Server for Phase 101 Verification..."
$serverProcess = Start-Process -FilePath "node" -ArgumentList "backend/server_smart.js" -PassThru -NoNewWindow

Start-Sleep -Seconds 5

Write-Host "Running Verification Script..."
try {
    node tests/verify_phases_101.js
} finally {
    Stop-Process -Id $serverProcess.Id -Force
    Write-Host "Server Stopped."
}
