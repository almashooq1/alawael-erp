# Simple System Health Check
Write-Host "System Health Check" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host ""

$BACKEND_DIR = "erp_new_system/backend"

# Check Node
Write-Host "Checking Node.js..." -NoNewline
try {
    $node = node -v 2>$null
    Write-Host " OK: $node" -ForegroundColor Green
} catch {
    Write-Host " NOT FOUND" -ForegroundColor Red
}

# Check npm
Write-Host "Checking npm..." -NoNewline
try {
    $npm = npm -v 2>$null
    Write-Host " OK: $npm" -ForegroundColor Green
} catch {
    Write-Host " NOT FOUND" -ForegroundColor Red
}

# Check backend dir
Write-Host "Checking backend directory..." -NoNewline
if (Test-Path $BACKEND_DIR) {
    Write-Host " FOUND" -ForegroundColor Green
} else {
    Write-Host " NOT FOUND" -ForegroundColor Red
}

# Check package.json
Write-Host "Checking package.json..." -NoNewline
if (Test-Path "$BACKEND_DIR/package.json") {
    Write-Host " FOUND" -ForegroundColor Green
} else {
    Write-Host " NOT FOUND" -ForegroundColor Red
}

# Check .env
Write-Host "Checking .env..." -NoNewline
if (Test-Path "$BACKEND_DIR/.env") {
    Write-Host " FOUND" -ForegroundColor Green
} else {
    Write-Host " NOT FOUND" -ForegroundColor Yellow
}

# Check node_modules
Write-Host "Checking node_modules..." -NoNewline
if (Test-Path "$BACKEND_DIR/node_modules") {
    $count = (Get-ChildItem "$BACKEND_DIR/node_modules" -Directory | Measure-Object).Count
    Write-Host " YES ($count modules)" -ForegroundColor Green
} else {
    Write-Host " NOT INSTALLED" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. cd $BACKEND_DIR"
Write-Host "2. npm install (if needed)"
Write-Host "3. npm start"
