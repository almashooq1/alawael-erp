# ══════════════════════════════════════════════════════════════
# VSCODE PERFORMANCE FIX - تنظ يف شامل لتحسين الأداء
# ══════════════════════════════════════════════════════════════
# Purpose: Clean unnecessary files to reduce VS Code load
# الهدف: حذف الملفات غير الضرورية لتقليل الحمل على VS Code
# ══════════════════════════════════════════════════════════════

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "    🧹 VS Code Performance Cleanup Script" -ForegroundColor Cyan
Write-Host "       تنظيف شامل لتحسين أداء VS Code" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Get-Location
$cleanupLog = Join-Path $projectRoot "cleanup-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"

# Initialize counters
$totalSizeFreed = 0
$filesDeleted = 0
$dirsDeleted = 0

function Write-CleanupLog {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
    Add-Content -Path $cleanupLog -Value $Message
}

Write-CleanupLog "Starting cleanup at $(Get-Date)" "Yellow"
Write-CleanupLog "Project Root: $projectRoot" "Yellow"
Write-CleanupLog ""

# ═══════════════════════════════════════════════════════════════
# STEP 1: Remove Source Maps (.map files)
# ═══════════════════════════════════════════════════════════════

Write-CleanupLog "📍 STEP 1: Removing source maps (*.map files)..." "Cyan"
Write-Host ""

$mapFiles = Get-ChildItem -Path $projectRoot -Filter "*.map" -Recurse -File -ErrorAction SilentlyContinue
$mapSize = ($mapFiles | Measure-Object -Property Length -Sum).Sum / 1MB

if ($mapFiles.Count -gt 0) {
    Write-CleanupLog "Found: $($mapFiles.Count) map files ($([math]::Round($mapSize, 2)) MB)" "Yellow"

    foreach ($file in $mapFiles) {
        try {
            Remove-Item -Path $file.FullName -Force -ErrorAction Stop
            $filesDeleted++
        } catch {
            Write-CleanupLog "  ⚠️ Failed to delete: $($file.FullName)" "Red"
        }
    }

    $totalSizeFreed += $mapSize
    Write-CleanupLog "✓ Removed $($mapFiles.Count) map files ($([math]::Round($mapSize, 2)) MB freed)" "Green"
} else {
    Write-CleanupLog "✓ No map files found" "Green"
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 2: Remove Log Files
# ═══════════════════════════════════════════════════════════════

Write-CleanupLog "📍 STEP 2: Removing log files (*.log)..." "Cyan"
Write-Host ""

$logFiles = Get-ChildItem -Path $projectRoot -Filter "*.log" -Recurse -File -ErrorAction SilentlyContinue
$logSize = ($logFiles | Measure-Object -Property Length -Sum).Sum / 1MB

if ($logFiles.Count -gt 0) {
    Write-CleanupLog "Found: $($logFiles.Count) log files ($([math]::Round($logSize, 2)) MB)" "Yellow"

    foreach ($file in $logFiles) {
        try {
            Remove-Item -Path $file.FullName -Force -ErrorAction Stop
            $filesDeleted++
        } catch {
            Write-CleanupLog "  ⚠️ Failed to delete: $($file.FullName)" "Red"
        }
    }

    $totalSizeFreed += $logSize
    Write-CleanupLog "✓ Removed $($logFiles.Count) log files ($([math]::Round($logSize, 2)) MB freed)" "Green"
} else {
    Write-CleanupLog "✓ No log files found" "Green"
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 3: Remove Build Outputs (dist, build, .next, out)
# ═══════════════════════════════════════════════════════════════

Write-CleanupLog "📍 STEP 3: Removing build outputs..." "Cyan"
Write-Host ""

$buildDirs = @('dist', 'build', '.next', 'out', 'coverage')

foreach ($dirName in $buildDirs) {
    $dirs = Get-ChildItem -Path $projectRoot -Directory -Recurse -Filter $dirName -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notlike "*\node_modules\*" }

    if ($dirs.Count -gt 0) {
        Write-CleanupLog "  Removing $dirName folders..." "Yellow"

        foreach ($dir in $dirs) {
            try {
                $dirSize = (Get-ChildItem -Path $dir.FullName -Recurse -File -ErrorAction SilentlyContinue |
                    Measure-Object -Property Length -Sum).Sum / 1MB

                Remove-Item -Path $dir.FullName -Recurse -Force -ErrorAction Stop
                $dirsDeleted++
                $totalSizeFreed += $dirSize

                Write-CleanupLog "    ✓ $($dir.FullName.Replace($projectRoot, '.')) [$([math]::Round($dirSize, 2)) MB]" "Gray"
            } catch {
                Write-CleanupLog "    ⚠️ Failed: $($dir.FullName)" "Red"
            }
        }
    }
}

Write-CleanupLog "✓ Build outputs removed" "Green"
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 4: Find duplicate node_modules (report only)
# ═══════════════════════════════════════════════════════════════

Write-CleanupLog "📍 STEP 4: Analyzing node_modules folders..." "Cyan" Write-Host ""

$nodeModules = Get-ChildItem -Path $projectRoot -Directory -Recurse -Filter "node_modules" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notlike "*\node_modules\*" }  # Exclude nested

