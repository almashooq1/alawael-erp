#!/usr/bin/env powershell
# Kill any node process using port 3001 and start the server

Write-Host "Killing processes on port 3001..." -ForegroundColor Yellow
$processes = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($processes) {
    $processes | ForEach-Object { 
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue 
        Write-Host "Killed process $_" -ForegroundColor Green
    }
    Start-Sleep -Seconds 2
}

Write-Host "Starting backend server..." -ForegroundColor Cyan
$backendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $backendDir
npm run start:backend
