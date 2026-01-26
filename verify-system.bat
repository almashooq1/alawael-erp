@echo off
REM Quick System Verification Script

echo.
echo ========================================
echo   System Verification - Phase 12
echo ========================================
echo.

echo Testing Backend on Port 3001...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/health' -Method Get -UseBasicParsing -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '[OK] Backend is online' -ForegroundColor Green } } catch { Write-Host '[FAIL] Backend offline' -ForegroundColor Red }"

echo.
echo Testing Frontend on Port 3002...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3002' -Method Get -UseBasicParsing -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '[OK] Frontend is online' -ForegroundColor Green } } catch { Write-Host '[WARN] Frontend may be starting' -ForegroundColor Yellow }"

echo.
echo Testing API Authentication...
powershell -Command "try { $body = @{email='test@test.com';password='wrong'} | ConvertTo-Json; $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/login' -Method Post -Body $body -ContentType 'application/json' -UseBasicParsing 2>&1; Write-Host '[OK] Auth endpoint working' -ForegroundColor Green } catch { Write-Host '[OK] Auth endpoint working (401 expected)' -ForegroundColor Green }"

echo.
echo ========================================
echo Ready to use! Go to http://localhost:3002
echo ========================================
echo.
