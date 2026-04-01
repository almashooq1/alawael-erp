/**
 * @file vehicles-transport.seed.js
 * @description بيانات المركبات والمسارات - 5 مركبات، 3 مسارات
 * Vehicles and transport routes seed - Al-Awael ERP
 */
'use strict';

const VEHICLES = [
  {
    vehicleId: 'VEH-RUH-001',
    plateNumber: { ar: 'أ ب ج 1234', en: 'A B C 1234' },
    type: 'van',
    brand: 'Toyota',
    model: 'HiAce',
    year: 2024,
    color: { ar: 'أبيض', en: 'White' },
    capacity: 8,
    wheelchairAccessible: true,
    branchCode: 'RUH-MAIN',
    driverEmployeeId: 'DRV-RUH-001',
    status: 'active',
    insurance: { expiryDate: new Date('2027-01-15'), policyNumber: 'INS-VEH-001' },
    registration: { expiryDate: new Date('2027-03-20'), number: 'REG-VEH-001' },
    maintenance: { lastDate: new Date('2026-02-01'), nextDate: new Date('2026-05-01') },
    gpsDeviceId: 'GPS-RUH-001',
    currentLocation: { lat: 24.7136, lng: 46.6753 },
    notes: 'مركبة ذوي الاحتياجات الخاصة الرئيسية - الرياض',
  },
  {
    vehicleId: 'VEH-RUH-002',
    plateNumber: { ar: 'د هـ و 5678', en: 'D H W 5678' },
    type: 'van',
    brand: 'Toyota',
    model: 'HiAce',
    year: 2023,
    color: { ar: 'أبيض', en: 'White' },
    capacity: 8,
    wheelchairAccessible: false,
    branchCode: 'RUH-MAIN',
    driverEmployeeId: 'DRV-RUH-002',
    status: 'active',
    insurance: { expiryDate: new Date('2026-12-01'), policyNumber: 'INS-VEH-002' },
    registration: { expiryDate: new Date('2027-02-15'), number: 'REG-VEH-002' },
    maintenance: { lastDate: new Date('2026-01-15'), nextDate: new Date('2026-04-15') },
    gpsDeviceId: 'GPS-RUH-002',
    currentLocation: { lat: 24.72, lng: 46.68 },
    notes: 'مركبة النقل الثانية - الرياض',
  },
  {
    vehicleId: 'VEH-JED-001',
    plateNumber: { ar: 'ز ح ط 9012', en: 'Z H T 9012' },
    type: 'van',
    brand: 'Hyundai',
    model: 'H350',
    year: 2024,
    color: { ar: 'فضي', en: 'Silver' },
    capacity: 10,
    wheelchairAccessible: true,
    branchCode: 'JED-MAIN',
    driverEmployeeId: 'DRV-JED-001',
    status: 'active',
    insurance: { expiryDate: new Date('2027-06-01'), policyNumber: 'INS-VEH-003' },
    registration: { expiryDate: new Date('2027-05-10'), number: 'REG-VEH-003' },
    maintenance: { lastDate: new Date('2026-03-01'), nextDate: new Date('2026-06-01') },
    gpsDeviceId: 'GPS-JED-001',
    currentLocation: { lat: 21.5433, lng: 39.1728 },
    notes: 'مركبة فرع جدة الرئيسية',
  },
  {
    vehicleId: 'VEH-DAM-001',
    plateNumber: { ar: 'ي ك ل 3456', en: 'Y K L 3456' },
    type: 'bus',
    brand: 'Toyota',
    model: 'Coaster',
    year: 2023,
    color: { ar: 'أبيض', en: 'White' },
    capacity: 15,
    wheelchairAccessible: true,
    branchCode: 'DAM-MAIN',
    driverEmployeeId: 'DRV-DAM-001',
    status: 'active',
    insurance: { expiryDate: new Date('2026-11-01'), policyNumber: 'INS-VEH-004' },
    registration: { expiryDate: new Date('2027-01-25'), number: 'REG-VEH-004' },
    maintenance: { lastDate: new Date('2026-02-15'), nextDate: new Date('2026-05-15') },
    gpsDeviceId: 'GPS-DMM-001',
    currentLocation: { lat: 26.4207, lng: 50.0888 },
    notes: 'حافلة فرع الدمام',
  },
  {
    vehicleId: 'VEH-RUH-003',
    plateNumber: { ar: 'م ن س 7890', en: 'M N S 7890' },
    type: 'van',
    brand: 'Nissan',
    model: 'Urvan',
    year: 2022,
    color: { ar: 'أبيض', en: 'White' },
    capacity: 8,
    wheelchairAccessible: false,
    branchCode: 'RUH-MAIN',
    driverEmployeeId: null,
    status: 'maintenance',
    insurance: { expiryDate: new Date('2026-08-01'), policyNumber: 'INS-VEH-005' },
    registration: { expiryDate: new Date('2026-09-10'), number: 'REG-VEH-005' },
    maintenance: { lastDate: new Date('2026-03-20'), nextDate: new Date('2026-04-20') },
    gpsDeviceId: 'GPS-RUH-003',
    notes: 'في الصيانة الدورية',
  },
];

