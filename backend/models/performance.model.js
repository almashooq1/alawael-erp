/**
 * Performance Management Model
 * نموذج إدارة الأداء
 */

const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },

    // فترة التقييم
    period: {
      startDate: Date,
      endDate: Date,
    },

    // المقاييس والأهداف
    goals: [
      {
        description: String,
        weight: Number, // النسبة المئوية
        targetValue: Number,
        actualValue: Number,
        status: {
          type: String,
          enum: ['not-started', 'in-progress', 'completed', 'failed'],
        },
        comments: String,
      },
    ],

    // تقييم الأداء
    ratings: {
      productivity: { type: Number, min: 1, max: 5 },
      quality: { type: Number, min: 1, max: 5 },
      teamwork: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      attendance: { type: Number, min: 1, max: 5 },
      initiative: { type: Number, min: 1, max: 5 },
      customerService: { type: Number, min: 1, max: 5 },
    },

    // النقاط القوية والضعيفة
    strengths: [String],
    weaknesses: [String],
    areasForImprovement: [String],

    // الأداء الإجمالي
    overallRating: Number,
    overallComments: String,

    // المراجعة
    reviewer: {
      name: String,
      position: String,
      date: Date,
    },

    // خطة التطوير
    developmentPlan: [
      {
        action: String,
        targetDate: Date,
        responsible: String,
        status: String,
      },
    ],

    // الترقية والمكافآت
    recommendations: {
      promotion: Boolean,
      salary_increase: Boolean,
      bonus: Boolean,
      training: [String],
    },

    // التوقيعات والموافقات
    employeeSignature: {
      date: Date,
      acknowledged: Boolean,
    },
    managerSignature: {
      date: Date,
      approved: Boolean,
    },
    hrSignature: {
      date: Date,
      processed: Boolean,
    },

    status: {
      type: String,
      enum: ['draft', 'submitted', 'reviewed', 'approved', 'completed'],
      default: 'draft',
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'performance_reviews',
  },
);

performanceSchema.index({ employeeId: 1, 'period.startDate': 1 });

/**
 * حساب التقييم الإجمالي
 */
performanceSchema.methods.calculateOverallRating = function () {
  const { ratings } = this;
  if (!ratings) return 0;

  const values = Object.values(ratings).filter(v => v !== null && v !== undefined);
  if (values.length === 0) return 0;

  const sum = values.reduce((a, b) => a + b, 0);
  this.overallRating = Math.round((sum / values.length) * 10) / 10;
  return this.overallRating;
};

/**
 * حساب نسبة تحقق الأهداف
 */
performanceSchema.methods.getGoalCompletionRate = function () {
  if (!this.goals || this.goals.length === 0) return 0;
  const completed = this.goals.filter(g => g.status === 'completed').length;
  return (completed / this.goals.length) * 100;
};

/**
 * توقيع الموظف
 */
performanceSchema.methods.signByEmployee = function () {
  this.employeeSignature = {
    date: new Date(),
    acknowledged: true,
  };
  this.status = 'submitted';
  return this.save();
};

/**
 * توقيع المدير
 */
performanceSchema.methods.approveByManager = function () {
  this.managerSignature = {
    date: new Date(),
    approved: true,
  };
  return this.save();
};

/**
 * معالجة من قبل HR
 */
performanceSchema.methods.processByHR = function () {
  this.hrSignature = {
    date: new Date(),
    processed: true,
  };
  this.status = 'completed';
  return this.save();
};

module.exports = mongoose.model('Performance', performanceSchema);
