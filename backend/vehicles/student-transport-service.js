/**
 * Student Transport Service - خدمة نقل الطلاب
 * Comprehensive School Bus Management System for Saudi Arabia
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');

/**
 * Student Transport Configuration
 */
const transportConfig = {
  // أنواع المركبات المدرسية
  vehicleTypes: {
    small_bus: { label: 'حافلة صغيرة', capacity: 14, code: 'SB' },
    medium_bus: { label: 'حافلة متوسطة', capacity: 30, code: 'MB' },
    large_bus: { label: 'حافلة كبيرة', capacity: 45, code: 'LB' },
    mini_van: { label: 'فان صغير', capacity: 8, code: 'MV' },
  },
  
  // حالات الرحلة
  tripStatuses: {
    scheduled: { label: 'مجدولة', color: 'blue' },
    in_progress: { label: 'جارية', color: 'green' },
    completed: { label: 'مكتملة', color: 'gray' },
    cancelled: { label: 'ملغاة', color: 'red' },
    delayed: { label: 'متأخرة', color: 'yellow' },
  },
  
  // أنواع الرحلات
  tripTypes: {
    morning_pickup: { label: 'التوصيل الصباحي', time: '06:00-08:00' },
    afternoon_dropoff: { label: 'الإياب المسائي', time: '12:00-15:00' },
    activity_trip: { label: 'رحلة نشاط', time: 'flexible' },
    field_trip: { label: 'رحلة ميدانية', time: 'flexible' },
  },
  
  // الحالات الطارئة
  emergencyTypes: {
    breakdown: { label: 'عطل في الحافلة', priority: 'high' },
    accident: { label: 'حادث', priority: 'critical' },
    student_missing: { label: 'طالب مفقود', priority: 'critical' },
    late_arrival: { label: 'تأخير في الوصول', priority: 'medium' },
    weather_delay: { label: 'تأخير بسبب الطقس', priority: 'low' },
  },
  
  // المراحل الدراسية
  gradeLevels: {
    kindergarten: { label: 'رياض الأطفال', ageRange: [4, 6] },
    elementary: { label: 'ابتدائي', ageRange: [6, 12] },
    middle: { label: 'متوسط', ageRange: [12, 15] },
    high: { label: 'ثانوي', ageRange: [15, 18] },
  },
};

/**
 * School Bus Schema - حافلة المدرسة
 */
const SchoolBusSchema = new mongoose.Schema({
  // معلومات أساسية
  busId: { type: String, unique: true },
  busNumber: String,
  
  // المركبة
  vehicle: {
    plateNumber: String,
    plateLetters: String,
    region: String,
    type: { type: String, enum: Object.keys(transportConfig.vehicleTypes) },
    capacity: Number,
    make: String,
    model: String,
    year: Number,
    color: String,
  },
  
  // المدرسة
  school: {
    schoolId: String,
    name: String,
    region: String,
    city: String,
    district: String,
  },
  
  // السائق
  driver: {
    driverId: String,
    name: String,
    nationalId: String,
    mobile: String,
    licenseNumber: String,
    licenseExpiry: Date,
    photo: String,
    rating: { type: Number, default: 5 },
  },
  
  // المرافقة
  supervisor: {
    supervisorId: String,
    name: String,
    nationalId: String,
    mobile: String,
    photo: String,
  },
  
  // التتبع
  tracking: {
    enabled: { type: Boolean, default: true },
    deviceId: String,
    currentLocation: {
      latitude: Number,
      longitude: Number,
      speed: Number,
      timestamp: Date,
    },
    lastStop: String,
    nextStop: String,
    estimatedArrival: Date,
  },
  
  // السلامة
  safety: {
    fireExtinguisherExpiry: Date,
    firstAidKit: { type: Boolean, default: true },
    emergencyExits: Number,
    seatbelts: { type: Boolean, default: true },
    gpsEnabled: { type: Boolean, default: true },
    cameraCount: Number,
    lastInspection: Date,
    nextInspection: Date,
  },
  
  // الحالة
  status: {
    type: String,
    enum: ['active', 'maintenance', 'out_of_service'],
    default: 'active',
  },
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'school_buses',
});

// Indexes
SchoolBusSchema.index({ busId: 1 });
SchoolBusSchema.index({ 'school.schoolId': 1 });
SchoolBusSchema.index({ 'driver.driverId': 1 });

/**
 * Student Schema - الطالب
 */
