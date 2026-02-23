/**
 * Saudi Vehicle Management Service - خدمة إدارة المركبات السعودية
 * Enhanced for Saudi Arabia Requirements
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');

/**
 * Saudi Vehicle Configuration
 */
const saudiConfig = {
  // المناطق السعودية
  regions: {
    riyadh: { label: 'الرياض', code: '01' },
    makkah: { label: 'مكة المكرمة', code: '02' },
    madinah: { label: 'المدينة المنورة', code: '03' },
    eastern: { label: 'المنطقة الشرقية', code: '04' },
    qassim: { label: 'القصيم', code: '05' },
    aseer: { label: 'عسير', code: '06' },
    tabuk: { label: 'تبوك', code: '07' },
    hail: { label: 'حائل', code: '08' },
    northern: { label: 'الحدود الشمالية', code: '09' },
    jazan: { label: 'جازان', code: '10' },
    najran: { label: 'نجران', code: '11' },
    bahah: { label: 'الباحة', code: '12' },
    jawf: { label: 'الجوف', code: '13' },
  },
  
  // أنواع لوحات السيارات
  plateTypes: {
    private: { label: 'خاصة', code: 'P', digits: 4, letters: 3 },
    commercial: { label: 'تجارية', code: 'C', digits: 4, letters: 3 },
    government: { label: 'حكومية', code: 'G', digits: 4, letters: 3 },
    diplomatic: { label: 'دبلوماسية', code: 'D', digits: 4, letters: 3 },
    transport: { label: 'نقل', code: 'T', digits: 4, letters: 3 },
    taxi: { label: 'أجرة', code: 'TX', digits: 4, letters: 3 },
    hajj: { label: 'حج', code: 'H', digits: 4, letters: 3 },
    umrah: { label: 'عمرة', code: 'U', digits: 4, letters: 3 },
  },
  
  // أنواع الوقود
  fuelTypes: {
    petrol_91: { label: 'بنزين 91', price: 2.18 },
    petrol_95: { label: 'بنزين 95', price: 2.33 },
    diesel: { label: 'ديزل', price: 0.72 },
    electric: { label: 'كهربائي', price: 0 },
    hybrid: { label: 'هجين', price: 0 },
  },
  
  // شركات التأمين المعتمدة
  insuranceCompanies: {
    tawuniya: { label: 'التعاونية', code: 'TAW' },
    medgulf: { label: 'ميدغلف', code: 'MED' },
    bupa: { label: 'بوبا', code: 'BUP' },
    alrajhi: { label: 'الراجحي', code: 'RAJ' },
    saic: { label: 'الاتحاد', code: 'SAI' },
    sagr: { label: 'الصقر', code: 'SAG' },
    arabia: { label: 'العربية', code: 'ARA' },
    wataniya: { label: 'الوطنية', code: 'WAT' },
  },
};

/**
 * Saudi Vehicle Schema
 */
