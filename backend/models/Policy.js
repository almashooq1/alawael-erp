const mongoose = require('mongoose');

// Schema للسياسات
const policySchema = new mongoose.Schema(
  {
    // معلومات أساسية
    policyId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    policyName: {
      type: String,
      required: true,
      trim: true
    },
    policyNameAr: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    descriptionAr: {
      type: String,
      required: true
    },
    
    // نوع السياسة
    policyType: {
      type: String,
      enum: [
        'SALARY_INCENTIVES',      // سياسات الرواتب والحوافز
        'LEAVE_VACATION',         // سياسات الإجازات
        'SECURITY_COMPLIANCE',    // أمان وامتثال
        'LOANS_BENEFITS',         // قروض ومزايا
        'HR_PROCEDURES',          // إجراءات الموارد البشرية
        'WORKPLACE_CONDUCT',      // سلوك مكان العمل
        'HEALTH_SAFETY',          // الصحة والسلامة
        'DATA_CONFIDENTIALITY',   // سرية البيانات
        'PERFORMANCE_EVALUATION', // تقييم الأداء
        'DISCIPLINARY',           // السياسات التأديبية
        'COMPENSATION',           // التعويضات
        'TRAINING_DEVELOPMENT',   // التدريب والتطوير
        'WORKPLACE_RIGHTS',       // حقوق مكان العمل
        'OTHER'                   // أخرى
      ],
      required: true
    },

    // الحالة والإصدار
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'PENDING_APPROVAL', 'ARCHIVED', 'SUSPENDED'],
      default: 'DRAFT'
    },
    version: {
      type: Number,
      default: 1
    },
    previousVersions: [{
      versionNumber: Number,
      content: String,
      effectiveDate: Date,
      createdBy: String
    }],

    // المحتوى والشروط
    content: {
      type: String,
      required: true
    },
    contentAr: {
      type: String,
      required: true
    },
    keyPoints: [{
      type: String
    }],
    keyPointsAr: [{
      type: String
    }],

    // التواريخ الفعالة
    effectiveDate: {
      type: Date,
      required: true
    },
    expiryDate: {
      type: Date
    },
    lastReviewDate: {
      type: Date
    },

    // الفئات المستهدفة
    applicableCategories: [{
      type: String,
      enum: [
        'ALL_EMPLOYEES',
        'MANAGEMENT',
        'STAFF',
        'CONTRACTORS',
        'TEMPORARY',
        'EXECUTIVES',
        'DEPARTMENT_SPECIFIC'
      ]
    }],
    applicableDepartments: [String],
    applicableLocations: [String],

    // الموافقات والاعتماد
    approvals: [{
      approverRole: String,
      approverName: String,
      status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
      },
      approvalDate: Date,
      comments: String
    }],
    requiredApprovals: {
      type: [String],
      default: ['POLICY_MANAGER', 'HR_DIRECTOR', 'COMPLIANCE_OFFICER']
    },

    // متطلبات القوى العاملة
    acknowledgementRequired: {
      type: Boolean,
      default: true
    },
    trainingRequired: {
      type: Boolean,
      default: false
    },
    trainingDuration: Number, // بالساعات
    acknowledgedBy: [{
      employeeId: String,
      employeeName: String,
      acknowledgedDate: Date,
      ipAddress: String
    }],

    // الملفات والمرفقات
    attachments: [{
      fileName: String,
      fileURL: String,
      uploadDate: Date,
      uploadedBy: String,
      fileType: String
    }],

    // المخاطر والامتثال
    relatedRegulations: [String],
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    complianceTags: [String],

    // البيانات الوصفية
    createdBy: {
      type: String,
      required: true
    },
    createdByName: String,
    updatedBy: String,
    updatedByName: String,
    department: String,
    keywords: [String],

    // إحصائيات
    stats: {
      totalAcknowledgements: {
        type: Number,
        default: 0
      },
      pendingAcknowledgements: {
        type: Number,
        default: 0
      },
      viewCount: {
        type: Number,
        default: 0
      }
    },

    // ملاحظات وتعليقات
    notes: String,
    reviewSchedule: {
      type: String,
      enum: ['ANNUAL', 'BIENNIAL', 'TRIENNIAL', 'ON_DEMAND'],
      default: 'ANNUAL'
    }
  },
  {
    timestamps: true,
    collection: 'policies'
  }
);

// Indexes
policySchema.index({ policyType: 1, status: 1 });
policySchema.index({ effectiveDate: 1 });
policySchema.index({ createdBy: 1, createdAt: -1 });
policySchema.index({ 'applicableDepartments': 1 });

// Methods
policySchema.methods.isActive = function () {
  return (
    this.status === 'ACTIVE' &&
    new Date() >= this.effectiveDate &&
    (!this.expiryDate || new Date() <= this.expiryDate)
  );
};

policySchema.methods.getPendingApprovals = function () {
  return this.approvals.filter(a => a.status === 'PENDING');
};

policySchema.methods.isFullyApproved = function () {
  return (
    this.approvals.length > 0 &&
    this.approvals.every(a => a.status === 'APPROVED')
  );
};

// Statics
policySchema.statics.getByType = function (type) {
  return this.find({ policyType: type, status: 'ACTIVE' });
};

policySchema.statics.getPendingForApproval = function () {
  return this.find({ status: 'PENDING_APPROVAL' });
};

module.exports = mongoose.model('Policy', policySchema);
