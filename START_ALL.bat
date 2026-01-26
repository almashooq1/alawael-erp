@echo off
echo ========================================
echo   Starting Both Servers...
echo ========================================
echo.

REM Stop existing processes
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 >nul

echo Starting Backend...
start "Backend Server" "%~dp0START_BACKEND.bat"
timeout /t 5 >nul

echo Starting Frontend...
start "Frontend Server" "%~dp0START_FRONTEND.bat"
timeout /t 3 >nul

echo.
echo ========================================
echo   Both Servers Started!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3002
echo.
echo Login Credentials:
echo   Email: admin@example.com
echo   Password: Admin@123
echo.
echo Opening browser...
start http://localhost:3002
echo.
pause