const SaudiVehicleSchema = new mongoose.Schema({
  // معلومات أساسية
  vehicleId: { type: String, unique: true },
  
  // بيانات الملكية
  ownership: {
    ownerType: { type: String, enum: ['individual', 'company', 'government'] },
    ownerId: String, // رقم الهوية / السجل التجاري
    ownerName: String,
    ownerMobile: String,
    ownerEmail: String,
    registrationDate: Date,
    expiryDate: Date,
  },
  
  // لوحة السيارة السعودية
  plate: {
    number: String,
    letters: {
      first: String,
      second: String,
      third: String,
    },
    plateType: { type: String, enum: Object.keys(saudiConfig.plateTypes) },
    region: { type: String, enum: Object.keys(saudiConfig.regions) },
    color: String,
  },
  
  // بيانات الاستمارة
  istimara: {
    number: String,
    issueDate: Date,
    expiryDate: Date,
    status: { type: String, enum: ['valid', 'expired', 'suspended', 'cancelled'] },
  },
  
  // بيانات الفحص الدوري
  fahas: {
    centerId: String,
    centerName: String,
    lastInspection: Date,
    nextInspection: Date,
    result: { type: String, enum: ['pass', 'fail', 'conditional'] },
    validityMonths: Number,
  },
  
  // التأمين
  insurance: {
    company: String,
    policyNumber: String,
    type: { type: String, enum: ['third_party', 'comprehensive', 'premium'] },
    startDate: Date,
    endDate: Date,
    premium: Number,
    coverage: Number,
  },
  
  // مواصفات السيارة
  specifications: {
    make: String,
    model: String,
    year: Number,
    color: String,
    chassisNumber: String,
    engineNumber: String,
    bodyType: String,
    cylinders: Number,
    fuelType: { type: String, enum: Object.keys(saudiConfig.fuelTypes) },
    transmission: { type: String, enum: ['automatic', 'manual'] },
    seatingCapacity: Number,
    weight: Number,
    weightWithLoad: Number,
  },
  
  // قراءات العداد
  odometer: {
    current: Number,
    lastUpdated: Date,
    history: [{
      reading: Number,
      date: Date,
      updatedBy: String,
    }],
  },
  
  // المخالفات المرورية
  violations: [{
    violationId: String,
    violationType: String,
    violationDate: Date,
    location: String,
    amount: Number,
    status: { type: String, enum: ['pending', 'paid', 'disputed', 'waived'] },
    paymentDate: Date,
    saherReference: String,
  }],
  
  // الصيانة والخدمات
  maintenance: [{
    serviceType: String,
    serviceDate: Date,
    mileage: Number,
    serviceProvider: String,
    cost: Number,
    notes: String,
    invoiceNumber: String,
  }],
  
  // استهلاك الوقود
  fuelLog: [{
    date: Date,
    fuelType: String,
    quantity: Number,
    cost: Number,
    stationName: String,
    mileage: Number,
    filledBy: String,
  }],
  
  // تعيين السائق
  driver: {
    driverId: String,
    driverName: String,
    licenseNumber: String,
    licenseExpiry: Date,
    mobile: String,
    assignedDate: Date,
  },
  
  // التتبع
  tracking: {
    enabled: { type: Boolean, default: false },
    deviceId: String,
    lastLocation: {
      latitude: Number,
      longitude: Number,
      timestamp: Date,
    },
    geofence: {
      enabled: Boolean,
      zones: [{
        name: String,
        coordinates: [{ lat: Number, lng: Number }],
      }],
    },
  },
  
  // الحالة
  status: {
    operational: { type: String, enum: ['active', 'maintenance', 'out_of_service'] },
    istimaraValid: Boolean,
    fahasValid: Boolean,
    insuranceValid: Boolean,
  },
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'saudi_vehicles',
});

// Indexes
SaudiVehicleSchema.index({ vehicleId: 1 });
SaudiVehicleSchema.index({ 'plate.number': 1, 'plate.region': 1 });
SaudiVehicleSchema.index({ 'istimara.expiryDate': 1 });
SaudiVehicleSchema.index({ 'insurance.endDate': 1 });

/**
 * Vehicle Trip Schema - رحلات المركبة
 */
const VehicleTripSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'SaudiVehicle', required: true },
  
  // معلومات الرحلة
  tripNumber: String,
  tripType: { type: String, enum: ['internal', 'external', 'hajj', 'umrah', 'transfer'] },
  
  // المواعيد
  schedule: {
    plannedStart: Date,
    plannedEnd: Date,
    actualStart: Date,
    actualEnd: Date,
  },
  
  // المسار
  route: {
    from: {
      location: String,
      coordinates: { lat: Number, lng: Number },
    },
    to: {
      location: String,
      coordinates: { lat: Number, lng: Number },
    },
    waypoints: [{
      location: String,
      coordinates: { lat: Number, lng: Number },
      arrivalTime: Date,
    }],
    distance: Number, // km
  },
  
  // السائق
  driver: {
    userId: String,
    name: String,
    mobile: String,
  },
  
  // الركاب
  passengers: [{
    name: String,
    idNumber: String,
    mobile: String,
    pickupPoint: String,
    dropoffPoint: String,
  }],
  
  // الحمولة
  cargo: {
    description: String,
    weight: Number,
    volume: Number,
    hazardous: Boolean,
    hazmatDetails: String,
  },
  
  // القراءات
  readings: {
    startMileage: Number,
    endMileage: Number,
    startFuel: Number,
    endFuel: Number,
  },
  
  // التكاليف
  costs: {
    fuel: Number,
    tolls: Number,
    parking: Number,
    other: Number,
    total: Number,
  },
  
  // الحالة
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'delayed'],
    default: 'scheduled',
  },
  
  // ملاحظات
  notes: String,
  issues: [{
    type: String,
    description: String,
    reportedAt: Date,
    resolvedAt: Date,
  }],
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'vehicle_trips',
});

/**
 * Saudi Vehicle Service Class
 */
class SaudiVehicleService extends EventEmitter {
  constructor() {
    super();
    this.Vehicle = null;
    this.Trip = null;
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.Vehicle = connection.model('SaudiVehicle', SaudiVehicleSchema);
    this.Trip = connection.model('VehicleTrip', VehicleTripSchema);
    console.log('✅ Saudi Vehicle Service initialized');
  }
  
