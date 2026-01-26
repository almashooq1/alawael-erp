@echo off
REM ========================================
REM   Phase 12 - Complete System Startup
REM   Backend + Frontend Together
REM ========================================

echo.
echo ========================================
echo   Starting Phase 12 ERP System
echo ========================================
echo.

REM Check directories
if not exist "backend" (
    echo [ERROR] Backend directory not found!
    echo Make sure you're in the project root
    pause
    exit /b 1
)

if not exist "frontend" (
    echo [ERROR] Frontend directory not found!
    echo Make sure you're in the project root
    pause
    exit /b 1
)

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found! Please install Node.js first.
    pause
    exit /b 1
)

echo [INFO] Checking dependencies...
echo.

REM Install backend dependencies if needed
if not exist "backend\node_modules" (
    echo [INFO] Installing backend dependencies...
    cd backend
    call npm install
    cd ..
    echo.
)

REM Install frontend dependencies if needed
if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo.
)

echo ========================================
echo   All Dependencies Ready
echo ========================================
echo.

REM Start backend server
echo [INFO] Starting Backend Server (Port 3001)...
start "ERP Backend" cmd /k "cd backend && npm start"

REM Wait for backend to initialize
timeout /t 5 /nobreak >nul

REM Start frontend server
echo [INFO] Starting Frontend Server (Port 3000)...
start "ERP Frontend" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo   System Started Successfully!
echo ========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Two new windows have been opened:
echo   1. Backend Server
echo   2. Frontend Server
echo.
echo Your browser should open automatically to:
echo   http://localhost:3000
echo.
echo To stop servers: Close both terminal windows
echo.
echo ========================================
echo.
pause
