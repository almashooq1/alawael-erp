/**
 * 06-VehiclesSeeder.js
 * إنشاء مركبات ومسارات نقل تجريبية
 * 5 مركبات (3 رياض، 1 جدة، 1 دمام) + مسارين
 */

const mongoose = require('mongoose');

// ===== نماذج مؤقتة =====

const VehicleSchema = new mongoose.Schema(
  {
    plateNumber: { type: String, required: true, unique: true },
    plateNumberEn: String,
    registrationNumber: { type: String, unique: true, sparse: true },
    type: { type: String, enum: ['van', 'bus', 'car', 'minibus'], default: 'van' },
    brand: String,
    model: String,
    year: Number,
    color: String,
    capacity: { type: Number, default: 8 },
    wheelchairAccessible: { type: Boolean, default: false },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance', 'retired'],
      default: 'active',
    },
    insuranceExpiry: Date,
    registrationExpiry: Date,
    lastMaintenance: Date,
    nextMaintenance: Date,
    gpsDeviceId: String,
    mileage: { type: Number, default: 0 },
    fuelType: {
      type: String,
      enum: ['gasoline', 'diesel', 'electric', 'hybrid'],
      default: 'gasoline',
    },
    notesAr: String,
  },
  { timestamps: true }
);

const TransportRouteSchema = new mongoose.Schema(
  {
    nameAr: { type: String, required: true },
    nameEn: String,
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    routeType: {
      type: String,
      enum: ['morning_pickup', 'afternoon_dropoff', 'both'],
      default: 'morning_pickup',
    },
    departureTime: String,
    estimatedArrival: String,
    estimatedDurationMinutes: Number,
    stops: [
      {
        order: Number,
        locationAr: String,
        locationEn: String,
        latitude: Number,
        longitude: Number,
        pickupTime: String,
      },
    ],
    daysOfWeek: [
      {
        type: String,
        enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      },
    ],
    maxPassengers: Number,
    isActive: { type: Boolean, default: true },
    notesAr: String,
  },
  { timestamps: true }
);

const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);
const TransportRoute =
  mongoose.models.TransportRoute || mongoose.model('TransportRoute', TransportRouteSchema);

