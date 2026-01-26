# 🧪 Redis Cache Performance Test
# اختبار أداء الكاش

Write-Host "🧪 اختبار أداء Redis Cache..." -ForegroundColor Cyan
Write-Host ""

# Test Dashboard endpoint (60 second cache)
Write-Host "1️⃣ اختبار /api/dashboard (Cache: 60s)" -ForegroundColor Yellow
Write-Host ""

Write-Host "   📊 Request #1 (MISS - بدون كاش):" -ForegroundColor White
$time1 = Measure-Command {
    $response1 = Invoke-RestMethod -Uri "http://localhost:3001/api/dashboard" -Method GET -ErrorAction SilentlyContinue
}
Write-Host "   ⏱️  الوقت: $($time1.TotalMilliseconds) ms" -ForegroundColor Gray
Write-Host ""

Write-Host "   📊 Request #2 (HIT - من الكاش):" -ForegroundColor White
$time2 = Measure-Command {
    $response2 = Invoke-RestMethod -Uri "http://localhost:3001/api/dashboard" -Method GET -ErrorAction SilentlyContinue
}
Write-Host "   ⏱️  الوقت: $($time2.TotalMilliseconds) ms" -ForegroundColor Gray
Write-Host ""

Write-Host "   📊 Request #3 (HIT - من الكاش):" -ForegroundColor White
$time3 = Measure-Command {
    $response3 = Invoke-RestMethod -Uri "http://localhost:3001/api/dashboard" -Method GET -ErrorAction SilentlyContinue
}
Write-Host "   ⏱️  الوقت: $($time3.TotalMilliseconds) ms" -ForegroundColor Gray
Write-Host ""

# Calculate improvement
$improvement = [math]::Round(($time1.TotalMilliseconds / $time2.TotalMilliseconds), 2)
Write-Host "   🚀 التحسين: ${improvement}x أسرع!" -ForegroundColor Green
Write-Host ""

# Check Redis keys
Write-Host "2️⃣ المفاتيح المحفوظة في Redis:" -ForegroundColor Yellow
docker exec redis-cache redis-cli KEYS "*" 2>$null
Write-Host ""

# Check cache stats
Write-Host "3️⃣ إحصائيات الكاش:" -ForegroundColor Yellow
$stats = docker exec redis-cache redis-cli INFO stats 2>$null
$hits = ($stats | Select-String "keyspace_hits:(\d+)").Matches.Groups[1].Value
$misses = ($stats | Select-String "keyspace_misses:(\d+)").Matches.Groups[1].Value
$hitRate = if ($hits -and $misses) { 
    [math]::Round(([int]$hits / ([int]$hits + [int]$misses)) * 100, 2)
}
else { 
    0 
}
Write-Host "   ✅ Cache Hits: $hits" -ForegroundColor Green
Write-Host "   ❌ Cache Misses: $misses" -ForegroundColor Red
Write-Host "   📊 Hit Rate: $hitRate%" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ الاختبار مكتمل!" -ForegroundColor Green
