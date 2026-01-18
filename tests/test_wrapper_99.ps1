$env:SMART_TEST_MODE = "true"
$process = Start-Process node -ArgumentList "backend/server_smart.js" -PassThru -NoNewWindow
Start-Sleep -Seconds 5
try {
    if ($process.HasExited) {
        Write-Error "Server process exited prematurely."
        exit 1
    }
    node tests/verify_phases_99.js
} finally {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
}
