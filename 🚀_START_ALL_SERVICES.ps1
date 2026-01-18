# 🚀 AlAwael ERP - Complete Startup Script (PowerShell)
# This script starts all services required for the system

Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🚀 AlAwael ERP - System Startup            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Get project directory
$PROJECT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BACKEND_DIR = Join-Path $PROJECT_DIR "backend"
$FRONTEND_DIR = Join-Path $PROJECT_DIR "frontend"

# Functions for pretty output
function Print-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ $Title" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
}

function Print-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Print-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Print-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

# Prerequisites Check
Print-Header " 📋 Prerequisites Check"

# Check Node.js
$nodeVersion = node -v 2>$null
if ($LASTEXITCODE -ne 0) {
    Print-Error "Node.js not found. Please install Node.js first."
    Read-Host "Press Enter to exit"
    exit 1
}
Print-Success "Node.js version: $nodeVersion"

# Check npm
$npmVersion = npm -v 2>$null
if ($LASTEXITCODE -ne 0) {
    Print-Error "npm not found. Please install npm first."
    Read-Host "Press Enter to exit"
    exit 1
}
Print-Success "npm version: $npmVersion"

# Backend Setup
Print-Header " 🔧 Backend Setup"

if (!(Test-Path "$BACKEND_DIR\node_modules")) {
    Print-Warning "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    npm install
    if ($LASTEXITCODE -eq 0) {
        Print-Success "Backend dependencies installed"
    }
    else {
        Print-Error "Failed to install backend dependencies"
        Read-Host "Press Enter to continue anyway"
    }
}
else {
    Print-Success "Backend dependencies already installed"
}

# Frontend Setup
Print-Header " 🎨 Frontend Setup"

if (!(Test-Path "$FRONTEND_DIR\node_modules")) {
    Print-Warning "Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    npm install
    if ($LASTEXITCODE -eq 0) {
        Print-Success "Frontend dependencies installed"
    }
    else {
        Print-Error "Failed to install frontend dependencies"
        Read-Host "Press Enter to continue anyway"
    }
}
else {
    Print-Success "Frontend dependencies already installed"
}

# Environment Configuration
Print-Header " ⚙️  Environment Configuration"

# Backend .env
if (!(Test-Path "$BACKEND_DIR\.env")) {
    Print-Warning "Backend .env not found. Creating with defaults..."
    
    $envContent = @"
# Backend Configuration
NODE_ENV=development
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/alawael-dev
MONGODB_ATLAS_URI=mongodb+srv://user:password@cluster.mongodb.net/alawael

# JWT
JWT_SECRET=$(python -c "import secrets; print(secrets.token_urlsafe(32))" 2>$null)
JWT_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Mode
SMART_TEST_MODE=true

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/server.log
"@
    
    Set-Content -Path "$BACKEND_DIR\.env" -Value $envContent
    Print-Success "Backend .env created"
}
else {
    Print-Success "Backend .env found"
}

# Frontend .env
if (!(Test-Path "$FRONTEND_DIR\.env")) {
    Print-Warning "Frontend .env not found. Creating with defaults..."
    
    $envContent = @"
# Frontend Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SOCKET_URL=http://localhost:3001
REACT_APP_ENV=development

# Features
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_SENTRY=false
REACT_APP_ENABLE_HOTJAR=false
"@
    
    Set-Content -Path "$FRONTEND_DIR\.env" -Value $envContent
    Print-Success "Frontend .env created"
}
else {
    Print-Success "Frontend .env found"
}

# Database Setup
Print-Header " 📊 Database Setup"
Print-Warning "Running database setup..."
cd "$BACKEND_DIR"
npm run db:seed 2>$null
Print-Success "Database ready"

# Starting Services
Print-Header " 🚀 Starting Services"

# Start Backend
Print-Warning "Starting Backend Server (Port 3001)..."
cd "$BACKEND_DIR"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start"
Start-Sleep -Seconds 3
Print-Success "Backend started"

# Start Frontend
Print-Warning "Starting Frontend Server (Port 3000)..."
cd "$FRONTEND_DIR"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start"
Start-Sleep -Seconds 5
Print-Success "Frontend started"

Write-Host ""
Write-Host "════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ All services are running!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

Write-Host "📍 Access Points:" -ForegroundColor Cyan
Write-Host "  🌐 Frontend:  http://localhost:3000" -ForegroundColor Green
Write-Host "  🔌 Backend:   http://localhost:3001" -ForegroundColor Green
Write-Host "  📚 API Docs:  http://localhost:3001/api-docs" -ForegroundColor Green
Write-Host "  📊 Dashboard: http://localhost:3001/admin" -ForegroundColor Green
Write-Host ""

Write-Host "🛠️  Services Running:" -ForegroundColor Cyan
Write-Host "  ✅ Backend on port 3001" -ForegroundColor Green
Write-Host "  ✅ Frontend on port 3000" -ForegroundColor Green
Write-Host "  ✅ Check browser for UI at http://localhost:3000" -ForegroundColor Green
Write-Host ""

Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "  • Startup Guide:       🚀_START_NOW_COMPLETE_GUIDE.md" -ForegroundColor Yellow
Write-Host "  • API Guide:           🔌_API_INTEGRATION_GUIDE.md" -ForegroundColor Yellow
Write-Host "  • Deployment Guide:    🚀_PHASE_4_PRODUCTION_DEPLOYMENT_GUIDE.md" -ForegroundColor Yellow
Write-Host "  • Test Report:         🧪_COMPREHENSIVE_TEST_REPORT_JANUARY_2026.md" -ForegroundColor Yellow
Write-Host ""

Write-Host "⚠️  Note: Services are running in new PowerShell windows" -ForegroundColor Yellow
Write-Host "          Close windows to stop services" -ForegroundColor Yellow
Write-Host ""

Write-Host "✅ System startup completed successfully!" -ForegroundColor Green
Read-Host "Press Enter to close this window"
