# ===================================
# Quick Deploy Script - PowerShell
# ===================================

Write-Host "🚀 Starting ERP System Deployment..." -ForegroundColor Cyan

# Check if .env exists
if (!(Test-Path .env)) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "⚠️  Please edit .env file with your configuration" -ForegroundColor Yellow
    exit 1
}

# Check Docker
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker is not installed" -ForegroundColor Red
    Write-Host "Please install Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

if (!(Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker Compose is not installed" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Building Docker images..." -ForegroundColor Blue
docker-compose build

Write-Host "🔧 Starting services..." -ForegroundColor Blue
docker-compose up -d

Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Blue
Start-Sleep -Seconds 15

# Check health
Write-Host "🏥 Checking service health..." -ForegroundColor Blue

try {
    $backendHealth = Invoke-WebRequest -Uri "http://localhost:3005/health" -UseBasicParsing
    if ($backendHealth.StatusCode -eq 200) {
        Write-Host "✅ Backend is healthy" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Backend health check failed" -ForegroundColor Red
}

try {
    $frontendHealth = Invoke-WebRequest -Uri "http://localhost/health" -UseBasicParsing
    if ($frontendHealth.StatusCode -eq 200) {
        Write-Host "✅ Frontend is healthy" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Frontend health check failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access your application:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost"
Write-Host "   Backend:  http://localhost:3005"
Write-Host "   API Docs: http://localhost:3005/api-docs"
Write-Host ""
Write-Host "📊 View logs:" -ForegroundColor Cyan
Write-Host "   docker-compose logs -f"
Write-Host ""
Write-Host "🛑 Stop services:" -ForegroundColor Cyan
Write-Host "   docker-compose down"
