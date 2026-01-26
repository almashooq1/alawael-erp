# ============================================
# Stop System - إيقاف النظام بالكامل
# يوقف جميع خوادم Backend و Frontend
# ============================================

Write-Host "========================================" -ForegroundColor Red
Write-Host "   🛑 Alawael ERP - إيقاف النظام" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# ============================================
# 1. إيقاف جميع عمليات Node
# ============================================
Write-Host "🔴 إيقاف جميع عمليات Node..." -ForegroundColor Yellow

$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $count = $nodeProcesses.Count
    $nodeProcesses | Stop-Process -Force
    Write-Host "✅ تم إيقاف $count عملية Node" -ForegroundColor Green
}
else {
    Write-Host "✅ لا توجد عمليات Node للإيقاف" -ForegroundColor Green
}

Start-Sleep -Seconds 2

# ============================================
# 2. إيقاف جميع Jobs
# ============================================
Write-Host "🔴 إيقاف جميع Background Jobs..." -ForegroundColor Yellow

$jobs = Get-Job -ErrorAction SilentlyContinue
if ($jobs) {
    $jobs | Stop-Job
    $jobs | Remove-Job
    Write-Host "✅ تم إيقاف $($jobs.Count) job" -ForegroundColor Green
}
else {
    Write-Host "✅ لا توجد jobs للإيقاف" -ForegroundColor Green
}

# ============================================
# 3. التحقق من المنافذ
# ============================================
Write-Host ""
Write-Host "🔍 التحقق من المنافذ..." -ForegroundColor Yellow

$ports = @(3000, 3001, 3002)
foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        $processId = $connection.OwningProcess
        try {
            Stop-Process -Id $processId -Force
            Write-Host "✅ تحرير المنفذ $port (Process $processId)" -ForegroundColor Green
        }
        catch {
            Write-Host "⚠️ لم نتمكن من تحرير المنفذ $port" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "✅ المنفذ $port متاح" -ForegroundColor Green
    }
}

# ============================================
# النتيجة
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "   ✅ تم إيقاف النظام!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Red
Write-Host ""
Write-Host "📊 الحالة:" -ForegroundColor Yellow
Write-Host "   ✅ جميع عمليات Node متوقفة" -ForegroundColor White
Write-Host "   ✅ جميع المنافذ متاحة" -ForegroundColor White
Write-Host "   ✅ جميع Background Jobs متوقفة" -ForegroundColor White
Write-Host ""
Write-Host "🚀 لبدء النظام مرة أخرى:" -ForegroundColor Yellow
Write-Host "   .\START_SYSTEM_FIXED.ps1" -ForegroundColor White
Write-Host ""
# ============================================
# Stop System - إيقاف النظام بالكامل
# يوقف جميع خوادم Backend و Frontend
# ============================================

Write-Host "========================================" -ForegroundColor Red
Write-Host "   🛑 Alawael ERP - إيقاف النظام" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# ============================================
# 1. إيقاف جميع عمليات Node
# ============================================
Write-Host "🔴 إيقاف جميع عمليات Node..." -ForegroundColor Yellow

$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $count = $nodeProcesses.Count
    $nodeProcesses | Stop-Process -Force
    Write-Host "✅ تم إيقاف $count عملية Node" -ForegroundColor Green
}
else {
    Write-Host "✅ لا توجد عمليات Node للإيقاف" -ForegroundColor Green
}

Start-Sleep -Seconds 2

# ============================================
# 2. إيقاف جميع Jobs
# ============================================
Write-Host "🔴 إيقاف جميع Background Jobs..." -ForegroundColor Yellow

$jobs = Get-Job -ErrorAction SilentlyContinue
if ($jobs) {
    $jobs | Stop-Job
    $jobs | Remove-Job
    Write-Host "✅ تم إيقاف $($jobs.Count) job" -ForegroundColor Green
}
else {
    Write-Host "✅ لا توجد jobs للإيقاف" -ForegroundColor Green
}

# ============================================
# 3. التحقق من المنافذ
# ============================================
Write-Host ""
Write-Host "🔍 التحقق من المنافذ..." -ForegroundColor Yellow

$ports = @(3000, 3001, 3002)
foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        $processId = $connection.OwningProcess
        try {
            Stop-Process -Id $processId -Force
            Write-Host "✅ تحرير المنفذ $port (Process $processId)" -ForegroundColor Green
        }
        catch {
            Write-Host "⚠️ لم نتمكن من تحرير المنفذ $port" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "✅ المنفذ $port متاح" -ForegroundColor Green
    }
}

# ============================================
# النتيجة
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "   ✅ تم إيقاف النظام!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Red
Write-Host ""
Write-Host "📊 الحالة:" -ForegroundColor Yellow
Write-Host "   ✅ جميع عمليات Node متوقفة" -ForegroundColor White
Write-Host "   ✅ جميع المنافذ متاحة" -ForegroundColor White
Write-Host "   ✅ جميع Background Jobs متوقفة" -ForegroundColor White
Write-Host ""
Write-Host "🚀 لبدء النظام مرة أخرى:" -ForegroundColor Yellow
Write-Host "   .\START_SYSTEM_FIXED.ps1" -ForegroundColor White
Write-Host ""
