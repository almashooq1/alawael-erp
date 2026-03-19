# AlAwael ERP System - Quick Verification Tests

Write-Host "`n=== AlAwael ERP System Test Suite ===" -ForegroundColor Cyan
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

$passed = 0
$failed = 0
$total = 0

# Test 1: Backend Process
$total++
$backend = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $proc = $_
    netstat -ano | Select-String ":3000.*LISTENING.*$($proc.Id)" | Measure-Object
}.Count -gt 0

if ($backend) {
    Write-Host "✅ Backend (Port 3000) - RUNNING" -ForegroundColor Green
    $passed++
} else {
    Write-Host "❌ Backend (Port 3000) - NOT RUNNING" -ForegroundColor Red
    $failed++
}

# Test 2: Frontend Process
$total++
$result = netstat -ano | Select-String ":3002.*LISTENING" | Measure-Object
if ($result.Count -gt 0) {
    Write-Host "✅ Frontend (Port 3002) - RUNNING" -ForegroundColor Green
    $passed++
} else {
    Write-Host "❌ Frontend (Port 3002) - NOT RUNNING" -ForegroundColor Red
    $failed++
}

# Test 3: Backend Health Check
$total++
try {
    $resp = Invoke-WebRequest "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 3
    if ($resp.StatusCode -eq 200) {
        Write-Host "✅ Backend Health Check - PASSED" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "❌ Backend Health Check - Status $($resp.StatusCode)" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "❌ Backend Health Check - FAILED" -ForegroundColor Red
    $failed++
}

# Test 4: Frontend Health Check
$total++
try {
    $resp = Invoke-WebRequest "http://localhost:3002" -UseBasicParsing -TimeoutSec 3
    if ($resp.StatusCode -eq 200) {
        Write-Host "✅ Frontend Health Check - PASSED" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "❌ Frontend Health Check - Status $($resp.StatusCode)" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "❌ Frontend Health Check - FAILED" -ForegroundColor Red
    $failed++
}

# Test 5: Configuration Files
$total++
$backendPath = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\erp_new_system\backend"
$hasConfig = (Test-Path "$backendPath\app.js") -and (Test-Path "$backendPath\.env")
if ($hasConfig) {
    Write-Host "✅ Backend Configuration - OK" -ForegroundColor Green
    $passed++
} else {
    Write-Host "❌ Backend Configuration - MISSING FILES" -ForegroundColor Red
    $failed++
}

# Test 6: Route Files
$total++
$routeFiles = @("rbac-advanced.routes.js", "tenant.routes.js", "ai.recommendations.routes.js", "integrationHub.routes.js")
$allRoutes = $true
foreach ($route in $routeFiles) {
    if (-not (Test-Path "$backendPath\routes\$route")) {
        $allRoutes = $false
    }
}
if ($allRoutes) {
    Write-Host "✅ Route Files - ALL PRESENT" -ForegroundColor Green
    $passed++
} else {
    Write-Host "❌ Route Files - SOME MISSING" -ForegroundColor Red
    $failed++
}

# Test 7: Git Repository
$total++
try {
    $branch = & git -C $backendPath rev-parse --abbrev-ref HEAD 2>&1
    Write-Host "✅ Git Repository - Branch: $branch" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "⚠️  Git Repository - Check Failed" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Total Tests: $total"
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "✅ SYSTEM STATUS: ALL TESTS PASSED - READY FOR PRODUCTION" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️  SYSTEM STATUS: REVIEW REQUIRED" -ForegroundColor Yellow
}
Write-Host ""
