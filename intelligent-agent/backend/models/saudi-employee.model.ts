/**
 * Saudi Employee Model
 * نموذج الموظف السعودي
 *
 * Extended employee model with Saudi-specific fields
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// Interfaces
// ============================================

export interface ISaudiEmployee extends Document {
  // Basic Information
  employeeCode: string;
  fullNameArabic: string;
  fullNameEnglish: string;

  // Identification
  identificationType: 'national-id' | 'iqama' | 'gcc-id';
  nationalId?: string; // For Saudi nationals (10 digits, starts with 1)
  iqamaNumber?: string; // For expats (10 digits, starts with 2)
  passportNumber?: string;
  borderNumber?: string; // رقم الحدود

  // Personal Details
  dateOfBirth: Date;
  placeOfBirth: string;
  gender: 'male' | 'female';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  nationality: string;
  religion?: 'muslim' | 'christian' | 'other';

  // Contact Information
  mobileNumber: string; // Saudi format: +966XXXXXXXXX
  alternatePhone?: string;
  email: string;
  personalEmail?: string;

  // Address (Saudi Format)
  address: {
    buildingNumber: string; // رقم المبنى
    streetName: string; // اسم الشارع
    district: string; // الحي
    city: string; // المدينة
    postalCode: string; // الرمز البريدي
    additionalNumber: string; // الرقم الإضافي
    unitNumber?: string; // رقم الوحدة
    province: string; // المنطقة
  };

  // Emergency Contact
  emergencyContact: {
    name: string;
    relationship: string;
    phoneNumber: string;
    address?: string;
  };

  // Ministry of Labor (MOL)
  mol: {
    contractId?: string;
    establishmentId: string;
    laborOfficeId: string;
    contractType: 'limited' | 'unlimited';
    jobTitle: string;
    jobTitleArabic: string;
    occupation: string; // المهنة
    startDate: Date;
    endDate?: Date;
    contractStatus: 'active' | 'terminated' | 'suspended' | 'transfer-pending';
    lastUpdated: Date;
  };

  // Iqama Details (For Expats)
  iqamaDetails?: {
    iqamaNumber: string;
    issueDate: Date;
    expiryDate: Date;
    profession: string;
    sponsorId: string; // رقم هوية الكفيل
    sponsorName: string;
    iqamaStatus: 'active' | 'expired' | 'cancelled' | 'under-renewal';
    lastRenewalDate?: Date;
  };

  // GOSI (General Organization for Social Insurance)
  gosi: {
    gosiNumber?: string;
    registrationDate?: Date;
    subscriptionStatus: 'active' | 'suspended' | 'cancelled' | 'not-registered';
    subscriberWage: number; // الأجر الخاضع للاشتراك
    lastContributionDate?: Date;
    employerContribution: number;
    employeeContribution: number;
  };

  // Medical Insurance
  medicalInsurance: {
    policyNumber?: string;
    insuranceCompany: string;
    insuranceClass: 'class-a' | 'class-b' | 'class-c' | 'vip';
    coverageAmount: number;
    startDate: Date;
    expiryDate: Date;
    status: 'active' | 'expired' | 'cancelled' | 'pending-renewal';
    dependents: number;
    coPaymentPercentage: number;
  };

  // Salary & Compensation
  salary: {
    basicSalary: number;
    housingAllowance: number;
    transportAllowance: number;
    foodAllowance?: number;
    otherAllowances?: number;
    totalSalary: number;
    currency: string; // Default: SAR
    paymentMethod: 'bank-transfer' | 'cash' | 'cheque';
    bankName?: string;
    iban?: string; // Saudi IBAN: SA + 22 digits
    accountNumber?: string;
  };

  // Visa & Travel
  visa?: {
    visaNumber: string;
    visaType: 'work' | 'visit' | 'business' | 'family';
    issueDate: Date;
    expiryDate: Date;
    status: 'valid' | 'expired' | 'used' | 'cancelled';
  };

  exitReEntry?: {
    requestId?: string;
    type: 'single' | 'multiple' | 'none';
    issueDate?: Date;
    expiryDate?: Date;
    status: 'active' | 'used' | 'expired' | 'cancelled' | 'none';
    remainingTrips?: number;
  };

  // Work Permit (For Expats)
  workPermit?: {
    permitNumber: string;
    issueDate: Date;
    expiryDate: Date;
    status: 'active' | 'expired' | 'suspended';
  };

  // Employment Details
  employment: {
    employmentType: 'full-time' | 'part-time' | 'contract' | 'temporary';
    department: string;
    position: string;
    reportingTo?: string;
    workLocation: string;
    workSchedule: {
      workingDays: string[]; // ['Sunday', 'Monday', ...]
      workingHours: number;
      startTime: string;
      endTime: string;
      breakDuration: number; // in minutes
    };
    probationPeriod?: {
      duration: number; // in days
      endDate: Date;
      status: 'ongoing' | 'completed' | 'extended';
    };
  };

  // Qualifications
  qualifications: {
    educationLevel: string;
    major?: string;
    university?: string;
    graduationYear?: number;
    certificates?: Array<{
      name: string;
      issuingOrganization: string;
      issueDate: Date;
      expiryDate?: Date;
      certificateNumber?: string;
    }>;
  };

  // Documents
  documents: Array<{
    documentType: string; // 'national-id' | 'iqama' | 'passport' | 'contract' | 'certificate' | etc.
    documentNumber?: string;
    issueDate?: Date;
    expiryDate?: Date;
    fileUrl: string;
    uploadDate: Date;
    status: 'valid' | 'expired' | 'pending-verification';
  }>;

  // Compliance & Alerts
  compliance: {
    isCompliant: boolean;
    lastCheckDate: Date;
    issues: string[];
    warnings: string[];
    nextReviewDate: Date;
  };

  // Leave & Attendance
  leave: {
    annualLeaveDays: number;
    sickLeaveDays: number;
    usedAnnualLeave: number;
    usedSickLeave: number;
    remainingAnnualLeave: number;
    remainingSickLeave: number;
  };

  // Saudization (Nitaqat)
  saudization?: {
    isSaudi: boolean;
    contributeToNitaqat: boolean;
    nitaqatImpact: 'green' | 'neutral' | 'red';
  };

  // System Fields
  status: 'active' | 'inactive' | 'on-leave' | 'terminated' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;

  // Audit Trail
  auditLog: Array<{
    action: string;
    performedBy: string;
    timestamp: Date;
    details: string;
  }>;
}

// ============================================
// Schema Definition
// ============================================

const SaudiEmployeeSchema = new Schema<ISaudiEmployee>(
  {
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullNameArabic: {
      type: String,
      required: true,
      trim: true,
    },
    fullNameEnglish: {
      type: String,
      required: true,
      trim: true,
    },

    // Identification
    identificationType: {
      type: String,
      enum: ['national-id', 'iqama', 'gcc-id'],
      required: true,
    },
    nationalId: {
      type: String,
      trim: true,
      match: /^1\d{9}$/, // Must start with 1 and be 10 digits
      sparse: true,
      unique: true,
    },
    iqamaNumber: {
      type: String,
      trim: true,
      match: /^2\d{9}$/, // Must start with 2 and be 10 digits
      sparse: true,
      unique: true,
    },
    passportNumber: {
      type: String,
      trim: true,
    },
    borderNumber: {
      type: String,
      trim: true,
    },

    // Personal Details
    dateOfBirth: {
      type: Date,
      required: true,
    },
    placeOfBirth: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
      required: true,
    },
    maritalStatus: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed'],
      required: true,
    },
    nationality: {
      type: String,
      required: true,
    },
    religion: {
      type: String,
      enum: ['muslim', 'christian', 'other'],
    },

    // Contact Information
    mobileNumber: {
      type: String,
      required: true,
      match: /^(\+9665|05)\d{8}$/, // Saudi phone format
    },
    alternatePhone: String,
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    personalEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },

    // Address
    address: {
      buildingNumber: { type: String, required: true },
      streetName: { type: String, required: true },
      district: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      additionalNumber: { type: String, required: true },
      unitNumber: String,
      province: { type: String, required: true },
    },

    // Emergency Contact
    emergencyContact: {
      name: { type: String, required: true },
      relationship: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      address: String,
    },

    // MOL
    mol: {
      contractId: String,
      establishmentId: { type: String, required: true },
      laborOfficeId: { type: String, required: true },
      contractType: {
        type: String,
        enum: ['limited', 'unlimited'],
        required: true,
      },
      jobTitle: { type: String, required: true },
      jobTitleArabic: { type: String, required: true },
      occupation: { type: String, required: true },
      startDate: { type: Date, required: true },
      endDate: Date,
      contractStatus: {
        type: String,
        enum: ['active', 'terminated', 'suspended', 'transfer-pending'],
        default: 'active',
      },
      lastUpdated: { type: Date, default: Date.now },
    },

    // Iqama Details
    iqamaDetails: {
      iqamaNumber: String,
      issueDate: Date,
      expiryDate: Date,
      profession: String,
      sponsorId: String,
      sponsorName: String,
      iqamaStatus: {
        type: String,
        enum: ['active', 'expired', 'cancelled', 'under-renewal'],
      },
      lastRenewalDate: Date,
    },

    // GOSI
    gosi: {
      gosiNumber: String,
      registrationDate: Date,
      subscriptionStatus: {
        type: String,
        enum: ['active', 'suspended', 'cancelled', 'not-registered'],
        default: 'not-registered',
      },
      subscriberWage: { type: Number, default: 0 },
      lastContributionDate: Date,
      employerContribution: { type: Number, default: 0 },
      employeeContribution: { type: Number, default: 0 },
    },

    // Medical Insurance
    medicalInsurance: {
      policyNumber: String,
      insuranceCompany: { type: String, required: true },
      insuranceClass: {
        type: String,
        enum: ['class-a', 'class-b', 'class-c', 'vip'],
        required: true,
      },
      coverageAmount: { type: Number, required: true },
      startDate: { type: Date, required: true },
      expiryDate: { type: Date, required: true },
      status: {
        type: String,
        enum: ['active', 'expired', 'cancelled', 'pending-renewal'],
        default: 'active',
      },
      dependents: { type: Number, default: 0 },
      coPaymentPercentage: { type: Number, default: 0 },
    },

    // Salary
    salary: {
      basicSalary: { type: Number, required: true },
      housingAllowance: { type: Number, default: 0 },
      transportAllowance: { type: Number, default: 0 },
      foodAllowance: { type: Number, default: 0 },
      otherAllowances: { type: Number, default: 0 },
      totalSalary: { type: Number, required: true },
      currency: { type: String, default: 'SAR' },
      paymentMethod: {
        type: String,
        enum: ['bank-transfer', 'cash', 'cheque'],
        default: 'bank-transfer',
      },
      bankName: String,
      iban: {
        type: String,
        match: /^SA\d{22}$/, // Saudi IBAN format
      },
      accountNumber: String,
    },

    // Visa
    visa: {
      visaNumber: String,
      visaType: {
        type: String,
        enum: ['work', 'visit', 'business', 'family'],
      },
      issueDate: Date,
      expiryDate: Date,
      status: {
        type: String,
        enum: ['valid', 'expired', 'used', 'cancelled'],
      },
    },

    // Exit Re-Entry
    exitReEntry: {
      requestId: String,
      type: {
        type: String,
        enum: ['single', 'multiple', 'none'],
        default: 'none',
      },
      issueDate: Date,
      expiryDate: Date,
      status: {
        type: String,
        enum: ['active', 'used', 'expired', 'cancelled', 'none'],
        default: 'none',
      },
      remainingTrips: Number,
    },

    // Work Permit
    workPermit: {
      permitNumber: String,
      issueDate: Date,
      expiryDate: Date,
      status: {
        type: String,
        enum: ['active', 'expired', 'suspended'],
      },
    },

    // Employment
    employment: {
      employmentType: {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'temporary'],
        required: true,
      },
      department: { type: String, required: true },
      position: { type: String, required: true },
      reportingTo: String,
      workLocation: { type: String, required: true },
      workSchedule: {
        workingDays: [String],
        workingHours: Number,
        startTime: String,
        endTime: String,
        breakDuration: Number,
      },
      probationPeriod: {
        duration: Number,
        endDate: Date,
        status: {
          type: String,
          enum: ['ongoing', 'completed', 'extended'],
        },
      },
    },

    // Qualifications
    qualifications: {
      educationLevel: String,
      major: String,
      university: String,
      graduationYear: Number,
      certificates: [
        {
          name: String,
          issuingOrganization: String,
          issueDate: Date,
          expiryDate: Date,
          certificateNumber: String,
        },
      ],
    },

    // Documents
    documents: [
      {
        documentType: { type: String, required: true },
        documentNumber: String,
        issueDate: Date,
        expiryDate: Date,
        fileUrl: { type: String, required: true },
        uploadDate: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ['valid', 'expired', 'pending-verification'],
          default: 'valid',
        },
      },
    ],

    // Compliance
    compliance: {
      isCompliant: { type: Boolean, default: true },
      lastCheckDate: { type: Date, default: Date.now },
      issues: [String],
      warnings: [String],
      nextReviewDate: Date,
    },

    // Leave
    leave: {
      annualLeaveDays: { type: Number, default: 21 }, // Saudi labor law: 21 days
      sickLeaveDays: { type: Number, default: 30 }, // Saudi labor law: 30 days
      usedAnnualLeave: { type: Number, default: 0 },
      usedSickLeave: { type: Number, default: 0 },
      remainingAnnualLeave: { type: Number, default: 21 },
      remainingSickLeave: { type: Number, default: 30 },
    },

    // Saudization
    saudization: {
      isSaudi: Boolean,
      contributeToNitaqat: Boolean,
      nitaqatImpact: {
        type: String,
        enum: ['green', 'neutral', 'red'],
      },
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'on-leave', 'terminated', 'suspended'],
      default: 'active',
    },

    createdBy: String,
    lastModifiedBy: String,

    // Audit Log
    auditLog: [
      {
        action: String,
        performedBy: String,
        timestamp: { type: Date, default: Date.now },
        details: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ============================================
// Indexes
// ============================================

SaudiEmployeeSchema.index({ email: 1 });
SaudiEmployeeSchema.index({ 'mol.contractId': 1 });
SaudiEmployeeSchema.index({ 'gosi.gosiNumber': 1 });
SaudiEmployeeSchema.index({ status: 1 });
SaudiEmployeeSchema.index({ 'medicalInsurance.expiryDate': 1 });
SaudiEmployeeSchema.index({ 'iqamaDetails.expiryDate': 1 });

// ============================================
// Middleware
// ============================================

// Calculate total salary before save
SaudiEmployeeSchema.pre('save', function () {
  if (this.isModified('salary')) {
    this.salary.totalSalary =
      this.salary.basicSalary +
      this.salary.housingAllowance +
      this.salary.transportAllowance +
      (this.salary.foodAllowance || 0) +
      (this.salary.otherAllowances || 0);
  }
});

// Calculate remaining leave days
SaudiEmployeeSchema.pre('save', function () {
  if (this.isModified('leave')) {
    this.leave.remainingAnnualLeave = this.leave.annualLeaveDays - this.leave.usedAnnualLeave;
    this.leave.remainingSickLeave = this.leave.sickLeaveDays - this.leave.usedSickLeave;
  }
});

// ============================================
// Export Model
// ============================================

export const SaudiEmployee = mongoose.model<ISaudiEmployee>('SaudiEmployee', SaudiEmployeeSchema);
export default SaudiEmployee;
