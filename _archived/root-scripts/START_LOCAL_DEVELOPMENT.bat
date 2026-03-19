@echo off
REM Windows PowerShell Script to Setup and Run ALAWAEL Locally
REM Created: February 23, 2026

echo.
echo ===============================================
echo   ALAWAEL v1.0.0 - Local Setup & Run Script
echo ===============================================
echo.

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

REM Check npm
echo Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm not found!
    echo Please install npm with Node.js
    pause
    exit /b 1
)

echo.
echo ✅ Prerequisites verified!
echo.

REM Ask user which project to run
echo Select project to run:
echo 1. Backend (ALAWAEL ERP Backend)
echo 2. ERP System (erp_new_system)
echo 3. Frontend (React App)
echo 4. Full Stack (Backend + Frontend)
echo 5. Exit
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto backend
if "%choice%"=="2" goto erpsystem
if "%choice%"=="3" goto frontend
if "%choice%"=="4" goto fullstack
if "%choice%"=="5" goto exit
goto invalid

:backend
echo.
echo 🚀 Setting up ALAWAEL Backend...
cd /d backend
if not exist .env (
    echo Creating .env file...
    (
        echo NODE_ENV=development
        echo PORT=3000
        echo HOST=localhost
        echo DATABASE_URL=mongodb://localhost:27017/alawael-dev
        echo JWT_SECRET=your-secret-key-please-change
        echo JWT_EXPIRE=7d
        echo REFRESH_TOKEN_EXPIRE=30d
        echo LOG_LEVEL=debug
        echo SKIP_ENV_VALIDATION=true
    ) > .env
    echo ✅ .env file created with defaults
)

echo.
echo Installing dependencies...
call npm install

echo.
echo ✅ Setup complete!
echo.
echo Starting backend server...
echo 🌍 Server will run on http://localhost:3000
echo.

call npm start
goto end

:erpsystem
echo.
echo 🚀 Setting up ERP System Backend...
cd /d erp_new_system\backend
if not exist .env (
    echo Creating .env file...
    (
        echo NODE_ENV=development
        echo PORT=3000
        echo DATABASE_URL=mongodb://localhost:27017/erp-dev
        echo JWT_SECRET=your-secret-key-please-change
    ) > .env
    echo ✅ .env file created with defaults
)

echo.
echo Installing dependencies...
call npm install

echo.
echo ✅ Setup complete!
echo.
echo Starting ERP backend server...
echo 🌍 Server will run on http://localhost:3000
echo.

call npm start
goto end

:frontend
echo.
echo 🚀 Setting up Frontend...
cd /d frontend
if not exist .env (
    echo Creating .env file...
    (
        echo REACT_APP_API_URL=http://localhost:3000
    ) > .env
    echo ✅ .env file created
)

echo.
echo Installing dependencies...
call npm install

echo.
echo ✅ Setup complete!
echo.
echo Starting frontend development server...
echo 🌍 Browser will open at http://localhost:3000
echo.

call npm start
goto end

:fullstack
echo.
echo 🚀 Setting up Full Stack (Backend + Frontend)...
echo.
echo This will open TWO windows - one for Backend, one for Frontend
echo.

REM Setup Backend
echo Setting up Backend...
cd /d backend
if not exist .env (
    echo Creating .env file...
    (
        echo NODE_ENV=development
        echo PORT=3000
        echo HOST=localhost
        echo DATABASE_URL=mongodb://localhost:27017/alawael-dev
        echo JWT_SECRET=your-secret-key-please-change
        echo JWT_EXPIRE=7d
        echo REFRESH_TOKEN_EXPIRE=30d
        echo LOG_LEVEL=debug
        echo SKIP_ENV_VALIDATION=true
    ) > .env
)

echo Installing backend dependencies...
call npm install

REM Setup Frontend
echo.
echo Setting up Frontend...
cd ..\frontend
if not exist .env (
    echo Creating .env file...
    (
        echo REACT_APP_API_URL=http://localhost:3000
    ) > .env
)

echo Installing frontend dependencies...
call npm install

echo.
echo ✅ Full Stack setup complete!
echo.
echo Opening Backend in new window...
cd ..\backend
start cmd /k "npm start"

echo.
echo Waiting 5 seconds before starting Frontend...
timeout /t 5 /nobreak

echo.
echo Opening Frontend in new window...
cd ..\frontend
start cmd /k "npm start"

echo.
echo 🎉 Both servers starting!
echo 📍 Backend: http://localhost:3000
echo 📍 Frontend: http://localhost:3000 (in browser)
echo.
echo Close either window to stop the server.
goto end

:invalid
echo Invalid choice! Please select 1-5
goto backend

:end
pause
exit /b 0
