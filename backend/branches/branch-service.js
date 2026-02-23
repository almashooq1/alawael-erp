/**
 * Branch Management Service - خدمة إدارة الفروع
 * Comprehensive Multi-Branch Management System
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');

/**
 * Branch Configuration
 */
const branchConfig = {
  // Branch types
  types: {
    headquarters: { label: 'المقر الرئيسي', level: 1 },
    regional: { label: 'مكتب إقليمي', level: 2 },
    branch: { label: 'فرع', level: 3 },
    sub_branch: { label: 'فرع فرعي', level: 4 },
    kiosk: { label: 'كشك', level: 5 },
    mobile_unit: { label: 'وحدة متنقلة', level: 5 },
  },
  
  // Branch status
  statuses: {
    active: { label: 'نشط', color: 'green' },
    inactive: { label: 'غير نشط', color: 'gray' },
    maintenance: { label: 'تحت الصيانة', color: 'yellow' },
    closed: { label: 'مغلق', color: 'red' },
    planned: { label: 'مخطط', color: 'blue' },
  },
  
  // Working hours
  workingHours: {
    standard: {
      start: '08:00',
      end: '16:00',
      days: [0, 1, 2, 3, 4], // Sunday to Thursday
    },
    extended: {
      start: '08:00',
      end: '20:00',
      days: [0, 1, 2, 3, 4, 5],
    },
    '24h': {
      start: '00:00',
      end: '23:59',
      days: [0, 1, 2, 3, 4, 5, 6],
    },
  },
};

/**
 * Branch Schema
 */
const BranchSchema = new mongoose.Schema({
  // Basic info
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  nameEn: String,
  
  // Type and status
  type: { type: String, enum: Object.keys(branchConfig.types), default: 'branch' },
  status: { type: String, enum: Object.keys(branchConfig.statuses), default: 'active' },
  
  // Hierarchy
  parentBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  region: String,
  zone: String,
  
  // Location
  location: {
    address: String,
    city: String,
    district: String,
    country: { type: String, default: 'السعودية' },
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
    postalCode: String,
    buildingNumber: String,
    additionalNumber: String,
  },
  
  // Contact info
  contact: {
    phone: String,
    phoneAlt: String,
    fax: String,
    email: String,
    website: String,
  },
  
  // Working hours
  workingHours: {
    type: { type: String, enum: ['standard', 'extended', '24h', 'custom'], default: 'standard' },
    schedule: [{
      day: Number, // 0-6
      opensAt: String,
      closesAt: String,
      isOpen: { type: Boolean, default: true },
    }],
    holidays: [Date],
    specialHours: [{
      date: Date,
      opensAt: String,
      closesAt: String,
      reason: String,
    }],
  },
  
  // Capacity
  capacity: {
    maxEmployees: Number,
    maxCustomers: Number,
    maxTransactions: Number,
    parkingSpaces: Number,
    area: Number, // sqm
  },
  
  // Manager
  manager: {
    userId: String,
    name: String,
    email: String,
    phone: String,
    assignedAt: Date,
  },
  
  // Staff count
  staff: {
    total: { type: Number, default: 0 },
    active: { type: Number, default: 0 },
    departments: [{
      name: String,
      count: Number,
    }],
  },
  
  // Services
  services: [{
    serviceId: String,
    name: String,
    isActive: { type: Boolean, default: true },
    averageWaitTime: Number, // minutes
  }],
  
  // Facilities
  facilities: {
    hasParking: Boolean,
    hasDisabilityAccess: Boolean,
    hasPrayerRoom: Boolean,
    hasWaitingArea: Boolean,
    hasATM: Boolean,
    hasSecurityOffice: Boolean,
    hasArchive: Boolean,
    hasVault: Boolean,
    totalFloors: Number,
    hasElevator: Boolean,
  },
  
  // Equipment
  equipment: [{
    type: String,
    name: String,
    serialNumber: String,
    status: { type: String, enum: ['working', 'maintenance', 'broken'], default: 'working' },
    lastMaintenance: Date,
  }],
  
  // Performance metrics
  performance: {
    rating: { type: Number, min: 0, max: 5, default: 0 },
    totalRatings: { type: Number, default: 0 },
    dailyCustomers: { type: Number, default: 0 },
    dailyTransactions: { type: Number, default: 0 },
    customerSatisfactionScore: Number,
    lastUpdated: Date,
  },
  
  // Operating costs
  costs: {
    monthly: Number,
    rent: Number,
    utilities: Number,
    maintenance: Number,
    lastUpdated: Date,
  },
  
  // Documents
  documents: [{
    type: String,
    name: String,
    filePath: String,
    uploadedAt: Date,
    expiresAt: Date,
  }],
  
  // Notes
  notes: String,
  
  // Images
  images: [{
    type: String, // exterior, interior, layout, etc.
    url: String,
    caption: String,
  }],
  
  // Opening date
  openingDate: Date,
  closingDate: Date,
  
  // Tenant
  tenantId: String,
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  createdBy: String,
}, {
  collection: 'branches',
});

