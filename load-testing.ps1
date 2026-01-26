#!/usr/bin/env pwsh
# Load Testing Suite - اختبار الحمل الشامل

param(
    [int]$Requests = 500,
    [int]$Concurrency = 50,
    [string]$Endpoint = "http://localhost:3001/api/dashboard"
)

$results = @{
    totalRequests      = 0
    successfulRequests = 0
    failedRequests     = 0
    totalTime          = 0
    responseTimes      = @()
    errors             = @()
}

Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         Load Testing Suite - اختبار الحمل              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "`n"

Write-Host "📊 إعدادات الاختبار:" -ForegroundColor Yellow
Write-Host "   عدد الطلبات: $Requests" -ForegroundColor White
Write-Host "   التزامن: $Concurrency" -ForegroundColor White
Write-Host "   الـ Endpoint: $Endpoint" -ForegroundColor White
Write-Host "`n"

# حساب عدد الـ batches
$batchSize = [Math]::Ceiling($Requests / $Concurrency)

Write-Host "🧪 بدء الاختبار..." -ForegroundColor Green
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

# تشغيل الطلبات
$jobs = @()
for ($i = 0; $i -lt $Requests; $i++) {
    $jobs += Start-Job -ScriptBlock {
        param($endpoint)
        try {
            $time = Measure-Command {
                $response = Invoke-RestMethod -Uri $endpoint -TimeoutSec 10 -ErrorAction Stop
            }
            return @{
                success    = $true
                time       = $time.TotalMilliseconds
                statusCode = 200
            }
        }
        catch {
            return @{
                success = $false
                time    = 0
                error   = $_.Exception.Message
            }
        }
    } -ArgumentList $Endpoint
    
    # بدء batch جديد عند الوصول للتزامن
    if (($i + 1) % $Concurrency -eq 0) {
        $completed = Get-Job -State Completed
        Write-Host "   ✓ تم $($i + 1)/$Requests طلب" -ForegroundColor Green
    }
}

# انتظار انتهاء جميع الـ jobs
$allResults = Wait-Job -Job $jobs | Receive-Job

$stopwatch.Stop()

# معالجة النتائج
foreach ($result in $allResults) {
    $results.totalRequests++
    if ($result.success) {
        $results.successfulRequests++
        $results.responseTimes += $result.time
    }
    else {
        $results.failedRequests++
        $results.errors += $result.error
    }
}

# حساب الإحصائيات
$avgTime = if ($results.responseTimes.Count -gt 0) { 
    [Math]::Round(($results.responseTimes | Measure-Object -Average).Average, 2) 
}
else { 
    0 
}

$minTime = if ($results.responseTimes.Count -gt 0) { 
    [Math]::Round(($results.responseTimes | Measure-Object -Minimum).Minimum, 2) 
}
else { 
    0 
}

$maxTime = if ($results.responseTimes.Count -gt 0) { 
    [Math]::Round(($results.responseTimes | Measure-Object -Maximum).Maximum, 2) 
}
else { 
    0 
}

$successRate = [Math]::Round(($results.successfulRequests / $results.totalRequests) * 100, 2)
$throughput = [Math]::Round($results.totalRequests / ($stopwatch.ElapsedMilliseconds / 1000), 2)

# عرض النتائج
Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              نتائج الاختبار - Test Results            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "`n"

Write-Host "📈 الإحصائيات العامة:" -ForegroundColor Yellow
Write-Host "   إجمالي الطلبات:           $($results.totalRequests)" -ForegroundColor White
Write-Host "   الطلبات الناجحة:          $($results.successfulRequests) ($successRate%)" -ForegroundColor Green
Write-Host "   الطلبات الفاشلة:          $($results.failedRequests)" -ForegroundColor Red
Write-Host "   الوقت الإجمالي:           $([Math]::Round($stopwatch.ElapsedMilliseconds / 1000, 2)) ثانية" -ForegroundColor White
Write-Host "`n"

Write-Host "⏱️  أوقات الاستجابة (ms):" -ForegroundColor Yellow
Write-Host "   المتوسط:                 $avgTime ms" -ForegroundColor Cyan
Write-Host "   الأدنى:                  $minTime ms" -ForegroundColor Green
Write-Host "   الأعلى:                  $maxTime ms" -ForegroundColor Red
Write-Host "`n"

Write-Host "🚀 الأداء:" -ForegroundColor Yellow
Write-Host "   الإنتاجية (Throughput):  $throughput طلب/ثانية" -ForegroundColor Cyan
Write-Host "`n"

# عرض توزيع الأوقات
if ($results.responseTimes.Count -gt 0) {
    Write-Host "📊 توزيع أوقات الاستجابة:" -ForegroundColor Yellow
    
    $p50 = [Math]::Round(($results.responseTimes | Sort-Object)[($results.responseTimes.Count * 0.5)], 2)
    $p95 = [Math]::Round(($results.responseTimes | Sort-Object)[($results.responseTimes.Count * 0.95)], 2)
    $p99 = [Math]::Round(($results.responseTimes | Sort-Object)[($results.responseTimes.Count * 0.99)], 2)
    
    Write-Host "   P50 (Median):            $p50 ms" -ForegroundColor White
    Write-Host "   P95:                     $p95 ms" -ForegroundColor Yellow
    Write-Host "   P99:                     $p99 ms" -ForegroundColor Red
    Write-Host "`n"
}

# عرض الأخطاء إن وجدت
if ($results.errors.Count -gt 0) {
    Write-Host "❌ الأخطاء:" -ForegroundColor Red
    $results.errors | Group-Object | ForEach-Object {
        Write-Host "   $($_.Count)x: $($_.Name)" -ForegroundColor Red
    }
    Write-Host "`n"
}

# تقييم الأداء
Write-Host "📋 التقييم:" -ForegroundColor Yellow
if ($successRate -eq 100 -and $avgTime -lt 50) {
    Write-Host "   ✅ ممتاز - الأداء ممتاز جداً!" -ForegroundColor Green
}
elseif ($successRate -ge 95 -and $avgTime -lt 100) {
    Write-Host "   ✅ جيد جداً - الأداء جيد" -ForegroundColor Green
}
elseif ($successRate -ge 90 -and $avgTime -lt 200) {
    Write-Host "   ⚠️  مقبول - يحتاج تحسين" -ForegroundColor Yellow
}
else {
    Write-Host "   ❌ ضعيف - يحتاج تحسينات كبيرة" -ForegroundColor Red
}
Write-Host "`n"

# تنظيف
Get-Job | Remove-Job
