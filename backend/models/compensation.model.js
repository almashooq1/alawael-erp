/**
 * Compensation & Incentives Model
 * نموذج الحوافز والمزايا الشاملة
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ========== نموذج هيكل الحوافز ==========
const compensationStructureSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: String,
    isActive: { type: Boolean, default: true, index: true },
    applicableTo: {
      type: String,
      enum: ['all', 'department', 'role', 'position', 'custom'],
      default: 'all',
    },
    applicationCriteria: {
      departments: [String],
      roles: [String],
      positions: [String],
      minSalary: Number,
      maxSalary: Number,
    },

    // الراتب الأساسي
    baseSalary: {
      isVariable: { type: Boolean, default: false },
      ranges: [
        {
          minExperience: Number,
          maxExperience: Number,
          amount: Number,
        },
      ],
    },

    // المزايا الثابتة
    fixedAllowances: [
      {
        name: {
          type: String,
          enum: [
            'housing',
            'transportation',
            'meal',
            'communication',
            'uniform',
            'education',
            'medical',
            'other',
          ],
        },
        amount: Number,
        percentage: Number, // من الراتب الأساسي
        currency: { type: String, default: 'SAR' },
        frequency: {
          type: String,
          enum: ['monthly', 'quarterly', 'annual'],
          default: 'monthly',
        },
      },
    ],

    // المزايا المتغيرة
    variableAllowances: [
      {
        name: String,
        condition: String, // e.g., "high qualification", "management level"
        amount: Number,
        percentage: Number,
        maxCap: Number,
      },
    ],

    // بنية الحوافز
    incentiveStructure: {
      performanceBonus: {
        enabled: { type: Boolean, default: true },
        maxPercentage: { type: Number, default: 50 }, // من الراتب الأساسي
        criteria: [
          {
            metric: String, // e.g., sales, productivity, quality
            target: Number,
            bonusPercentage: Number,
          },
        ],
      },

      attendanceBonus: {
        enabled: { type: Boolean, default: true },
        fullAttendanceBonus: Number, // مكافأة حضور 100%
        perDayDeduction: Number, // خصم يومي
      },

      safetyBonus: {
        enabled: { type: Boolean, default: true },
        zeroAccidentBonus: Number,
        safetyMilestoneBonus: Number,
      },

      loyaltyBonus: {
        enabled: { type: Boolean, default: true },
        annualBonusPercentage: { type: Number, default: 100 }, // بناءً على السنة
        milestones: [
          {
            year: Number,
            bonusPercentage: Number,
          },
        ],
      },

      projectBonus: {
        enabled: { type: Boolean, default: true },
        bonusPercentage: Number,
        minProjectValue: Number,
      },

      seasonalBonus: {
        enabled: { type: Boolean, default: true },
        eidBonus: Number,
        yearEndBonus: Number,
        otherBonuses: [
          {
            occasion: String,
            amount: Number,
            month: String,
          },
        ],
      },
    },

    // الخصومات والعقوبات
    penalties: {
      disciplinary: {
        enabled: { type: Boolean, default: true },
        levels: [
          {
            level: String, // warning, suspension, termination
            percentage: Number,
          },
        ],
      },

      attendancePenalty: {
        enabled: { type: Boolean, default: true },
        lateArrivalPenalty: { type: String, default: 'fixed' }, // fixed or percentage
        lateArrivalAmount: Number,
        absentDayPenalty: Number,
      },

      misconductPenalty: {
        enabled: { type: Boolean, default: true },
        types: [
          {
            violation: String,
            penalty: Number,
            maxOccurrences: Number,
          },
        ],
      },
    },

    // الخصومات الإجبارية
    mandatoryDeductions: {
      incomeTax: {
        enabled: { type: Boolean, default: true },
        brackets: [
          {
            minIncome: Number,
            maxIncome: Number,
            taxRate: Number,
          },
        ],
      },

      socialSecurity: {
        enabled: { type: Boolean, default: true },
        employeePercentage: Number,
        employerPercentage: Number,
        maxCap: Number,
      },

      healthInsurance: {
        enabled: { type: Boolean, default: true },
        employeePercentage: Number,
        employerPercentage: Number,
      },

      gosi: {
        enabled: { type: Boolean, default: false }, // Saudi specific
        percentage: Number,
      },
    },

    // الإجازات المدفوعة
    paidLeave: {
      annualLeave: Number, // عدد الأيام
      sickLeave: Number,
      maternityLeave: Number,
      paterleave: Number,
    },

    // المزايا الإضافية
    benefits: [
      {
        name: String,
        type: String, // insurance, training, gym, etc.
        costPerMonth: Number,
        coveragePercentage: Number, // إن لم يكن 100%
      },
    ],

    // التعليقات والملاحظات
    notes: String,
    validFrom: Date,
    validTo: Date,

    createdBy: mongoose.Schema.Types.ObjectId,
    reviewedBy: mongoose.Schema.Types.ObjectId,
    approvedBy: mongoose.Schema.Types.ObjectId,

    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'compensation_structures',
    timestamps: true,
  }
);

// ========== نموذج الحافز الفردي ==========
const individualIncentiveSchema = new Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    employeeName: String,
    departmentId: mongoose.Schema.Types.ObjectId,
    departmentName: String,

    incentiveType: {
      type: String,
      enum: [
        'performance',
        'attendance',
        'safety',
        'loyalty',
        'project',
        'seasonal',
        'recognition',
        'promotion',
        'special',
      ],
      required: true,
      index: true,
    },

    month: String, // YYYY-MM
    year: Number,

    // التفاصيل
    description: String,
    reason: String,
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    percentage: Number, // من الراتب الأساسي

    // المقاييس (للحوافز المبنية على الأداء)
    metrics: {
      targetAchieved: Number,
      targetValue: Number,
      performanceScore: Number, // 0-100
      deliverables: [String],
    },

    // الموافقات
    recommendedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      date: Date,
    },
    approvedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      date: Date,
    },

    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'paid', 'rejected'],
      default: 'draft',
      index: true,
    },

    paymentDate: Date,
    paymentMethod: String,
    transactionReference: String,

    notes: String,
    internalNotes: String,

    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'individual_incentives',
    timestamps: true,
  }
);

// ========== نموذج الغياب والعقوبات ==========
const performancePenaltySchema = new Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    employeeName: String,

    penaltyType: {
      type: String,
      enum: ['attendance', 'disciplinary', 'misconduct', 'performance'],
      required: true,
    },

    reason: String,
    description: String,
    amount: { type: Number, required: true, min: 0 },

    severity: {
      type: String,
      enum: ['minor', 'moderate', 'major'],
      default: 'moderate',
    },

    incidentDate: Date,
    reportDate: { type: Date, default: Date.now },

    evidence: [String], // مراجع للوثائق

    // الإجراء الموصى به
    recommendedAction: String,
    recommendedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      date: Date,
    },

    // الموافقة والتنفيذ
    approvedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      date: Date,
    },

    status: {
      type: String,
      enum: ['reported', 'under-review', 'approved', 'appealed', 'enforced'],
      default: 'reported',
      index: true,
    },

    appealDetails: {
      appealedDate: Date,
      appealReason: String,
      appealOutcome: String, // upheld, overturned, reduced
      reviewedBy: mongoose.Schema.Types.ObjectId,
    },

    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'performance_penalties',
    timestamps: true,
  }
);

// ========== نموذج كشف المزايا السنوي ==========
const benefitsSummarySchema = new Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    employeeName: String,
    departmentId: mongoose.Schema.Types.ObjectId,
    departmentName: String,
    year: { type: Number, required: true, index: true },

    // ملخص سنوي
    baseSalary: Number,
    baseSalaryAnnual: Number,

    allowances: {
      totalMonthly: Number,
      totalAnnual: Number,
      breakdown: [
        {
          name: String,
          monthlyAmount: Number,
          annualAmount: Number,
        },
      ],
    },

    incentives: {
      totalMonthly: Number,
      totalAnnual: Number,
      breakdown: [
        {
          type: String,
          monthlyAverage: Number,
          annualTotal: Number,
        },
      ],
    },

    benefits: {
      totalCost: Number,
      items: [
        {
          name: String,
          cost: Number,
          employeeShare: Number,
          employerShare: Number,
        },
      ],
    },

    deductions: {
      totalMonthly: Number,
      totalAnnual: Number,
      breakdown: [
        {
          name: String,
          monthlyAmount: Number,
          annualAmount: Number,
        },
      ],
    },

    // الملخص الإجمالي
    summary: {
      totalCompensation: Number, // الإجمالي الشامل للشركة
      totalGrossSalary: Number, // الراتب الإجمالي المدفوع
      totalNetSalary: Number, // الراتب الصافي
      totalTaxesAndDeductions: Number,
      totalBenefitsValue: Number,
    },

    notes: String,
    certifiedBy: mongoose.Schema.Types.ObjectId,
    certificationDate: Date,

    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'benefits_summaries',
    timestamps: true,
  }
);

// ========== الفهارس (Indexes) ==========
individualIncentiveSchema.index({ employeeId: 1, month: 1, year: 1 });
individualIncentiveSchema.index({ month: 1, year: 1, status: 1 });
individualIncentiveSchema.index({ departmentId: 1, month: 1 });

performancePenaltySchema.index({ employeeId: 1, 'reportDate': -1 });
performancePenaltySchema.index({ 'status': 1, 'reportDate': -1 });

benefitsSummarySchema.index({ employeeId: 1, year: 1 }, { unique: true });
benefitsSummarySchema.index({ year: 1, departmentId: 1 });

// ========== الطرق (Instance Methods) ==========

/**
 * موافقة على الحافز
 */
