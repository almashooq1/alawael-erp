# Restore all critical .removed files
# This script restores all essential middleware, models, and services

Write-Host "🔧 Starting critical file restoration..." -ForegroundColor Cyan

# Define critical middleware files to restore
$middleware_files = @(
    "requestValidation"
)

# Define critical model files to restore
$model_files = @(
    "Account",
    "FinancialTransaction",
    "Payment",
    "finance.model"
)

# Define critical service files to restore
$service_files = @(
    "advanced.models"
)

# Restore middleware
Write-Host "`n📁 Restoring middleware files..." -ForegroundColor Yellow
cd "backend\middleware"
foreach ($file in $middleware_files) {
    $removed_file = "$file.js.removed"
    if (Test-Path $removed_file) {
        Rename-Item $removed_file "$file.js" -Force
        Write-Host "✅ Restored: $file.js"
    } else {
        Write-Host "⚠️  Not found: $removed_file" -ForegroundColor DarkYellow
    }
}

# Restore models
Write-Host "`n📁 Restoring model files..." -ForegroundColor Yellow
cd "..\models"
foreach ($file in $model_files) {
    $removed_file = "$file.js.removed"
    if (Test-Path $removed_file) {
        Rename-Item $removed_file "$file.js" -Force
        Write-Host "✅ Restored: $file.js"
    } else {
        Write-Host "⚠️  Not found: $removed_file" -ForegroundColor DarkYellow
    }
}

# Restore services
Write-Host "`n📁 Restoring service files..." -ForegroundColor Yellow
cd "..\services"
foreach ($file in $service_files) {
    $removed_file = "$file.js.removed"
    if (Test-Path $removed_file) {
        Rename-Item $removed_file "$file.js" -Force
        Write-Host "✅ Restored: $file.js"
    } else {
        Write-Host "⚠️  Not found: $removed_file" -ForegroundColor DarkYellow
    }
}

Write-Host "`n✅ File restoration complete!" -ForegroundColor Green
cd ..
