#Requires -Version 5.1
# Notifications Smoke Test (Backend: Port 3001)
# Steps: Login (admin) -> Get list -> Get unread count -> Create -> Verify -> Mark read -> Delete

param(
    [string]$BaseUrl = 'http://localhost:3001/api',
    [string]$Email = 'admin@alawael.com',
    [string]$Password = 'Admin@123456',
    [int]$Page = 1,
    [int]$Limit = 10
)

function Write-Title($text) {
    Write-Host "`n$text" -ForegroundColor Cyan
}
function Write-Ok($text) { Write-Host "  $text" -ForegroundColor Green }
function Write-Info($text) { Write-Host "  $text" -ForegroundColor Yellow }
function Write-Err($text) { Write-Host "  $text" -ForegroundColor Red }

$ErrorActionPreference = 'Stop'
$token = $null
$userId = $null

try {
    Write-Title '1) Login (admin)'
    $body = @{ email = $Email; password = $Password } | ConvertTo-Json
    $r = Invoke-WebRequest -Uri "$BaseUrl/auth/login" -Method Post -Body $body -ContentType 'application/json' -UseBasicParsing
    $json = $r.Content | ConvertFrom-Json
    if (-not $json.success) { throw "Login failed" }
    $token = $json.accessToken
    $userId = $json.user._id
    Write-Ok "Login OK: $($json.user.email)"
    Write-Info "Token: $($token.Substring(0,30))..."
}
catch {
    Write-Err "Login error: $($_.Exception.Message)"; exit 1
}

$headers = @{ Authorization = "Bearer $token" }

try {
    Write-Title '2) Fetch My Notifications (paged)'
    $r = Invoke-WebRequest -Uri "$BaseUrl/notifications?page=$Page&limit=$Limit" -Method Get -Headers $headers -UseBasicParsing
    $json = $r.Content | ConvertFrom-Json
    $count = ($json.data.items | Measure-Object).Count
    Write-Ok "Fetched $count notifications (page $Page, limit $Limit)"
}
catch {
    Write-Err "Fetch error: $($_.Exception.Message)"
}

try {
    Write-Title '3) Unread Count'
    $r = Invoke-WebRequest -Uri "$BaseUrl/notifications/unread/count" -Method Get -Headers $headers -UseBasicParsing
    $json = $r.Content | ConvertFrom-Json
    $unread = $json.data.count
    Write-Ok "Unread count: $unread"
}
catch {
    Write-Err "Unread count error: $($_.Exception.Message)"
}

try {
    Write-Title '4) Create Notification (admin only)'
    $body = @{ userId = $userId; title = 'Smoke Test'; message = 'This is a test notification'; type = 'info'; priority = 'normal' } | ConvertTo-Json
    $r = Invoke-WebRequest -Uri "$BaseUrl/notifications" -Method Post -Body $body -ContentType 'application/json' -Headers $headers -UseBasicParsing
    $json = $r.Content | ConvertFrom-Json
    $createdId = $json.data._id
    if (-not $createdId) { throw 'No notification ID returned' }
    Write-Ok "Created notification: $createdId"
}
catch {
    Write-Err "Create error: $($_.Exception.Message)"
}

try {
    Write-Title '5) Verify Unread Count Increased'
    Start-Sleep 1
    $r = Invoke-WebRequest -Uri "$BaseUrl/notifications/unread/count" -Method Get -Headers $headers -UseBasicParsing
    $json = $r.Content | ConvertFrom-Json
    Write-Ok "Unread count (after create): $($json.data.count)"
}
catch {
    Write-Err "Verify unread error: $($_.Exception.Message)"
}

try {
    Write-Title '6) Mark Newly Created As Read'
    # Get latest notification to find its id (fallback)
    $rList = Invoke-WebRequest -Uri "$BaseUrl/notifications?page=1&limit=1" -Method Get -Headers $headers -UseBasicParsing
    $jList = $rList.Content | ConvertFrom-Json
    $latest = $jList.data.items[0]
    if (-not $latest) { throw 'No notifications found to mark as read' }
    $targetId = $latest._id
    $r = Invoke-WebRequest -Uri "$BaseUrl/notifications/$targetId/read" -Method Put -Headers $headers -UseBasicParsing
    $json = $r.Content | ConvertFrom-Json
    Write-Ok "Marked as read: $targetId"
}
catch {
    Write-Err "Mark read error: $($_.Exception.Message)"
}

try {
    Write-Title '7) Delete Read Notifications (cleanup)'
    $r = Invoke-WebRequest -Uri "$BaseUrl/notifications/read/all" -Method Delete -Headers $headers -UseBasicParsing
    $json = $r.Content | ConvertFrom-Json
    Write-Ok "Deleted read notifications"
}
catch {
    Write-Err "Delete read error: $($_.Exception.Message)"
}

Write-Title '✅ Smoke Test Completed'
Write-Ok 'All steps executed. Review output above.'