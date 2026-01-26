# ============================================
# QUALITY MANAGEMENT TEST DATA SCRIPT
# سكريبت إضافة بيانات معايير الجودة والاعتمادات
# ============================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Quality Management Test Data Setup   " -ForegroundColor Green
Write-Host "   إضافة بيانات اختبار معايير الجودة   " -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001/api"
$token = ""

# ============================================
# STEP 1: Login
# ============================================
Write-Host "1️⃣  تسجيل الدخول..." -ForegroundColor Yellow

try {
    $loginBody = @{
        email    = "admin@alawael.com"
        password = "Admin@123456"
    } | ConvertTo-Json

    $loginResponse = Invoke-WebRequest `
        -Uri "$baseUrl/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json" `
        -UseBasicParsing

    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.accessToken

    Write-Host "   ✅ تم تسجيل الدخول بنجاح" -ForegroundColor Green
    Write-Host "   User: $($loginData.user.email)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "   ❌ فشل تسجيل الدخول: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

# ============================================
# STEP 2: Add Quality Standards
# ============================================
Write-Host "2️⃣  إضافة معايير الجودة..." -ForegroundColor Yellow

# Saudi Health Commission Standard
$standard1 = @{
    standardId    = "SHC-2026-001"
    name          = "Saudi Health Specialties Commission Standards"
    nameAr        = "معايير الهيئة السعودية للتخصصات الصحية"
    category      = "saudi_health_commission"
    version       = "2026.1"
    description   = "Comprehensive standards for healthcare specialties in Saudi Arabia"
    descriptionAr = "معايير شاملة للتخصصات الصحية في المملكة العربية السعودية"
    requirements  = @(
        @{
            requirementId = "SHC-001-REQ-1"
            title         = "Professional Licensing"
            titleAr       = "الترخيص المهني"
            description   = "All healthcare professionals must hold valid licenses"
            descriptionAr = "يجب أن يحمل جميع المهنيين الصحيين تراخيص سارية"
            mandatory     = $true
            evidenceTypes = @("license_documents", "verification_certificates")
            weight        = 10
        },
        @{
            requirementId = "SHC-001-REQ-2"
            title         = "Continuing Education"
            titleAr       = "التعليم المستمر"
            description   = "Minimum 25 CME credits annually"
            descriptionAr = "الحد الأدنى 25 ساعة تعليم مستمر سنوياً"
            mandatory     = $true
            evidenceTypes = @("cme_certificates", "attendance_records")
            weight        = 8
        }
    )
    effectiveDate = (Get-Date "2026-01-01")
    status        = "active"
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-WebRequest `
        -Uri "$baseUrl/quality/standards" `
        -Method Post `
        -Body $standard1 `
        -Headers $headers `
        -UseBasicParsing
    Write-Host "   ✅ معايير الهيئة السعودية" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  معايير الهيئة السعودية: $($_.Exception.Message)" -ForegroundColor Yellow
}

# CARF Standard
$standard2 = @{
    standardId    = "CARF-2026-002"
    name          = "CARF Rehabilitation Standards"
    nameAr        = "معايير CARF للتأهيل"
    category      = "carf"
    version       = "2026 Edition"
    description   = "CARF International standards for rehabilitation programs"
    descriptionAr = "معايير CARF الدولية لبرامج التأهيل"
    requirements  = @(
        @{
            requirementId = "CARF-002-REQ-1"
            title         = "Person-Centered Care"
            titleAr       = "الرعاية المتمركزة حول الشخص"
            description   = "Individualized care plans for all clients"
            descriptionAr = "خطط رعاية فردية لجميع المستفيدين"
            mandatory     = $true
            evidenceTypes = @("care_plans", "client_assessments")
            weight        = 10
        }
    )
    effectiveDate = (Get-Date "2026-01-01")
    status        = "active"
} | ConvertTo-Json -Depth 10

try {
    Invoke-WebRequest `
        -Uri "$baseUrl/quality/standards" `
        -Method Post `
        -Body $standard2 `
        -Headers $headers `
        -UseBasicParsing | Out-Null
    Write-Host "   ✅ معايير CARF" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  معايير CARF: $($_.Exception.Message)" -ForegroundColor Yellow
}

# JCI Standard
$standard3 = @{
    standardId    = "JCI-2026-003"
    name          = "JCI Healthcare Standards"
    nameAr        = "معايير JCI للرعاية الصحية"
    category      = "jci"
    version       = "7th Edition"
    description   = "Joint Commission International healthcare standards"
    descriptionAr = "معايير اللجنة الدولية المشتركة للرعاية الصحية"
    requirements  = @(
        @{
            requirementId = "JCI-003-REQ-1"
            title         = "Patient Safety"
            titleAr       = "سلامة المرضى"
            description   = "Comprehensive patient safety protocols"
            descriptionAr = "بروتوكولات شاملة لسلامة المرضى"
            mandatory     = $true
            evidenceTypes = @("safety_protocols", "incident_reports")
            weight        = 10
        }
    )
    effectiveDate = (Get-Date "2026-01-01")
    status        = "active"
} | ConvertTo-Json -Depth 10

try {
    Invoke-WebRequest `
        -Uri "$baseUrl/quality/standards" `
        -Method Post `
        -Body $standard3 `
        -Headers $headers `
        -UseBasicParsing | Out-Null
    Write-Host "   ✅ معايير JCI" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  معايير JCI: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# STEP 3: Add Accreditations
# ============================================
Write-Host "3️⃣  إضافة الاعتمادات..." -ForegroundColor Yellow

# Get standards for linking
$standardsResponse = Invoke-WebRequest `
    -Uri "$baseUrl/quality/standards" `
    -Method Get `
    -Headers $headers `
    -UseBasicParsing

$standards = ($standardsResponse.Content | ConvertFrom-Json).data.standards

# Saudi Health Commission Accreditation
$accreditation1 = @{
    accreditationId   = "ACC-SHC-2026-001"
    name              = "Saudi Health Commission Accreditation"
    nameAr            = "اعتماد الهيئة السعودية للتخصصات الصحية"
    type              = "saudi_health_commission"
    issuingBody       = @{
        name    = "Saudi Commission for Health Specialties"
        nameAr  = "الهيئة السعودية للتخصصات الصحية"
        country = "Saudi Arabia"
    }
    certificateNumber = "SHC-CERT-2026-12345"
    issueDate         = (Get-Date "2026-01-15")
    expiryDate        = (Get-Date "2029-01-14")
    scope             = "Comprehensive Rehabilitation Services"
    scopeAr           = "خدمات التأهيل الشاملة"
    standards         = @($standards[0]._id)
    status            = "active"
    auditSchedule     = @{
        nextAuditDate  = (Get-Date "2027-01-15")
        auditFrequency = "annual"
        lastAuditDate  = (Get-Date "2026-01-10")
    }
    notes             = "Full accreditation granted for all rehabilitation programs"
    notesAr           = "تم منح الاعتماد الكامل لجميع برامج التأهيل"
} | ConvertTo-Json -Depth 10

try {
    Invoke-WebRequest `
        -Uri "$baseUrl/quality/accreditations" `
        -Method Post `
        -Body $accreditation1 `
        -Headers $headers `
        -UseBasicParsing | Out-Null
    Write-Host "   ✅ اعتماد الهيئة السعودية" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  اعتماد الهيئة السعودية: $($_.Exception.Message)" -ForegroundColor Yellow
}

# CARF Accreditation
$accreditation2 = @{
    accreditationId   = "ACC-CARF-2026-001"
    name              = "CARF Three-Year Accreditation"
    nameAr            = "اعتماد CARF لمدة ثلاث سنوات"
    type              = "carf"
    issuingBody       = @{
        name    = "CARF International"
        nameAr  = "منظمة CARF الدولية"
        country = "United States"
    }
    certificateNumber = "CARF-2026-98765"
    issueDate         = (Get-Date "2026-02-01")
    expiryDate        = (Get-Date "2029-01-31")
    scope             = "Physical Rehabilitation Programs"
    scopeAr           = "برامج التأهيل البدني"
    standards         = @($standards[1]._id)
    status            = "active"
    auditSchedule     = @{
        nextAuditDate  = (Get-Date "2028-02-01")
        auditFrequency = "biannual"
    }
} | ConvertTo-Json -Depth 10

try {
    Invoke-WebRequest `
        -Uri "$baseUrl/quality/accreditations" `
        -Method Post `
        -Body $accreditation2 `
        -Headers $headers `
        -UseBasicParsing | Out-Null
    Write-Host "   ✅ اعتماد CARF" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  اعتماد CARF: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# STEP 4: Add Quality Audits
# ============================================
Write-Host "4️⃣  إضافة مراجعات الجودة..." -ForegroundColor Yellow

$audit1 = @{
    auditId      = "AUD-2026-001"
    title        = "Internal Quality Audit Q1 2026"
    titleAr      = "مراجعة الجودة الداخلية - الربع الأول 2026"
    type         = "internal"
    auditDate    = (Get-Date "2026-01-20")
    auditors     = @(
        @{
            name         = "Dr. Ahmed Al-Mansour"
            nameAr       = "د. أحمد المنصور"
            organization = "Quality Department"
            role         = "Lead Auditor"
        }
    )
    scope        = "All rehabilitation programs"
    scopeAr      = "جميع برامج التأهيل"
    findings     = @(
        @{
            findingId          = "FIND-001"
            type               = "minor_nonconformity"
            description        = "Documentation gaps in patient records"
            descriptionAr      = "فجوات في توثيق سجلات المرضى"
            evidence           = "10% of records incomplete"
            correctiveAction   = "Implement daily documentation checklist"
            correctiveActionAr = "تطبيق قائمة مراجعة يومية للتوثيق"
            dueDate            = (Get-Date "2026-02-20")
            status             = "open"
        }
    )
    overallScore = 88
    status       = "completed"
} | ConvertTo-Json -Depth 10

try {
    Invoke-WebRequest `
        -Uri "$baseUrl/quality/audits" `
        -Method Post `
        -Body $audit1 `
        -Headers $headers `
        -UseBasicParsing | Out-Null
    Write-Host "   ✅ مراجعة الجودة الداخلية" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  مراجعة الجودة: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# STEP 5: Add Compliance Tracking
# ============================================
Write-Host "5️⃣  إضافة تتبع الامتثال..." -ForegroundColor Yellow

$compliance1 = @{
    trackingId      = "COMP-2026-001"
    standard        = $standards[0]._id
    requirementId   = "SHC-001-REQ-1"
    department      = "Medical Services"
    complianceLevel = "fully_compliant"
    assessmentDate  = (Get-Date "2026-01-15")
    evidence        = @(
        @{
            type          = "license_documents"
            description   = "All staff licenses verified and up to date"
            descriptionAr = "جميع تراخيص الموظفين محدثة ومعتمدة"
        }
    )
    gaps            = @()
    nextReviewDate  = (Get-Date "2026-07-15")
} | ConvertTo-Json -Depth 10

try {
    Invoke-WebRequest `
        -Uri "$baseUrl/quality/compliance" `
        -Method Post `
        -Body $compliance1 `
        -Headers $headers `
        -UseBasicParsing | Out-Null
    Write-Host "   ✅ تتبع الامتثال - الخدمات الطبية" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  تتبع الامتثال: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# STEP 6: Add Quality Indicators
# ============================================
Write-Host "6️⃣  إضافة مؤشرات الجودة..." -ForegroundColor Yellow

$indicator1 = @{
    indicatorId         = "QI-2026-001"
    name                = "Patient Satisfaction Rate"
    nameAr              = "معدل رضا المرضى"
    category            = "patient_satisfaction"
    formula             = "(Satisfied Patients / Total Patients) * 100"
    targetValue         = 85
    unit                = "percentage"
    dataSource          = "Patient Feedback Surveys"
    collectionFrequency = "monthly"
    measurements        = @(
        @{
            date        = (Get-Date "2026-01-31")
            value       = 88.5
            numerator   = 177
            denominator = 200
            notes       = "Q1 measurement - exceeded target"
        }
    )
    status              = "active"
} | ConvertTo-Json -Depth 10

try {
    Invoke-WebRequest `
        -Uri "$baseUrl/quality/indicators" `
        -Method Post `
        -Body $indicator1 `
        -Headers $headers `
        -UseBasicParsing | Out-Null
    Write-Host "   ✅ مؤشر رضا المرضى" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  مؤشر الجودة: $($_.Exception.Message)" -ForegroundColor Yellow
}

$indicator2 = @{
    indicatorId         = "QI-2026-002"
    name                = "Infection Control Rate"
    nameAr              = "معدل مكافحة العدوى"
    category            = "infection_control"
    formula             = "(Infections / Patient Days) * 1000"
    targetValue         = 2
    unit                = "per 1000 patient days"
    dataSource          = "Infection Control Reports"
    collectionFrequency = "monthly"
    measurements        = @(
        @{
            date        = (Get-Date "2026-01-31")
            value       = 1.2
            numerator   = 3
            denominator = 2500
            notes       = "Q1 - Below target (better)"
        }
    )
    status              = "active"
} | ConvertTo-Json -Depth 10

try {
    Invoke-WebRequest `
        -Uri "$baseUrl/quality/indicators" `
        -Method Post `
        -Body $indicator2 `
        -Headers $headers `
        -UseBasicParsing | Out-Null
    Write-Host "   ✅ مؤشر مكافحة العدوى" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  مؤشر الجودة: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# STEP 7: Verify All Data
# ============================================
Write-Host "7️⃣  التحقق من البيانات..." -ForegroundColor Yellow

try {
    $dashboardResponse = Invoke-WebRequest `
        -Uri "$baseUrl/quality/dashboard" `
        -Method Get `
        -Headers $headers `
        -UseBasicParsing

    $dashboard = ($dashboardResponse.Content | ConvertFrom-Json).data

    Write-Host ""
    Write-Host "   📊 النتائج:" -ForegroundColor Cyan
    Write-Host "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "   ✅ المعايير: $($dashboard.standardsByCategory.count) فئات" -ForegroundColor White
    Write-Host "   ✅ الاعتمادات النشطة: $($dashboard.accreditationsByStatus | Where-Object {$_._id -eq 'active'} | Select-Object -ExpandProperty count)" -ForegroundColor White
    Write-Host "   ✅ المراجعات: $($dashboard.recentAudits.Count) مراجعة" -ForegroundColor White
    Write-Host "   ✅ مؤشرات الجودة: $($dashboard.indicatorsSummary.Count) مؤشر" -ForegroundColor White
    Write-Host "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
}
catch {
    Write-Host "   ⚠️  خطأ في التحقق: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   ✅ تم الانتهاء بنجاح!   " -ForegroundColor Green
Write-Host "   Quality Management System Ready   " -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📌 الوصول إلى النظام:" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:3002/quality" -ForegroundColor Cyan
Write-Host "   API: http://localhost:3001/api/quality" -ForegroundColor Cyan
Write-Host ""
