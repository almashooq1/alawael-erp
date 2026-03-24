/* eslint-disable no-unused-vars */
/**
 * فهرس النماذج المحسن - Enhanced Models Index
 * نظام الألوائل للتأهيل وإعادة التأهيل
 */

const mongoose = require('mongoose');

// النماذج الأساسية
const User = require('./User');
const Beneficiary = require('./Beneficiary.enhanced');

// نماذج الفروع والأقسام
const branchSchema = new mongoose.Schema({
  nameAr: { type: String, required: true },
  nameEn: String,
  code: { type: String, unique: true },
  region: String,
  city: String,
  address: String,
  phone: String,
  email: String,
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  capacity: { type: Number, default: 100 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  location: {
    lat: Number,
    lng: Number,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Branch = mongoose.models.Branch || mongoose.model('Branch', branchSchema);

// نموذج القسم
const departmentSchema = new mongoose.Schema({
  nameAr: { type: String, required: true },
  nameEn: String,
  code: { type: String, unique: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  description: String,
  budget: Number,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
});

const Department = mongoose.models.Department || mongoose.model('Department', departmentSchema);

// نموذج نوع الإعاقة
const disabilityTypeSchema = new mongoose.Schema({
  nameAr: { type: String, required: true },
  nameEn: String,
  code: { type: String, unique: true, required: true },
  category: {
    type: String,
    enum: [
      'physical',
      'sensory',
      'cognitive',
      'developmental',
      'genetic',
      'multiple',
      'communication',
    ],
  },
  description: String,
  services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
});

const DisabilityType = mongoose.models.DisabilityType || mongoose.model('DisabilityType', disabilityTypeSchema);

// نموذج الخدمة
const serviceSchema = new mongoose.Schema({
  nameAr: { type: String, required: true },
  nameEn: String,
  code: { type: String, unique: true },
  category: {
    type: String,
    enum: [
      'physical_therapy',
      'occupational_therapy',
      'speech_therapy',
      'psychology',
      'special_education',
      'vocational',
      'other',
    ],
  },
  description: String,
  duration: { type: Number, default: 45 }, // بالدقائق
  price: Number,
  requiredEquipment: [String],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
});

const Service = mongoose.models.Service || mongoose.model('Service', serviceSchema);

// نموذج الخطة التأهيلية
const rehabilitationPlanSchema = new mongoose.Schema({
  planNumber: { type: String, unique: true },
  beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
  planType: {
    type: String,
    enum: ['initial', 'periodic', 'intensive', 'maintenance'],
    default: 'initial',
  },
  startDate: { type: Date, required: true },
  endDate: Date,
  services: [
    {
      service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
      frequency: {
        sessionsPerWeek: { type: Number, default: 3 },
        sessionDuration: { type: Number, default: 45 },
      },
      therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      notes: String,
    },
  ],
  goals: [
    {
      title: { type: String, required: true },
      description: String,
      category: {
        type: String,
        enum: [
          'physical',
          'cognitive',
          'communication',
          'social',
          'behavioral',
          'academic',
          'vocational',
          'daily_living',
        ],
      },
      targetDate: Date,
      priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
      status: {
        type: String,
        enum: ['not_started', 'in_progress', 'achieved', 'discontinued'],
        default: 'not_started',
      },
      progress: { type: Number, min: 0, max: 100, default: 0 },
    },
  ],
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft',
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const RehabilitationPlan = mongoose.models.RehabilitationPlan || mongoose.model('RehabilitationPlan', rehabilitationPlanSchema);

// نموذج الجلسة العلاجية
const therapySessionSchema = new mongoose.Schema({
  sessionNumber: { type: String, unique: true },
  beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'RehabilitationPlan' },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledDate: { type: Date, required: true },
  scheduledTime: { type: String, required: true },
  actualStartTime: Date,
  actualEndTime: Date,
  duration: Number,
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapyRoom' },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled',
  },
  notes: String,
  progressNotes: String,
  attendanceVerified: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

const TherapySession = mongoose.models.TherapySession || mongoose.model('TherapySession', therapySessionSchema);

// نموذج غرفة العلاج
const therapyRoomSchema = new mongoose.Schema({
  nameAr: { type: String, required: true },
  nameEn: String,
  code: { type: String, unique: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  roomType: {
    type: String,
    enum: ['individual', 'group', 'gym', 'sensory', 'occupational', 'speech', 'other'],
  },
  capacity: { type: Number, default: 1 },
  equipment: [String],
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance', 'unavailable'],
    default: 'available',
  },
  createdAt: { type: Date, default: Date.now },
});

const TherapyRoom = mongoose.models.TherapyRoom || mongoose.model('TherapyRoom', therapyRoomSchema);

// نموذج المركبة
const vehicleSchema = new mongoose.Schema({
  vehicleNumber: { type: String, unique: true, required: true },
  plateNumber: { type: String, unique: true, required: true },
  vehicleType: String,
  brand: String,
  model: String,
  year: Number,
  color: String,
  seatsCapacity: { type: Number, default: 10 },
  fuelType: { type: String, enum: ['gasoline', 'diesel', 'electric', 'hybrid'] },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'out_of_service', 'sold'],
    default: 'active',
  },
  registrationExpiry: Date,
  insuranceExpiry: Date,
  currentMileage: Number,
  lastServiceDate: Date,
  nextServiceDate: Date,
  gpsDeviceId: String,
  features: [String],
  createdAt: { type: Date, default: Date.now },
});

const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);

// نموذج الحضور
const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  checkIn: Date,
  checkOut: Date,
  breakDuration: { type: Number, default: 0 },
  totalHours: Number,
  overtimeHours: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'early_leave', 'leave', 'holiday', 'remote'],
    default: 'present',
  },
  checkInLocation: { lat: Number, lng: Number },
  checkOutLocation: { lat: Number, lng: Number },
  checkInIp: String,
  checkOutIp: String,
  notes: String,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

// نموذج الإجازة
const leaveSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalDays: Number,
  reason: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectionReason: String,
  attachmentUrl: String,
  createdAt: { type: Date, default: Date.now },
});

