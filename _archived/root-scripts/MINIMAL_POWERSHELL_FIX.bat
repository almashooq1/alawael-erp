@echo off
REM Minimal PowerShell Fix using CMD only
REM This is the safest approach when PowerShell is broken

echo ========================================
echo PowerShell Minimal Repair
echo ========================================
echo.

echo [1/4] Clearing npm cache...
cd /d "%USERPROFILE%"
npm cache clean --force
echo ✓ Cache cleared
echo.

echo [2/4] Resetting PSModulePath...
setx PSModulePath "%SystemRoot%\System32\WindowsPowerShell\v1.0\Modules"
echo ✓ PSModulePath reset
echo.

echo [3/4] Removing corrupted profiles...
if exist "%USERPROFILE%\Documents\WindowsPowerShell" (
    rmdir /S /Q "%USERPROFILE%\Documents\WindowsPowerShell"
    echo ✓ Documents profile removed
)
if exist "%USERPROFILE%\OneDrive\Documents\WindowsPowerShell" (
    rmdir /S /Q "%USERPROFILE%\OneDrive\Documents\WindowsPowerShell"
    echo ✓ OneDrive Documents profile removed
)
echo.

echo [4/4] Creating backup registry entry...
reg add "HKCU\Environment" /v PSModulePath /t REG_SZ /d "%SystemRoot%\System32\WindowsPowerShell\v1.0\Modules" /f
echo ✓ Registry updated
echo.

echo ========================================
echo ✓ Repair completed!
echo ========================================
echo.
echo IMPORTANT: 
echo 1. Close ALL windows (including VS Code)
echo 2. Close this window
echo 3. Reopen VS Code
echo.
pause
