@echo off
echo ============================================
echo   WhatsApp Business Platform - Quick Start
echo ============================================
echo.

cd /d "%~dp0"

echo [1/5] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not installed!
    echo Please install from: https://nodejs.org/
    pause
    exit /b 1
)
echo ✓ Node.js found

echo.
echo [2/5] Installing dependencies...
if not exist "node_modules" (
    call npm install
) else (
    echo ✓ Dependencies already installed
)

echo.
echo [3/5] Generating Prisma Client...
call npx prisma generate

echo.
echo [4/5] Creating .env file...
if not exist ".env" (
    copy .env.example .env >nul
    echo ✓ Created .env file
    echo.
    echo ⚠️  IMPORTANT: Edit .env and add your real Meta credentials!
    echo.
    pause
) else (
    echo ✓ .env file exists
)

echo.
echo [5/5] Starting Docker services...
docker-compose up -d postgres redis
if errorlevel 1 (
    echo.
    echo ERROR: Docker not running or not installed
    echo Please start Docker Desktop or install from: https://www.docker.com/
    echo.
    echo You can skip Docker and use external Postgres/Redis instead.
    pause
)

echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo Next steps:
echo   1. Edit .env with your Meta credentials
echo   2. Run: npx prisma migrate dev --name init
echo   3. Run: npm run dev
echo   4. Test: curl http://localhost:3000/health
echo.
echo For full instructions, see: 🎉_READY_TO_USE.md
echo.
pause
