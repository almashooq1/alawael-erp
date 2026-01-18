const mongoose = require('mongoose');

// ============================================
// Organization Structure Schema
// ============================================
const OrganizationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: String,
      required: true,
      unique: true,
      default: 'ORG_001',
    },
    name: {
      type: String,
      required: true,
      default: 'مركز الأوائل للتأهيل',
    },
    chairman: {
      id: String,
      name: String,
      title: String,
      email: String,
      phone: String,
      location: String,
    },
    departments: [
      {
        id: String,
        name: String,
        manager: {
          name: String,
          email: String,
          phone: String,
        },
        sections: [
          {
            id: String,
            name: String,
            head: String,
            positions: [
              {
                id: String,
                title: String,
                level: String,
                count: Number,
                salary: {
                  min: Number,
                  max: Number,
                },
                qualifications: [String],
                responsibilities: [String],
                skills: [String],
              },
            ],
          },
        ],
      },
    ],
    branches: [
      {
        id: String,
        name: String,
        location: String,
        manager: String,
        departments: [String],
      },
    ],
    kpis: {
      organizational: mongoose.Schema.Types.Mixed,
      departments: mongoose.Schema.Types.Mixed,
    },
    careerPaths: mongoose.Schema.Types.Mixed,
    trainingPrograms: [
      {
        id: String,
        name: String,
        category: String,
        duration: String,
        cost: Number,
        target: String,
        topics: [String],
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// ============================================
// Employee Schema
// ============================================
const EmployeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
    },
    personalInfo: {
      firstName: String,
      lastName: String,
      nationalId: String,
      dateOfBirth: Date,
      gender: String,
      nationality: String,
      maritalStatus: String,
      email: String,
      phone: String,
      address: {
        street: String,
        city: String,
        country: String,
        postalCode: String,
      },
    },
    employment: {
      positionId: String,
      positionTitle: String,
      departmentId: String,
      departmentName: String,
      branchId: String,
      hireDate: Date,
      employmentType: String,
      status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'terminated'],
        default: 'active',
      },
    },
    salary: {
      base: Number,
      allowances: [
        {
          type: String,
          amount: Number,
        },
      ],
      deductions: [
        {
          type: String,
          amount: Number,
        },
      ],
      total: Number,
      paymentMethod: String,
      bankAccount: String,
    },
    performance: {
      currentRating: Number,
      reviews: [
        {
          date: Date,
          rating: Number,
          reviewer: String,
          comments: String,
        },
      ],
      goals: [
        {
          description: String,
          status: String,
          deadline: Date,
        },
      ],
    },
    training: [
      {
        programId: String,
        programName: String,
        completionDate: Date,
        status: String,
        score: Number,
      },
    ],
    attendance: {
      totalDays: Number,
      presentDays: Number,
      absentDays: Number,
      lateDays: Number,
      leaves: [
        {
          type: String,
          startDate: Date,
          endDate: Date,
          status: String,
          reason: String,
        },
      ],
    },
    documents: [
      {
        type: String,
        filename: String,
        uploadDate: Date,
        url: String,
      },
    ],
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// ============================================
// AI Predictions Schema
// ============================================
const AIPredictionSchema = new mongoose.Schema(
  {
    predictionId: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['promotion', 'turnover', 'training_impact', 'budget', 'performance'],
      required: true,
    },
    employeeId: String,
    departmentId: String,
    input: mongoose.Schema.Types.Mixed,
    output: mongoose.Schema.Types.Mixed,
    confidence: Number,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  },
);

// ============================================
// System Logs Schema (Audit Trail)
// ============================================
const SystemLogSchema = new mongoose.Schema(
  {
    logId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: String,
    username: String,
    action: {
      type: String,
      required: true,
    },
    module: String,
    resource: String,
    resourceId: String,
    method: String,
    ipAddress: String,
    userAgent: String,
    details: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['success', 'failure', 'error'],
      default: 'success',
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
SystemLogSchema.index({ userId: 1, timestamp: -1 });
SystemLogSchema.index({ action: 1, timestamp: -1 });

// ============================================
// Backup Metadata Schema
// ============================================
const BackupSchema = new mongoose.Schema(
  {
    backupId: {
      type: String,
      required: true,
      unique: true,
    },
    filename: String,
    type: {
      type: String,
      enum: ['full', 'incremental', 'differential'],
      default: 'full',
    },
    size: Number,
    collections: [String],
    records: Number,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed'],
      default: 'pending',
    },
    startTime: Date,
    endTime: Date,
    duration: Number,
    location: String,
    createdBy: String,
    error: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// ============================================
// Export Models
// ============================================
module.exports = {
  Organization: mongoose.model('Organization', OrganizationSchema),
  Employee: mongoose.model('Employee', EmployeeSchema),
  AIPrediction: mongoose.model('AIPrediction', AIPredictionSchema),
  SystemLog: mongoose.model('SystemLog', SystemLogSchema),
  Backup: mongoose.model('Backup', BackupSchema),
};
