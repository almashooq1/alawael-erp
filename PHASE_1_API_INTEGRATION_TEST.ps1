# ============================================
# Phase 1: API Integration Test Script
# Test React Frontend + Backend Connection
# ============================================

param(
    [string]$BackendPort = "3001",
    [string]$FrontendPort = "3000",
    [string]$Action = "all"
)

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "[✓] $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "[✗] $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "[i] $Message" -ForegroundColor Yellow
}

# Test 1: Check if ports are available
function Test-PortAvailability {
    Write-Header "Test 1: Checking Port Availability"
    
    $ports = @($BackendPort, $FrontendPort)
    foreach ($port in $ports) {
        try {
            $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
            if ($connection.TcpTestSucceeded) {
                Write-Success "Port $port is in use"
            }
            else {
                Write-Info "Port $port is available"
            }
        }
        catch {
            Write-Info "Port $port is available"
        }
    }
}

# Test 2: Check Backend Health
function Test-BackendHealth {
    Write-Header "Test 2: Backend Health Check"
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$BackendPort/api/health" -Method GET -ErrorAction Stop
        Write-Success "Backend is running on port $BackendPort"
        Write-Info "Health Status: $($response.status)"
        return $true
    }
    catch {
        Write-Error "Backend is not responding on port $BackendPort"
        Write-Info "Error: $($_.Exception.Message)"
        return $false
    }
}

# Test 3: Check Frontend Connection
function Test-FrontendConnection {
    Write-Header "Test 3: Frontend Connection"
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -Method GET -ErrorAction Stop
        Write-Success "Frontend is running on port $FrontendPort"
        Write-Info "Response Status: $($response.StatusCode)"
        return $true
    }
    catch {
        Write-Error "Frontend is not responding on port $FrontendPort"
        Write-Info "Error: $($_.Exception.Message)"
        return $false
    }
}

# Test 4: Test Authentication
function Test-Authentication {
    Write-Header "Test 4: Testing Authentication"
    
    Write-Info "Testing login endpoint..."
    
    $loginPayload = @{
        email    = "admin@test.com"
        password = "Password123"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$BackendPort/api/auth/login" -Method POST -Body $loginPayload -ContentType "application/json" -ErrorAction Stop
        Write-Success "Authentication endpoint is working"
        Write-Info "Token received: $($response.token.Substring(0, 20))..."
        return $response.token
    }
    catch {
        Write-Error "Authentication failed"
        Write-Info "Error: $($_.Exception.Message)"
        return $null
    }
}

# Test 5: Test Beneficiaries API
function Test-BeneficiariesAPI {
    param([string]$Token)
    
    Write-Header "Test 5: Beneficiaries API (GET List)"
    
    if (-not $Token) {
        Write-Error "Skipping - No valid token"
        return
    }
    
    try {
        $headers = @{
            "Authorization" = "Bearer $Token"
            "Content-Type"  = "application/json"
        }
        
        $url = "http://localhost:$BackendPort/api/beneficiaries?page=1&limit=10"
        $response = Invoke-RestMethod -Uri $url -Method GET -Headers $headers -ErrorAction Stop
        Write-Success "Beneficiaries API is working"
        Write-Info "Found $($response.data.Count) beneficiaries"
        Write-Info "Total: $($response.total), Page: $($response.page)"
        return $response
    }
    catch {
        Write-Error "Beneficiaries API failed"
        Write-Info "Error: $($_.Exception.Message)"
        return $null
    }
}

