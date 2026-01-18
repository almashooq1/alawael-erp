# Smart Secretary API Integration Test
# Assumes servers are already running
$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Smart Secretary API Integration Test" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$base = "http://localhost:8080"

# Health Check
Write-Host "[1] Health Check..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$base/health" -Method GET -TimeoutSec 5
    Write-Host "    OK - Status: $($health.status)" -ForegroundColor Green
}
catch {
    Write-Host "    FAILED - Error: $_" -ForegroundColor Red
    exit 1
}

# Load test data
Write-Host "`n[2] Loading test data..." -ForegroundColor Cyan
$appointments = Get-Content -Raw "data/appointments_sample.json" | ConvertFrom-Json
$tasks = Get-Content -Raw "data/tasks_sample.json" | ConvertFrom-Json
Write-Host "    Appointments: $($appointments.Count), Tasks: $($tasks.Count)" -ForegroundColor Gray

# Test: Suggestions
Write-Host "`n[3] Testing Scheduling Suggestions..." -ForegroundColor Cyan
Write-Host "    POST $base/api/secretary/suggestions" -ForegroundColor Gray

$bodySuggestions = @{
    date         = "2026-01-18T00:00:00"
    appointments = $appointments
    tasks        = $tasks
} | ConvertTo-Json -Depth 6 -Compress

try {
    $suggestions = Invoke-RestMethod -Uri "$base/api/secretary/suggestions" -Method POST -ContentType "application/json" -Body $bodySuggestions -TimeoutSec 10
    Write-Host "    OK - Received $($suggestions.suggestions.Count) suggestions" -ForegroundColor Green
    foreach ($s in $suggestions.suggestions[0..2]) {
        Write-Host "       * $($s.message)" -ForegroundColor DarkGray
    }
}
catch {
    Write-Host "    FAILED - Error: $_" -ForegroundColor Red
    exit 1
}

# Test: Meeting Invite
Write-Host "`n[4] Testing Meeting Invite Generation..." -ForegroundColor Cyan
Write-Host "    POST $base/api/secretary/invite" -ForegroundColor Gray

$appointment = $appointments[0]
$bodyInvite = @{
    appointment = $appointment
    organizer   = "Smart Secretary"
} | ConvertTo-Json -Depth 6 -Compress

try {
    $invite = Invoke-RestMethod -Uri "$base/api/secretary/invite" -Method POST -ContentType "application/json" -Body $bodyInvite -TimeoutSec 10
    Write-Host "    OK - Invite generated successfully" -ForegroundColor Green
    $lines = $invite.invite -split "`n"
    foreach ($line in $lines[0..3]) {
        Write-Host "       $line" -ForegroundColor DarkGray
    }
    Write-Host "       ..." -ForegroundColor DarkGray
}
catch {
    Write-Host "    FAILED - Error: $_" -ForegroundColor Red
    exit 1
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ALL TESTS PASSED" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
