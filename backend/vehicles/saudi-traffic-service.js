/**
 * Saudi Traffic Service - خدمة المرور السعودية الشاملة
 * Comprehensive Traffic Management for Saudi Arabia
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');

/**
 * Saudi Traffic Configuration
 */
const trafficConfig = {
  // أنواع رخص القيادة
  licenseTypes: {
    private: { label: 'خاصة', code: 'P', minAge: 18, validityYears: 10 },
    public: { label: 'عمومي', code: 'PB', minAge: 21, validityYears: 5 },
    motorcycle: { label: 'دراجة نارية', code: 'M', minAge: 18, validityYears: 5 },
    heavy: { label: 'مركبة ثقيلة', code: 'H', minAge: 21, validityYears: 5 },
    construction: { label: 'معدات إنشائية', code: 'C', minAge: 21, validityYears: 5 },
    public_transport: { label: 'نقل عام', code: 'PT', minAge: 25, validityYears: 5 },
  },
  
  // حالات الرخصة
  licenseStatuses: {
    valid: { label: 'سارية', color: 'green' },
    expired: { label: 'منتهية', color: 'red' },
    suspended: { label: 'موقوفة', color: 'yellow' },
    revoked: { label: 'ملغاة', color: 'black' },
    under_review: { label: 'قيد المراجعة', color: 'blue' },
  },
  
  // أنواع المخالفات
  violationTypes: {
    speeding: { label: 'تجاوز السرعة', code: 'SPD', fineRange: [300, 3000] },
    red_light: { label: 'تجاوز الإشارة الحمراء', code: 'RED', fineRange: [3000, 6000] },
    parking: { label: 'مخالفة وقوف', code: 'PRK', fineRange: [100, 500] },
    no_license: { label: 'قيادة بدون رخصة', code: 'NLC', fineRange: [500, 1000] },
    expired_license: { label: 'رخصة منتهية', code: 'ELC', fineRange: [300, 500] },
    no_insurance: { label: 'عدم وجود تأمين', code: 'NIN', fineRange: [300, 500] },
    seat_belt: { label: 'عدم ربط الحزام', code: 'SBT', fineRange: [150, 300] },
    phone: { label: 'استخدام الهاتف', code: 'PHN', fineRange: [500, 1000] },
    wrong_way: { label: 'سير عكس الاتجاه', code: 'WWY', fineRange: [3000, 6000] },
    drifting: { label: 'تفحيط', code: 'DRF', fineRange: [5000, 10000] },
    drunk_driving: { label: 'القيادة تحت التأثير', code: 'DRK', fineRange: [10000, 50000] },
    hit_and_run: { label: 'هروب من موقع الحادث', code: 'HNR', fineRange: [5000, 15000] },
  },
  
  // نقاط المخالفات
  violationPoints: {
    minor: { label: 'مخالفة بسيطة', points: 0 },
    moderate: { label: 'مخالفة متوسطة', points: 2 },
    major: { label: 'مخالفة كبيرة', points: 4 },
    severe: { label: 'مخالفة جسيمة', points: 6 },
    critical: { label: 'مخالفة خطيرة', points: 12 },
  },
  
  // مراكز الفحص المعتمدة
  inspectionCenters: {
   _mvpi: { label: 'القيادة', type: 'private' },
    suwaiket: { label: 'سويكت', type: 'private' },
    mahboub: { label: 'محبوب', type: 'private' },
    haji: { label: 'الحاج', type: 'private' },
    aldawaa: { label: 'الدواء', type: 'private' },
  },
  
  // حالات الحوادث
  accidentStatuses: {
    pending: { label: 'قيد المراجعة', color: 'yellow' },
    investigating: { label: 'قيد التحقيق', color: 'blue' },
    resolved: { label: 'تم الحل', color: 'green' },
    disputed: { label: 'متنازع عليه', color: 'red' },
  },
};

/**
 * Driver License Schema - رخصة القيادة
 */