const StudentSchema = new mongoose.Schema({
  // معلومات أساسية
  studentId: { type: String, unique: true },
  
  // البيانات الشخصية
  personal: {
    firstNameAr: String,
    lastNameAr: String,
    firstNameEn: String,
    lastNameEn: String,
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female'] },
    nationality: String,
    photo: String,
  },
  
  // معلومات المدرسة
  education: {
    schoolId: String,
    schoolName: String,
    gradeLevel: { type: String, enum: Object.keys(transportConfig.gradeLevels) },
    grade: String,
    classroom: String,
    academicYear: String,
  },
  
  // ولي الأمر
  guardian: {
    fatherName: String,
    fatherMobile: String,
    fatherEmail: String,
    fatherNationalId: String,
    motherName: String,
    motherMobile: String,
    emergencyContact: {
      name: String,
      relation: String,
      mobile: String,
    },
    alternateContacts: [{
      name: String,
      relation: String,
      mobile: String,
    }],
  },
  
  // العنوان
  address: {
    region: String,
    city: String,
    district: String,
    street: String,
    buildingNumber: String,
    additionalInfo: String,
    coordinates: { lat: Number, lng: Number },
    googleMapsUrl: String,
  },
  
  // نقطة التوصيل
  pickup: {
    busId: String,
    busNumber: String,
    stopId: String,
    stopName: String,
    pickupTime: String,
    dropoffTime: String,
    order: Number, // ترتيب النزول/الصعود
  },
  
  // الحالة الطبية
  medical: {
    allergies: [String],
    medications: [String],
    conditions: [String],
    specialNeeds: String,
    doctorName: String,
    doctorPhone: String,
    hospitalPreference: String,
  },
  
  // الأذونات
  permissions: {
    pickupPersons: [{
      name: String,
      relation: String,
      nationalId: String,
      mobile: String,
      photo: String,
      authorized: { type: Boolean, default: true },
    }],
    selfPickup: { type: Boolean, default: false },
    selfDropoff: { type: Boolean, default: false },
  },
  
  // الحضور
  attendance: {
    todayStatus: { type: String, enum: ['present', 'absent', 'late', 'excused'] },
    lastPickup: Date,
    lastDropoff: Date,
    monthlyStats: {
      present: { type: Number, default: 0 },
      absent: { type: Number, default: 0 },
      late: { type: Number, default: 0 },
    },
  },
  
  // الاشتراك
  subscription: {
    active: { type: Boolean, default: true },
    startDate: Date,
    endDate: Date,
    planType: { type: String, enum: ['one_way', 'two_way'] },
    fee: Number,
    paid: { type: Boolean, default: false },
  },
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'students',
});

// Indexes
StudentSchema.index({ studentId: 1 });
StudentSchema.index({ 'education.schoolId': 1 });
StudentSchema.index({ 'pickup.busId': 1 });

/**
 * Bus Trip Schema - رحلة الحافلة
 */
const BusTripSchema = new mongoose.Schema({
  // معرف الرحلة
  tripId: { type: String, unique: true },
  
  // المعلومات الأساسية
  tripInfo: {
    busId: String,
    busNumber: String,
    schoolId: String,
    schoolName: String,
    type: { type: String, enum: Object.keys(transportConfig.tripTypes) },
    date: Date,
  },
  
  // المواعيد
  schedule: {
    plannedStartTime: Date,
    plannedEndTime: Date,
    actualStartTime: Date,
    actualEndTime: Date,
    estimatedDuration: Number, // minutes
  },
  
  // المسار والمحطات
  route: {
    routeId: String,
    routeName: String,
    totalDistance: Number, // km
    stops: [{
      stopId: String,
      stopName: String,
      order: Number,
      location: { lat: Number, lng: Number },
      plannedTime: Date,
      actualTime: Date,
      students: [{
        studentId: String,
        studentName: String,
        status: { type: String, enum: ['picked_up', 'dropped_off', 'absent', 'missed'] },
        time: Date,
      }],
      completed: { type: Boolean, default: false },
    }],
  },
  
  // الطلاب في الرحلة
  students: [{
    studentId: String,
    studentName: String,
    grade: String,
    pickupStop: String,
    dropoffStop: String,
    status: { type: String, enum: ['on_board', 'picked_up', 'dropped_off', 'absent'] },
    pickedUpAt: Date,
    droppedOffAt: Date,
  }],
  
  // الطاقم
  crew: {
    driver: {
      driverId: String,
      name: String,
      mobile: String,
    },
    supervisor: {
      supervisorId: String,
      name: String,
      mobile: String,
    },
  },
  
  // التتبع
  tracking: {
    path: [{
      latitude: Number,
      longitude: Number,
      speed: Number,
      timestamp: Date,
    }],
    currentLocation: {
      latitude: Number,
      longitude: Number,
      speed: Number,
      timestamp: Date,
    },
  },
  
  // الإحصائيات
  stats: {
    totalStudents: Number,
    pickedUp: Number,
    droppedOff: Number,
    absent: Number,
    missed: Number,
    distanceTraveled: Number,
    fuelConsumed: Number,
  },
  
  // الحالة
  status: {
    type: String,
    enum: Object.keys(transportConfig.tripStatuses),
    default: 'scheduled',
  },
  
  // ملاحظات
  notes: String,
  incidents: [{
    type: String,
    description: String,
    reportedBy: String,
    reportedAt: Date,
    resolvedAt: Date,
    resolution: String,
  }],
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'bus_trips',
});

