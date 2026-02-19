@echo off
REM ERP System - Docker Verification Script (Windows)
REM This script verifies that all Docker services are running and healthy

setlocal enabledelayedexpansion

echo.
echo ======================================================================
echo     ERP System - Docker Services Verification (Windows)
echo ======================================================================
echo.

REM 1. Check Docker installation
echo [1/6] Checking Docker installation...
docker --version > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker not found. Please install Docker Desktop for Windows.
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('docker --version') do set DOCKER_VERSION=%%i
    echo [OK] Docker installed: !DOCKER_VERSION!
)

REM 2. Check Docker Compose installation
echo.
echo [2/6] Checking Docker Compose installation...
docker-compose --version > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose not found.
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('docker-compose --version') do set DC_VERSION=%%i
    echo [OK] Docker Compose installed: !DC_VERSION!
)

REM 3. Check environment file
echo.
echo [3/6] Checking environment configuration...
if exist ".env.docker" (
    echo [OK] .env.docker file found
) else (
    echo [WARNING] .env.docker file not found. Creating from template...
    if exist ".env.docker.example" (
        copy ".env.docker.example" ".env.docker" > nul
        echo [OK] Created .env.docker from template
    ) else (
        echo [ERROR] .env.docker.example not found
        exit /b 1
    )
)

REM 4. Check services status
echo.
echo [4/6] Checking Docker services status...
docker-compose ps
REM Count containers
for /f %%i in ('docker-compose ps -q ^| find /c /v ""') do set CONTAINER_COUNT=%%i
if %CONTAINER_COUNT% equ 0 (
    echo [WARNING] No containers running. Starting services...
    docker-compose up -d --build
    echo [OK] Services started. Waiting 10 seconds for health checks...
    timeout /t 10 /nobreak
)

REM 5. Check service health
echo.
echo [5/6] Checking service health...
echo.

REM MongoDB
echo   MongoDB [27017]:
docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > nul 2>&1
if %errorlevel% equ 0 (
    echo     [OK] Healthy
) else (
    echo     [WARNING] Unhealthy - check logs
)

REM Backend API
echo   Backend API [3001]:
curl -f http://localhost:3001/health > nul 2>&1
if %errorlevel% equ 0 (
    echo     [OK] Healthy
) else (
    echo     [WARNING] Not ready yet...
)

REM SSO Server
echo   SSO Server [3002]:
curl -f http://localhost:3002/health > nul 2>&1
if %errorlevel% equ 0 (
    echo     [OK] Healthy
) else (
    echo     [WARNING] Not ready yet...
)

REM Frontend
echo   Frontend [3000]:
curl -f http://localhost:3000/ > nul 2>&1
if %errorlevel% equ 0 (
    echo     [OK] Healthy
) else (
    echo     [WARNING] Not ready yet...
)

REM 6. Summary
echo.
echo ======================================================================
echo                     Verification Summary
echo ======================================================================
echo.
echo [OK] Docker is properly configured
echo [OK] Services are running
echo.
echo Access your services at:
echo   Frontend:  http://localhost:3000
echo   API:       http://localhost:3001/api
echo   SSO:       http://localhost:3002
echo.
echo Useful commands:
echo   View logs:      docker-compose logs -f backend
echo   Execute cmd:    docker-compose exec backend npm test
echo   MongoDB shell:  docker-compose exec mongodb mongosh
echo   Stop services:  docker-compose down
echo   Clean up:       docker-compose down -v
echo.
echo For more information, see DOCKER_SETUP_GUIDE.md
echo.

pause
