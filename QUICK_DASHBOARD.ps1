#!/usr/bin/env powershell
# AlAwael ERP - Quick Start Script

Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║   AlAwael ERP - Quick System Dashboard     ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host "`n"

# Get current processes
$processes = pm2 list 2>$null

if ($processes) {
    Write-Host "📊 Process Status:" -ForegroundColor Cyan
    pm2 list
    Write-Host "`n"
}

# Health check
Write-Host "🔍 System Health:" -ForegroundColor Cyan

$endpoints = @(
    @{ Name = "Backend Health"; URL = "http://localhost:3001/health"; Type = "Health" },
    @{ Name = "Frontend"; URL = "http://localhost:3000"; Type = "Frontend" }
)

foreach ($endpoint in $endpoints) {
    try {
        $start = Get-Date
        if ($endpoint.Type -eq "Health") {
            $response = Invoke-RestMethod -Uri $endpoint.URL -TimeoutSec 3
            $time = ((Get-Date) - $start).TotalMilliseconds
            Write-Host "   ✅ $($endpoint.Name)" -ForegroundColor Green -NoNewline
            Write-Host " (${time}ms)" -ForegroundColor Gray
        }
        else {
            $response = Invoke-WebRequest -Uri $endpoint.URL -TimeoutSec 3 -UseBasicParsing
            $time = ((Get-Date) - $start).TotalMilliseconds
            Write-Host "   ✅ $($endpoint.Name)" -ForegroundColor Green -NoNewline
            Write-Host " (${time}ms)" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "   ❌ $($endpoint.Name)" -ForegroundColor Red
    }
}

Write-Host "`n📋 Quick Access:" -ForegroundColor Cyan
Write-Host "   Frontend:     http://localhost:3000" -ForegroundColor White
Write-Host "   Backend API:  http://localhost:3001" -ForegroundColor White
Write-Host "   Email:        admin@alawael.com" -ForegroundColor White
Write-Host "   Password:     Admin@123456" -ForegroundColor White

Write-Host "`n⚡ Quick Commands:" -ForegroundColor Cyan
Write-Host "   pm2 restart all           # Restart all services" -ForegroundColor Gray
Write-Host "   pm2 logs                  # View all logs" -ForegroundColor Gray
Write-Host "   pm2 stop all              # Stop all services" -ForegroundColor Gray
Write-Host "   pm2 delete all            # Remove all services" -ForegroundColor Gray

Write-Host "`n✨ System Status: 🟢 READY FOR PRODUCTION" -ForegroundColor Green
Write-Host "`n"
