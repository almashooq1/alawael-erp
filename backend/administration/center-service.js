/* eslint-disable no-unused-vars */
/**
 * Rehabilitation Center Administration Service
 * خدمة إدارة مراكز التأهيل الشاملة
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');
const logger = require('../utils/logger');

/**
 * Center Configuration
 */
const centerConfig = {
  // أنواع المراكز
  centerTypes: {
    rehabilitation: { label: 'مركز تأهيل', code: 'REHAB' },
    special_education: { label: 'تربية خاصة', code: 'SPECED' },
    autism_center: { label: 'مركز توحد', code: 'AUTISM' },
    physical_therapy: { label: 'علاج طبيعي', code: 'PT' },
    integrated: { label: 'مركز متكامل', code: 'INTEGRATED' },
  },

  // حالات المركز
  centerStatuses: {
    active: { label: 'نشط', color: 'green' },
    maintenance: { label: 'صيانة', color: 'yellow' },
    closed: { label: 'مغلق', color: 'red' },
    seasonal: { label: 'موسمي', color: 'blue' },
  },

  // أقسام المركز
  departments: {
    physical_therapy: { label: 'العلاج الطبيعي', code: 'PT' },
    occupational_therapy: { label: 'العلاج الوظيفي', code: 'OT' },
    speech_therapy: { label: 'علاج النطق', code: 'ST' },
    behavioral_therapy: { label: 'العلاج السلوكي', code: 'BT' },
    special_education: { label: 'التربية الخاصة', code: 'SE' },
    vocational_training: { label: 'التأهيل المهني', code: 'VT' },
    psychology: { label: 'علم النفس', code: 'PSY' },
    social_services: { label: 'الخدمات الاجتماعية', code: 'SS' },
    medical: { label: 'العيادة الطبية', code: 'MED' },
    administration: { label: 'الإدارة', code: 'ADMIN' },
  },

  // أدوار الموظفين
  staffRoles: {
    director: { label: 'مدير المركز', level: 1 },
    assistant_director: { label: 'مساعد المدير', level: 2 },
    department_head: { label: 'رئيس قسم', level: 3 },
    senior_therapist: { label: 'معالج أول', level: 4 },
    therapist: { label: 'معالج', level: 5 },
    assistant_therapist: { label: 'معالج مساعد', level: 6 },
    nurse: { label: 'ممرض', level: 7 },
    administrative: { label: 'إداري', level: 8 },
    receptionist: { label: 'موظف استقبال', level: 9 },
    driver: { label: 'سائق', level: 10 },
    maintenance: { label: 'صيانة', level: 11 },
    security: { label: 'أمن', level: 12 },
  },

  // أيام العمل
  workDays: ['sun', 'mon', 'tue', 'wed', 'thu'],

  // فترات الدوام
  shiftTypes: {
    morning: { label: 'صباحي', start: '07:00', end: '14:00' },
    evening: { label: 'مسائي', start: '14:00', end: '21:00' },
    full: { label: 'كامل', start: '07:00', end: '21:00' },
  },
};

/**
 * Center Schema - مركز التأهيل
 */
