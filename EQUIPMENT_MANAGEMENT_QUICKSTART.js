/**
 * Equipment Management System - Quick Start Guide
 * دليل البدء السريع - نظام إدارة المعدات
 */

// ===== 1. INSTALLATION & SETUP =====

// Install required packages
npm install mongoose express-router validation-utilities

// ===== 2. REGISTER ROUTES IN server.js =====

const equipmentRoutes = require('./routes/equipment');
app.use('/api/equipment', equipmentRoutes);

// ===== 3. INITIALIZE ALERTS SERVICE =====

const EquipmentAlertsService = require('./services/equipmentAlertsService');

// Run alerts check every 30 minutes
setInterval(async () => {
  const alerts = await EquipmentAlertsService.getAllActiveAlerts();
  console.log('Active Alerts:', alerts.length);
  // Send notifications to users...
}, 30 * 60 * 1000);

// ===== 4. SAMPLE DATA SEEDING =====

async function seedEquipmentData() {
  const Equipment = require('./models/equipmentManagement').Equipment;
  
  const equipment = [
    {
      equipmentId: 'EQ-2026-001',
      name: 'جهاز قياس السمع الرقمي - Audiometer',
      category: 'assessment_diagnostic',
      subCategory: 'Hearing Assessment',
      manufacturer: 'Siemens',
      model: 'ACURIS Pro',
      serialNumber: 'SN-12345-67890',
      purchaseDate: new Date('2024-06-15'),
      purchasePrice: 5000,
      supplier: 'Medical Equipment Co.',
      location: {
        building: 'Building A',
        floor: '2',
        room: '201',
        department: 'Audiology'
      },
      warranty: {
        startDate: new Date('2024-06-15'),
        endDate: new Date('2026-06-15'),
        provider: 'Siemens Service',
        daysRemaining: 507,
        isExpired: false
      },
      status: 'available',
      operatingSpecs: {
        powerConsumption: '100W',
        dimensions: '60cm x 40cm x 30cm',
        weight: '15kg',
        capacity: 'Multiple tests per day',
        features: ['Digital Display', 'Network Ready', 'Data Export']
      },
      maintenanceSpecs: {
        maintenanceInterval: 90,
        lastMaintenanceDate: new Date('2026-01-10'),
        nextMaintenanceDate: new Date('2026-04-10'),
        estimatedOperatingHours: 8000,
        currentOperatingHours: 2150
      },
      usage: {
        totalUsageHours: 2150,
        dailyUsageHours: 4,
        lastUsedDate: new Date(),
        usageCount: 450,
        utilizationRate: 75
      }
    },
    {
      equipmentId: 'EQ-2026-002',
      name: 'جهاز العلاج الطبيعي - Rehabilitation Unit',
      category: 'treatment_rehabilitation',
      subCategory: 'Physical Therapy',
      manufacturer: 'Zimmer',
      model: 'Z-System 3000',
      serialNumber: 'SN-98765-43210',
      purchaseDate: new Date('2024-09-20'),
      purchasePrice: 8000,
      supplier: 'Healthcare Solutions',
      location: {
        building: 'Building B',
        floor: '1',
        room: '105',
        department: 'Physiotherapy'
      },
      warranty: {
        startDate: new Date('2024-09-20'),
        endDate: new Date('2026-09-20'),
        provider: 'Zimmer Warranty',
        daysRemaining: 607,
        isExpired: false
      },
      status: 'available',
      operatingSpecs: {
        powerConsumption: '250W',
        dimensions: '80cm x 60cm x 100cm',
        weight: '45kg',
        capacity: 'Multiple therapy sessions',
        features: ['Digital Controls', 'Safety Features', 'Adjustable']
      },
      maintenanceSpecs: {
        maintenanceInterval: 120,
        lastMaintenanceDate: new Date('2025-12-20'),
        nextMaintenanceDate: new Date('2026-04-20'),
        estimatedOperatingHours: 10000,
        currentOperatingHours: 3200
      },
      usage: {
        totalUsageHours: 3200,
        dailyUsageHours: 6,
        lastUsedDate: new Date(),
        usageCount: 520,
        utilizationRate: 88
      }
    },
    {
      equipmentId: 'EQ-2026-003',
      name: 'نظام الأطراف الصناعية الذكية - Smart Prosthetics',
      category: 'assistive_technology',
      subCategory: 'Advanced Prosthetics',
      manufacturer: 'BioniX',
      model: 'BX-2000 Smart',
      serialNumber: 'SN-55555-88888',
      purchaseDate: new Date('2025-01-05'),
      purchasePrice: 15000,
      supplier: 'Advanced Assistive Tech',
      location: {
        building: 'Building C',
        floor: '3',
        room: '301',
        department: 'Prosthetics'
      },
      warranty: {
        startDate: new Date('2025-01-05'),
        endDate: new Date('2027-01-05'),
        provider: 'BioniX Premium Support',
        daysRemaining: 714,
        isExpired: false
      },
      status: 'available',
      operatingSpecs: {
        powerConsumption: '50W',
        dimensions: 'Variable',
        weight: '2kg',
        capacity: 'Multiple patient fits',
        features: ['AI Controlled', 'Wireless', 'App Enabled']
      },
      maintenanceSpecs: {
        maintenanceInterval: 180,
        lastMaintenanceDate: new Date('2025-12-25'),
        nextMaintenanceDate: new Date('2026-06-25'),
        estimatedOperatingHours: 5000,
        currentOperatingHours: 450
      },
      usage: {
        totalUsageHours: 450,
        dailyUsageHours: 2,
        lastUsedDate: new Date(),
        usageCount: 25,
        utilizationRate: 35
      }
    }
  ];

  try {
    await Equipment.insertMany(equipment);
    console.log('✅ Equipment data seeded successfully');
  } catch (error) {
    console.error('Error seeding equipment:', error);
  }
}

