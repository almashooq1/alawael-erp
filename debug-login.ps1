Write-Host "Testing Login Response..." -ForegroundColor Green

$loginBody = @{
    email = "admin@alawael.com"
    password = "Admin@123456"
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing

Write-Host "Status Code: $($loginResponse.StatusCode)" -ForegroundColor Yellow
Write-Host "Raw Response:" -ForegroundColor Yellow
Write-Host $loginResponse.Content
Write-Host ""

$loginData = $loginResponse.Content | ConvertFrom-Json
Write-Host "Parsed JSON:" -ForegroundColor Yellow
$loginData | ConvertTo-Json