// Indexes
BusTripSchema.index({ tripId: 1 });
BusTripSchema.index({ 'tripInfo.busId': 1, 'tripInfo.date': 1 });
BusTripSchema.index({ 'tripInfo.schoolId': 1, 'tripInfo.date': 1 });

/**
 * Bus Route Schema - مسار الحافلة
 */
const BusRouteSchema = new mongoose.Schema({
  // معلومات المسار
  routeId: { type: String, unique: true },
  routeNumber: String,
  routeName: String,
  
  // المدرسة
  school: {
    schoolId: String,
    schoolName: String,
  },
  
  // الحافلة
  bus: {
    busId: String,
    busNumber: String,
  },
  
  // المحطات
  stops: [{
    stopId: String,
    stopName: String,
    order: Number,
    location: { lat: Number, lng: Number },
    address: String,
    pickupTime: String,
    dropoffTime: String,
    studentsCount: Number,
    active: { type: Boolean, default: true },
  }],
  
  // المعلومات
  info: {
    totalDistance: Number,
    estimatedDuration: Number,
    totalStops: Number,
    totalStudents: Number,
  },
  
  // الجدول
  schedule: {
    morningStartTime: String,
    morningEndTime: String,
    afternoonStartTime: String,
    afternoonEndTime: String,
    activeDays: [{ type: String, enum: ['sun', 'mon', 'tue', 'wed', 'thu'] }],
  },
  
  // الحالة
  active: { type: Boolean, default: true },
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'bus_routes',
});

/**
 * Student Transport Service Class
 */
class StudentTransportService extends EventEmitter {
  constructor() {
    super();
    this.Bus = null;
    this.Student = null;
    this.Trip = null;
    this.Route = null;
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.Bus = connection.model('SchoolBus', SchoolBusSchema);
    this.Student = connection.model('Student', StudentSchema);
    this.Trip = connection.model('BusTrip', BusTripSchema);
    this.Route = connection.model('BusRoute', BusRouteSchema);
    console.log('✅ Student Transport Service initialized');
  }
  
  // ============ Bus Management ============
  
  async createBus(data) {
    const busId = `BUS-${Date.now()}`;
    const bus = await this.Bus.create({ ...data, busId });
    this.emit('bus:created', bus);
    return bus;
  }
  
  async getBus(busId) {
    return this.Bus.findOne({ busId });
  }
  
  async getBusesBySchool(schoolId) {
    return this.Bus.find({ 'school.schoolId': schoolId });
  }
  
  async updateBusLocation(busId, location) {
    const bus = await this.Bus.findOneAndUpdate(
      { busId },
      { 'tracking.currentLocation': { ...location, timestamp: new Date() } },
      { new: true }
    );
    this.emit('bus:location_updated', { busId, location });
    return bus;
  }
  
  async getActiveBuses(schoolId) {
    return this.Bus.find({
      'school.schoolId': schoolId,
      status: 'active',
    });
  }
  
  // ============ Student Management ============
  
  async createStudent(data) {
    const studentId = `STU-${Date.now()}`;
    const student = await this.Student.create({ ...data, studentId });
    this.emit('student:created', student);
    return student;
  }
  
  async getStudent(studentId) {
    return this.Student.findOne({ studentId });
  }
  
  async getStudentsByBus(busId) {
    return this.Student.find({ 'pickup.busId': busId });
  }
  
  async getStudentsBySchool(schoolId) {
    return this.Student.find({ 'education.schoolId': schoolId });
  }
  
  async updateStudentPickup(studentId, pickupData) {
    return this.Student.findOneAndUpdate(
      { studentId },
      { pickup: pickupData, updatedAt: new Date() },
      { new: true }
    );
  }
  
