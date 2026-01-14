/**
 * نظام النقل والمواصلات - نماذج قاعدة البيانات
 * Transport and Shuttle Management System - Database Models
 */

const mongoose = require('mongoose');

// ==================== نموذج الحافلات ====================
// Bus Model
const busSchema = new mongoose.Schema({
  busNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  licensePlate: {
    type: String,
    required: true,
    unique: true,
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
    max: 100,
  },
  model: {
    type: String,
    required: true,
  },
  color: String,
  manufacturer: String,
  yearOfManufacture: Number,
  registrationDate: Date,
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active',
  },
  currentRoute: mongoose.Schema.Types.ObjectId,
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
  },
  assistant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusAssistant',
  },
  gpsTracker: {
    enabled: { type: Boolean, default: true },
    deviceId: String,
    lastLocation: {
      latitude: Number,
      longitude: Number,
      timestamp: Date,
    },
  },
  maintenanceSchedule: [
    {
      date: Date,
      type: String, // تزييت، فحص، إصلاح، إلخ
      cost: Number,
      notes: String,
      completed: Boolean,
      completionDate: Date,
    },
  ],
  documents: {
    registrationCertificate: String,
    insurancePolicyNo: String,
    insuranceExpiry: Date,
    safetyInspectionDate: Date,
    roadworthyCertificate: String,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ==================== نموذج السائقين ====================
// Driver Model
const driverSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
  },
  phone: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
  },
  dateOfBirth: Date,
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
  },
  licenseCategory: {
    type: String,
    enum: ['B', 'C', 'D', 'D1'], // فئات الرخص
    required: true,
  },
  licenseExpiry: {
    type: Date,
    required: true,
  },
  licenseStatus: {
    type: String,
    enum: ['valid', 'expired', 'suspended'],
    default: 'valid',
  },
  address: String,
  city: String,
  nationality: String,
  document: {
    nationalIdNo: String,
    passportNo: String,
  },
  bloodType: String,
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave', 'suspended'],
    default: 'active',
  },
  assignedBus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
  },
  routes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
    },
  ],
  rating: {
    type: Number,
    default: 5,
    min: 1,
    max: 5,
  },
  safetyTrainingDate: Date,
  safetyTrainingExpiry: Date,
  firstAidCertificateDate: Date,
  firstAidCertificateExpiry: Date,
  backgroundCheckDate: Date,
  backgroundCheckStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  salaryInfo: {
    monthlySalary: Number,
    allowances: Number,
    paymentMethod: String,
    accountNo: String,
  },
  attendance: [
    {
      date: Date,
      status: { type: String, enum: ['present', 'absent', 'late', 'leave'] },
      checkInTime: Date,
      checkOutTime: Date,
    },
  ],
  violations: [
    {
      date: Date,
      type: String, // تأخر، تجاوز السرعة، إلخ
      severity: { type: String, enum: ['minor', 'major', 'critical'] },
      description: String,
      action: String,
      fineAmount: Number,
    },
  ],
  documents: {
    licenseImage: String,
    nationalIdImage: String,
    photoFile: String,
    medicalExaminationDate: Date,
    medicalExaminationExpiry: Date,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ==================== نموذج مساعدي الحافلة ====================
// Bus Assistant Model
const busAssistantSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: String,
  phone: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
  },
  dateOfBirth: Date,
  assignedBus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave'],
    default: 'active',
  },
  qualifications: [String],
  firstAidTraining: {
    date: Date,
    expiry: Date,
    certificateNo: String,
  },
  childSafetyTraining: {
    date: Date,
    expiry: Date,
    certificateNo: String,
  },
  backgroundCheckStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ==================== نموذج المسارات ====================
// Route Model
const routeSchema = new mongoose.Schema({
  routeCode: {
    type: String,
    required: true,
    unique: true,
  },
  routeName: {
    type: String,
    required: true,
  },
  description: String,
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  stops: [
    {
      stopNumber: Number,
      stopName: {
        type: String,
        required: true,
      },
      location: {
        latitude: Number,
        longitude: Number,
        address: String,
        areaName: String,
      },
      estimatedArrivalTime: String, // HH:MM
      waitTime: Number, // بالدقائق
      order: Number,
      pickupStudents: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student',
        },
      ],
      dropoffStudents: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student',
        },
      ],
    },
  ],
  startPoint: {
    name: String,
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
  },
  endPoint: {
    name: String,
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
  },
  scheduleType: {
    type: String,
    enum: ['daily', 'weekdays', 'weekends', 'custom'],
    default: 'daily',
  },
  operatingDays: [String], // Sunday to Saturday
  morningShift: {
    startTime: String, // HH:MM
    endTime: String,
    estimatedDuration: Number, // minutes
    assignedBus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
    },
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
    },
    fee: Number,
  },
  eveningShift: {
    startTime: String,
    endTime: String,
    estimatedDuration: Number,
    assignedBus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
    },
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
    },
    fee: Number,
  },
  totalStudents: Number,
  averageOccupancy: Number,
  routeGeometry: {
    type: { type: String, enum: ['LineString'], default: 'LineString' },
    coordinates: [[Number]], // [longitude, latitude]
  },
  routeDistance: Number, // in kilometers
  estimatedTravelTime: Number, // in minutes
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ==================== نموذج تسجيل الطالب في النقل ====================
// Student Transport Registration Model
const studentTransportSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  registrationNumber: {
    type: String,
    unique: true,
    required: true,
  },
  currentRoute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true,
  },
  shift: {
    type: String,
    enum: ['morning', 'evening', 'both'],
    required: true,
  },
  pickupPoint: {
    name: String,
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
  },
  dropoffPoint: {
    name: String,
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'waiting_approval'],
    default: 'waiting_approval',
  },
  monthlyFee: Number,
  paidAmount: Number,
  balanceDue: Number,
  paymentStatus: {
    type: String,
    enum: ['paid', 'partial', 'unpaid', 'overdue'],
    default: 'unpaid',
  },
  parentContact: {
    name: String,
    phone: String,
    email: String,
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String,
  },
  medicalInformation: {
    allergies: String,
    medicines: String,
    specialNeeds: String,
    emergencyMedicalNo: String,
  },
  attendanceRecords: [
    {
      date: Date,
      boardingPoint: String,
      dropoffTime: Date,
      attended: Boolean,
      notes: String,
    },
  ],
  registrationDate: { type: Date, default: Date.now },
  approvalDate: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
  },
  expiryDate: Date,
  renewalHistory: [
    {
      renewalDate: Date,
      renewalYear: Number,
      approvalDate: Date,
    },
  ],
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ==================== نموذج حضور الطالب ====================
// Student Attendance Model
const transportAttendanceSchema = new mongoose.Schema({
  studentTransportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentTransport',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  shift: {
    type: String,
    enum: ['morning', 'evening'],
    required: true,
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excuse'],
    required: true,
  },
  boardingTime: Date,
  dropoffTime: Date,
  boardingPoint: String,
  dropoffPoint: String,
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
  },
  remarks: String,
  createdAt: { type: Date, default: Date.now },
});

