<# Start Smart Secretary API server with Start-Process, wait for health, test endpoints, then stop #>
$ErrorActionPreference = "Stop"

$serverPath = "secretary_ai/server.py"
$outPath = "server.out.txt"
$errPath = "server.err.txt"
$proc = Start-Process -FilePath "python" -ArgumentList $serverPath -PassThru -WindowStyle Hidden -RedirectStandardOutput $outPath -RedirectStandardError $errPath
Write-Host "Server process started: PID = $($proc.Id)"

$base = "http://localhost:8080"

# Wait for /health to be ready (up to ~20s), also fail fast if process exits
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    if ($proc.HasExited) {
        Write-Host "Server process exited early. Output:"; if (Test-Path $outPath) { Get-Content -Raw $outPath | Write-Output }
        Write-Host "Errors:"; if (Test-Path $errPath) { Get-Content -Raw $errPath | Write-Output }
        throw "Server process terminated."
    }
    try {
        $health = Invoke-RestMethod -Uri "$base/health" -Method GET -TimeoutSec 2
        if ($health.status -eq "ok") { $ready = $true; break }
    }
    catch { Start-Sleep -Milliseconds 800 }
}
if (-not $ready) {
    Write-Host "Health check failed. Output:"; if (Test-Path $outPath) { Get-Content -Raw $outPath | Write-Output }
    Write-Host "Errors:"; if (Test-Path $errPath) { Get-Content -Raw $errPath | Write-Output }
    throw "Server did not become ready in time."
}

$appointments = Get-Content -Raw "data/appointments_sample.json" | ConvertFrom-Json
$tasks = Get-Content -Raw "data/tasks_sample.json" | ConvertFrom-Json

# Suggestions
$bodySuggestions = @{ date = "2026-01-18T00:00:00"; appointments = $appointments; tasks = $tasks } | ConvertTo-Json -Depth 6
Write-Host "Calling suggestions..."
$suggestions = Invoke-RestMethod -Uri "$base/api/secretary/suggestions" -Method POST -ContentType "application/json" -Body $bodySuggestions
$suggestions | ConvertTo-Json -Depth 6 | Write-Output

# Invite
$appointment = $appointments[0]
$bodyInvite = @{ appointment = $appointment; organizer = "Smart Secretary" } | ConvertTo-Json -Depth 6
Write-Host "Calling invite..."
$invite = Invoke-RestMethod -Uri "$base/api/secretary/invite" -Method POST -ContentType "application/json" -Body $bodyInvite
$invite | ConvertTo-Json -Depth 3 | Write-Output

# Stop server
Stop-Process -Id $proc.Id -Force
Write-Host "Server process stopped."
