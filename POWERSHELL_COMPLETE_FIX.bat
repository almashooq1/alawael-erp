@echo off
chcp 65001 >nul 2>&1
title PowerShell Complete Fix

echo ============================================================
echo              POWERSHELL COMPLETE FIX - RADICAL REPAIR
echo ============================================================
echo.

:: Step 1: Kill all PowerShell processes
echo [1/5] Killing all PowerShell processes...
taskkill /f /im powershell.exe >nul 2>&1
taskkill /f /im pwsh.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Step 2: Remove ALL PowerShell profiles
echo [2/5] Removing all PowerShell profiles...
del /f /q "%USERPROFILE%\Documents\WindowsPowerShell\*.ps1" 2>nul
del /f /q "%USERPROFILE%\OneDrive\Documents\WindowsPowerShell\*.ps1" 2>nul
del /f /q "%USERPROFILE%\Documents\PowerShell\*.ps1" 2>nul
rmdir /s /q "%USERPROFILE%\Documents\WindowsPowerShell" 2>nul
rmdir /s /q "%USERPROFILE%\OneDrive\Documents\WindowsPowerShell" 2>nul
rmdir /s /q "%USERPROFILE%\Documents\PowerShell" 2>nul
echo Profiles removed.

:: Step 3: Reset PSModulePath completely
echo [3/5] Resetting PSModulePath...
setx PSModulePath "" /M >nul 2>&1
set "PSModulePath=%SystemRoot%\System32\WindowsPowerShell\v1.0\Modules"
setx PSModulePath "%PSModulePath%" /M >nul 2>&1
if errorlevel 1 (
    setx PSModulePath "%PSModulePath%" >nul 2>&1
)
echo PSModulePath reset.

:: Step 4: Fix Windows PowerShell installation using System File Checker
echo [4/5] Running System File Checker (this may take a few minutes)...
sfc /scanfile="%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" >nul 2>&1

:: Step 5: Test PowerShell
echo [5/5] Testing PowerShell...
echo.

:: Test with clean environment
set "PSModulePath=%SystemRoot%\System32\WindowsPowerShell\v1.0\Modules"
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -Command "echo 'PowerShell is working!'" 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] PowerShell is still broken.
    echo.
    echo Trying alternative fix...
    
    :: Register PowerShell again
    regsvr32 /s "%SystemRoot%\System32\WindowsPowerShell\v1.0\pwrshsip.dll" 2>nul
    
    echo.
    echo Please restart your computer and try again.
) else (
    echo.
    echo ============================================================
    echo                    FIX SUCCESSFUL!
    echo ============================================================
    echo.
    echo PowerShell has been repaired.
    echo Please CLOSE ALL terminals and open a NEW one.
    echo ============================================================
)


