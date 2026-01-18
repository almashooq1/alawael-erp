# Test Node API that proxies to Python API
$ErrorActionPreference = "Stop"

$nodeBase = "http://localhost:3000"

Write-Host "Health (Node -> Python)"
Invoke-RestMethod -Uri "$nodeBase/health" -Method GET | ConvertTo-Json -Depth 4 | Write-Output

$appointments = Get-Content -Raw "../data/appointments_sample.json" | ConvertFrom-Json
$tasks = Get-Content -Raw "../data/tasks_sample.json" | ConvertFrom-Json

$bodySuggestions = @{ date = "2026-01-18T00:00:00"; appointments = $appointments; tasks = $tasks } | ConvertTo-Json -Depth 6
Write-Host "Suggestions"
Invoke-RestMethod -Uri "$nodeBase/api/secretary/suggestions" -Method POST -ContentType "application/json" -Body $bodySuggestions | ConvertTo-Json -Depth 6 | Write-Output

$bodyInvite = @{ appointment = $appointments[0]; organizer = "Smart Secretary" } | ConvertTo-Json -Depth 6
Write-Host "Invite"
Invoke-RestMethod -Uri "$nodeBase/api/secretary/invite" -Method POST -ContentType "application/json" -Body $bodyInvite | ConvertTo-Json -Depth 3 | Write-Output
