/**
 * ============================================
 * EMPLOYEE MANAGEMENT SYSTEM
 * نظام إدارة الموظفين الذكي المتكامل
 * ============================================
 */

import { Schema, model, Document } from 'mongoose';
import * as crypto from 'crypto';

/**
 * Employee Document Interface
 */
export interface IEmployee extends Document {
  // Basic Information
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  dateOfBirth: Date;
  gender: 'Male' | 'Female' | 'Other';

  // Employment Information
  department: string;
  position: string;
  jobTitle: string;
  reportingManager: string;
  employmentType: 'Full-Time' | 'Part-Time' | 'Contract' | 'Intern';
  hireDate: Date;
  contractEndDate?: Date;
  workLocation: string;
  officeLocation?: string;

  // Contact & Address
  personalEmail: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };

  // Professional Details
  skills: string[];
  certifications: Array<{
    name: string;
    issueDate: Date;
    expiryDate?: Date;
    certificateNumber: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    graduationYear: number;
    field: string;
  }>;
  languages: Array<{
    language: string;
    proficiency: 'Basic' | 'Intermediate' | 'Advanced' | 'Fluent';
  }>;

  // Performance & Evaluation
  performanceRating: number; // 1-5
  lastEvaluationDate?: Date;
  evaluationHistory: Array<{
    date: Date;
    rating: number;
    reviewer: string;
    comments: string;
  }>;
  kpis: Array<{
    metric: string;
    target: number;
    actual?: number;
    quarter: string;
  }>;

  // Compensation & Benefits
  salary: number;
  salaryFrequency: 'Monthly' | 'Quarterly' | 'Annual';
  currency: string;
  benefits: string[];
  lastSalaryReview?: Date;
  bonus?: number;
  bonusFrequency?: string;

  // Attendance & Leave
  totalLeaveDays: number;
  usedLeaveDays: number;
  remainingLeaveDays: number;
  leaveHistory: Array<{
    startDate: Date;
    endDate: Date;
    leaveType: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    reason?: string;
  }>;
  attendanceRecord: Array<{
    date: Date;
    status: 'Present' | 'Absent' | 'Late' | 'Half-Day';
    hoursWorked?: number;
  }>;

  // Status & Activity
  status: 'Active' | 'Inactive' | 'On-Leave' | 'Resigned' | 'Terminated';
  employmentStatus: 'Probation' | 'Confirmed' | 'Senior';
  resignationDate?: Date;
  terminationDate?: Date;
  terminationReason?: string;

  // Documents & Files
  documents: Array<{
    name: string;
    type: string;
    uploadDate: Date;
    fileUrl: string;
    expiryDate?: Date;
  }>;

  // AI & Intelligence Features
  aiInsights: {
    performancePrediction: number;
    retentionRisk: number;
    developmentAreas: string[];
    recommendedTrainings: string[];
    careerPathSuggestions: string[];
    lastUpdated: Date;
  };

  // Internal Management
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;
  deletedAt?: Date;
  isArchived: boolean;
}

/**
 * Employee Schema
 */
