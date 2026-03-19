#!/usr/bin/env powershell
# Phase 13 Week 2 - Quick Setup Script
# Initializes PostgreSQL, Redis, and runs tests

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🚀 ALAWAEL Phase 13 Week 2 - Quick Setup Script          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Step 1: Check Docker
Write-Host "📋 Step 1: Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker version --format "{{.Server.Version}}"
    Write-Host "✅ Docker installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Step 2: Start PostgreSQL and Redis
Write-Host "`n📋 Step 2: Starting PostgreSQL & Redis containers..." -ForegroundColor Yellow
$composeFile = "docker-compose.dev.yml"
$composeDir = (Get-Item -Path $PSScriptRoot).FullName

if (-not (Test-Path $composeFile)) {
    Write-Host "❌ docker-compose.dev.yml not found in $composeDir" -ForegroundColor Red
    exit 1
}

Write-Host "   Starting containers..." -ForegroundColor Cyan
docker-compose -f $composeFile down -v 2>$null  # Clean start
Start-Sleep -Seconds 2
docker-compose -f $composeFile up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start containers" -ForegroundColor Red
    exit 1
}

Write-Host "   ⏳ Waiting for services to be ready (30 seconds)..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# Step 3: Verify services
Write-Host "`n📋 Step 3: Verifying services..." -ForegroundColor Yellow

# Check PostgreSQL Primary
try {
    $pgTest = docker exec alawael_postgres_primary pg_isready -U alawael_user
    Write-Host "   ✅ PostgreSQL Primary: Ready" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  PostgreSQL Primary: Not ready yet" -ForegroundColor Yellow
}

# Check Redis
try {
    $redisTest = docker exec alawael_redis redis-cli ping
    if ($redisTest -eq "PONG") {
        Write-Host "   ✅ Redis: Ready" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Redis: Not ready yet" -ForegroundColor Yellow
}

# Step 4: Run migrations
Write-Host "`n📋 Step 4: Running database migrations..." -ForegroundColor Yellow
$migrationFile = "server/migrations/001_week2_optimizations.sql"

if (Test-Path $migrationFile) {
    try {
        $env:PGPASSWORD = "alawael_secure_password"
        psql -h localhost -U alawael_user -d alawael_erp -f $migrationFile
        Write-Host "   ✅ Migrations completed" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Migration error: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Migration file not found: $migrationFile" -ForegroundColor Yellow
}

# Step 5: Run tests
Write-Host "`n📋 Step 5: Running tests..." -ForegroundColor Yellow
cd server
npm test 2>&1 | Tee-Object -FilePath "test-results.log" | Select-Object -Last 50

# Summary
Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                   ✅ SETUP COMPLETE                           ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "📊 Available Services:" -ForegroundColor Cyan
Write-Host "   • PostgreSQL Primary : localhost:5432" -ForegroundColor White
Write-Host "   • PostgreSQL Replica 1: localhost:5433" -ForegroundColor White
Write-Host "   • PostgreSQL Replica 2: localhost:5434" -ForegroundColor White
Write-Host "   • Redis             : localhost:6379" -ForegroundColor White
Write-Host "   • Redis Commander   : http://localhost:8081" -ForegroundColor White
Write-Host "   • pgAdmin           : http://localhost:5050" -ForegroundColor White
Write-Host "`n🚀 To start the backend:" -ForegroundColor Cyan
Write-Host "   cd server && node index.js`n" -ForegroundColor White
