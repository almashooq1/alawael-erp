@echo off
cd /d "%~dp0frontend\build"
echo ========================================
echo   Frontend Server Starting...
echo   URL: http://localhost:3002
echo ========================================
echo.
python -m http.server 3002
pause
