Write-Host "`n" -ForegroundColor Cyan
Write-Host "====== SYSTEM STARTUP ======" -ForegroundColor Yellow
Write-Host ""

# Step 1: Kill old processes
Write-Host "1. Cleaning up old processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 3
Write-Host "   OK - Cleanup complete`n" -ForegroundColor Green

# Step 2: Start Backend
Write-Host "2. Starting Backend on Port 3001..." -ForegroundColor Yellow
$backendPath = "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\erp_new_system\backend"
cd $backendPath
Start-Process npm -ArgumentList "start" -NoNewWindow
Start-Sleep 8
Write-Host "   OK - Backend started`n" -ForegroundColor Green

# Step 3: Test Backend Health
Write-Host "3. Testing Backend Health..." -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/health' -UseBasicParsing -TimeoutSec 3
  $json = $response.Content | ConvertFrom-Json
  Write-Host "   OK - Backend: ONLINE (Port 3001)" -ForegroundColor Green
  Write-Host "      Status: $($json.status)" -ForegroundColor White
} catch {
  Write-Host "   ERROR - Backend: NOT RESPONDING" -ForegroundColor Red
}
Write-Host ""

# Step 4: Start Frontend
Write-Host "4. Starting Frontend on Port 3002..." -ForegroundColor Yellow
$frontendPath = "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\erp_new_system\frontend"
cd $frontendPath
if (!(Test-Path "build")) {
  Write-Host "      Warning - Build folder not found. Building..." -ForegroundColor Yellow
  npm run build | Out-Null
  Start-Sleep 5
}
Start-Process "serve" -ArgumentList "-s build -l 3002" -NoNewWindow
Start-Sleep 5
Write-Host "   OK - Frontend started`n" -ForegroundColor Green

# Step 5: Test Frontend
Write-Host "5. Testing Frontend..." -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest -Uri 'http://localhost:3002' -UseBasicParsing -TimeoutSec 3
  Write-Host "   OK - Frontend: ONLINE (Port 3002)" -ForegroundColor Green
} catch {
  Write-Host "   WARNING - Frontend: Still loading..." -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Test Auth Login
Write-Host "6. Testing Auth - Login..." -ForegroundColor Yellow
try {
  $body = @{ email = 'admin@alawael.com'; password = 'Admin@123456' } | ConvertTo-Json
  $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/login' -Method Post -Body $body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 3
  $json = $response.Content | ConvertFrom-Json
  if ($json.success -and $json.accessToken) {
    Write-Host "   OK - Login: SUCCESS" -ForegroundColor Green
    Write-Host "      Token: $($json.accessToken.Substring(0, 20))..." -ForegroundColor White
    Write-Host "      User: $($json.user.email)" -ForegroundColor White
    $token = $json.accessToken
  } else {
    Write-Host "   ERROR - Login: FAILED" -ForegroundColor Red
  }
} catch {
  Write-Host "   ERROR - Login: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Step 7: Test Auth Verify Token
if ($token) {
  Write-Host "7. Testing Auth - Verify Token..." -ForegroundColor Yellow
  try {
    $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/verify-token' -Method Post -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -TimeoutSec 3
    $json = $response.Content | ConvertFrom-Json
    if ($json.success) {
      Write-Host "   OK - Token Verification: SUCCESS" -ForegroundColor Green
      Write-Host "      Valid: $($json.data.tokenValid)" -ForegroundColor White
    } else {
      Write-Host "   ERROR - Token Verification: FAILED" -ForegroundColor Red
    }
  } catch {
    Write-Host "   ERROR - Verification: $($_.Exception.Message)" -ForegroundColor Red
  }
  Write-Host ""

  # Step 8: Test Auth Get Me
  Write-Host "8. Testing Auth - Get User Info..." -ForegroundColor Yellow
  try {
    $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/me' -Method Get -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -TimeoutSec 3
    $json = $response.Content | ConvertFrom-Json
    if ($json.success) {
      Write-Host "   OK - User Info: SUCCESS" -ForegroundColor Green
      Write-Host "      Email: $($json.user.email)" -ForegroundColor White
      Write-Host "      Role: $($json.user.role)" -ForegroundColor White
    } else {
      Write-Host "   ERROR - User Info: FAILED" -ForegroundColor Red
    }
  } catch {
    Write-Host "   ERROR - User Info: $($_.Exception.Message)" -ForegroundColor Red
  }
  Write-Host ""

  # Step 9: Test Auth Logout
  Write-Host "9. Testing Auth - Logout..." -ForegroundColor Yellow
  try {
    $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/logout' -Method Post -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -TimeoutSec 3
    $json = $response.Content | ConvertFrom-Json
    if ($json.success) {
      Write-Host "   OK - Logout: SUCCESS" -ForegroundColor Green
    } else {
      Write-Host "   ERROR - Logout: FAILED" -ForegroundColor Red
    }
  } catch {
    Write-Host "   ERROR - Logout: $($_.Exception.Message)" -ForegroundColor Red
  }
  Write-Host ""
}

# Final Summary
Write-Host "====== SYSTEM READY ======" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend:  http://localhost:3002" -ForegroundColor Cyan
Write-Host "Backend:   http://localhost:3001/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login:" -ForegroundColor Yellow
Write-Host "  Email:    admin@alawael.com" -ForegroundColor White
Write-Host "  Password: Admin@123456" -ForegroundColor White
Write-Host ""
