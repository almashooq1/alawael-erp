/**
 * Employee Model - Enhanced HR System
 * نموذج الموظف - نظام الموارد البشرية المحسّن
 *
 * Features:
 * - معلومات موسعة للموظف
 * - تتبع الأداء والكفاءات
 * - إدارة المشاريع والمهام
 * - متابعة التطور الوظيفي
 * - نظام الرواتب والمزايا
 */

const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    // معلومات أساسية
    employeeId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      required: true,
    },
    phone: String,
    dateOfBirth: Date,
    nationalId: String,

    // معلومات الوظيفة
    position: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
      index: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    hireDate: {
      type: Date,
      required: true,
    },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'temporary'],
      default: 'full-time',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'on-leave', 'terminated'],
      default: 'active',
    },

    // الراتب والمزايا
    salary: {
      base: { type: Number, required: true },
      allowances: [
        {
          name: String,
          amount: Number,
          type: { type: String, enum: ['monthly', 'annual', 'one-time'] },
        },
      ],
      deductions: [
        {
          name: String,
          amount: Number,
          type: { type: String, enum: ['monthly', 'annual', 'one-time'] },
        },
      ],
      lastReviewDate: Date,
      nextReviewDate: Date,
    },

    // تفاصيل التوظيف
    contract: {
      startDate: Date,
      endDate: Date,
      contractType: String,
      renewalDate: Date,
    },

    // معلومات الاتصال الشخصية
    personal: {
      address: String,
      city: String,
      country: String,
      emergencyContact: {
        name: String,
        phone: String,
        relationship: String,
      },
    },

    // الكفاءات والمهارات
    skills: [
      {
        skill: String,
        level: {
          type: String,
          enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        },
        yearsOfExperience: Number,
      },
    ],

    // الأداء والتقييمات
    performance: {
      currentRating: { type: Number, min: 0, max: 5 },
      ratingHistory: [
        {
          date: Date,
          rating: Number,
          reviewer: String,
          comments: String,
        },
      ],
      goals: [
        {
          title: String,
          description: String,
          targetDate: Date,
          status: { type: String, enum: ['pending', 'in-progress', 'completed', 'cancelled'] },
          progress: Number,
        },
      ],
    },

    // إجازات وغيابات
    leave: {
      annualLeaveDays: { type: Number, default: 30 },
      sickLeaveDays: { type: Number, default: 10 },
      usedAnnualLeave: { type: Number, default: 0 },
      usedSickLeave: { type: Number, default: 0 },
      pendingRequests: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'LeaveRequest',
        },
      ],
    },

    // التطور الوظيفي
    careerDevelopment: {
      certifications: [
        {
          name: String,
          issuer: String,
          dateObtained: Date,
          expiryDate: Date,
          documentUrl: String,
        },
      ],
      trainings: [
        {
          name: String,
          provider: String,
          completionDate: Date,
          certificateUrl: String,
        },
      ],
      promotions: [
        {
          fromPosition: String,
          toPosition: String,
          date: Date,
          salary: Number,
        },
      ],
    },

    // الحضور والغياب
    attendance: {
      totalDaysWorked: Number,
      totalAbsences: Number,
      lateArrivals: Number,
      earlyDepartures: Number,
      lastAttendanceUpdate: Date,
    },

    // المشاريع والمهام
    projects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
      },
    ],
    currentProjects: [String],

    // الأداء المالي
    financials: {
      bankAccount: String,
      salary: Number,
      paymentMethod: String,
      taxId: String,
      insuranceNumber: String,
    },

    // الملاحظات والتقييمات
    notes: [
      {
        date: Date,
        author: String,
        content: String,
        type: { type: String, enum: ['positive', 'neutral', 'negative'] },
      },
    ],

    // الملفات والمستندات
    documents: [
      {
        name: String,
        type: String,
        url: String,
        uploadDate: Date,
      },
    ],

    // النظام
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: String,
    lastModifiedBy: String,
  },
  {
    timestamps: true,
    collection: 'employees',
  },
);

// Indexes for better performance
employeeSchema.index({ department: 1, status: 1 });
employeeSchema.index({ hireDate: 1 });
employeeSchema.index({ manager: 1 });
employeeSchema.index({ email: 1 });

// Virtual: Full Name
employeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Methods

/**
 * حساب الراتب الإجمالي
 */
