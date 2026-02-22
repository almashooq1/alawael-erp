@echo off
REM ============================================
REM QUICK SYSTEM STATUS CHECK
REM تحقق سريع من حالة النظام
REM ============================================

cls
echo.
echo ╔════════════════════════════════════════╗
echo ║  ✅ SYSTEM STATUS CHECK - فحص النظام  ║
echo ╚════════════════════════════════════════╝
echo.

REM Get current time
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
echo ⏰ Current Time / الوقت الحالي: %mycdate% %mytime%
echo.

REM 1. Check PowerShell Execution Policy
echo ┌─ Checking PowerShell Configuration...
powershell -Command "if ((Get-ExecutionPolicy) -eq 'RemoteSigned') { Write-Host '✅ PowerShell: RemoteSigned (OK)' -ForegroundColor Green } else { Write-Host '⚠️  PowerShell: ' + (Get-ExecutionPolicy) -ForegroundColor Yellow }"
echo.

REM 2. Check npm
echo ┌─ Checking npm...
npm --version >nul 2>&1
if %ERRORLEVEL% == 0 (
    for /f %%i in ('npm --version') do set npmver=%%i
    echo ✅ npm: %npmver% ^(Found^)
) else (
    echo ❌ npm: NOT FOUND
)
echo.

REM 3. Check Node
echo ┌─ Checking Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% == 0 (
    for /f %%i in ('node --version') do set nodever=%%i
    echo ✅ Node.js: %nodever% ^(Found^)
) else (
    echo ❌ Node.js: NOT FOUND
)
echo.

REM 4. Check project directories
echo ┌─ Checking Project Directories...
if exist "erp_new_system\backend" (
    echo ✅ Backend Directory: Found
) else (
    echo ❌ Backend Directory: NOT FOUND
)

if exist "erp_new_system\frontend" (
    echo ✅ Frontend Directory: Found
) else (
    echo ❌ Frontend Directory: NOT FOUND
)
echo.

REM 5. Check node_modules
echo ┌─ Checking Dependencies...
if exist "node_modules" (
    echo ✅ Root node_modules: Installed
) else (
    echo ⚠️  Root node_modules: Missing
)

if exist "erp_new_system\backend\node_modules" (
    echo ✅ Backend node_modules: Installed
) else (
    echo ⚠️  Backend node_modules: Missing
)

if exist "erp_new_system\frontend\node_modules" (
    echo ✅ Frontend node_modules: Installed
) else (
    echo ⚠️  Frontend node_modules: Missing
)
echo.

REM 6. Check package.json files
echo ┌─ Checking Configuration Files...
if exist "package.json" (
    echo ✅ package.json ^(root^): Found
) else (
    echo ❌ package.json ^(root^): NOT FOUND
)

if exist ".env" (
    echo ✅ .env ^(root^): Found
) else (
    echo ⚠️  .env ^(root^): Not found
)

if exist "erp_new_system\backend\package.json" (
    echo ✅ package.json ^(backend^): Found
) else (
    echo ❌ package.json ^(backend^): NOT FOUND
)

if exist "erp_new_system\backend\.env" (
    echo ✅ .env ^(backend^): Found
) else (
    echo ⚠️  .env ^(backend^): Not found
)
echo.

REM 7. Summary
echo ╔════════════════════════════════════════╗
echo ║  📊 SUMMARY / الملخص                  ║
echo ╚════════════════════════════════════════╝
echo.
echo ✅ Ready to run:
echo   - npm start             (Start Backend)
echo   - npm start:frontend    (Start Frontend)
echo   - npm test              (Run Tests)
echo   - npm audit             (Security Check)
echo.
echo 📚 For more details:
echo   - node live-monitoring.js  (Full Dashboard)
echo.
echo 📖 Read documentation:
echo   - QUICK_STATUS.md           (2 min read)
echo   - QUICK_REFERENCE.md        (Command reference)
echo   - VSCODE_FIX_COMPLETE_REPORT.md (Troubleshooting)
echo.

REM Check monitoring dashboard
if exist "live-monitoring.js" (
    echo 🚀 Live Monitoring Dashboard: Available
    echo    Run: node live-monitoring.js
) else (
    echo ⚠️  Live Monitoring Dashboard: Not found
)
echo.

echo ╔════════════════════════════════════════╗
echo ║  🎯 NEXT STEPS / الخطوات التالية     ║
echo ╚════════════════════════════════════════╝
echo.
echo 1️⃣  Check documentation:
echo    Start with QUICK_STATUS.md
echo.
echo 2️⃣  Run live monitoring:
echo    node live-monitoring.js
echo.
echo 3️⃣  Start development:
echo    npm start
echo.
echo 4️⃣  Enjoy! أستمتع بالعمل! 🎉
echo.

pause
