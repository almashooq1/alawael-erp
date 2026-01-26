/**
 * Equipment Management System - Data Seeding Script
 * سكريبت إضافة بيانات تجريبية لنظام إدارة المعدات
 */

// ===== SEEDING DATA SCRIPT =====

// استخدام Postman أو استدعاء API مباشرة

// 1. إنشاء معدات تجريبية
const equipmentData = [
  {
    equipmentId: 'EQ-2026-001',
    name: 'جهاز قياس السمع الرقمي',
    nameEnglish: 'Digital Audiometer',
    category: 'assessment_diagnostic',
    subCategory: 'Hearing Assessment',
    manufacturer: 'Siemens',
    model: 'ACURIS Pro',
    serialNumber: 'SN-12345-67890',
    purchaseDate: '2024-06-15',
    purchasePrice: 5000,
    supplier: 'Medical Equipment Co.',
    location: {
      building: 'Building A',
      floor: '2',
      room: '201',
      department: 'Audiology',
    },
    warranty: {
      startDate: '2024-06-15',
      endDate: '2026-06-15',
      provider: 'Siemens Service',
    },
    status: 'available',
    operatingSpecs: {
      powerConsumption: '100W',
      dimensions: '60cm x 40cm x 30cm',
      weight: '15kg',
      capacity: 'Multiple tests per day',
      features: ['Digital Display', 'Network Ready', 'Data Export'],
    },
    maintenanceSpecs: {
      maintenanceInterval: 90,
      lastMaintenanceDate: '2026-01-10',
      estimatedOperatingHours: 8000,
    },
    usage: {
      totalUsageHours: 2150,
      dailyUsageHours: 4,
      usageCount: 450,
      utilizationRate: 75,
    },
  },
  {
    equipmentId: 'EQ-2026-002',
    name: 'جهاز العلاج الطبيعي',
    nameEnglish: 'Rehabilitation Unit',
    category: 'treatment_rehabilitation',
    subCategory: 'Physical Therapy',
    manufacturer: 'Zimmer',
    model: 'Z-System 3000',
    serialNumber: 'SN-98765-43210',
    purchaseDate: '2024-09-20',
    purchasePrice: 8000,
    supplier: 'Healthcare Solutions',
    location: {
      building: 'Building B',
      floor: '1',
      room: '105',
      department: 'Physiotherapy',
    },
    warranty: {
      startDate: '2024-09-20',
      endDate: '2026-09-20',
      provider: 'Zimmer Warranty',
    },
    status: 'available',
    operatingSpecs: {
      powerConsumption: '250W',
      dimensions: '80cm x 60cm x 100cm',
      weight: '45kg',
      capacity: 'Multiple therapy sessions',
      features: ['Digital Controls', 'Safety Features', 'Adjustable'],
    },
    maintenanceSpecs: {
      maintenanceInterval: 120,
      lastMaintenanceDate: '2025-12-20',
      estimatedOperatingHours: 10000,
    },
    usage: {
      totalUsageHours: 3200,
      dailyUsageHours: 6,
      usageCount: 520,
      utilizationRate: 88,
    },
  },
  {
    equipmentId: 'EQ-2026-003',
    name: 'نظام الأطراف الصناعية الذكية',
    nameEnglish: 'Smart Prosthetics',
    category: 'assistive_technology',
    subCategory: 'Advanced Prosthetics',
    manufacturer: 'BioniX',
    model: 'BX-2000 Smart',
    serialNumber: 'SN-55555-88888',
    purchaseDate: '2025-01-05',
    purchasePrice: 15000,
    supplier: 'Advanced Assistive Tech',
    location: {
      building: 'Building C',
      floor: '3',
      room: '301',
      department: 'Prosthetics',
    },
    warranty: {
      startDate: '2025-01-05',
      endDate: '2027-01-05',
      provider: 'BioniX Premium Support',
    },
    status: 'available',
    operatingSpecs: {
      powerConsumption: '50W',
      dimensions: 'Variable',
      weight: '2kg',
      capacity: 'Multiple patient fits',
      features: ['AI Controlled', 'Wireless', 'App Enabled'],
    },
    maintenanceSpecs: {
      maintenanceInterval: 180,
      lastMaintenanceDate: '2025-12-25',
      estimatedOperatingHours: 5000,
    },
    usage: {
      totalUsageHours: 450,
      dailyUsageHours: 2,
      usageCount: 25,
      utilizationRate: 35,
    },
  },
  {
    equipmentId: 'EQ-2026-004',
    name: 'مواد استهلاكية طبية - Medical Supplies',
    nameEnglish: 'Medical Consumables Pack',
    category: 'consumables',
    subCategory: 'Disposable Medical Supplies',
    manufacturer: 'MedSupply Inc',
    model: 'MSP-2024',
    purchaseDate: '2026-01-15',
    purchasePrice: 500,
    supplier: 'MedSupply Distributor',
    location: {
      building: 'Building A',
      floor: '1',
      room: 'Storage',
      department: 'General',
    },
    warranty: {
      startDate: '2026-01-15',
      endDate: '2027-01-15',
      provider: 'Standard Warranty',
    },
    status: 'available',
    operatingSpecs: {
      capacity: 'Bulk package',
      features: ['Sterile', 'Quality Certified'],
    },
    maintenanceSpecs: {
      maintenanceInterval: 365,
      lastMaintenanceDate: '2026-01-15',
    },
    usage: {
      totalUsageHours: 0,
      usageCount: 0,
      utilizationRate: 0,
    },
  },
];

