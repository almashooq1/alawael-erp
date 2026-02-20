# Build and serve frontend production build from ERP path
param(
    [string]$ApiUrl = "http://localhost:3001/api",
    [int]$Port = 3002
)
Write-Host "Cleaning frontend serve/node..." -ForegroundColor Yellow
Get-Process serve -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*serve*" -or $_.CommandLine -like "*3002*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 1

$frontendPath = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\erp_new_system\frontend"
Push-Location $frontendPath
Write-Host "Building frontend with REACT_APP_API_URL=$ApiUrl" -ForegroundColor Cyan
$env:REACT_APP_API_URL = $ApiUrl
npm run build
Write-Host "Serving build on port $Port" -ForegroundColor Green
npx serve -s build -l $Port
Pop-Location
