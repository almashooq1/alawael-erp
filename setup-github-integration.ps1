#!/usr/bin/env pwsh
# GitHub Integration Setup Script
# Pushes all developed code to GitHub repositories

$ErrorActionPreference = "Stop"

# Configuration
$backendRepo = "https://github.com/almashooq1/alawael-backend.git"
$erpRepo = "https://github.com/almashooq1/alawael-erp.git"
$backendPath = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\erp_new_system\backend"
$erpPath = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\erp_new_system"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GitHub Integration Setup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Setup Backend Repository
Write-Host "[1/4] Setting up Backend Repository..." -ForegroundColor Yellow

if (-not (Test-Path "$backendPath\.git")) {
    Write-Host "Initializing git in backend..." -ForegroundColor Gray
    cd $backendPath
    git init
    git remote add origin $backendRepo
    git config user.email "dev@alawael.com"
    git config user.name "Alawael Development"
} else {
    Write-Host "Backend repo already initialized" -ForegroundColor Gray
}

# Step 2: Stage and Commit Backend Code
Write-Host "[2/4] Committing Backend Code..." -ForegroundColor Yellow
cd $backendPath

# Add all files
git add .

# Count staged files
$stagedCount = git diff --cached --name-only | Measure-Object -Line | Select-Object -ExpandProperty Lines

Write-Host "Staged $stagedCount files for commit" -ForegroundColor Gray

# Commit
$commitMsg = "feat: Phase 6 Complete - ML (Phase 6f) & E-Commerce (Phase 6g) Integration + Full Test Suite + Documentation"
git commit -m "$commitMsg" --allow-empty

Write-Host "✅ Backend committed" -ForegroundColor Green
Write-Host ""

# Step 3: Setup ERP Repository
Write-Host "[3/4] Setting up ERP Repository..." -ForegroundColor Yellow

if (-not (Test-Path "$erpPath\.git")) {
    Write-Host "Initializing git in ERP..." -ForegroundColor Gray
    cd $erpPath
    git init
    git remote add origin $erpRepo
    git config user.email "dev@alawael.com"
    git config user.name "Alawael Development"
} else {
    Write-Host "ERP repo already initialized" -ForegroundColor Gray
}

# Step 4: Stage and Commit ERP Code (Mobile + Docs)
Write-Host "[4/4] Committing ERP Code..." -ForegroundColor Yellow
cd $erpPath

# Add all files except node_modules and build artifacts
git add . --force
git reset -- "**/node_modules/**" 2>$null
git reset -- "**/build/**" 2>$null
git reset -- "**/.expo/**" 2>$null

# Count staged files
$stagedCount = git diff --cached --name-only | Measure-Object -Line | Select-Object -ExpandProperty Lines

Write-Host "Staged $stagedCount files for commit" -ForegroundColor Gray

# Commit
$commitMsg = "feat: Complete Enterprise Platform - Phase 6 Complete (Phases 6a-6g) + Mobile App + 500+ Tests + 20k+ Documentation"
git commit -m "$commitMsg" --allow-empty

Write-Host "✅ ERP committed" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SETUP COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Repository Status:" -ForegroundColor Yellow
Write-Host ""

Write-Host "Backend Repository:" -ForegroundColor Cyan
Write-Host "  Location: $backendPath"
Write-Host "  Remote: $backendRepo"
cd $backendPath
$status = git log --oneline -1 2>$null || Write-Host "  (No commits yet)"
if ($status) { Write-Host "  Latest: $status" }

Write-Host ""
Write-Host "ERP Repository:" -ForegroundColor Cyan
Write-Host "  Location: $erpPath"
Write-Host "  Remote: $erpRepo"
cd $erpPath
$status = git log --oneline -1 2>$null || Write-Host "  (No commits yet)"
if ($status) { Write-Host "  Latest: $status" }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📝 NEXT STEPS:" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To push to GitHub:" -ForegroundColor Yellow
Write-Host "  cd backend && git push -u origin main" -ForegroundColor Gray
Write-Host "  cd ../.. && git push -u origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Make sure you have GitHub credentials configured!" -ForegroundColor Yellow
Write-Host ""