const CenterSchema = new mongoose.Schema(
  {
    // معلومات أساسية
    centerId: { type: String, unique: true },

    // البيانات الأساسية
    info: {
      nameAr: { type: String, required: true },
      nameEn: String,
      type: { type: String, enum: Object.keys(centerConfig.centerTypes) },
      licenseNumber: String,
      licenseExpiry: Date,
      establishmentDate: Date,
      capacity: Number,
      logo: String,
      website: String,
      email: String,
      phone: String,
      fax: String,
    },

    // العنوان الوطني
    address: {
      region: String,
      city: String,
      district: String,
      streetName: String,
      buildingNumber: String,
      postalCode: String,
      additionalNumber: String,
      coordinates: { lat: Number, lng: Number },
      googleMapsUrl: String,
    },

    // المالك/الجهة المشرفة
    ownership: {
      type: { type: String, enum: ['government', 'private', 'nonprofit', 'charity'] },
      ownerName: String,
      ownerContact: String,
      supervisoryAuthority: String,
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
      workingDays: [{ type: String, enum: centerConfig.workDays }],
      holidays: [Date],
    },

    // الفروع
    branches: [
      {
        branchId: String,
        name: String,
        region: String,
        city: String,
        address: String,
        coordinates: { lat: Number, lng: Number },
        capacity: Number,
        status: String,
        managerName: String,
        managerPhone: String,
      },
    ],

    // الأقسام
    departments: [
      {
        departmentId: String,
        type: { type: String, enum: Object.keys(centerConfig.departments) },
        name: String,
        headName: String,
        staffCount: Number,
        capacity: Number,
        equipment: [String],
        rooms: Number,
      },
    ],

    // المرافق
    facilities: {
      totalArea: Number, // m2
      rooms: [
        {
          roomId: String,
          type: String,
          name: String,
          floor: Number,
          capacity: Number,
          equipment: [String],
        },
      ],
      parkingSpaces: Number,
      prayerRoom: Boolean,
      cafeteria: Boolean,
      playground: Boolean,
      garden: Boolean,
      wheelchairAccessible: Boolean,
    },

    // الموارد البشرية
    humanResources: {
      totalStaff: Number,
      byDepartment: [
        {
          department: String,
          count: Number,
        },
      ],
      byRole: [
        {
          role: String,
          count: Number,
        },
      ],
      vacancies: [
        {
          role: String,
          department: String,
          count: Number,
          requirements: String,
        },
      ],
    },

    // الإحصائيات
    statistics: {
      totalBeneficiaries: Number,
      activeBeneficiaries: Number,
      graduatedBeneficiaries: Number,
      waitingList: Number,
      monthlyNewRegistrations: Number,
      averageSessionAttendance: Number,
      satisfactionRate: Number,
    },

    // الترخيص والاعتمادات
    accreditations: [
      {
        name: String,
        authority: String,
        date: Date,
        expiryDate: Date,
        certificateNumber: String,
        document: String,
      },
    ],

    // الميزانية
    budget: {
      annualBudget: Number,
      currency: { type: String, default: 'SAR' },
      fiscalYearStart: Date,
      allocatedByDepartment: [
        {
          department: String,
          amount: Number,
        },
      ],
    },

    // الإعدادات
    settings: {
      autoAttendanceNotification: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
      allowOnlineBooking: { type: Boolean, default: false },
      requirePreRegistration: { type: Boolean, default: true },
      maxWaitlistDays: { type: Number, default: 30 },
      sessionReminderHours: { type: Number, default: 24 },
      attendanceGracePeriodMinutes: { type: Number, default: 15 },
    },

    // الحالة
    status: {
      type: String,
      enum: Object.keys(centerConfig.centerStatuses),
      default: 'active',
    },

    // Tenant
    tenantId: String,

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
  },
  {
    collection: 'rehabilitation_centers',
  }
);

/**
 * Staff Member Schema - الموظف
 */