employeeSchema.methods.calculateTotalSalary = function () {
  let total = this.salary.base;

  if (this.salary.allowances) {
    this.salary.allowances.forEach(allowance => {
      if (allowance.type === 'monthly') {
        total += allowance.amount;
      }
    });
  }

  if (this.salary.deductions) {
    this.salary.deductions.forEach(deduction => {
      if (deduction.type === 'monthly') {
        total -= deduction.amount;
      }
    });
  }

  return Math.max(total, 0);
};

/**
 * حساب أيام الإجازة المتبقية
 */
employeeSchema.methods.getRemainingLeaveDays = function () {
  return {
    annual: this.leave.annualLeaveDays - this.leave.usedAnnualLeave,
    sick: this.leave.sickLeaveDays - this.leave.usedSickLeave,
  };
};

/**
 * تحديث حالة الموظف
 */
employeeSchema.methods.updateStatus = function (newStatus) {
  this.status = newStatus;
  this.lastModifiedBy = 'system';
  return this.save();
};

/**
 * إضافة تقييم أداء
 */
employeeSchema.methods.addPerformanceRating = function (rating, reviewer, comments) {
  this.performance.ratingHistory.push({
    date: new Date(),
    rating,
    reviewer,
    comments,
  });

  // تحديث التقييم الحالي كمتوسط آخر 5 تقييمات
  const lastFiveRatings = this.performance.ratingHistory.slice(-5);
  const average = lastFiveRatings.reduce((sum, r) => sum + r.rating, 0) / lastFiveRatings.length;
  this.performance.currentRating = Math.round(average * 10) / 10;

  return this.save();
};

/**
 * إضافة مهارة جديدة
 */
employeeSchema.methods.addSkill = function (skill, level, yearsOfExperience) {
  this.skills.push({
    skill,
    level,
    yearsOfExperience,
  });
  return this.save();
};

/**
 * إضافة شهادة
 */
employeeSchema.methods.addCertification = function (certification) {
  this.careerDevelopment.certifications.push(certification);
  return this.save();
};

/**
 * تسجيل ترقية
 */
employeeSchema.methods.recordPromotion = function (toPosition, newSalary) {
  this.careerDevelopment.promotions.push({
    fromPosition: this.position,
    toPosition,
    date: new Date(),
    salary: newSalary,
  });
  this.position = toPosition;
  this.salary.base = newSalary;
  return this.save();
};

/**
 * الحصول على ملخص الموظف
 */
employeeSchema.methods.getSummary = function () {
  return {
    id: this._id,
    employeeId: this.employeeId,
    fullName: this.fullName,
    email: this.email,
    position: this.position,
    department: this.department,
    status: this.status,
    hireDate: this.hireDate,
    currentRating: this.performance.currentRating,
    totalSalary: this.calculateTotalSalary(),
    remainingLeave: this.getRemainingLeaveDays(),
  };
};

// Statics

/**
 * الحصول على الموظفين حسب القسم
 */
employeeSchema.statics.findByDepartment = function (department) {
  return this.find({ department, status: 'active' });
};

/**
 * الحصول على الموظفين النشطين
 */
employeeSchema.statics.getActiveEmployees = function () {
  return this.find({ status: 'active' });
};

/**
 * إحصائيات الموارد البشرية
 */
employeeSchema.statics.getHRAnalytics = async function () {
  const totalEmployees = await this.countDocuments();
  const activeEmployees = await this.countDocuments({ status: 'active' });
  const departmentStats = await this.aggregate([
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 },
        avgSalary: { $avg: '$salary.base' },
      },
    },
  ]);

  const employeesByStatus = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    totalEmployees,
    activeEmployees,
    inactiveEmployees: totalEmployees - activeEmployees,
    departmentStats,
    employeesByStatus,
    averageSalary: await this.aggregate([
      {
        $group: {
          _id: null,
          avg: { $avg: '$salary.base' },
        },
      },
    ]),
  };
};

/**
 * البحث عن الموظفين
 */
employeeSchema.statics.searchEmployees = function (searchTerm) {
  const searchRegex = new RegExp(searchTerm, 'i');
  return this.find({
    $or: [{ firstName: searchRegex }, { lastName: searchRegex }, { email: searchRegex }, { employeeId: searchRegex }],
  });
};

/**
 * الموظفون الذين ينتهي عقدهم قريباً
 */
employeeSchema.statics.getContractExpiringEmployees = function (daysThreshold = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysThreshold);

  return this.find({
    'contract.endDate': {
      $lte: futureDate,
      $gte: new Date(),
    },
  });
};

module.exports = mongoose.model('Employee', employeeSchema);
