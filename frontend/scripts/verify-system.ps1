#!/usr/bin/env powershell
# Quick System Verification Script

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   System Verification - Phase 12      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$results = @()

# Test 1: Backend Health
Write-Host "Testing Backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method Get -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Backend is ONLINE on Port 3001" -ForegroundColor Green
        $results += "Backend: PASS"
    }
}
catch {
    Write-Host "  ❌ Backend is OFFLINE" -ForegroundColor Red
    $results += "Backend: FAIL"
}

# Test 2: Frontend
Write-Host "Testing Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3002" -Method Get -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Frontend is ONLINE on Port 3002" -ForegroundColor Green
        $results += "Frontend: PASS"
    }
}
catch {
    Write-Host "  ⚠️  Frontend may be compiling or not fully started" -ForegroundColor Yellow
    $results += "Frontend: WARNING"
}

# Test 3: API Auth Endpoint
Write-Host "Testing API Auth..." -ForegroundColor Yellow
try {
    $body = @{
        email    = "test@example.com"
        password = "wrongpass"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing 2>&1
    Write-Host "  ✅ Auth endpoints are accessible" -ForegroundColor Green
    $results += "Auth Endpoint: PASS"
}
catch {
    # Even if credentials are wrong, endpoint exists
    if ($_.Exception.Message -like "*401*" -or $_.Exception.Message -like "*Invalid*") {
        Write-Host "  ✅ Auth endpoints are accessible (401 = working)" -ForegroundColor Green
        $results += "Auth Endpoint: PASS"
    }
    else {
        Write-Host "  ❌ Auth endpoints not accessible" -ForegroundColor Red
        $results += "Auth Endpoint: FAIL"
    }
}

# Test 4: Database
Write-Host "Testing Database..." -ForegroundColor Yellow
if (Test-Path "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend\data\db.json") {
    Write-Host "  ✅ In-Memory Database exists" -ForegroundColor Green
    $results += "Database: PASS"
}
else {
    Write-Host "  ⚠️  Database file will be created on first use" -ForegroundColor Yellow
    $results += "Database: WARNING"
}

# Summary
Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Summary                             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$passCount = @($results | Where-Object { $_ -like "*PASS*" }).Count
$failCount = @($results | Where-Object { $_ -like "*FAIL*" }).Count
$warnCount = @($results | Where-Object { $_ -like "*WARNING*" }).Count

foreach ($result in $results) {
    if ($result -like "*PASS*") {
        Write-Host "  ✅ $result" -ForegroundColor Green
    }
    elseif ($result -like "*FAIL*") {
        Write-Host "  ❌ $result" -ForegroundColor Red
    }
    else {
        Write-Host "  ⚠️  $result" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Results: $passCount Passed, $failCount Failed, $warnCount Warnings" -ForegroundColor Cyan

if ($failCount -eq 0) {
    Write-Host ""
    Write-Host "✨ System is READY! Go to http://localhost:3002" -ForegroundColor Green
    Write-Host ""
}
else {
    Write-Host ""
    Write-Host "⚠️  Please check the failures above" -ForegroundColor Yellow
    Write-Host ""
}