const DriverLicenseSchema = new mongoose.Schema({
  // معلومات السائق
  driver: {
    nationalId: { type: String, required: true, unique: true },
    nameAr: String,
    nameEn: String,
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female'] },
    nationality: String,
    mobile: String,
    email: String,
    address: String,
    city: String,
    photo: String,
  },
  
  // معلومات الرخصة
  license: {
    number: { type: String, unique: true },
    type: { type: String, enum: Object.keys(trafficConfig.licenseTypes) },
    status: { type: String, enum: Object.keys(trafficConfig.licenseStatuses), default: 'valid' },
    issueDate: Date,
    expiryDate: Date,
    firstIssueDate: Date,
    issuingAuthority: String,
    restrictions: [String], // قيود مثل: نظارة، سماعات
    endorsements: [{ type: String, issueDate: Date }], // شهادات إضافية
  },
  
  // النقاط
  points: {
    current: { type: Number, default: 0 },
    max: { type: Number, default: 24 },
    history: [{
      date: Date,
      points: Number,
      reason: String,
      violationId: String,
    }],
    lastReset: Date,
  },
  
  // الحوادث
  accidentRecord: {
    total: { type: Number, default: 0 },
    atFault: { type: Number, default: 0 },
    lastAccident: Date,
  },
  
  // سجل المخالفات
  violationsCount: { type: Number, default: 0 },
  pendingFines: { type: Number, default: 0 },
  
  // الاختبارات
  tests: {
    medical: {
      passed: Boolean,
      date: Date,
      expiryDate: Date,
      notes: String,
    },
    theoretical: {
      passed: Boolean,
      date: Date,
      score: Number,
      attempts: { type: Number, default: 0 },
    },
    practical: {
      passed: Boolean,
      date: Date,
      attempts: { type: Number, default: 0 },
    },
  },
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'driver_licenses',
});

// Indexes
DriverLicenseSchema.index({ 'driver.nationalId': 1 });
DriverLicenseSchema.index({ 'license.number': 1 });
DriverLicenseSchema.index({ 'license.expiryDate': 1 });

/**
 * Traffic Violation Schema - المخالفات المرورية
 */
const TrafficViolationSchema = new mongoose.Schema({
  // معرف المخالفة
  violationId: { type: String, unique: true },
  
  // السائق والمركبة
  driver: {
    nationalId: String,
    name: String,
    licenseNumber: String,
  },
  vehicle: {
    plateNumber: String,
    plateLetters: String,
    region: String,
  },
  
  // تفاصيل المخالفة
  details: {
    type: { type: String, enum: Object.keys(trafficConfig.violationTypes) },
    code: String,
    description: String,
    severity: { type: String, enum: Object.keys(trafficConfig.violationPoints) },
    points: Number,
    location: {
      road: String,
      city: String,
      coordinates: { lat: Number, lng: Number },
    },
    dateTime: Date,
    speed: {
      recorded: Number,
      limit: Number,
    },
  },
  
  // القيمة المالية
  fine: {
    amount: Number,
    currency: { type: String, default: 'SAR' },
    paid: { type: Boolean, default: false },
    paymentDate: Date,
    paymentMethod: String,
    paymentReference: String,
  },
  
  // المصدر
  source: {
    type: { type: String, enum: ['saher', 'police', 'manual'] },
    deviceId: String,
    capturedImage: String,
    reportedBy: String,
  },
  
  // الحالة
  status: {
    type: String,
    enum: ['pending', 'paid', 'disputed', 'waived', 'court'],
    default: 'pending',
  },
  
  // الاعتراض
  dispute: {
    submitted: { type: Boolean, default: false },
    date: Date,
    reason: String,
    documents: [String],
    status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    reviewedBy: String,
    reviewedAt: Date,
    notes: String,
  },
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'traffic_violations',
});

// Indexes
TrafficViolationSchema.index({ violationId: 1 });
TrafficViolationSchema.index({ 'driver.nationalId': 1 });
TrafficViolationSchema.index({ 'vehicle.plateNumber': 1 });
TrafficViolationSchema.index({ 'details.dateTime': 1 });

/**
 * Traffic Accident Schema - الحوادث المرورية
 */
const TrafficAccidentSchema = new mongoose.Schema({
  // معرف الحادث
  accidentId: { type: String, unique: true },
  accidentNumber: String,
  
  // الموقع والتاريخ
  location: {
    road: String,
    city: String,
    region: String,
    coordinates: { lat: Number, lng: Number },
    landmark: String,
  },
  dateTime: Date,
  
  // الظروف
  circumstances: {
    weather: { type: String, enum: ['clear', 'cloudy', 'rain', 'fog', 'dust'] },
    roadCondition: { type: String, enum: ['dry', 'wet', 'sandy', 'damaged'] },
    lighting: { type: String, enum: ['daylight', 'night_lit', 'night_unlit', 'dawn_dusk'] },
    trafficCondition: { type: String, enum: ['light', 'moderate', 'heavy', 'congested'] },
  },
  
  // المركبات المتضررة
  vehicles: [{
    plateNumber: String,
    plateLetters: String,
    region: String,
    ownerName: String,
    driverName: String,
    driverNationalId: String,
    damage: {
      severity: { type: String, enum: ['minor', 'moderate', 'severe', 'total'] },
      description: String,
      estimatedCost: Number,
      photos: [String],
    },
    insurance: {
      company: String,
      policyNumber: String,
      claimNumber: String,
    },
    atFault: Boolean,
    faultPercentage: Number,
  }],
  
  // المصابين
  injuries: [{
    personType: { type: String, enum: ['driver', 'passenger', 'pedestrian'] },
    name: String,
    nationalId: String,
    severity: { type: String, enum: ['minor', 'moderate', 'severe', 'fatal'] },
    hospital: String,
    notes: String,
  }],
  
  // رجال المرور
  police: {
    officerName: String,
    officerId: String,
    station: String,
    reportNumber: String,
    arrivalTime: Date,
  },
  
  // التقرير
  report: {
    cause: String,
    description: String,
    diagram: String, // رسم توضيحي
    photos: [String],
    witnessStatements: [{
      witnessName: String,
      statement: String,
      date: Date,
    }],
  },
  
  // الحالة
  status: {
    type: String,
    enum: Object.keys(trafficConfig.accidentStatuses),
    default: 'pending',
  },
  
  // الحل
  resolution: {
    type: { type: String, enum: ['amicable', 'police', 'insurance', 'court'] },
    date: Date,
    details: String,
    totalCompensation: Number,
  },
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'traffic_accidents',
});

