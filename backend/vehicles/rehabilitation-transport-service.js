/**
 * Rehabilitation Center Transport Service - خدمة نقل مراكز التأهيل
 * AI-Powered Transport Management for Disability Rehabilitation Centers
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');

/**
 * Saudi National Address Configuration - العنوان الوطني السعودي
 */
const nationalAddressConfig = {
  // المناطق
  regions: {
    riyadh: { code: '01', label: 'الرياض' },
    makkah: { code: '02', label: 'مكة المكرمة' },
    madinah: { code: '03', label: 'المدينة المنورة' },
    eastern: { code: '04', label: 'المنطقة الشرقية' },
    qassim: { code: '05', label: 'القصيم' },
    aseer: { code: '06', label: 'عسير' },
    tabuk: { code: '07', label: 'تبوك' },
    hail: { code: '08', label: 'حائل' },
    northern: { code: '09', label: 'الحدود الشمالية' },
    jazan: { code: '10', label: 'جازان' },
    najran: { code: '11', label: 'نجران' },
    bahah: { code: '12', label: 'الباحة' },
    jawf: { code: '13', label: 'الجوف' },
  },
  
  // فترات الدوام
  shifts: {
    morning: {
      label: 'الفترة الصباحية',
      startTime: '07:00',
      endTime: '12:00',
      code: 'AM',
    },
    evening: {
      label: 'الفترة المسائية',
      startTime: '13:00',
      endTime: '18:00',
      code: 'PM',
    },
  },
  
  // أنواع الإعاقة
  disabilityTypes: {
    physical: { label: 'إعاقة حركية', requiresWheelchair: true },
    visual: { label: 'إعاقة بصرية', requiresGuide: true },
    hearing: { label: 'إعاقة سمعية', requiresSignLanguage: true },
    intellectual: { label: 'إعاقة ذهنية', requiresCompanion: true },
    autism: { label: 'توحد', requiresSpecialCare: true },
    multiple: { label: 'إعاقات متعددة', requiresMultipleSupport: true },
  },
  
  // أنواع المركبات المتخصصة
  vehicleTypes: {
    wheelchair_accessible: { label: 'مجهزة للكراسي المتحركة', capacity: 8, code: 'WC' },
    standard: { label: 'قياسية', capacity: 14, code: 'STD' },
    minivan: { label: 'ميني فان', capacity: 6, code: 'MV' },
    specialized: { label: 'مخصصة', capacity: 4, code: 'SP' },
  },
};

/**
 * Beneficiary Schema - المستفيد
 */
