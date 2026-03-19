/* eslint-disable no-unused-vars */
/**
 * 📊 Unified Models Index - فهرس النماذج الموحد
 * نقطة تجميع واحدة لجميع النماذج
 * @version 2.0.0
 */

const mongoose = require('mongoose');

// ============================================
// مخطط المستخدم - User Schema
// ============================================

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'manager', 'user'], default: 'user' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    permissions: [{ type: String }],
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    profile: {
      phone: String,
      avatar: String,
      address: String,
    },
  },
  { timestamps: true }
);

// ============================================
// مخطط الموظف - Employee Schema
// ============================================

const EmployeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    position: { type: String, required: true },
    salary: { type: Number, default: 0 },
    hireDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'on_leave', 'terminated'], default: 'active' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ============================================
// مخطط القسم - Department Schema
// ============================================

const DepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    description: { type: String },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    parentDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    budget: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ============================================
// مخطط الحضور - Attendance Schema
// ============================================

const AttendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'early_leave'],
      default: 'present',
    },
    notes: { type: String },
    location: {
      latitude: Number,
      longitude: Number,
    },
  },
  { timestamps: true }
);

// فهرس مركب لمنع التكرار
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

// ============================================
// مخطط الإجازة - Leave Schema
// ============================================

const LeaveSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    type: { type: String, enum: ['annual', 'sick', 'emergency', 'unpaid'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true },
    reason: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

// ============================================
// مخطط الإشعار - Notification Schema
// ============================================

const NotificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['system', 'hr', 'finance', 'task', 'alert'], default: 'system' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
    actionUrl: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// ============================================
// مخطط المعاملة المالية - Transaction Schema
// ============================================

const TransactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    description: { type: String },
    date: { type: Date, default: Date.now },
    reference: { type: String },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

// ============================================
// مخطط كشف الرواتب - Payroll Schema
// ============================================

const PayrollSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    baseSalary: { type: Number, required: true },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'approved', 'paid'], default: 'draft' },
    paidAt: { type: Date },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// فهرس مركب
PayrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

// ============================================
// إنشاء النماذج
// ============================================

const models = {};

// إنشاء النماذج بأمان
try {
  models.User = mongoose.models.User || mongoose.model('User', UserSchema);
} catch (e) {
  models.User = mongoose.model('User');
}

try {
  models.Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);
} catch (e) {
  models.Employee = mongoose.model('Employee');
}

try {
  models.Department = mongoose.models.Department || mongoose.model('Department', DepartmentSchema);
} catch (e) {
  models.Department = mongoose.model('Department');
}

try {
  models.Attendance = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
} catch (e) {
  models.Attendance = mongoose.model('Attendance');
}

try {
  models.Leave = mongoose.models.Leave || mongoose.model('Leave', LeaveSchema);
} catch (e) {
  models.Leave = mongoose.model('Leave');
}

try {
  models.Notification =
    mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
} catch (e) {
  models.Notification = mongoose.model('Notification');
}

try {
  models.Transaction =
    mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
} catch (e) {
  models.Transaction = mongoose.model('Transaction');
}

try {
  models.Payroll = mongoose.models.Payroll || mongoose.model('Payroll', PayrollSchema);
} catch (e) {
  models.Payroll = mongoose.model('Payroll');
}

// ============================================
// تصدير النماذج
// ============================================

module.exports = {
  ...models,

  // المخططات (للاختبار والتخصيص)
  schemas: {
    User: UserSchema,
    Employee: EmployeeSchema,
    Department: DepartmentSchema,
    Attendance: AttendanceSchema,
    Leave: LeaveSchema,
    Notification: NotificationSchema,
    Transaction: TransactionSchema,
    Payroll: PayrollSchema,
  },
};
