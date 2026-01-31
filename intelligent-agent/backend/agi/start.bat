@echo off
REM AGI System - Quick Start Script for Windows
REM This script sets up and starts the AGI system

setlocal enabledelayedexpansion

REM Colors (limited in Windows CMD)
set "ESC="

echo.
echo ========================================================
echo.
echo            AGI System - Quick Start
echo.
echo ========================================================
echo.

REM Check if Node.js is installed
echo [AGI] Checking prerequisites...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] Node.js is not installed. Please install Node.js ^>= 18.0.0
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js version: %NODE_VERSION%

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] npm is not installed. Please install npm ^>= 9.0.0
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] npm version: %NPM_VERSION%

REM Install dependencies
echo.
echo [AGI] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [X] Failed to install dependencies
    exit /b 1
)
echo [OK] Dependencies installed successfully

REM Create .env file if it doesn't exist
if not exist .env (
    echo.
    echo [AGI] Creating .env file...
    copy .env.example .env >nul
    echo [OK] .env file created
) else (
    echo [!] .env file already exists
)

REM Run tests
echo.
echo [AGI] Running tests...
call npm test
if %errorlevel% neq 0 (
    echo [!] Some tests failed, but continuing...
) else (
    echo [OK] All tests passed!
)

REM Start the server
echo.
echo ========================================================
echo.
echo              AGI System is starting...
echo.
echo  Server will be available at:
echo  http://localhost:5001
echo.
echo  Press Ctrl+C to stop the server
echo.
echo ========================================================
echo.

call npm run dev
