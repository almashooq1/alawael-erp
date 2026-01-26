#!/usr/bin/env pwsh
# AlAwael ERP - Complete System Startup Script
# Launches Backend and Frontend for final testing

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🚀 AlAwael ERP - Complete System Launch   ║" -ForegroundColor Green  
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$ErrorActionPreference = "Continue"
$workspaceRoot = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"

# 1. Clean up existing processes
Write-Host "🧹 تنظيف العمليات السابقة..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force 2>$null
Start-Sleep -Seconds 2
Write-Host "✅ تم التنظيف`n" -ForegroundColor Green

# 2. Start Backend
Write-Host "🔧 تشغيل Backend (Port 3001)..." -ForegroundColor Cyan
$backendPath = Join-Path $workspaceRoot "backend"
$backendJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    $env:PORT = 3001
    $env:USE_MOCK_DB = "true"
    node server.js
} -ArgumentList $backendPath

Start-Sleep -Seconds 5

# 3. Check Backend Health
Write-Host "🔍 فحص Backend..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Host "✅ Backend يعمل: $($health.status)`n" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Backend غير جاهز بعد`n" -ForegroundColor Yellow
}

# 4. Start Frontend Static Server
Write-Host "🌐 تشغيل Frontend (Port 3002)..." -ForegroundColor Cyan
$frontendPath = Join-Path $workspaceRoot "frontend"
$buildPath = Join-Path $frontendPath "build"

if (Test-Path $buildPath) {
    $frontendJob = Start-Job -ScriptBlock {
        param($path)
        Set-Location $path
        npx http-server build -p 3002 -c-1 --silent
    } -ArgumentList $frontendPath
    
    Start-Sleep -Seconds 3
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3002" -UseBasicParsing -TimeoutSec 5
        Write-Host "✅ Frontend يعمل على http://localhost:3002`n" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️  Frontend قيد التشغيل...`n" -ForegroundColor Yellow
    }
}
else {
    Write-Host "⚠️  Build folder not found. Run 'npm run build' first.`n" -ForegroundColor Yellow
}

# 5. Run Integration Tests
Write-Host "🧪 تشغيل اختبارات التكامل...`n" -ForegroundColor Cyan
Set-Location $backendPath
node test-integration.js

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          📊 System Status Summary            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:3001/health" -ForegroundColor White
Write-Host "Frontend: http://localhost:3002" -ForegroundColor White
Write-Host "API Docs: http://localhost:3001/api-docs" -ForegroundColor White
Write-Host "`nJobs Running:" -ForegroundColor Yellow
Get-Job | Format-Table Id, Name, State

Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Gray
Write-Host ""
Wait-Job $backendJob, $frontendJob
