@echo off
REM Script to fix TypeScript tsserver issue in VS Code

echo.
echo ========================================
echo TypeScript tsserver Fix Script
echo ========================================
echo.

REM Step 1: Close VS Code
echo Step 1: Closing VS Code...
taskkill /F /IM code.exe 2>nul
timeout /t 2 /nobreak

REM Step 2: Clear TypeScript cache
echo.
echo Step 2: Clearing TypeScript cache...
setlocal enabledelayedexpansion
for /d %%i in ("%APPDATA%\Code\User\workspaceStorage\*") do (
    if exist "%%i\Cache" (
        rmdir "%%i\Cache" /s /q 2>nul
        echo   Cleared cache in %%~nxi
    )
)

REM Step 3: Verify TypeScript installation
echo.
echo Step 3: Verifying TypeScript installation...
if exist "intelligent-agent\node_modules\typescript\lib\tsserver.js" (
    echo   SUCCESS: tsserver.js found!
) else (
    echo   ERROR: tsserver.js not found!
    echo   Reinstalling npm packages...
    cd intelligent-agent
    call npm install --legacy-peer-deps
    cd ..
)

REM Step 4: Clear VS Code workspace cache
echo.
echo Step 4: Clearing VS Code workspace cache...
if exist "%APPDATA%\Code\Cache" (
    rmdir "%APPDATA%\Code\Cache" /s /q 2>nul
    echo   Cleared main cache
)

REM Step 5: Reopen VS Code
echo.
echo Step 5: Reopening VS Code...
timeout /t 2 /nobreak
start code .

echo.
echo ========================================
echo Fix Complete!
echo ========================================
echo.
echo Waiting for VS Code to load IntelliSense...
timeout /t 5 /nobreak

echo.
echo If you still see errors:
echo   1. Wait 1-2 minutes for IntelliSense to index
echo   2. Press Ctrl+Shift+P and search for "TypeScript: Restart TS Server"
echo   3. Try "npm install" again in intelligent-agent folder
echo.
pause
