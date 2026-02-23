/**
 * Vehicle Management Service - خدمة إدارة المركبات
 * Comprehensive Fleet & Vehicle Management System
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');

/**
 * Vehicle Configuration
 */
const vehicleConfig = {
  // Vehicle types
  types: {
    sedan: { label: 'سيدان', wheels: 4 },
    suv: { label: 'دفع رباعي', wheels: 4 },
    pickup: { label: 'بيك أب', wheels: 4 },
    van: { label: 'فان', wheels: 4 },
    truck: { label: 'شاحنة', wheels: 6 },
    bus: { label: 'حافلة', wheels: 6 },
    motorcycle: { label: 'دراجة نارية', wheels: 2 },
    heavy_equipment: { label: 'معدات ثقيلة', wheels: 8 },
  },
  
  // Vehicle status
  statuses: {
    available: { label: 'متاح', color: 'green' },
    in_use: { label: 'قيد الاستخدام', color: 'blue' },
    maintenance: { label: 'صيانة', color: 'yellow' },
    out_of_service: { label: 'خارج الخدمة', color: 'red' },
    reserved: { label: 'محجوز', color: 'orange' },
  },
  
  // Fuel types
  fuelTypes: {
    petrol: 'بنزين',
    diesel: 'ديزل',
    electric: 'كهربائي',
    hybrid: 'هايبريد',
    gas: 'غاز',
  },
  
  // Maintenance types
  maintenanceTypes: {
    routine: 'صيانة دورية',
    repair: 'إصلاح',
    emergency: 'طوارئ',
    inspection: 'فحص',
    tire_change: 'تغيير إطارات',
    oil_change: 'تغيير زيت',
  },
  
  // Trip purposes
  tripPurposes: {
    official: 'عمل رسمي',
    delivery: 'توصيل',
    meeting: 'اجتماع',
    transfer: 'نقل',
    other: 'أخرى',
  },
};

/**
 * Vehicle Schema
 */
