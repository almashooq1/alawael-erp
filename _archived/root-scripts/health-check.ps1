#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════════
# ALAWAEL ERP - Health Check & System Verification Script
# Phase 3 Deployment Validation
# Date: March 2, 2026
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = "Continue"

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "        ALAWAEL ERP - SYSTEM HEALTH CHECK" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

$global:healthStatus = @{
    Passed = 0
    Failed = 0
    Warning = 0
}

function Test-ServiceHealth {
    param(
        [string]$ServiceName,
        [string]$URL,
        [int]$Timeout = 10
    )

    Write-Host "Testing $ServiceName..." -NoNewline

    try {
        $response = Invoke-WebRequest -Uri $URL -UseBasicParsing -TimeoutSec $Timeout -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host " ✅ OK" -ForegroundColor Green
            $global:healthStatus.Passed++
            return $true
        }
    } catch {
        Write-Host " ❌ FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
        $global:healthStatus.Failed++
        return $false
    }
}

function Test-DatabaseConnection {
    param(
        [string]$DatabaseName,
        [string]$ContainerName,
        [string]$TestCommand
    )

    Write-Host "Testing $DatabaseName..." -NoNewline

    try {
        $result = docker exec $ContainerName bash -c $TestCommand 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host " ✅ Connected" -ForegroundColor Green
            $global:healthStatus.Passed++
            return $true
        } else {
            Write-Host " ❌ Failed to connect" -ForegroundColor Red
            $global:healthStatus.Failed++
            return $false
        }
    } catch {
        Write-Host " ❌ Container not running" -ForegroundColor Red
        $global:healthStatus.Failed++
        return $false
    }
}

function Test-ContainerStatus {
    param([string]$ContainerName)

    Write-Host "Checking $ContainerName container..." -NoNewline

    try {
        $containerInfo = docker ps --filter "name=$ContainerName" --format "{{.Status}}" 2>$null
        if ($containerInfo -and $containerInfo -like "*Up*") {
            Write-Host " ✅ Running" -ForegroundColor Green
            $global:healthStatus.Passed++
            return $true
        } else {
            Write-Host " ❌ Not running" -ForegroundColor Red
            $global:healthStatus.Failed++
            return $false
        }
    } catch {
        Write-Host " ❌ Error checking status" -ForegroundColor Red
        $global:healthStatus.Failed++
        return $false
    }
}

# ═══════════════════════════════════════════════════════════════
# 1. Docker Container Status Checks
# ═══════════════════════════════════════════════════════════════
Write-Host "`n📦 DOCKER CONTAINERS STATUS" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray

$containers = @(
    "alawael-postgres",
    "alawael-mongodb",
    "alawael-redis",
    "alawael-backend",
    "alawael-scm-backend",
    "alawael-scm-frontend",
    "alawael-dashboard-client"
)

foreach ($container in $containers) {
    Test-ContainerStatus -ContainerName $container
    Start-Sleep -Milliseconds 100
}

# ═══════════════════════════════════════════════════════════════
# 2. Database Connectivity Checks
# ═══════════════════════════════════════════════════════════════
Write-Host "`n🗄️  DATABASE CONNECTIVITY" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray

# PostgreSQL
Test-DatabaseConnection -DatabaseName "PostgreSQL" `
    -ContainerName "alawael-postgres" `
    -TestCommand "pg_isready -U alawael_user"

# MongoDB
Test-DatabaseConnection -DatabaseName "MongoDB" `
    -ContainerName "alawael-mongodb" `
    -TestCommand "echo 'db.runCommand({ ping: 1 })' | mongosh --quiet"

# Redis
Test-DatabaseConnection -DatabaseName "Redis" `
    -ContainerName "alawael-redis" `
    -TestCommand "redis-cli ping"

# ═══════════════════════════════════════════════════════════════
# 3. API Health Endpoint Checks
# ═══════════════════════════════════════════════════════════════
Write-Host "`n🌐 API ENDPOINTS HEALTH" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray

$apiEndpoints = @(
    @{Name="Backend API"; URL="http://localhost:3001/health"},
    @{Name="SCM Backend"; URL="http://localhost:3002/health"},
    @{Name="Dashboard Server"; URL="http://localhost:3004/health"}
)