Write-CleanupLog "Found $($nodeModules.Count) top-level node_modules folders:" "Yellow"

foreach ($nm in $nodeModules) {
    $size = (Get-ChildItem -Path $nm.FullName -Recurse -File -ErrorAction SilentlyContinue |
        Measure-Object -Property Length -Sum).Sum / 1MB
    Write-CleanupLog "  - $($nm.FullName.Replace($projectRoot, '.')) [$([math]::Round($size, 2)) MB]" "Gray"
}

Write-CleanupLog ""
Write-CleanupLog "⚠️ INFO: node_modules NOT deleted (required for projects)" "Yellow"
Write-CleanupLog "   If you want to clean and reinstall:" "Yellow"
Write-CleanupLog "   1. Delete specific node_modules folders manually" "Yellow"
Write-CleanupLog "   2. Run: npm install" "Yellow"
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 5: Clean VS Code Cache
# ═══════════════════════════════════════════════════════════════

Write-CleanupLog "📍 STEP 5: Cleaning VS Code cache..." "Cyan"
Write-Host ""

# User VS Code cache
$vscodeCachePath = "$env:APPDATA\Code\Cache"
$vscodeGPUCache = "$env:APPDATA\Code\GPUCache"
$vscodeCachedData = "$env:APPDATA\Code\CachedData"

$cachePaths = @($vscodeCachePath, $vscodeGPUCache, $vscodeCachedData)

foreach ($cachePath in $cachePaths) {
    if (Test-Path $cachePath) {
        try {
            $cacheSize = (Get-ChildItem -Path $cachePath -Recurse -File -ErrorAction SilentlyContinue |
                Measure-Object -Property Length -Sum).Sum / 1MB

            Remove-Item -Path $cachePath -Recurse -Force -ErrorAction Stop
            $totalSizeFreed += $cacheSize

            Write-CleanupLog "  ✓ Cleared: $cachePath [$([math]::Round($cacheSize, 2)) MB]" "Green"
        } catch {
            Write-CleanupLog "  ⚠️ Failed to clear: $cachePath" "Red"
        }
    }
}

# Workspace storage
$workspaceStorage = "$env:APPDATA\Code\User\workspaceStorage"
if (Test-Path $workspaceStorage) {
    try {
        $storageSize = (Get-ChildItem -Path $workspaceStorage -Recurse -File -ErrorAction SilentlyContinue |
            Measure-Object -Property Length -Sum).Sum / 1MB

        # Only clear old workspace folders (older than 7 days)
        $oldFolders = Get-ChildItem -Path $workspaceStorage -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) }

        foreach ($folder in $oldFolders) {
            Remove-Item -Path $folder.FullName -Recurse -Force -ErrorAction SilentlyContinue
        }

        Write-CleanupLog "  ✓ Cleared old workspace storage ($oldFolders.Count folders)" "Green"
    } catch {
        Write-CleanupLog "  ⚠️ Failed to clear workspace storage" "Red"
    }
}

