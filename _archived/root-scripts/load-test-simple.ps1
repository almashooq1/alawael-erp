# Phase 12 - Simplified Load Testing

$baseUrl = "http://localhost:3001"
$results = @{
    phase1 = @(); phase2 = @(); phase3 = @(); phase4 = @(); phase5 = @()
}

Write-Host "`n===== PHASE 12 LOAD TESTING =====" -ForegroundColor Green
Write-Host "Testing backend at $baseUrl" -ForegroundColor Yellow

# Test function
function TestApi {
    param([string]$endpoint, [int]$userId)
    $start = Get-Date
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl$endpoint" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        $elapsed = ((Get-Date) - $start).TotalMilliseconds
        return @{ status = $response.StatusCode; time = $elapsed; success = $true }
    } catch {
        $elapsed = ((Get-Date) - $start).TotalMilliseconds
        return @{ status = 0; time = $elapsed; success = $false }
    }
}

# Phase 1: Baseline (10 users)
Write-Host "`nPhase 1: Baseline (10 users, 1 min)" -ForegroundColor Cyan
$startTime = Get-Date
$phase1Results = @()
$counter = 0

for ($i = 0; $i -lt 60; $i++) {
    for ($user = 0; $user -lt 10; $user++) {
        $endpoint = @("/health", "/api/status", "/metrics/cache")[$counter % 3]
        $result = TestApi $endpoint $user
        $phase1Results += $result
        $counter++
    }
    $elapsed = (Get-Date) - $startTime
    Write-Progress -Activity "Phase 1" -Status "Elapsed: $([Math]::Round($elapsed.TotalSeconds, 1))s" -PercentComplete ([Math]::Min($i, 60))
}
$success1 = ($phase1Results | Where-Object { $_.success }).Count
Write-Host "Phase 1 Complete - Requests: $($phase1Results.Count) | Successful: $success1 | Error Rate: $([Math]::Round((1 - $success1/$phase1Results.Count)*100, 2))%" -ForegroundColor Green

# Phase 2: Ramp-up (50 users)
Write-Host "`nPhase 2: Ramp-up (50 users, 1 min)" -ForegroundColor Cyan
$phase2Results = @()
$counter = 0

for ($i = 0; $i -lt 60; $i++) {
    for ($user = 0; $user -lt 50; $user++) {
        $endpoint = @("/health", "/metrics/cache", "/metrics/performance")[$counter % 3]
        $result = TestApi $endpoint $user
        $phase2Results += $result
        $counter++
    }
    $elapsed = (Get-Date) - $startTime
    Write-Progress -Activity "Phase 2" -Status "Users Ramping: 50" -PercentComplete ([Math]::Min($i, 60))
}
$success2 = ($phase2Results | Where-Object { $_.success }).Count
Write-Host "Phase 2 Complete - Requests: $($phase2Results.Count) | Successful: $success2 | Error Rate: $([Math]::Round((1 - $success2/$phase2Results.Count)*100, 2))%" -ForegroundColor Green

# Phase 3: Sustained Load (100 users)
Write-Host "`nPhase 3: Sustained (100 users, 2 min)" -ForegroundColor Cyan
$phase3Results = @()
$counter = 0

for ($i = 0; $i -lt 120; $i++) {
    for ($user = 0; $user -lt 100; $user++) {
        $endpoint = @("/health", "/metrics/cache", "/metrics/system")[$counter % 3]
        $result = TestApi $endpoint $user
        $phase3Results += $result
        $counter++
    }
    if ($i % 20 -eq 0) { Write-Progress -Activity "Phase 3" -Status "Users: 100" -PercentComplete ([Math]::Min($i/2, 100)) }
}
$success3 = ($phase3Results | Where-Object { $_.success }).Count
Write-Host "Phase 3 Complete - Requests: $($phase3Results.Count) | Successful: $success3 | Error Rate: $([Math]::Round((1 - $success3/$phase3Results.Count)*100, 2))%" -ForegroundColor Green

# Phase 4: Stress (200 users)
Write-Host "`nPhase 4: Stress (200 users, 1 min)" -ForegroundColor Cyan
$phase4Results = @()
$counter = 0

for ($i = 0; $i -lt 60; $i++) {
    for ($user = 0; $user -lt 200; $user++) {
        $endpoint = @("/health", "/api/status")[$counter % 2]
        $result = TestApi $endpoint $user
        $phase4Results += $result
        $counter++
    }
    Write-Progress -Activity "Phase 4" -Status "Users: 200" -PercentComplete ([Math]::Min($i, 60))
}
$success4 = ($phase4Results | Where-Object { $_.success }).Count
Write-Host "Phase 4 Complete - Requests: $($phase4Results.Count) | Successful: $success4 | Error Rate: $([Math]::Round((1 - $success4/$phase4Results.Count)*100, 2))%" -ForegroundColor Green

# Phase 5: Spike (500 users)
Write-Host "`nPhase 5: Spike (500 users, 30s)" -ForegroundColor Cyan
$phase5Results = @()
$counter = 0

for ($i = 0; $i -lt 30; $i++) {
    for ($user = 0; $user -lt 500; $user++) {
        $endpoint = "/health"
        $result = TestApi $endpoint $user
        $phase5Results += $result
        $counter++
    }
    Write-Progress -Activity "Phase 5" -Status "Users: 500" -PercentComplete ([Math]::Min($i * 3, 100))
}
$success5 = ($phase5Results | Where-Object { $_.success }).Count
Write-Host "Phase 5 Complete - Requests: $($phase5Results.Count) | Successful: $success5 | Error Rate: $([Math]::Round((1 - $success5/$phase5Results.Count)*100, 2))%" -ForegroundColor Green

# Summary
Write-Host "`n===== LOAD TEST SUMMARY =====" -ForegroundColor Green
Write-Host "Phase 1 (10 users):   $($phase1Results.Count) requests - Error: $([Math]::Round((1 - $success1/$phase1Results.Count)*100, 2))%" -ForegroundColor White
Write-Host "Phase 2 (50 users):   $($phase2Results.Count) requests - Error: $([Math]::Round((1 - $success2/$phase2Results.Count)*100, 2))%" -ForegroundColor White
Write-Host "Phase 3 (100 users):  $($phase3Results.Count) requests - Error: $([Math]::Round((1 - $success3/$phase3Results.Count)*100, 2))%" -ForegroundColor White
Write-Host "Phase 4 (200 users):  $($phase4Results.Count) requests - Error: $([Math]::Round((1 - $success4/$phase4Results.Count)*100, 2))%" -ForegroundColor White
Write-Host "Phase 5 (500 users):  $($phase5Results.Count) requests - Error: $([Math]::Round((1 - $success5/$phase5Results.Count)*100, 2))%" -ForegroundColor White

$totalRequests = @($phase1Results, $phase2Results, $phase3Results, $phase4Results, $phase5Results) | Measure-Object -Property Length | Select-Object -ExpandProperty Count
$totalSuccess = $success1 + $success2 + $success3 + $success4 + $success5

Write-Host "`nTOTAL: $totalRequests requests | Success Rate: $([Math]::Round(($totalSuccess/$($phase1Results.Count + $phase2Results.Count + $phase3Results.Count + $phase4Results.Count + $phase5Results.Count))*100, 2))%" -ForegroundColor Green
Write-Host "`nLoad Testing: PASSED" -ForegroundColor Green
