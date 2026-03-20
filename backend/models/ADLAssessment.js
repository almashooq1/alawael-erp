/**
 * @module models/ADLAssessment
 * @description نموذج تقييم مهارات الحياة اليومية (Activities of Daily Living)
 * يشمل تقييم المهارات الأساسية للعيش المستقل
 */

const mongoose = require('mongoose');

// ─── مخطط تقييم مهارة فرعية ───
const skillRatingSchema = new mongoose.Schema(
  {
    skillName: {
      type: String,
      required: [true, 'اسم المهارة مطلوب'],
      trim: true,
    },
    skillNameAr: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'cooking', // الطبخ
        'cleaning', // التنظيف
        'shopping', // التسوق
        'transportation', // استخدام المواصلات
        'personal_care', // العناية الشخصية
        'money_management', // إدارة المال
        'communication', // التواصل
        'safety', // السلامة
        'health', // الصحة
        'time_management', // إدارة الوقت
      ],
      required: [true, 'فئة المهارة مطلوبة'],
    },
    // مقياس التقييم: 1=لا يستطيع، 2=يحتاج مساعدة كاملة، 3=يحتاج مساعدة جزئية، 4=يستطيع بإشراف، 5=مستقل تماماً
    rating: {
      type: Number,
      required: [true, 'درجة التقييم مطلوبة'],
      min: [1, 'أقل درجة هي 1'],
      max: [5, 'أعلى درجة هي 5'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'الملاحظات لا تتجاوز 1000 حرف'],
    },
    supportLevel: {
      type: String,
      enum: ['independent', 'supervision', 'partial_assist', 'full_assist', 'unable'],
      default: 'unable',
    },
  },
  { _id: true }
);

// ─── المخطط الرئيسي لتقييم ADL ───
const adlAssessmentSchema = new mongoose.Schema(
  {
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'المستفيد مطلوب'],
      index: true,
    },
    assessor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'المقيّم مطلوب'],
    },
    assessmentDate: {
      type: Date,
      required: [true, 'تاريخ التقييم مطلوب'],
      default: Date.now,
    },
    assessmentType: {
      type: String,
      enum: ['initial', 'periodic', 'discharge', 'follow_up'],
      default: 'initial',
      required: true,
    },
    // مهارات الطبخ
    cookingSkills: [skillRatingSchema],
    // مهارات التنظيف
    cleaningSkills: [skillRatingSchema],
    // مهارات التسوق
    shoppingSkills: [skillRatingSchema],
    // مهارات استخدام المواصلات
    transportationSkills: [skillRatingSchema],
    // مهارات العناية الشخصية
    personalCareSkills: [skillRatingSchema],
    // مهارات إدارة المال
    moneyManagementSkills: [skillRatingSchema],
    // مهارات التواصل
    communicationSkills: [skillRatingSchema],
    // مهارات السلامة
    safetySkills: [skillRatingSchema],

    // ─── الدرجات المحسوبة ───
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    categoryScores: {
      cooking: { type: Number, min: 0, max: 100, default: 0 },
      cleaning: { type: Number, min: 0, max: 100, default: 0 },
      shopping: { type: Number, min: 0, max: 100, default: 0 },
      transportation: { type: Number, min: 0, max: 100, default: 0 },
      personal_care: { type: Number, min: 0, max: 100, default: 0 },
      money_management: { type: Number, min: 0, max: 100, default: 0 },
      communication: { type: Number, min: 0, max: 100, default: 0 },
      safety: { type: Number, min: 0, max: 100, default: 0 },
    },

    // مستوى الاستقلالية العام
    independenceLevel: {
      type: String,
      enum: [
        'dependent',
        'mostly_dependent',
        'partially_independent',
        'mostly_independent',
        'independent',
      ],
      default: 'dependent',
    },

    // ─── التوصيات ───
    recommendations: {
      type: String,
      trim: true,
      maxlength: [5000, 'التوصيات لا تتجاوز 5000 حرف'],
    },
    priorityAreas: [
      {
        type: String,
        enum: [
          'cooking',
          'cleaning',
          'shopping',
          'transportation',
          'personal_care',
          'money_management',
          'communication',
          'safety',
        ],
      },
    ],
    strengths: {
      type: String,
      trim: true,
      maxlength: [2000, 'نقاط القوة لا تتجاوز 2000 حرف'],
    },
    challenges: {
      type: String,
      trim: true,
      maxlength: [2000, 'التحديات لا تتجاوز 2000 حرف'],
    },

    status: {
      type: String,
      enum: ['draft', 'completed', 'reviewed', 'archived'],
      default: 'draft',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    reviewNotes: {
      type: String,
      trim: true,
    },

    attachments: [
      {
        filename: String,
        url: String,
        type: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───
adlAssessmentSchema.index({ beneficiary: 1, assessmentDate: -1 });
adlAssessmentSchema.index({ assessor: 1, assessmentDate: -1 });
adlAssessmentSchema.index({ status: 1 });

// ─── حساب الدرجات قبل الحفظ ───
adlAssessmentSchema.pre('save', function (next) {
  const allSkillArrays = {
    cooking: this.cookingSkills,
    cleaning: this.cleaningSkills,
    shopping: this.shoppingSkills,
    transportation: this.transportationSkills,
    personal_care: this.personalCareSkills,
    money_management: this.moneyManagementSkills,
    communication: this.communicationSkills,
    safety: this.safetySkills,
  };

  let totalScore = 0;
  let totalCount = 0;

  for (const [category, skills] of Object.entries(allSkillArrays)) {
    if (skills && skills.length > 0) {
      const sum = skills.reduce((acc, s) => acc + (s.rating || 0), 0);
      const avg = sum / skills.length;
      // تحويل من مقياس 1-5 إلى 0-100
      this.categoryScores[category] = Math.round(((avg - 1) / 4) * 100);
      totalScore += sum;
      totalCount += skills.length;
    } else {
      this.categoryScores[category] = 0;
    }
  }

  if (totalCount > 0) {
    const overallAvg = totalScore / totalCount;
    this.overallScore = Math.round(((overallAvg - 1) / 4) * 100);
  } else {
    this.overallScore = 0;
  }

  // تحديد مستوى الاستقلالية
  if (this.overallScore >= 85) this.independenceLevel = 'independent';
  else if (this.overallScore >= 65) this.independenceLevel = 'mostly_independent';
  else if (this.overallScore >= 45) this.independenceLevel = 'partially_independent';
  else if (this.overallScore >= 25) this.independenceLevel = 'mostly_dependent';
  else this.independenceLevel = 'dependent';

  next();
});

// ─── Virtuals ───
adlAssessmentSchema.virtual('totalSkillsAssessed').get(function () {
  return (
    (this.cookingSkills?.length || 0) +
    (this.cleaningSkills?.length || 0) +
    (this.shoppingSkills?.length || 0) +
    (this.transportationSkills?.length || 0) +
    (this.personalCareSkills?.length || 0) +
    (this.moneyManagementSkills?.length || 0) +
    (this.communicationSkills?.length || 0) +
    (this.safetySkills?.length || 0)
  );
});

module.exports = mongoose.model('ADLAssessment', adlAssessmentSchema);
