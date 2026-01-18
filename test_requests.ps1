# Test Smart Secretary API endpoints
$ErrorActionPreference = "Stop"

$base = "http://localhost:8080"
$appointments = Get-Content -Raw "data/appointments_sample.json" | ConvertFrom-Json
$tasks = Get-Content -Raw "data/tasks_sample.json" | ConvertFrom-Json

# Suggestions
$bodySuggestions = @{ date = "2026-01-18T00:00:00"; appointments = $appointments; tasks = $tasks } | ConvertTo-Json -Depth 6
Write-Host "Calling suggestions..."
$suggestions = Invoke-RestMethod -Uri "$base/api/secretary/suggestions" -Method POST -ContentType "application/json" -Body $bodySuggestions
$suggestions | ConvertTo-Json -Depth 6 | Write-Output

# Invite
$appointment = $appointments[0]
$bodyInvite = @{ appointment = $appointment; organizer = "السكرتير الذكي" } | ConvertTo-Json -Depth 6
Write-Host "Calling invite..."
$invite = Invoke-RestMethod -Uri "$base/api/secretary/invite" -Method POST -ContentType "application/json" -Body $bodyInvite
$invite | ConvertTo-Json -Depth 3 | Write-Output
