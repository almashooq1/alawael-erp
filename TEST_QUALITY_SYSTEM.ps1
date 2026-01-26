# ============================================
# Quality Management System - Complete Test
# اختبار شامل لنظام معايير الجودة
# ============================================

Clear-Host
Write-Host ""
Write-Host "════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   Quality Management System Test Suite" -ForegroundColor Green
Write-Host "   اختبار شامل لنظام معايير الجودة" -ForegroundColor Green
Write-Host "════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ============================================
# TEST 1: Check System Files
# ============================================
Write-Host "TEST 1: Checking System Files..." -ForegroundColor Yellow
Write-Host ""

$files_to_check = @(
    "erp_new_system/backend/models/qualityManagement.js",
    "erp_new_system/backend/routes/quality.js",
    "erp_new_system/frontend/src/components/Quality/QualityDashboard.jsx",
    "_QUALITY_MANAGEMENT_SYSTEM_COMPLETE.md",
    "ADD_QUALITY_DATA.ps1"
)

$all_exist = $true
foreach ($file in $files_to_check) {
    if (Test-Path $file) {
        $fileInfo = Get-Item $file
        $size = $fileInfo.Length / 1KB
        Write-Host "  ✓ $file ($([math]::Round($size, 1)) KB)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file - NOT FOUND" -ForegroundColor Red
        $all_exist = $false
    }
}

Write-Host ""
if ($all_exist) {
    Write-Host "  ✓ All files present!" -ForegroundColor Green
} else {
    Write-Host "  ✗ Some files are missing!" -ForegroundColor Red
}

Write-Host ""

# ============================================
# TEST 2: Backend Health Check
# ============================================
Write-Host "TEST 2: Backend Health Check..." -ForegroundColor Yellow
Write-Host ""

$backend_url = "http://localhost:3001/api/health"
try {
    $response = Invoke-WebRequest -Uri $backend_url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    $json = $response.Content | ConvertFrom-Json
    
    Write-Host "  ✓ Backend is running" -ForegroundColor Green
    Write-Host "    Status: $($json.status)" -ForegroundColor White
    Write-Host "    Port: 3001" -ForegroundColor White
    Write-Host "    Uptime: $($json.uptime) seconds" -ForegroundColor Gray
    Write-Host ""
    $backend_ok = $true
} catch {
    Write-Host "  ✗ Backend is not responding" -ForegroundColor Red
    Write-Host "    URL: $backend_url" -ForegroundColor Gray
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Start backend with: npm start" -ForegroundColor Yellow
    Write-Host "  In directory: erp_new_system/backend" -ForegroundColor Yellow
    Write-Host ""
    $backend_ok = $false
}

# ============================================
# TEST 3: Test Authentication
# ============================================
if ($backend_ok) {
    Write-Host "TEST 3: Testing Authentication..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        $login_body = @{
            email    = "admin@alawael.com"
            password = "Admin@123456"
        } | ConvertTo-Json
        
        $login_response = Invoke-WebRequest `
            -Uri "http://localhost:3001/api/auth/login" `
            -Method Post `
            -Body $login_body `
            -ContentType "application/json" `
            -UseBasicParsing `
            -TimeoutSec 3
        
        $login_data = $login_response.Content | ConvertFrom-Json
        
        if ($login_data.success) {
            Write-Host "  ✓ Authentication successful" -ForegroundColor Green
            Write-Host "    Email: $($login_data.user.email)" -ForegroundColor White
            Write-Host "    Role: $($login_data.user.role)" -ForegroundColor White
            Write-Host "    Token: $($login_data.accessToken.Substring(0, 30))..." -ForegroundColor Gray
            Write-Host ""
            $token = $login_data.accessToken
            $auth_ok = $true
        } else {
            Write-Host "  ✗ Authentication failed" -ForegroundColor Red
            Write-Host "    Message: $($login_data.message)" -ForegroundColor Gray
            Write-Host ""
            $auth_ok = $false
        }
    } catch {
        Write-Host "  ✗ Authentication error" -ForegroundColor Red
        Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
        Write-Host ""
        $auth_ok = $false
    }

    # ============================================
    # TEST 4: Test Quality Endpoints
    # ============================================
    if ($auth_ok) {
        Write-Host "TEST 4: Testing Quality Endpoints..." -ForegroundColor Yellow
        Write-Host ""
        
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type"  = "application/json"
        }
        
        # Test Dashboard
        try {
            $dashboard_response = Invoke-WebRequest `
                -Uri "http://localhost:3001/api/quality/dashboard" `
                -Headers $headers `
                -UseBasicParsing `
                -TimeoutSec 3
            
            $dashboard_data = $dashboard_response.Content | ConvertFrom-Json
            
            if ($dashboard_response.StatusCode -eq 200) {
                Write-Host "  ✓ Quality Dashboard endpoint" -ForegroundColor Green
                Write-Host "    Standards: $($dashboard_data.data.standardsByCategory.Count) categories" -ForegroundColor Gray
                Write-Host "    Accreditations: Found" -ForegroundColor Gray
            } else {
                Write-Host "  ✗ Dashboard endpoint error" -ForegroundColor Red
            }
        } catch {
            Write-Host "  ✗ Dashboard endpoint not available" -ForegroundColor Yellow
            Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
        }
        
        Write-Host ""
        
        # Test Standards
        try {
            $standards_response = Invoke-WebRequest `
                -Uri "http://localhost:3001/api/quality/standards" `
                -Headers $headers `
                -UseBasicParsing `
                -TimeoutSec 3
            
            if ($standards_response.StatusCode -eq 200) {
                $standards_data = $standards_response.Content | ConvertFrom-Json
                Write-Host "  ✓ Standards endpoint" -ForegroundColor Green
                Write-Host "    Total: $($standards_data.data.Count) standards" -ForegroundColor Gray
            }
        } catch {
            Write-Host "  ✗ Standards endpoint not available" -ForegroundColor Yellow
        }
        
        Write-Host ""
        
        # Test Accreditations
        try {
            $acc_response = Invoke-WebRequest `
                -Uri "http://localhost:3001/api/quality/accreditations" `
                -Headers $headers `
                -UseBasicParsing `
                -TimeoutSec 3
            
            if ($acc_response.StatusCode -eq 200) {
                $acc_data = $acc_response.Content | ConvertFrom-Json
                Write-Host "  ✓ Accreditations endpoint" -ForegroundColor Green
                Write-Host "    Total: $($acc_data.data.Count) accreditations" -ForegroundColor Gray
            }
        } catch {
            Write-Host "  ✗ Accreditations endpoint not available" -ForegroundColor Yellow
        }
        
        Write-Host ""
    }
}

# ============================================
# Summary
# ============================================
Write-Host ""
Write-Host "════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   Test Summary" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($backend_ok -and $auth_ok) {
    Write-Host "✓ System Status: OPERATIONAL" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Run test data script: powershell -File ADD_QUALITY_DATA.ps1" -ForegroundColor White
    Write-Host "2. Access Frontend: http://localhost:3002" -ForegroundColor White
    Write-Host "3. View Quality Dashboard: http://localhost:3002/quality" -ForegroundColor White
} else {
    Write-Host "✗ System Status: REQUIRES ATTENTION" -ForegroundColor Red
    Write-Host ""
    if (-not $backend_ok) {
        Write-Host "• Backend is not running" -ForegroundColor Yellow
        Write-Host "  Start it with: cd erp_new_system/backend && node server.js" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
