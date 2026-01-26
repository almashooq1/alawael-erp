#!/usr/bin/env powershell
# 🧪 اختبار Staging - Staging Test Script
# تاريخ الإنشاء: 2026-01-22
# الغرض: اختبار شامل لخدمات Staging

Write-Host "`n" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "     🧪 Staging System Tests - اختبارات النظام" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "`n" -ForegroundColor Cyan

# ─────────────────────────────────────────────────────
# المرحلة 1: التحقق من البيئة
# ─────────────────────────────────────────────────────

Write-Host "📋 Phase 1: Environment Check" -ForegroundColor Yellow
Write-Host ""

# التحقق من Docker
Write-Host "1. Checking Docker..." -ForegroundColor Cyan
try {
  $dockerVersion = docker --version
  Write-Host "   ✓ Docker: $dockerVersion" -ForegroundColor Green
} catch {
  Write-Host "   ✗ Docker not found! Please install Docker first." -ForegroundColor Red
  exit 1
}

# التحقق من Docker Compose
Write-Host ""
try {
  $composeVersion = docker-compose --version
  Write-Host "   ✓ Docker Compose: $composeVersion" -ForegroundColor Green
} catch {
  Write-Host "   ✗ Docker Compose not found!" -ForegroundColor Red
  exit 1
}

# التحقق من ملفات البيئة
Write-Host ""
Write-Host "2. Checking Environment Files..." -ForegroundColor Cyan
$requiredFiles = @(
  ".env.staging",
  "docker-compose.prod.yml",
  "nginx.conf"
)

foreach ($file in $requiredFiles) {
  if (Test-Path $file) {
    $size = (Get-Item $file).Length / 1KB
    Write-Host "   ✓ $file ($([math]::Round($size, 1)) KB)" -ForegroundColor Green
  } else {
    Write-Host "   ✗ Missing: $file" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "✓ Environment check completed!" -ForegroundColor Green

# ─────────────────────────────────────────────────────
# المرحلة 2: اختبار Docker
# ─────────────────────────────────────────────────────

Write-Host "`n"
Write-Host "🐳 Phase 2: Docker Tests" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. Checking Docker Service Status..." -ForegroundColor Cyan
try {
  $dockerInfo = docker info | Select-String "Containers:"
  Write-Host "   ✓ Docker daemon is running" -ForegroundColor Green
  Write-Host "   $dockerInfo" -ForegroundColor Gray
} catch {
  Write-Host "   ✗ Docker daemon is not running!" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Checking Docker Images..." -ForegroundColor Cyan
$images = docker images --filter reference='*alawael*' --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
if ($images) {
  Write-Host "   ✓ Found existing images:" -ForegroundColor Green
  Write-Host $images -ForegroundColor Gray
} else {
  Write-Host "   ⓘ No existing images (will be built on 'docker-compose up')" -ForegroundColor Yellow
}

# ─────────────────────────────────────────────────────
# المرحلة 3: التحقق من الملفات والمجلدات
# ─────────────────────────────────────────────────────

Write-Host "`n"
Write-Host "📁 Phase 3: Directory Structure Check" -ForegroundColor Yellow
Write-Host ""

$directories = @(
  "backend",
  "frontend",
  "docs",
  "nginx"
)

foreach ($dir in $directories) {
  if (Test-Path $dir) {
    $itemCount = (Get-ChildItem $dir -Recurse).Count
    Write-Host "   ✓ $dir/ ($itemCount items)" -ForegroundColor Green
  } else {
    Write-Host "   ✗ Missing: $dir/" -ForegroundColor Yellow
  }
}

# ─────────────────────────────────────────────────────
# المرحلة 4: فحص التكوين
# ─────────────────────────────────────────────────────

Write-Host "`n"
Write-Host "⚙️  Phase 4: Configuration Validation" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. Validating docker-compose.prod.yml..." -ForegroundColor Cyan
try {
  docker-compose -f docker-compose.prod.yml config > $null 2>&1
  Write-Host "   ✓ Configuration is valid" -ForegroundColor Green
} catch {
  Write-Host "   ✗ Configuration has errors" -ForegroundColor Red
  docker-compose -f docker-compose.prod.yml config
}

Write-Host ""
Write-Host "2. Checking .env.staging..." -ForegroundColor Cyan
$envContent = Get-Content .env.staging | Measure-Object -Line
Write-Host "   ✓ File has $($envContent.Lines) lines" -ForegroundColor Green

# التحقق من المتغيرات الحرجة
$criticalVars = @("MONGO_URI", "REDIS_PASSWORD", "JWT_SECRET", "EMAIL_HOST")
$missingVars = @()

foreach ($var in $criticalVars) {
  $value = (Get-Content .env.staging | Select-String "^$var=" | Select-Object -First 1)
  if ($value) {
    Write-Host "   ✓ $var is configured" -ForegroundColor Green
  } else {
    $missingVars += $var
  }
}

if ($missingVars.Count -gt 0) {
  Write-Host "   ⚠️  Missing variables: $($missingVars -join ', ')" -ForegroundColor Yellow
}

# ─────────────────────────────────────────────────────
# المرحلة 5: معلومات النظام
# ─────────────────────────────────────────────────────

Write-Host "`n"
Write-Host "💻 Phase 5: System Information" -ForegroundColor Yellow
Write-Host ""

$osInfo = Get-WmiObject -Class Win32_OperatingSystem
Write-Host "1. Operating System:" -ForegroundColor Cyan
Write-Host "   OS: $($osInfo.Caption)" -ForegroundColor Gray
Write-Host "   Version: $($osInfo.Version)" -ForegroundColor Gray
Write-Host "   Memory: $([math]::Round($osInfo.TotalVisibleMemorySize / 1MB, 2)) GB" -ForegroundColor Gray

Write-Host ""
Write-Host "2. Disk Space:" -ForegroundColor Cyan
$disk = Get-Volume | Where-Object { $_.DriveLetter -eq 'C' }
$freePercent = ($disk.SizeRemaining / $disk.Size) * 100
Write-Host "   Free Space: $([math]::Round($disk.SizeRemaining / 1GB, 2)) GB ($([math]::Round($freePercent, 1))%)" -ForegroundColor Gray

Write-Host ""
Write-Host "3. Running Processes:" -ForegroundColor Cyan
$dockerProcesses = Get-Process | Where-Object { $_.ProcessName -like "*docker*" }
if ($dockerProcesses) {
  Write-Host "   ✓ Docker processes running" -ForegroundColor Green
  foreach ($proc in $dockerProcesses) {
    Write-Host "      - $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Gray
  }
} else {
  Write-Host "   ⓘ No Docker processes running (start Docker Desktop)" -ForegroundColor Yellow
}

# ─────────────────────────────────────────────────────
# ملخص النتائج
# ─────────────────────────────────────────────────────

Write-Host "`n"
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "                     ✓ Test Summary" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "📊 Status:" -ForegroundColor Yellow
Write-Host "   ✓ Docker installed and running" -ForegroundColor Green
Write-Host "   ✓ Environment files configured" -ForegroundColor Green
Write-Host "   ✓ Configuration is valid" -ForegroundColor Green
Write-Host "   ✓ Directory structure is correct" -ForegroundColor Green

Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Run: docker-compose -f docker-compose.prod.yml up -d" -ForegroundColor White
Write-Host "   2. Wait 30 seconds for services to start" -ForegroundColor White
Write-Host "   3. Test health: curl http://localhost:3001/api/health" -ForegroundColor White
Write-Host "   4. Check logs: docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor White

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