foreach ($endpoint in $apiEndpoints) {
    Test-ServiceHealth -ServiceName $endpoint.Name -URL $endpoint.URL -Timeout 15
    Start-Sleep -Milliseconds 200
}

# ═══════════════════════════════════════════════════════════════
# 4. Frontend Accessibility Checks
# ═══════════════════════════════════════════════════════════════
Write-Host "`n🖥️  FRONTEND APPLICATIONS" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray

$frontendApps = @(
    @{Name="SCM Frontend"; URL="http://localhost:3000"},
    @{Name="Dashboard Client"; URL="http://localhost:3005"}
)

foreach ($app in $frontendApps) {
    Test-ServiceHealth -ServiceName $app.Name -URL $app.URL -Timeout 10
    Start-Sleep -Milliseconds 200
}

# ═══════════════════════════════════════════════════════════════
# 5. Resource Usage Analysis
# ═══════════════════════════════════════════════════════════════
Write-Host "`n💻 RESOURCE USAGE" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray

try {
    $stats = docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | Select-Object -Skip 1
    $stats | ForEach-Object {
        Write-Host "   $_" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ⚠️  Unable to fetch resource stats" -ForegroundColor Yellow
    $global:healthStatus.Warning++
}

# ═══════════════════════════════════════════════════════════════
# 6. Network Connectivity
# ═══════════════════════════════════════════════════════════════
Write-Host "`n🔌 NETWORK CONNECTIVITY" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray

$networkTests = @(
    @{Service="Backend to PostgreSQL"; Container="alawael-backend"; Target="postgres:5432"},
    @{Service="Backend to MongoDB"; Container="alawael-backend"; Target="mongodb:27017"},
    @{Service="Backend to Redis"; Container="alawael-backend"; Target="redis:6379"}
)

foreach ($test in $networkTests) {
    Write-Host "Testing $($test.Service)..." -NoNewline
    try {
        $result = docker exec $test.Container sh -c "nc -zv $($test.Target) 2>&1" 2>$null
        if ($result -match "(open|succeeded)") {
            Write-Host " ✅ Connected" -ForegroundColor Green
            $global:healthStatus.Passed++
        } else {
            Write-Host " ❌ Failed" -ForegroundColor Red
            $global:healthStatus.Failed++
        }
    } catch {
        Write-Host " ⚠️  Unable to test" -ForegroundColor Yellow
        $global:healthStatus.Warning++
    }
}

# ═══════════════════════════════════════════════════════════════
# 7. Log File Status
# ═══════════════════════════════════════════════════════════════
Write-Host "`n📄 LOG FILES STATUS" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray

$logDirs = @("./logs", "./backend/logs", "./supply-chain-management/backend/logs")

foreach ($logDir in $logDirs) {
    if (Test-Path $logDir) {
        $logCount = (Get-ChildItem -Path $logDir -Filter "*.log" -ErrorAction SilentlyContinue | Measure-Object).Count
        Write-Host "   $logDir : $logCount log files" -ForegroundColor Cyan
    }
}

# ═══════════════════════════════════════════════════════════════
# Final Summary
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "                    HEALTH CHECK SUMMARY" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

$totalChecks = $global:healthStatus.Passed + $global:healthStatus.Failed + $global:healthStatus.Warning
$successRate = if ($totalChecks -gt 0) { [math]::Round(($global:healthStatus.Passed / $totalChecks) * 100, 2) } else { 0 }

Write-Host ""
Write-Host "   ✅ Passed:   $($global:healthStatus.Passed)" -ForegroundColor Green
Write-Host "   ❌ Failed:   $($global:healthStatus.Failed)" -ForegroundColor Red
Write-Host "   ⚠️  Warnings: $($global:healthStatus.Warning)" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 60) { "Yellow" } else { "Red" })
Write-Host ""

if ($global:healthStatus.Failed -eq 0) {
    Write-Host "   🎉 All critical checks passed! System is healthy." -ForegroundColor Green
    exit 0
} elseif ($global:healthStatus.Failed -le 2) {
    Write-Host "   ⚠️  Some checks failed. Review issues above." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "   🚨 Multiple failures detected. System requires attention." -ForegroundColor Red
    exit 2
}

Write-Host "`n═══════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
