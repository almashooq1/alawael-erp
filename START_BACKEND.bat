@echo off
cd /d "%~dp0backend"
echo ========================================
echo   Backend Server Starting...
echo ========================================
echo.
node simple_server.js
pause
