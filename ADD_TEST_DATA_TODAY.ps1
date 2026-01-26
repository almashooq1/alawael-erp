# ===========================================
# سكريبت إضافة البيانات التجريبية
# Test Data Seeding Script - Phase 14.1
# ===========================================

Write-Host "`n" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   إضافة البيانات التجريبية - Adding Test Data   " -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "`n"

# الخطوة 1: تسجيل الدخول
Write-Host "1️⃣  تسجيل الدخول - Login..." -ForegroundColor Yellow

$loginBody = @{
    email    = "admin@alawael.com"
    password = "Admin@123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/login' `
        -Method Post -Body $loginBody -ContentType 'application/json' -UseBasicParsing -TimeoutSec 5
  
    $json = $loginResponse.Content | ConvertFrom-Json
    $token = $json.accessToken
  
    Write-Host "   ✅ تم تسجيل الدخول بنجاح" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0,30))..." -ForegroundColor Gray
}
catch {
    Write-Host "   ❌ خطأ في تسجيل الدخول" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n"

# الخطوة 2: إضافة المعدات التجريبية
Write-Host "2️⃣  إضافة المعدات التجريبية - Adding Equipment..." -ForegroundColor Yellow

$equipmentList = @(
    @{
        equipmentId         = "EQ-2026-MED-001"
        name                = "جهاز علاج طبيعي متقدم"
        description         = "جهاز حديث للعلاج الطبيعي مع تقنيات متعددة"
        category            = "treatment_rehabilitation"
        status              = "available"
        purchaseInfo        = @{
            purchaseDate  = "2024-01-15"
            supplier      = "Medical Equipment Co."
            purchasePrice = 15000
            currency      = "SAR"
            invoiceNumber = "INV-2024-001"
            paymentMethod = "bank_transfer"
        }
        warranty            = @{
            startDate    = "2024-01-15"
            endDate      = "2027-01-15"
            provider     = "Medical Equipment Co."
            coverageType = "full"
            isExpired    = $false
        }
        location            = @{
            building    = "المبنى الرئيسي"
            floor       = "الطابق الأول"
            room        = "غرفة العلاج 101"
            responsible = "أحمد محمد"
        }
        specifications      = @{
            manufacturer      = "TechMed Systems"
            model             = "PTM-5000"
            serialNumber      = "SN-2024-001"
            yearOfManufacture = 2024
        }
        utilizationTracking = @{
            totalHoursUsed      = 120
            averageHoursPerWeek = 10
            lastUsedDate        = "2026-01-20"
        }
    },
    @{
        equipmentId         = "EQ-2026-DIAG-002"
        name                = "جهاز قياس السكري المتقدم"
        description         = "جهاز دقيق لقياس مستوى السكر في الدم"
        category            = "assessment_diagnostic"
        status              = "available"
        purchaseInfo        = @{
            purchaseDate  = "2024-03-10"
            supplier      = "DiagnoTech Ltd."
            purchasePrice = 3500
            currency      = "SAR"
            invoiceNumber = "INV-2024-025"
            paymentMethod = "credit_card"
        }
        warranty            = @{
            startDate    = "2024-03-10"
            endDate      = "2026-03-10"
            provider     = "DiagnoTech Ltd."
            coverageType = "limited"
            isExpired    = $false
        }
        location            = @{
            building    = "المبنى الرئيسي"
            floor       = "الطابق الأرضي"
            room        = "عيادة التشخيص 205"
            responsible = "سارة أحمد"
        }
        specifications      = @{
            manufacturer      = "GlucoSense"
            model             = "GS-200"
            serialNumber      = "SN-2024-025"
            yearOfManufacture = 2024
        }
        utilizationTracking = @{
            totalHoursUsed      = 80
            averageHoursPerWeek = 8
            lastUsedDate        = "2026-01-21"
        }
    },
    @{
        equipmentId         = "EQ-2026-ASSIST-003"
        name                = "كرسي متحرك كهربائي"
        description         = "كرسي متحرك كهربائي حديث مع تحكم ذكي"
        category            = "assistive_technology"
        status              = "in_use"
        purchaseInfo        = @{
            purchaseDate  = "2023-11-20"
            supplier      = "Mobility Solutions"
            purchasePrice = 12000
            currency      = "SAR"
            invoiceNumber = "INV-2023-150"
            paymentMethod = "bank_transfer"
        }
        warranty            = @{
            startDate    = "2023-11-20"
            endDate      = "2025-11-20"
            provider     = "Mobility Solutions"
            coverageType = "full"
            isExpired    = $false
        }
        location            = @{
            building    = "المبنى الرئيسي"
            floor       = "الطابق الأول"
            room        = "قسم التأهيل"
            responsible = "محمد علي"
        }
        specifications      = @{
            manufacturer      = "SmartChair Inc."
            model             = "SC-PRO-2024"
            serialNumber      = "SN-2023-150"
            yearOfManufacture = 2023
        }
        utilizationTracking = @{
            totalHoursUsed      = 450
            averageHoursPerWeek = 20
            lastUsedDate        = "2026-01-22"
        }
    },
    @{
        equipmentId         = "EQ-2026-MAINT-004"
        name                = "جهاز علاج بالموجات الصوتية"
        description         = "جهاز حديث للعلاج بالموجات فوق الصوتية"
        category            = "treatment_rehabilitation"
        status              = "in_maintenance"
        purchaseInfo        = @{
            purchaseDate  = "2024-06-01"
            supplier      = "UltraSound Med"
            purchasePrice = 18500
            currency      = "SAR"
            invoiceNumber = "INV-2024-078"
            paymentMethod = "bank_transfer"
        }
        warranty            = @{
            startDate    = "2024-06-01"
            endDate      = "2027-06-01"
            provider     = "UltraSound Med"
            coverageType = "full"
            isExpired    = $false
        }
        location            = @{
            building    = "المبنى الرئيسي"
            floor       = "الطابق الثاني"
            room        = "غرفة العلاج المتقدم"
            responsible = "فاطمة حسن"
        }
        specifications      = @{
            manufacturer      = "UltraTech"
            model             = "UT-9000"
            serialNumber      = "SN-2024-078"
            yearOfManufacture = 2024
        }
        utilizationTracking = @{
            totalHoursUsed      = 65
            averageHoursPerWeek = 5
            lastUsedDate        = "2026-01-10"
        }
    }
)

$equipmentIds = @()

foreach ($eq in $equipmentList) {
    $equipmentBody = $eq | ConvertTo-Json -Depth 10
  
    try {
        $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/equipment' `
            -Method Post -Body $equipmentBody -ContentType 'application/json' `
            -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -TimeoutSec 5
    
        $result = $response.Content | ConvertFrom-Json
        $equipmentIds += $result.data._id
    
        Write-Host "   ✅ تمت إضافة: $($eq.name)" -ForegroundColor Green
        Write-Host "      ID: $($eq.equipmentId)" -ForegroundColor Gray
    }
    catch {
        Write-Host "   ⚠️  خطأ في إضافة: $($eq.name)" -ForegroundColor Yellow
        Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n"

# الخطوة 3: إضافة جداول الصيانة
Write-Host "3️⃣  إضافة جداول الصيانة - Adding Maintenance Schedules..." -ForegroundColor Yellow

if ($equipmentIds.Count -gt 0) {
    $maintenanceSchedules = @(
        @{
            equipment             = $equipmentIds[0]
            scheduleType          = "preventive"
            status                = "scheduled"
            preventiveSchedule    = @{
                frequency         = "quarterly"
                lastCompletedDate = "2025-10-15"
                nextScheduledDate = "2026-01-15"
                estimatedDuration = 2
            }
            responsibleTechnician = @{
                name           = "أحمد الفني"
                contact        = "+966501234567"
                specialization = "علاج طبيعي"
            }
        },
        @{
            equipment             = $equipmentIds[1]
            scheduleType          = "preventive"
            status                = "scheduled"
            preventiveSchedule    = @{
                frequency         = "monthly"
                lastCompletedDate = "2025-12-20"
                nextScheduledDate = "2026-01-20"
                estimatedDuration = 1
            }
            responsibleTechnician = @{
                name           = "سارة الفنية"
                contact        = "+966502345678"
                specialization = "معدات تشخيص"
            }
        },
        @{
            equipment             = $equipmentIds[2]
            scheduleType          = "corrective"
            status                = "in_progress"
            correctiveMaintenance = @{
                reportedDate            = "2026-01-18"
                issueDescription        = "صوت غير طبيعي من المحرك"
                priority                = "high"
                estimatedCompletionDate = "2026-01-25"
            }
            responsibleTechnician = @{
                name           = "محمد الفني"
                contact        = "+966503456789"
                specialization = "معدات كهربائية"
            }
        }
    )

    foreach ($schedule in $maintenanceSchedules) {
        $scheduleBody = $schedule | ConvertTo-Json -Depth 10
    
        try {
            $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/maintenance-schedules' `
                -Method Post -Body $scheduleBody -ContentType 'application/json' `
                -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -TimeoutSec 5
      
            Write-Host "   ✅ تمت إضافة جدول صيانة" -ForegroundColor Green
        }
        catch {
            Write-Host "   ⚠️  خطأ في إضافة جدول الصيانة" -ForegroundColor Yellow
            Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "`n"

# الخطوة 4: إضافة الإعارات
Write-Host "4️⃣  إضافة الإعارات - Adding Lendings..." -ForegroundColor Yellow

if ($equipmentIds.Count -gt 0) {
    $lendings = @(
        @{
            equipment          = $equipmentIds[0]
            borrower           = @{
                name       = "د. خالد أحمد"
                department = "قسم العلاج الطبيعي"
                contact    = "+966504567890"
                email      = "khaled@hospital.com"
            }
            borrowDate         = "2026-01-15T09:00:00Z"
            expectedReturnDate = "2026-01-30T17:00:00Z"
            purpose            = "علاج مجموعة من المرضى - برنامج تأهيل مكثف"
            status             = "active"
        },
        @{
            equipment          = $equipmentIds[1]
            borrower           = @{
                name       = "د. فاطمة محمد"
                department = "عيادة السكري"
                contact    = "+966505678901"
                email      = "fatima@clinic.com"
            }
            borrowDate         = "2026-01-10T08:00:00Z"
            expectedReturnDate = "2026-01-25T16:00:00Z"
            purpose            = "فحص دوري للمرضى"
            status             = "active"
        }
    )

    foreach ($lending in $lendings) {
        $lendingBody = $lending | ConvertTo-Json -Depth 10
    
        try {
            $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/lending' `
                -Method Post -Body $lendingBody -ContentType 'application/json' `
                -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -TimeoutSec 5
      
            Write-Host "   ✅ تمت إضافة إعارة" -ForegroundColor Green
        }
        catch {
            Write-Host "   ⚠️  خطأ في إضافة الإعارة" -ForegroundColor Yellow
            Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "`n"

# الخطوة 5: التحقق من البيانات
Write-Host "5️⃣  التحقق من البيانات - Verifying Data..." -ForegroundColor Yellow

try {
    $equipmentCheck = Invoke-WebRequest -Uri 'http://localhost:3001/api/equipment' `
        -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -TimeoutSec 5
    $equipmentData = ($equipmentCheck.Content | ConvertFrom-Json).data
  
    Write-Host "   ✅ عدد المعدات: $($equipmentData.Count)" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  خطأ في التحقق" -ForegroundColor Yellow
}

try {
    $maintenanceCheck = Invoke-WebRequest -Uri 'http://localhost:3001/api/maintenance-schedules' `
        -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -TimeoutSec 5
    $maintenanceData = ($maintenanceCheck.Content | ConvertFrom-Json).data
  
    Write-Host "   ✅ عدد جداول الصيانة: $($maintenanceData.Count)" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  خطأ في التحقق" -ForegroundColor Yellow
}

try {
    $lendingCheck = Invoke-WebRequest -Uri 'http://localhost:3001/api/lending' `
        -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -TimeoutSec 5
    $lendingData = ($lendingCheck.Content | ConvertFrom-Json).data
  
    Write-Host "   ✅ عدد الإعارات: $($lendingData.Count)" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠️  خطأ في التحقق" -ForegroundColor Yellow
}

Write-Host "`n"
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   ✅ تم إضافة البيانات التجريبية بنجاح!" -ForegroundColor Green
Write-Host "   ✅ Test Data Added Successfully!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "`n"

Write-Host "الآن يمكنك:" -ForegroundColor Yellow
Write-Host "  1️⃣  افتح Frontend: http://localhost:3002" -ForegroundColor Cyan
Write-Host "  2️⃣  اذهب إلى لوحة تحكم المعدات" -ForegroundColor Cyan
Write-Host "  3️⃣  شاهد البيانات التجريبية" -ForegroundColor Cyan
Write-Host "`n"
