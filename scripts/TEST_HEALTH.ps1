param(
    [int]$Port = 3001,
    [string]$Base = "http://localhost:$Port/api",
    [string]$AdminEmail = "admin@alawael.com",
    [string]$AdminPassword = "Admin@123456",
    [string]$SearchPath = "search/full-text?query=accounting",
    [string]$AltSearchPath = "search?query=accounting"
)

function Try-Get {
    param([string]$Url, [hashtable]$Headers)
    try {
        $r = Invoke-WebRequest -Uri $Url -Headers $Headers -UseBasicParsing -TimeoutSec 4 -ErrorAction Stop
        $json = $null
        if ($r.Content) { $json = $r.Content | ConvertFrom-Json }
        Write-Host "  GET $Url -> $($r.StatusCode)" -ForegroundColor Green
        return @{ status = $r.StatusCode; json = $json }
    }
    catch {
        Write-Host "  GET $Url -> ERROR $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Try-PostJson {
    param([string]$Url, [hashtable]$Body)
    try {
        $payload = $Body | ConvertTo-Json
        $r = Invoke-WebRequest -Uri $Url -Method Post -Body $payload -ContentType "application/json" -UseBasicParsing -TimeoutSec 4 -ErrorAction Stop
        $json = $null
        if ($r.Content) { $json = $r.Content | ConvertFrom-Json }
        Write-Host "  POST $Url -> $($r.StatusCode)" -ForegroundColor Green
        return @{ status = $r.StatusCode; json = $json }
    }
    catch {
        Write-Host "  POST $Url -> ERROR $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host "=== Health Tests (Port $Port) ===" -ForegroundColor Cyan
$health = Try-Get "$Base/health" $null

Write-Host "\nSearch (unauth): $SearchPath" -ForegroundColor Yellow
$unauth = Try-Get "$Base/$SearchPath" $null
if ((-not $unauth) -and $AltSearchPath) {
    Write-Host "  Retrying unauth search with alt path: $AltSearchPath" -ForegroundColor Yellow
    Try-Get "$Base/$AltSearchPath" $null | Out-Null
}

Write-Host "\nValidation: email/phone" -ForegroundColor Yellow
Try-PostJson "$Base/validate/email" @{ email = "test@example.com" } | Out-Null
Try-PostJson "$Base/validate/phone" @{ phone = "+20101234567" } | Out-Null

Write-Host "\nLogin: admin" -ForegroundColor Yellow
$login = Try-PostJson "$Base/auth/login" @{ email = $AdminEmail; password = $AdminPassword }
$token = $null
if ($login -and $login.json) {
    $json = $login.json
    if ($json.success -and $json.data -and $json.data.accessToken) { $token = $json.data.accessToken }
    elseif ($json.token) { $token = $json.token }
    elseif ($json.data -and $json.data.token) { $token = $json.data.token }
}

if ($token) {
    Write-Host "  Login OK, token issued" -ForegroundColor Green
    Write-Host "\nSearch (auth): $SearchPath" -ForegroundColor Yellow
    $headers = @{ Authorization = "Bearer $token" }
    $authSearch = Try-Get "$Base/$SearchPath" $headers
    if ((-not $authSearch) -and $AltSearchPath) {
        Write-Host "  Retrying auth search with alt path: $AltSearchPath" -ForegroundColor Yellow
        Try-Get "$Base/$AltSearchPath" $headers | Out-Null
    }
}
else {
    Write-Host "  Login failed" -ForegroundColor Red
}

Write-Host "\nDone." -ForegroundColor Cyan
param(
    [int]$Port = 3001,
    [string]$Base = "http://localhost:$Port/api",
    [string]$AdminEmail = "admin@alawael.com",
    [string]$AdminPassword = "Admin@123456"
)

function Try-Get {
    param([string]$Url)
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 4 -ErrorAction Stop
        $json = $r.Content | ConvertFrom-Json
        Write-Host "  GET $Url -> $($r.StatusCode)" -ForegroundColor Green
        return $json
    }
    catch { Write-Host "  GET $Url -> ERROR $($_.Exception.Message)" -ForegroundColor Red }
}

function Try-PostJson {
    param([string]$Url, [hashtable]$Body)
    try {
        $payload = $Body | ConvertTo-Json
        $r = Invoke-WebRequest -Uri $Url -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 4 -ErrorAction Stop
        $json = $r.Content | ConvertFrom-Json
        Write-Host "  POST $Url -> $($r.StatusCode)" -ForegroundColor Green
        return $json
    }
    catch { Write-Host "  POST $Url -> ERROR $($_.Exception.Message)" -ForegroundColor Red }
}

Write-Host "=== Health Tests (Port $Port) ===" -ForegroundColor Cyan
$health = Try-Get "$Base/health"

Write-Host "\nSearch: full-text" -ForegroundColor Yellow
Try-Get "$Base/search/full-text?query=accounting"

Write-Host "\nValidation: email/phone" -ForegroundColor Yellow
Try-PostJson "$Base/validate/email" @{ email = "test@example.com" } | Out-Null
Try-PostJson "$Base/validate/phone" @{ phone = "+20101234567" } | Out-Null

Write-Host "\nLogin: admin" -ForegroundColor Yellow
$login = Try-PostJson "$Base/auth/login" @{ email = $AdminEmail; password = $AdminPassword }
if ($login -and $login.token) { Write-Host "  Login OK, token issued" -ForegroundColor Green } else { Write-Host "  Login failed" -ForegroundColor Red }

Write-Host "\nDone." -ForegroundColor Cyan
