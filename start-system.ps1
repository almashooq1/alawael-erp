# Clean System Startup Script
# مسح وتشغيل النظام بالكامل

Write-Host "`n" -ForegroundColor Cyan
Write-Host "====== SYSTEM STARTUP - بدء النظام ======" -ForegroundColor Yellow
Write-Host ""

# Step 1: Kill old processes
Write-Host "1️⃣  Cleaning up old processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 3
Write-Host "   ✓ Cleanup complete`n" -ForegroundColor Green

# Step 2: Start Backend
Write-Host "2️⃣  Starting Backend on Port 3001..." -ForegroundColor Yellow
$backendPath = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\erp_new_system\backend"
Push-Location $backendPath
Start-Process npm -ArgumentList "start" -NoNewWindow
Pop-Location
Start-Sleep 8
Write-Host "   ✓ Backend started`n" -ForegroundColor Green

# Step 3: Test Backend Health
Write-Host "3️⃣  Testing Backend Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/health' -UseBasicParsing -TimeoutSec 3
    $json = $response.Content | ConvertFrom-Json
    Write-Host "   ✓ Backend: ONLINE (Port 3001)" -ForegroundColor Green
    Write-Host "     Status: $($json.status)" -ForegroundColor White
}
catch {
    Write-Host "   ✗ Backend: NOT RESPONDING" -ForegroundColor Red
}
Write-Host ""

# Step 4: Start Frontend
Write-Host "4️⃣  Starting Frontend on Port 3002..." -ForegroundColor Yellow
$frontendPath = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\erp_new_system\frontend"
Push-Location $frontendPath
if (!(Test-Path "build")) {
    Write-Host "   ⚠️  Build folder not found. Building frontend..." -ForegroundColor Yellow
    npm run build | Out-Null
    Start-Sleep 5
}
Start-Process "serve" -ArgumentList "-s build -l 3002" -NoNewWindow
Pop-Location
Start-Sleep 5
Write-Host "   ✓ Frontend started`n" -ForegroundColor Green

# Step 5: Test Frontend
Write-Host "5️⃣  Testing Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri 'http://localhost:3002' -UseBasicParsing -TimeoutSec 3
    Write-Host "   ✓ Frontend: ONLINE (Port 3002)" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  Frontend: Still loading..." -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Test Auth Login
Write-Host "6️⃣  Testing Auth - Login..." -ForegroundColor Yellow
try {
    $body = @{ email = 'admin@alawael.com'; password = 'Admin@123456' } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/login' -Method Post -Body $body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 3
    $json = $response.Content | ConvertFrom-Json
    if ($json.success -and $json.accessToken) {
        Write-Host "   ✓ Login: SUCCESS" -ForegroundColor Green
        Write-Host "     Token: $($json.accessToken.Substring(0, 20))..." -ForegroundColor White
        Write-Host "     User: $($json.user.email)" -ForegroundColor White
        $token = $json.accessToken
    }
    else {
        Write-Host "   ✗ Login: FAILED" -ForegroundColor Red
    }
}
catch {
    Write-Host "   ✗ Login Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Step 7: Test Auth Verify Token (if we have a token)
if ($token) {
    Write-Host "7️⃣  Testing Auth - Verify Token..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/verify-token' -Method Post -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -TimeoutSec 3
        $json = $response.Content | ConvertFrom-Json
        if ($json.success) {
            Write-Host "   ✓ Token Verification: SUCCESS" -ForegroundColor Green
            Write-Host "     Status: $($json.data.tokenValid)" -ForegroundColor White
        }
        else {
            Write-Host "   ✗ Token Verification: FAILED" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "   ✗ Verification Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""

    # Step 8: Test Auth Get Me
    Write-Host "8️⃣  Testing Auth - Get User Info..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/me' -Method Get -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -TimeoutSec 3
        $json = $response.Content | ConvertFrom-Json
        if ($json.success) {
            Write-Host "   ✓ User Info: SUCCESS" -ForegroundColor Green
            Write-Host "     Email: $($json.user.email)" -ForegroundColor White
            Write-Host "     Role: $($json.user.role)" -ForegroundColor White
        }
        else {
            Write-Host "   ✗ User Info: FAILED" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "   ✗ User Info Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""

    # Step 9: Test Auth Logout
    Write-Host "9️⃣  Testing Auth - Logout..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/logout' -Method Post -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -TimeoutSec 3
        $json = $response.Content | ConvertFrom-Json
        if ($json.success) {
            Write-Host "   ✓ Logout: SUCCESS" -ForegroundColor Green
        }
        else {
            Write-Host "   ✗ Logout: FAILED" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "   ✗ Logout Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Step 10: Final Summary
Write-Host "🎉 ====== SYSTEM READY ======" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend:  http://localhost:3002" -ForegroundColor Cyan
Write-Host "Backend:   http://localhost:3001/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login:" -ForegroundColor Yellow
Write-Host "  Email:    admin@alawael.com" -ForegroundColor White
Write-Host "  Password: Admin@123456" -ForegroundColor White
Write-Host ""
Write-Host "====== النظام جاهز! ======`n" -ForegroundColor Green
