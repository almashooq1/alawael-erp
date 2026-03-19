# Fix VS Code Restart Issues - Windows Version
# This script fixes the VS Code restart/crash problem

$ErrorActionPreference = "SilentlyContinue"

# Main paths
$APPDATA = $env:APPDATA
$LOCALAPPDATA = $env:LOCALAPPDATA
$VSCodePath = "$APPDATA\Code"
$VSCodeLocalPath = "$LOCALAPPDATA\Code"

Write-Host "========================================" -ForegroundColor Blue
Write-Host "VS Code Crash Fix Script" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# 1. Clear logs
Write-Host "Cleaning up logs and cache..." -ForegroundColor Yellow
Remove-Item -Path "$VSCodePath\logs" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$VSCodeLocalPath\logs" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$VSCodePath\.cache" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$VSCodeLocalPath\.cache" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Logs and cache cleaned" -ForegroundColor Green
Write-Host ""

# 2. Clear workspace storage
Write-Host "Clearing workspace storage..." -ForegroundColor Yellow
Get-ChildItem -Path "$VSCodePath\User\workspaceStorage" -ErrorAction SilentlyContinue |
    ForEach-Object { Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
Write-Host "Workspace storage cleared" -ForegroundColor Green
Write-Host ""

# 3. Clear global storage (add-on data)
Write-Host "Clearing global storage..." -ForegroundColor Yellow
Get-ChildItem -Path "$VSCodePath\User\globalStorage" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notlike ".builtin*" } |
    ForEach-Object { Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
Write-Host "Global storage cleared" -ForegroundColor Green
Write-Host ""

# 4. Create optimized settings
Write-Host "Creating optimized settings..." -ForegroundColor Yellow
$UserPath = "$VSCodePath\User"
if (-not (Test-Path $UserPath)) {
    New-Item -Path $UserPath -ItemType Directory -Force | Out-Null
}

@{
    "editor.enablePreview" = $false
    "editor.maxTokenizationLineLength" = 2000
    "editor.largeFileOptimizations" = $true
    "files.watcherExclude" = @{
        "**/.git" = $true
        "**/node_modules/**" = $true
        "**/dist" = $true
        "**/build" = $true
    }
    "extensions.verifySignature" = $false
    "telemetry.enableTelemetry" = $false
    "telemetry.enableCrashReporter" = $false
    "typescript.tsserver.maxTsServerMemory" = 3072
    "typescript.tsserver.experimental.enableProjectDiagnostics" = $false
    "editor.formatOnSave" = $false
    "update.enableWindowsBackgroundUpdates" = $false
    "update.mode" = "manual"
} | ConvertTo-Json | Set-Content -Path "$UserPath\settings.json" -Encoding UTF8

Write-Host "Settings created" -ForegroundColor Green
Write-Host ""

# 5. Clear add-ons
Write-Host "Clearing old extensions..." -ForegroundColor Yellow
$ExtensionsPath = "$VSCodePath\User\extensions"
if (Test-Path $ExtensionsPath) {
    Get-ChildItem -Path $ExtensionsPath -ErrorAction SilentlyContinue |
        ForEach-Object { Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
}
Write-Host "Extensions cleared" -ForegroundColor Green
Write-Host ""

# 6. Clean node_modules
Write-Host "Cleaning node_modules folders..." -ForegroundColor Yellow
Get-ChildItem -Path (Get-Location) -Recurse -Directory -Filter "node_modules" -ErrorAction SilentlyContinue |
    ForEach-Object { Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
Write-Host "node_modules cleaned" -ForegroundColor Green
Write-Host ""

# 7. Final steps
Write-Host "" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host "Fix Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Close VS Code completely [Ctrl+Q]"
Write-Host "2. Wait 10 seconds"
Write-Host "3. Reopen VS Code"
Write-Host "4. Don't reinstall old extensions yet"
Write-Host ""

Write-Host "If the problem persists:" -ForegroundColor Cyan
Write-Host "1. Delete: $VSCodePath"
Write-Host "2. Delete: $VSCodeLocalPath"
Write-Host "3. Reinstall VS Code from: https://code.visualstudio.com"
Write-Host ""

Write-Host "Done at: $(Get-Date)" -ForegroundColor Blue
