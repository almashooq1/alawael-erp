@echo off
chcp 65001 >nul
title AlAwael ERP Backend Server
color 0A
echo.
echo ═══════════════════════════════════════════════
echo    🚀 Starting AlAwael ERP Backend Server
echo ═══════════════════════════════════════════════
echo.
cd /d "%~dp0"
echo 📂 Working Directory: %CD%
echo.
node server.js
pause
