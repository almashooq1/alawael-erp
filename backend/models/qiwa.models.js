/**
 * 🇸🇦 Qiwa Data Models
 * MongoDB Schemas for Qiwa Integration
 *
 * Models:
 * ✅ QiwaContract
 * ✅ QiwaEmployee
 * ✅ QiwaWage
 * ✅ QiwaWPSSubmission
 * ✅ QiwaNitaqat
 * ✅ QiwaLaborRecord
 * ✅ QiwaAuditLog
 *
 * @version 2.0.0
 * @author AI Integration Team
 * @date 2026-02-17
 */

const mongoose = require('mongoose');

// =====================================================
// QIWA CONTRACT MODEL
// =====================================================

const QiwaContractSchema = new mongoose.Schema(
  {
    // Contract Identifiers
    contractId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    qiwaReferenceNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Employee Information
    employeeIqama: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    employeeNationalId: {
      type: String,
      trim: true,
    },
    employeeName: {
      firstName: String,
      lastName: String,
      fullNameArabic: String,
      fullNameEnglish: String,
    },

    // Establishment Information
    establishmentId: {
      type: String,
      required: true,
      index: true,
    },
    laborOfficeId: String,

    // Contract Details
    contractType: {
      type: String,
      enum: ['limited', 'unlimited'],
      required: true,
    },
    jobTitle: {
      type: String,
      required: true,
    },
    jobTitleArabic: String,
    occupationCode: String,

    // Salary & Benefits
    salary: {
      basicSalary: {
        type: Number,
        required: true,
        min: 0,
      },
      housingAllowance: {
        type: Number,
        default: 0,
        min: 0,
      },
      transportAllowance: {
        type: Number,
        default: 0,
        min: 0,
      },
      otherAllowances: {
        type: Number,
        default: 0,
        min: 0,
      },
      currency: {
        type: String,
        default: 'SAR',
      },
      totalSalary: Number,
    },

    // Work Details
    workingHours: {
      type: Number,
      default: 8,
    },
    workingDays: {
      type: [String],
      default: ['sun', 'mon', 'tue', 'wed', 'thu'],
    },
    workSchedule: {
      startTime: String, // HH:MM
      endTime: String, // HH:MM
      breakDuration: Number, // minutes
    },

    // Contract Dates
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      sparse: true,
    },

    // Status & History
    status: {
      type: String,
      enum: ['active', 'terminated', 'suspended', 'pending', 'transferred'],
      default: 'pending',
      index: true,
    },

    // Termination Details
    termination: {
      reason: String,
      initiated_by: String,
      terminationDate: Date,
      noticeGiven: Boolean,
      noticeDays: Number,
    },

    // Compliance & Verification
    compliance: {
      wpsSubmitted: Boolean,
      wpsReferenceNumber: String,
      gosiRegistered: Boolean,
      medicalInsuranceApplied: Boolean,
    },

    // Qiwa-Specific Data
    qiwaMetadata: {
      submittedAt: Date,
      approvedAt: Date,
      processedAt: Date,
      approvalStatus: String,
      qiwaStatus: String,
      confirmationNumber: String,
    },

    // System Fields
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    deletedAt: {
      type: Date,
      sparse: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },

    // Audit Trail
    auditLog: [
      {
        action: String,
        changedFields: mongoose.Schema.Types.Mixed,
        oldValues: mongoose.Schema.Types.Mixed,
        newValues: mongoose.Schema.Types.Mixed,
        changedBy: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    collection: 'qiwa_contracts',
  }
);

QiwaContractSchema.index({
  employeeIqama: 1,
  establishmentId: 1,
  status: 1,
});
QiwaContractSchema.index({ createdAt: -1 });

// =====================================================
// QIWA EMPLOYEE MODEL
// =====================================================

const QiwaEmployeeSchema = new mongoose.Schema(
  {
    // Basic Information
    employeeCode: {
      type: String,
      unique: true,
      required: true,
    },
    iqamaNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    nationalId: {
      type: String,
      unique: true,
      sparse: true,
    },
    passport: String,

    // Personal Details
    personalInfo: {
      firstName: String,
      lastName: String,
      fullNameArabic: {
        type: String,
        required: true,
      },
      fullNameEnglish: String,
      dateOfBirth: Date,
      gender: {
        type: String,
        enum: ['male', 'female'],
      },
      nationality: String,
      maritalStatus: String,
      religion: String,
    },

    // Contact Information
    contact: {
      email: {
        type: String,
        lowercase: true,
      },
      mobileNumber: String,
      alternatePhone: String,
      emergencyContact: {
        name: String,
        relationship: String,
        phoneNumber: String,
      },
    },

    // Address
    address: {
      buildingNumber: String,
      streetName: String,
      district: String,
      city: String,
      postalCode: String,
      additionalNumber: String,
      province: String,
      country: String,
    },

    // Employment Information
    employment: {
      establishmentId: {
        type: String,
        index: true,
      },
      department: String,
      position: String,
      employmentType: String,
      startDate: Date,
      currentStatus: {
        type: String,
        enum: ['active', 'on-leave', 'suspended', 'terminated'],
        default: 'active',
      },
    },

    // Qiwa-Specific
    qiwaStatus: {
      type: String,
      enum: ['registered', 'verified', 'compliant', 'non-compliant', 'pending'],
      default: 'pending',
      index: true,
    },
    qiwaRegistrationDate: Date,
    qiwaReferenceNumber: String,

    // Localization & Saudization
    saudization: {
      isSaudi: Boolean,
      contributeToNitaqat: Boolean,
      nitaqatImpact: {
        type: String,
        enum: ['green', 'yellow', 'red', 'exempt'],
      },
      visa: {
        type: String,
        enum: ['Saudi', 'Work', 'Business', 'Family', 'Student', 'Other'],
      },
    },

    // Compliance Status
    compliance: {
      wpsCompliant: Boolean,
      gosiCompliant: Boolean,
      medicalInsuranceActive: Boolean,
      lastComplianceCheck: Date,
      complianceIssues: [String],
    },

    // System Fields
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    deletedAt: {
      type: Date,
      sparse: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'qiwa_employees',
  }
);

QiwaEmployeeSchema.index({ iqamaNumber: 1, 'employment.establishmentId': 1 });

// =====================================================
// QIWA WAGE MODEL
// =====================================================

const QiwaWageSchema = new mongoose.Schema(
  {
    // Identification
    wageId: {
      type: String,
      unique: true,
      required: true,
    },
    iqamaNumber: {
      type: String,
      required: true,
      index: true,
    },
    establishmentId: {
      type: String,
      required: true,
      index: true,
    },

    // Wage Details
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    allowances: {
      housing: { type: Number, default: 0 },
      transportation: { type: Number, default: 0 },
      food: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    deductions: {
      income_tax: { type: Number, default: 0 },
      gosi: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    totalSalary: Number,
    currency: { type: String, default: 'SAR' },

    // Dates
    effectiveDate: {
      type: Date,
      required: true,
      index: true,
    },
    reason: String,

    // WPS Details
    wpsSubmitted: Boolean,
    wpsSubmissionDate: Date,
    wpsReferenceNumber: String,

    // Version Control
    previousWage: mongoose.Schema.Types.Mixed,
    changeReason: String,
    approvedBy: String,

    // System Fields
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },

    // Audit
    auditLog: [
      {
        action: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        changedBy: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    collection: 'qiwa_wages',
  }
);

QiwaWageSchema.index({
  iqamaNumber: 1,
  effectiveDate: -1,
});

// =====================================================
// QIWA WPS SUBMISSION MODEL
// =====================================================

const QiwaWPSSubmissionSchema = new mongoose.Schema(
  {
    // Submission Details
    submissionId: {
      type: String,
      unique: true,
      required: true,
    },
    qiwaReferenceNumber: String,
    establishmentId: {
      type: String,
      required: true,
      index: true,
    },

    // Submission Info
    period: {
      type: String, // YYYY-MM format
      required: true,
      index: true,
    },
    submissionType: {
      type: String,
      enum: ['regular', 'adjustment', 'correction', 'final'],
      default: 'regular',
    },
    submittedDate: {
      type: Date,
      default: Date.now,
    },
    submittedBy: String,

    // Employee Data
    employees: [
      {
        iqamaNumber: String,
        name: String,
        basicSalary: Number,
        allowances: mongoose.Schema.Types.Mixed,
        deductions: mongoose.Schema.Types.Mixed,
        netSalary: Number,
      },
    ],

    // Summary
    summary: {
      totalEmployees: Number,
      totalBasicSalary: Number,
      totalAllowances: Number,
      totalDeductions: Number,
      totalNetSalary: Number,
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'submitted', 'accepted', 'rejected', 'processed'],
      default: 'pending',
      index: true,
    },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        notes: String,
      },
    ],

    // Response from Qiwa
    qiwaResponse: {
      statusCode: Number,
      message: String,
      confirmationNumber: String,
      processedAt: Date,
      errors: [String],
    },

    // System Fields
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'qiwa_wps_submissions',
  }
);

QiwaWPSSubmissionSchema.index({
  establishmentId: 1,
  period: -1,
  status: 1,
});

// =====================================================
// QIWA NITAQAT MODEL
// =====================================================

const QiwaNitaqatSchema = new mongoose.Schema(
  {
    // Establishment Info
    establishmentId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // Nitaqat Status
    status: {
      type: String,
      enum: ['green', 'yellow', 'red', 'exempt'],
      default: 'green',
      index: true,
    },
    level: {
      type: String,
      enum: ['level-1', 'level-2', 'level-3', 'level-4', 'level-5', 'exempt'],
    },

    // Points & Targets
    currentPoints: Number,
    targetPoints: Number,
    pointsDifference: Number,

    // Workforce Breakdown
    workforce: {
      total: Number,
      saudi: {
        count: Number,
        percentage: Number,
      },
      nonSaudi: {
        count: Number,
        percentage: Number,
      },
      byPosition: mongoose.Schema.Types.Mixed,
    },

    // Compliance Details
    compliance: {
      isCompliant: Boolean,
      compliancePercentage: Number,
      minimumRequired: Number,
    },

    // Dates
    evaluationDateFrom: Date,
    evaluationDateTo: Date,
    lastReviewDate: {
      type: Date,
      default: Date.now,
    },

    // Actions & Penalties
    actions: {
      restrictedActivities: [String],
      penaltiesApplied: [
        {
          type: String,
          reason: String,
          amount: Number,
          date: Date,
        },
      ],
    },

    // Historical Data
    history: [
      {
        date: Date,
        status: String,
        points: Number,
        notes: String,
      },
    ],

    // System Fields
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'qiwa_nitaqat',
  }
);

// =====================================================
// QIWA LABOR RECORD MODEL
// =====================================================

const QiwaLaborRecordSchema = new mongoose.Schema(
  {
    // Record Identifiers
    recordId: {
      type: String,
      unique: true,
      required: true,
    },
    iqamaNumber: {
      type: String,
      required: true,
      index: true,
    },

    // Work History
    contracts: [
      {
        contractId: String,
        establishmentId: String,
        establishmentName: String,
        jobTitle: String,
        startDate: Date,
        endDate: Date,
        salary: Number,
        status: String,
      },
    ],

    // Experience Summary
    summary: {
      totalWorkYears: Number,
      totalEmployers: Number,
      longestTenure: Number,
      currentPosition: String,
    },

    // Verification Status
    verified: Boolean,
    verifiedAt: Date,
    verifiedBy: String,

    // Qiwa Data
    qiwaData: {
      lastUpdated: Date,
      dataSource: String,
      reliabilityScore: Number,
    },

    // System Fields
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'qiwa_labor_records',
  }
);

// =====================================================
// QIWA AUDIT LOG MODEL
// =====================================================

const QiwaAuditLogSchema = new mongoose.Schema(
  {
    // Log Details
    logId: {
      type: String,
      unique: true,
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'contract_registered',
        'contract_updated',
        'contract_terminated',
        'wage_updated',
        'wps_submitted',
        'employee_verified',
        'compliance_check',
      ],
      index: true,
    },

    // Entity Information
    entityType: {
      type: String,
      enum: [
        'contract',
        'employee',
        'wage',
        'wps',
        'nitaqat',
        'labor_record',
      ],
      required: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    relatedEntities: {
      iqamaNumber: String,
      establishmentId: String,
      contractId: String,
    },

    // Changes Recorded
    changes: {
      oldValues: mongoose.Schema.Types.Mixed,
      newValues: mongoose.Schema.Types.Mixed,
      changedFields: [String],
    },

    // User & System Info
    performedBy: String,
    performedFrom: String, // IP or system source
    userRole: String,
    systemComponent: String,

    // Results
    success: Boolean,
    errorMessage: String,
    qiwaResponse: mongoose.Schema.Types.Mixed,

    // Timestamps
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'qiwa_audit_logs',
  }
);

QiwaAuditLogSchema.index({ entityId: 1, timestamp: -1 });
QiwaAuditLogSchema.index({
  relatedEntities: 1,
  timestamp: -1,
});

// =====================================================
// MODEL EXPORTS
// =====================================================

module.exports = {
  QiwaContract: mongoose.model('QiwaContract', QiwaContractSchema),
  QiwaEmployee: mongoose.model('QiwaEmployee', QiwaEmployeeSchema),
  QiwaWage: mongoose.model('QiwaWage', QiwaWageSchema),
  QiwaWPSSubmission: mongoose.model(
    'QiwaWPSSubmission',
    QiwaWPSSubmissionSchema
  ),
  QiwaNitaqat: mongoose.model('QiwaNitaqat', QiwaNitaqatSchema),
  QiwaLaborRecord: mongoose.model('QiwaLaborRecord', QiwaLaborRecordSchema),
  QiwaAuditLog: mongoose.model('QiwaAuditLog', QiwaAuditLogSchema),
};
