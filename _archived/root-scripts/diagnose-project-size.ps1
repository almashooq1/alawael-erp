# Diagnostic: Analyze Project Size and Large Files
# Purpose: Find what's slowing VS Code

Write-Host "🔍 Starting Project Diagnostics..." -ForegroundColor Cyan
Write-Host ""

$projectRoot = Get-Location

# 1. Calculate total size
Write-Host "📊 Calculating total project size..." -ForegroundColor Yellow
$totalSize = (Get-ChildItem -Path $projectRoot -Recurse -File -ErrorAction SilentlyContinue |
    Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "✓ Total Size: $([math]::Round($totalSize, 2)) MB" -ForegroundColor Green
Write-Host ""

# 2. Find largest directories
Write-Host "📂 Top 15 Largest Directories:" -ForegroundColor Yellow
Get-ChildItem -Path $projectRoot -Directory -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notlike '.git' } |
    ForEach-Object {
        $size = (Get-ChildItem -Path $_.FullName -Recurse -File -ErrorAction SilentlyContinue |
            Measure-Object -Property Length -Sum).Sum / 1MB
        [PSCustomObject]@{
            Path = $_.FullName.Replace($projectRoot, '.')
            SizeMB = [math]::Round($size, 2)
        }
    } |
    Sort-Object SizeMB -Descending |
    Select-Object -First 15 |
    Format-Table -AutoSize

# 3. Find node_modules folders
Write-Host "📦 node_modules Directories Found:" -ForegroundColor Yellow
$nodeModules = Get-ChildItem -Path $projectRoot -Directory -Recurse -Filter "node_modules" -ErrorAction SilentlyContinue
Write-Host "Count: $($nodeModules.Count)" -ForegroundColor Cyan
foreach ($nm in $nodeModules) {
    $size = (Get-ChildItem -Path $nm.FullName -Recurse -File -ErrorAction SilentlyContinue |
        Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  - $($nm.FullName.Replace($projectRoot, '.')) [$([math]::Round($size, 2)) MB]" -ForegroundColor Gray
}
Write-Host ""

# 4. Find .map files
Write-Host "🗺️ Source Map Files:" -ForegroundColor Yellow
$mapFiles = Get-ChildItem -Path $projectRoot -Filter "*.map" -Recurse -File -ErrorAction SilentlyContinue
$mapSize = ($mapFiles | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "Count: $($mapFiles.Count) | Total Size: $([math]::Round($mapSize, 2)) MB" -ForegroundColor Cyan
Write-Host ""

# 5. Find .log files
Write-Host "📝 Log Files (*.log):" -ForegroundColor Yellow
$logFiles = Get-ChildItem -Path $projectRoot -Filter "*.log" -Recurse -File -ErrorAction SilentlyContinue
$logSize = ($logFiles | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "Count: $($logFiles.Count) | Total Size: $([math]::Round($logSize, 2)) MB" -ForegroundColor Cyan
Write-Host ""

# 6. Find dist/build folders
Write-Host "🏗️ Build Output Directories:" -ForegroundColor Yellow
$buildDirs = Get-ChildItem -Path $projectRoot -Directory -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -in @('dist', 'build', '.next', 'coverage') }
Write-Host "Count: $($buildDirs.Count)" -ForegroundColor Cyan
foreach ($dir in $buildDirs) {
    $size = (Get-ChildItem -Path $dir.FullName -Recurse -File -ErrorAction SilentlyContinue |
        Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  - $($dir.FullName.Replace($projectRoot, '.')) [$([math]::Round($size, 2)) MB]" -ForegroundColor Gray
}
Write-Host ""

# 7. Find largest single files
Write-Host "📄 Top 20 Largest Files:" -ForegroundColor Yellow
Get-ChildItem -Path $projectRoot -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -notin @('.map', '.pack', '.idx') } |
    Sort-Object Length -Descending |
    Select-Object -First 20 |
    ForEach-Object {
        [PSCustomObject]@{
            File = $_.FullName.Replace($projectRoot, '.')
            SizeMB = [math]::Round($_.Length / 1MB, 2)
            Extension = $_.Extension
        }
    } |
    Format-Table -AutoSize

# 8. Count Markdown files
Write-Host "📋 Documentation Files:" -ForegroundColor Yellow
$mdFiles = Get-ChildItem -Path $projectRoot -Filter "*.md" -File -ErrorAction SilentlyContinue | Where-Object { $_.DirectoryName -eq $projectRoot }
Write-Host "Root-level .md files: $($mdFiles.Count)" -ForegroundColor Cyan
Write-Host ""

# 9. VS Code cache check
Write-Host "🗂️ VS Code Cache:" -ForegroundColor Yellow
$vscodeFolders = @('.vscode', 'node_modules/.cache')
foreach ($folder in $vscodeFolders) {
    $path = Join-Path $projectRoot $folder
    if (Test-Path $path) {
        $size = (Get-ChildItem -Path $path -Recurse -File -ErrorAction SilentlyContinue |
            Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "  - $folder [$([math]::Round($size, 2)) MB]" -ForegroundColor Gray
    }
}
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total Project Size: $([math]::Round($totalSize, 2)) MB" -ForegroundColor White
Write-Host "node_modules folders: $($nodeModules.Count)" -ForegroundColor White
Write-Host "Source Maps: $($mapFiles.Count) files ($([math]::Round($mapSize, 2)) MB)" -ForegroundColor White
Write-Host "Log Files: $($logFiles.Count) files ($([math]::Round($logSize, 2)) MB)" -ForegroundColor White
Write-Host "Build Outputs: $($buildDirs.Count) folders" -ForegroundColor White
Write-Host ""

# Recommendations
Write-Host "💡 RECOMMENDATIONS:" -ForegroundColor Yellow
Write-Host ""

if ($nodeModules.Count -gt 3) {
    Write-Host "⚠️ Too many node_modules folders! Consider:" -ForegroundColor Red
    Write-Host "   - Use workspace root for shared dependencies" -ForegroundColor White
    Write-Host "   - Run cleanup script to remove duplicates" -ForegroundColor White
    Write-Host ""
}

if ($mapSize -gt 100) {
    Write-Host "⚠️ Source maps are taking $([math]::Round($mapSize, 2)) MB!" -ForegroundColor Red
    Write-Host "   - Add *.map to .gitignore" -ForegroundColor White
    Write-Host "   - Delete existing .map files" -ForegroundColor White
    Write-Host ""
}

if ($logSize -gt 10) {
    Write-Host "⚠️ Log files taking $([math]::Round($logSize, 2)) MB!" -ForegroundColor Red
    Write-Host "   - Delete old log files" -ForegroundColor White
    Write-Host "   - Add *.log to .gitignore" -ForegroundColor White
    Write-Host ""
}

if ($buildDirs.Count -gt 5) {
    Write-Host "⚠️ Multiple build output folders found!" -ForegroundColor Red
    Write-Host "   - Delete dist/build/.next folders" -ForegroundColor White
    Write-Host "   - These can be rebuilt anytime" -ForegroundColor White
    Write-Host ""
}

if ($totalSize -gt 1000) {
    Write-Host "⚠️ Project is very large ($([math]::Round($totalSize, 2)) MB)!" -ForegroundColor Red
    Write-Host "   - VS Code will be slow with projects > 1GB" -ForegroundColor White
    Write-Host "   - Run the cleanup script immediately" -ForegroundColor White
    Write-Host ""
}

Write-Host "✅ Diagnostic complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Run .\cleanup-vscode-project.ps1 to fix issues" -ForegroundColor Cyan