Write-CleanupLog "✓ VS Code cache cleaned" "Green"
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 6: Update .gitignore
# ═══════════════════════════════════════════════════════════════

Write-CleanupLog "📍 STEP 6: Updating .gitignore..." "Cyan"
Write-Host ""

$gitignorePath = Join-Path $projectRoot ".gitignore"
$gitignoreEntries = @"

# ═══════════════════════════════════════════════════════════════
# Added by cleanup script - VS Code Performance
# ═══════════════════════════════════════════════════════════════

# Source maps
*.map

# Log files
*.log
logs/
*.log.*

# Build outputs
dist/
build/
.next/
out/
coverage/

# VS Code
.vscode/settings.json.backup
.vscode/*.log

# Temporary files
*.tmp
*.temp
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db
desktop.ini

# Node
.npm
.node_repl_history

# Testing
.nyc_output/
test-results/
playwright-report/
"@

if (Test-Path $gitignorePath) {
    $currentContent = Get-Content -Path $gitignorePath -Raw -ErrorAction SilentlyContinue

    if ($currentContent -notlike "*Added by cleanup script*") {
        Add-Content -Path $gitignorePath -Value $gitignoreEntries
        Write-CleanupLog "  ✓ .gitignore updated with new exclusions" "Green"
    } else {
        Write-CleanupLog "  ✓ .gitignore already contains cleanup entries" "Gray"
    }
} else {
    Set-Content -Path $gitignorePath -Value $gitignoreEntries
    Write-CleanupLog "  ✓ Created new .gitignore" "Green"
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════

Write-Host ""
Write-CleanupLog "═══════════════════════════════════════════════════════" "Cyan"
Write-CleanupLog "    ✅ CLEANUP COMPLETE - النظافة مكتملة" "Green"
Write-CleanupLog "═══════════════════════════════════════════════════════" "Cyan"
Write-Host ""

Write-CleanupLog "📊 SUMMARY:" "Yellow"
Write-CleanupLog "  • Files deleted: $filesDeleted" "White"
Write-CleanupLog "  • Directories deleted: $dirsDeleted" "White"
Write-CleanupLog "  • Total space freed: $([math]::Round($totalSizeFreed, 2)) MB" "White"
Write-Host ""

Write-CleanupLog "💡 NEXT STEPS - الخطوات التالية:" "Yellow"
Write-CleanupLog ""
Write-CleanupLog "1. Apply optimized settings:" "White"
Write-CleanupLog "   Copy: .vscode/settings.optimized.json" "Gray"
Write-CleanupLog "   To:   .vscode/settings.json" "Gray"
Write-CleanupLog ""
Write-CleanupLog "2. Restart VS Code completely" "White"
Write-CleanupLog "   انسخ الملف: .vscode/settings.optimized.json" "Gray"
Write-CleanupLog "   إلى: .vscode/settings.json" "Gray"
Write-CleanupLog "   ثم أعد تشغيل VS Code" "Gray"
Write-CleanupLog ""
Write-CleanupLog "3. Monitor performance:" "White"
Write-CleanupLog "   - Check for Extension host crashes (should be gone)" "Gray"
Write-CleanupLog "   - Git errors should disappear" "Gray"
Write-CleanupLog "   - Terraform won't scan node_modules" "Gray"
Write-CleanupLog ""

Write-CleanupLog "📄 Full report saved to: $cleanupLog" "Cyan"
Write-Host ""
Write-Host "✅ Done! الآن أعد تشغيل VS Code." -ForegroundColor Green
Write-Host ""
