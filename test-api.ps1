# Test API Script
Write-Host "=== Testing Alawael ERP API ===" -ForegroundColor Green
Write-Host ""

# Test 1: Health Check
Write-Host "1. Health Check:" -ForegroundColor Yellow
$health = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
$health.Content | ConvertFrom-Json | Format-Table

# Test 2: Login
Write-Host "2. Login Test:" -ForegroundColor Yellow
$loginBody = @{
    email    = "admin@alawael.com"
    password = "Admin@123456"
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$loginData = $loginResponse.Content | ConvertFrom-Json

Write-Host "Status: Success" -ForegroundColor Green
Write-Host "User: $($loginData.user.email)" -ForegroundColor Green
Write-Host "Token: $($loginData.accessToken.Substring(0, 20))..." -ForegroundColor Green
Write-Host ""

# Store token
$token = $loginData.accessToken

# Test 3: Get Employees
Write-Host "3. Get Employees:" -ForegroundColor Yellow
$empResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/employees" -Method GET -Headers @{"Authorization" = "Bearer $token" } -UseBasicParsing
$employees = $empResponse.Content | ConvertFrom-Json
Write-Host "Total Employees: $($employees.data.Count)" -ForegroundColor Green
if ($employees.data.Count -gt 0) {
    $employees.data[0] | Format-Table
}
Write-Host ""

# Test 4: Get Reports Dashboard
Write-Host "4. Get Reports Dashboard:" -ForegroundColor Yellow
$reportResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/reports/dashboard" -Method GET -Headers @{"Authorization" = "Bearer $token" } -UseBasicParsing
$report = $reportResponse.Content | ConvertFrom-Json
$report | Format-Table

Write-Host ""
Write-Host "=== All Tests Completed ===" -ForegroundColor Green
