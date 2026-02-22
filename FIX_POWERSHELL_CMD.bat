@echo off
echo ===================================
echo    PowerShell Radical Fix via CMD
echo ===================================
echo.

REM Step 1: Create PowerShell Profile Directory
echo [1/4] Creating PowerShell Profile Directories...
set "PSDIR=%USERPROFILE%\Documents\PowerShell"
set "WINPSDIR=%USERPROFILE%\Documents\WindowsPowerShell"

if not exist "%PSDIR%" mkdir "%PSDIR%"
if not exist "%WINPSDIR%" mkdir "%WINPSDIR%"
echo       Done!

REM Step 2: Create Safe PowerShell Profile
echo [2/4] Creating Safe PowerShell Profile...
(
echo # Safe PowerShell Profile
echo $env:PSModuleAutoLoadingPreference = 'ModuleQualified'
echo Write-Host 'PowerShell Ready' -ForegroundColor Green
) > "%PSDIR%\profile.ps1"
copy /Y "%PSDIR%\profile.ps1" "%WINPSDIR%\profile.ps1" >nul
echo       Done!

REM Step 3: Clear VS Code Cache
echo [3/4] Clearing VS Code Cache...
if exist "%APPDATA%\Code\Cache" rmdir /s /q "%APPDATA%\Code\Cache"
if exist "%APPDATA%\Code\CachedData" rmdir /s /q "%APPDATA%\Code\CachedData"
if exist "%APPDATA%\Code\GPUCache" rmdir /s /q "%APPDATA%\Code\GPUCache"
echo       Done!

REM Step 4: Fix PowerShell Environment Variable
echo [4/4] Fixing PowerShell Environment...
setx PSModulePath "" >nul 2>&1
echo       Done!

echo.
echo ===================================
echo    Fix Complete!
echo ===================================
echo.
echo IMPORTANT: Please do the following:
echo 1. Close ALL VS Code windows
echo 2. Open a NEW Command Prompt
echo 3. Run: powershell -NoProfile
echo 4. If it works, restart VS Code
echo.
echo If PowerShell still doesn't work:
echo - Run Windows Store and search for "PowerShell"
echo - Or download from: https://github.com/PowerShell/PowerShell/releases
echo.
pause