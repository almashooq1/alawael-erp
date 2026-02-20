# Start frontend dev server from ERP path with cleanup
param(
  [string]$Port = "3002"
)
Write-Host "Cleaning frontend node/react-scripts..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*react-scripts*" -or $_.CommandLine -like "*3000*" -or $_.CommandLine -like "*3002*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 1

$frontendPath = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\erp_new_system\frontend"
Push-Location $frontendPath
Write-Host "Starting frontend dev at $frontendPath (port $Port)" -ForegroundColor Cyan
npm start
Pop-Location
