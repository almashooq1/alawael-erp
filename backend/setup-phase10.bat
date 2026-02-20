@echo off
REM Phase 10 Setup and Testing Script for Windows
REM This script sets up all optimization features and runs tests

setlocal enabledelayedexpansion

echo.
echo ════════════════════════════════════════════
echo    Phase 10: Optimization ^& Advanced Features
echo ════════════════════════════════════════════
echo.

REM 1. Check if in backend directory
if not exist "package.json" (
    echo ❌ Error: package.json not found
    echo Please run this script from the backend directory
    exit /b 1
)

REM 2. Install dependencies
echo 📦 Installing dependencies...
call npm install redis compression helmet

if errorlevel 1 (
    echo ❌ npm install failed
    exit /b 1
)

echo ✅ Dependencies installed
echo.

REM 3. Check if backend server is running
echo 🔍 Checking backend server...

timeout /t 1 /nobreak > nul

for /f "tokens=*" %%i in ('powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3005/health' -UseBasicParsing -ErrorAction Stop; Write-Host 'OK' } catch { Write-Host 'FAIL' }"') do set CHECK=%%i

if "!CHECK!"=="OK" (
    echo ✅ Backend server is running
) else (
    echo ⚠️  Backend server not running
    echo    Start with: npm run dev
)

echo.

REM 4. Show available commands
echo ════════════════════════════════════════════
echo Available Commands:
echo ════════════════════════════════════════════
echo.

echo Development:
echo   npm run dev        - Start with hot reload
echo   npm start          - Start production
echo.

echo Testing:
echo   npm run test       - Run Jest tests
echo   npm run test:api   - Run API tests
echo   npm run test:system - Run system tests (Phase 10)
echo.

echo Code Quality:
echo   npm run lint       - Run ESLint
echo   npm run format     - Format code with Prettier
echo.

echo Database:
echo   npm run seed       - Seed database
echo.

REM 5. Ask to run tests
echo ════════════════════════════════════════════
echo.

set /p RUN_TESTS="Do you want to run system tests now? (y/n): "

if /i "!RUN_TESTS!"=="y" (
    echo.
    echo 🧪 Running Phase 10 system tests...
    echo.
    call npm run test:system
) else (
    echo.
    echo ✅ Setup complete!
    echo To run system tests later: npm run test:system
)

echo.
echo ════════════════════════════════════════════
echo ✅ Phase 10 Setup Complete!
echo ════════════════════════════════════════════
echo.

pause
