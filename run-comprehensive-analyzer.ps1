# ============================================================================
# 🚀 COMPREHENSIVE PROJECT ANALYZER - Windows PowerShell Edition
# برنامج تشغيل أداة تحليل المشروع الشاملة - إصدار Windows PowerShell
# ============================================================================

param(
    [switch]$Verbose = $false,
    [switch]$SkipNodeAnalysis = $false,
    [switch]$SkipPythonDiagnostics = $false,
    [switch]$SkipSecurityChecks = $false,
    [switch]$GenerateReportOnly = $false
)

# Set error action preference
$ErrorActionPreference = "Continue"

# Color codes
function Write-ColorOutput {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        [Parameter(Mandatory=$false)]
        [ValidateSet("Success", "Error", "Warning", "Info", "Header", "Subheader")]
        [string]$Color = "Info"
    )
    
    switch ($Color) {
        "Success" { Write-Host "✅ $Message" -ForegroundColor Green }
        "Error" { Write-Host "❌ $Message" -ForegroundColor Red }
        "Warning" { Write-Host "⚠️  $Message" -ForegroundColor Yellow }
        "Info" { Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
        "Header" { 
            Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
            Write-Host "║ $Message" -ForegroundColor Cyan
            Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
        }
        "Subheader" {
            Write-Host "`n▶️  $Message" -ForegroundColor Magenta
        }
    }
}

# Main analyzer function
function Invoke-ComprehensiveAnalysis {
    Write-ColorOutput "بدء التحليل الشامل للمشروع" "Header"
    
    $projectRoot = Get-Location
    Write-ColorOutput "جذر المشروع: $projectRoot" "Info"
    Write-ColorOutput "التاريخ والوقت: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "Info"
    
    # Step 1: Check requirements
    if (-not $GenerateReportOnly) {
        Write-ColorOutput "الخطوة 1: فحص المتطلبات الأساسية" "Subheader"
        Check-Requirements
        
        # Step 2: Run Node.js analyzer
        if (-not $SkipNodeAnalysis) {
            Write-ColorOutput "الخطوة 2: تشغيل محلل Node.js" "Subheader"
            Run-NodeAnalyzer
        }
        
        # Step 3: Run Python diagnostics
        if (-not $SkipPythonDiagnostics) {
            Write-ColorOutput "الخطوة 3: تشغيل التشخيص المتقدم (Python)" "Subheader"
            Run-PythonDiagnostics
        }
        
        # Step 4: Run security checks
        if (-not $SkipSecurityChecks) {
            Write-ColorOutput "الخطوة 4: فحص الأمان" "Subheader"
            Run-SecurityChecks
        }
    }
    
    # Step 5: Generate final report
    Write-ColorOutput "الخطوة 5: توليد التقرير النهائي الشامل" "Subheader"
    Generate-FinalReport
    
    # Summary
    Write-ColorOutput "اكتمل التحليل الشامل بنجاح" "Header"
    Write-ColorOutput "تم فحص المشروع بالكامل" "Success"
    Write-ColorOutput "تحقق من التقارير:" "Info"
    Write-Host "  ✓ PROJECT_ANALYSIS_REPORT.json"
    Write-Host "  ✓ PROJECT_ANALYSIS_REPORT.txt"
    Write-Host "  ✓ ADVANCED_DIAGNOSTICS_REPORT.json"
    Write-Host "  ✓ FINAL_COMPREHENSIVE_REPORT.txt"
}

