@echo off
REM Navigate to backend directory using relative path
cd /d %~dp0
echo Starting AlAwael ERP Backend Server...
echo Port: 3001
echo.
node server.js
pause
