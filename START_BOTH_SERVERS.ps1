# ═══════════════════════════════════════════════════════════
# 🚀 تشغيل Backend و Frontend معاً
# ═══════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "    Starting Full System (Backend + Frontend)" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Stop any existing node processes
Write-Host "Cleaning up old processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "  Done!" -ForegroundColor Green
Write-Host ""

# Start Backend
Write-Host "1. Starting Backend Server..." -ForegroundColor Cyan
$backendPath = Join-Path $scriptPath "backend"
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$backendPath'; Write-Host ''; Write-Host '═══════════════════════════════════════════' -ForegroundColor Green; Write-Host '    Backend Server (Simple Mode)' -ForegroundColor White; Write-Host '═══════════════════════════════════════════' -ForegroundColor Green; Write-Host ''; Write-Host 'Port: 5000' -ForegroundColor Yellow; Write-Host 'URL: http://localhost:5000' -ForegroundColor Yellow; Write-Host 'Health: http://localhost:5000/api/health' -ForegroundColor Yellow; Write-Host ''; Write-Host 'Login Credentials:' -ForegroundColor Cyan; Write-Host '  Email: admin@example.com' -ForegroundColor White; Write-Host '  Password: Admin@123' -ForegroundColor White; Write-Host ''; Write-Host 'Starting server...' -ForegroundColor Gray; Write-Host ''; node simple_server.js"
) -WindowStyle Normal

Write-Host "  Backend window opened!" -ForegroundColor Green
Write-Host "  Waiting 5 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Start Frontend
Write-Host ""
Write-Host "2. Starting Frontend Server..." -ForegroundColor Cyan
$frontendPath = Join-Path $scriptPath "frontend"
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$frontendPath'; Write-Host ''; Write-Host '═══════════════════════════════════════════' -ForegroundColor Cyan; Write-Host '    Frontend Server (React)' -ForegroundColor White; Write-Host '═══════════════════════════════════════════' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Port: 3000' -ForegroundColor Yellow; Write-Host 'URL: http://localhost:3000' -ForegroundColor Yellow; Write-Host ''; Write-Host 'Starting server...' -ForegroundColor Gray; Write-Host 'This may take 20-30 seconds...' -ForegroundColor Gray; Write-Host ''; npm start"
) -WindowStyle Normal

Write-Host "  Frontend window opened!" -ForegroundColor Green
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ Both servers are starting!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏱️  Please wait:" -ForegroundColor Yellow
Write-Host "   • Backend: ~5 seconds" -ForegroundColor White
Write-Host "   • Frontend: ~30 seconds" -ForegroundColor White
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Yellow
Write-Host "   • Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   • Backend: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔐 Login:" -ForegroundColor Yellow
Write-Host "   • Email: admin@example.com" -ForegroundColor White
Write-Host "   • Password: Admin@123" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Gray
Write-Host "   • Check the new windows for server logs" -ForegroundColor DarkGray
Write-Host "   • Don't close the windows while testing" -ForegroundColor DarkGray
Write-Host "   • Browser will open automatically (or open manually)" -ForegroundColor DarkGray
Write-Host ""

# Wait and open browser
Write-Host "Opening browser in 30 seconds..." -ForegroundColor Cyan
Start-Sleep -Seconds 30
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "✅ Done! Browser opened." -ForegroundColor Green
Write-Host "   If it didn't open, go to: http://localhost:3000" -ForegroundColor Gray
Write-Host ""
