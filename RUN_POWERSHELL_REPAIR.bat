@echo off
REM Complete PowerShell Fix Batch Runner
REM This script runs the PowerShell fix with Admin privileges

echo ========================================
echo Running Complete PowerShell Repair
echo ========================================
echo.

REM Try to run as admin using PowerShell
echo Attempting to elevate to Administrator...
echo.

REM Run the PowerShell script with elevated privileges
PowerShell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Start-Process PowerShell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"%~dp0COMPLETE_POWERSHELL_FIX.ps1\"' -Verb RunAs"

echo.
echo Script launch initiated. A new window will open with Admin privileges.
echo Please allow the script to complete.
echo.
pause
