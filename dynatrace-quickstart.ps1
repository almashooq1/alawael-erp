# 🔍 Dynatrace OneAgent Quick Start (PowerShell)
# ===============================================

Write-Host "`n`n" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Blue
Write-Host "   🔍 DYNATRACE QUICK START" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
Write-Host "`n"

# Check .env file
Write-Host "📝 Checking .env file..." -ForegroundColor Cyan
$envFile = "erp_new_system\backend\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "⚠️  Creating .env file..." -ForegroundColor Yellow
    Copy-Item "erp_new_system\backend\.env.example" $envFile
    Write-Host "✅ .env created" -ForegroundColor Green
} else {
    Write-Host "✅ .env exists" -ForegroundColor Green
}

# Check Dynatrace Service Status
Write-Host "`n🔍 Checking Dynatrace Service..." -ForegroundColor Cyan
$dynaService = Get-Service | Where-Object { $_.Name -like "*Dynatrace*" }
if ($dynaService) {
    Write-Host "✅ Dynatrace OneAgent is: $($dynaService.Status)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Dynatrace OneAgent not found" -ForegroundColor Yellow
}

# Run Validation
Write-Host "`n🧪 Running Dynatrace Validation..." -ForegroundColor Cyan
Push-Location "erp_new_system\backend"
node dynatrace-validation.js
$validationResult = $LASTEXITCODE
Pop-Location

if ($validationResult -eq 0) {
    Write-Host "`n✅ VALIDATION PASSED" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  VALIDATION FAILED - Check logs" -ForegroundColor Yellow
}

# Menu
Write-Host "`n🚀 What would you like to do?" -ForegroundColor Cyan
Write-Host "`n1. Start Backend (npm start)"
Write-Host "2. Start Frontend (npm start)"
Write-Host "3. Run Tests"
Write-Host "4. Exit"
Write-Host "`n"

$choice = Read-Host "Enter choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host "Starting Backend..." -ForegroundColor Blue
        Set-Location "erp_new_system\backend"
        npm start
        break
    }
    "2" {
        Write-Host "Starting Frontend..." -ForegroundColor Blue
        Set-Location "supply-chain-management\frontend"
        npm start
        break
    }
    "3" {
        Write-Host "Running validation tests..." -ForegroundColor Blue
        Set-Location "erp_new_system\backend"
        node dynatrace-validation.js
        break
    }
    "4" {
        Write-Host "Exiting..." -ForegroundColor Yellow
        exit
    }
    default {
        Write-Host "Invalid choice" -ForegroundColor Red
    }
}