const StaffSchema = new mongoose.Schema(
  {
    // معلومات أساسية
    staffId: { type: String, unique: true },
    employeeNumber: String,

    // البيانات الشخصية
    personal: {
      firstNameAr: { type: String, required: true },
      lastNameAr: { type: String, required: true },
      firstNameEn: String,
      lastNameEn: String,
      nationalId: { type: String, unique: true, sparse: true },
      dateOfBirth: Date,
      gender: { type: String, enum: ['male', 'female'] },
      nationality: String,
      photo: String,
      bloodType: String,
    },

    // معلومات التواصل
    contact: {
      mobile: String,
      workPhone: String,
      email: String,
      emergencyContact: {
        name: String,
        relation: String,
        phone: String,
      },
      address: {
        region: String,
        city: String,
        district: String,
        street: String,
      },
    },

    // معلومات التوظيف
    employment: {
      centerId: String,
      centerName: String,
      branchId: String,
      branchName: String,
      department: { type: String, enum: Object.keys(centerConfig.departments) },
      role: { type: String, enum: Object.keys(centerConfig.staffRoles) },
      employmentType: { type: String, enum: ['full_time', 'part_time', 'contract', 'volunteer'] },
      joinDate: { type: Date, default: Date.now },
      endDate: Date,
      salary: Number,
      contractExpiry: Date,
      workPermitNumber: String,
      workPermitExpiry: Date,
      supervisor: {
        staffId: String,
        name: String,
      },
    },

    // المؤهلات
    qualifications: [
      {
        degree: String,
        field: String,
        institution: String,
        year: Number,
        grade: String,
        certificate: String,
      },
    ],

    // الشهادات المهنية
    certifications: [
      {
        name: String,
        authority: String,
        date: Date,
        expiryDate: Date,
        number: String,
        document: String,
      },
    ],

    // التخصصات
    specializations: [String],

    // الخبرات السابقة
    experience: [
      {
        organization: String,
        position: String,
        startDate: Date,
        endDate: Date,
        responsibilities: String,
      },
    ],

    // المهارات
    skills: [
      {
        skill: String,
        level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
      },
    ],

    // اللغات
    languages: [
      {
        language: String,
        proficiency: { type: String, enum: ['basic', 'conversational', 'fluent', 'native'] },
      },
    ],

    // الجدول
    schedule: {
      shift: { type: String, enum: Object.keys(centerConfig.shiftTypes) },
      workingDays: [{ type: String, enum: centerConfig.workDays }],
      startTime: String,
      endTime: String,
      room: String,
    },

    // الحضور
    attendance: {
      todayStatus: { type: String, enum: ['present', 'absent', 'late', 'leave', 'holiday'] },
      statistics: {
        totalDays: { type: Number, default: 0 },
        present: { type: Number, default: 0 },
        absent: { type: Number, default: 0 },
        late: { type: Number, default: 0 },
        leave: { type: Number, default: 0 },
        attendanceRate: { type: Number, default: 100 },
      },
      lastAttendance: Date,
    },

    // الإجازات
    leaves: {
      annual: { total: Number, used: Number, remaining: Number },
      sick: { total: Number, used: Number },
      emergency: { total: Number, used: Number },
      leaveHistory: [
        {
          type: String,
          startDate: Date,
          endDate: Date,
          days: Number,
          reason: String,
          approved: Boolean,
          approvedBy: String,
        },
      ],
    },

    // الأداء
    performance: {
      rating: { type: Number, min: 1, max: 5 },
      lastReviewDate: Date,
      nextReviewDate: Date,
      reviews: [
        {
          date: Date,
          reviewer: String,
          rating: Number,
          strengths: [String],
          areasForImprovement: [String],
          goals: [String],
        },
      ],
      sessionsConducted: { type: Number, default: 0 },
      beneficiariesServed: { type: Number, default: 0 },
      satisfactionScore: Number,
    },

    // التدريب
    training: [
      {
        trainingId: String,
        title: String,
        provider: String,
        startDate: Date,
        endDate: Date,
        hours: Number,
        certificate: String,
        completed: Boolean,
      },
    ],

    // الحالة
    status: {
      type: String,
      enum: ['active', 'on_leave', 'suspended', 'terminated', 'resigned'],
      default: 'active',
    },

    // الملاحظات
    notes: [
      {
        date: Date,
        author: String,
        content: String,
        type: { type: String, enum: ['general', 'disciplinary', 'appreciation'] },
      },
    ],

    // Tenant
    tenantId: String,

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
  },
  {
    collection: 'staff_members',
  }
);

/**
 * Resource Schema - المورد/الأصل
 */
const ResourceSchema = new mongoose.Schema(
  {
    resourceId: { type: String, unique: true },

    // معلومات أساسية
    info: {
      name: { type: String, required: true },
      type: {
        type: String,
        enum: ['equipment', 'furniture', 'vehicle', 'device', 'supply', 'other'],
      },
      category: String,
      description: String,
      brand: String,
      model: String,
    },

    // الموقع
    location: {
      centerId: String,
      branchId: String,
      department: String,
      room: String,
      building: String,
    },

    // معلومات الشراء
    purchase: {
      purchaseDate: Date,
      purchasePrice: Number,
      supplier: String,
      invoiceNumber: String,
      warrantyExpiry: Date,
      warrantyDocument: String,
    },

    // معلومات الصيانة
    maintenance: {
      lastMaintenanceDate: Date,
      nextMaintenanceDate: Date,
      maintenanceFrequency: String,
      maintenanceCost: Number,
      maintenanceHistory: [
        {
          date: Date,
          type: String,
          description: String,
          cost: Number,
          technician: String,
        },
      ],
    },

    // حالة المورد
    condition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'damaged', 'disposed'],
      default: 'good',
    },

    // الاستخدام
    usage: {
      assignedTo: String,
      usageStatus: { type: String, enum: ['available', 'in_use', 'reserved', 'under_maintenance'] },
      usageCount: { type: Number, default: 0 },
      lastUsed: Date,
    },

    // التتبع
    tracking: {
      serialNumber: String,
      assetTag: String,
      barcode: String,
      qrCode: String,
    },

    // الإهلاك
    depreciation: {
      method: String,
      usefulLifeYears: Number,
      currentValue: Number,
      depreciationRate: Number,
    },

    // Tenant
    tenantId: String,

    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
  },
  {
    collection: 'center_resources',
  }
);