async function seedVehicles() {
  const Branch = mongoose.model('Branch');
  const User = mongoose.model('User');

  // جلب الفروع
  const riyadh = await Branch.findOne({ code: 'RUH-01' });
  const jeddah = await Branch.findOne({ code: 'JED-01' });
  const dammam = await Branch.findOne({ code: 'DMM-01' });

  if (!riyadh || !jeddah || !dammam) {
    console.log('  ⚠️  الفروع غير موجودة، يُرجى تشغيل 01-BranchSeeder أولاً');
    return;
  }

  // جلب السائقين
  const drivers = await User.find({ role: 'driver' });
  const riyadhDrivers = drivers.filter(d => d.branch?.toString() === riyadh._id.toString());
  const jeddahDrivers = drivers.filter(d => d.branch?.toString() === jeddah._id.toString());
  const dammamDrivers = drivers.filter(d => d.branch?.toString() === dammam._id.toString());

  const vehiclesData = [
    // === فرع الرياض ===
    {
      plateNumber: 'أ ب ج 1234',
      plateNumberEn: 'A B C 1234',
      registrationNumber: 'REG-RUH-2024-001',
      type: 'van',
      brand: 'Toyota',
      model: 'HiAce',
      year: 2024,
      color: 'أبيض',
      capacity: 8,
      wheelchairAccessible: true,
      branchId: riyadh._id,
      driverId: riyadhDrivers[0]?._id || null,
      status: 'active',
      insuranceExpiry: new Date('2027-01-15'),
      registrationExpiry: new Date('2027-03-20'),
      lastMaintenance: new Date('2026-02-01'),
      nextMaintenance: new Date('2026-05-01'),
      gpsDeviceId: 'GPS-RUH-001',
      mileage: 24500,
      fuelType: 'gasoline',
      notesAr: 'مركبة مجهزة لذوي الإعاقة الحركية',
    },
    {
      plateNumber: 'د هـ و 5678',
      plateNumberEn: 'D H W 5678',
      registrationNumber: 'REG-RUH-2023-002',
      type: 'van',
      brand: 'Toyota',
      model: 'HiAce',
      year: 2023,
      color: 'أبيض',
      capacity: 8,
      wheelchairAccessible: false,
      branchId: riyadh._id,
      driverId: riyadhDrivers[1]?._id || null,
      status: 'active',
      insuranceExpiry: new Date('2026-12-01'),
      registrationExpiry: new Date('2027-02-15'),
      lastMaintenance: new Date('2026-01-15'),
      nextMaintenance: new Date('2026-04-15'),
      gpsDeviceId: 'GPS-RUH-002',
      mileage: 38200,
      fuelType: 'gasoline',
    },
    {
      plateNumber: 'م ن س 7890',
      plateNumberEn: 'M N S 7890',
      registrationNumber: 'REG-RUH-2022-003',
      type: 'van',
      brand: 'Nissan',
      model: 'Urvan',
      year: 2022,
      color: 'أبيض',
      capacity: 8,
      wheelchairAccessible: false,
      branchId: riyadh._id,
      driverId: null,
      status: 'maintenance',
      insuranceExpiry: new Date('2026-08-01'),
      registrationExpiry: new Date('2026-09-10'),
      lastMaintenance: new Date('2026-03-20'),
      nextMaintenance: new Date('2026-04-20'),
      gpsDeviceId: 'GPS-RUH-003',
      mileage: 67800,
      fuelType: 'gasoline',
      notesAr: 'في الصيانة - تغيير زيت وفلاتر',
    },

    // === فرع جدة ===
    {
      plateNumber: 'ز ح ط 9012',
      plateNumberEn: 'Z H T 9012',
      registrationNumber: 'REG-JED-2024-004',
      type: 'van',
      brand: 'Hyundai',
      model: 'H350',
      year: 2024,
      color: 'فضي',
      capacity: 10,
      wheelchairAccessible: true,
      branchId: jeddah._id,
      driverId: jeddahDrivers[0]?._id || null,
      status: 'active',
      insuranceExpiry: new Date('2027-06-01'),
      registrationExpiry: new Date('2027-05-10'),
      lastMaintenance: new Date('2026-03-01'),
      nextMaintenance: new Date('2026-06-01'),
      gpsDeviceId: 'GPS-JED-001',
      mileage: 15300,
      fuelType: 'diesel',
      notesAr: 'مركبة مجهزة لكرسي الإعاقة مع منحدر كهربائي',
    },

    // === فرع الدمام ===
    {
      plateNumber: 'ي ك ل 3456',
      plateNumberEn: 'Y K L 3456',
      registrationNumber: 'REG-DMM-2023-005',
      type: 'bus',
      brand: 'Toyota',
      model: 'Coaster',
      year: 2023,
      color: 'أبيض',
      capacity: 15,
      wheelchairAccessible: true,
      branchId: dammam._id,
      driverId: dammamDrivers[0]?._id || null,
      status: 'active',
      insuranceExpiry: new Date('2026-11-01'),
      registrationExpiry: new Date('2027-01-25'),
      lastMaintenance: new Date('2026-02-15'),
      nextMaintenance: new Date('2026-05-15'),
      gpsDeviceId: 'GPS-DMM-001',
      mileage: 42100,
      fuelType: 'diesel',
      notesAr: 'حافلة كبيرة لخدمة مستفيدي الدمام',
    },
  ];

  let vehicleCreatedCount = 0;
  let vehicleSkippedCount = 0;
  const createdVehicles = {};

  for (const vData of vehiclesData) {
    const exists = await Vehicle.findOne({ plateNumber: vData.plateNumber });
    if (!exists) {
      const v = await Vehicle.create(vData);
      createdVehicles[vData.plateNumber] = v._id;
      vehicleCreatedCount++;
    } else {
      createdVehicles[vData.plateNumber] = exists._id;
      vehicleSkippedCount++;
    }
  }

  // ===== إنشاء المسارات =====
  const routesData = [
    {
      nameAr: 'مسار شمال الرياض الصباحي',
      nameEn: 'Riyadh North Morning Route',
      branchId: riyadh._id,
      vehicleId: createdVehicles['أ ب ج 1234'] || null,
      driverId: riyadhDrivers[0]?._id || null,
      routeType: 'morning_pickup',
      departureTime: '06:30',
      estimatedArrival: '07:45',
      estimatedDurationMinutes: 75,
      stops: [
        {
          order: 1,
          locationAr: 'حي الملقا',
          locationEn: 'Al-Malqa District',
          latitude: 24.8021,
          longitude: 46.6278,
          pickupTime: '06:30',
        },
        {
          order: 2,
          locationAr: 'حي الياسمين',
          locationEn: 'Al-Yasmin District',
          latitude: 24.8234,
          longitude: 46.6512,
          pickupTime: '06:45',
        },
        {
          order: 3,
          locationAr: 'حي النرجس',
          locationEn: 'Al-Narjis District',
          latitude: 24.8456,
          longitude: 46.6234,
          pickupTime: '07:00',
        },
        {
          order: 4,
          locationAr: 'حي الصحافة',
          locationEn: 'Al-Sahafa District',
          latitude: 24.789,
          longitude: 46.689,
          pickupTime: '07:15',
        },
        {
          order: 5,
          locationAr: 'المركز',
          locationEn: 'Center',
          latitude: 24.7136,
          longitude: 46.6753,
          pickupTime: '07:45',
        },
      ],
      daysOfWeek: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
      maxPassengers: 8,
      isActive: true,
      notesAr: 'مسار صباحي يومي للمناطق الشمالية في الرياض',
    },
    {
      nameAr: 'مسار جنوب الرياض الصباحي',
      nameEn: 'Riyadh South Morning Route',
      branchId: riyadh._id,
      vehicleId: createdVehicles['د هـ و 5678'] || null,
      driverId: riyadhDrivers[1]?._id || null,
      routeType: 'morning_pickup',
      departureTime: '06:45',
      estimatedArrival: '07:50',
      estimatedDurationMinutes: 65,
      stops: [
        {
          order: 1,
          locationAr: 'حي العزيزية',
          locationEn: 'Al-Aziziya District',
          latitude: 24.6321,
          longitude: 46.7456,
          pickupTime: '06:45',
        },
        {
          order: 2,
          locationAr: 'حي الشفا',
          locationEn: 'Al-Shifa District',
          latitude: 24.5678,
          longitude: 46.7234,
          pickupTime: '07:00',
        },
        {
          order: 3,
          locationAr: 'حي بدر',
          locationEn: 'Badr District',
          latitude: 24.6012,
          longitude: 46.689,
          pickupTime: '07:15',
        },
        {
          order: 4,
          locationAr: 'المركز',
          locationEn: 'Center',
          latitude: 24.7136,
          longitude: 46.6753,
          pickupTime: '07:50',
        },
      ],
      daysOfWeek: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
      maxPassengers: 8,
      isActive: true,
      notesAr: 'مسار صباحي يومي للمناطق الجنوبية في الرياض',
    },
    {
      nameAr: 'مسار جدة الصباحي',
      nameEn: 'Jeddah Morning Route',
      branchId: jeddah._id,
      vehicleId: createdVehicles['ز ح ط 9012'] || null,
      driverId: jeddahDrivers[0]?._id || null,
      routeType: 'morning_pickup',
      departureTime: '06:30',
      estimatedArrival: '07:40',
      estimatedDurationMinutes: 70,
      stops: [
        {
          order: 1,
          locationAr: 'حي الروضة',
          locationEn: 'Al-Rawda District',
          latitude: 21.5433,
          longitude: 39.1728,
          pickupTime: '06:30',
        },
        {
          order: 2,
          locationAr: 'حي الزهراء',
          locationEn: 'Al-Zahra District',
          latitude: 21.5612,
          longitude: 39.1534,
          pickupTime: '06:45',
        },
        {
          order: 3,
          locationAr: 'حي السلامة',
          locationEn: 'Al-Salama District',
          latitude: 21.5234,
          longitude: 39.189,
          pickupTime: '07:00',
        },
        {
          order: 4,
          locationAr: 'المركز',
          locationEn: 'Center',
          latitude: 21.4858,
          longitude: 39.1925,
          pickupTime: '07:40',
        },
      ],
      daysOfWeek: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
      maxPassengers: 10,
      isActive: true,
    },
    {
      nameAr: 'مسار الدمام الصباحي',
      nameEn: 'Dammam Morning Route',
      branchId: dammam._id,
      vehicleId: createdVehicles['ي ك ل 3456'] || null,
      driverId: dammamDrivers[0]?._id || null,
      routeType: 'morning_pickup',
      departureTime: '06:15',
      estimatedArrival: '07:30',
      estimatedDurationMinutes: 75,
      stops: [
        {
          order: 1,
          locationAr: 'حي الفيصلية',
          locationEn: 'Al-Faisaliya District',
          latitude: 26.4367,
          longitude: 50.1033,
          pickupTime: '06:15',
        },
        {
          order: 2,
          locationAr: 'حي الشاطئ',
          locationEn: 'Al-Shati District',
          latitude: 26.4512,
          longitude: 50.1234,
          pickupTime: '06:30',
        },
        {
          order: 3,
          locationAr: 'حي العنود',
          locationEn: 'Al-Anoud District',
          latitude: 26.4234,
          longitude: 50.089,
          pickupTime: '06:50',
        },
        {
          order: 4,
          locationAr: 'المركز',
          locationEn: 'Center',
          latitude: 26.3927,
          longitude: 49.9777,
          pickupTime: '07:30',
        },
      ],
      daysOfWeek: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
      maxPassengers: 15,
      isActive: true,
    },
  ];

  let routeCreatedCount = 0;
  let routeSkippedCount = 0;

  for (const rData of routesData) {
    const exists = await TransportRoute.findOne({ nameAr: rData.nameAr });
    if (!exists) {
      await TransportRoute.create(rData);
      routeCreatedCount++;
    } else {
      routeSkippedCount++;
    }
  }

  console.log(
    `  ✅ مركبات: أُنشئ ${vehicleCreatedCount} | تخطي: ${vehicleSkippedCount} | مسارات: أُنشئ ${routeCreatedCount} | تخطي: ${routeSkippedCount}`
  );
}

module.exports = { seedVehicles, Vehicle, TransportRoute };
