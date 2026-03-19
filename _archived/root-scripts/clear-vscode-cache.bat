@echo off
REM Script to clear VS Code cache and temp files
REM This helps resolve crashes and slow performance

echo Clearing VS Code Cache...
echo.

REM Stop VS Code if running
taskkill /F /IM code.exe 2>nul
timeout /t 2 /nobreak

echo Removing VS Code Cache...
if exist "%AppData%\Code\Cache" (
    rmdir "%AppData%\Code\Cache" /s /q
    echo Deleted: Cache folder
)

echo Removing VS Code Cache Lock...
if exist "%AppData%\Code\CacheLock" (
    del "%AppData%\Code\CacheLock" /f /q
    echo Deleted: CacheLock file
)

echo Removing VS Code Logs...
if exist "%AppData%\Code\logs" (
    rmdir "%AppData%\Code\logs" /s /q
    echo Deleted: logs folder
)

echo Removing VS Code Workspace Storage Cache...
if exist "%AppData%\Code\User\workspaceStorage" (
    REM Keep workspaceStorage but clear cache
    for /d %%i in ("%AppData%\Code\User\workspaceStorage\*") do (
        if exist "%%i\Cache" (
            rmdir "%%i\Cache" /s /q 2>nul
        )
    )
    echo Cleared: workspaceStorage cache
)

echo.
echo Clearing temporary files...
if exist "%temp%\.vscode*" (
    del "%temp%\.vscode*" /f /q 2>nul
    echo Deleted: temp VS Code files
)

echo.
echo Restarting VS Code...
timeout /t 2 /nobreak

REM Reopen VS Code
start code .

echo.
echo Done! VS Code should now be faster.
pause