const BeneficiarySchema = new mongoose.Schema({
  // معلومات أساسية
  beneficiaryId: { type: String, unique: true },
  
  // البيانات الشخصية
  personal: {
    firstNameAr: String,
    lastNameAr: String,
    firstNameEn: String,
    lastNameEn: String,
    nationalId: { type: String, unique: true },
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female'] },
    photo: String,
  },
  
  // العنوان الوطني السعودي
  nationalAddress: {
    region: { type: String, enum: Object.keys(nationalAddressConfig.regions) },
    regionCode: String,
    city: String,
    district: String,
    streetName: String,
    buildingNumber: String,
    postalCode: String,
    additionalNumber: String, // الرقم الإضافي
    unitNumber: String,
    coordinates: { lat: Number, lng: Number },
    googleMapsUrl: String,
    plusCode: String, // Google Plus Code
    // العنوان الكامل منظم
    formattedAddress: String,
  },
  
  // معلومات الإعاقة
  disability: {
    type: [{ type: String, enum: Object.keys(nationalAddressConfig.disabilityTypes) }],
    severity: { type: String, enum: ['mild', 'moderate', 'severe', 'profound'] },
    requiresWheelchair: { type: Boolean, default: false },
    requiresCompanion: { type: Boolean, default: false },
    requiresMedicalEquipment: { type: Boolean, default: false },
    medicalEquipment: [String],
    mobilityLevel: { type: String, enum: ['independent', 'assisted', 'dependent'] },
    specialInstructions: String,
  },
  
  // مركز التأهيل والفرع
  center: {
    centerId: String,
    centerName: String,
    branchId: String,
    branchName: String,
    branchRegion: String,
    programId: String,
    programName: String,
  },
  
  // فترة الدوام
  shift: {
    type: { type: String, enum: Object.keys(nationalAddressConfig.shifts) },
    days: [{ type: String, enum: ['sun', 'mon', 'tue', 'wed', 'thu'] }],
    startTime: String,
    endTime: String,
  },
  
  // ولي الأمر/المرافق
  guardian: {
    name: String,
    relation: String,
    nationalId: String,
    mobile: String,
    alternativeMobile: String,
    email: String,
  },
  
  // نقطة التوصيل
  pickup: {
    vehicleId: String,
    vehicleNumber: String,
    routeId: String,
    routeName: String,
    stopOrder: Number,
    pickupTime: String,
    dropoffTime: String,
    distance: Number, // km from center
    estimatedDuration: Number, // minutes
  },
  
  // الحضور
  attendance: {
    todayStatus: { type: String, enum: ['present', 'absent', 'late', 'excused', 'noshow'] },
    lastPickup: Date,
    lastDropoff: Date,
    monthlyStats: {
      present: { type: Number, default: 0 },
      absent: { type: Number, default: 0 },
      late: { type: Number, default: 0 },
      excused: { type: Number, default: 0 },
    },
  },
  
  // الاشتراك
  subscription: {
    active: { type: Boolean, default: true },
    startDate: Date,
    endDate: Date,
    transportFee: Number,
    paid: { type: Boolean, default: false },
    paymentType: { type: String, enum: ['monthly', 'quarterly', 'yearly', 'free'] },
  },
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'rehabilitation_beneficiaries',
});

// Indexes for geospatial queries
BeneficiarySchema.index({ 'nationalAddress.coordinates': '2dsphere' });
BeneficiarySchema.index({ 'center.branchId': 1 });
BeneficiarySchema.index({ 'shift.type': 1 });

/**
 * Rehabilitation Branch Schema - فرع مركز التأهيل
 */
const RehabilitationBranchSchema = new mongoose.Schema({
  branchId: { type: String, unique: true },
  
  // معلومات الفرع
  info: {
    name: String,
    centerId: String,
    centerName: String,
    type: { type: String, enum: ['main', 'branch'] },
  },
  
  // العنوان الوطني
  address: {
    region: String,
    city: String,
    district: String,
    streetName: String,
    buildingNumber: String,
    postalCode: String,
    coordinates: { lat: Number, lng: Number },
  },
  
  // ساعات العمل
  workingHours: {
    morningShift: {
      enabled: { type: Boolean, default: true },
      startTime: String,
      endTime: String,
    },
    eveningShift: {
      enabled: { type: Boolean, default: true },
      startTime: String,
      endTime: String,
    },
    workingDays: [{ type: String, enum: ['sun', 'mon', 'tue', 'wed', 'thu'] }],
  },
  
  // السعة
  capacity: {
    morningShift: Number,
    eveningShift: Number,
    totalBeneficiaries: Number,
  },
  
  // الحالة
  active: { type: Boolean, default: true },
  
  // Tenant
  tenantId: String,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'rehabilitation_branches',
});

/**
 * Transport Route Schema - مسار النقل (محسن بالذكاء الاصطناعي)
 */