/**
 * Center Administration Service
 */
class CenterAdministrationService extends EventEmitter {
  constructor() {
    super();
    this.Center = null;
    this.Staff = null;
    this.Resource = null;
  }

  async initialize(connection) {
    this.Center = connection.model('Center', CenterSchema);
    this.Staff = connection.model('Staff', StaffSchema);
    this.Resource = connection.model('Resource', ResourceSchema);
    logger.info('✅ Center Administration Service initialized');
  }

  // ============ Center Management ============

  async createCenter(data) {
    const centerId = `CTR-${Date.now()}`;
    const center = await this.Center.create({ ...data, centerId });
    this.emit('center:created', center);
    return center;
  }

  async getCenter(centerId) {
    return this.Center.findOne({ centerId });
  }

  async getCenters(filter = {}) {
    return this.Center.find(filter).sort({ createdAt: -1 });
  }

  async updateCenter(centerId, data) {
    const center = await this.Center.findOneAndUpdate(
      { centerId },
      { ...data, updatedAt: new Date() },
      { new: true }
    );
    if (center) this.emit('center:updated', center);
    return center;
  }

  async addBranch(centerId, branchData) {
    const branchId = `BR-${Date.now()}`;
    const center = await this.Center.findOne({ centerId });
    if (!center) throw new Error('Center not found');

    center.branches.push({ ...branchData, branchId, status: 'active' });
    await center.save();

    this.emit('branch:added', { centerId, branchId });
    return center;
  }

  async updateStatistics(centerId) {
    const center = await this.Center.findOne({ centerId });
    if (!center) throw new Error('Center not found');

    // Calculate statistics
    const staffCount = await this.Staff.countDocuments({
      'employment.centerId': centerId,
      status: 'active',
    });
    center.humanResources.totalStaff = staffCount;

    await center.save();
    return center;
  }

  // ============ Staff Management ============

  async createStaff(data) {
    const staffId = `STF-${Date.now()}`;
    const employeeNumber = await this.generateEmployeeNumber(data.employment?.centerId);

    const staff = await this.Staff.create({
      ...data,
      staffId,
      employeeNumber,
    });

    this.emit('staff:created', staff);
    return staff;
  }

  async generateEmployeeNumber(centerId) {
    const count = await this.Staff.countDocuments({ 'employment.centerId': centerId });
    return `EMP-${centerId}-${(count + 1).toString().padStart(4, '0')}`;
  }

  async getStaff(staffId) {
    return this.Staff.findOne({ staffId });
  }

  async getStaffByCenter(centerId, options = {}) {
    const filter = { 'employment.centerId': centerId };
    if (options.department) filter['employment.department'] = options.department;
    if (options.role) filter['employment.role'] = options.role;
    if (options.status) filter.status = options.status;

    return this.Staff.find(filter).sort({ 'employment.role': 1 });
  }

  async updateStaff(staffId, data) {
    const staff = await this.Staff.findOneAndUpdate(
      { staffId },
      { ...data, updatedAt: new Date() },
      { new: true }
    );
    if (staff) this.emit('staff:updated', staff);
    return staff;
  }