const VehicleSchema = new mongoose.Schema({
  // Basic info
  plateNumber: { type: String, required: true, unique: true },
  serialNumber: String,
  
  // Vehicle details
  make: { type: String, required: true }, // Toyota, Ford, etc.
  model: { type: String, required: true },
  year: Number,
  color: String,
  
  // Type and status
  type: { type: String, enum: Object.keys(vehicleConfig.types), default: 'sedan' },
  status: { type: String, enum: Object.keys(vehicleConfig.statuses), default: 'available' },
  
  // Registration
  registration: {
    number: String,
    issueDate: Date,
    expiryDate: Date,
    issuingAuthority: String,
  },
  
  // Insurance
  insurance: {
    provider: String,
    policyNumber: String,
    startDate: Date,
    endDate: Date,
    type: String,
    coverage: String,
  },
  
  // Technical specs
  specs: {
    engineCapacity: Number, // cc
    horsePower: Number,
    fuelType: { type: String, enum: Object.keys(vehicleConfig.fuelTypes) },
    transmission: { type: String, enum: ['manual', 'automatic'] },
    seatingCapacity: Number,
    fuelTankCapacity: Number, // liters
  },
  
  // Odometer
  odometer: {
    current: { type: Number, default: 0 },
    lastUpdated: Date,
    unit: { type: String, enum: ['km', 'miles'], default: 'km' },
  },
  
  // Fuel tracking
  fuel: {
    currentLevel: { type: Number, min: 0, max: 100, default: 100 }, // percentage
    averageConsumption: Number, // liters/100km
    lastRefuel: {
      date: Date,
      amount: Number,
      cost: Number,
      odometer: Number,
    },
  },
  
  // Assignment
  assignment: {
    currentDriver: {
      userId: String,
      name: String,
      assignedAt: Date,
    },
    department: String,
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    location: {
      name: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
  },
  
  // Documents
  documents: [{
    type: String,
    name: String,
    filePath: String,
    expiryDate: Date,
    uploadedAt: Date,
  }],
  
  // Maintenance schedule
  maintenanceSchedule: {
    lastService: Date,
    nextService: Date,
    serviceInterval: Number, // km
    lastOilChange: Date,
    lastTireChange: Date,
  },
  
  // Costs
  costs: {
    purchasePrice: Number,
    currentValue: Number,
    purchaseDate: Date,
    depreciationRate: Number,
    totalMaintenanceCost: { type: Number, default: 0 },
    totalFuelCost: { type: Number, default: 0 },
  },
  
  // Images
  images: [{
    type: String,
    url: String,
    uploadedAt: Date,
  }],
  
  // Notes
  notes: String,
  
  // Custom fields
  customFields: mongoose.Schema.Types.Mixed,
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  createdBy: String,
}, {
  collection: 'vehicles',
});

// Indexes
VehicleSchema.index({ plateNumber: 1 });
VehicleSchema.index({ status: 1 });
VehicleSchema.index({ 'assignment.currentDriver.userId': 1 });

/**
 * Vehicle Trip Schema
 */
const VehicleTripSchema = new mongoose.Schema({
  // Vehicle
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  
  // Driver
  driver: {
    userId: { type: String, required: true },
    name: String,
    licenseNumber: String,
  },
  
  // Trip info
  tripNumber: { type: String, unique: true },
  purpose: { type: String, enum: Object.keys(vehicleConfig.tripPurposes) },
  
  // Route
  route: {
    startLocation: {
      name: String,
      coordinates: { latitude: Number, longitude: Number },
    },
    endLocation: {
      name: String,
      coordinates: { latitude: Number, longitude: Number },
    },
    waypoints: [{
      name: String,
      coordinates: { latitude: Number, longitude: Number },
      arrivedAt: Date,
    }],
  },
  
  // Times
  schedule: {
    plannedStart: Date,
    plannedEnd: Date,
    actualStart: Date,
    actualEnd: Date,
  },
  
  // Distance
  distance: {
    planned: Number, // km
    actual: Number, // km
    startOdometer: Number,
    endOdometer: Number,
  },
  
  // Fuel
  fuel: {
    startLevel: Number, // percentage
    endLevel: Number,
    consumed: Number, // liters
    refueled: Number, // liters
    fuelCost: Number,
  },
  
  // Passengers
  passengers: [{
    userId: String,
    name: String,
    pickup: String,
    dropoff: String,
  }],
  
  // Status
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  
  // Notes
  notes: String,
  
  // Approval
  approvedBy: {
    userId: String,
    name: String,
    approvedAt: Date,
  },
  
  // Creator
  createdBy: String,
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'vehicle_trips',
});

// Indexes
VehicleTripSchema.index({ vehicleId: 1, 'schedule.plannedStart': 1 });
VehicleTripSchema.index({ 'driver.userId': 1 });

/**
 * Vehicle Maintenance Schema
 */
const VehicleMaintenanceSchema = new mongoose.Schema({
  // Vehicle
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  
  // Maintenance info
  maintenanceNumber: { type: String, unique: true },
  type: { type: String, enum: Object.keys(vehicleConfig.maintenanceTypes), required: true },
  
  // Details
  title: { type: String, required: true },
  description: String,
  
  // Status
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  
  // Dates
  schedule: {
    plannedDate: Date,
    actualDate: Date,
    completedDate: Date,
  },
  
  // Workshop
  workshop: {
    name: String,
    contact: String,
    address: String,
  },
  
  // Costs
  costs: {
    labor: { type: Number, default: 0 },
    parts: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
  },
  
  // Odometer at maintenance
  odometer: Number,
  
  // Parts used
  parts: [{
    name: String,
    quantity: Number,
    unitCost: Number,
    totalCost: Number,
  }],
  
  // Technician
  technician: {
    name: String,
    contact: String,
  },
  
  // Documents
  documents: [{
    type: String,
    name: String,
    filePath: String,
  }],
  
  // Next service
  nextService: {
    date: Date,
    odometer: Number,
  },
  
  // Notes
  notes: String,
  
  // Creator
  createdBy: String,
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'vehicle_maintenance',
});

/**
 * Fuel Log Schema
 */
const FuelLogSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  
  // Fuel details
  fuelType: String,
  quantity: { type: Number, required: true }, // liters
  pricePerLiter: Number,
  totalCost: { type: Number, required: true },
  
  // Odometer
  odometer: { type: Number, required: true },
  
  // Station
  station: {
    name: String,
    location: String,
  },
  
  // Driver
  driver: {
    userId: String,
    name: String,
  },
  
  // Payment
  paymentMethod: { type: String, enum: ['cash', 'card', 'fleet_card', 'voucher'] },
  
  // Receipt
  receiptNumber: String,
  receiptImage: String,
  
  // Tenant
  tenantId: String,
  
  // Timestamp
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'vehicle_fuel_logs',
});