  // ============ Vehicle Management ============
  
  /**
   * Create vehicle
   */
  async createVehicle(data) {
    const vehicleId = await this.generateVehicleId(data.plate);
    
    const vehicle = await this.Vehicle.create({
      ...data,
      vehicleId,
      status: {
        operational: 'active',
        istimaraValid: this.checkIstimaraValid(data.istimara),
        fahasValid: this.checkFahasValid(data.fahas),
        insuranceValid: this.checkInsuranceValid(data.insurance),
      },
    });
    
    this.emit('vehicle:created', vehicle);
    return vehicle;
  }
  
  /**
   * Generate vehicle ID
   */
  async generateVehicleId(plate) {
    const regionCode = saudiConfig.regions[plate.region]?.code || '00';
    const typeCode = saudiConfig.plateTypes[plate.plateType]?.code || 'P';
    const timestamp = Date.now().toString().slice(-6);
    return `KSA-${regionCode}-${typeCode}-${timestamp}`;
  }
  
  /**
   * Get vehicle
   */
  async getVehicle(vehicleId) {
    return this.Vehicle.findById(vehicleId);
  }
  
  /**
   * Get vehicle by plate
   */
  async getVehicleByPlate(number, letters, region) {
    return this.Vehicle.findOne({
      'plate.number': number,
      'plate.letters.first': letters[0],
      'plate.letters.second': letters[1],
      'plate.letters.third': letters[2],
      'plate.region': region,
    });
  }
  
