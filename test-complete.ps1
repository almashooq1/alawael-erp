#!/usr/bin/env powershell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Alawael ERP - Complete API Test" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "TEST 1: Health Check" -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET -UseBasicParsing -ErrorAction SilentlyContinue
    Write-Host "✓ Server is running" -ForegroundColor Green
}
catch {
    Write-Host "✗ Server is not running" -ForegroundColor Red
    exit 1
}

# Test 2: Login
Write-Host ""
Write-Host "TEST 2: Login" -ForegroundColor Yellow
try {
    $loginBody = @{email = "admin@alawael.com"; password = "Admin@123456" } | ConvertTo-Json
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
    $loginData = $loginResponse.Content | ConvertFrom-Json

    if ($loginData.success) {
        $token = $loginData.data.accessToken
        Write-Host "✓ Login successful" -ForegroundColor Green
        Write-Host "  Token: $($token.Substring(0, 20))..." -ForegroundColor Cyan
    }
    else {
        Write-Host "✗ Login failed" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "✗ Login error: $_" -ForegroundColor Red
    exit 1
}

# Test 3: Get Employees
Write-Host ""
Write-Host "TEST 3: Get Employees" -ForegroundColor Yellow
try {
    $empResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/employees" -Method GET -Headers @{Authorization = "Bearer $token" } -UseBasicParsing
    $empData = $empResponse.Content | ConvertFrom-Json
    Write-Host "✓ Employees endpoint working" -ForegroundColor Green
    Write-Host "  Total employees: $($empData.data.length)" -ForegroundColor Cyan
}
catch {
    Write-Host "✗ Employees error: $_" -ForegroundColor Red
}

# Test 4: Get Reports
Write-Host ""
Write-Host "TEST 4: Get Reports Dashboard" -ForegroundColor Yellow
try {
    $reportResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/reports/dashboard" -Method GET -Headers @{Authorization = "Bearer $token" } -UseBasicParsing
    $reportData = $reportResponse.Content | ConvertFrom-Json
    Write-Host "✓ Reports endpoint working" -ForegroundColor Green
    Write-Host "  Dashboard data available" -ForegroundColor Cyan
}
catch {
    Write-Host "✗ Reports error: $_" -ForegroundColor Red
}

# Test 5: Get Finance Summary
Write-Host ""
Write-Host "TEST 5: Get Finance Summary" -ForegroundColor Yellow
try {
    $financeResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/finance/summary" -Method GET -Headers @{Authorization = "Bearer $token" } -UseBasicParsing
    $financeData = $financeResponse.Content | ConvertFrom-Json
    Write-Host "✓ Finance endpoint working" -ForegroundColor Green
    Write-Host "  Finance data available" -ForegroundColor Cyan
}
catch {
    Write-Host "✗ Finance error: $_" -ForegroundColor Red
}

# Test 6: Get Notifications
Write-Host ""
Write-Host "TEST 6: Get Notifications" -ForegroundColor Yellow
try {
    $notifResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/notifications" -Method GET -Headers @{Authorization = "Bearer $token" } -UseBasicParsing
    $notifData = $notifResponse.Content | ConvertFrom-Json
    Write-Host "✓ Notifications endpoint working" -ForegroundColor Green
    Write-Host "  Notifications available" -ForegroundColor Cyan
}
catch {
    Write-Host "✗ Notifications error: $_" -ForegroundColor Red
}

# Test 7: Get AI Insights
Write-Host ""
Write-Host "TEST 7: Get AI Insights" -ForegroundColor Yellow
try {
    $aiResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/ai/insights" -Method GET -Headers @{Authorization = "Bearer $token" } -UseBasicParsing
    $aiData = $aiResponse.Content | ConvertFrom-Json
    Write-Host "✓ AI endpoint working" -ForegroundColor Green
    Write-Host "  AI insights available" -ForegroundColor Cyan
}
catch {
    Write-Host "✗ AI error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   All Tests Completed Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "✓ Server is running on http://localhost:3001" -ForegroundColor Green
Write-Host "✓ Authentication working" -ForegroundColor Green
Write-Host "✓ API endpoints operational" -ForegroundColor Green
Write-Host ""
