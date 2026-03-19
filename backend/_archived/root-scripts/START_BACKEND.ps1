# AlAwael ERP Backend Startup Script
$Host.UI.RawUI.WindowTitle = "AlAwael ERP Backend Server"
Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🚀 Starting AlAwael ERP Backend Server" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot
Write-Host "📂 Working Directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Clear port 3001
$port = 3001
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1
if ($process) {
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Cleared port $port" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

Write-Host "🔄 Starting Node.js server..." -ForegroundColor Cyan
Write-Host ""

node server.js
