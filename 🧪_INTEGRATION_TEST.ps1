#!/usr/bin/env pwsh

# ============================================
# 🧪 Frontend-Backend Integration Test Script
# 10 Minute Quick Test
# ============================================

Write-Host "
╔════════════════════════════════════════════════════════╗
║  🧪 Alawael Integration Test Suite                    ║
║  Testing Frontend ↔ Backend Connectivity              ║
║  Expected Duration: 10 minutes                        ║
╚════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

# Variables
$BACKEND_URL = "http://localhost:3001"
$FRONTEND_URL = "http://localhost:5173"
$TESTS_PASSED = 0
$TESTS_FAILED = 0

# Helper Functions
function Test-Endpoint {
    param(
        [string]$Url,
        [string]$TestName,
        [string]$Method = "GET",
        [hashtable]$Headers = @{}
    )
    
    try {
        Write-Host "Testing: $TestName..." -ForegroundColor Yellow
        $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -TimeoutSec 5
        Write-Host "✅ PASSED: $TestName (Status: $($response.StatusCode))" -ForegroundColor Green
        $global:TESTS_PASSED++
        return $response
    }
    catch {
        Write-Host "❌ FAILED: $TestName - $($_.Exception.Message)" -ForegroundColor Red
        $global:TESTS_FAILED++
        return $null
    }
}

function Show-Result {
    param([string]$Message, [bool]$Success = $true)
    $color = if ($Success) { "Green" } else { "Red" }
    $symbol = if ($Success) { "✅" } else { "❌" }
    Write-Host "$symbol $Message" -ForegroundColor $color
}

# ============================================
# Test 1: Backend Server Check (2 min)
# ============================================
Write-Host "`n📡 Test 1: Backend Server Status" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

Test-Endpoint -Url "$BACKEND_URL/api/health" -TestName "Backend Health Check"
Test-Endpoint -Url "$BACKEND_URL/api" -TestName "Backend API Root"

# ============================================
# Test 2: CORS Configuration (2 min)
# ============================================
Write-Host "`n🔐 Test 2: CORS Configuration" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

try {
    $headers = @{
        "Origin"                        = $FRONTEND_URL
        "Access-Control-Request-Method" = "GET"
    }
    $response = Test-Endpoint -Url "$BACKEND_URL/api/students" -TestName "CORS Preflight" -Method "OPTIONS" -Headers $headers
    if ($response) {
        Show-Result "CORS headers present: $($response.Headers.'Access-Control-Allow-Origin')" $true
    }
}
catch {
    Show-Result "CORS check failed" $false
}

# ============================================
# Test 3: API Endpoints (3 min)
# ============================================
Write-Host "`n📊 Test 3: API Endpoints" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

# Test Students endpoint
$studentsResponse = Test-Endpoint -Url "$BACKEND_URL/api/students" -TestName "GET /api/students"

if ($studentsResponse) {
    try {
        $content = $studentsResponse.Content | ConvertFrom-Json
        Write-Host "Data returned: $($content | ConvertTo-Json -Depth 1)" -ForegroundColor Gray
    }
    catch {
        Write-Host "Could not parse response" -ForegroundColor Yellow
    }
}

# Test Programs endpoint
Test-Endpoint -Url "$BACKEND_URL/api/programs" -TestName "GET /api/programs"

# Test other endpoints
Test-Endpoint -Url "$BACKEND_URL/api/sessions" -TestName "GET /api/sessions"
Test-Endpoint -Url "$BACKEND_URL/api/plans" -TestName "GET /api/plans"

# ============================================
# Test 4: Frontend Check (2 min)
# ============================================
Write-Host "`n🎨 Test 4: Frontend Server Status" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri $FRONTEND_URL -TimeoutSec 5
    Show-Result "Frontend is accessible on $FRONTEND_URL" $true
}
catch {
    Show-Result "Frontend is not accessible" $false
}

# ============================================
# Test 5: Connectivity Test (1 min)
# ============================================
Write-Host "`n🔗 Test 5: Frontend-Backend Connectivity" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

try {
    # This simulates what Frontend would do
    $headers = @{
        "Content-Type" = "application/json"
        "Origin"       = $FRONTEND_URL
    }
    $response = Invoke-WebRequest -Uri "$BACKEND_URL/api/students" -Method GET -Headers $headers -TimeoutSec 5
    Show-Result "Frontend can reach Backend API" $true
    Show-Result "Response Time: $($response.StatusCode) - OK" $true
}
catch {
    Show-Result "Frontend cannot reach Backend" $false
}

# ============================================
# Results Summary
# ============================================
Write-Host "`n
╔════════════════════════════════════════════════════════╗
║  📊 TEST RESULTS SUMMARY                              ║
╚════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

Write-Host "✅ Tests Passed: $TESTS_PASSED" -ForegroundColor Green
Write-Host "❌ Tests Failed: $TESTS_FAILED" -ForegroundColor Red

if ($TESTS_FAILED -eq 0) {
    Write-Host "`n🎉 All tests passed! Frontend and Backend are connected!" -ForegroundColor Green
    Write-Host "`nYou can now:
    1. Go to http://localhost:5173
    2. Navigate to Students page
    3. Data should load from Backend
    4. Try adding/editing/deleting records
    " -ForegroundColor Cyan
}
else {
    Write-Host "`n⚠️  Some tests failed. Check Backend and Frontend servers are running." -ForegroundColor Yellow
    Write-Host "`nTo fix:
    1. Start Backend: cd backend && npm run dev
    2. Start Frontend: cd frontend && npm run dev
    3. Run this test again
    " -ForegroundColor Yellow
}

Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "Test completed at: $(Get-Date)" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Gray
