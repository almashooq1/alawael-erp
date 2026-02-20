param(
    [ValidateSet('prod', 'dev')]
    [string]$Mode = 'prod',
    [int]$BackendPort = 3001,
    [int]$FrontendPort = 3002,
    [string]$ApiUrl = "http://localhost:3001/api"
)

Write-Host "`n Orchestrating Backend + Frontend startup..." -ForegroundColor Cyan

# 1) Clean old processes
Write-Host " Cleaning existing node/serve processes" -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process serve -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2

# 2) Start Backend
$backendPath = Join-Path $PSScriptRoot "..\backend"
Write-Host " Starting Backend (port $BackendPort) from: $backendPath" -ForegroundColor Yellow
$backend = Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory $backendPath -PassThru -WindowStyle Hidden

# 3) Wait for backend health
$backendHealthy = $false
for ($i = 1; $i -le 15; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/health" -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) {
            $backendHealthy = $true
            break
        }
    }
    catch { }
    Start-Sleep 1
}
if ($backendHealthy) {
    Write-Host " ✅ Backend is ONLINE on port $BackendPort" -ForegroundColor Green
}
else {
    Write-Host " ⚠️ Backend didn't respond yet; continuing..." -ForegroundColor Yellow
}

# 4) Start Frontend
$frontendPath = Join-Path $PSScriptRoot "..\frontend"
if ($Mode -eq 'dev') {
    Write-Host " Starting Frontend (dev server) from: $frontendPath" -ForegroundColor Yellow
    # Dev server opens its own terminal window
    Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory $frontendPath -PassThru
}
else {
    Write-Host " Serving Frontend build on port $FrontendPort" -ForegroundColor Yellow
    $env:REACT_APP_API_URL = $ApiUrl
    # Build if not present
    if (!(Test-Path (Join-Path $frontendPath 'build'))) {
        Write-Host " Building frontend..." -ForegroundColor Yellow
        npm run build --prefix $frontendPath | Out-Null
    }
    Start-Process -FilePath "npx" -ArgumentList "serve -s build -l $FrontendPort" -WorkingDirectory $frontendPath -PassThru
}

# 5) Final status
Write-Host "`n === ACCESS POINTS ===" -ForegroundColor Cyan
Write-Host " Backend:  http://localhost:$BackendPort/api" -ForegroundColor White
Write-Host " Frontend: http://localhost:$FrontendPort" -ForegroundColor White
Write-Host " Login:    admin@alawael.com / Admin@123456" -ForegroundColor White
Write-Host "`n Done." -ForegroundColor Green