/**
 * Saudi Traffic Service Class
 */
class SaudiTrafficService extends EventEmitter {
  constructor() {
    super();
    this.DriverLicense = null;
    this.TrafficViolation = null;
    this.TrafficAccident = null;
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.DriverLicense = connection.model('DriverLicense', DriverLicenseSchema);
    this.TrafficViolation = connection.model('TrafficViolation', TrafficViolationSchema);
    this.TrafficAccident = connection.model('TrafficAccident', TrafficAccidentSchema);
    console.log('✅ Saudi Traffic Service initialized');
  }
  
  // ============ Driver License ============
  
  /**
   * Create driver license
   */
  async createLicense(data) {
    const licenseNumber = await this.generateLicenseNumber(data.driver.nationalId);
    
    const license = await this.DriverLicense.create({
      ...data,
      'license.number': licenseNumber,
    });
    
    this.emit('license:created', license);
    return license;
  }
  
  /**
   * Generate license number
   */
  async generateLicenseNumber(nationalId) {
    const last4 = nationalId.slice(-4);
    const timestamp = Date.now().toString().slice(-6);
    return `KSA-DL-${last4}-${timestamp}`;
  }
  
  /**
   * Get license by national ID
   */
  async getLicenseByNationalId(nationalId) {
    return this.DriverLicense.findOne({ 'driver.nationalId': nationalId });
  }
  
  /**
   * Get license by number
   */
  async getLicenseByNumber(licenseNumber) {
    return this.DriverLicense.findOne({ 'license.number': licenseNumber });
  }
  
  /**
   * Renew license
   */
  async renewLicense(licenseId, renewalData) {
    const license = await this.DriverLicense.findById(licenseId);
    if (!license) throw new Error('License not found');
    
    const typeConfig = trafficConfig.licenseTypes[license.license.type];
    const newExpiry = new Date();
    newExpiry.setFullYear(newExpiry.getFullYear() + typeConfig.validityYears);
    
    license.license.expiryDate = newExpiry;
    license.license.issueDate = new Date();
    license.license.status = 'valid';
    
    await license.save();
    this.emit('license:renewed', license);
    
    return license;
  }
  
  /**
   * Get expiring licenses
   */
  async getExpiringLicenses(days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return this.DriverLicense.find({
      'license.expiryDate': { $lte: futureDate, $gte: new Date() },
      'license.status': 'valid',
    });
  }
  
  /**
   * Add points to license
   */
  async addPoints(nationalId, points, reason, violationId) {
    const license = await this.DriverLicense.findOne({ 'driver.nationalId': nationalId });
    if (!license) throw new Error('License not found');
    
    license.points.current += points;
    license.points.history.push({
      date: new Date(),
      points,
      reason,
      violationId,
    });
    
    // Check for suspension (24 points)
    if (license.points.current >= license.points.max) {
      license.license.status = 'suspended';
      this.emit('license:suspended', license);
    }
    
    await license.save();
    return license;
  }
  
  // ============ Violations ============
  
  /**
   * Create violation
   */
  async createViolation(data) {
    const violationId = `SAHER-${Date.now()}`;
    const violationType = trafficConfig.violationTypes[data.details.type];
    
    const violation = await this.TrafficViolation.create({
      ...data,
      violationId,
      'details.code': violationType?.code,
    });
    
    // Add points if applicable
    if (data.driver?.nationalId && data.details.points > 0) {
      await this.addPoints(
        data.driver.nationalId,
        data.details.points,
        data.details.description,
        violationId
      );
    }
    
    this.emit('violation:created', violation);
    return violation;
  }
  