// Indexes
FuelLogSchema.index({ vehicleId: 1, date: -1 });

/**
 * Vehicle Management Service Class
 */
class VehicleManagementService extends EventEmitter {
  constructor() {
    super();
    this.Vehicle = null;
    this.VehicleTrip = null;
    this.VehicleMaintenance = null;
    this.FuelLog = null;
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.Vehicle = connection.model('Vehicle', VehicleSchema);
    this.VehicleTrip = connection.model('VehicleTrip', VehicleTripSchema);
    this.VehicleMaintenance = connection.model('VehicleMaintenance', VehicleMaintenanceSchema);
    this.FuelLog = connection.model('FuelLog', FuelLogSchema);
    
    console.log('✅ Vehicle Management Service initialized');
  }
  
  // ============ Vehicles ============
  
  /**
   * Create vehicle
   */
  async createVehicle(data) {
    const vehicle = await this.Vehicle.create({
      ...data,
      createdBy: data.userId,
    });
    
    this.emit('vehicle:created', vehicle);
    
    return vehicle;
  }
  
  /**
   * Get vehicle by ID
   */
  async getVehicle(vehicleId) {
    return this.Vehicle.findById(vehicleId)
      .populate('assignment.branch');
  }
  
  /**
   * Get vehicle by plate number
   */
  async getVehicleByPlate(plateNumber) {
    return this.Vehicle.findOne({ plateNumber });
  }
  
  /**
   * Update vehicle
   */
  async updateVehicle(vehicleId, updates, userId) {
    const vehicle = await this.Vehicle.findByIdAndUpdate(
      vehicleId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    this.emit('vehicle:updated', vehicle);
    
    return vehicle;
  }
  
  /**
   * Update vehicle status
   */
  async updateVehicleStatus(vehicleId, status, userId, reason = '') {
    const vehicle = await this.Vehicle.findByIdAndUpdate(
      vehicleId,
      { status, updatedAt: new Date() },
      { new: true }
    );
    
    this.emit('vehicle:status_changed', { vehicle, status, reason });
    
    return vehicle;
  }
  
  /**
   * Get all vehicles
   */
  async getVehicles(options = {}) {
    const filter = {};
    
    if (options.status) filter.status = options.status;
    if (options.type) filter.type = options.type;
    if (options.branch) filter['assignment.branch'] = options.branch;
    if (options.department) filter['assignment.department'] = options.department;
    if (options.tenantId) filter.tenantId = options.tenantId;
    
    return this.Vehicle.find(filter)
      .populate('assignment.branch')
      .sort(options.sort || { createdAt: -1 })
      .limit(options.limit || 100);
  }
  
  /**
   * Get available vehicles
   */
  async getAvailableVehicles(options = {}) {
    const filter = { status: 'available' };
    if (options.type) filter.type = options.type;
    if (options.branch) filter['assignment.branch'] = options.branch;
    if (options.tenantId) filter.tenantId = options.tenantId;
    
    return this.Vehicle.find(filter)
      .populate('assignment.branch');
  }
  
  /**
   * Assign driver to vehicle
   */
  async assignDriver(vehicleId, driverData, userId) {
    const vehicle = await this.Vehicle.findByIdAndUpdate(
      vehicleId,
      {
        'assignment.currentDriver': {
          ...driverData,
          assignedAt: new Date(),
        },
        updatedAt: new Date(),
      },
      { new: true }
    );
    
    this.emit('vehicle:driver_assigned', { vehicle, driver: driverData });
    
    return vehicle;
  }
  
  /**
   * Release driver from vehicle
   */
  async releaseDriver(vehicleId, userId) {
    const vehicle = await this.Vehicle.findByIdAndUpdate(
      vehicleId,
      {
        'assignment.currentDriver': null,
        status: 'available',
        updatedAt: new Date(),
      },
      { new: true }
    );
    
    this.emit('vehicle:driver_released', vehicle);
    
    return vehicle;
  }
  
  /**
   * Update odometer
   */
  async updateOdometer(vehicleId, newReading, userId) {
    const vehicle = await this.Vehicle.findByIdAndUpdate(
      vehicleId,
      {
        'odometer.current': newReading,
        'odometer.lastUpdated': new Date(),
        updatedAt: new Date(),
      },
