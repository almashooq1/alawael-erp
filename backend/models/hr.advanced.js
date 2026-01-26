/**
 * Advanced HR Models
 * نماذج الموارد البشرية المتقدمة
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ============ PERFORMANCE MANAGEMENT ============

const performanceReviewSchema = new Schema({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true,
  },
  reviewerId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  reviewCycle: {
    type: String,
    enum: ['quarterly', 'semi-annual', 'annual'],
    default: 'annual',
  },

  // Performance Ratings (1-5)
  ratings: {
    jobKnowledge: { type: Number, min: 1, max: 5, required: true },
    communication: { type: Number, min: 1, max: 5, required: true },
    teamwork: { type: Number, min: 1, max: 5, required: true },
    initiative: { type: Number, min: 1, max: 5, required: true },
    reliability: { type: Number, min: 1, max: 5, required: true },
    customerService: { type: Number, min: 1, max: 5, required: true },
    productivity: { type: Number, min: 1, max: 5, required: true },
  },

  // Calculated average
  averageRating: String,

  // Comments and Goals
  strengths: String,
  areasForImprovement: String,
  goals: [
    {
      goal: String,
      targetDate: Date,
      status: { type: String, enum: ['pending', 'in-progress', 'completed', 'failed'] },
    },
  ],

  // Review Details
  comments: String,
  overallAssessment: {
    type: String,
    enum: ['excellent', 'good', 'satisfactory', 'needs-improvement', 'unsatisfactory'],
  },
  recommendations: String,

  // Salary Review
  recommendedSalaryIncrease: Number,
  promotionRecommended: Boolean,

  reviewDate: { type: Date, default: Date.now },
  nextReviewDate: Date,
  status: { type: String, enum: ['draft', 'submitted', 'reviewed', 'approved'], default: 'draft' },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

performanceReviewSchema.pre('save', function () {
  if (this.ratings) {
    const values = Object.values(this.ratings)
      .map(v => Number(v))
      .filter(v => !Number.isNaN(v));
    if (values.length) {
      const average = values.reduce((sum, v) => sum + v, 0) / values.length;
      this.averageRating = average.toFixed(2);
    }
  }
});

// ============ LEAVE MANAGEMENT ============

const leaveRequestSchema = new Schema({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true,
  },

  leaveType: {
    type: String,
    enum: ['annual', 'sick', 'maternity', 'paternity', 'unpaid', 'emergency', 'study'],
    required: true,
  },

  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  numberOfDays: Number,

  reason: { type: String, required: true },
  attachments: [String], // URLs to documents

  approverId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  approvalDate: Date,
  approvalComments: String,

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true,
  },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// ============ ATTENDANCE TRACKING ============

const attendanceSchema = new Schema({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true,
  },

  date: { type: Date, required: true, index: true },

  checkInTime: Date,
  checkOutTime: Date,

  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'on-leave'],
    default: 'absent',
    index: true,
  },

  hoursWorked: Number,
  overtime: Number,

  notes: String,
  location: {
    latitude: Number,
    longitude: Number,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Index for efficient queries (allow multiple entries per day for testing/overrides)
attendanceSchema.index({ employeeId: 1, date: 1 });

attendanceSchema.pre('save', function () {
  if (this.checkInTime && this.checkOutTime) {
    const start = new Date(this.checkInTime);
    const end = new Date(this.checkOutTime);
    const hoursWorked = (end - start) / (1000 * 60 * 60);
    this.hoursWorked = parseFloat(hoursWorked.toFixed(2));
    if (hoursWorked > 8) {
      this.overtime = parseFloat((hoursWorked - 8).toFixed(2));
    }
  }
});

// ============ PAYROLL ============

const payrollSchema = new Schema({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true,
  },

  payPeriod: {
    startDate: Date,
    endDate: Date,
  },

  baseSalary: Number,

  // Allowances
  allowances: {
    housing: Number,
    transportation: Number,
    food: Number,
    medical: Number,
    other: Number,
  },
  totalAllowances: Number,

  // Deductions
  deductions: {
    incomeTax: Number,
    socialSecurity: Number,
    insurance: Number,
    loanRepayment: Number,
    other: Number,
  },
  totalDeductions: Number,

  // Overtime
  overtimeHours: Number,
  overtimeRate: Number,
  overtimePay: Number,

  // Bonus
  bonus: Number,
  bonusReason: String,

  // Final Calculation
  grossSalary: Number,
  netSalary: Number,

  // Payment Details
  paymentMethod: { type: String, enum: ['bank-transfer', 'check', 'cash'] },
  paymentDate: Date,
  paymentStatus: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },

  remarks: String,

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// ============ TRAINING & DEVELOPMENT ============

const trainingSchema = new Schema({
  trainingName: {
    type: String,
    required: true,
    index: true,
  },

  description: String,
  category: {
    type: String,
    enum: ['technical', 'soft-skills', 'compliance', 'management', 'other'],
  },

  trainer: String,
  venue: String,

  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  duration: Number, // in hours

  participants: [
    {
      employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
      attendanceStatus: {
        type: String,
        enum: ['pending', 'attended', 'absent', 'partial'],
        default: 'pending',
      },
      score: Number,
      certificateIssued: { type: Boolean, default: false },
    },
  ],

  budget: Number,
  actualCost: Number,

  objectives: [String],
  outcomes: [String],
  feedback: String,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ============ EMPLOYEE BENEFITS ============

const employeeBenefitsSchema = new Schema({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    unique: true,
    index: true,
  },

  healthInsurance: {
    provider: String,
    policyNumber: String,
    coverage: Number,
    dependents: Number,
    active: Boolean,
  },

  retirementPlan: {
    planType: { type: String, enum: ['401k', 'pension', 'other'] },
    employeeContribution: Number,
    employerContribution: Number,
    vested: Boolean,
  },

  stockOptions: {
    grantedShares: Number,
    exercisedShares: Number,
    strikePrice: Number,
    vestedShares: Number,
  },

  paidTimeOff: {
    annualLeave: Number,
    sickLeave: Number,
    personalDays: Number,
    carryover: Number,
  },

  flexibleBenefits: [String], // Array of benefit choices

  enrollmentDate: Date,
  lastUpdated: Date,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ============ DISCIPLINARY ACTIONS ============

const disciplinaryActionSchema = new Schema({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true,
  },

  actionType: {
    type: String,
    enum: ['warning', 'suspension', 'demotion', 'termination'],
    required: true,
  },

  severity: {
    type: String,
    enum: ['minor', 'moderate', 'severe'],
    required: true,
  },

  reason: { type: String, required: true },
  description: String,

  evidenceDocuments: [String],

  issuedDate: { type: Date, default: Date.now },
  effectiveDate: Date,
  expiryDate: Date, // For warnings with time limits

  issuedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
  appealPeriod: { type: Number, default: 30 }, // Days to appeal
  appealed: Boolean,
  appealReason: String,
  appealDecision: String,

  status: {
    type: String,
    enum: ['active', 'appealed', 'overturned', 'expired'],
    default: 'active',
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ============ HR ANALYTICS ============

const hrAnalyticsSchema = new Schema({
  month: { type: String, index: true }, // YYYY-MM

  departmentId: { type: Schema.Types.ObjectId, index: true },

  // Workforce Metrics
  totalEmployees: Number,
  newHires: Number,
  attrition: Number,
  attritionRate: Number,

  // Performance Metrics
  averagePerformanceRating: Number,
  highPerformers: Number,
  needsImprovementCount: Number,

  // Attendance
  avgAttendanceRate: Number,
  totalAbsences: Number,
  totalLateArrivals: Number,

  // Leave
  totalLeaveRequests: Number,
  approvedLeave: Number,
  avgLeageDaysPerEmployee: Number,

  // Payroll
  totalPayrollCost: Number,
  avgSalary: Number,

  // Training
  trainingHoursPerEmployee: Number,
  employeesInTraining: Number,

  // Turnover Predictions
  riskOfTurnover: [{ employeeId: Schema.Types.ObjectId, riskScore: Number }],

  createdAt: { type: Date, default: Date.now },
});

// Create models or use existing ones
const PerformanceReview =
  mongoose.models.PerformanceReview || mongoose.model('PerformanceReview', performanceReviewSchema);
const LeaveRequest =
  mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', leaveRequestSchema);
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
const Payroll = mongoose.models.PayrollAdvanced || mongoose.model('PayrollAdvanced', payrollSchema);
const Training =
  mongoose.models.TrainingAdvanced || mongoose.model('TrainingAdvanced', trainingSchema);
const EmployeeBenefits =
  mongoose.models.EmployeeBenefits || mongoose.model('EmployeeBenefits', employeeBenefitsSchema);
const DisciplinaryAction =
  mongoose.models.DisciplinaryAction ||
  mongoose.model('DisciplinaryAction', disciplinaryActionSchema);
const HRAnalytics = mongoose.models.HRAnalytics || mongoose.model('HRAnalytics', hrAnalyticsSchema);

module.exports = {
  PerformanceReview,
  LeaveRequest,
  Attendance,
  Payroll,
  Training,
  EmployeeBenefits,
  DisciplinaryAction,
  HRAnalytics,
};
