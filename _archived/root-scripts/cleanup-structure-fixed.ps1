# Windows PowerShell Script - تنظيف وتنظيم بنية المشروع
# ALAWAEL ERP - Duplicate Folders Merger
# التاريخ: 27 فبراير 2026

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "ALAWAEL ERP - Structure Cleanup & Reorganization" -ForegroundColor Cyan
Write-Host "دمج المجلدات المكررة وتنظيف البنية" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

# تعريف المتغيرات
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backups\structure-cleanup-backup-$timestamp"

# إنشاء backup
Write-Host "[*] Creating backup..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Write-Host "[OK] Backup directory: $backupDir" -ForegroundColor Green
Write-Host ""

# Function لدمج المجلدات
function Merge-Directories {
    param(
        [string]$source,
        [string]$target,
        [string]$description
    )
    
    Write-Host "---" -ForegroundColor Gray
    Write-Host "Processing: $description" -ForegroundColor Cyan
    Write-Host "Source: $source"
    Write-Host "Target: $target"
    Write-Host ""
    
    if (Test-Path $source) {
        # Backup المجلد
        $backupName = Split-Path $source -Leaf
        Copy-Item -Path $source -Destination "$backupDir\$backupName-backup" -Recurse -Force
        Write-Host "[OK] Backup created" -ForegroundColor Green
        
        # عد الملفات
        $files = @(Get-ChildItem -Path $source -Recurse -File)
        $fileCount = $files.Count
        Write-Host "[INFO] Files found: $fileCount"
        
        if ($fileCount -gt 0) {
            # تحقق من التضاربات
            $conflicts = 0
            foreach ($file in $files) {
                $relativePath = $file.FullName -replace [regex]::Escape($source)
                $targetPath = Join-Path $target $relativePath
                if (Test-Path $targetPath) {
                    Write-Host "[WARN] Conflict: $relativePath (already exists in target)" -ForegroundColor Yellow
                    $conflicts++
                }
            }
            
            if ($conflicts -eq 0) {
                # نسخ الملفات
                Write-Host "[*] Copying files..." -ForegroundColor Yellow
                Copy-Item -Path "$source\*" -Destination $target -Recurse -Force
                Write-Host "[OK] Files copied successfully" -ForegroundColor Green
                
                # حذف المصدر
                Remove-Item -Path $source -Recurse -Force
                Write-Host "[OK] Source folder deleted" -ForegroundColor Green
            }
            else {
                Write-Host "[ERROR] Conflicts found. Manual review needed." -ForegroundColor Red
                Write-Host "[INFO] Files preserved in: $backupDir" -ForegroundColor Yellow
            }
        }
        else {
            Write-Host "[INFO] No files to merge (empty folder)" -ForegroundColor Gray
            Remove-Item -Path $source -Recurse -Force
            Write-Host "[OK] Empty folder deleted" -ForegroundColor Green
        }
    }
    else {
        Write-Host "[INFO] Source folder not found (may already be merged)" -ForegroundColor Gray
    }
    
    Write-Host ""
}

# تبدأ عملية الدمج
Write-Host "Starting merge operations..." -ForegroundColor Yellow
Write-Host ""

# 1. دمج services/services
Merge-Directories "backend\services\services" "backend\services" "backend/services/services -> backend/services"

# 2. دمج middleware/middleware
Merge-Directories "backend\middleware\middleware" "backend\middleware" "backend/middleware/middleware -> backend/middleware"

# 3. دمج routes/routes (إن وجدت)
Merge-Directories "backend\routes\routes" "backend\routes" "backend/routes/routes -> backend/routes"

# 4. دمج controllers/controllers (إن وجدت)
Merge-Directories "backend\controllers\controllers" "backend\controllers" "backend/controllers/controllers -> backend/controllers"

# 5. إصلاح البنية frontend
if (Test-Path "frontend\src\src") {
    Write-Host "---" -ForegroundColor Gray
    Write-Host "Processing: frontend/src/src cleanup" -ForegroundColor Cyan
    Write-Host ""
    
    # Backup
    Copy-Item -Path "frontend\src\src" -Destination "$backupDir\frontend-src-src-backup" -Recurse -Force
    Write-Host "[OK] Backup created" -ForegroundColor Green
    
    # نقل جميع الملفات من src/src إلى src
    $srcFiles = Get-ChildItem -Path "frontend\src\src" -Recurse -File
    foreach ($file in $srcFiles) {
        $relativePath = $file.FullName -replace [regex]::Escape("frontend\src\src")
        $targetPath = Join-Path "frontend\src" $relativePath
        
        # إنشاء المجلد الهدف إن لم يكن موجوداً
        $targetFolder = Split-Path $targetPath -Parent
        if (!(Test-Path $targetFolder)) {
            New-Item -ItemType Directory -Path $targetFolder -Force | Out-Null
        }
        
        Copy-Item -Path $file.FullName -Destination $targetPath -Force
    }
    
    Write-Host "[OK] Files moved successfully" -ForegroundColor Green
    
    # حذف المجلد المكرر
    Remove-Item -Path "frontend\src\src" -Recurse -Force
    Write-Host "[OK] Duplicate frontend/src/src deleted" -ForegroundColor Green
    Write-Host ""
}

# عرض الملخص
Write-Host "===============================================================" -ForegroundColor Green
Write-Host "Summary:" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Backup Location:" -ForegroundColor Gray
Write-Host "       $backupDir" -ForegroundColor White
Write-Host ""

Write-Host "[INFO] Next Steps:" -ForegroundColor Cyan
Write-Host "       1. Review changes: git status" -ForegroundColor Gray
Write-Host "       2. Run linter: npm run lint" -ForegroundColor Gray
Write-Host "       3. Run tests: npm test" -ForegroundColor Gray
Write-Host "       4. Fix import paths if needed" -ForegroundColor Gray
Write-Host "       5. Commit changes" -ForegroundColor Gray
Write-Host ""

Write-Host "[OK] Cleanup completed!" -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Green
