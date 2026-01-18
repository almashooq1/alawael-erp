# Comprehensive 2026 ERP System - Quick Start script
# Usage: .\🚀_RUN_SYSTEM.ps1

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   🚀 ALAWAEL ERP System 2026 - STARTUP      " -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Cyan

# 1. Environment Check
Write-Host "`n[1/3] Checking Environment..." -ForegroundColor White
if (Test-Path "backend/server.js") {
    Write-Host "   [ok] Backend found." -ForegroundColor Green
} else {
    Write-Host "   [!!] Error: Backend directory not found." -ForegroundColor Red
    exit 1
}

# 2. Configuration
$env:PORT = "3001"
$env:NODE_ENV = "production"
$env:USE_MOCK_DB = "true"  # Use Mock DB for Demo Mode
$env:JWT_SECRET = "demo_secret_key_2026"

Write-Host "`n[2/3] Configuring Demo Mode..." -ForegroundColor White
Write-Host "   - Port: $env:PORT" -ForegroundColor Gray
Write-Host "   - DB: Mock (In-Memory)" -ForegroundColor Gray

# 3. Start Server
Write-Host "`n[3/3] Starting Server..." -ForegroundColor White
Write-Host "   Starting Node.js process..." -ForegroundColor Cyan

try {
    # Check if node_modules exists
    if (-not (Test-Path "node_modules")) {
        Write-Host "   [..] Installing dependencies (first run)..." -ForegroundColor Yellow
        npm install --silent
    }

    # Start Node
    Write-Host "`n   ✅ SYSTEM RUNNING AT: http://localhost:3001" -ForegroundColor Green
    Write-Host "   ✅ API DOCS AT:       http://localhost:3001/api-docs" -ForegroundColor Green
    Write-Host "`n   (Press Ctrl+C to stop)" -ForegroundColor Gray
    
    node backend/server.js
}
catch {
    Write-Host "`n   [!!] Error starting system: $_" -ForegroundColor Red
}