individualIncentiveSchema.methods.approve = function (userId, userName) {
  this.status = 'approved';
  this.approvedBy = {
    userId,
    name: userName,
    date: new Date(),
  };
  return this;
};

/**
 * رفض الحافز
 */
individualIncentiveSchema.methods.reject = function (reason) {
  this.status = 'rejected';
  this.notes = reason;
  return this;
};

/**
 * تأكيد دفع الحافز
 */
individualIncentiveSchema.methods.markAsPaid = function (transactionRef) {
  this.status = 'paid';
  this.paymentDate = new Date();
  this.transactionReference = transactionRef;
  return this;
};

/**
 * موافقة على العقوبة
 */
performancePenaltySchema.methods.approve = function (userId, userName) {
  this.status = 'approved';
  this.approvedBy = {
    userId,
    name: userName,
    date: new Date(),
  };
  return this;
};

/**
 * تقديم استئناف
 */
performancePenaltySchema.methods.appeal = function (reason) {
  this.status = 'appealed';
  this.appealDetails = {
    appealedDate: new Date(),
    appealReason: reason,
  };
  return this;
};

/**
 * اتخاذ قرار الاستئناف
 */
performancePenaltySchema.methods.resolveAppeal = function (decision, userId) {
  this.appealDetails.appealOutcome = decision; // upheld, overturned, reduced
  this.appealDetails.reviewedBy = userId;
  this.status =
    decision === 'upheld' ? 'approved' : decision === 'overturned' ? 'reported' : 'approved';
  return this;
};

