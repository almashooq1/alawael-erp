#!/usr/bin/env pwsh
# AlAwael ERP - Quick System Launch

Write-Host ""
Write-Host "======================================"
Write-Host "  AlAwael ERP - System Launch"
Write-Host "======================================"
Write-Host ""

$workspaceRoot = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"

# Clean up
Write-Host "Cleaning processes..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force 2>$null
Start-Sleep -Seconds 2
Write-Host "Done"
Write-Host ""

# Start Backend
Write-Host "Starting Backend (Port 3001)..."
$backendPath = Join-Path $workspaceRoot "backend"
$backendJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    $env:PORT = 3001
    $env:USE_MOCK_DB = "true"
    node server.js
} -ArgumentList $backendPath

Start-Sleep -Seconds 5

# Check Backend
Write-Host "Checking Backend..."
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Host "Backend OK: $($health.status)"
}
catch {
    Write-Host "Backend not ready yet"
}
Write-Host ""

# Start Frontend
Write-Host "Starting Frontend (Port 3002)..."
$frontendPath = Join-Path $workspaceRoot "frontend"
$buildPath = Join-Path $frontendPath "build"

if (Test-Path $buildPath) {
    $frontendJob = Start-Job -ScriptBlock {
        param($path)
        Set-Location $path
        npx http-server build -p 3002 -c-1 --silent
    } -ArgumentList $frontendPath
    
    Start-Sleep -Seconds 3
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3002" -UseBasicParsing -TimeoutSec 5
        Write-Host "Frontend OK on http://localhost:3002"
    }
    catch {
        Write-Host "Frontend starting..."
    }
}
else {
    Write-Host "Build folder not found"
}
Write-Host ""

# Run Tests
Write-Host "Running integration tests..."
Write-Host ""
Set-Location $backendPath
node test-integration.js

Write-Host ""
Write-Host "======================================"
Write-Host "  System Status"
Write-Host "======================================"
Write-Host "Backend:  http://localhost:3001/health"
Write-Host "Frontend: http://localhost:3002"
Write-Host "API Docs: http://localhost:3001/api-docs"
Write-Host ""
Write-Host "Jobs:"
Get-Job | Format-Table Id, Name, State
Write-Host ""
Write-Host "Press Ctrl+C to stop"
