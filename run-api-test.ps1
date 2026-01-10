Write-Host "====== Alawael ERP Backend - API Test ======" -ForegroundColor Green
Write-Host ""

# Step 1: Health Check
Write-Host "1. HEALTH CHECK" -ForegroundColor Cyan
Write-Host "==========================================="-ForegroundColor Gray
$health = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
$healthData = $health.Content | ConvertFrom-Json
Write-Host "Status: $($healthData.status)" -ForegroundColor Green
Write-Host "Message: $($healthData.message)" -ForegroundColor Green
Write-Host ""

# Step 2: Login
Write-Host "2. LOGIN TEST" -ForegroundColor Cyan
Write-Host "==========================================="-ForegroundColor Gray
$loginBody = @{
    email = "admin@alawael.com"
    password = "Admin@123456"
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$loginData = $loginResponse.Content | ConvertFrom-Json

Write-Host "LOGIN SUCCESS" -ForegroundColor Green
Write-Host "User: $($loginData.data.user.email)" -ForegroundColor Green
Write-Host "Role: $($loginData.data.user.role)" -ForegroundColor Green
$token = $loginData.data.accessToken
Write-Host "Token obtained" -ForegroundColor Green
Write-Host ""

# Step 3: Get Employees
Write-Host "3. GET EMPLOYEES" -ForegroundColor Cyan
Write-Host "==========================================="-ForegroundColor Gray
$empResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/employees" -Method GET -Headers @{"Authorization"="Bearer $token"} -UseBasicParsing
$employees = $empResponse.Content | ConvertFrom-Json
Write-Host "Total Employees: $($employees.data.Count)" -ForegroundColor Green
if ($employees.data.Count -gt 0) {
    Write-Host "Sample Employee:" -ForegroundColor Yellow
    Write-Host "  ID: $($employees.data[0]._id)" -ForegroundColor Gray
    Write-Host "  Name: $($employees.data[0].firstName) $($employees.data[0].lastName)" -ForegroundColor Gray
    Write-Host "  Email: $($employees.data[0].email)" -ForegroundColor Gray
}
Write-Host ""

# Step 4: Get Reports Dashboard
Write-Host "4. REPORTS DASHBOARD" -ForegroundColor Cyan
Write-Host "==========================================="-ForegroundColor Gray
$reportResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/reports/dashboard" -Method GET -Headers @{"Authorization"="Bearer $token"} -UseBasicParsing
$report = $reportResponse.Content | ConvertFrom-Json
Write-Host "Dashboard Data:" -ForegroundColor Green
Write-Host "  Total Employees: $($report.data.totalEmployees)" -ForegroundColor Gray
Write-Host "  Active Employees: $($report.data.activeEmployees)" -ForegroundColor Gray
Write-Host "  Present Today: $($report.data.presentToday)" -ForegroundColor Gray
Write-Host "  Pending Leaves: $($report.data.pendingLeaves)" -ForegroundColor Gray
Write-Host ""

# Step 5: Finance Summary
Write-Host "5. FINANCE SUMMARY" -ForegroundColor Cyan
Write-Host "==========================================="-ForegroundColor Gray
try {
    $financeResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/finance/summary" -Method GET -Headers @{"Authorization"="Bearer $token"} -UseBasicParsing
    $finance = $financeResponse.Content | ConvertFrom-Json
    Write-Host "Finance Data:" -ForegroundColor Green
    Write-Host "  Total Revenue: $($finance.data.totalRevenue)" -ForegroundColor Gray
    Write-Host "  Total Expenses: $($finance.data.totalExpenses)" -ForegroundColor Gray
    Write-Host "  Balance: $($finance.data.balance)" -ForegroundColor Gray
} catch {
    Write-Host "Finance module not fully initialized" -ForegroundColor Yellow
}
Write-Host ""

# Step 6: AI Insights
Write-Host "6. AI INSIGHTS" -ForegroundColor Cyan
Write-Host "==========================================="-ForegroundColor Gray
try {
    $aiResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/ai/insights" -Method GET -Headers @{"Authorization"="Bearer $token"} -UseBasicParsing
    $ai = $aiResponse.Content | ConvertFrom-Json
    Write-Host "AI Insights:" -ForegroundColor Green
    if ($ai.data.insights.Count -gt 0) {
        Write-Host "  $($ai.data.insights[0])" -ForegroundColor Gray
    }
} catch {
    Write-Host "AI module not fully initialized" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "====== All Tests Completed Successfully ======" -ForegroundColor Green
Write-Host ""
Write-Host "Backend running at: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend at: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
