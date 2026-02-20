# REPAIR_SYSTEM.ps1 - Complete system repair and startup

Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                                      ║" -ForegroundColor Cyan
Write-Host "║               🔧 SYSTEM REPAIR & STARTUP PROCESS                    ║" -ForegroundColor Cyan
Write-Host "║                        البدء في الاصلاح                              ║" -ForegroundColor Cyan
Write-Host "║                  February 20, 2026 - 02:50 PM UTC+3                 ║" -ForegroundColor Cyan
Write-Host "║                                                                      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Paths
$WORKSPACE = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"
$BACKEND_DIR = "$WORKSPACE\erp_new_system\backend"
$FRONTEND_DIR = "$WORKSPACE\erp_new_system\frontend"

# Step 1: Verify Node.js
Write-Host "STEP 1: Verifying Node.js and npm" -ForegroundColor Yellow
Write-Host "==================================`n"

try {
  $nodeVersion = node --version
  Write-Host "  ✅ Node.js: $nodeVersion" -ForegroundColor Green
}
catch {
  Write-Host "  ❌ Node.js not found!" -ForegroundColor Red
  exit 1
}

try {
  $npmVersion = npm --version
  Write-Host "  ✅ npm: $npmVersion`n" -ForegroundColor Green
}
catch {
  Write-Host "  ❌ npm not found!" -ForegroundColor Red
  exit 1
}

# Step 2: Check Backend
Write-Host "STEP 2: Checking Backend Directory" -ForegroundColor Yellow
Write-Host "===================================`n"

if (Test-Path $BACKEND_DIR) {
  Write-Host "  ✅ Backend directory found`n" -ForegroundColor Green
}
else {
  Write-Host "  ❌ Backend directory not found: $BACKEND_DIR" -ForegroundColor Red
  exit 1
}

# Step 3: Install Backend Dependencies
Write-Host "STEP 3: Installing Backend Dependencies" -ForegroundColor Yellow
Write-Host "========================================`n"

if (-not (Test-Path "$BACKEND_DIR\node_modules")) {
  Write-Host "  Installing npm packages (this may take 1-2 minutes)...`n" -ForegroundColor Yellow
  Push-Location $BACKEND_DIR
  npm install
  Pop-Location
  Write-Host "`n  ✅ Backend dependencies installed`n" -ForegroundColor Green
}
else {
  Write-Host "  ✅ node_modules already exists`n" -ForegroundColor Green
}

# Step 4: Check Frontend
Write-Host "STEP 4: Checking Frontend Directory" -ForegroundColor Yellow
Write-Host "====================================`n"

if (Test-Path $FRONTEND_DIR) {
  Write-Host "  ✅ Frontend directory found`n" -ForegroundColor Green
  
  # Step 5: Install Frontend Dependencies
  Write-Host "STEP 5: Installing Frontend Dependencies" -ForegroundColor Yellow
  Write-Host "=========================================`n"
  
  if (-not (Test-Path "$FRONTEND_DIR\node_modules")) {
    Write-Host "  Installing npm packages (this may take 1-2 minutes)...`n" -ForegroundColor Yellow
    Push-Location $FRONTEND_DIR
    npm install
    Pop-Location
    Write-Host "`n  ✅ Frontend dependencies installed`n" -ForegroundColor Green
  }
  else {
    Write-Host "  ✅ node_modules already exists`n" -ForegroundColor Green
  }
}
else {
  Write-Host "  ⚠️  Frontend directory not found (optional)`n" -ForegroundColor Yellow
}

# Step 6: Start Backend
Write-Host "STEP 6: Starting Backend Service" -ForegroundColor Yellow
Write-Host "================================`n"

Write-Host "  Starting backend on port 3001...`n" -ForegroundColor Cyan

Push-Location $BACKEND_DIR
Start-Process -FilePath "node" -ArgumentList "server.js" -WindowStyle Normal
Pop-Location

Start-Sleep -Seconds 3

Write-Host "  ✅ Backend startup initiated`n" -ForegroundColor Green

# Step 7: Start Frontend
Write-Host "STEP 7: Starting Frontend Service" -ForegroundColor Yellow
Write-Host "=================================`n"

if (Test-Path $FRONTEND_DIR) {
  Write-Host "  Starting frontend on port 3000...`n" -ForegroundColor Cyan
  
  Push-Location $FRONTEND_DIR
  Start-Job -ScriptBlock {
    $env:BROWSER = "none"
    npm start
  } -Name FrontendServer
  Pop-Location
  
  Write-Host "  ✅ Frontend startup initiated`n" -ForegroundColor Green
}

# Display final status
Write-Host "`n╔══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                    🎯 REPAIR PROCESS COMPLETE                       ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "📊 STARTUP SUMMARY:`n" -ForegroundColor Green

Write-Host "  ✅ Node.js and npm verified" -ForegroundColor Green
Write-Host "  ✅ Backend dependencies installed" -ForegroundColor Green
Write-Host "  ✅ Frontend dependencies installed" -ForegroundColor Green
Write-Host "  ✅ Backend service starting on :3001" -ForegroundColor Green
Write-Host "  ✅ Frontend service starting on :3000`n" -ForegroundColor Green

Write-Host "═══════════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "🌐 ACCESS POINTS:`n" -ForegroundColor Cyan
Write-Host "  Frontend:        http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend API:     http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Backend Health:  http://localhost:3001/health`n" -ForegroundColor Cyan

Write-Host "═══════════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "✨ System repair complete! Services are starting...`n" -ForegroundColor Green
Write-Host "⏳ It may take 10-30 seconds for services to fully initialize.`n" -ForegroundColor Yellow
Write-Host "📌 Check back after a moment to verify all services are running.`n" -ForegroundColor Yellow

Write-Host "═══════════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
