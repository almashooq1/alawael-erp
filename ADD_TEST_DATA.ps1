# Test Data Seeding Script - Phase 14.1
# Script to add test data to Equipment Management System

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "   Adding Test Data - Equipment System   " -ForegroundColor Green
Write-Host "================================================`n" -ForegroundColor Cyan

# Step 1: Login
Write-Host "1. Login..." -ForegroundColor Yellow

$loginBody = '{"email":"admin@alawael.com","password":"Admin@123456"}'

try {
    $loginResponse = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/login' `
        -Method Post -Body $loginBody -ContentType 'application/json' -UseBasicParsing -TimeoutSec 5
  
    $json = $loginResponse.Content | ConvertFrom-Json
    $token = $json.accessToken
  
    Write-Host "   Login successful" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0,30))...`n" -ForegroundColor Gray
}
catch {
    Write-Host "   Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Add Equipment
Write-Host "2. Adding Equipment..." -ForegroundColor Yellow

$equipment1 = @'
{
  "equipmentId": "EQ-2026-MED-001",
  "name": "Advanced Physical Therapy Device",
  "description": "Modern physical therapy device with multiple techniques",
  "category": "treatment_rehabilitation",
  "status": "available",
  "purchaseInfo": {
    "purchaseDate": "2024-01-15",
    "supplier": "Medical Equipment Co.",
    "purchasePrice": 15000,
    "currency": "SAR",
    "invoiceNumber": "INV-2024-001",
    "paymentMethod": "bank_transfer"
  },
  "warranty": {
    "startDate": "2024-01-15",
    "endDate": "2027-01-15",
    "provider": "Medical Equipment Co.",
    "coverageType": "full",
    "isExpired": false
  },
  "location": {
    "building": "Main Building",
    "floor": "First Floor",
    "room": "Therapy Room 101",
    "responsible": "Ahmed Mohamed"
  },
  "specifications": {
    "manufacturer": "TechMed Systems",
    "model": "PTM-5000",
    "serialNumber": "SN-2024-001",
    "yearOfManufacture": 2024
  },
  "utilizationTracking": {
    "totalHoursUsed": 120,
    "averageHoursPerWeek": 10,
    "lastUsedDate": "2026-01-20"
  }
}
'@

$equipment2 = @'
{
  "equipmentId": "EQ-2026-DIAG-002",
  "name": "Advanced Diabetes Meter",
  "description": "Precise blood glucose monitoring device",
  "category": "assessment_diagnostic",
  "status": "available",
  "purchaseInfo": {
    "purchaseDate": "2024-03-10",
    "supplier": "DiagnoTech Ltd.",
    "purchasePrice": 3500,
    "currency": "SAR",
    "invoiceNumber": "INV-2024-025",
    "paymentMethod": "credit_card"
  },
  "warranty": {
    "startDate": "2024-03-10",
    "endDate": "2026-03-10",
    "provider": "DiagnoTech Ltd.",
    "coverageType": "limited",
    "isExpired": false
  },
  "location": {
    "building": "Main Building",
    "floor": "Ground Floor",
    "room": "Diagnostic Clinic 205",
    "responsible": "Sara Ahmed"
  },
  "specifications": {
    "manufacturer": "GlucoSense",
    "model": "GS-200",
    "serialNumber": "SN-2024-025",
    "yearOfManufacture": 2024
  },
  "utilizationTracking": {
    "totalHoursUsed": 80,
    "averageHoursPerWeek": 8,
    "lastUsedDate": "2026-01-21"
  }
}
'@

$equipment3 = @'
{
  "equipmentId": "EQ-2026-ASSIST-003",
  "name": "Electric Wheelchair",
  "description": "Modern electric wheelchair with smart control",
  "category": "assistive_technology",
  "status": "in_use",
  "purchaseInfo": {
    "purchaseDate": "2023-11-20",
    "supplier": "Mobility Solutions",
    "purchasePrice": 12000,
    "currency": "SAR",
    "invoiceNumber": "INV-2023-150",
    "paymentMethod": "bank_transfer"
  },
  "warranty": {
    "startDate": "2023-11-20",
    "endDate": "2025-11-20",
    "provider": "Mobility Solutions",
    "coverageType": "full",
    "isExpired": false
  },
  "location": {
    "building": "Main Building",
    "floor": "First Floor",
    "room": "Rehabilitation Department",
    "responsible": "Mohamed Ali"
  },
  "specifications": {
    "manufacturer": "SmartChair Inc.",
    "model": "SC-PRO-2024",
    "serialNumber": "SN-2023-150",
    "yearOfManufacture": 2023
  },
  "utilizationTracking": {
    "totalHoursUsed": 450,
    "averageHoursPerWeek": 20,
    "lastUsedDate": "2026-01-22"
  }
}
'@

$equipment4 = @'
{
  "equipmentId": "EQ-2026-MAINT-004",
  "name": "Ultrasound Therapy Device",
  "description": "Modern ultrasound therapy equipment",
  "category": "treatment_rehabilitation",
  "status": "in_maintenance",
  "purchaseInfo": {
    "purchaseDate": "2024-06-01",
    "supplier": "UltraSound Med",
    "purchasePrice": 18500,
    "currency": "SAR",
    "invoiceNumber": "INV-2024-078",
    "paymentMethod": "bank_transfer"
  },
  "warranty": {
    "startDate": "2024-06-01",
    "endDate": "2027-06-01",
    "provider": "UltraSound Med",
    "coverageType": "full",
    "isExpired": false
  },
  "location": {
    "building": "Main Building",
    "floor": "Second Floor",
    "room": "Advanced Therapy Room",
    "responsible": "Fatima Hassan"
  },
  "specifications": {
    "manufacturer": "UltraTech",
    "model": "UT-9000",
    "serialNumber": "SN-2024-078",
    "yearOfManufacture": 2024
  },
  "utilizationTracking": {
    "totalHoursUsed": 65,
    "averageHoursPerWeek": 5,
    "lastUsedDate": "2026-01-10"
  }
}
'@

$equipmentList = @($equipment1, $equipment2, $equipment3, $equipment4)
$equipmentIds = @()

foreach ($eq in $equipmentList) {
    try {
        $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/equipment' `
            -Method Post -Body $eq -ContentType 'application/json' `
            -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -TimeoutSec 5
    
        $result = $response.Content | ConvertFrom-Json
        $equipmentIds += $result.data._id
        $equipmentName = ($eq | ConvertFrom-Json).name
    
        Write-Host "   Equipment added: $equipmentName" -ForegroundColor Green
    }
    catch {
        Write-Host "   Failed to add equipment: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`n"

# Step 3: Verification
Write-Host "3. Verifying Data..." -ForegroundColor Yellow

try {
    $equipmentCheck = Invoke-WebRequest -Uri 'http://localhost:3001/api/equipment' `
        -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing -TimeoutSec 5
    $equipmentData = ($equipmentCheck.Content | ConvertFrom-Json).data
  
    Write-Host "   Equipment count: $($equipmentData.Count)" -ForegroundColor Green
}
catch {
    Write-Host "   Verification failed" -ForegroundColor Yellow
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "   Test Data Added Successfully!" -ForegroundColor Green
Write-Host "================================================`n" -ForegroundColor Cyan

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open Frontend: http://localhost:3002" -ForegroundColor Cyan
Write-Host "  2. Go to Equipment Dashboard" -ForegroundColor Cyan
Write-Host "  3. View test data`n" -ForegroundColor Cyan
