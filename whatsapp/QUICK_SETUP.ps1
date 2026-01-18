# WhatsApp Business Platform - Quick Setup
# Run this script with: .\QUICK_SETUP.ps1

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  WhatsApp Business Platform - Quick Start" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

# 1. Check Node.js
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "✗ ERROR: Node.js not installed!" -ForegroundColor Red
    Write-Host "Please install from: https://nodejs.org/" -ForegroundColor Yellow
    pause
    exit 1
}

# 2. Install dependencies
Write-Host ""
Write-Host "[2/5] Installing dependencies..." -ForegroundColor Yellow
if (!(Test-Path "node_modules")) {
    npm install
}
else {
    Write-Host "✓ Dependencies already installed" -ForegroundColor Green
}

# 3. Generate Prisma Client
Write-Host ""
Write-Host "[3/5] Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

# 4. Create .env
Write-Host ""
Write-Host "[4/5] Creating .env file..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✓ Created .env file" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Edit .env and add your real Meta credentials!" -ForegroundColor Yellow
    Write-Host ""
    pause
}
else {
    Write-Host "✓ .env file exists" -ForegroundColor Green
}

# 5. Start Docker
Write-Host ""
Write-Host "[5/5] Starting Docker services..." -ForegroundColor Yellow
try {
    docker-compose up -d postgres redis
    Write-Host "✓ Docker services started" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "✗ ERROR: Docker not running or not installed" -ForegroundColor Red
    Write-Host "Please start Docker Desktop or install from: https://www.docker.com/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You can skip Docker and use external Postgres/Redis instead." -ForegroundColor Yellow
    pause
}

# Summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Edit .env with your Meta credentials"
Write-Host "  2. Run: npx prisma migrate dev --name init"
Write-Host "  3. Run: npm run dev"
Write-Host "  4. Test: curl http://localhost:3000/health"
Write-Host ""
Write-Host "For full instructions, see: 🎉_READY_TO_USE.md" -ForegroundColor Cyan
Write-Host ""
pause
