# Test Wrapper for Phase 105 (Psychotherapy)
$env:PORT = 3001
$env:SMART_TEST_MODE = "true"

Write-Host "Starting Smart Server for Phase 105 Verification..."
$serverProcess = Start-Process -FilePath "node" -ArgumentList "backend/server_smart.js" -PassThru -NoNewWindow

Start-Sleep -Seconds 5

Write-Host "Running Psychotherapy Unit Verification..."
try {
    node tests/verify_phases_105.js
} finally {
    Stop-Process -Id $serverProcess.Id -Force
    Write-Host "Server Stopped."
}
