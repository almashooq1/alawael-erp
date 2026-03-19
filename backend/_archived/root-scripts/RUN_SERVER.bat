@echo off
chcp 65001 >nul
cd /d "%~dp0"
title AlAwael ERP Backend Server

echo.
echo ╔══════════════════════════════════════╗
echo ║  AlAwael ERP Backend Server          ║
echo ╚══════════════════════════════════════╝
echo.

echo [93m⏳ Starting server...[0m
node start.js

pause
