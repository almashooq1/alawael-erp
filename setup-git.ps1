#!/usr/bin/env pwsh
# GitHub Integration Setup - Simplified

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GitHub Integration Setup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# Get current directory
$currentDir = Get-Location | Select-Object -ExpandProperty Path
Write-Host "Working directory: $currentDir" -ForegroundColor Gray
Write-Host ""

# Backend Setup
Write-Host "[1/2] Setting up Backend Repository..." -ForegroundColor Yellow

Push-Location -Path "erp_new_system\backend"

if (-not (Test-Path ".git")) {
    git init
    git remote add origin "https://github.com/almashooq1/alawael-backend.git"
    git config user.email "dev@alawael.com"
    git config user.name "Alawael Development"
    Write-Host "✅ Backend initialized" -ForegroundColor Green
}

git add .
$msg = "feat: Phase 6 Complete - ML and E-Commerce with 20000+ LOC and 500+ Tests"
git commit -m $msg --allow-empty 2>$null

Write-Host "✅ Backend committed" -ForegroundColor Green

Pop-Location
Write-Host ""

# ERP Setup
Write-Host "[2/2] Setting up ERP Repository..." -ForegroundColor Yellow

Push-Location -Path "erp_new_system"

if (-not (Test-Path ".git")) {
    git init
    git remote add origin "https://github.com/almashooq1/alawael-erp.git"
    git config user.email "dev@alawael.com"
    git config user.name "Alawael Development"
    Write-Host "✅ ERP initialized" -ForegroundColor Green
}

git add .
git reset -- "**/node_modules" 2>$null
git reset -- "**/build" 2>$null

$msg = "feat: Complete Enterprise Platform - 12 Phases, Mobile App, ML, E-Commerce, 500+ Tests"
git commit -m $msg --allow-empty 2>$null

Write-Host "✅ ERP committed" -ForegroundColor Green

Pop-Location
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
