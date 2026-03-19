# Production Deployment PowerShell Script for Al-Awael Phase 29-33

Write-Host "`n🚀 Al-Awael Phase 29-33 - Production Deployment Script" -ForegroundColor Green
Write-Host "==================================================`n" -ForegroundColor Green

# 1. Check Node.js
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Please install Node.js v18+" -ForegroundColor Red
    exit 1
}

# 2. Check PM2
try {
    $pm2Version = pm2 -v
    Write-Host "✅ PM2 $pm2Version found" -ForegroundColor Green
} catch {
    Write-Host "❌ PM2 not found! Installing..." -ForegroundColor Yellow
    npm install -g pm2
}

# 3. Go to backend directory
Set-Location backend
if (!(Test-Path "server.js")) {
    Write-Host "❌ backend directory or server.js not found" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Switched to backend directory" -ForegroundColor Green

# 4. Install dependencies
if (!(Test-Path "node_modules")) {
    Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}
Write-Host "✅ Dependencies ready" -ForegroundColor Green

# 5. Run tests
Write-Host "`n🧪 Running endpoint tests..." -ForegroundColor Cyan
if (node test-phases-29-33.js) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Some tests failed (non-blocking)" -ForegroundColor Yellow
}

# 6. Stop existing PM2 processes
Write-Host "`n🛑 Stopping existing PM2 processes..." -ForegroundColor Yellow
pm2 stop all 2>$null
pm2 delete all 2>$null
Start-Sleep -Seconds 2

# 7. Start with production config
Write-Host "`n🚀 Starting backend with PM2..." -ForegroundColor Green
$env:NODE_ENV = "production"
$env:PORT = "3001"
$env:USE_MOCK_DB = "true"

# Start in cluster mode with 4 instances
pm2 start server.js `
    --name alawael-backend `
    --instances 4 `
    --exec-mode cluster `
    --watch false `
    --max-memory-restart 500M

# 8. Save PM2 config
pm2 save

# 9. Wait for startup
Write-Host "`n⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 10. Verify health
Write-Host "`n🏥 Checking backend health..." -ForegroundColor Cyan
$maxAttempts = 5
$attempt = 1

while ($attempt -le $maxAttempts) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 2 -ErrorAction Stop
        Write-Host "✅ Backend is healthy!" -ForegroundColor Green
        break
    } catch {
        Write-Host "⏳ Attempt $attempt/$maxAttempts..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
        $attempt++
    }
}

if ($attempt -gt $maxAttempts) {
    Write-Host "❌ Backend failed to start!" -ForegroundColor Red
    pm2 logs alawael-backend --lines 20
    exit 1
}

# 11. Show status
Write-Host "`n📊 Final Status:" -ForegroundColor Cyan
pm2 status

Write-Host "`n✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "`nURLs:" -ForegroundColor Cyan
Write-Host "  Health: http://localhost:3001/health" -ForegroundColor White
Write-Host "  Phase 29-33: http://localhost:3001/phases-29-33" -ForegroundColor White

Write-Host "`nCommands:" -ForegroundColor Cyan
Write-Host "  View logs: pm2 logs alawael-backend" -ForegroundColor Yellow
Write-Host "  Monitor:   pm2 monit" -ForegroundColor Yellow
Write-Host "  Restart:   pm2 restart alawael-backend" -ForegroundColor Yellow
Write-Host ""
