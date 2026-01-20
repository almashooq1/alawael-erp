@echo off
:: 🚀 ERP System - Quick Start Script for Windows
:: نظام ERP - سكريبت التشغيل السريع

echo ================================================
echo    🚀 نظام ERP - بدء التشغيل
echo    ERP System - Quick Start
echo ================================================
echo.

:: Check Node.js
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org
    pause
    exit /b 1
)

:: Get Node version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%
echo.

:: Install backend dependencies
echo 📦 Installing Backend dependencies...
cd backend
if not exist "node_modules\" (
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install backend dependencies
        cd ..
        pause
        exit /b 1
    )
)
echo Backend dependencies ready
cd ..
echo.

:: Install frontend dependencies
echo 📦 Installing Frontend dependencies...
cd frontend
if not exist "node_modules\" (
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install frontend dependencies
        cd ..
        pause
        exit /b 1
    )
)
echo Frontend dependencies ready
cd ..
echo.

:: Create .env files
if not exist "backend\.env" (
    echo 📝 Creating backend .env file...
    (
        echo PORT=3005
        echo NODE_ENV=development
        echo DATABASE_URL=mongodb://localhost:27017/erp_new
        echo JWT_SECRET=dev_secret_key_123456789
        echo CORS_ORIGIN=http://localhost:3000
    ) > backend\.env
    echo Backend .env created
    echo.
)

if not exist "frontend\.env" (
    echo 📝 Creating frontend .env file...
    echo REACT_APP_API_URL=http://localhost:3005/api > frontend\.env
    echo Frontend .env created
    echo.
)

:: Start backend
echo 🚀 Starting Backend Server (Port 3005)...
start "ERP Backend" cmd /k "cd backend && npm run dev"
echo Backend Server started
echo URL: http://localhost:3005
echo.

:: Wait for backend
echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

:: Start frontend
echo 🚀 Starting Frontend Server (Port 3000)...
start "ERP Frontend" cmd /k "cd frontend && npm start"
echo Frontend Server started
echo URL: http://localhost:3000
echo.

:: Wait for frontend
echo Waiting for services to start...
timeout /t 10 /nobreak >nul

echo.
echo ================================================
echo    ✅ النظام جاهز للاستخدام!
echo    System Ready!
echo ================================================
echo.
echo 🌐 Links:
echo    Frontend:  http://localhost:3000
echo    Backend:   http://localhost:3005
echo    Health:    http://localhost:3005/health
echo.
echo 📊 Available Systems:
echo    - AI Predictions (5 algorithms)
echo    - Reports System (4 export formats)
echo    - Notifications (Multi-channel)
echo.
echo 🔧 To stop: Close the backend/frontend windows
echo.

:: Open browser
echo 🌐 Opening browser...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo ✅ Done! System is running...
echo Press any key to exit this script (servers will continue)
pause >nul
