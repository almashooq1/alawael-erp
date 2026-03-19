#!/usr/bin/env pwsh
# ALAWAEL v1.0.0 - Local Development Setup Script
# Created: February 23, 2026

Write-Host "`n" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   ALAWAEL v1.0.0 - Local Setup & Run Script" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "`n"

# Function to check if command exists
function Test-CommandExists {
    param($command)
    $null = & {
        try { 
            if (Get-Command $command -ErrorAction Stop) { 
                return $true 
            }
        }
        catch { 
            return $false 
        }
    }
}

# Check Prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-CommandExists node)) {
    Write-Host "❌ ERROR: Node.js not found!" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

$nodeVersion = & node --version
Write-Host "✅ Node.js $nodeVersion found" -ForegroundColor Green

if (-not (Test-CommandExists npm)) {
    Write-Host "❌ ERROR: npm not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$npmVersion = & npm --version
Write-Host "✅ npm $npmVersion found" -ForegroundColor Green

Write-Host "`n"

# Project Selection
Write-Host "Select project to run:" -ForegroundColor Cyan
Write-Host "1. Backend (ALAWAEL ERP Backend)" -ForegroundColor White
Write-Host "2. ERP System (erp_new_system)" -ForegroundColor White
Write-Host "3. Frontend (React App)" -ForegroundColor White
Write-Host "4. Full Stack (Backend + Frontend)" -ForegroundColor White
Write-Host "5. Exit" -ForegroundColor White
Write-Host "`n"

$choice = Read-Host "Enter your choice (1-5)"

# Function to create .env file
function Create-EnvFile {
    param(
        [string]$path,
        [string]$content
    )
    
    if (-not (Test-Path $path)) {
        Write-Host "Creating .env file..." -ForegroundColor Yellow
        $content | Set-Content -Path $path -Encoding UTF8
        Write-Host "✅ .env file created with defaults" -ForegroundColor Green
    }
}

# Backend Setup Function
function Setup-Backend {
    Write-Host "`n🚀 Setting up ALAWAEL Backend..." -ForegroundColor Green
    
    Push-Location backend
    
    $envContent = @"
NODE_ENV=development
PORT=3000
HOST=localhost
DATABASE_URL=mongodb://localhost:27017/alawael-dev
JWT_SECRET=your-secret-key-please-change-this
JWT_EXPIRE=7d
REFRESH_TOKEN_EXPIRE=30d
LOG_LEVEL=debug
SKIP_ENV_VALIDATION=true
"@
    
    Create-EnvFile .env $envContent
    
    Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
    & npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install failed" -ForegroundColor Red
        Pop-Location
        return $false
    }
    
    Write-Host "`n✅ Setup complete!" -ForegroundColor Green
    Write-Host "Starting backend server..." -ForegroundColor Green
    Write-Host "🌍 Server will run on http://localhost:3000" -ForegroundColor Cyan
    Write-Host "`n"
    
    & npm start
    
    Pop-Location
    return $true
}

# ERP System Setup Function
function Setup-ERP {
    Write-Host "`n🚀 Setting up ERP System Backend..." -ForegroundColor Green
    
    Push-Location erp_new_system\backend
    
    $envContent = @"
NODE_ENV=development
PORT=3000
DATABASE_URL=mongodb://localhost:27017/erp-dev
JWT_SECRET=your-secret-key-please-change-this
"@
    
    Create-EnvFile .env $envContent
    
    Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
    & npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install failed" -ForegroundColor Red
        Pop-Location
        return $false
    }
    
    Write-Host "`n✅ Setup complete!" -ForegroundColor Green
    Write-Host "Starting ERP backend server..." -ForegroundColor Green
    Write-Host "🌍 Server will run on http://localhost:3000" -ForegroundColor Cyan
    Write-Host "`n"
    
    & npm start
    
    Pop-Location
    return $true
}

# Frontend Setup Function
function Setup-Frontend {
    Write-Host "`n🚀 Setting up Frontend..." -ForegroundColor Green
    
    Push-Location frontend
    
    $envContent = "REACT_APP_API_URL=http://localhost:3000"
    
    Create-EnvFile .env $envContent
    
    Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
    & npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install failed" -ForegroundColor Red
        Pop-Location
        return $false
    }
    
    Write-Host "`n✅ Setup complete!" -ForegroundColor Green
    Write-Host "Starting frontend development server..." -ForegroundColor Green
    Write-Host "🌍 Browser will open at http://localhost:3000" -ForegroundColor Cyan
    Write-Host "`n"
    
    & npm start
    
    Pop-Location
    return $true
}

# Full Stack Setup Function
function Setup-FullStack {
    Write-Host "`n🚀 Setting up Full Stack (Backend + Frontend)..." -ForegroundColor Green
    Write-Host "`nThis will open TWO windows - one for Backend, one for Frontend" -ForegroundColor Yellow
    
    # Setup Backend
    Write-Host "`nSetting up Backend..." -ForegroundColor Cyan
    Push-Location backend
    
    $envContent = @"
NODE_ENV=development
PORT=3000
HOST=localhost
DATABASE_URL=mongodb://localhost:27017/alawael-dev
JWT_SECRET=your-secret-key-please-change-this
JWT_EXPIRE=7d
REFRESH_TOKEN_EXPIRE=30d
LOG_LEVEL=debug
SKIP_ENV_VALIDATION=true
"@
    
    Create-EnvFile .env $envContent
    
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    & npm install | Out-Null
    
    Pop-Location
    
    # Setup Frontend
    Write-Host "`nSetting up Frontend..." -ForegroundColor Cyan
    Push-Location frontend
    
    $envContent = "REACT_APP_API_URL=http://localhost:3000"
    
    Create-EnvFile .env $envContent
    
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    & npm install | Out-Null
    
    Pop-Location
    
    Write-Host "`n✅ Full Stack setup complete!" -ForegroundColor Green
    
    # Start Backend
    Write-Host "`nOpening Backend in new window..." -ForegroundColor Cyan
    $backendPath = Join-Path (Get-Location) "backend"
    Start-Process pwsh -ArgumentList "-NoExit -Command cd '$backendPath'; npm start"
    
    Write-Host "Waiting 5 seconds before starting Frontend..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Start Frontend
    Write-Host "Opening Frontend in new window..." -ForegroundColor Cyan
    $frontendPath = Join-Path (Get-Location) "frontend"
    Start-Process pwsh -ArgumentList "-NoExit -Command cd '$frontendPath'; npm start"
    
    Write-Host "`n🎉 Both servers starting!" -ForegroundColor Green
    Write-Host "📍 Backend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "📍 Frontend: http://localhost:3000 (in browser)" -ForegroundColor Cyan
    Write-Host "`nClose either window to stop the server." -ForegroundColor Yellow
}

# Execute based on selection
switch ($choice) {
    "1" { 
        Setup-Backend
    }
    "2" { 
        Setup-ERP
    }
    "3" { 
        Setup-Frontend
    }
    "4" { 
        Setup-FullStack
    }
    "5" { 
        Write-Host "Goodbye!" -ForegroundColor Green
        exit 0
    }
    default { 
        Write-Host "Invalid choice! Please select 1-5" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "`n✅ Script completed!" -ForegroundColor Green
Read-Host "Press Enter to close"
