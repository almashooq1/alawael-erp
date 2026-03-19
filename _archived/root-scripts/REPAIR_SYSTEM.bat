@echo off
REM REPAIR_SYSTEM.bat - Complete system repair and startup
REM This script will fix and start all required services

setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║                                                                      ║
echo ║               🔧 SYSTEM REPAIR ^& STARTUP PROCESS                   ║
echo ║                        البدء في الاصلاح                              ║
echo ║                  February 20, 2026 - 02:50 PM UTC+3                 ║
echo ║                                                                      ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.

REM Get workspace path
set WORKSPACE=c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666
set BACKEND_DIR=%WORKSPACE%\erp_new_system\backend
set FRONTEND_DIR=%WORKSPACE%\erp_new_system\frontend

cd /d %WORKSPACE%

echo STEP 1: Verifying Node.js and npm
echo ================================
node --version
npm --version

echo.
echo STEP 2: Checking Backend Directory
echo ==================================
if exist "%BACKEND_DIR%" (
  echo [OK] Backend directory found
) else (
  echo [ERROR] Backend directory not found: %BACKEND_DIR%
  exit /b 1
)

echo.
echo STEP 3: Installing Backend Dependencies
echo =======================================
cd /d "%BACKEND_DIR%"
if not exist "node_modules" (
  echo Installing npm packages...
  call npm install
) else (
  echo [OK] node_modules already exists
)

echo.
echo STEP 4: Checking Frontend Directory
echo ===================================
if exist "%FRONTEND_DIR%" (
  echo [OK] Frontend directory found
) else (
  echo [WARNING] Frontend directory not found: %FRONTEND_DIR%
)

echo.
echo STEP 5: Starting Backend Service
echo ================================
cd /d "%BACKEND_DIR%"
echo Starting backend on port 3001...
start "Backend Service" node server.js

echo.
echo STEP 6: Waiting for backend to initialize
echo =========================================
timeout /t 5 /nobreak

echo.
echo STEP 7: Starting Frontend Service
echo ================================
cd /d "%FRONTEND_DIR%"
echo Starting frontend on port 3000...
start "Frontend Service" cmd /k npm start

echo.
echo STEP 8: Verification
echo ===================
echo.
echo SERVICES STARTING:
echo  - Backend API on port 3001
echo  - Frontend on port 3000
echo.
echo Wait 10-15 seconds for services to fully initialize...
echo.
echo REPAIR PROCESS COMPLETE
echo.
echo Access the application:
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:3001
echo  Health:   http://localhost:3001/health
echo.

endlocal