// ==================== نموذج الدفع ====================
// Transport Payment Model
const transportPaymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true,
    required: true,
  },
  studentTransportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentTransport',
    required: true,
  },
  month: Number,
  year: Number,
  amount: {
    type: Number,
    required: true,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'check', 'bank_transfer', 'online', 'card'],
    required: true,
  },
  referenceNumber: String,
  notes: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
  },
  approvalDate: Date,
  createdAt: { type: Date, default: Date.now },
});

// ==================== نموذج شكاوى وملاحظات النقل ====================
// Transport Complaint Model
const transportComplaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    unique: true,
    required: true,
  },
  complainantType: {
    type: String,
    enum: ['student', 'parent', 'driver', 'admin'],
    required: true,
  },
  complainant: mongoose.Schema.Types.ObjectId,
  studentTransport: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentTransport',
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
  },
  bus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
  },
  complaintType: {
    type: String,
    enum: ['safety', 'behavior', 'late_arrival', 'damage', 'hygiene', 'other'],
    required: true,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  attachments: [String], // URLs to images/documents
  status: {
    type: String,
    enum: ['open', 'investigating', 'resolved', 'closed'],
    default: 'open',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
  },
  resolution: String,
  resolutionDate: Date,
  followUpActions: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ==================== نموذج تقرير الرحلة ====================
// Trip Report Model
const tripReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    unique: true,
    required: true,
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true,
  },
  bus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: true,
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
  },
  assistant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusAssistant',
  },
  tripDate: {
    type: Date,
    required: true,
  },
  shift: {
    type: String,
    enum: ['morning', 'evening'],
    required: true,
  },
  startTime: Date,
  endTime: Date,
  studentsBoarded: Number,
  studentsDropped: Number,
  fuelUsed: Number,
  mileageStart: Number,
  mileageEnd: Number,
  distance: Number,
  incidents: [
    {
      time: Date,
      type: String,
      severity: String,
      description: String,
      location: String,
    },
  ],
  maintenanceIssues: [
    {
      type: String,
      severity: String,
      description: String,
      actionRequired: String,
    },
  ],
  behaviorNotes: String,
  safetyChecks: {
    seatbeltsInspected: Boolean,
    emergencyExitClear: Boolean,
    fireExtinguisherPresent: Boolean,
    busConditionGood: Boolean,
  },
  fuelExpense: Number,
  maintenanceExpense: Number,
  otherExpenses: Number,
  notes: String,
  createdAt: { type: Date, default: Date.now },
});

// ==================== نموذج رسالة واشعار ====================
// Transport Notification Model
const transportNotificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    unique: true,
    required: true,
  },
  recipientType: {
    type: String,
    enum: ['student', 'parent', 'driver', 'admin', 'all'],
    required: true,
  },
  recipient: mongoose.Schema.Types.ObjectId, // إذا كانت مخصصة
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  notificationType: {
    type: String,
    enum: ['bus_delay', 'bus_arrival', 'route_change', 'fee_payment', 'alert', 'announcement'],
    required: true,
  },
  relatedRoute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
  },
  relatedBus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
  },
  sendDate: { type: Date, default: Date.now },
  readDate: Date,
  isRead: { type: Boolean, default: false },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  attachments: [String],
  createdAt: { type: Date, default: Date.now },
});

// Create Models
const Bus = mongoose.model('Bus', busSchema);
const Driver = mongoose.model('Driver', driverSchema);
const BusAssistant = mongoose.model('BusAssistant', busAssistantSchema);
const Route = mongoose.model('Route', routeSchema);
const StudentTransport = mongoose.model('StudentTransport', studentTransportSchema);
const TransportAttendance = mongoose.model('TransportAttendance', transportAttendanceSchema);
const TransportPayment = mongoose.model('TransportPayment', transportPaymentSchema);
const TransportComplaint = mongoose.model('TransportComplaint', transportComplaintSchema);
const TripReport = mongoose.model('TripReport', tripReportSchema);
const TransportNotification = mongoose.model('TransportNotification', transportNotificationSchema);

module.exports = {
  Bus,
  Driver,
  BusAssistant,
  Route,
  StudentTransport,
  TransportAttendance,
  TransportPayment,
  TransportComplaint,
  TripReport,
  TransportNotification,
};