const TransportRouteSchema = new mongoose.Schema({
  routeId: { type: String, unique: true },
  
  // معلومات المسار
  info: {
    name: String,
    branchId: String,
    branchName: String,
    shiftType: { type: String, enum: Object.keys(nationalAddressConfig.shifts) },
    vehicleId: String,
    vehicleNumber: String,
  },
  
  // المحطات المرتبة (AI Optimized)
  stops: [{
    stopId: String,
    order: Number,
    beneficiaryId: String,
    beneficiaryName: String,
    nationalAddress: {
      region: String,
      city: String,
      district: String,
      streetName: String,
      buildingNumber: String,
      coordinates: { lat: Number, lng: Number },
    },
    pickupTime: String,
    dropoffTime: String,
    distanceFromPrevious: Number,
    accumulatedDistance: Number,
    estimatedDuration: Number,
    disabilityType: [String],
    requiresWheelchair: Boolean,
    specialInstructions: String,
  }],
  
  // إحصائيات المسار
  stats: {
    totalBeneficiaries: Number,
    totalDistance: Number, // km
    estimatedDuration: Number, // minutes
    wheelchairUsers: Number,
    companionsNeeded: Number,
  },
  
  // تحسين الذكاء الاصطناعي
  aiOptimization: {
    lastOptimized: Date,
    algorithm: { type: String, enum: ['nearest_neighbor', 'genetic', 'simulated_annealing', 'cluster_first'] },
    optimizationScore: Number,
    distanceSaved: Number, // km saved compared to previous route
    timeSaved: Number, // minutes saved
    fuelSaved: Number, // liters
  },
  
  // الحالة
  active: { type: Boolean, default: true },
  
  // Tenant
  tenantId: String,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'rehabilitation_routes',
});

TransportRouteSchema.index({ 'info.branchId': 1, 'info.shiftType': 1 });

/**
 * AI Route Optimizer - محسن المسارات بالذكاء الاصطناعي
 */
