@echo off
echo Deleting Corrupt PowerShell Profiles...

del /f /q "%USERPROFILE%\Documents\WindowsPowerShell\profile.ps1" 2>nul
del /f /q "%USERPROFILE%\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1" 2>nul
del /f /q "%USERPROFILE%\Documents\PowerShell\profile.ps1" 2>nul
del /f /q "%USERPROFILE%\Documents\PowerShell\Microsoft.PowerShell_profile.ps1" 2>nul

echo Done! Now run: powershell -NoProfile
pause