// Indexes
BranchSchema.index({ code: 1 });
BranchSchema.index({ type: 1, status: 1 });
BranchSchema.index({ 'location.city': 1 });
BranchSchema.index({ parentBranch: 1 });

/**
 * Branch Transfer Schema
 */
const BranchTransferSchema = new mongoose.Schema({
  // Transfer info
  transferNumber: { type: String, unique: true },
  
  // From and To
  fromBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  toBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  
  // Transfer type
  type: { type: String, enum: ['inventory', 'staff', 'equipment', 'cash', 'documents'] },
  
  // Items
  items: [{
    itemId: String,
    name: String,
    quantity: Number,
    unit: String,
    notes: String,
  }],
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'in_transit', 'delivered', 'received', 'cancelled'],
    default: 'pending',
  },
  
  // Approval
  approvedBy: {
    from: { userId: String, name: String, approvedAt: Date },
    to: { userId: String, name: String, approvedAt: Date },
  },
  
  // Shipping
  shipping: {
    method: String,
    trackingNumber: String,
    shippedAt: Date,
    deliveredAt: Date,
    receivedAt: Date,
    receivedBy: String,
  },
  
  // Notes
  notes: String,
  
  // Creator
  createdBy: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  
  // Tenant
  tenantId: String,
}, {
  collection: 'branch_transfers',
});

/**
 * Branch Performance Log Schema
 */
