param(
    [switch]$CheckOnly,
    [int]$TimeoutSeconds = 120
)

$ErrorActionPreference = 'Stop'

function Test-DockerReady {
    try {
        docker version *> $null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Write-Step {
    param([string]$Message)
    Write-Host "[docker-recover] $Message" -ForegroundColor Cyan
}

Write-Step "Checking Docker daemon connectivity..."
if (Test-DockerReady) {
    Write-Host "Docker is already running and reachable." -ForegroundColor Green
    docker version
    exit 0
}

if ($CheckOnly) {
    Write-Host "Docker is not reachable (CheckOnly mode, no restart performed)." -ForegroundColor Yellow
    exit 1
}

$desktopExe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
if (-not (Test-Path $desktopExe)) {
    Write-Host "Docker Desktop executable not found: $desktopExe" -ForegroundColor Red
    exit 2
}

Write-Step "Stopping Docker Desktop backend processes..."
$processNames = @('Docker Desktop', 'com.docker.backend', 'com.docker.proxy', 'com.docker.vpnkit')
foreach ($name in $processNames) {
    Get-Process -Name $name -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

Write-Step "Starting Docker Desktop..."
Start-Process $desktopExe

$elapsed = 0
while ($elapsed -lt $TimeoutSeconds) {
    Start-Sleep -Seconds 5
    $elapsed += 5

    if (Test-DockerReady) {
        Write-Host "Docker daemon is ready after $elapsed seconds." -ForegroundColor Green
        docker version
        docker ps --format 'table {{.ID}}\t{{.Image}}\t{{.Status}}\t{{.Names}}'
        exit 0
    }

    Write-Host "Waiting for Docker daemon... ($elapsed/$TimeoutSeconds sec)" -ForegroundColor Yellow
}

Write-Host "Timed out waiting for Docker daemon after $TimeoutSeconds seconds." -ForegroundColor Red
exit 3
