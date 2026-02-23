@echo off
REM ===================================================================
REM   COMPLETE VS CODE CRASH FIX - Run this file alone, outside VS Code
REM ===================================================================

setlocal enabledelayedexpansion

REM Check and request Admin if not running
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges...
    echo Please click YES when prompted.
    echo.
    pause
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~s0\"' -Verb RunAs" 2>nul
    exit /b
)

color 0A
cls
echo.
echo ===================================================================
echo                 VS CODE CRASH FIX - AUTOMATIC
echo ===================================================================
echo.
echo Status: Running with Administrator privileges
echo.

REM STEP 1: Kill all processes
echo [STEP 1/6] Terminating processes...
taskkill /F /IM powershell.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
taskkill /IM code.exe >nul 2>&1
echo. [STEP 1/6] ... Done
echo.

REM STEP 2: Verify location
echo [STEP 2/6] Setting working directory...
cd /d "%USERPROFILE%"
echo Work directory: %cd%
echo.

REM STEP 3: Clear npm cache
echo [STEP 3/6] Clearing npm cache...
call npm cache clean --force >nul 2>&1
echo ... Cache cleared
echo.

REM STEP 4: Reset PSModulePath
echo [STEP 4/6] Resetting PowerShell environment...
setx PSModulePath "%SystemRoot%\System32\WindowsPowerShell\v1.0\Modules" >nul 2>&1
echo ... PSModulePath reset
echo.

REM STEP 5: Remove corrupted profiles
echo [STEP 5/6] Cleaning corrupted PowerShell profiles...
if exist "%USERPROFILE%\Documents\WindowsPowerShell" (
    rmdir /S /Q "%USERPROFILE%\Documents\WindowsPowerShell" >nul 2>&1
    echo ... Removed Documents profile
)
if exist "%USERPROFILE%\OneDrive\المستندات\WindowsPowerShell" (
    rmdir /S /Q "%USERPROFILE%\OneDrive\المستندات\WindowsPowerShell" >nul 2>&1
    echo ... Removed OneDrive profile
)
echo.

REM STEP 6: Registry fix
echo [STEP 6/6] Updating Windows registry...
reg add "HKCU\Environment" /v PSModulePath /t REG_SZ /d "%SystemRoot%\System32\WindowsPowerShell\v1.0\Modules" /f >nul 2>&1
echo ... Registry updated
echo.

REM Verification
echo ===================================================================
echo.
echo SUCCESS: All repairs completed!
echo.
echo ===================================================================
echo.
echo IMPORTANT - NEXT STEPS:
echo.
echo 1. Close this window
echo 2. Restart your computer (VERY IMPORTANT)
echo 3. Open VS Code after restart
echo 4. Test by running: npm --version
echo.
echo Your VS Code should work normally now.
echo.
echo ===================================================================
echo.
timeout /t 10 /nobreak
