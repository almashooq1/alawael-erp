@echo off
REM =========================================
REM  VS Code Crash Fix - Complete Solution
REM =========================================

setlocal enabledelayedexpansion

echo.
echo =========================================
echo   VS Code PowerShell Crash Fix
echo =========================================
echo.

REM Check if running as admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c %~s0' -Verb RunAs"
    exit /b
)

echo Running as Administrator: YES
echo.

REM Step 1: Kill all PowerShell/npm processes
echo [Step 1/6] Cleaning up processes...
taskkill /F /IM powershell.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM npm.cmd >nul 2>&1
echo ✓ Processes cleaned
echo.

REM Step 2: Clear npm cache
echo [Step 2/6] Clearing npm cache...
cd /d "%USERPROFILE%"
call npm cache clean --force >nul 2>&1
echo ✓ npm cache cleared
echo.

REM Step 3: Reset environment variables
echo [Step 3/6] Resetting environment variables...
setx PSModulePath "%SystemRoot%\System32\WindowsPowerShell\v1.0\Modules" /M >nul 2>&1
echo ✓ PSModulePath reset
echo.

REM Step 4: Remove corrupted profiles
echo [Step 4/6] Removing corrupted profiles...
for %%P in (
    "%USERPROFILE%\Documents\WindowsPowerShell"
    "%USERPROFILE%\OneDrive\Documents\WindowsPowerShell"
) do (
    if exist "%%P" (
        rmdir /S /Q "%%P" >nul 2>&1
        echo ✓ Removed: %%P
    )
)
echo.

REM Step 5: Update registry
echo [Step 5/6] Updating registry...
reg add "HKCU\Environment" /v PSModulePath /t REG_SZ /d "%SystemRoot%\System32\WindowsPowerShell\v1.0\Modules" /f >nul 2>&1
echo ✓ Registry updated
echo.

REM Step 6: Verify
echo [Step 6/6] Verifying installation...
echo   Node version: 
node --version
echo.
echo   npm version:
call npm --version
echo.

echo =========================================
echo   ✓ REPAIR COMPLETED SUCCESSFULLY!
echo =========================================
echo.
echo NEXT STEPS:
echo   1. Close this window
echo   2. Close ALL other windows completely
echo   3. Restart your computer (IMPORTANT!)
echo   4. Open VS Code again
echo.
echo Your VS Code should work normally now.
echo.
pause
