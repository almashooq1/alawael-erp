# 🚀 START COMPLETE SYSTEM - Backend + Frontend

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   ALAWAEL ERP - Complete System Startup    " -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host "`n[1/2] Starting Backend Server..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-File", ".\RUN_SYSTEM.ps1"
Start-Sleep -Seconds 3

Write-Host "`n[2/2] Starting Frontend App..." -ForegroundColor White
Set-Location frontend-app

if (-not (Test-Path "node_modules")) {
    Write-Host "   Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

npm run dev