const Leave = mongoose.models.Leave || mongoose.model('Leave', leaveSchema);

// نموذج نوع الإجازة
const leaveTypeSchema = new mongoose.Schema({
  nameAr: { type: String, required: true },
  nameEn: String,
  code: { type: String, unique: true },
  annualAllowance: Number,
  isPaid: { type: Boolean, default: true },
  carryOver: { type: Boolean, default: true },
  maxCarryOver: { type: Number, default: 0 },
  requiresApproval: { type: Boolean, default: true },
  genderRestriction: { type: String, enum: ['all', 'male', 'female'] },
  description: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
});

const LeaveType = mongoose.models.LeaveType || mongoose.model('LeaveType', leaveTypeSchema);

// نموذج الراتب
const salarySchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  basicSalary: { type: Number, required: true },
  housingAllowance: { type: Number, default: 0 },
  transportAllowance: { type: Number, default: 0 },
  otherAllowances: { type: Number, default: 0 },
  overtimeAmount: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  gosiEmployee: { type: Number, default: 0 },
  gosiEmployer: { type: Number, default: 0 },
  netSalary: { type: Number, required: true },
  workingDays: { type: Number, default: 30 },
  absentDays: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'approved', 'paid', 'cancelled'],
    default: 'draft',
  },
  paidAt: Date,
  paymentMethod: { type: String, enum: ['cash', 'card', 'transfer', 'check'] },
  bankReference: String,
  notes: String,
  createdAt: { type: Date, default: Date.now },
});

salarySchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

const Salary = mongoose.models.Salary || mongoose.model('Salary', salarySchema);

// تصدير جميع النماذج
module.exports = {
  // النماذج الأساسية
  User,
  Beneficiary,
  Branch,
  Department,

  // نماذج التأهيل
  DisabilityType,
  Service,
  RehabilitationPlan,
  TherapySession,
  TherapyRoom,

  // نماذج الموارد البشرية
  Attendance,
  Leave,
  LeaveType,
  Salary,

  // نماذج النقل
  Vehicle,
};
