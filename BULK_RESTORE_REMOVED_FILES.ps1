# Bulk Restore ALL .removed Files - PowerShell Version
# This script restores all .removed files in the backend folder

Write-Host "🔧 Starting bulk restoration of .removed files..." -ForegroundColor Cyan
Write-Host ""

# Set working directory
Set-Location "backend" -ErrorAction Stop

# Function to restore files in a directory
function Restore-Directory {
    param([string]$DirectoryPath)

    if (-not (Test-Path $DirectoryPath)) {
        Write-Host "❌ Directory not found: $DirectoryPath" -ForegroundColor Red
        return
    }

    Write-Host "📁 Processing: $DirectoryPath/" -ForegroundColor Yellow

    $files = @(Get-ChildItem -Path $DirectoryPath -Filter "*.removed" -File 2>/dev/null)
    $count = 0

    foreach ($file in $files) {
        $newName = $file.Name -replace '\.removed$', ''
        $newPath = Join-Path $file.DirectoryName $newName

        try {
            Rename-Item -Path $file.FullName -NewName $newName -Force
            Write-Host "  ✅ $newName" -ForegroundColor Green
            $count++
        }
        catch {
            Write-Host "  ⚠️  Failed to restore: $($file.Name)" -ForegroundColor Yellow
        }
    }

    Write-Host "  📊 Restored $count files in $DirectoryPath" -ForegroundColor Cyan
    Write-Host ""
}

# Restore all directories
Restore-Directory "middleware"
Restore-Directory "services"
Restore-Directory "models"
Restore-Directory "utils"
Restore-Directory "config"
Restore-Directory "db"
Restore-Directory "routes"

Write-Host "✅ Restoration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary: All .removed files have been restored" -ForegroundColor Cyan
Write-Host ""
Write-Host "🧪 Next step: Run tests to verify" -ForegroundColor Yellow
Write-Host "   Command: npm test" -ForegroundColor Gray