  async markStudentAttendance(studentId, status) {
    const student = await this.Student.findOneAndUpdate(
      { studentId },
      {
        'attendance.todayStatus': status,
        updatedAt: new Date(),
      },
      { new: true }
    );
    this.emit('student:attendance', { studentId, status });
    return student;
  }
  
  // ============ Trip Management ============
  
  async createTrip(tripData) {
    const tripId = `TRIP-${Date.now()}`;
    const trip = await this.Trip.create({ ...tripData, tripId });
    this.emit('trip:created', trip);
    return trip;
  }
  
  async startTrip(tripId) {
    const trip = await this.Trip.findOneAndUpdate(
      { tripId },
      {
        status: 'in_progress',
        'schedule.actualStartTime': new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    );
    this.emit('trip:started', trip);
    return trip;
  }
  
  async completeTrip(tripId, stats) {
    const trip = await this.Trip.findOneAndUpdate(
      { tripId },
      {
        status: 'completed',
        'schedule.actualEndTime': new Date(),
        stats,
        updatedAt: new Date(),
      },
      { new: true }
    );
    this.emit('trip:completed', trip);
    return trip;
  }
  
  async updateTripLocation(tripId, location) {
    const trip = await this.Trip.findById(tripId);
    if (trip) {
      trip.tracking.path.push({ ...location, timestamp: new Date() });
      trip.tracking.currentLocation = { ...location, timestamp: new Date() };
      await trip.save();
    }
    return trip;
  }
  
  async recordStudentPickup(tripId, studentId) {
    const trip = await this.Trip.findById(tripId);
    if (!trip) throw new Error('Trip not found');
    
    const student = trip.students.find(s => s.studentId === studentId);
    if (student) {
      student.status = 'picked_up';
      student.pickedUpAt = new Date();
    }
    
    await trip.save();
    this.emit('student:picked_up', { tripId, studentId });
    return trip;
  }
  
  async recordStudentDropoff(tripId, studentId) {
    const trip = await this.Trip.findById(tripId);
    if (!trip) throw new Error('Trip not found');
    
    const student = trip.students.find(s => s.studentId === studentId);
    if (student) {
      student.status = 'dropped_off';
      student.droppedOffAt = new Date();
    }
    
    await trip.save();
    this.emit('student:dropped_off', { tripId, studentId });
    return trip;
  }
  
  async getTodayTrips(schoolId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.Trip.find({
      'tripInfo.schoolId': schoolId,
      'tripInfo.date': { $gte: today, $lt: tomorrow },
    });
  }
  
  async getActiveTrips(schoolId) {
    return this.Trip.find({
      'tripInfo.schoolId': schoolId,
      status: 'in_progress',
    });
  }
  
  // ============ Route Management ============
  
  async createRoute(routeData) {
    const routeId = `ROUTE-${Date.now()}`;
    const route = await this.Route.create({ ...routeData, routeId });
    this.emit('route:created', route);
    return route;
  }
  
  async getRoute(routeId) {
    return this.Route.findOne({ routeId });
  }
  
  async getRoutesBySchool(schoolId) {
    return this.Route.find({ 'school.schoolId': schoolId, active: true });
  }
  
  async optimizeRoute(routeId) {
    const route = await this.Route.findOne({ routeId });
    if (!route) throw new Error('Route not found');
    
    // Simple optimization: sort stops by order
    route.stops.sort((a, b) => a.order - b.order);
    await route.save();
    
    this.emit('route:optimized', route);
    return route;
  }
  
  // ============ Statistics ============
  
  async getTransportStatistics(schoolId) {
    const [buses, students, todayTrips, activeTrips] = await Promise.all([
      this.Bus.countDocuments({ 'school.schoolId': schoolId }),
      this.Student.countDocuments({ 'education.schoolId': schoolId, 'subscription.active': true }),
      this.Trip.countDocuments({
        'tripInfo.schoolId': schoolId,
        'tripInfo.date': { $gte: new Date().setHours(0, 0, 0, 0) },
      }),
      this.Trip.countDocuments({
        'tripInfo.schoolId': schoolId,
        status: 'in_progress',
      }),
    ]);
    
    return {
      totalBuses: buses,
      totalStudents: students,
      todayTrips,
      activeTrips,
    };
  }
}

// Singleton
const studentTransportService = new StudentTransportService();

module.exports = {
  StudentTransportService,
  studentTransportService,
  transportConfig,
};