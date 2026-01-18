# Test Wrapper for Phase 103 (Auto-Prescription)
$env:PORT = 3001
$env:SMART_TEST_MODE = "true"

Write-Host "Starting Smart Server for Phase 103 Verification..."
$serverProcess = Start-Process -FilePath "node" -ArgumentList "backend/server_smart.js" -PassThru -NoNewWindow

Start-Sleep -Seconds 5

Write-Host "Running Prescription Engine Verification..."
try {
    node tests/verify_phases_103.js
} finally {
    Stop-Process -Id $serverProcess.Id -Force
    Write-Host "Server Stopped."
}
