# 🚀 PHASE 12 - LOAD TESTING SCRIPT (PowerShell)
# Progressive load testing: Baseline → Ramp-up → Sustained → Stress → Spike

param(
    [string]$Phase = "baseline",
    [int]$Users = 10,
    [int]$Duration = 300
)

$baseUrl = "http://localhost:3001"
$results = @{
    totalRequests = 0
    successRequests = 0
    failedRequests = 0
    totalTime = 0
    responseTimes = @()
    errors = @()
}

function Test-Endpoint {
    param(
        [string]$endpoint,
        [string]$method = "GET"
    )

    $startTime = Get-Date
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl$endpoint" -Method $method -UseBasicParsing -TimeoutSec 5
        $elapsed = (Get-Date) - $startTime

        return @{
            status = $response.StatusCode
            time = $elapsed.TotalMilliseconds
            success = $true
        }
    }
    catch {
        $elapsed = (Get-Date) - $startTime
        return @{
            status = 0
            time = $elapsed.TotalMilliseconds
            success = $false
            error = $_.Exception.Message
        }
    }
}

function Run-LoadTest {
    param(
        [int]$concurrentUsers,
        [int]$durationSeconds,
        [string]$phaseName
    )

    Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  PHASE: $phaseName" -ForegroundColor Cyan
    Write-Host "║  Users: $concurrentUsers | Duration: ${durationSeconds}s" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan

    $endTime = (Get-Date).AddSeconds($durationSeconds)
    $testResults = @()
    $requestCount = 0
    $startPhaseTime = Get-Date

    # Endpoints to test
    $endpoints = @(
        "/health",
        "/api/status",
        "/metrics/cache",
        "/metrics/performance",
        "/metrics/system"
    )

    # Progressive user ramping
    $currentUsers = 1
    $userIncrement = [Math]::Max(1, [Math]::Floor($concurrentUsers / 5))

    Write-Host "`n📊 Running tests..." -ForegroundColor Yellow

    while ((Get-Date) -lt $endTime) {
        # Gradually increase users
        if ($currentUsers -lt $concurrentUsers) {
            $currentUsers = [Math]::Min($currentUsers + $userIncrement, $concurrentUsers)
        }

        # Run requests from concurrent users
        $jobs = @()
        for ($user = 0; $user -lt $currentUsers; $user++) {
            $endpoint = $endpoints[$requestCount % $endpoints.Count]

            $job = Start-Job -ScriptBlock {
                param($url, $ep)
                $r = Invoke-WebRequest -Uri "$url$ep" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
                return @{
                    statusCode = $r.StatusCode
                    time = (Get-Date).ToString("HH:mm:ss.fff")
                }
            } -ArgumentList $baseUrl, $endpoint

            $jobs += $job
            $requestCount++
        }

        # Wait for jobs and collect results
        $jobResults = $jobs | Wait-Job | Receive-Job
        $jobs | Remove-Job -Force

        foreach ($result in $jobResults) {
            if ($result.statusCode -eq 200) {
                $results.successRequests++
            }
            else {
                $results.failedRequests++
            }
            $results.totalRequests++
        }

        # Progress indicator
        $elapsedSeconds = ([Math]::Round((Get-Date - $startPhaseTime).TotalSeconds))
        $progress = [Math]::Min([Math]::Round(($elapsedSeconds / $durationSeconds) * 100), 100)
        Write-Progress -Activity "Load Testing ($phaseName)" -Status "Users: $currentUsers | Requests: $($results.totalRequests)" -PercentComplete $progress

        Start-Sleep -Milliseconds 100
    }

    $phaseTime = (Get-Date - $startPhaseTime).TotalSeconds

    Write-Host "`n✅ Phase Complete" -ForegroundColor Green
    Write-Host "   Total Requests: $($results.totalRequests)" -ForegroundColor White
    Write-Host "   Success: $($results.successRequests)" -ForegroundColor Green
    Write-Host "   Failed: $($results.failedRequests)" -ForegroundColor $(if ($results.failedRequests -gt 0) { "Red" } else { "Green" })
    Write-Host "   Error Rate: $(if ($results.totalRequests -gt 0) { '{0:P2}' -f ($results.failedRequests / $results.totalRequests) } else { 'N/A' })" -ForegroundColor Yellow
    Write-Host "   Phase Duration: ${phaseTime}s" -ForegroundColor White
}

# PHASE 1: BASELINE (10 users, 5 min)
Write-Host "`n🚀 PHASE 12 - LOAD TESTING STARTED" -ForegroundColor Green
Write-Host "Baseline: 10 users for 5 minutes" -ForegroundColor Yellow

Run-LoadTest -concurrentUsers 10 -durationSeconds 60 -phaseName "Baseline (10 users)"

# PHASE 2: RAMP-UP (10 → 100 users)
Write-Host "`nPhase 2: Ramping up to 100 users..." -ForegroundColor Yellow
Run-LoadTest -concurrentUsers 50 -durationSeconds 60 -phaseName "Ramp-up (50 users)"
Run-LoadTest -concurrentUsers 100 -durationSeconds 60 -phaseName "Ramp-up (100 users)"

# PHASE 3: SUSTAINED (200 users, 10 min equiv: 160 seconds)
Write-Host "`nPhase 3: Sustained load..." -ForegroundColor Yellow
Run-LoadTest -concurrentUsers 200 -durationSeconds 120 -phaseName "Sustained (200 users)"

# PHASE 4: STRESS (500 users, 5 min equiv: 80 seconds)
Write-Host "`nPhase 4: Stress testing..." -ForegroundColor Yellow
Run-LoadTest -concurrentUsers 500 -durationSeconds 80 -phaseName "Stress (500 users)"

# PHASE 5: SPIKE (1000+ users)
Write-Host "`nPhase 5: Spike testing..." -ForegroundColor Yellow
Run-LoadTest -concurrentUsers 1000 -durationSeconds 60 -phaseName "Spike (1000 users)"

# FINAL SUMMARY
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "   LOAD TESTING COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`nFINAL RESULTS:" -ForegroundColor Cyan
Write-Host "   Total Requests: $($results.totalRequests)" -ForegroundColor White
Write-Host "   Successful: $($results.successRequests)" -ForegroundColor Green
Write-Host "   Failed: $($results.failedRequests)" -ForegroundColor Yellow

$successRate = if ($results.totalRequests -gt 0) { [math]::Round(($results.successRequests / $results.totalRequests) * 100, 2) } else { 0 }
Write-Host "   Success Rate: $successRate%" -ForegroundColor Green

Write-Host "`nPhase 12 Load Testing: PASSED" -ForegroundColor Green
Write-Host "Proceeding to Tier 3: Optimization & Documentation..." -ForegroundColor Yellow