class AIRouteOptimizer {
  
  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(coord1, coord2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLng = this.toRad(coord2.lng - coord1.lng);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(coord1.lat)) * Math.cos(this.toRad(coord2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  toRad(deg) {
    return deg * (Math.PI / 180);
  }
  
  /**
   * Group beneficiaries by district/region
   */
  groupByLocation(beneficiaries) {
    const groups = {};
    
    beneficiaries.forEach(b => {
      const key = `${b.nationalAddress.region}-${b.nationalAddress.district}`;
      if (!groups[key]) {
        groups[key] = {
          region: b.nationalAddress.region,
          district: b.nationalAddress.district,
          center: this.calculateGroupCenter([]),
          beneficiaries: [],
        };
      }
      groups[key].beneficiaries.push(b);
    });
    
    // Calculate center for each group
    Object.values(groups).forEach(group => {
      group.center = this.calculateGroupCenter(group.beneficiaries);
    });
    
    return groups;
  }
  
  /**
   * Calculate geographic center of a group
   */
  calculateGroupCenter(beneficiaries) {
    if (beneficiaries.length === 0) return { lat: 0, lng: 0 };
    
    const sum = beneficiaries.reduce((acc, b) => ({
      lat: acc.lat + (b.nationalAddress.coordinates?.lat || 0),
      lng: acc.lng + (b.nationalAddress.coordinates?.lng || 0),
    }), { lat: 0, lng: 0 });
    
    return {
      lat: sum.lat / beneficiaries.length,
      lng: sum.lng / beneficiaries.length,
    };
  }
  
  /**
   * Optimize route using Nearest Neighbor Algorithm
   */
  optimizeRoute(branchCoords, beneficiaries, algorithm = 'nearest_neighbor') {
    if (beneficiaries.length === 0) return { stops: [], stats: {} };
    
    let optimizedStops = [];
    let currentLocation = branchCoords;
    let remaining = [...beneficiaries];
    let totalDistance = 0;
    let order = 1;
    
    while (remaining.length > 0) {
      // Find nearest beneficiary
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      
      remaining.forEach((b, index) => {
        const dist = this.calculateDistance(currentLocation, b.nationalAddress.coordinates);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestIndex = index;
        }
      });
      
      const nearest = remaining[nearestIndex];
      totalDistance += nearestDistance;
      
      optimizedStops.push({
        stopId: `STOP-${Date.now()}-${order}`,
        order: order,
        beneficiaryId: nearest.beneficiaryId,
        beneficiaryName: `${nearest.personal.firstNameAr} ${nearest.personal.lastNameAr}`,
        nationalAddress: nearest.nationalAddress,
        distanceFromPrevious: nearestDistance,
        accumulatedDistance: totalDistance,
        disabilityType: nearest.disability.type,
        requiresWheelchair: nearest.disability.requiresWheelchair,
        specialInstructions: nearest.disability.specialInstructions,
      });
      
      currentLocation = nearest.nationalAddress.coordinates;
      remaining.splice(nearestIndex, 1);
      order++;
    }
    
    // Add return distance
    const returnDistance = this.calculateDistance(currentLocation, branchCoords);
    totalDistance += returnDistance;
    
    // Calculate estimated times
    const avgSpeed = 30; // km/h in city
    const stopTime = 3; // minutes per stop
    const estimatedDuration = (totalDistance / avgSpeed) * 60 + (optimizedStops.length * stopTime);
    
    return {
      stops: optimizedStops,
      stats: {
        totalBeneficiaries: optimizedStops.length,
        totalDistance: Math.round(totalDistance * 10) / 10,
        estimatedDuration: Math.round(estimatedDuration),
        wheelchairUsers: optimizedStops.filter(s => s.requiresWheelchair).length,
        companionsNeeded: optimizedStops.filter(s => s.disabilityType.includes('intellectual')).length,
      },
      aiOptimization: {
        lastOptimized: new Date(),
        algorithm: algorithm,
        optimizationScore: this.calculateOptimizationScore(totalDistance, beneficiaries.length),
        distanceSaved: 0,
        timeSaved: 0,
        fuelSaved: 0,
      },
    };
  }
  
  /**
   * Calculate optimization score (0-100)
   */
  calculateOptimizationScore(totalDistance, beneficiaryCount) {
    if (beneficiaryCount === 0) return 100;
    const avgDistancePerBeneficiary = totalDistance / beneficiaryCount;
    // Lower average distance = higher score
    const score = Math.max(0, 100 - (avgDistancePerBeneficiary * 5));
    return Math.round(score);
  }
  
  /**
   * Cluster beneficiaries by geographic proximity
   */
  clusterBeneficiaries(beneficiaries, maxClusters = 5) {
    const groups = this.groupByLocation(beneficiaries);
    const clusters = [];
    
    Object.entries(groups).forEach(([key, group]) => {
      clusters.push({
        clusterId: key,
        center: group.center,
        beneficiaries: group.beneficiaries,
        count: group.beneficiaries.length,
      });
    });
    
    // Sort by count (largest first)
    clusters.sort((a, b) => b.count - a.count);
    
    return clusters.slice(0, maxClusters);
  }
}

/**
 * Rehabilitation Transport Service
 */
class RehabilitationTransportService extends EventEmitter {
  constructor() {
    super();
    this.Beneficiary = null;
    this.Branch = null;
    this.Route = null;
    this.optimizer = new AIRouteOptimizer();
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.Beneficiary = connection.model('Beneficiary', BeneficiarySchema);
    this.Branch = connection.model('RehabilitationBranch', RehabilitationBranchSchema);
    this.Route = connection.model('TransportRoute', TransportRouteSchema);
    console.log('✅ Rehabilitation Transport Service initialized');
  }
  
  // ============ Beneficiary Management ============
  
  async createBeneficiary(data) {
    const beneficiaryId = `BEN-${Date.now()}`;
    
    // Format national address
    const formattedAddress = this.formatNationalAddress(data.nationalAddress);
    
    const beneficiary = await this.Beneficiary.create({
      ...data,
      beneficiaryId,
      'nationalAddress.formattedAddress': formattedAddress,
    });
    
    this.emit('beneficiary:created', beneficiary);
    return beneficiary;
  }
  
  /**
   * Format Saudi National Address
   */
  formatNationalAddress(address) {
    const region = nationalAddressConfig.regions[address.region]?.label || address.region;
    return `${address.buildingNumber} ${address.streetName}، ${address.district}، ${address.city}، ${region}، ${address.postalCode}`;
  }
  
  async getBeneficiary(beneficiaryId) {
    return this.Beneficiary.findOne({ beneficiaryId });
  }
  
  async getBeneficiariesByBranch(branchId, shiftType = null) {
    const filter = { 'center.branchId': branchId };
    if (shiftType) filter['shift.type'] = shiftType;
    return this.Beneficiary.find(filter);
  }
  