  /**
   * Pay violation
   */
  async payViolation(violationId, paymentData) {
    const violation = await this.TrafficViolation.findOne({ violationId });
    if (!violation) throw new Error('Violation not found');
    
    violation.fine.paid = true;
    violation.fine.paymentDate = new Date();
    violation.fine.paymentMethod = paymentData.method;
    violation.fine.paymentReference = paymentData.reference;
    violation.status = 'paid';
    
    await violation.save();
    this.emit('violation:paid', violation);
    
    return violation;
  }
  
  /**
   * Submit dispute
   */
  async submitDispute(violationId, disputeData) {
    const violation = await this.TrafficViolation.findOne({ violationId });
    if (!violation) throw new Error('Violation not found');
    
    violation.dispute = {
      submitted: true,
      date: new Date(),
      reason: disputeData.reason,
      documents: disputeData.documents || [],
      status: 'pending',
    };
    violation.status = 'disputed';
    
    await violation.save();
    return violation;
  }
  
  /**
   * Get violations by driver
   */
  async getViolationsByDriver(nationalId) {
    return this.TrafficViolation.find({ 'driver.nationalId': nationalId })
      .sort({ 'details.dateTime': -1 });
  }
  
  /**
   * Get violations by vehicle
   */
  async getViolationsByVehicle(plateNumber, plateLetters) {
    return this.TrafficViolation.find({
      'vehicle.plateNumber': plateNumber,
      'vehicle.plateLetters': plateLetters,
    }).sort({ 'details.dateTime': -1 });
  }
  
  // ============ Accidents ============
  
  /**
   * Create accident
   */
  async createAccident(data) {
    const accidentId = `ACC-${Date.now()}`;
    
    const accident = await this.TrafficAccident.create({
      ...data,
      accidentId,
    });
    
    this.emit('accident:created', accident);
    return accident;
  }
  
  /**
   * Get accident
   */
  async getAccident(accidentId) {
    return this.TrafficAccident.findOne({ accidentId });
  }
  
  /**
   * Update accident status
   */
  async updateAccidentStatus(accidentId, status, resolution = null) {
    const update = {
      status,
      updatedAt: new Date(),
    };
    
    if (resolution) {
      update.resolution = resolution;
    }
    
    const accident = await this.TrafficAccident.findOneAndUpdate(
      { accidentId },
      update,
      { new: true }
    );
    
    this.emit('accident:updated', accident);
    return accident;
  }
  
  /**
   * Get accidents by vehicle
   */
  async getAccidentsByVehicle(plateNumber) {
    return this.TrafficAccident.find({
      'vehicles.plateNumber': plateNumber,
    }).sort({ dateTime: -1 });
  }
  
  // ============ Statistics ============
  
  /**
   * Get traffic statistics
   */
  async getTrafficStatistics(tenantId) {
    const filter = tenantId ? { tenantId } : {};
    
    const [
      totalLicenses,
      activeLicenses,
      expiringLicenses,
      suspendedLicenses,
      totalViolations,
      unpaidFines,
      pendingDisputes,
      totalAccidents,
      pendingAccidents,
    ] = await Promise.all([
      this.DriverLicense.countDocuments(filter),
      this.DriverLicense.countDocuments({ ...filter, 'license.status': 'valid' }),
      (await this.getExpiringLicenses(30)).length,
      this.DriverLicense.countDocuments({ ...filter, 'license.status': 'suspended' }),
      this.TrafficViolation.countDocuments(filter),
      this.TrafficViolation.aggregate([
        { $match: { ...filter, 'fine.paid': false } },
        { $group: { _id: null, total: { $sum: '$fine.amount' }, count: { $sum: 1 } } },
      ]),
      this.TrafficViolation.countDocuments({ ...filter, 'dispute.status': 'pending' }),
      this.TrafficAccident.countDocuments(filter),
      this.TrafficAccident.countDocuments({ ...filter, status: 'pending' }),
    ]);
    
    return {
      licenses: {
        total: totalLicenses,
        active: activeLicenses,
        expiringIn30Days: expiringLicenses,
        suspended: suspendedLicenses,
      },
      violations: {
        total: totalViolations,
        unpaidCount: unpaidFines[0]?.count || 0,
        unpaidAmount: unpaidFines[0]?.total || 0,
        pendingDisputes,
      },
      accidents: {
        total: totalAccidents,
        pending: pendingAccidents,
      },
    };
  }
}

// Singleton
const saudiTrafficService = new SaudiTrafficService();

module.exports = {
  SaudiTrafficService,
  saudiTrafficService,
  trafficConfig,
};