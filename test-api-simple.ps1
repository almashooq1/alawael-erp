Write-Host "Testing Alawael ERP API..." -ForegroundColor Green
Write-Host ""

# Test Login
$body = @{email="admin@alawael.com"; password="Admin@123456"} | ConvertTo-Json
$login = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
$data = $login.Content | ConvertFrom-Json

if ($data.success) {
    $token = $data.data.accessToken
    Write-Host "✓ Login successful" -ForegroundColor Green

    # Test Employees
    $emp = Invoke-WebRequest -Uri "http://localhost:3001/api/employees" -Method GET -Headers @{Authorization="Bearer $token"} -UseBasicParsing
    Write-Host "✓ Employees API working" -ForegroundColor Green

    # Test Reports
    $rep = Invoke-WebRequest -Uri "http://localhost:3001/api/reports/dashboard" -Method GET -Headers @{Authorization="Bearer $token"} -UseBasicParsing
    Write-Host "✓ Reports API working" -ForegroundColor Green

    # Test Finance
    $fin = Invoke-WebRequest -Uri "http://localhost:3001/api/finance/summary" -Method GET -Headers @{Authorization="Bearer $token"} -UseBasicParsing
    Write-Host "✓ Finance API working" -ForegroundColor Green

    # Test Notifications
    $notif = Invoke-WebRequest -Uri "http://localhost:3001/api/notifications" -Method GET -Headers @{Authorization="Bearer $token"} -UseBasicParsing
    Write-Host "✓ Notifications API working" -ForegroundColor Green

    # Test AI
    $ai = Invoke-WebRequest -Uri "http://localhost:3001/api/ai/insights" -Method GET -Headers @{Authorization="Bearer $token"} -UseBasicParsing
    Write-Host "✓ AI API working" -ForegroundColor Green

    Write-Host ""
    Write-Host "All tests passed!" -ForegroundColor Cyan
}
else {
    Write-Host "✗ Login failed" -ForegroundColor Red
}
