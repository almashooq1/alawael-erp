/**
 * Assessment Model
 *
 * نموذج البيانات لنظام التقييم والتشخيص
 * يتضمن:
 * - قالب التقييم
 * - نتائج التقييم
 * - التشخيص والملاحظات
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const assessmentSchema = new Schema(
  {
    // معرف الحالة والمستفيد
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
    },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },

    // معلومات التقييم
    assessmentType: {
      type: String,
      enum: [
        'cognitive', // تقييم معرفي
        'behavioral', // تقييم سلوكي
        'physical', // تقييم حركي
        'speech_language', // تقييم نطق ولغة
        'social_emotional', // تقييم اجتماعي عاطفي
        'adaptive', // تقييم التكيفي
        'academic', // تقييم أكاديمي
        'functional', // تقييم وظيفي
        'psychological', // تقييم نفسي
        'initial', // تقييم ابتدائي
        'periodic', // تقييم دوري
        'exit', // تقييم الخروج
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    assessor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assessmentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // نتائج التقييم
    results: {
      totalScore: Number,
      percentageScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      performanceLevel: {
        type: String,
        enum: ['advanced', 'proficient', 'developing', 'beginning'],
      },
      subscales: [
        {
          name: String,
          score: Number,
          percentage: Number,
          interpretation: String,
        },
      ],
      rawData: mongoose.Schema.Types.Mixed,
    },

    // التشخيص
    diagnostic: {
      preliminaryDiagnosis: String,
      recommendations: [String],
      needsFollowUp: Boolean,
      followUpDate: Date,
      notes: String,
    },

    // الملاحظات والتفاصيل
    observations: {
      behaviorDuringAssessment: String,
      strengths: [String],
      challenges: [String],
      emotionalState: String,
      concentration: String,
      motivation: String,
    },

    // الملفات والمرفقات
    documents: [
      {
        title: String,
        fileName: String,
        fileUrl: String,
        uploadDate: Date,
        category: String,
      },
    ],

    // حالة التقييم
    status: {
      type: String,
      enum: ['draft', 'completed', 'under_review', 'approved', 'rejected'],
      default: 'draft',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewDate: Date,
    reviewNotes: String,

    // البيانات الوصفية
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    collection: 'assessments',
  }
);

// الفهارس
assessmentSchema.index({ caseId: 1, beneficiaryId: 1 });
assessmentSchema.index({ assessmentType: 1 });
assessmentSchema.index({ status: 1 });
assessmentSchema.index({ assessmentDate: -1 });
assessmentSchema.index({ assessor: 1 });
assessmentSchema.index({ isArchived: 1 });

// الخصائص الافتراضية
assessmentSchema.virtual('assessorName').get(function () {
  return this.assessor?.name || 'Unknown';
});

assessmentSchema.virtual('daysAgo').get(function () {
  const now = new Date();
  const diff = now - this.assessmentDate;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// الدوال
assessmentSchema.methods.approve = async function (userId, notes) {
  this.status = 'approved';
  this.reviewedBy = userId;
  this.reviewDate = new Date();
  this.reviewNotes = notes;
  return await this.save();
};

assessmentSchema.methods.reject = async function (userId, reason) {
  this.status = 'rejected';
  this.reviewedBy = userId;
  this.reviewDate = new Date();
  this.reviewNotes = reason;
  return await this.save();
};

assessmentSchema.methods.archive = async function () {
  this.isArchived = true;
  return await this.save();
};

// الدوال الثابتة
assessmentSchema.statics.searchByType = function (type) {
  return this.find({ assessmentType: type, isArchived: false });
};

module.exports = mongoose.model('Assessment', assessmentSchema);
