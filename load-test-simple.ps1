#!/usr/bin/env powershell
# Simple Load Testing

param([int]$Requests = 100, [int]$Concurrent = 10)

Write-Host "`n🧪 Load Testing - $Requests Requests with $Concurrent Concurrency`n" -ForegroundColor Green

$endpoint = "http://localhost:3001/api/dashboard"
$results = @()
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

# Run requests
1..$Requests | ForEach-Object {
    Start-Job -ScriptBlock {
        param($url)
        $t = Measure-Command { 
            try { 
                Invoke-RestMethod $url -ErrorAction Stop | Out-Null
                return $t.TotalMilliseconds
            }
            catch { 
                return 0 
            }
        }
        return $t.TotalMilliseconds
    } -ArgumentList $endpoint | Out-Null
    
    if ($_ % $Concurrent -eq 0) {
        Write-Host "   ✓ $_ requests sent" -ForegroundColor Gray
    }
}

# Collect results
Get-Job | Wait-Job | ForEach-Object {
    $results += Receive-Job $_
    Remove-Job $_
}

$stopwatch.Stop()

# Calculate stats
$avg = [Math]::Round(($results | Measure-Object -Average).Average, 2)
$min = [Math]::Round(($results | Measure-Object -Minimum).Minimum, 2)
$max = [Math]::Round(($results | Measure-Object -Maximum).Maximum, 2)
$throughput = [Math]::Round($Requests / ($stopwatch.ElapsedMilliseconds / 1000), 2)

Write-Host "`n📊 Results:`n" -ForegroundColor Cyan
Write-Host "   Total Time:     $([Math]::Round($stopwatch.ElapsedMilliseconds / 1000, 2))s" -ForegroundColor White
Write-Host "   Throughput:     $throughput req/sec" -ForegroundColor Cyan
Write-Host "   Avg Response:   $avg ms" -ForegroundColor White
Write-Host "   Min Response:   $min ms" -ForegroundColor Green
Write-Host "   Max Response:   $max ms" -ForegroundColor Red
Write-Host "`n"
#!/usr/bin/env powershell
# Simple Load Testing

param([int]$Requests = 100, [int]$Concurrent = 10)

Write-Host "`n🧪 Load Testing - $Requests Requests with $Concurrent Concurrency`n" -ForegroundColor Green

$endpoint = "http://localhost:3001/api/dashboard"
$results = @()
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

# Run requests
1..$Requests | ForEach-Object {
    Start-Job -ScriptBlock {
        param($url)
        $t = Measure-Command { 
            try { 
                Invoke-RestMethod $url -ErrorAction Stop | Out-Null
                return $t.TotalMilliseconds
            }
            catch { 
                return 0 
            }
        }
        return $t.TotalMilliseconds
    } -ArgumentList $endpoint | Out-Null
    
    if ($_ % $Concurrent -eq 0) {
        Write-Host "   ✓ $_ requests sent" -ForegroundColor Gray
    }
}

# Collect results
Get-Job | Wait-Job | ForEach-Object {
    $results += Receive-Job $_
    Remove-Job $_
}

$stopwatch.Stop()

# Calculate stats
$avg = [Math]::Round(($results | Measure-Object -Average).Average, 2)
$min = [Math]::Round(($results | Measure-Object -Minimum).Minimum, 2)
$max = [Math]::Round(($results | Measure-Object -Maximum).Maximum, 2)
$throughput = [Math]::Round($Requests / ($stopwatch.ElapsedMilliseconds / 1000), 2)

Write-Host "`n📊 Results:`n" -ForegroundColor Cyan
Write-Host "   Total Time:     $([Math]::Round($stopwatch.ElapsedMilliseconds / 1000, 2))s" -ForegroundColor White
Write-Host "   Throughput:     $throughput req/sec" -ForegroundColor Cyan
Write-Host "   Avg Response:   $avg ms" -ForegroundColor White
Write-Host "   Min Response:   $min ms" -ForegroundColor Green
Write-Host "   Max Response:   $max ms" -ForegroundColor Red
Write-Host "`n"
