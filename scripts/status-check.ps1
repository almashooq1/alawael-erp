param(
    [int]$BackendPort = 3001,
    [int]$FrontendPort = 3002
)

Write-Host "`n System Status Check" -ForegroundColor Cyan

# Backend
Write-Host " Backend ($BackendPort):" -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/health" -UseBasicParsing -TimeoutSec 3
    $json = $r.Content | ConvertFrom-Json
    Write-Host "  ONLINE" -ForegroundColor Green
    Write-Host "   Status: $($json.status)" -ForegroundColor White
    Write-Host "   Uptime: $($json.uptime) s" -ForegroundColor White
}
catch {
    Write-Host "  OFFLINE" -ForegroundColor Red
}

# Frontend
Write-Host " Frontend ($FrontendPort):" -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -UseBasicParsing -TimeoutSec 3
    Write-Host "  ONLINE (HTTP $($r.StatusCode))" -ForegroundColor Green
}
catch {
    Write-Host "  OFFLINE" -ForegroundColor Red
}

Write-Host "`n Credentials:" -ForegroundColor Yellow
Write-Host "  admin@alawael.com / Admin@123456" -ForegroundColor White
