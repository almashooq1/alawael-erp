# System Health Check and Verification Script for Windows
# فحص شامل وسريع لصحة النظام - نسخة Windows

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     بحث شامل وفحص صحة نظام ERP - System Audit        ║" -ForegroundColor Cyan
Write-Host "║     24 فبراير 2026 - February 24, 2026               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$BACKEND_DIR = "erp_new_system\backend"
$FRONTEND_DIR = "supply-chain-management\frontend"
$AGENT_DIR = "intelligent-agent\backend"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host "1️⃣  فحص المتطلبات الأساسية" -ForegroundColor Blue
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host ""

# Check Node version
Write-Host -NoNewline "✓ Node.js: "
try {
    $nodeVersion = node -v 2>$null
    if ($nodeVersion) {
        Write-Host $nodeVersion -ForegroundColor Green
    }
} catch {
    Write-Host "NOT FOUND" -ForegroundColor Red
}

# Check npm
Write-Host -NoNewline "✓ npm: "
try {
    $npmVersion = npm -v 2>$null
    if ($npmVersion) {
        Write-Host $npmVersion -ForegroundColor Green
    }
} catch {
    Write-Host "NOT FOUND" -ForegroundColor Red
}

# Check MongoDB
Write-Host -NoNewline "✓ MongoDB: "
if (Get-Command mongod -ErrorAction SilentlyContinue) {
    Write-Host "installed" -ForegroundColor Green
} else {
    Write-Host "NOT INSTALLED (using Mock DB)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host "2️⃣  فحص ملفات المشروع" -ForegroundColor Blue
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host ""

# Check backend directory
Write-Host -NoNewline "✓ Backend directory: "
if (Test-Path -Path $BACKEND_DIR) {
    Write-Host "found" -ForegroundColor Green
    Write-Host "  ├─ Checking package.json..."
    if (Test-Path "$BACKEND_DIR\package.json") {
        Write-Host "  │  " -NoNewline
        Write-Host "✓ package.json found" -ForegroundColor Green
    }
    Write-Host "  ├─ Checking app.js..."
    if (Test-Path "$BACKEND_DIR\app.js") {
        Write-Host "  │  " -NoNewline
        Write-Host "✓ app.js found" -ForegroundColor Green
    }
    Write-Host "  ├─ Checking server.js..."
    if (Test-Path "$BACKEND_DIR\server.js") {
        Write-Host "  │  " -NoNewline
        Write-Host "✓ server.js found" -ForegroundColor Green
    }
    Write-Host "  └─ Checking .env..."
    if (Test-Path "$BACKEND_DIR\.env") {
        Write-Host "     " -NoNewline
        Write-Host "✓ .env found" -ForegroundColor Green
    } else {
        Write-Host "     " -NoNewline
        Write-Host "⚠ .env NOT found" -ForegroundColor Red
    }
} else {
    Write-Host "NOT FOUND" -ForegroundColor Red
}

Write-Host ""

# Check frontend directory
Write-Host -NoNewline "✓ Frontend directory: "
if (Test-Path -Path $FRONTEND_DIR) {
    Write-Host "found" -ForegroundColor Green
} else {
    Write-Host "NOT FOUND" -ForegroundColor Yellow
}

Write-Host ""

# Check agent directory
Write-Host -NoNewline "✓ Intelligent Agent directory: "
if (Test-Path -Path $AGENT_DIR) {
    Write-Host "found" -ForegroundColor Green
} else {
    Write-Host "NOT FOUND" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host "3️⃣  فحص Dependencies" -ForegroundColor Blue
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host ""

$packageJsonPath = "$BACKEND_DIR\package.json"
if (Test-Path $packageJsonPath) {
    $packageContent = Get-Content $packageJsonPath -Raw
    
    Write-Host "Checking backend dependencies..."
    Write-Host -NoNewline "  ├─ express: "
    if ($packageContent -match '"express"') {
        Write-Host "✓" -ForegroundColor Green
    } else {
        Write-Host "✗" -ForegroundColor Red
    }
    
    Write-Host -NoNewline "  ├─ mongoose: "
    if ($packageContent -match '"mongoose"') {
        Write-Host "✓" -ForegroundColor Green
    } else {
        Write-Host "✗" -ForegroundColor Red
    }
    
    Write-Host -NoNewline "  ├─ dotenv: "
    if ($packageContent -match '"dotenv"') {
        Write-Host "✓" -ForegroundColor Green
    } else {
        Write-Host "✗" -ForegroundColor Red
    }
    
    Write-Host -NoNewline "  └─ cors: "
    if ($packageContent -match '"cors"') {
        Write-Host "✓" -ForegroundColor Green
    } else {
        Write-Host "✗" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host "4️⃣  فحص ملفات الإعدادات" -ForegroundColor Blue
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host ""

Write-Host "Database configs:"
Write-Host -NoNewline "  ├─ config/database.js: "
if (Test-Path "$BACKEND_DIR\config\database.js") {
    $dbContent = Get-Content "$BACKEND_DIR\config\database.js" -Raw
    if ($dbContent -match "USE_MOCK_DB|MONGODB_URI") {
        Write-Host "✓ (properly configured)" -ForegroundColor Green
    } else {
        Write-Host "⚠ (needs review)" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗" -ForegroundColor Red
}

Write-Host -NoNewline "  └─ config/production.js: "
if (Test-Path "$BACKEND_DIR\config\production.js") {
    Write-Host "✓" -ForegroundColor Green
} else {
    Write-Host "✗" -ForegroundColor Red
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host "5️⃣  Quick Start Instructions" -ForegroundColor Blue
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host ""

Write-Host "📋 للبدء مع النظام:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. تثبيت المتطلبات:"
Write-Host "   cd $BACKEND_DIR"
Write-Host "   npm install"
Write-Host ""
Write-Host "2. التحقق من .env (تأكد من USE_MOCK_DB=true للتطوير):"
Write-Host "   Get-Content .env | Select-String -Pattern 'MONGODB|USE_MOCK|NODE_ENV'"
Write-Host ""
Write-Host "3. بدء الخادم:"
Write-Host "   npm start"
Write-Host ""
Write-Host "4. الاختبار (في نافذة أخرى):"
Write-Host "   Invoke-WebRequest http://localhost:3000/api/cache-stats"
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ الفحص الشامل اكتمل بنجاح" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green

# Additional diagnostic info
Write-Host ""
Write-Host "📊 معلومات التشخيص الإضافية:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Check current directory
Write-Host "Current Directory: " -NoNewline
Write-Host "$(Get-Location)" -ForegroundColor Yellow

# Check Node modules status
Write-Host "node_modules status: " -NoNewline
if (Test-Path "$BACKEND_DIR\node_modules") {
    $moduleCount = (Get-ChildItem "$BACKEND_DIR\node_modules" -Directory | Measure-Object).Count
    Write-Host "$moduleCount modules installed" -ForegroundColor Green
} else {
    Write-Host "NOT INSTALLED - Run: npm install" -ForegroundColor Red
}

# Check .env status
Write-Host ".env configuration: " -NoNewline
if (Test-Path "$BACKEND_DIR\.env") {
    $useMockDb = Get-Content "$BACKEND_DIR\.env" | Select-String "USE_MOCK_DB"
    if ($useMockDb) {
        Write-Host "Configured" -ForegroundColor Green
        Write-Host "  └─ USE_MOCK_DB setting: " -NoNewline
        $mockDbValue = ($useMockDb.ToString() -split '=')[1]
        Write-Host $mockDbValue -ForegroundColor Cyan
    }
} else {
    Write-Host "NOT FOUND" -ForegroundColor Red
}