// ===== 5. API USAGE EXAMPLES =====

// Example 1: Fetch all equipment
async function getAllEquipment() {
  const response = await fetch('http://localhost:3001/api/equipment', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  console.log('Equipment:', data.data);
}

// Example 2: Create new equipment
async function createEquipment() {
  const response = await fetch('http://localhost:3001/api/equipment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      equipmentId: 'EQ-2026-004',
      name: 'Medical Scale Digital',
      category: 'assessment_diagnostic',
      purchaseDate: new Date(),
      purchasePrice: 1000
    })
  });
  const data = await response.json();
  console.log('Created:', data.data);
}

// Example 3: Borrow equipment
async function borrowEquipment() {
  const response = await fetch('http://localhost:3001/api/lending/borrow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      equipmentId: '64f7a1b2c3d4e5f6g7h8i9j0',
      expectedReturnDate: '2026-02-05',
      lendingType: 'home_loan',
      borrowLocation: 'Home',
      department: 'Physiotherapy'
    })
  });
  const data = await response.json();
  console.log('Lending:', data.data);
}

// Example 4: Get alerts
async function getAlerts() {
  const response = await fetch('http://localhost:3001/api/alerts', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  console.log('Alerts:', data.data);
}

// Example 5: Schedule maintenance
async function scheduleMaintenance() {
  const response = await fetch('http://localhost:3001/api/maintenance-schedules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      equipmentId: '64f7a1b2c3d4e5f6g7h8i9j0',
      scheduleType: 'preventive',
      frequency: 30,
      frequencyType: 'monthly'
    })
  });
  const data = await response.json();
  console.log('Maintenance scheduled:', data.data);
}

// ===== 6. DASHBOARD COMPONENTS =====

// Import in React app
import EquipmentDashboard from './components/Equipment/EquipmentDashboard';
import EquipmentLendingManagement from './components/Equipment/EquipmentLendingManagement';
import SmartMaintenanceSystem from './components/Equipment/SmartMaintenanceSystem';

// Add to routing
<Route path="/equipment/dashboard" element={<EquipmentDashboard />} />
<Route path="/equipment/lending" element={<EquipmentLendingManagement />} />
<Route path="/equipment/maintenance" element={<SmartMaintenanceSystem />} />

// ===== 7. DATABASE INDEXES =====

// Create indexes for performance
db.equipment.createIndex({ equipmentId: 1 }, { unique: true });
db.equipment.createIndex({ category: 1, status: 1 });
db.equipment.createIndex({ "warranty.endDate": 1 });
db.maintenance_schedules.createIndex({ equipment: 1, status: 1 });
db.maintenance_schedules.createIndex({ "preventiveSchedule.nextScheduledDate": 1 });
db.equipment_lending.createIndex({ borrower: 1, status: 1 });
db.equipment_lending.createIndex({ borrowDate: -1 });

// ===== 8. TESTING =====

// Backend test
describe('Equipment Management', () => {
  it('should create equipment', async () => {
    const res = await request(app)
      .post('/api/equipment')
      .set('Authorization', `Bearer ${token}`)
      .send({
        equipmentId: 'TEST-001',
        name: 'Test Equipment',
        category: 'assessment_diagnostic',
        purchaseDate: new Date(),
        purchasePrice: 1000
      });
    expect(res.status).toBe(201);
  });

  it('should borrow equipment', async () => {
    const res = await request(app)
      .post('/api/lending/borrow')
      .set('Authorization', `Bearer ${token}`)
      .send({
        equipmentId: equipmentId,
        expectedReturnDate: '2026-02-05',
        lendingType: 'home_loan'
      });
    expect(res.status).toBe(201);
  });

  it('should get alerts', async () => {
    const res = await request(app)
      .get('/api/alerts')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });
});

// ===== 9. CONFIGURATION =====

// Environment variables (.env)
EQUIPMENT_MAINTENANCE_INTERVAL=30        // Default days
EQUIPMENT_WARRANTY_ALERT_DAYS=30         // Alert before expiry
EQUIPMENT_LENDING_MAX_DAYS=30            // Max lending period
EQUIPMENT_REPORT_EXPORT_FORMATS=excel,pdf,csv

// ===== 10. MONITORING & ALERTS =====

// Setup monitoring
const monitoring = {
  checkAlertsInterval: 30 * 60 * 1000,   // 30 minutes
  sendNotifications: true,
  logAlerts: true,
  alertThresholds: {
    warranty: 30,                        // days
    maintenance: 0,                      // overdue = 0
    lending: 7,                          // days after return date
    utilization: 90                      // percentage
  }
};

// Notification channels
const notificationChannels = ['email', 'sms', 'in_app', 'dashboard'];

console.log('✅ Equipment Management System Ready!');
console.log('📊 Dashboard: http://localhost:3002/equipment/dashboard');
console.log('🏭 Lending: http://localhost:3002/equipment/lending');
console.log('🔧 Maintenance: http://localhost:3002/equipment/maintenance');
