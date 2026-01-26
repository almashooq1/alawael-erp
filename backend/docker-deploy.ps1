#!/usr/bin/env pwsh
# Quick Docker Build & Deploy Script
# Usage: .\docker-deploy.ps1

param(
    [string]$DockerUsername = "your-docker-username",
    [string]$ImageName = "alawael-backend",
    [string]$ImageTag = "v1",
    [string]$Action = "build"  # build, push, test, all
)

$ErrorActionPreference = "Stop"

function Write-Banner {
    param([string]$Text)
    Write-Host "`n$([char]27)[1;36m═══════════════════════════════════════════════════════$([char]27)[0m" -ForegroundColor Cyan
    Write-Host "$([char]27)[1;32m► $Text$([char]27)[0m" -ForegroundColor Green
    Write-Host "$([char]27)[1;36m═══════════════════════════════════════════════════════$([char]27)[0m" -ForegroundColor Cyan
}

function Write-Status {
    param([string]$Text)
    Write-Host "$([char]27)[1;33m✓ $Text$([char]27)[0m" -ForegroundColor Yellow
}

# Check Docker installation
Write-Banner "Checking Docker Installation"
try {
    $dockerVersion = docker --version
    Write-Status "Docker: $dockerVersion"
} catch {
    Write-Host "$([char]27)[1;31m✗ Docker not installed or not in PATH$([char]27)[0m" -ForegroundColor Red
    exit 1
}

$backendPath = "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\backend"
Set-Location $backendPath
Write-Status "Working directory: $backendPath"

# ============= BUILD =============
if ($Action -eq "build" -or $Action -eq "all") {
    Write-Banner "Building Docker Image"
    Write-Host "Image: $DockerUsername/$ImageName`:$ImageTag" -ForegroundColor Cyan
    
    docker build -t "$DockerUsername/$ImageName`:$ImageTag" -t "$DockerUsername/$ImageName`:latest" .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Build successful!"
        docker images | Select-String $ImageName
    } else {
        Write-Host "$([char]27)[1;31m✗ Build failed$([char]27)[0m" -ForegroundColor Red
        exit 1
    }
}

# ============= TEST =============
if ($Action -eq "test" -or $Action -eq "all") {
    Write-Banner "Testing with Docker Compose"
    
    Write-Status "Starting container..."
    docker-compose up -d
    
    Start-Sleep -Seconds 8
    
    Write-Status "Testing endpoints..."
    $endpoints = @(
        @{uri="http://localhost:3001/health"; name="Health"},
        @{uri="http://localhost:3001/test-first"; name="Test First"},
        @{uri="http://localhost:3001/phases-29-33"; name="Phases 29-33"}
    )
    
    $passCount = 0
    foreach ($ep in $endpoints) {
        try {
            $response = Invoke-RestMethod -Uri $ep.uri -TimeoutSec 3
            Write-Host "  ✓ $($ep.name) - 200 OK" -ForegroundColor Green
            $passCount++
        } catch {
            Write-Host "  ✗ $($ep.name) - FAILED" -ForegroundColor Red
        }
    }
    
    Write-Status "Results: $passCount/$($endpoints.Count) passed"
    
    Write-Status "Stopping container..."
    docker-compose down
}

# ============= PUSH =============
if ($Action -eq "push" -or $Action -eq "all") {
    Write-Banner "Pushing to Docker Hub"
    
    Write-Status "Logging in to Docker Hub..."
    docker login
    
    Write-Status "Pushing image..."
    docker push "$DockerUsername/$ImageName`:$ImageTag"
    docker push "$DockerUsername/$ImageName`:latest"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Push successful!"
        Write-Host "Image available at: https://hub.docker.com/r/$DockerUsername/$ImageName" -ForegroundColor Cyan
    } else {
        Write-Host "$([char]27)[1;31m✗ Push failed$([char]27)[0m" -ForegroundColor Red
        exit 1
    }
}

# ============= SUMMARY =============
Write-Banner "Deployment Summary"
Write-Host "
Docker Image: $DockerUsername/$ImageName`:$ImageTag
Location: $backendPath
Actions Completed: $Action

Next Steps:
1. SSH to Hostinger VPS: ssh root@<your-vps-ip>
2. Install Docker: curl -fsSL https://get.docker.com | sh
3. Pull image: docker pull $DockerUsername/$ImageName`:$ImageTag
4. Run: docker run -d -p 3001:3001 $DockerUsername/$ImageName`:$ImageTag
5. Test: curl http://localhost:3001/health

Full guide: DOCKER_DEPLOYMENT_GUIDE.md
" -ForegroundColor Cyan

Write-Status "Complete!"