const EmployeeSchema = new Schema<IEmployee>(
  {
    // Basic Information
    employeeId: {
      type: String,
      unique: true,
      required: true,
      index: true,
      default: () => 'EMP-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    nationality: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },

    // Employment Information
    department: { type: String, required: true, index: true },
    position: { type: String, required: true },
    jobTitle: { type: String, required: true },
    reportingManager: { type: String, index: true },
    employmentType: {
      type: String,
      enum: ['Full-Time', 'Part-Time', 'Contract', 'Intern'],
      required: true,
    },
    hireDate: { type: Date, required: true, index: true },
    contractEndDate: { type: Date },
    workLocation: { type: String, required: true },
    officeLocation: { type: String },

    // Contact & Address
    personalEmail: { type: String, lowercase: true },
    emergencyContact: {
      name: { type: String, required: true },
      relationship: { type: String, required: true },
      phone: { type: String, required: true },
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String, required: true },
    },

    // Professional Details
    skills: [{ type: String }],
    certifications: [
      {
        name: { type: String },
        issueDate: { type: Date },
        expiryDate: { type: Date },
        certificateNumber: { type: String },
      },
    ],
    education: [
      {
        degree: { type: String },
        institution: { type: String },
        graduationYear: { type: Number },
        field: { type: String },
      },
    ],
    languages: [
      {
        language: { type: String },
        proficiency: { type: String, enum: ['Basic', 'Intermediate', 'Advanced', 'Fluent'] },
      },
    ],

    // Performance & Evaluation
    performanceRating: { type: Number, min: 1, max: 5, default: 0 },
    lastEvaluationDate: { type: Date },
    evaluationHistory: [
      {
        date: { type: Date },
        rating: { type: Number, min: 1, max: 5 },
        reviewer: { type: String },
        comments: { type: String },
      },
    ],
    kpis: [
      {
        metric: { type: String },
        target: { type: Number },
        actual: { type: Number },
        quarter: { type: String },
      },
    ],

    // Compensation & Benefits
    salary: { type: Number, required: true },
    salaryFrequency: { type: String, enum: ['Monthly', 'Quarterly', 'Annual'], default: 'Monthly' },
    currency: { type: String, default: 'SAR' },
    benefits: [{ type: String }],
    lastSalaryReview: { type: Date },
    bonus: { type: Number },
    bonusFrequency: { type: String },

    // Attendance & Leave
    totalLeaveDays: { type: Number, default: 30 },
    usedLeaveDays: { type: Number, default: 0 },
    remainingLeaveDays: { type: Number, default: 30 },
    leaveHistory: [
      {
        startDate: { type: Date },
        endDate: { type: Date },
        leaveType: { type: String },
        status: { type: String, enum: ['Pending', 'Approved', 'Rejected'] },
        reason: { type: String },
      },
    ],
    attendanceRecord: [
      {
        date: { type: Date },
        status: { type: String, enum: ['Present', 'Absent', 'Late', 'Half-Day'] },
        hoursWorked: { type: Number },
      },
    ],

    // Status & Activity
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'On-Leave', 'Resigned', 'Terminated'],
      default: 'Active',
      index: true,
    },
    employmentStatus: {
      type: String,
      enum: ['Probation', 'Confirmed', 'Senior'],
      default: 'Probation',
    },
    resignationDate: { type: Date },
    terminationDate: { type: Date },
    terminationReason: { type: String },

    // Documents & Files
    documents: [
      {
        name: { type: String },
        type: { type: String },
        uploadDate: { type: Date, default: Date.now },
        fileUrl: { type: String },
        expiryDate: { type: Date },
      },
    ],

    // AI & Intelligence Features
    aiInsights: {
      performancePrediction: { type: Number, default: 0 },
      retentionRisk: { type: Number, default: 0 },
      developmentAreas: [{ type: String }],
      recommendedTrainings: [{ type: String }],
      careerPathSuggestions: [{ type: String }],
      lastUpdated: { type: Date, default: Date.now },
    },

    // Internal Management
    createdBy: { type: String, required: true },
    lastModifiedBy: { type: String },
    isArchived: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'employees',
  }
);

// Indexes for performance
EmployeeSchema.index({ department: 1, status: 1 });
EmployeeSchema.index({ hireDate: -1 });
EmployeeSchema.index({ email: 1 });
EmployeeSchema.index({ 'aiInsights.retentionRisk': -1 });

/**
 * Virtual for full name
 */
EmployeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

/**
 * Method: Calculate age
 */
EmployeeSchema.methods.getAge = function (): number {
  const today = new Date();
  let age = today.getFullYear() - this.dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - this.dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < this.dateOfBirth.getDate())) {
    age--;
  }
  return age;
};

/**
 * Method: Calculate tenure
 */
EmployeeSchema.methods.getTenure = function (): { years: number; months: number } {
  const today = new Date();
  const hireDate = this.hireDate;

  let years = today.getFullYear() - hireDate.getFullYear();
  let months = today.getMonth() - hireDate.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months };
};

/**
 * Method: Update AI insights
 */
EmployeeSchema.methods.updateAIInsights = function (
  prediction: number,
  retentionRisk: number,
  developmentAreas: string[],
  trainings: string[],
  careerPath: string[]
): void {
  this.aiInsights = {
    performancePrediction: prediction,
    retentionRisk: retentionRisk,
    developmentAreas: developmentAreas,
    recommendedTrainings: trainings,
    careerPathSuggestions: careerPath,
    lastUpdated: new Date(),
  };
};

/**
 * Method: Calculate leave balance
 */
EmployeeSchema.methods.updateLeaveBalance = function (): void {
  this.remainingLeaveDays = this.totalLeaveDays - this.usedLeaveDays;
  if (this.remainingLeaveDays < 0) {
    this.remainingLeaveDays = 0;
  }
};

/**
 * Statics: Find by department
 */
EmployeeSchema.statics.findByDepartment = function (department: string) {
  return this.find({ department, status: 'Active' });
};

/**
 * Statics: Find reports
 */
EmployeeSchema.statics.findReports = function (managerId: string) {
  return this.find({ reportingManager: managerId, status: 'Active' });
};

/**
 * Statics: Find at risk
 */
EmployeeSchema.statics.findAtRisk = function (riskThreshold: number = 0.7) {
  return this.find({
    'aiInsights.retentionRisk': { $gte: riskThreshold },
    status: 'Active',
  });
};

/**
 * Middleware: Calculate leave balance before save
 */
EmployeeSchema.pre('save', function (next) {
  this.updateLeaveBalance();
  next();
});

/**
 * Create and export model
 */
export const Employee = model<IEmployee>('Employee', EmployeeSchema);

/**
 * Export schema for reference
 */
export { EmployeeSchema };

export default Employee;