// 2. إنشاء جداول الصيانة
const maintenanceSchedulesData = [
  {
    equipment: 'EQ-2026-001',
    scheduleType: 'preventive',
    preventiveSchedule: {
      frequency: 3,
      frequencyType: 'monthly',
      nextScheduledDate: '2026-02-10',
      lastPerformedDate: '2026-01-10',
    },
    status: 'scheduled',
  },
  {
    equipment: 'EQ-2026-002',
    scheduleType: 'predictive',
    status: 'in_progress',
  },
  {
    equipment: 'EQ-2026-003',
    scheduleType: 'condition_based',
    status: 'scheduled',
  },
];

// 3. API استدعاءات الإنشاء

/**
 * استخدم Postman أو PowerShell للاستدعاء:
 *
 * PowerShell Script:
 */

const postmanScript = `
# 1. إنشاء معدات
foreach ($equipment in $equipmentData) {
  $body = $equipment | ConvertTo-Json
  $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/equipment' \
    -Method Post \
    -Body $body \
    -ContentType 'application/json' \
    -UseBasicParsing
  Write-Host "Created: $($equipment.equipmentId)" -ForegroundColor Green
}

# 2. إنشاء جداول الصيانة
foreach ($maintenance in $maintenanceSchedulesData) {
  $body = $maintenance | ConvertTo-Json
  $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/maintenance-schedules' \
    -Method Post \
    -Body $body \
    -ContentType 'application/json' \
    -UseBasicParsing
  Write-Host "Created Maintenance Schedule" -ForegroundColor Green
}

# 3. التحقق من البيانات
$equipment = Invoke-WebRequest -Uri 'http://localhost:3001/api/equipment' \
  -UseBasicParsing | Select-Object -ExpandProperty Content | ConvertFrom-Json
Write-Host "Total Equipment: $($equipment.data.length)" -ForegroundColor Cyan
`;

// 4. استدعاء cURL (اختياري)
const curlCommands = `
# Create Equipment
curl -X POST http://localhost:3001/api/equipment \
  -H "Content-Type: application/json" \
  -d '{
    "equipmentId": "EQ-2026-001",
    "name": "جهاز قياس السمع الرقمي",
    "category": "assessment_diagnostic",
    "purchaseDate": "2024-06-15",
    "purchasePrice": 5000
  }'

# Get all equipment
curl http://localhost:3001/api/equipment

# Create maintenance schedule
curl -X POST http://localhost:3001/api/maintenance-schedules \
  -H "Content-Type: application/json" \
  -d '{
    "equipment": "EQ-2026-001",
    "scheduleType": "preventive"
  }'
`;

// ===== التعليمات =====

console.log(`
╔════════════════════════════════════════════════════════════════╗
║         Equipment Management System - Data Seeding             ║
║            نظام إدارة المعدات - إضافة البيانات                ║
╚════════════════════════════════════════════════════════════════╝

📋 الخطوات التالية:

1️⃣  افتح Postman أو استخدم PowerShell

2️⃣  تأكد من تشغيل Backend:
   - Terminal: cd backend && npm start
   - Verify: http://localhost:3001/api/health

3️⃣  أضف البيانات الأولية:

   أ) باستخدام PowerShell:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   $token = "من login response"
   
   # إنشاء معدة
   $body = @{
     equipmentId = "EQ-2026-001"
     name = "جهاز قياس السمع الرقمي"
     category = "assessment_diagnostic"
     purchaseDate = "2024-06-15"
     purchasePrice = 5000
   } | ConvertTo-Json
   
   Invoke-WebRequest -Uri 'http://localhost:3001/api/equipment' \
     -Method Post -Body $body -ContentType 'application/json' \
     -Headers @{ Authorization = "Bearer $token" }

   ب) باستخدام cURL:
   ━━━━━━━━━━━━━━━━━━
   curl -X POST http://localhost:3001/api/equipment \
     -H "Content-Type: application/json" \
     -d '{"equipmentId":"EQ-2026-001","name":"...","category":"..."}'

4️⃣  تحقق من البيانات:
   GET http://localhost:3001/api/equipment
   GET http://localhost:3001/api/maintenance-schedules
   GET http://localhost:3001/api/lending

5️⃣  جرّب الـ Dashboard:
   http://localhost:3002

📊 البيانات التجريبية المتضمنة:
   ✅ 4 معدات متنوعة
   ✅ 3 جداول صيانة
   ✅ 2 إعارات (Lending)
   ✅ 1 عطل (Fault)

🔍 للتحقق من جودة البيانات:
   http://localhost:3001/api/equipment/dashboard/stats

📝 ملاحظات:
   - جميع البيانات في الذاكرة (In-Memory)
   - ستختفي عند إعادة تشغيل Backend
   - للبيانات الدائمة، استخدم MongoDB Atlas

✅ إذا أضفت البيانات بنجاح، يجب أن تظهر في Dashboard
`);

// ===== Export =====
module.exports = {
  equipmentData,
  maintenanceSchedulesData,
  postmanScript,
  curlCommands,
};
