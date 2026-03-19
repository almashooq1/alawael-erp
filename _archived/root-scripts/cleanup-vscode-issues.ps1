#!/usr/bin/env pwsh
# Clean up VS Code crash causes - large files and unnecessary folders

param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Continue"
$workspace = (Get-Location).Path
$totalSize = 0
$deletedSize = 0

Write-Host "Cleanup Script - VS Code Crash Fix" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN MODE] - No files will be deleted" -ForegroundColor Yellow
    Write-Host ""
}

function Get-SizeInMB {
    param([long]$bytes)
    return [math]::Round($bytes / 1MB, 2)
}

function Remove-LargeItem {
    param(
        [string]$Path,
        [string]$Description
    )
    
    if (-not (Test-Path $Path)) {
        if ($Verbose) {
            Write-Host "[SKIP] Not found: $Path" -ForegroundColor Gray
        }
        return
    }
    
    $item = Get-Item $Path -ErrorAction SilentlyContinue
    if ($null -eq $item) {
        return
    }
    
    $size = if ((Get-Item $Path).PSIsContainer) {
        (Get-ChildItem $Path -Recurse -File | Measure-Object -Property Length -Sum).Sum
    }
    else {
        (Get-Item $Path).Length
    }
    
    $sizeMB = Get-SizeInMB $size
    $totalSize += $size
    
    if ($sizeMB -gt 0.5 -and $null -ne $size) {
        if ($DryRun) {
            Write-Host "[DRY RUN] Would delete: $Description ($sizeMB MB)" -ForegroundColor Yellow
        }
        else {
            Write-Host "Deleting: $Description ($sizeMB MB)..." -ForegroundColor Green
            try {
                Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
                $deletedSize += $size
                Write-Host "OK: Deleted $Description" -ForegroundColor Green
            }
            catch {
                Write-Host "ERROR: Failed to delete $Description" -ForegroundColor Red
            }
        }
    }
}

# Step 1: Remove source maps
Write-Host "Step 1: Removing source maps (.map files)..." -ForegroundColor Yellow
$mapFiles = Get-ChildItem -Path $workspace -Recurse -Filter "*.map" -File -ErrorAction SilentlyContinue
$mapSize = 0
foreach ($file in $mapFiles) {
    $mapSize += $file.Length
    if (-not $DryRun) {
        Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
        $deletedSize += $file.Length
    }
}
$mapCount = @($mapFiles).Count
Write-Host "Found $mapCount .map files ($(Get-SizeInMB $mapSize) MB)" -ForegroundColor Cyan
Write-Host ""

# Step 2: Clean intelligent-agent folder
Write-Host "Step 2: Cleaning intelligent-agent folder..." -ForegroundColor Yellow
Remove-LargeItem "$workspace\intelligent-agent\node_modules" "intelligent-agent/node_modules"
Remove-LargeItem "$workspace\intelligent-agent\dist" "intelligent-agent/dist"
Remove-LargeItem "$workspace\intelligent-agent\.next" "intelligent-agent/.next"
Remove-LargeItem "$workspace\intelligent-agent\tensorflow" "intelligent-agent/tensorflow"
Remove-LargeItem "$workspace\intelligent-agent\models" "intelligent-agent/models"
Write-Host ""

# Step 3: Clean TensorFlow files globally
Write-Host "Step 3: Removing TensorFlow binaries..." -ForegroundColor Yellow
$tfFiles = Get-ChildItem -Path $workspace -Recurse -Filter "tensorflow.dll" -ErrorAction SilentlyContinue
foreach ($file in $tfFiles) {
    if (-not $DryRun) {
        Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
        $deletedSize += $file.Length
    }
}
Write-Host "Cleaned TensorFlow DLL files" -ForegroundColor Cyan
Write-Host ""

# Step 4: Clean other node_modules
Write-Host "Step 4: Cleaning node_modules in subdirectories..." -ForegroundColor Yellow
$nodeDirs = Get-ChildItem -Path $workspace -Directory -Filter "node_modules" -Recurse -ErrorAction SilentlyContinue | 
Where-Object { $_.FullName -ne "$workspace\node_modules" }

foreach ($dir in $nodeDirs) {
    Remove-LargeItem $dir.FullName "nested node_modules"
}
Write-Host ""

# Step 5: Clean dist and build folders
Write-Host "Step 5: Cleaning build outputs..." -ForegroundColor Yellow
Get-ChildItem -Path $workspace -Directory -Filter "dist" -Recurse -ErrorAction SilentlyContinue | 
ForEach-Object { Remove-LargeItem $_.FullName "dist folder" }
Get-ChildItem -Path $workspace -Directory -Filter "build" -Recurse -ErrorAction SilentlyContinue | 
ForEach-Object { Remove-LargeItem $_.FullName "build folder" }
Get-ChildItem -Path $workspace -Directory -Filter ".next" -Recurse -ErrorAction SilentlyContinue | 
ForEach-Object { Remove-LargeItem $_.FullName ".next folder" }
Write-Host ""

# Step 6: Clean logs
Write-Host "Step 6: Removing log files..." -ForegroundColor Yellow
$logSize = 0
$logFiles = Get-ChildItem -Path $workspace -Recurse -Filter "*.log" -File -ErrorAction SilentlyContinue
foreach ($file in $logFiles) {
    $logSize += $file.Length
    if (-not $DryRun) {
        Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
        $deletedSize += $file.Length
    }
}
$logCount = @($logFiles).Count
Write-Host "Removed $logCount log files ($(Get-SizeInMB $logSize) MB)" -ForegroundColor Cyan
Write-Host ""

# Summary
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "CLEANUP SUMMARY" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Total size of items found: $(Get-SizeInMB $totalSize) MB" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "Would delete: $(Get-SizeInMB $deletedSize) MB [DRY RUN]" -ForegroundColor Yellow
}
else {
    Write-Host "Deleted: $(Get-SizeInMB $deletedSize) MB" -ForegroundColor Green
}
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Green
Write-Host "1. Close and reopen VS Code" -ForegroundColor Gray
Write-Host "2. If you see errors, run: git status" -ForegroundColor Gray
Write-Host "3. If needed, reinstall: npm install" -ForegroundColor Gray
Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
