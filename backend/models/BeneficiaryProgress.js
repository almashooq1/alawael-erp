/**
 * BeneficiaryProgress Model
 * نموذج تقدم/إنجاز المستفيد
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const BeneficiaryProgressSchema = new Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: [true, 'معرف المستفيد مطلوب'],
      index: true,
    },
    month: {
      type: String,
      required: [true, 'الشهر مطلوب'], // YYYY-MM
      match: /^\d{4}-\d{2}$/,
      index: true,
    },
    academicScore: {
      type: Number,
      required: [true, 'الدرجة الأكاديمية مطلوبة'],
      min: 0,
      max: 100,
    },
    previousMonthScore: Number,
    scoreImprovement: Number,
    attendanceRate: {
      type: Number,
      required: [true, 'نسبة الحضور مطلوبة'],
      min: 0,
      max: 100,
    },
    behaviorRating: {
      type: Number,
      required: [true, 'تقييم السلوك مطلوب'],
      min: 1,
      max: 10,
    },
    participationLevel: {
      type: String,
      enum: ['excellent', 'good', 'average', 'poor'],
      default: 'average',
    },
    completedActivities: {
      type: Number,
      default: 0,
    },
    totalActivities: {
      type: Number,
      default: 0,
    },
    activityCompletionRate: Number,
    absenceDays: {
      type: Number,
      default: 0,
    },
    lateDays: {
      type: Number,
      default: 0,
    },
    strengths: [String],
    areasOfImprovement: [String],
    recommendations: [String],
    teacherNotes: String,
    parentNotes: String,
    highlights: [
      {
        title: String,
        description: String,
        date: Date,
      },
    ],
    challenges: [
      {
        title: String,
        description: String,
        supportGiven: String,
        date: Date,
      },
    ],
    overallPerformance: {
      type: String,
      enum: ['excellent', 'good', 'satisfactory', 'needs_improvement'],
      required: true,
    },
    reportGenerated: {
      type: Boolean,
      default: false,
    },
    reportGeneratedAt: Date,
    reportSentToGuardian: {
      type: Boolean,
      default: false,
    },
    reportSentAt: Date,
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
    collection: 'beneficiary_progress',
  }
);

// Compound Index
BeneficiaryProgressSchema.index({ beneficiaryId: 1, month: -1 });

// Virtual: Performance Status
BeneficiaryProgressSchema.virtual('performanceStatus').get(function () {
  if (this.academicScore >= 90) return 'outstanding';
  if (this.academicScore >= 80) return 'excellent';
  if (this.academicScore >= 70) return 'good';
  if (this.academicScore >= 60) return 'satisfactory';
  return 'needs_improvement';
});

// Virtual: Activity Completion Percentage
BeneficiaryProgressSchema.virtual('completionPercentage').get(function () {
  if (this.totalActivities === 0) return 0;
  return Math.round((this.completedActivities / this.totalActivities) * 100);
});

// Static Methods
BeneficiaryProgressSchema.statics.getRecentProgress = function (beneficiaryId, months = 3) {
  return this.find({ beneficiaryId }).sort({ month: -1 }).limit(months);
};

BeneficiaryProgressSchema.statics.getByMonth = function (beneficiaryId, month) {
  return this.findOne({ beneficiaryId, month });
};

BeneficiaryProgressSchema.statics.getTrend = function (beneficiaryId) {
  return this.find({ beneficiaryId }).sort({ month: 1 }).limit(12);
};

BeneficiaryProgressSchema.statics.getOutstandingPerformers = function (minScore = 90) {
  return this.find({ academicScore: { $gte: minScore } }).sort({ academicScore: -1 });
};

BeneficiaryProgressSchema.statics.getNeedingImprovement = function (maxScore = 70) {
  return this.find({ academicScore: { $lt: maxScore } }).sort({ academicScore: 1 });
};

BeneficiaryProgressSchema.statics.getUnreportedProgress = function () {
  return this.find({
    reportGenerated: false,
    reportSentToGuardian: false,
  });
};

// Instance Methods
BeneficiaryProgressSchema.methods.generateReport = async function () {
  // Calculate performance metrics
  if (this.totalActivities > 0) {
    this.activityCompletionRate = Math.round((this.completedActivities / this.totalActivities) * 100);
  }

  // Determine overall performance
  const avgScore = (this.academicScore + this.behaviorRating * 10 + this.attendanceRate) / 3;
  if (avgScore >= 90) {
    this.overallPerformance = 'excellent';
  } else if (avgScore >= 80) {
    this.overallPerformance = 'good';
  } else if (avgScore >= 70) {
    this.overallPerformance = 'satisfactory';
  } else {
    this.overallPerformance = 'needs_improvement';
  }

  this.reportGenerated = true;
  this.reportGeneratedAt = new Date();

  return this.save();
};

BeneficiaryProgressSchema.methods.sendToGuardian = async function () {
  if (!this.reportGenerated) {
    throw new Error('يجب إنشاء التقرير أولاً');
  }

  this.reportSentToGuardian = true;
  this.reportSentAt = new Date();

  // Create notifications for guardians
  const Beneficiary = mongoose.model('Beneficiary');
  const Notification = mongoose.model('PortalNotification');

  const beneficiary = await Beneficiary.findById(this.beneficiaryId).populate('guardians');

  for (const guardian of beneficiary.guardians || []) {
    await Notification.create({
      guardianId: guardian._id,
      beneficiaryId: this.beneficiaryId,
      type: 'report',
      title_ar: 'تقرير جديد متاح',
      title_en: 'New Report Available',
      message_ar: `تقرير شهر ${this.month} لـ ${beneficiary.fullName_ar} متاح الآن`,
      message_en: `Report for ${this.month} of ${beneficiary.fullName_en} is now available`,
      relatedId: this._id,
    });
  }

  return this.save();
};

BeneficiaryProgressSchema.methods.calculateTrend = async function () {
  const previousMonth = await this.constructor.findOne({
    beneficiaryId: this.beneficiaryId,
    month: {
      $lt: this.month,
    },
  }).sort({ month: -1 });

  if (previousMonth) {
    this.previousMonthScore = previousMonth.academicScore;
    this.scoreImprovement = this.academicScore - previousMonth.academicScore;
  }

  return this;
};

// Middleware
BeneficiaryProgressSchema.pre('save', async function () {
  if (this.isNew) {
    await this.calculateTrend();
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('BeneficiaryProgress', BeneficiaryProgressSchema);
