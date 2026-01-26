# 🔍 تشخيص وإصلاح مشاكل تسجيل الدخول
# تشغيل: .\diagnose_login_issues.ps1

Write-Host "=== Diagnosing Login Issues ===" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Get-Location
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"

$issues = @()
$fixes = @()

# 1. Check auth routes file
Write-Host "1. Checking auth routes..." -ForegroundColor Yellow
$authRoutesPath = Join-Path $backendPath "api\routes\auth.routes.js"
if (Test-Path $authRoutesPath) {
    Write-Host "   Auth routes file exists" -ForegroundColor Green
    $authContent = Get-Content $authRoutesPath -Raw
    if ($authContent -match "router\.post\(['\`"]/?login") {
        Write-Host "   Login endpoint found" -ForegroundColor Green
    }
    else {
        Write-Host "   Login endpoint NOT found" -ForegroundColor Red
        $issues += "Login endpoint missing in auth.routes.js"
    }
}
else {
    Write-Host "   Auth routes file NOT found" -ForegroundColor Red
    $issues += "auth.routes.js file missing"
}

# 2. Check middleware
Write-Host "`n2. Checking auth middleware..." -ForegroundColor Yellow
$authMiddlewarePath = Join-Path $backendPath "middleware\auth.middleware.js"
if (Test-Path $authMiddlewarePath) {
    Write-Host "   Auth middleware exists" -ForegroundColor Green
}
else {
    Write-Host "   Auth middleware NOT found" -ForegroundColor Red
    $issues += "auth.middleware.js missing"
}

# 3. Check User model
Write-Host "`n3. Checking User model..." -ForegroundColor Yellow
$userModelPath = Join-Path $backendPath "models\User.js"
if (Test-Path $userModelPath) {
    Write-Host "   User model exists" -ForegroundColor Green
    $userContent = Get-Content $userModelPath -Raw
    if ($userContent -match "comparePassword|bcrypt\.compare") {
        Write-Host "   Password comparison method exists" -ForegroundColor Green
    }
    else {
        Write-Host "   Password comparison method missing" -ForegroundColor Yellow
        $issues += "comparePassword method might be missing"
    }
}
else {
    Write-Host "   User model NOT found" -ForegroundColor Red
    $issues += "User.js model missing"
}

# 4. Check .env configuration
Write-Host "`n4. Checking environment configuration..." -ForegroundColor Yellow
$envPath = Join-Path $backendPath ".env"
if (Test-Path $envPath) {
    Write-Host "   .env file exists" -ForegroundColor Green
    $envContent = Get-Content $envPath -Raw
    if ($envContent -match "JWT_SECRET|SECRET_KEY") {
        Write-Host "   JWT secret configured" -ForegroundColor Green
    }
    else {
        Write-Host "   JWT secret missing" -ForegroundColor Red
        $issues += "JWT_SECRET not configured in .env"
    }
    if ($envContent -match "DATABASE_URL") {
        Write-Host "   Database URL configured" -ForegroundColor Green
    }
    else {
        Write-Host "   Database URL missing" -ForegroundColor Red
        $issues += "DATABASE_URL not configured"
    }
}
else {
    Write-Host "   .env file NOT found" -ForegroundColor Red
    $issues += ".env file missing"
}

# 5. Check if server.js loads auth routes
Write-Host "`n5. Checking server configuration..." -ForegroundColor Yellow
$serverPath = Join-Path $backendPath "server.js"
if (Test-Path $serverPath) {
    $serverContent = Get-Content $serverPath -Raw
    if ($serverContent -match "auth\.routes|authRoutes") {
        Write-Host "   Auth routes are loaded in server.js" -ForegroundColor Green
    }
    else {
        Write-Host "   Auth routes NOT loaded" -ForegroundColor Red
        $issues += "Auth routes not imported/used in server.js"
    }
    if ($serverContent -match "/api/auth") {
        Write-Host "   /api/auth endpoint registered" -ForegroundColor Green
    }
    else {
        Write-Host "   /api/auth endpoint NOT registered" -ForegroundColor Yellow
        $issues += "/api/auth endpoint might not be registered"
    }
}
else {
    Write-Host "   server.js NOT found" -ForegroundColor Red
    $issues += "server.js missing"
}

# 6. Check if dependencies are installed
Write-Host "`n6. Checking dependencies..." -ForegroundColor Yellow
Push-Location $backendPath
if (Test-Path "node_modules\bcrypt") {
    Write-Host "   bcrypt installed" -ForegroundColor Green
}
else {
    Write-Host "   bcrypt NOT installed" -ForegroundColor Red
    $issues += "bcrypt package missing"
    $fixes += "Run: npm install bcrypt"
}
if (Test-Path "node_modules\jsonwebtoken") {
    Write-Host "   jsonwebtoken installed" -ForegroundColor Green
}
else {
    Write-Host "   jsonwebtoken NOT installed" -ForegroundColor Red
    $issues += "jsonwebtoken package missing"
    $fixes += "Run: npm install jsonwebtoken"
}
Pop-Location

# 7. Test database connection
Write-Host "`n7. Testing database connection..." -ForegroundColor Yellow
$dbFile = Join-Path $backendPath "alawael_erp.db"
if (Test-Path $dbFile) {
    Write-Host "   SQLite database file exists" -ForegroundColor Green
    $dbSize = (Get-Item $dbFile).Length
    Write-Host "   Database size: $([math]::Round($dbSize/1KB, 2)) KB" -ForegroundColor Gray
}
else {
    Write-Host "   Database file not created yet" -ForegroundColor Yellow
    $fixes += "Database will be created on first run"
}

# Summary
Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
Write-Host ""

if ($issues.Count -eq 0) {
    Write-Host "No critical issues found!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Login should work. Try:" -ForegroundColor Cyan
    Write-Host "  cd backend" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
}
else {
    Write-Host "Found $($issues.Count) issue(s):" -ForegroundColor Red
    Write-Host ""
    foreach ($issue in $issues) {
        Write-Host "  - $issue" -ForegroundColor Yellow
    }
}

if ($fixes.Count -gt 0) {
    Write-Host "`nSuggested fixes:" -ForegroundColor Cyan
    foreach ($fix in $fixes) {
        Write-Host "  * $fix" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "=== Quick Test ===" -ForegroundColor Cyan
Write-Host "To test login manually:" -ForegroundColor White
Write-Host '  $body = @{email="admin@example.com";password="Admin@123"} | ConvertTo-Json' -ForegroundColor Gray
Write-Host '  Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $body -ContentType "application/json"' -ForegroundColor Gray
Write-Host ""