// ========== الطرق الثابتة (Static Methods) ==========

/**
 * الحصول على الحوافز المعلقة
 */
individualIncentiveSchema.statics.getPendingIncentives = function () {
  return this.find(
    {
      status: { $in: ['draft', 'pending'] },
    },
    null,
    { sort: { createdAt: -1 } }
  );
};

/**
 * الحصول على الحوافز حسب الموظف والسنة
 */
individualIncentiveSchema.statics.getEmployeeYearlyIncentives = function (employeeId, year) {
  return this.find(
    {
      employeeId,
      year,
    },
    null,
    { sort: { month: 1 } }
  );
};

/**
 * حساب إجمالي الحوافز
 */
individualIncentiveSchema.statics.getTotalIncentives = function (month, year) {
  return this.aggregate([
    {
      $match: {
        month,
        year,
        status: 'paid',
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        byType: {
          $push: {
            type: '$incentiveType',
            amount: '$amount',
          },
        },
      },
    },
  ]);
};

/**
 * الحصول على بيانات الحافز الشاملة
 */
compensationStructureSchema.statics.getActiveStructures = function () {
  return this.find(
    {
      isActive: true,
      validFrom: { $lte: new Date() },
      $or: [{ validTo: null }, { validTo: { $gte: new Date() } }],
    },
    null,
    { sort: { createdAt: -1 } }
  );
};

// ========== التصدير ==========
module.exports = {
  CompensationStructure: mongoose.model('CompensationStructure', compensationStructureSchema),
  IndividualIncentive: mongoose.model('IndividualIncentive', individualIncentiveSchema),
  PerformancePenalty: mongoose.model('PerformancePenalty', performancePenaltySchema),
  BenefitsSummary: mongoose.model('BenefitsSummary', benefitsSummarySchema),
};
