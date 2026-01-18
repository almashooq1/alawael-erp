<#
Test Smart Secretary API endpoints
Assumes server is already running on port 8080
If not running, starts it temporarily
#>

$ErrorActionPreference = "Stop"
$base = "http://localhost:8080"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Smart Secretary API Integration Test" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if server is already running
$serverRunning = $false
try {
    $health = Invoke-RestMethod -Uri "$base/health" -Method GET -TimeoutSec 2
    if ($health.status -eq "ok") {
        $serverRunning = $true
        Write-Host "[OK] Server already running on port 8080" -ForegroundColor Green
    }
}
catch {
    Write-Host "[WARN] Server not running - will start temporarily" -ForegroundColor Yellow
}

# Start server if needed
$proc = $null
if (-not $serverRunning) {
    Write-Host "`n[START] Starting Smart Secretary server..." -ForegroundColor Cyan
    $serverPath = "secretary_ai/server.py"
    $outPath = "server.out.txt"
    $errPath = "server.err.txt"
    $proc = Start-Process -FilePath "python" -ArgumentList $serverPath -PassThru -WindowStyle Hidden -RedirectStandardOutput $outPath -RedirectStandardError $errPath
    Write-Host "   Process ID: $($proc.Id)" -ForegroundColor Gray

    # Wait for server to be ready
    $ready = $false
    for ($i = 0; $i -lt 20; $i++) {
        if ($proc.HasExited) {
            Write-Host "`n[ERROR] Server process exited early" -ForegroundColor Red
            Write-Host "Output:"; if (Test-Path $outPath) { Get-Content -Raw $outPath }
            Write-Host "Errors:"; if (Test-Path $errPath) { Get-Content -Raw $errPath }
            throw "Server process terminated"
        }
        try {
            $health = Invoke-RestMethod -Uri "$base/health" -Method GET -TimeoutSec 2
            if ($health.status -eq "ok") {
                $ready = $true
                Write-Host "[OK] Server is ready" -ForegroundColor Green
                break
            }
        }
        catch {
            Write-Host "." -NoNewline
            Start-Sleep -Milliseconds 800
        }
    }

    if (-not $ready) {
        Write-Host "`n[ERROR] Server did not become ready in time" -ForegroundColor Red
        if (Test-Path $outPath) { Write-Host "Output:"; Get-Content -Raw $outPath }
        if (Test-Path $errPath) { Write-Host "Errors:"; Get-Content -Raw $errPath }
        throw "Server not ready"
    }
}

# Load test data
Write-Host "`n[DATA] Loading test data..." -ForegroundColor Cyan
$appointments = Get-Content -Raw "data/appointments_sample.json" | ConvertFrom-Json
$tasks = Get-Content -Raw "data/tasks_sample.json" | ConvertFrom-Json
Write-Host "   Appointments: $($appointments.Count)" -ForegroundColor Gray
Write-Host "   Tasks: $($tasks.Count)" -ForegroundColor Gray

# Test 1: Suggestions
Write-Host "`n[TEST1] Test 1: Scheduling Suggestions" -ForegroundColor Cyan
Write-Host "   Endpoint: POST $base/api/secretary/suggestions" -ForegroundColor Gray

$bodySuggestions = @{
    date         = "2026-01-18T00:00:00"
    appointments = $appointments
    tasks        = $tasks
} | ConvertTo-Json -Depth 6 -Compress

try {
    $suggestions = Invoke-RestMethod -Uri "$base/api/secretary/suggestions" -Method POST -ContentType "application/json" -Body $bodySuggestions -TimeoutSec 10
    Write-Host "   OK - Status: Success" -ForegroundColor Green
    Write-Host "   Suggestions received: $($suggestions.suggestions.Count)" -ForegroundColor Gray

    # Display suggestions
    foreach ($s in $suggestions.suggestions) {
        Write-Host "      - $($s.message)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   FAILED - Status: Error" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    throw
}

# Test 2: Meeting Invite
Write-Host "`n[TEST2] Test 2: Generate Meeting Invite" -ForegroundColor Cyan
Write-Host "   Endpoint: POST $base/api/secretary/invite" -ForegroundColor Gray

$appointment = $appointments[0]
$bodyInvite = @{
    appointment = $appointment
    organizer   = "Smart Secretary"
} | ConvertTo-Json -Depth 6 -Compress

try {
    $invite = Invoke-RestMethod -Uri "$base/api/secretary/invite" -Method POST -ContentType "application/json" -Body $bodyInvite -TimeoutSec 10
    Write-Host "   OK - Status: Success" -ForegroundColor Green
    Write-Host "   Invite generated:" -ForegroundColor Gray
    Write-Host "   $($invite.invite)" -ForegroundColor Gray
}
catch {
    Write-Host "   FAILED - Status: Error" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    throw
}

# Cleanup - stop server if we started it
if ($proc) {
    Write-Host "`n[STOP] Stopping temporary server..." -ForegroundColor Yellow
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    Write-Host "   [OK] Server stopped" -ForegroundColor Green
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  [SUCCESS] ALL TESTS PASSED" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Test Summary:" -ForegroundColor Cyan
Write-Host "  [OK] Health check: OK" -ForegroundColor Green
Write-Host "  [OK] Suggestions API: Working" -ForegroundColor Green
Write-Host "  [OK] Invite API: Working" -ForegroundColor Green
Write-Host ""
