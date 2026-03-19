@echo off
echo ===========================================
echo   POWERSHELL RADICAL FIX - FINAL SOLUTION
echo ===========================================
echo.

REM Step 1: Kill all PowerShell processes
echo [1/6] Killing PowerShell processes...
taskkill /f /im powershell.exe 2>nul
taskkill /f /im pwsh.exe 2>nul
echo       Done!

REM Step 2: Delete ALL PowerShell profiles
echo [2/6] Deleting ALL PowerShell profiles...
rmdir /s /q "%USERPROFILE%\Documents\WindowsPowerShell" 2>nul
rmdir /s /q "%USERPROFILE%\Documents\PowerShell" 2>nul
mkdir "%USERPROFILE%\Documents\WindowsPowerShell" 2>nul
mkdir "%USERPROFILE%\Documents\PowerShell" 2>nul
echo       Done!

REM Step 3: Fix PSModulePath
echo [3/6] Fixing PSModulePath...
set "PSMODULEPATH="
setx PSModulePath "" 2>nul
echo       Done!

REM Step 4: Clear VS Code PowerShell cache
echo [4/6] Clearing VS Code PowerShell cache...
rmdir /s /q "%APPDATA%\Code\User\globalStorage\ms-vscode.powershell" 2>nul
rmdir /s /q "%LOCALAPPDATA%\Microsoft\VisualStudio\Code\Cache" 2>nul
echo       Done!

REM Step 5: Reset Windows PowerShell execution policy
echo [5/6] Resetting execution policy...
reg add "HKCU\Software\Microsoft\PowerShell\1\ShellIds\Microsoft.PowerShell" /v ExecutionPolicy /t REG_SZ /d "RemoteSigned" /f 2>nul
echo       Done!

REM Step 6: Create clean profile
echo [6/6] Creating clean profile...
(
echo # Clean PowerShell Profile
echo Set-PSReadLineOption -EditMode Windows
) > "%USERPROFILE%\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1"
echo       Done!

echo.
echo ===========================================
echo              FIX COMPLETE!
echo ===========================================
echo.
echo NEXT STEPS:
echo 1. CLOSE ALL VS Code windows
echo 2. Open CMD and run: pwsh -NoProfile
echo 3. If still broken, install PowerShell 7 from:
echo    https://github.com/PowerShell/PowerShell/releases
echo.
echo ALTERNATIVE: Use CMD instead of PowerShell
echo.
pause