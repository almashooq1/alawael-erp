# Start backend from ERP path with cleanup
param(
  [string]$Port = "3001"
)
Write-Host "Cleaning Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 1

$backendPath = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\erp_new_system\backend"
Push-Location $backendPath
Write-Host "Starting backend at $backendPath (port $Port)" -ForegroundColor Cyan
npm start
Pop-Location