const BranchPerformanceLogSchema = new mongoose.Schema({
  // Branch
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  
  // Date
  date: { type: Date, required: true },
  
  // Metrics
  metrics: {
    customersServed: { type: Number, default: 0 },
    transactionsCount: { type: Number, default: 0 },
    transactionsValue: { type: Number, default: 0 },
    averageWaitTime: Number, // minutes
    averageServiceTime: Number, // minutes
    customerComplaints: { type: Number, default: 0 },
    customerCompliments: { type: Number, default: 0 },
    newCustomers: { type: Number, default: 0 },
    returningCustomers: { type: Number, default: 0 },
    staffPresent: { type: Number, default: 0 },
    staffAbsent: { type: Number, default: 0 },
  },
  
  // Revenue (if applicable)
  revenue: {
    cash: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    transfer: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  
  // Service breakdown
  servicesBreakdown: [{
    serviceId: String,
    serviceName: String,
    count: Number,
    averageTime: Number,
  }],
  
  // Issues
  issues: [{
    type: String,
    description: String,
    reportedBy: String,
    resolvedAt: Date,
  }],
  
  // Tenant
  tenantId: String,
  
  // Timestamp
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'branch_performance_logs',
});

// Compound index
BranchPerformanceLogSchema.index({ branchId: 1, date: 1 }, { unique: true });

/**
 * Branch Management Service Class
 */
class BranchManagementService extends EventEmitter {
  constructor() {
    super();
    this.Branch = null;
    this.BranchTransfer = null;
    this.BranchPerformanceLog = null;
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.Branch = connection.model('Branch', BranchSchema);
    this.BranchTransfer = connection.model('BranchTransfer', BranchTransferSchema);
    this.BranchPerformanceLog = connection.model('BranchPerformanceLog', BranchPerformanceLogSchema);
    
    console.log('✅ Branch Management Service initialized');
  }
  
  /**
   * Create branch
   */
  async createBranch(data) {
    // Generate branch code
    const code = data.code || await this.generateBranchCode(data.type, data.region);
    
    const branch = await this.Branch.create({
      ...data,
      code,
    });
    
    this.emit('branch:created', branch);
    
    return branch;
  }
  
  /**
   * Generate branch code
   */
  async generateBranchCode(type, region) {
    const typePrefix = {
      headquarters: 'HQ',
      regional: 'RG',
      branch: 'BR',
      sub_branch: 'SB',
      kiosk: 'KS',
      mobile_unit: 'MU',
    };
    
    const prefix = typePrefix[type] || 'BR';
    const regionCode = region ? region.substring(0, 2).toUpperCase() : 'XX';
    const count = await this.Branch.countDocuments({ type, region });
    const sequence = (count + 1).toString().padStart(4, '0');
    
    return `${prefix}-${regionCode}-${sequence}`;
  }
  
  /**
   * Get branch by ID
   */
  async getBranch(branchId) {
    return this.Branch.findById(branchId)
      .populate('parentBranch');
  }
  
  /**
   * Get branch by code
   */
  async getBranchByCode(code) {
    return this.Branch.findOne({ code });
  }
  
  /**
   * Update branch
   */
  async updateBranch(branchId, updates, userId) {
    const branch = await this.Branch.findByIdAndUpdate(
      branchId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    this.emit('branch:updated', branch);
    
    return branch;
  }
  
  /**
   * Update branch status
   */
  async updateStatus(branchId, status, userId, reason = '') {
    const branch = await this.Branch.findByIdAndUpdate(
      branchId,
      {
        status,
        updatedAt: new Date(),
      },
      { new: true }
    );
    
    this.emit('branch:status_changed', { branch, status, reason });
    
    return branch;
  }
  
  /**
   * Get all branches
   */
  async getBranches(options = {}) {
    const filter = {};
    
    if (options.type) filter.type = options.type;
    if (options.status) filter.status = options.status;
    if (options.region) filter.region = options.region;
    if (options.parentBranch) filter.parentBranch = options.parentBranch;
    if (options.tenantId) filter.tenantId = options.tenantId;
    
    return this.Branch.find(filter)
      .populate('parentBranch')
      .sort(options.sort || { code: 1 })
      .limit(options.limit || 100);
  }
  
  /**
   * Get branches hierarchy
   */
  async getBranchHierarchy(parentId = null, level = 0) {
    const branches = await this.Branch.find({
      parentBranch: parentId,
      status: { $ne: 'closed' },
    });
    
    const hierarchy = [];
    
    for (const branch of branches) {
      const node = {
        ...branch.toObject(),
        level,
        children: await this.getBranchHierarchy(branch._id, level + 1),
      };
      hierarchy.push(node);
    }
    
    return hierarchy;
  }
  
  /**
   * Assign manager to branch
   */
  async assignManager(branchId, managerData) {
    const branch = await this.Branch.findByIdAndUpdate(
      branchId,
      {
        manager: {
          ...managerData,
          assignedAt: new Date(),
        },
        updatedAt: new Date(),
      },
      { new: true }
    );
    
    this.emit('branch:manager_assigned', branch);
    
    return branch;
  }
  
  /**
   * Get branches by region
   */
  async getBranchesByRegion(region) {
    return this.Branch.find({ region, status: 'active' });
  }
  
  /**
   * Get nearby branches
   */
  async getNearbyBranches(latitude, longitude, maxDistance = 50) {
    // maxDistance in kilometers
    return this.Branch.find({
      'location.coordinates.latitude': { $exists: true },
      'location.coordinates.longitude': { $exists: true },
      status: 'active',
    });
    // Note: For production, use $near with geospatial index
  }
  
  /**
   * Search branches
   */
  async searchBranches(query, options = {}) {
    const filter = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { code: { $regex: query, $options: 'i' } },
        { 'location.city': { $regex: query, $options: 'i' } },
        { 'location.address': { $regex: query, $options: 'i' } },
      ],
      status: options.status || 'active',
    };
    
    return this.Branch.find(filter).limit(options.limit || 20);
  }
  
  // ============ Transfers ============
  
  /**
   * Create transfer
   */
  async createTransfer(data) {
    const transferNumber = `TR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const transfer = await this.BranchTransfer.create({
      ...data,
      transferNumber,
    });
    
    this.emit('transfer:created', transfer);
    
    return transfer;
  }
  
  /**
   * Approve transfer
   */
  async approveTransfer(transferId, branchType, userId, userName) {
    const transfer = await this.BranchTransfer.findById(transferId);
    if (!transfer) throw new Error('Transfer not found');
    
    if (branchType === 'from') {
      transfer.approvedBy.from = { userId, name: userName, approvedAt: new Date() };
    } else {
      transfer.approvedBy.to = { userId, name: userName, approvedAt: new Date() };
    }
    
    // If both approved, change status
    if (transfer.approvedBy.from && transfer.approvedBy.to) {
      transfer.status = 'approved';
    }
    
    await transfer.save();
    
    this.emit('transfer:approved', transfer);
    
    return transfer;
  }
  
  /**
   * Ship transfer
   */
  async shipTransfer(transferId, shippingData) {
    const transfer = await this.BranchTransfer.findByIdAndUpdate(
      transferId,
      {
        status: 'in_transit',
        'shipping.method': shippingData.method,
        'shipping.trackingNumber': shippingData.trackingNumber,
        'shipping.shippedAt': new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    );
    
    this.emit('transfer:shipped', transfer);
    
    return transfer;
  }
  
  /**
   * Receive transfer
   */
  async receiveTransfer(transferId, userId, userName) {
    const transfer = await this.BranchTransfer.findByIdAndUpdate(
      transferId,
      {
        status: 'received',
        'shipping.receivedAt': new Date(),
        'shipping.receivedBy': userId,
        updatedAt: new Date(),
      },
      { new: true }
    );
    
    this.emit('transfer:received', transfer);
    
    return transfer;
  }
  
  /**
   * Get transfers
   */
  async getTransfers(branchId, options = {}) {
    const filter = {
      $or: [
        { fromBranch: branchId },
        { toBranch: branchId },
      ],
    };
    
    if (options.status) filter.status = options.status;
    if (options.type) filter.type = options.type;
    
    return this.BranchTransfer.find(filter)
      .populate('fromBranch')
      .populate('toBranch')
      .sort({ createdAt: -1 })
      .limit(options.limit || 50);
  }
  
  // ============ Performance ============
  
  /**
   * Log performance
   */
  async logPerformance(branchId, date, metrics) {
    const log = await this.BranchPerformanceLog.findOneAndUpdate(
      { branchId, date },
      { metrics, ...metrics },
      { upsert: true, new: true }
    );
    
    // Update branch performance summary
    await this.updateBranchPerformanceSummary(branchId);
    
    return log;
  }
  
  /**
   * Update branch performance summary
   */
  async updateBranchPerformanceSummary(branchId) {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const logs = await this.BranchPerformanceLog.find({
      branchId,
      date: { $gte: last30Days },
    });
    
    if (logs.length === 0) return;
    
    const totalCustomers = logs.reduce((sum, log) => sum + (log.metrics.customersServed || 0), 0);
    const totalTransactions = logs.reduce((sum, log) => sum + (log.metrics.transactionsCount || 0), 0);
    
    await this.Branch.findByIdAndUpdate(branchId, {
      'performance.dailyCustomers': Math.round(totalCustomers / logs.length),
      'performance.dailyTransactions': Math.round(totalTransactions / logs.length),
      'performance.lastUpdated': new Date(),
    });
  }
  
  /**
   * Get performance report
   */
  async getPerformanceReport(branchId, startDate, endDate) {
    const logs = await this.BranchPerformanceLog.find({
      branchId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });
    
    const summary = {
      totalCustomers: logs.reduce((sum, log) => sum + (log.metrics.customersServed || 0), 0),
      totalTransactions: logs.reduce((sum, log) => sum + (log.metrics.transactionsCount || 0), 0),
      totalRevenue: logs.reduce((sum, log) => sum + (log.revenue?.total || 0), 0),
      averageWaitTime: this.calculateAverage(logs.map(l => l.metrics.averageWaitTime).filter(Boolean)),
      customerComplaints: logs.reduce((sum, log) => sum + (log.metrics.customerComplaints || 0), 0),
      customerCompliments: logs.reduce((sum, log) => sum + (log.metrics.customerCompliments || 0), 0),
    };
    
    return {
      branchId,
      period: { startDate, endDate },
      days: logs.length,
      summary,
      dailyLogs: logs,
    };
  }
  
  /**
   * Calculate average
   */
  calculateAverage(values) {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  // ============ Statistics ============
  
  /**
   * Get statistics
   */
  async getStatistics(tenantId) {
    const filter = tenantId ? { tenantId } : {};
    
    const [
      total,
      byType,
      byStatus,
      byRegion,
      activeStaff,
    ] = await Promise.all([
      this.Branch.countDocuments(filter),
      this.Branch.aggregate([
        { $match: filter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      this.Branch.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.Branch.aggregate([
        { $match: filter },
        { $group: { _id: '$region', count: { $sum: 1 } } },
      ]),
      this.Branch.aggregate([
        { $match: { ...filter, status: 'active' } },
        { $group: { _id: null, total: { $sum: '$staff.active' } } },
      ]),
    ]);
    
    return {
      total,
      byType: byType.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      byRegion: byRegion.reduce((acc, item) => ({ ...acc, [item._id || 'غير محدد']: item.count }), {}),
      totalActiveStaff: activeStaff[0]?.total || 0,
    };
  }
  
  /**
   * Check if branch is open
   */
  async isBranchOpen(branchId) {
    const branch = await this.Branch.findById(branchId);
    if (!branch || branch.status !== 'active') return false;
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM
    
    // Check working hours
    const schedule = branch.workingHours.schedule.find(s => s.day === dayOfWeek);
    
    if (!schedule || !schedule.isOpen) return false;
    
    return currentTime >= schedule.opensAt && currentTime <= schedule.closesAt;
  }
  
  /**
   * Get open branches
   */
  async getOpenBranches(region = null) {
    const filter = { status: 'active' };
    if (region) filter.region = region;
    
    const branches = await this.Branch.find(filter);
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.toTimeString().substring(0, 5);
    
    return branches.filter(branch => {
      const schedule = branch.workingHours.schedule.find(s => s.day === dayOfWeek);
      if (!schedule || !schedule.isOpen) return false;
      return currentTime >= schedule.opensAt && currentTime <= schedule.closesAt;
    });
  }
}

// Singleton instance
const branchManagementService = new BranchManagementService();

/**
 * Branch Types (Arabic)
 */
const branchTypes = {
  headquarters: { label: 'المقر الرئيسي', icon: 'building', level: 1 },
  regional: { label: 'مكتب إقليمي', icon: 'office', level: 2 },
  branch: { label: 'فرع', icon: 'store', level: 3 },
  sub_branch: { label: 'فرع فرعي', icon: 'storefront', level: 4 },
  kiosk: { label: 'كشك', icon: 'kiosk', level: 5 },
  mobile_unit: { label: 'وحدة متنقلة', icon: 'truck', level: 5 },
};

module.exports = {
  BranchManagementService,
  branchManagementService,
  branchConfig,
  branchTypes,
};