# Check Requirements
function Check-Requirements {
    Write-ColorOutput "التحقق من المتطلبات..." "Info"
    
    # Check Node.js
    $nodeVersion = (node --version 2>$null) ? (node --version) : $null
    if ($nodeVersion) {
        Write-ColorOutput "Node.js $nodeVersion موجود" "Success"
    }
    else {
        Write-ColorOutput "Node.js غير مثبت" "Error"
        return $false
    }
    
    # Check npm
    $npmVersion = (npm --version 2>$null) ? (npm --version) : $null
    if ($npmVersion) {
        Write-ColorOutput "npm $npmVersion موجود" "Success"
    }
    else {
        Write-ColorOutput "npm غير مثبت" "Error"
        return $false
    }
    
    # Check Python
    $pythonVersion = (python --version 2>$null) ? (python --version) : $null
    if ($pythonVersion) {
        Write-ColorOutput "$pythonVersion موجود" "Success"
    }
    else {
        Write-ColorOutput "Python غير مثبت - سيتم تخطي التشخيص المتقدم" "Warning"
    }
    
    # Check Git
    $gitVersion = (git --version 2>$null) ? (git --version) : $null
    if ($gitVersion) {
        Write-ColorOutput "$gitVersion موجود" "Success"
    }
    else {
        Write-ColorOutput "Git غير مثبت" "Warning"
    }
    
    return $true
}

# Run Node Analyzer
function Run-NodeAnalyzer {
    Write-ColorOutput "تشغيل محلل Node.js..." "Info"
    
    if (Test-Path "PROJECT_ANALYZER_ADVANCED.js") {
        try {
            & node PROJECT_ANALYZER_ADVANCED.js
            Write-ColorOutput "اكتمل تحليل Node.js" "Success"
        }
        catch {
            Write-ColorOutput "خطأ في تنفيذ محلل Node.js: $_" "Error"
        }
    }
    else {
        Write-ColorOutput "ملف PROJECT_ANALYZER_ADVANCED.js غير موجود" "Warning"
    }
}

# Run Python Diagnostics
function Run-PythonDiagnostics {
    Write-ColorOutput "تشغيل التشخيص بـ Python..." "Info"
    
    if (Test-Path "ADVANCED_DIAGNOSTICS.py") {
        try {
            & python ADVANCED_DIAGNOSTICS.py
            Write-ColorOutput "اكتمل التشخيص المتقدم" "Success"
        }
        catch {
            Write-ColorOutput "Python غير متاح أو حدث خطأ: $_" "Warning"
        }
    }
    else {
        Write-ColorOutput "ملف ADVANCED_DIAGNOSTICS.py غير موجود" "Warning"
    }
}

# Run Security Checks
function Run-SecurityChecks {
    Write-ColorOutput "تشغيل فحوصات الأمان..." "Info"
    
    # Check for .env file exposure
    if (Test-Path ".env") {
        $envContent = Get-Content ".env" -ErrorAction SilentlyContinue
        if ($envContent -match "PASSWORD=") {
            Write-ColorOutput "⚠️  تحذير: ملف .env قد يحتوي على بيانات حساسة" "Warning"
        }
    }
    
    # Check .gitignore
    if (Test-Path ".gitignore") {
        $giContent = Get-Content ".gitignore" -ErrorAction SilentlyContinue
        if ($giContent -match ".env") {
            Write-ColorOutput "ملف .env في .gitignore" "Success"
        }
        else {
            Write-ColorOutput "ملف .env غير في .gitignore" "Warning"
        }
    }
    else {
        Write-ColorOutput ".gitignore غير موجود" "Warning"
    }
    
    # Check Node modules in git
    if (Test-Path ".git") {
        try {
            $gitLsOutput = & git ls-files --error-unmatch node_modules 2>&1
            if ($? -and $gitLsOutput) {
                Write-ColorOutput "node_modules موجود في git - يجب إزالته" "Warning"
            }
            else {
                Write-ColorOutput "node_modules غير موجود في git" "Success"
            }
        }
        catch {
            Write-ColorOutput "node_modules غير موجود في git" "Success"
        }
    }
    
    # Check for sensitive files
    $sensitivePatterns = @("*.key", "*.pem", "*.p12", "*.pfx", "private_*")
    $foundSensitiveFiles = @()
    
    foreach ($pattern in $sensitivePatterns) {
        $files = Get-ChildItem -Path . -Filter $pattern -Recurse -ErrorAction SilentlyContinue
        if ($files) {
            $foundSensitiveFiles += $files.Name
        }
    }
    
    if ($foundSensitiveFiles) {
        Write-ColorOutput "⚠️  تحذير أمان: تم العثور على ملفات حساسة محتملة" "Warning"
        foreach ($file in $foundSensitiveFiles) {
            Write-Host "   - $file"
        }
    }
    else {
        Write-ColorOutput "لم يتم العثور على ملفات حساسة واضحة" "Success"
    }
    
    Write-ColorOutput "اكتملت فحوصات الأمان" "Success"
}

