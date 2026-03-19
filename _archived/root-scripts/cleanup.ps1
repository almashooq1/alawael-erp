Write-Host "=== نظام تحسين وتنظيف المشروع ===" -ForegroundColor Yellow
Write-Host ""

# 1. Clean cache
Write-Host "تنظيف الـ cache..." -ForegroundColor Yellow
npm cache clean --force 2>$null
Write-Host "✓ تم تنظيف الـ cache" -ForegroundColor Green
Write-Host ""

# 2. Remove old logs
Write-Host "حذف الملفات المؤقتة..." -ForegroundColor Yellow
Get-ChildItem -Recurse -Filter "*.log" | Remove-Item -Force -ErrorAction SilentlyContinue
Write-Host "✓ تم حذف الملفات المؤقتة" -ForegroundColor Green
Write-Host ""

# 3. Clean node_modules cache
Write-Host "تنظيف node_modules..." -ForegroundColor Yellow
Get-ChildItem -Recurse -Directory -Filter ".cache" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✓ تم تنظيف المجلدات المؤقتة" -ForegroundColor Green
Write-Host ""

# 4. Install dependencies
Write-Host "تثبيت المكتبات..." -ForegroundColor Yellow
npm install
Write-Host ""

# 5. Run tests
Write-Host "تشغيل الاختبارات..." -ForegroundColor Yellow
npm test -- --passWithNoTests 2>$null
Write-Host ""

Write-Host "=== تم إنهاء عملية التحسين بنجاح ===" -ForegroundColor Green
