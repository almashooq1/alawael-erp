param(
  [string]$BaseUrl = "http://localhost:3001/api",
  [string]$Email = "admin@alawael.com",
  [string]$Password = "Admin@123456"
)

Write-Host "`n Auth 2FA + Reset Smoke Test" -ForegroundColor Cyan
Write-Host " BaseUrl: $BaseUrl" -ForegroundColor Gray

function Invoke-Json($method, $url, $bodyObj, $headers=@{}) {
  $body = $null
  if ($bodyObj) { $body = ($bodyObj | ConvertTo-Json -Depth 6) }
  return Invoke-WebRequest -Uri $url -Method $method -Body $body -ContentType 'application/json' -Headers $headers -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
}

# 1) Initial login (no 2FA yet)
Write-Host "`n 1) Login (baseline)" -ForegroundColor Yellow
try {
  $r = Invoke-Json 'POST' "$BaseUrl/auth/login" @{ email = $Email; password = $Password }
  $json = $r.Content | ConvertFrom-Json
  if ($json.requires2fa) {
    Write-Host " Requires 2FA already: OK" -ForegroundColor Green
    $sessionId = $json.sessionId
    $userId = $json.user.id
    $devCode = $json.devCode
  } elseif ($json.success -and $json.accessToken) {
    Write-Host " Logged in without 2FA (expected before enabling)" -ForegroundColor Green
    $token = $json.accessToken
    $userId = $json.user.id
  } else {
    throw "Unexpected login response"
  }
} catch { Write-Host " Login failed: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }

# 2) Enable 2FA for this user
Write-Host "`n 2) Enable 2FA" -ForegroundColor Yellow
try {
  $r = Invoke-Json 'POST' "$BaseUrl/auth/enable-2fa" @{ userId = $userId }
  $json = $r.Content | ConvertFrom-Json
  if ($json.success) { Write-Host " 2FA enabled" -ForegroundColor Green } else { Write-Host " 2FA enable failed" -ForegroundColor Red }
} catch { Write-Host " Enable 2FA error: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }

# 3) Login again, expect requires2fa
Write-Host "`n 3) Login (expect requires2fa)" -ForegroundColor Yellow
try {
  $r = Invoke-Json 'POST' "$BaseUrl/auth/login" @{ email = $Email; password = $Password }
  $json = $r.Content | ConvertFrom-Json
  if (-not $json.requires2fa) { throw "Expected requires2fa" }
  $sessionId = $json.sessionId
  $devCode  = $json.devCode
  $userId   = $json.user.id
  Write-Host " requires2fa -> session: $sessionId, code: $devCode" -ForegroundColor Green
} catch { Write-Host " Login requires2fa error: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }

# 4) Verify 2FA
Write-Host "`n 4) Verify 2FA" -ForegroundColor Yellow
try {
  $r = Invoke-Json 'POST' "$BaseUrl/auth/verify-2fa" @{ userId = $userId; code = $devCode; sessionId = $sessionId }
  $json = $r.Content | ConvertFrom-Json
  if (-not $json.data.success) { throw "2FA verify failed" }
  $token = $json.data.token
  Write-Host " 2FA verified, token acquired" -ForegroundColor Green
} catch { Write-Host " Verify 2FA error: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }

# 5) Verify token and /me
Write-Host "`n 5) Verify token & /me" -ForegroundColor Yellow
try {
  $vr = Invoke-Json 'POST' "$BaseUrl/auth/verify-token" $null @{ Authorization = "Bearer $token" }
  $vj = $vr.Content | ConvertFrom-Json
  if (-not $vj.success) { throw "verify-token failed" }
  $mr = Invoke-Json 'GET' "$BaseUrl/auth/me" $null @{ Authorization = "Bearer $token" }
  $mj = $mr.Content | ConvertFrom-Json
  if (-not $mj.success) { throw "/me failed" }
  Write-Host " Token valid for: $($mj.user.email)" -ForegroundColor Green
} catch { Write-Host " Token checks failed: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }

# 6) Sessions list
Write-Host "`n 6) Sessions list" -ForegroundColor Yellow
try {
  $sr = Invoke-WebRequest -Uri "$BaseUrl/auth/sessions/$userId" -Method Get -UseBasicParsing -TimeoutSec 5
  $sj = $sr.Content | ConvertFrom-Json
  $count = $sj.data.sessions.Count
  Write-Host " Active sessions: $count" -ForegroundColor Green
} catch { Write-Host " Sessions error: $($_.Exception.Message)" -ForegroundColor Red }

# 7) Forgot/reset password flow
Write-Host "`n 7) Password reset" -ForegroundColor Yellow
try {
  $fr = Invoke-Json 'POST' "$BaseUrl/auth/forgot-password" @{ email = $Email }
  $fj = $fr.Content | ConvertFrom-Json
  $resetToken = $fj.data.resetToken
  if (-not $resetToken) { throw "no resetToken returned" }
  $rr = Invoke-Json 'POST' "$BaseUrl/auth/reset-password" @{ token = $resetToken; newPassword = 'New@12345'; confirmPassword = 'New@12345' }
  $rj = $rr.Content | ConvertFrom-Json
  if (-not $rj.success) { throw "reset-password failed" }
  Write-Host " Password reset OK" -ForegroundColor Green
} catch { Write-Host " Password reset error: $($_.Exception.Message)" -ForegroundColor Red }

# 8) Logout
Write-Host "`n 8) Logout" -ForegroundColor Yellow
try {
  $lo = Invoke-Json 'POST' "$BaseUrl/auth/logout" $null @{ Authorization = "Bearer $token" }
  $loj = $lo.Content | ConvertFrom-Json
  if ($loj.success) { Write-Host " Logout successful" -ForegroundColor Green } else { Write-Host " Logout failed" -ForegroundColor Red }
} catch { Write-Host " Logout error: $($_.Exception.Message)" -ForegroundColor Red }

Write-Host "`n Completed" -ForegroundColor Cyan