# Generate Final Report
function Generate-FinalReport {
    Write-ColorOutput "توليد التقرير الشامل النهائي..." "Info"
    
    $reportFile = "FINAL_COMPREHENSIVE_REPORT.txt"
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    $report = @"
╔════════════════════════════════════════════════════════════════╗
║        التقرير الشامل النهائي - Final Comprehensive Report    ║
╚════════════════════════════════════════════════════════════════╝

📅 التاريخ: $timestamp
📂 المشروع: $(Get-Location)
👤 المستخدم: $env:USERNAME
💻 النظام: Windows $(Get-WmiObject -Class Win32_OperatingSystem | Select-Object -ExpandProperty Version)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 ملخص النتائج:
─────────────────────────────────────────────────────────────────

"@
    
    # Add available reports
    if (Test-Path "PROJECT_ANALYSIS_REPORT.json") {
        $report += "✓ تقرير تحليل Node.js: PROJECT_ANALYSIS_REPORT.json`n"
    }
    
    if (Test-Path "ADVANCED_DIAGNOSTICS_REPORT.json") {
        $report += "✓ تقرير التشخيص المتقدم: ADVANCED_DIAGNOSTICS_REPORT.json`n"
    }
    
    $report += @"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 الخطوات التالية الموصى بها:
─────────────────────────────────────────────────────────────────

1. ✓ مراجعة التقارير المُنشأة
2. ✓ حل جميع المشاكل الحرجة (CRITICAL)
3. ✓ معالجة المشاكل العالية (HIGH)
4. ✓ تطبيق التوصيات الأمنية
5. ✓ تشغيل الاختبارات الشاملة
6. ✓ التحقق من الأداء
7. ✓ إطلاق المشروع في الإنتاج

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 الملفات المهمة:
─────────────────────────────────────────────────────────────────

"@
    
    # List report files
    $reportFiles = Get-ChildItem -Filter "*.json", "*.txt" | Where-Object { 
        $_.Name -match "(ANALYSIS|DIAGNOSTIC|REPORT)" 
    }
    
    foreach ($file in $reportFiles) {
        $size = "{0:N2} MB" -f ($file.Length / 1MB)
        $report += "  • $($file.Name) - $size`n"
    }
    
    $report += @"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

تم توليد التقرير بواسطة: COMPREHENSIVE_PROJECT_ANALYZER
الإصدار: 1.0.0
التاريخ: $(Get-Date)

"@
    
    # Save report
    $report | Set-Content -Path $reportFile -Encoding UTF8
    Write-ColorOutput "تم حفظ التقرير النهائي: $reportFile" "Success"
    
    # Display report
    Write-Host $report
}

# Show usage
function Show-Usage {
    Write-ColorOutput "استخدام الأداة" "Header"
    Write-Host "الأمر الأساسي:"
    Write-Host "  .\run-comprehensive-analyzer.ps1"
    Write-Host ""
    Write-Host "الخيارات:"
    Write-Host "  -Verbose                  : إظهار تفاصيل أكثر"
    Write-Host "  -SkipNodeAnalysis        : تخطي تحليل Node.js"
    Write-Host "  -SkipPythonDiagnostics   : تخطي التشخيص Python"
    Write-Host "  -SkipSecurityChecks      : تخطي فحوصات الأمان"
    Write-Host "  -GenerateReportOnly      : توليد التقرير فقط"
}

# Main execution
if ($args -contains "-help" -or $args -contains "--help" -or $args -contains "-h") {
    Show-Usage
}
else {
    Invoke-ComprehensiveAnalysis
}
