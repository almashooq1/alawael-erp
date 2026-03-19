# Analyze Project Size Script
$path = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    PROJECT SIZE ANALYSIS REPORT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get all files
$files = Get-ChildItem -Path $path -Recurse -File -ErrorAction SilentlyContinue
$totalStats = $files | Measure-Object -Property Length -Sum
$totalSizeMB = [math]::Round($totalStats.Sum / 1MB, 2)
$totalSizeGB = [math]::Round($totalStats.Sum / 1GB, 2)

Write-Host "TOTAL FILES: $($totalStats.Count)" -ForegroundColor Yellow
Write-Host "TOTAL SIZE: $totalSizeMB MB ($totalSizeGB GB)" -ForegroundColor Yellow
Write-Host ""

# Analyze by folder
Write-Host "========================================" -ForegroundColor Green
Write-Host "    SIZE BY FOLDER (Top 20)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$folderSizes = @{}
$files | ForEach-Object {
    $folder = $_.DirectoryName
    if (-not $folderSizes.ContainsKey($folder)) {
        $folderSizes[$folder] = 0
    }
    $folderSizes[$folder] += $_.Length
}

$folderSizes.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 20 | ForEach-Object {
    $sizeMB = [math]::Round($_.Value / 1MB, 2)
    Write-Host "$sizeMB MB - $($_.Key)" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "    SIZE BY FILE EXTENSION" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

$extSizes = @{}
$files | ForEach-Object {
    $ext = $_.Extension
    if ([string]::IsNullOrEmpty($ext)) { $ext = "(no extension)" }
    if (-not $extSizes.ContainsKey($ext)) {
        $extSizes[$ext] = @{ Count = 0; Size = 0 }
    }
    $extSizes[$ext].Count++
    $extSizes[$ext].Size += $_.Length
}

$extSizes.GetEnumerator() | Sort-Object { $_.Value.Size } -Descending | Select-Object -First 20 | ForEach-Object {
    $sizeMB = [math]::Round($_.Value.Size / 1MB, 2)
    Write-Host "$sizeMB MB ($($_.Value.Count) files) - $($_.Key)" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "    RECOMMENDATIONS" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red

# Check for node_modules
$nodeModules = Get-ChildItem -Path $path -Recurse -Directory -Filter "node_modules" -ErrorAction SilentlyContinue
if ($nodeModules) {
    Write-Host "[!] Found $($nodeModules.Count) node_modules folders - Consider using .npmignore or deleting them" -ForegroundColor Yellow
}

# Check for .git
$gitFolders = Get-ChildItem -Path $path -Recurse -Directory -Filter ".git" -ErrorAction SilentlyContinue
if ($gitFolders) {
    Write-Host "[!] Found .git folder - Consider using Git LFS for large files" -ForegroundColor Yellow
}

# Check for large files
$largeFiles = $files | Where-Object { $_.Length -gt 10MB } | Sort-Object Length -Descending
if ($largeFiles) {
    Write-Host "[!] Found $($largeFiles.Count) files larger than 10MB:" -ForegroundColor Yellow
    $largeFiles | Select-Object -First 10 | ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        Write-Host "    $sizeMB MB - $($_.Name)" -ForegroundColor DarkYellow
    }
}

Write-Host ""
Write-Host "Analysis complete!" -ForegroundColor Green