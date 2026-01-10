# Test All APIs - Comprehensive Test Suite
Write-Host "`n" -NoNewline
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   AlAwael ERP - API Test Suite" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Login
Write-Host "[1/7] Testing Login..." -ForegroundColor White
try {
    $loginData = @{
        email    = "admin@alawael.com"
        password = "Admin@123456"
    } | ConvertTo-Json

    $login = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body $loginData
    $token = $login.data.accessToken
    $headers = @{Authorization = "Bearer $token" }
    Write-Host "      SUCCESS - Token received" -ForegroundColor Green
}
catch {
    Write-Host "      FAILED - Cannot connect to server" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start the server first:" -ForegroundColor Yellow
    Write-Host "  cd backend" -ForegroundColor Gray
    Write-Host "  .\RUN_SERVER.bat" -ForegroundColor Gray
    Write-Host ""
    exit
}

# Test APIs
$tests = @(
    @{Name = "[2/7] Employees API"; Url = "http://localhost:3001/api/employees" },
    @{Name = "[3/7] Users API"; Url = "http://localhost:3001/api/users" },
    @{Name = "[4/7] Reports API"; Url = "http://localhost:3001/api/reports/dashboard" },
    @{Name = "[5/7] Finance API"; Url = "http://localhost:3001/api/finance/summary" },
    @{Name = "[6/7] Notifications API"; Url = "http://localhost:3001/api/notifications" },
    @{Name = "[7/7] AI API"; Url = "http://localhost:3001/api/ai/insights" }
)

$passed = 1
foreach ($test in $tests) {
    Write-Host "$($test.Name)..." -ForegroundColor White
    try {
        $result = Invoke-RestMethod -Uri $test.Url -Headers $headers -TimeoutSec 5
        Write-Host "      SUCCESS" -ForegroundColor Green
        $passed++
    }
    catch {
        Write-Host "      FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Results: $passed/7 tests passed" -ForegroundColor $(if ($passed -eq 7) { "Green" }else { "Yellow" })
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($passed -eq 7) {
    Write-Host "All systems operational!" -ForegroundColor Green
    Write-Host "You can now start the frontend." -ForegroundColor Cyan
}
else {
    Write-Host "Some services need attention." -ForegroundColor Yellow
}
Write-Host ""
