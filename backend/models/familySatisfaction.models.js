/**
 * نموذج استبيانات رضا الأسر
 * Family Satisfaction Survey Model
 *
 * نظام شامل لقياس رضا الأسر عن الخدمات التأهيلية
 * يشمل NPS ، CSAT ، واستبيانات مخصصة
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ============================================================
// نموذج قالب الاستبيان
// Survey Template Schema
// ============================================================
const SurveyTemplateSchema = new Schema(
  {
    code: { type: String, unique: true, required: true },
    title: {
      ar: { type: String, required: true },
      en: { type: String },
    },
    description: {
      ar: { type: String },
      en: { type: String },
    },
    category: {
      type: String,
      enum: [
        'family_satisfaction', // رضا الأسر العام
        'service_satisfaction', // الرضا عن خدمة معينة
        'post_session', // بعد الجلسة مباشرة
        'quarterly_review', // المراجعة الربع سنوية
        'discharge', // عند الخروج
        'annual', // السنوي الشامل
        'nps', // Net Promoter Score
        'accessibility', // إمكانية الوصول
        'communication', // جودة التواصل
        'staff_interaction', // التعامل مع الكادر
      ],
      required: true,
    },

    // أسئلة الاستبيان
    questions: [
      {
        questionId: { type: String, required: true },
        text: {
          ar: { type: String, required: true },
          en: { type: String },
        },
        type: {
          type: String,
          enum: ['rating_5', 'rating_10', 'nps', 'yes_no', 'multiple_choice', 'text', 'scale'],
          required: true,
        },
        options: [
          {
            value: Schema.Types.Mixed,
            label: { ar: String, en: String },
          },
        ],
        required: { type: Boolean, default: true },
        category: { type: String }, // لتجميع الأسئلة
        weight: { type: Number, default: 1 }, // وزن السؤال في الحساب
        order: { type: Number },
      },
    ],

    // إعدادات
    settings: {
      isAnonymous: { type: Boolean, default: false },
      requireAllQuestions: { type: Boolean, default: false },
      showProgressBar: { type: Boolean, default: true },
      autoSendAfterSession: { type: Boolean, default: false },
      reminderDays: { type: Number, default: 3 },
      maxCompletionDays: { type: Number, default: 14 },
    },

    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'survey_templates',
  }
);

// ============================================================
// نموذج استجابة الاستبيان
// Survey Response Schema
// ============================================================
const SurveyResponseSchema = new Schema(
  {
    template: { type: Schema.Types.ObjectId, ref: 'SurveyTemplate', required: true },
    templateCode: { type: String, required: true },

    // معلومات المستجيب
    respondent: {
      type: {
        type: String,
        enum: ['family_member', 'guardian', 'beneficiary', 'other'],
        required: true,
      },
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
      relationship: { type: String }, // ولي أمر، أب، أم، أخ
      phone: { type: String },
      email: { type: String },
      isAnonymous: { type: Boolean, default: false },
    },

    // المستفيد المرتبط
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },

    // الخدمة / البرنامج المرتبط
    relatedService: {
      type: { type: String }, // speech_therapy, day_care, etc.
      name: { type: String },
      session: { type: Schema.Types.ObjectId },
      program: { type: Schema.Types.ObjectId },
    },

    // الإجابات
    answers: [
      {
        questionId: { type: String, required: true },
        value: { type: Schema.Types.Mixed, required: true },
        comment: { type: String },
        answeredAt: { type: Date, default: Date.now },
      },
    ],

    // الدرجات المحسوبة
    scores: {
      overallSatisfaction: { type: Number, min: 0, max: 100 },
      npsScore: { type: Number, min: 0, max: 10 },
      npsCategory: { type: String, enum: ['promoter', 'passive', 'detractor'] },
      csatScore: { type: Number, min: 0, max: 100 },

      // درجات حسب الفئة
      byCategory: [
        {
          category: String,
          score: Number,
          maxScore: Number,
          percentage: Number,
        },
      ],
    },

    // تحليل المشاعر (sentiment)
    sentiment: {
      overall: { type: String, enum: ['positive', 'neutral', 'negative'] },
      keywords: [{ type: String }],
      textFeedbackSummary: { type: String },
    },

    // حالة الاستبيان
    status: {
      type: String,
      enum: ['sent', 'opened', 'in_progress', 'completed', 'expired'],
      default: 'sent',
    },
    sentAt: { type: Date },
    openedAt: { type: Date },
    completedAt: { type: Date },
    completionTime: { type: Number }, // بالثواني

    // المتابعة
    followUp: {
      required: { type: Boolean, default: false },
      reason: { type: String },
      assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['pending', 'contacted', 'resolved'] },
      notes: { type: String },
      resolvedAt: { type: Date },
    },

    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'survey_responses',
  }
);

SurveyResponseSchema.index({ template: 1, completedAt: -1 });
SurveyResponseSchema.index({ beneficiary: 1 });
SurveyResponseSchema.index({ status: 1, branch: 1 });
SurveyResponseSchema.index({ 'scores.npsScore': 1 });

// ============================================================
// نموذج تقرير تحليلات الاستبيانات
// Survey Analytics Report Schema
// ============================================================
const SurveyAnalyticsSchema = new Schema(
  {
    reportPeriod: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    reportType: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual', 'custom'],
      required: true,
    },

    // NPS
    nps: {
      score: { type: Number }, // -100 to 100
      promoters: { type: Number },
      passives: { type: Number },
      detractors: { type: Number },
      totalResponses: { type: Number },
      trend: { type: String, enum: ['improving', 'stable', 'declining'] },
      previousScore: { type: Number },
    },

    // CSAT
    csat: {
      score: { type: Number, min: 0, max: 100 },
      totalResponses: { type: Number },
      trend: { type: String, enum: ['improving', 'stable', 'declining'] },
    },

    // Overall Satisfaction
    overallSatisfaction: {
      average: { type: Number, min: 0, max: 100 },
      distribution: {
        veryDissatisfied: Number,
        dissatisfied: Number,
        neutral: Number,
        satisfied: Number,
        verySatisfied: Number,
      },
    },

    // بحسب فئة الخدمة
    byServiceCategory: [
      {
        category: String,
        categoryName: { ar: String, en: String },
        averageScore: Number,
        responseCount: Number,
        nps: Number,
      },
    ],

    // الملاحظات النصية الأكثر شيوعاً
    topPositiveFeedback: [{ text: String, count: Number }],
    topNegativeFeedback: [{ text: String, count: Number }],
    topSuggestions: [{ text: String, count: Number }],

    // خطة تحسين
    actionItems: [
      {
        area: String,
        issue: String,
        action: String,
        responsible: String,
        deadline: Date,
        status: { type: String, enum: ['pending', 'in_progress', 'completed'] },
      },
    ],

    // معدل الاستجابة
    responseRate: {
      sent: Number,
      completed: Number,
      rate: Number, // percentage
    },

    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'survey_analytics',
  }
);

SurveyAnalyticsSchema.index({ 'reportPeriod.startDate': -1, branch: 1 });

// ============================================================
const FamilySurveyTemplate =
  mongoose.models.FamilySurveyTemplate ||
  mongoose.model('FamilySurveyTemplate', SurveyTemplateSchema);
const FamilySurveyResponse =
  mongoose.models.FamilySurveyResponse ||
  mongoose.model('FamilySurveyResponse', SurveyResponseSchema);
const FamilySurveyAnalytics =
  mongoose.models.FamilySurveyAnalytics ||
  mongoose.model('FamilySurveyAnalytics', SurveyAnalyticsSchema);

module.exports = {
  SurveyTemplate: FamilySurveyTemplate,
  SurveyResponse: FamilySurveyResponse,
  SurveyAnalytics: FamilySurveyAnalytics,
};
