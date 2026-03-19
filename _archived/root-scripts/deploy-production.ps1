#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════════
# ALAWAEL ERP - Production Deployment Script
# Date: March 2, 2026
# Phase 3: Complete System Deployment
# ═══════════════════════════════════════════════════════════════

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('full', 'backend', 'frontend', 'database', 'stop', 'restart', 'logs', 'status')]
    [string]$Action = 'full',

    [Parameter(Mandatory=$false)]
    [switch]$Build = $false,

    [Parameter(Mandatory=$false)]
    [switch]$Clean = $false
)

$ErrorActionPreference = "Stop"

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "          ALAWAEL ERP - PRODUCTION DEPLOYMENT" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Configuration
$ComposeFile = "docker-compose.full stack.yml"
$EnvFile = ".env.production"

# Check Docker
Write-Host "🔍 Checking Docker installation..." -ForegroundColor Cyan
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check Docker Compose
try {
    $composeVersion = docker-compose --version
    Write-Host "✅ Docker Compose installed: $composeVersion`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose not found." -ForegroundColor Red
    exit 1
}

# Create .env file if not exists
if (-not (Test-Path $EnvFile)) {
    Write-Host "📝 Creating environment file..." -ForegroundColor Yellow
    @"
# ═══════════════════════════════════════════════════════════════
# ALAWAEL ERP - Production Environment Variables
# ═══════════════════════════════════════════════════════════════

# Database Configuration
POSTGRES_USER=alawael_user
POSTGRES_PASSWORD=SecurePass2026!ChangeThis
POSTGRES_DB=alawael_erp

MONGO_USER=admin
MONGO_PASS=MongoSecure2026!ChangeThis

REDIS_PASS=RedisSecure2026!ChangeThis

# Application Configuration
JWT_SECRET=JWTSecureKey2026ChangeThisNow!
NODE_ENV=production

# Ports Configuration
BACKEND_PORT=3001
SCM_BACKEND_PORT=3002
SCM_FRONTEND_PORT=3000
DASHBOARD_PORT=3005

# API URLs
SCM_API_URL=http://localhost:3002
DASHBOARD_API_URL=http://localhost:3001

# ═══════════════════════════════════════════════════════════════
"@ | Out-File -FilePath $EnvFile -Encoding UTF8
    Write-Host "✅ Environment file created: $EnvFile" -ForegroundColor Green
    Write-Host "⚠️  IMPORTANT: Please update passwords in $EnvFile`n" -ForegroundColor Yellow
}

# Main Actions
switch ($Action) {
    'full' {
        Write-Host "🚀 Starting full system deployment...`n" -ForegroundColor Green

        if ($Clean) {
            Write-Host "🧹 Cleaning up existing containers and volumes..." -ForegroundColor Yellow
            docker-compose -f $ComposeFile down -v
        }

        $buildFlag = if ($Build) { "--build" } else { "" }

        Write-Host "📦 Starting all services..." -ForegroundColor Cyan
        docker-compose -f $ComposeFile up -d $buildFlag

        Write-Host "`n✅ Deployment initiated! Waiting for services to be healthy..." -ForegroundColor Green
        Start-Sleep -Seconds 10

        & $MyInvocation.MyCommand.Path -Action status
    }

    'backend' {
        Write-Host "🚀 Starting backend services only...`n" -ForegroundColor Green
        $buildFlag = if ($Build) { "--build" } else { "" }
        docker-compose -f $ComposeFile up -d $buildFlag backend scm-backend
        Write-Host "✅ Backend services started!" -ForegroundColor Green
    }

    'frontend' {
        Write-Host "🚀 Starting frontend services only...`n" -ForegroundColor Green
        $buildFlag = if ($Build) { "--build" } else { "" }
        docker-compose -f $ComposeFile up -d $buildFlag scm-frontend dashboard-client
        Write-Host "✅ Frontend services started!" -ForegroundColor Green
    }

    'database' {
        Write-Host "🚀 Starting database services only...`n" -ForegroundColor Green
        docker-compose -f $ComposeFile up -d postgres mongodb redis
        Write-Host "✅ Database services started!" -ForegroundColor Green
    }

    'stop' {
        Write-Host "🛑 Stopping all services...`n" -ForegroundColor Yellow
        docker-compose -f $ComposeFile down
        Write-Host "✅ All services stopped!" -ForegroundColor Green
    }

    'restart' {
        Write-Host "🔄 Restarting all services...`n" -ForegroundColor Yellow
        docker-compose -f $ComposeFile restart
        Write-Host "✅ All services restarted!" -ForegroundColor Green
    }

    'logs' {
        Write-Host "📋 Showing logs (Ctrl+C to exit)...`n" -ForegroundColor Cyan
        docker-compose -f $ComposeFile logs -f
    }

    'status' {
        Write-Host "📊 System Status:`n" -ForegroundColor Cyan
        docker-compose -f $ComposeFile ps

        Write-Host "`n🔍 Service Health Checks:" -ForegroundColor Cyan
        $services = @(
            @{Name="Backend API"; URL="http://localhost:3001/health"},
            @{Name="SCM Backend"; URL="http://localhost:3002/health"},
            @{Name="SCM Frontend"; URL="http://localhost:3000"},
            @{Name="Dashboard"; URL="http://localhost:3005"}
        )

        foreach ($service in $services) {
            try {
                $response = Invoke-WebRequest -Uri $service.URL -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
                Write-Host "   ✅ $($service.Name) - OK" -ForegroundColor Green
            } catch {
                Write-Host "   ❌ $($service.Name) - Not responding" -ForegroundColor Red
            }
        }

        Write-Host "`n📌 Access Points:" -ForegroundColor Cyan
        Write-Host "   • Backend API:      http://localhost:3001" -ForegroundColor Yellow
        Write-Host "   • SCM Backend:      http://localhost:3002" -ForegroundColor Yellow
        Write-Host "   • SCM Frontend:     http://localhost:3000" -ForegroundColor Yellow
        Write-Host "   • Dashboard:        http://localhost:3005" -ForegroundColor Yellow
        Write-Host "   • PostgreSQL:       localhost:5432" -ForegroundColor Yellow
        Write-Host "   • MongoDB:          localhost:27017" -ForegroundColor Yellow
        Write-Host "   • Redis:            localhost:6379" -ForegroundColor Yellow
    }
}

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "For more options, run: Get-Help $($MyInvocation.MyCommand.Path) -Detailed" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

<#
.SYNOPSIS
ALAWAEL ERP Production Deployment Script

.DESCRIPTION
Comprehensive deployment script for managing Docker containers

.PARAMETER Action
Deployment action: full, backend, frontend, database, stop, restart, logs, status

.PARAMETER Build
Force rebuild of Docker images

.PARAMETER Clean
Remove existing containers and volumes before deployment

.EXAMPLE
.\deploy-production.ps1
Deploy full system

.EXAMPLE
.\deploy-production.ps1 -Action backend -Build
Rebuild and start backend services

.EXAMPLE
.\deploy-production.ps1 -Action stop
Stop all services

.EXAMPLE
.\deploy-production.ps1 -Action logs
View logs

#>
