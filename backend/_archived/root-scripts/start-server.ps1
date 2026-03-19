# Start AlAwael ERP Backend Server
Write-Host "Starting AlAwael ERP Backend Server..." -ForegroundColor Green

Set-Location -Path "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend"

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow

# Check if package.json exists
if (Test-Path "package.json") {
    Write-Host "✓ package.json found" -ForegroundColor Green
} else {
    Write-Host "✗ package.json NOT found!" -ForegroundColor Red
    exit 1
}

# Check if server.js exists
if (Test-Path "server.js") {
    Write-Host "✓ server.js found" -ForegroundColor Green
} else {
    Write-Host "✗ server.js NOT found!" -ForegroundColor Red
    exit 1
}

# Start the server
Write-Host "`nStarting Node.js server..." -ForegroundColor Cyan
node server.js