  async recordStaffAttendance(staffId, status) {
    const staff = await this.Staff.findOne({ staffId });
    if (!staff) throw new Error('Staff not found');

    staff.attendance.todayStatus = status;
    staff.attendance.lastAttendance = new Date();
    staff.attendance.statistics.totalDays += 1;

    if (status === 'present') staff.attendance.statistics.present += 1;
    else if (status === 'absent') staff.attendance.statistics.absent += 1;
    else if (status === 'late') staff.attendance.statistics.late += 1;
    else if (status === 'leave') staff.attendance.statistics.leave += 1;

    const { totalDays, present, late } = staff.attendance.statistics;
    staff.attendance.statistics.attendanceRate = Math.round(((present + late) / totalDays) * 100);

    await staff.save();
    this.emit('staff:attendance', { staffId, status });
    return staff;
  }

  async addStaffTraining(staffId, trainingData) {
    const staff = await this.Staff.findOne({ staffId });
    if (!staff) throw new Error('Staff not found');

    const trainingId = `TRN-${Date.now()}`;
    staff.training.push({ ...trainingData, trainingId });
    await staff.save();

    return staff;
  }

  async addStaffLeave(staffId, leaveData) {
    const staff = await this.Staff.findOne({ staffId });
    if (!staff) throw new Error('Staff not found');

    staff.leaves.leaveHistory.push(leaveData);

    // Update leave balance
    if (leaveData.type === 'annual') {
      staff.leaves.annual.used += leaveData.days;
      staff.leaves.annual.remaining -= leaveData.days;
    }

    await staff.save();
    return staff;
  }

  // ============ Resource Management ============

  async createResource(data) {
    const resourceId = `RES-${Date.now()}`;
    const resource = await this.Resource.create({ ...data, resourceId });
    this.emit('resource:created', resource);
    return resource;
  }

  async getResource(resourceId) {
    return this.Resource.findOne({ resourceId });
  }

  async getResourcesByCenter(centerId) {
    return this.Resource.find({ 'location.centerId': centerId });
  }

  async updateResource(resourceId, data) {
    const resource = await this.Resource.findOneAndUpdate(
      { resourceId },
      { ...data, updatedAt: new Date() },
      { new: true }
    );
    return resource;
  }

  async scheduleMaintenance(resourceId, maintenanceData) {
    const resource = await this.Resource.findOne({ resourceId });
    if (!resource) throw new Error('Resource not found');

    resource.maintenance.nextMaintenanceDate = maintenanceData.nextDate;
    await resource.save();

    this.emit('maintenance:scheduled', { resourceId, nextDate: maintenanceData.nextDate });
    return resource;
  }

  // ============ Reports ============

  async getDashboardData(centerId) {
    const [center, staffCount, resourcesCount] = await Promise.all([
      this.Center.findOne({ centerId }),
      this.Staff.countDocuments({ 'employment.centerId': centerId, status: 'active' }),
      this.Resource.countDocuments({ 'location.centerId': centerId }),
    ]);

    const staffByDepartment = await this.Staff.aggregate([
      { $match: { 'employment.centerId': centerId, status: 'active' } },
      { $group: { _id: '$employment.department', count: { $sum: 1 } } },
    ]);

    const staffByRole = await this.Staff.aggregate([
      { $match: { 'employment.centerId': centerId, status: 'active' } },
      { $group: { _id: '$employment.role', count: { $sum: 1 } } },
    ]);

    return {
      center: center
        ? {
            name: center.info.nameAr,
            type: center.info.type,
            status: center.status,
            capacity: center.info.capacity,
          }
        : null,
      statistics: {
        totalStaff: staffCount,
        totalResources: resourcesCount,
        branches: center ? center.branches.length : 0,
        departments: center ? center.departments.length : 0,
      },
      staffByDepartment: staffByDepartment.reduce((acc, d) => ({ ...acc, [d._id]: d.count }), {}),
      staffByRole: staffByRole.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
    };
  }

  async getStaffReport(centerId) {
    return this.Staff.aggregate([
      { $match: { 'employment.centerId': centerId } },
      {
        $group: {
          _id: {
            department: '$employment.department',
            role: '$employment.role',
          },
          count: { $sum: 1 },
          avgRating: { $avg: '$performance.rating' },
        },
      },
    ]);
  }
}

// Singleton
const centerAdministrationService = new CenterAdministrationService();

module.exports = {
  CenterAdministrationService,
  centerAdministrationService,
  centerConfig,
};