  /**
   * Update vehicle
   */
  async updateVehicle(vehicleId, updates) {
    const vehicle = await this.Vehicle.findByIdAndUpdate(
      vehicleId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    this.emit('vehicle:updated', vehicle);
    return vehicle;
  }
  
  /**
   * Get all vehicles
   */
  async getVehicles(options = {}) {
    const filter = {};
    
    if (options.region) filter['plate.region'] = options.region;
    if (options.plateType) filter['plate.plateType'] = options.plateType;
    if (options.status) filter['status.operational'] = options.status;
    if (options.tenantId) filter.tenantId = options.tenantId;
    
    return this.Vehicle.find(filter)
      .sort({ createdAt: -1 })
      .limit(options.limit || 100);
  }
  
  // ============ Validations ============
  
  /**
   * Check istimara validity
   */
  checkIstimaraValid(istimara) {
    if (!istimara?.expiryDate) return false;
    return new Date(istimara.expiryDate) > new Date();
  }
  
  /**
   * Check fahas validity
   */
  checkFahasValid(fahas) {
    if (!fahas?.nextInspection) return false;
    return new Date(fahas.nextInspection) > new Date();
  }
  
  /**
   * Check insurance validity
   */
  checkInsuranceValid(insurance) {
    if (!insurance?.endDate) return false;
    return new Date(insurance.endDate) > new Date();
  }
  
  /**
   * Get expiring documents
   */
  async getExpiringDocuments(days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    const [istimaraExpiring, fahasExpiring, insuranceExpiring] = await Promise.all([
      this.Vehicle.find({ 'istimara.expiryDate': { $lte: futureDate, $gte: new Date() } }),
      this.Vehicle.find({ 'fahas.nextInspection': { $lte: futureDate, $gte: new Date() } }),
      this.Vehicle.find({ 'insurance.endDate': { $lte: futureDate, $gte: new Date() } }),
    ]);
    
    return {
      istimara: istimaraExpiring,
      fahas: fahasExpiring,
      insurance: insuranceExpiring,
    };
  }
  
  // ============ Violations ============
  
  /**
   * Add violation
   */
  async addViolation(vehicleId, violationData) {
    const vehicle = await this.Vehicle.findById(vehicleId);
    if (!vehicle) throw new Error('Vehicle not found');
    
    vehicle.violations.push({
      ...violationData,
      violationId: `SAHER-${Date.now()}`,
    });
    
    await vehicle.save();
    this.emit('violation:added', { vehicle, violation: violationData });
    
    return vehicle;
  }
  
  /**
   * Pay violation
   */
  async payViolation(vehicleId, violationId, paymentData) {
    const vehicle = await this.Vehicle.findById(vehicleId);
    if (!vehicle) throw new Error('Vehicle not found');
    
    const violation = vehicle.violations.id(violationId);
    if (!violation) throw new Error('Violation not found');
    
    violation.status = 'paid';
    violation.paymentDate = new Date();
    
    await vehicle.save();
    return vehicle;
  }
  
  // ============ Trips ============
  
  /**
   * Create trip
   */
  async createTrip(tripData) {
    const tripNumber = `TRP-${Date.now()}`;
    
    const trip = await this.Trip.create({
      ...tripData,
      tripNumber,
    });
    
    this.emit('trip:created', trip);
    return trip;
  }
  
  /**
   * Start trip
   */
  async startTrip(tripId, startData) {
    const trip = await this.Trip.findByIdAndUpdate(
      tripId,
      {
        status: 'in_progress',
        'schedule.actualStart': new Date(),
        'readings.startMileage': startData.mileage,
        'readings.startFuel': startData.fuel,
        updatedAt: new Date(),
      },
      { new: true }
    );
    
    this.emit('trip:started', trip);
    return trip;
  }
  
  /**
   * Complete trip
   */
  async completeTrip(tripId, endData) {
    const trip = await this.Trip.findByIdAndUpdate(
      tripId,
      {
        status: 'completed',
        'schedule.actualEnd': new Date(),
        'readings.endMileage': endData.mileage,
        'readings.endFuel': endData.fuel,
        'costs.total': (endData.fuelCost || 0) + (endData.tolls || 0) + (endData.parking || 0),
        updatedAt: new Date(),
      },
      { new: true }
    );
    
    // Update vehicle odometer
    await this.Vehicle.findByIdAndUpdate(trip.vehicleId, {
      'odometer.current': endData.mileage,
      'odometer.lastUpdated': new Date(),
      $push: { 'odometer.history': { reading: endData.mileage, date: new Date() } },
    });
    
    this.emit('trip:completed', trip);
    return trip;
  }
  
  /**
   * Get vehicle trips
   */
  async getVehicleTrips(vehicleId, options = {}) {
    const filter = { vehicleId };
    
    if (options.status) filter.status = options.status;
    if (options.startDate) filter['schedule.plannedStart'] = { $gte: new Date(options.startDate) };
    if (options.endDate) filter['schedule.plannedEnd'] = { $lte: new Date(options.endDate) };
    
    return this.Trip.find(filter)
      .sort({ 'schedule.plannedStart': -1 })
      .limit(options.limit || 50);
  }
  
  // ============ Fuel Management ============
  
  /**
   * Add fuel log
   */
  async addFuelLog(vehicleId, fuelData) {
    const vehicle = await this.Vehicle.findById(vehicleId);
    if (!vehicle) throw new Error('Vehicle not found');
    
    vehicle.fuelLog.push({
      ...fuelData,
      date: new Date(),
    });
    
    await vehicle.save();
    return vehicle;
  }
  
  /**
   * Get fuel statistics
   */
  async getFuelStatistics(vehicleId, period = 'month') {
    const vehicle = await this.Vehicle.findById(vehicleId);
    if (!vehicle) throw new Error('Vehicle not found');
    
    const days = period === 'month' ? 30 : period === 'quarter' ? 90 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const fuelLogs = vehicle.fuelLog.filter(log => new Date(log.date) >= startDate);
    
    const totalLiters = fuelLogs.reduce((sum, log) => sum + (log.quantity || 0), 0);
    const totalCost = fuelLogs.reduce((sum, log) => sum + (log.cost || 0), 0);
    
    return {
      period,
      logsCount: fuelLogs.length,
      totalLiters,
      totalCost,
      averageCostPerLiter: totalLiters > 0 ? totalCost / totalLiters : 0,
    };
  }
  
  // ============ Statistics ============
  
  /**
   * Get fleet statistics
   */
  async getFleetStatistics(tenantId) {
    const filter = tenantId ? { tenantId } : {};
    
    const [total, byRegion, byType, expiring, violationsPending] = await Promise.all([
      this.Vehicle.countDocuments(filter),
      this.Vehicle.aggregate([
        { $match: filter },
        { $group: { _id: '$plate.region', count: { $sum: 1 } } },
      ]),
      this.Vehicle.aggregate([
        { $match: filter },
        { $group: { _id: '$plate.plateType', count: { $sum: 1 } } },
      ]),
      this.getExpiringDocuments(30),
      this.Vehicle.aggregate([
        { $match: filter },
        { $unwind: '$violations' },
        { $match: { 'violations.status': 'pending' } },
        { $count: 'total' },
      ]),
    ]);
    
    return {
      totalVehicles: total,
      byRegion: byRegion.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      byType: byType.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      expiringDocuments: {
        istimara: expiring.istimara.length,
        fahas: expiring.fahas.length,
        insurance: expiring.insurance.length,
      },
      pendingViolations: violationsPending[0]?.total || 0,
    };
  }
}

// Singleton
const saudiVehicleService = new SaudiVehicleService();

module.exports = {
  SaudiVehicleService,
  saudiVehicleService,
  saudiConfig,
};