const TRANSPORT_ROUTES = [
  {
    routeId: 'ROUTE-RUH-001',
    nameAr: 'مسار شمال الرياض الصباحي',
    nameEn: 'Riyadh North Morning Route',
    branchCode: 'RUH-MAIN',
    vehicleId: 'VEH-RUH-001',
    routeType: 'morning_pickup',
    departureTime: '06:30',
    estimatedArrival: '07:45',
    estimatedDurationMinutes: 75,
    stops: [
      { order: 1, locationAr: 'حي الملقا', lat: 24.8021, lng: 46.6278, pickupTime: '06:30' },
      { order: 2, locationAr: 'حي الياسمين', lat: 24.8234, lng: 46.6512, pickupTime: '06:45' },
      { order: 3, locationAr: 'حي النرجس', lat: 24.8456, lng: 46.6234, pickupTime: '07:00' },
      { order: 4, locationAr: 'حي الصحافة', lat: 24.789, lng: 46.689, pickupTime: '07:15' },
      { order: 5, locationAr: 'المركز', lat: 24.7136, lng: 46.6753, pickupTime: '07:45' },
    ],
    daysOfWeek: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    maxPassengers: 8,
    isActive: true,
  },
  {
    routeId: 'ROUTE-RUH-002',
    nameAr: 'مسار جنوب الرياض الصباحي',
    nameEn: 'Riyadh South Morning Route',
    branchCode: 'RUH-MAIN',
    vehicleId: 'VEH-RUH-002',
    routeType: 'morning_pickup',
    departureTime: '06:45',
    estimatedArrival: '07:50',
    estimatedDurationMinutes: 65,
    stops: [
      { order: 1, locationAr: 'حي العزيزية', lat: 24.6321, lng: 46.7456, pickupTime: '06:45' },
      { order: 2, locationAr: 'حي الشفا', lat: 24.5678, lng: 46.7234, pickupTime: '07:00' },
      { order: 3, locationAr: 'حي بدر', lat: 24.6012, lng: 46.689, pickupTime: '07:20' },
      { order: 4, locationAr: 'المركز', lat: 24.7136, lng: 46.6753, pickupTime: '07:50' },
    ],
    daysOfWeek: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    maxPassengers: 8,
    isActive: true,
  },
  {
    routeId: 'ROUTE-JED-001',
    nameAr: 'مسار جدة الشمالي الصباحي',
    nameEn: 'Jeddah North Morning Route',
    branchCode: 'JED-MAIN',
    vehicleId: 'VEH-JED-001',
    routeType: 'morning_pickup',
    departureTime: '06:30',
    estimatedArrival: '07:40',
    estimatedDurationMinutes: 70,
    stops: [
      { order: 1, locationAr: 'حي الصفا', lat: 21.5892, lng: 39.1654, pickupTime: '06:30' },
      { order: 2, locationAr: 'حي الحمراء', lat: 21.5678, lng: 39.1789, pickupTime: '06:45' },
      { order: 3, locationAr: 'حي الروضة', lat: 21.5512, lng: 39.1923, pickupTime: '07:05' },
      { order: 4, locationAr: 'المركز', lat: 21.5433, lng: 39.1728, pickupTime: '07:40' },
    ],
    daysOfWeek: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    maxPassengers: 10,
    isActive: true,
  },
];

async function seed(connection) {
  const db = connection.db || (connection.connection && connection.connection.db) || connection;
  if (!db) throw new Error('No database connection');

  const vehiclesCol = db.collection('vehicles');
  const routesCol = db.collection('transportroutes');
  const now = new Date();
  let vCreated = 0,
    rCreated = 0;

  for (const v of VEHICLES) {
    const exists = await vehiclesCol.findOne({ vehicleId: v.vehicleId });
    if (!exists) {
      await vehiclesCol.insertOne({
        ...v,
        registrationNumber: v.registration.number,
        vin: 'VIN-' + v.vehicleId,
        engineNumber: 'ENG-' + v.vehicleId,
        metadata: { isComprehensiveSeed: true, seededAt: now },
        createdAt: now,
        updatedAt: now,
      });
      vCreated++;
    }
  }

  for (const r of TRANSPORT_ROUTES) {
    const exists = await routesCol.findOne({ routeId: r.routeId });
    if (!exists) {
      await routesCol.insertOne({
        ...r,
        routeName: r.nameAr,
        routeCode: r.routeId,
        metadata: { isComprehensiveSeed: true, seededAt: now },
        createdAt: now,
        updatedAt: now,
      });
      rCreated++;
    }
  }

  console.log(`  ✅ vehicles-transport: ${vCreated} vehicles, ${rCreated} routes created`);
}

async function down(connection) {
  const db = connection.db || (connection.connection && connection.connection.db) || connection;
  await db.collection('vehicles').deleteMany({ 'metadata.isComprehensiveSeed': true });
  await db.collection('transportroutes').deleteMany({ 'metadata.isComprehensiveSeed': true });
  console.log('  ✅ vehicles-transport: removed all comprehensive seed vehicles & routes');
}

module.exports = { seed, down };
