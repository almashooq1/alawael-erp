@echo off
chcp 65001 >nul
title PowerShell Radical Fix - حل PowerShell الجذري
color 0A

echo ============================================================
echo        POWERSHELL RADICAL FIX - حل PowerShell الجذري
echo ============================================================
echo.
echo This script will fix PowerShell crashes in VS Code
echo هذا السكريبت سيصلح مشاكل تعليق PowerShell في VS Code
echo.
echo Press any key to start...
pause >nul

echo.
echo Running PowerShell fix script...
echo تشغيل سكريبت الإصلاح...
echo.

PowerShell -NoProfile -ExecutionPolicy Bypass -File "%~dp0POWERSHELL_RADICAL_FIX.ps1"

echo.
echo ============================================================
echo Fix completed! اكتمل الإصلاح!
echo ============================================================
echo.
echo Next steps:
echo 1. Close this window
echo 2. Open VS Code
echo 3. Press Ctrl+` to open terminal
echo 4. Terminal should work without freezing
echo.
pause