@echo off
REM Phase 12 - Complete System Startup Script (Windows)
REM Starts both backend and frontend servers

echo.
echo ========================================
echo   Phase 12 ERP System Startup
echo ========================================
echo.

REM Check if backend directory exists
if not exist "..\backend" (
  echo [ERROR] Backend directory not found!
  exit /b 1
)

REM Check and install backend dependencies
if not exist "..\backend\node_modules" (
  echo [INFO] Installing backend dependencies...
  cd ..\backend
  call npm install
  cd ..\frontend
)

REM Check and install frontend dependencies
if not exist "node_modules" (
  echo [INFO] Installing frontend dependencies...
  call npm install
)

echo.
echo ========================================
echo   Dependencies Ready
echo ========================================
echo.

REM Start backend in new window
echo [INFO] Starting backend server on port 3001...
start "Backend Server" cmd /k "cd ..\backend && npm start"

REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in new window
echo [INFO] Starting frontend server on port 3000...
start "Frontend Server" cmd /k "npm start"

echo.
echo ========================================
echo   System Started Successfully!
echo ========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit this window...
echo (Backend and Frontend will continue running)
echo.
pause >nul
