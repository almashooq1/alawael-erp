# 🧹 Windows PowerShell Script - تنظيف وتنظيم بنية المشروع
# ALAWAEL ERP - Duplicate Folders Merger
# التاريخ: 27 فبراير 2026

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     ALAWAEL ERP - Structure Cleanup & Reorganization           ║" -ForegroundColor Cyan
Write-Host "║          دمج المجلدات المكررة وتنظيف البنية                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# تعريف المتغيرات
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backups\structure-cleanup-backup-$timestamp"
$logFile = "structure-cleanup.log"
$errorsFile = "structure-cleanup-errors.log"

# إنشاء backup
Write-Host "📦 Creating backup..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Write-Host "   Backup directory: $backupDir" -ForegroundColor Green
Write-Host ""

# Function لدمج المجلدات
function Merge-Directories {
    param(
        [string]$source,
        [string]$target,
        [string]$description
    )
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "Processing: $description" -ForegroundColor Cyan
    Write-Host "Source: $source"
    Write-Host "Target: $target"
    Write-Host ""
    
    if (Test-Path $source) {
        # Backup المجلد
        $backupName = Split-Path $source -Leaf
        Copy-Item -Path $source -Destination "$backupDir\$backupName-backup" -Recurse -Force
        Write-Host "   ✅ Backup created" -ForegroundColor Green
        
        # عد الملفات
        $files = @(Get-ChildItem -Path $source -Recurse -File)
        $fileCount = $files.Count
        Write-Host "   📄 Files found: $fileCount"
        
        if ($fileCount -gt 0) {
            # تحقق من التضاربات
            $conflicts = 0
            $conflictList = @()
            
            foreach ($file in $files) {
                $relPath = $file.FullName.Replace($source, "").TrimStart("\")
                $targetPath = Join-Path $target $relPath
                
                if (Test-Path $targetPath) {
                    $conflicts++
                    $conflictList += $relPath
                }
            }
            
            if ($conflicts -eq 0) {
                # نقل الملفات
                Copy-Item -Path "$source\*" -Destination $target -Recurse -Force
                Write-Host "   ✅ Successfully moved all files" -ForegroundColor Green
                
                # حذف المجلد الأصلي
                Remove-Item -Path $source -Recurse -Force -ErrorAction SilentlyContinue
                
                if (-not (Test-Path $source)) {
                    Write-Host "   ✅ Removed source directory" -ForegroundColor Green
                }
                else {
                    Write-Host "   ❌ Could not remove source directory" -ForegroundColor Red
                }
            }
            else {
                Write-Host "   ❌ Found $conflicts conflicts - manual review needed" -ForegroundColor Red
                Write-Host "      Conflicting files:" -ForegroundColor Yellow
                $conflictList | ForEach-Object { Write-Host "        - $_" -ForegroundColor Yellow }
                return $false
            }
        }
        else {
            Write-Host "   ℹ️  Empty directory" -ForegroundColor Gray
        }
    }
    else {
        Write-Host "   ℹ️  Directory does not exist (skipping)" -ForegroundColor Gray
    }
    Write-Host ""
    return $true
}

# ═════════════════════════════════════════════════════════════════════
# 1️⃣  BACKEND SERVICES
# ═════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "🔵 PHASE 1: Backend Services" -ForegroundColor Blue
Write-Host "═════════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

$result1 = Merge-Directories `
    -source "backend\services\services" `
    -target "backend\services" `
    -description "Merging backend\services\services → backend\services"

# ═════════════════════════════════════════════════════════════════════
# 2️⃣  BACKEND MIDDLEWARE
# ═════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "🔵 PHASE 2: Backend Middleware" -ForegroundColor Blue
Write-Host "═════════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

$result2 = Merge-Directories `
    -source "backend\middleware\middleware" `
    -target "backend\middleware" `
    -description "Merging backend\middleware\middleware → backend\middleware"

# ═════════════════════════════════════════════════════════════════════
# 3️⃣  BACKEND ROUTES (if exists)
# ═════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "🔵 PHASE 3: Backend Routes" -ForegroundColor Blue
Write-Host "═════════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

if (Test-Path "backend\routes\routes") {
    $result3 = Merge-Directories `
        -source "backend\routes\routes" `
        -target "backend\routes" `
        -description "Merging backend\routes\routes → backend\routes"
}
else {
    Write-Host "   ℹ️  backend\routes\routes does not exist (skipping)" -ForegroundColor Gray
}

# ═════════════════════════════════════════════════════════════════════
# 4️⃣  VALIDATION
# ═════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "🧪 VALIDATION PHASE" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

Write-Host "✓ Checking linter..." -ForegroundColor Cyan
try {
    $lintOutput = npm run lint 2>&1
    if ($lastexitcode -ne 0) {
        Write-Host "   ⚠️  Lint warnings/errors detected" -ForegroundColor Yellow
    }
    else {
        Write-Host "   ✅ No linting issues" -ForegroundColor Green
    }
}
catch {
    Write-Host "   ❌ Error running linter" -ForegroundColor Red
}

Write-Host ""

# ═════════════════════════════════════════════════════════════════════
# SUMMARY
# ═════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    CLEANUP SUMMARY                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "📊 Results:" -ForegroundColor Green
if ($result1) {
    Write-Host "   ✅ Backend services merged successfully" -ForegroundColor Green
}
else {
    Write-Host "   ⚠️  Backend services merge encountered issues" -ForegroundColor Yellow
}

if ($result2) {
    Write-Host "   ✅ Backend middleware merged successfully" -ForegroundColor Green
}
else {
    Write-Host "   ⚠️  Backend middleware merge encountered issues" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 Backup Location:" -ForegroundColor Gray
Write-Host "   $backupDir" -ForegroundColor White
Write-Host ""

Write-Host "🔄 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Review changes: git status" -ForegroundColor Gray
Write-Host "   2. Run linter: npm run lint" -ForegroundColor Gray
Write-Host "   3. Run tests: npm test" -ForegroundColor Gray
Write-Host "   4. Fix import paths if needed" -ForegroundColor Gray
Write-Host "   5. Commit: git commit -am 'refactor: reorganize project structure'" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Cleanup completed!" -ForegroundColor Green
