#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════════
# ALAWAEL ERP - Emergency Rollback Script
# Quick recovery from failed deployment
# Date: March 2, 2026
# ═══════════════════════════════════════════════════════════════

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupVersion = "latest",

    [Parameter(Mandatory=$false)]
    [switch]$PreserveData = $true
)

$ErrorActionPreference = "Stop"

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Red
Write-Host "       ⚠️  EMERGENCY ROLLBACK PROCEDURE ⚠️" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Red

# Confirmation
Write-Host "This will rollback the system to a previous state." -ForegroundColor Yellow
Write-Host "Backup Version: $BackupVersion" -ForegroundColor Cyan
Write-Host "Preserve Data: $PreserveData`n" -ForegroundColor Cyan

$confirm = Read-Host "Are you sure you want to proceed? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "`n❌ Rollback cancelled by user.`n" -ForegroundColor Yellow
    exit 0
}

Write-Host "`n🔄 Starting rollback procedure...`n" -ForegroundColor Cyan

# Step 1: Create emergency backup of current state
Write-Host "📦 Step 1: Creating emergency backup of current state..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "./backups/emergency_$timestamp"

try {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

    # Backup databases if preserving data
    if ($PreserveData) {
        Write-Host "   Backing up PostgreSQL..." -NoNewline
        docker exec alawael-postgres pg_dump -U alawael_user alawael_erp > "$backupDir/postgres_backup.sql" 2>$null
        Write-Host " ✅" -ForegroundColor Green

        Write-Host "   Backing up MongoDB..." -NoNewline
        docker exec alawael-mongodb mongodump --archive="$backupDir/mongodb_backup.archive" --db=alawael_scm 2>$null
        Write-Host " ✅" -ForegroundColor Green
    }

    Write-Host "   Emergency backup saved to: $backupDir" -ForegroundColor Green
} catch {
    Write-Host " ⚠️  Backup failed, continuing anyway..." -ForegroundColor Yellow
}

# Step 2: Stop all running containers
Write-Host "`n🛑 Step 2: Stopping all services..." -ForegroundColor Yellow
try {
    docker-compose -f docker-compose.fullstack.yml down 2>$null
    Write-Host "   ✅ All services stopped" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Some services may not have stopped cleanly" -ForegroundColor Yellow
}

# Step 3: Git rollback (if version specified)
if ($BackupVersion -ne "latest") {
    Write-Host "`n🔙 Step 3: Rolling back code to version $BackupVersion..." -ForegroundColor Yellow
    try {
        git fetch --all 2>$null
        git checkout $BackupVersion 2>$null
        Write-Host "   ✅ Code rolled back to $BackupVersion" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Git rollback failed!" -ForegroundColor Red
        Write-Host "   Please manually checkout the correct version." -ForegroundColor Yellow
    }
}

# Step 4: Restore data volumes (if preserving)
if ($PreserveData) {
    Write-Host "`n💾 Step 4: Preserving data volumes..." -ForegroundColor Yellow
    Write-Host "   Data volumes will be retained for next deployment." -ForegroundColor Cyan
} else {
    Write-Host "`n⚠️  Step 4: Removing data volumes..." -ForegroundColor Red
    $confirmDelete = Read-Host "This will DELETE ALL database data. Type 'DELETE' to confirm"
    if ($confirmDelete -eq "DELETE") {
        docker-compose -f docker-compose.fullstack.yml down -v 2>$null
        Write-Host "   ✅ Data volumes removed" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  Data volumes preserved" -ForegroundColor Cyan
    }
}

# Step 5: Start stable version
Write-Host "`n🚀 Step 5: Starting stable system..." -ForegroundColor Yellow
try {
    docker-compose -f docker-compose.fullstack.yml up -d --build 2>$null
    Write-Host "   ✅ System restarted" -ForegroundColor Green

    Write-Host "`n   Waiting for services to initialize (45 seconds)..." -ForegroundColor Cyan
    Start-Sleep -Seconds 45
} catch {
    Write-Host "   ❌ Failed to start system!" -ForegroundColor Red
    Write-Host "   Please check docker-compose.fullstack.yml and try manual deployment." -ForegroundColor Yellow
    exit 1
}

# Step 6: Verify system health
Write-Host "`n✅ Step 6: Verifying system health..." -ForegroundColor Yellow

if (Test-Path "./health-check.ps1") {
    & ./health-check.ps1
} else {
    Write-Host "   Health check script not found. Manual verification required." -ForegroundColor Yellow

    # Quick manual checks
    $services = @(
        @{Name="Backend"; URL="http://localhost:3001/health"},
        @{Name="SCM Frontend"; URL="http://localhost:3000"}
    )

    foreach ($service in $services) {
        Write-Host "   Testing $($service.Name)..." -NoNewline
        try {
            $response = Invoke-WebRequest -Uri $service.URL -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
            Write-Host " ✅" -ForegroundColor Green
        } catch {
            Write-Host " ❌" -ForegroundColor Red
        }
    }
}

# Final Summary
Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "              ROLLBACK PROCEDURE COMPLETE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`nRollback Summary:" -ForegroundColor Yellow
Write-Host "   • Emergency backup: $backupDir" -ForegroundColor Cyan
Write-Host "   • Version: $BackupVersion" -ForegroundColor Cyan
Write-Host "   • Data preserved: $PreserveData" -ForegroundColor Cyan

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "   1. Verify system is working: http://localhost:3000" -ForegroundColor White
Write-Host "   2. Check logs: docker-compose -f docker-compose.fullstack.yml logs" -ForegroundColor White
Write-Host "   3. Review what caused the failure" -ForegroundColor White
Write-Host "   4. Plan next deployment carefully" -ForegroundColor White

Write-Host "`n📞 If issues persist:" -ForegroundColor Yellow
Write-Host "   • Review logs in $backupDir" -ForegroundColor Gray
Write-Host "   • Check Docker Desktop is running" -ForegroundColor Gray
Write-Host "   • Verify .env.production has correct values" -ForegroundColor Gray
Write-Host "   • Run: .\deploy-production.ps1 -Action status" -ForegroundColor Gray

Write-Host "`n═══════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

<#
.SYNOPSIS
Emergency rollback script for failed deployments

.DESCRIPTION
Quickly rolls back the system to a stable state

.PARAMETER BackupVersion
Git tag or commit to rollback to (default: latest)

.PARAMETER PreserveData
Keep database volumes (default: $true)

.EXAMPLE
.\rollback.ps1
Quick rollback keeping all data

.EXAMPLE
.\rollback.ps1 -BackupVersion v1.0.0
Rollback to specific version

.EXAMPLE
.\rollback.ps1 -PreserveData:$false
Rollback and clear all data (DESTRUCTIVE)

#>
