param(
    [switch]$KillNode,
    [int]$BackendPort = 3001,
    [int]$FrontendPort = 3002
)

# Resolve workspace-relative paths to avoid non-ASCII parsing issues
$WorkspaceRoot = Split-Path -Parent $PSScriptRoot
$BackendPath = Join-Path $WorkspaceRoot "backend"
$FrontendPath = Join-Path $WorkspaceRoot "frontend"

function Test-Endpoint {
    param([string]$Url, [int]$TimeoutSec = 2)
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
        return $true
    }
    catch { return $false }
}

function Wait-For-Health {
    param([string]$Url, [int]$Retry = 15, [int]$DelaySec = 2)
    for ($i = 0; $i -lt $Retry; $i++) {
        if (Test-Endpoint -Url $Url) { return $true }
        Start-Sleep -Seconds $DelaySec
    }
    return $false
}

Write-Host "=== Local Dev Startup ===" -ForegroundColor Cyan

if ($KillNode) {
    Get-Process node -ErrorAction Ignore | Stop-Process -Force -ErrorAction Ignore
    Write-Host "Killed existing node processes" -ForegroundColor Yellow
}

# Start Backend
Write-Host "Starting Backend..." -ForegroundColor Yellow
$healthUrl = "http://localhost:$BackendPort/api/health"
$startBackend = {
    Push-Location $using:BackendPath
    $env:USE_MOCK_DB = "true"
    npm start
    Pop-Location
}
Start-Job -Name "backend" -ScriptBlock $startBackend | Out-Null

if (Wait-For-Health -Url $healthUrl -Retry 20 -DelaySec 2) {
    Write-Host "Backend: ONLINE ($BackendPort)" -ForegroundColor Green
}
else {
    Write-Host "Backend failed to start or health not responding" -ForegroundColor Red
}

# Start Frontend (serve build)
Write-Host "Starting Frontend..." -ForegroundColor Yellow
Push-Location $FrontendPath
if (Test-Path (Join-Path $FrontendPath "build")) {
    Start-Job -Name "frontend" -ScriptBlock { serve -s build -l $using:FrontendPort } | Out-Null
    Start-Sleep 3
    if (Test-Endpoint -Url "http://localhost:$FrontendPort") {
        Write-Host "Frontend: ONLINE ($FrontendPort)" -ForegroundColor Green
    }
    else {
        Write-Host "Frontend pending, open http://localhost:$FrontendPort manually" -ForegroundColor Yellow
    }
}
else {
    Write-Host "Frontend build not found; run: npm run build" -ForegroundColor Red
}
Pop-Location

Write-Host "\nAccess Points:" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:$BackendPort/api" -ForegroundColor White
Write-Host "  Health:   http://localhost:$BackendPort/api/health" -ForegroundColor White
Write-Host "  Frontend: http://localhost:$FrontendPort" -ForegroundColor White

Write-Host "\nTip: Use -KillNode to clear stale processes" -ForegroundColor DarkGray