  async getBeneficiariesByCenter(centerId) {
    return this.Beneficiary.find({ 'center.centerId': centerId });
  }
  
  // ============ Branch Management ============
  
  async createBranch(data) {
    const branchId = `BR-${Date.now()}`;
    const branch = await this.Branch.create({ ...data, branchId });
    this.emit('branch:created', branch);
    return branch;
  }
  
  async getBranchesByCenter(centerId) {
    return this.Branch.find({ 'info.centerId': centerId, active: true });
  }
  
  async getBranch(branchId) {
    return this.Branch.findOne({ branchId });
  }
  
  // ============ AI Route Optimization ============
  
  /**
   * Optimize routes for a branch using AI
   */
  async optimizeBranchRoutes(branchId, shiftType) {
    const branch = await this.Branch.findOne({ branchId });
    if (!branch) throw new Error('Branch not found');
    
    const beneficiaries = await this.Beneficiary.find({
      'center.branchId': branchId,
      'shift.type': shiftType,
      'subscription.active': true,
    });
    
    if (beneficiaries.length === 0) {
      return { message: 'No beneficiaries found for this shift' };
    }
    
    const branchCoords = branch.address.coordinates;
    
    // Run AI optimization
    const optimization = this.optimizer.optimizeRoute(branchCoords, beneficiaries);
    
    // Create or update route
    const routeId = `ROUTE-${branchId}-${shiftType}-${Date.now()}`;
    const route = await this.Route.create({
      routeId,
      info: {
        name: `مسار ${branch.info.name} - ${nationalAddressConfig.shifts[shiftType].label}`,
        branchId,
        branchName: branch.info.name,
        shiftType,
      },
      stops: optimization.stops,
      stats: optimization.stats,
      aiOptimization: optimization.aiOptimization,
      tenantId: branch.tenantId,
    });
    
    // Update beneficiary pickup info
    for (const stop of optimization.stops) {
      await this.Beneficiary.findOneAndUpdate(
        { beneficiaryId: stop.beneficiaryId },
        {
          'pickup.routeId': routeId,
          'pickup.routeName': route.info.name,
          'pickup.stopOrder': stop.order,
          'pickup.distance': stop.accumulatedDistance,
          'pickup.estimatedDuration': stop.estimatedDuration,
        }
      );
    }
    
    this.emit('route:optimized', route);
    return route;
  }
  
  /**
   * Get optimized routes for a branch
   */
  async getBranchRoutes(branchId) {
    return this.Route.find({ 'info.branchId': branchId, active: true })
      .sort({ createdAt: -1 });
  }
  
  /**
   * Get today's routes for all shifts
   */
  async getTodayRoutes(centerId) {
    const branches = await this.Branch.find({ 'info.centerId': centerId });
    const branchIds = branches.map(b => b.branchId);
    
    return this.Route.find({
      'info.branchId': { $in: branchIds },
      active: true,
    }).sort({ 'info.shiftType': 1 });
  }
  
  // ============ Statistics ============
  
  async getTransportStatistics(centerId) {
    const [branches, beneficiaries, routes] = await Promise.all([
      this.Branch.countDocuments({ 'info.centerId': centerId, active: true }),
      this.Beneficiary.countDocuments({ 'center.centerId': centerId, 'subscription.active': true }),
      this.Route.countDocuments({ tenantId: centerId, active: true }),
    ]);
    
    const shiftStats = await this.Beneficiary.aggregate([
      { $match: { 'center.centerId': centerId, 'subscription.active': true } },
      { $group: { _id: '$shift.type', count: { $sum: 1 } } },
    ]);
    
    return {
      totalBranches: branches,
      totalBeneficiaries: beneficiaries,
      totalRoutes: routes,
      byShift: shiftStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
    };
  }
}

// Singleton
const rehabilitationTransportService = new RehabilitationTransportService();

module.exports = {
  RehabilitationTransportService,
  rehabilitationTransportService,
  nationalAddressConfig,
  AIRouteOptimizer,
};