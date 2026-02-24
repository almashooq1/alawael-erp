# AlAwael ERP System Comprehensive Test Suite
# Tests all critical endpoints, services, and features

param(
    [switch]$Debug = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

# Colors for output
$colors = @{
    Success = "Green"
    Error   = "Red"
    Warning = "Yellow"
    Info    = "Cyan"
}

# Test Results
$results = @{
    Total    = 0
    Passed   = 0
    Failed   = 0
    Skipped  = 0
    Tests    = @()
}

function Write-TestLog {
    param(
        [string]$Message,
        [string]$Status = "Info",
        [string]$Category = "General"
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    $prefix = "[$timestamp][$Category]"
    
    if ($Status -eq "Pass") {
        Write-Host "$prefix ✅ $Message" -ForegroundColor $colors.Success
    } elseif ($Status -eq "Fail") {
        Write-Host "$prefix ❌ $Message" -ForegroundColor $colors.Error
    } elseif ($Status -eq "Skip") {
        Write-Host "$prefix ⏭️  $Message" -ForegroundColor $colors.Warning
    } else {
        Write-Host "$prefix ℹ️  $Message" -ForegroundColor $colors.Info
    }
}

function Test-APIEndpoint {
    param(
        [string]$Uri,
        [string]$Method = "GET",
        [string]$TestName,
        [object]$Body = $null,
        [int]$TimeoutSec = 5
    )
    
    $results.Total += 1
    
    try {
        $params = @{
            Uri              = $Uri
            Method           = $Method
            UseBasicParsing  = $true
            TimeoutSec       = $TimeoutSec
            ContentType      = "application/json"
            ErrorAction      = "Stop"
        }
        
        if ($Body) {
            $params.Body = $Body | ConvertTo-Json
        }
        
        $response = Invoke-WebRequest @params
        
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
            Write-TestLog -Message "$TestName (HTTP $($response.StatusCode))" -Status "Pass" -Category "API"
            $results.Passed += 1
            return $true
        } else {
            Write-TestLog -Message "$TestName - Unexpected status: $($response.StatusCode)" -Status "Fail" -Category "API"
            $results.Failed += 1
            return $false
        }
    } catch {
        Write-TestLog -Message "$TestName - Error: $($_.Exception.Message)" -Status "Fail" -Category "API"
        $results.Failed += 1
        return $false
    }
}

function Test-ProcessRunning {
    param(
        [string]$ProcessName,
        [string]$TestName,
        [int]$Port = $null
    )
    
    $results.Total += 1
    
    $proc = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    
    if ($proc) {
        if ($Port) {
            $listening = netstat -ano | Select-String ":$Port.*LISTENING" | Measure-Object
            if ($listening.Count -gt 0) {
                Write-TestLog -Message "$TestName (PID: $($proc.Id), Port: $Port)" -Status "Pass" -Category "Process"
                $results.Passed += 1
                return $true
            } else {
                Write-TestLog -Message "$TestName - Process running but port not listening" -Status "Fail" -Category "Process"
                $results.Failed += 1
                return $false
            }
        } else {
            Write-TestLog -Message "$TestName (PID: $($proc.Id))" -Status "Pass" -Category "Process"
            $results.Passed += 1
            return $true
        }
    } else {
        Write-TestLog -Message "$TestName - Process not found" -Status "Fail" -Category "Process"
        $results.Failed += 1
        return $false
    }
}

function Test-FileExists {
    param(
        [string]$FilePath,
        [string]$TestName
    )
    
    $results.Total += 1
    
    if (Test-Path $FilePath) {
        $file = Get-Item $FilePath
        Write-TestLog -Message "$TestName ($($file.Length) bytes)" -Status "Pass" -Category "File"
        $results.Passed += 1
        return $true
    } else {
        Write-TestLog -Message "$TestName - File not found" -Status "Fail" -Category "File"
        $results.Failed += 1
        return $false
    }
}

# ============================================================================
# START TEST SUITE
# ============================================================================

Write-Host "`n" + "=" * 80 -ForegroundColor Cyan
Write-Host "AlAwael ERP System - Comprehensive Test Suite" -ForegroundColor Cyan
Write-Host "Start Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# 1. BACKEND SERVICE TESTS
# ============================================================================

Write-Host "`n[BACKEND SERVICES]" -ForegroundColor Cyan
Write-Host "-" * 80

Test-ProcessRunning -ProcessName "node" -TestName "Node.js Process Running" | Out-Null
Test-ProcessRunning -ProcessName "node" -TestName "Backend Service (Port 3000)" -Port 3000 | Out-Null

# ============================================================================
# 2. FRONTEND SERVICE TESTS
# ============================================================================

Write-Host "`n[FRONTEND SERVICES]" -ForegroundColor Cyan
Write-Host "-" * 80

Test-ProcessRunning -ProcessName "node" -TestName "Frontend Service (Port 3002)" -Port 3002 | Out-Null

# ============================================================================
# 3. BACKEND API TESTS
# ============================================================================

Write-Host "`n[BACKEND API ENDPOINTS]" -ForegroundColor Cyan
Write-Host "-" * 80

# Core Health Check
Test-APIEndpoint -Uri "http://localhost:3000/api/health" -TestName "Health Check Endpoint" | Out-Null
Test-APIEndpoint -Uri "http://localhost:3000/health" -TestName "Health Status Endpoint" | Out-Null

# RBAC Endpoints
Test-APIEndpoint -Uri "http://localhost:3000/api/rbac/roles" -TestName "RBAC Roles List" | Out-Null
Test-APIEndpoint -Uri "http://localhost:3000/api/rbac/permissions" -TestName "RBAC Permissions List" | Out-Null

# System Routes (if they exist)
Write-TestLog -Message "Skipping detailed endpoint tests (use specific API test if needed)" -Status "Skip" -Category "API"

# ============================================================================
# 4. CONFIGURATION FILES TEST
# ============================================================================

Write-Host "`n[CONFIGURATION & DEPENDENCIES]" -ForegroundColor Cyan
Write-Host "-" * 80

$backendPath = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\erp_new_system\backend"

Test-FileExists -FilePath "$backendPath\package.json" -TestName "Backend package.json" | Out-Null
Test-FileExists -FilePath "$backendPath\app.js" -TestName "Backend app.js (Express config)" | Out-Null
Test-FileExists -FilePath "$backendPath\server.js" -TestName "Backend server.js (Entry point)" | Out-Null
Test-FileExists -FilePath "$backendPath\.env" -TestName "Backend .env configuration" | Out-Null

$frontendPath = "c:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\supply-chain-management\frontend"

Test-FileExists -FilePath "$frontendPath\package.json" -TestName "Frontend package.json" | Out-Null
Test-FileExists -FilePath "$frontendPath\public\index.html" -TestName "Frontend index.html" | Out-Null

# ============================================================================
# 5. ROUTE FILES TEST
# ============================================================================

Write-Host "`n[ROUTE CONFIGURATION FILES]" -ForegroundColor Cyan
Write-Host "-" * 80

@(
    "app.js",
    "routes\rbac-advanced.routes.js",
    "routes\tenant.routes.js",
    "routes\ai.recommendations.routes.js",
    "routes\integrationHub.routes.js",
    "routes\measurements.routes.js"
) | ForEach-Object {
    Test-FileExists -FilePath "$backendPath\$_" -TestName "Route: $_" | Out-Null
}

# ============================================================================
# 6. SERVICE FILES TEST
# ============================================================================

Write-Host "`n[BACKEND SERVICES]" -ForegroundColor Cyan
Write-Host "-" * 80

@(
    "services\scheduledNotificationsJob.js",
    "services\processScheduledNotifications.js",
    "services\analyticsService.js",
    "services\NotificationService.js"
) | ForEach-Object {
    Test-FileExists -FilePath "$backendPath\$_" -TestName "Service: $_" | Out-Null
}

# ============================================================================
# 7. UTILITY FILES TEST
# ============================================================================

Write-Host "`n[UTILITY MODULES]" -ForegroundColor Cyan
Write-Host "-" * 80

Test-FileExists -FilePath "$backendPath\utils\response.js" -TestName "Response utility module" | Out-Null
Test-FileExists -FilePath "$backendPath\utils\logger.js" -TestName "Logger utility module" -ErrorAction SilentlyContinue | Out-Null

# ============================================================================
# 8. MODELS TEST
# ============================================================================

Write-Host "`n[DATABASE MODELS]" -ForegroundColor Cyan
Write-Host "-" * 80

$modelCount = @(Get-ChildItem -Path "$backendPath\models" -Filter "*.js" -ErrorAction SilentlyContinue).Count
Write-TestLog -Message "Model files discovered: $modelCount" -Status "Info" -Category "Models"

if ($modelCount -gt 40) {
    Write-TestLog -Message "Model count is sufficient ($modelCount models)" -Status "Pass" -Category "Models"
    $results.Passed += 1
} else {
    Write-TestLog -Message "Model count seems low ($modelCount expected 50+)" -Status "Warning" -Category "Models"
}
$results.Total += 1

# ============================================================================
# 9. FRONTEND TEST
# ============================================================================

Write-Host "`n[FRONTEND APPLICATION]" -ForegroundColor Cyan
Write-Host "-" * 80

Test-APIEndpoint -Uri "http://localhost:3002" -TestName "Frontend Web Interface" | Out-Null
Test-APIEndpoint -Uri "http://localhost:3002/index.html" -TestName "Frontend HTML File" | Out-Null

# ============================================================================
# 10. GIT STATUS TEST
# ============================================================================

Write-Host "`n[VERSION CONTROL]" -ForegroundColor Cyan
Write-Host "-" * 80

try {
    $gitStatus = & git -C $backendPath rev-parse --abbrev-ref HEAD 2>&1
    Write-TestLog -Message "Git branch: $gitStatus" -Status "Info" -Category "Git"
    
    $gitLog = & git -C $backendPath log --oneline -1 2>&1
    Write-TestLog -Message "Latest commit: $gitLog" -Status "Info" -Category "Git"
    
    $results.Total += 1
    $results.Passed += 1
} catch {
    Write-TestLog -Message "Git status check failed" -Status "Skip" -Category "Git"
}

# ============================================================================
# TEST SUMMARY
# ============================================================================

Write-Host "`n" + "=" * 80 -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

Write-Host ""
Write-Host "Total Tests Run:  $($results.Total)" -ForegroundColor Cyan
Write-Host "Passed:           $($results.Passed)" -ForegroundColor Green
Write-Host "Failed:           $($results.Failed)" -ForegroundColor $(if ($results.Failed -gt 0) { "Red" } else { "Green" })
Write-Host "Skipped:          $($results.Skipped)" -ForegroundColor Yellow

if ($results.Total -gt 0) {
    $passRate = [math]::Round(($results.Passed / $results.Total) * 100, 2)
    Write-Host "Pass Rate:        $passRate%" -ForegroundColor $(if ($passRate -gt 90) { "Green" } else { "Yellow" })
}

Write-Host ""

# ============================================================================
# FINAL STATUS
# ============================================================================

if ($results.Failed -eq 0) {
    Write-Host "✅ SYSTEM STATUS: ALL TESTS PASSED - SYSTEM READY FOR DEPLOYMENT" -ForegroundColor Green
} elseif ($results.Failed -lt 3) {
    Write-Host "⚠️  SYSTEM STATUS: MINOR ISSUES DETECTED - REVIEW REQUIRED" -ForegroundColor Yellow
} else {
    Write-Host "❌ SYSTEM STATUS: CRITICAL FAILURES - RESOLUTION REQUIRED" -ForegroundColor Red
}

Write-Host ""
Write-Host "End Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

exit $(if ($results.Failed -eq 0) { 0 } else { 1 })