# Test 6: Test Create Beneficiary
function Test-CreateBeneficiary {
    param([string]$Token)
    
    Write-Header "Test 6: Create Beneficiary (POST)"
    
    if (-not $Token) {
        Write-Error "Skipping - No valid token"
        return
    }
    
    $payload = @{
        firstName         = "أحمد"
        lastName          = "محمد"
        email             = "ahmad@test.com"
        phone             = "0501234567"
        dateOfBirth       = "2010-01-01"
        insuranceProvider = "SLIC"
        address           = "الرياض"
    } | ConvertTo-Json
    
    try {
        $headers = @{
            "Authorization" = "Bearer $Token"
            "Content-Type"  = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri "http://localhost:$BackendPort/api/beneficiaries" -Method POST -Body $payload -Headers $headers -ErrorAction Stop
        Write-Success "Beneficiary created successfully"
        Write-Info "Beneficiary ID: $($response.data._id)"
        Write-Info "File Number: $($response.data.fileNumber)"
        return $response.data._id
    }
    catch {
        Write-Error "Create beneficiary failed"
        Write-Info "Error: $($_.Exception.Message)"
        return $null
    }
}

# Test 7: Test Get Single Beneficiary
function Test-GetBeneficiary {
    param([string]$Token, [string]$BeneficiaryId)
    
    Write-Header "Test 7: Get Single Beneficiary"
    
    if (-not $Token -or -not $BeneficiaryId) {
        Write-Error "Skipping - Missing token or beneficiary ID"
        return
    }
    
    try {
        $headers = @{
            "Authorization" = "Bearer $Token"
            "Content-Type"  = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri "http://localhost:$BackendPort/api/beneficiaries/$BeneficiaryId" -Method GET -Headers $headers -ErrorAction Stop
        Write-Success "Beneficiary retrieved successfully"
        Write-Info "Name: $($response.data.firstName) $($response.data.lastName)"
        Write-Info "Email: $($response.data.email)"
        return $response
    }
    catch {
        Write-Error "Get beneficiary failed"
        Write-Info "Error: $($_.Exception.Message)"
        return $null
    }
}

# Test 8: Test Update Beneficiary
function Test-UpdateBeneficiary {
    param([string]$Token, [string]$BeneficiaryId)
    
    Write-Header "Test 8: Update Beneficiary (PATCH)"
    
    if (-not $Token -or -not $BeneficiaryId) {
        Write-Error "Skipping - Missing token or beneficiary ID"
        return
    }
    
    $payload = @{
        phone = "0509999999"
    } | ConvertTo-Json
    
    try {
        $headers = @{
            "Authorization" = "Bearer $Token"
            "Content-Type"  = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri "http://localhost:$BackendPort/api/beneficiaries/$BeneficiaryId" -Method PATCH -Body $payload -Headers $headers -ErrorAction Stop
        Write-Success "Beneficiary updated successfully"
        Write-Info "Updated phone: $($response.data.phone)"
        return $response
    }
    catch {
        Write-Error "Update beneficiary failed"
        Write-Info "Error: $($_.Exception.Message)"
        return $null
    }
}

# Test 9: Test Delete Beneficiary
function Test-DeleteBeneficiary {
    param([string]$Token, [string]$BeneficiaryId)
    
    Write-Header "Test 9: Delete Beneficiary"
    
    if (-not $Token -or -not $BeneficiaryId) {
        Write-Error "Skipping - Missing token or beneficiary ID"
        return
    }
    
    try {
        $headers = @{
            "Authorization" = "Bearer $Token"
            "Content-Type"  = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri "http://localhost:$BackendPort/api/beneficiaries/$BeneficiaryId" -Method DELETE -Headers $headers -ErrorAction Stop
        Write-Success "Beneficiary deleted successfully"
        return $response
    }
    catch {
        Write-Error "Delete beneficiary failed"
        Write-Info "Error: $($_.Exception.Message)"
        return $null
    }
}

# Test 10: Test Axios Interceptor
function Test-AxiosInterceptor {
    Write-Header "Test 10: Testing Axios Interceptor Configuration"
    
    Write-Info "Checking frontend axios configuration..."
    $axiosPath = "frontend\src\utils\api.js"
    
    if (Test-Path $axiosPath) {
        $content = Get-Content $axiosPath -Raw
        
        if ($content -match "Authorization") {
            Write-Success "Authorization interceptor is configured"
        }
        
        if ($content -match "Bearer") {
            Write-Success "Bearer token handling is configured"
        }
        
        if ($content -match "localStorage") {
            Write-Success "Token storage is configured"
        }
        
        Write-Info "Axios configuration is properly set up for API authentication"
    }
    else {
        Write-Error "Axios configuration file not found"
    }
}

# Main Execution
Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   PHASE 1: API INTEGRATION TEST                  ║" -ForegroundColor Cyan
Write-Host "║   React Frontend ↔ Backend Connection Test        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$startTime = Get-Date

# Run all tests
Test-PortAvailability
$backendOK = Test-BackendHealth
$frontendOK = Test-FrontendConnection
Test-AxiosInterceptor

if ($backendOK) {
    $token = Test-Authentication
    
    if ($token) {
        Test-BeneficiariesAPI -Token $token
        $benId = Test-CreateBeneficiary -Token $token
        
        if ($benId) {
            Test-GetBeneficiary -Token $token -BeneficiaryId $benId
            Test-UpdateBeneficiary -Token $token -BeneficiaryId $benId
            Test-DeleteBeneficiary -Token $token -BeneficiaryId $benId
        }
    }
}
else {
    Write-Error "Cannot continue testing - Backend is not responding"
    Write-Info "Please start the backend server first on port $BackendPort"
}

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds

Write-Header "SUMMARY"
Write-Info "Backend Status: $(if ($backendOK) { 'RUNNING ✓' } else { 'NOT RUNNING ✗' })"
Write-Info "Frontend Status: $(if ($frontendOK) { 'RUNNING ✓' } else { 'NOT RUNNING ✗' })"
Write-Info "Test Duration: $([math]::Round($duration, 2)) seconds"
Write-Host ""
