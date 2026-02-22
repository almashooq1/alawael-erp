@echo off
echo Fixing PSModulePath...

REM Get default Windows PowerShell module path
set "DEFAULT_PS_PATH=%windir%\System32\WindowsPowerShell\v1.0\Modules"

REM Set PSModulePath to default
setx PSModulePath "%DEFAULT_PS_PATH%" /M 2>nul
if errorlevel 1 (
    setx PSModulePath "%DEFAULT_PS_PATH%" 2>nul
)

echo.
echo PSModulePath has been reset.
echo Please RESTART your terminal and try PowerShell again.
echo.
pause