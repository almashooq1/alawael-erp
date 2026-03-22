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

// ─── Virtual: skill distribution categories ───
adlAssessmentSchema.virtual('skillDistribution').get(function () {
  const allSkills = [
    ...(this.cookingSkills || []),
    ...(this.cleaningSkills || []),
    ...(this.shoppingSkills || []),
    ...(this.transportationSkills || []),
    ...(this.personalCareSkills || []),
    ...(this.moneyManagementSkills || []),
    ...(this.communicationSkills || []),
    ...(this.safetySkills || []),
  ];
  if (!allSkills.length) return { independent: 0, supervision: 0, partialAssist: 0, fullAssist: 0, unable: 0 };

  return {
    independent: allSkills.filter(s => s.rating === 5).length,
    supervision: allSkills.filter(s => s.rating === 4).length,
    partialAssist: allSkills.filter(s => s.rating === 3).length,
    fullAssist: allSkills.filter(s => s.rating === 2).length,
    unable: allSkills.filter(s => s.rating === 1).length,
    total: allSkills.length,
  };
});

// ─── Virtual: improvement areas ───
adlAssessmentSchema.virtual('improvementAreas').get(function () {
  const categories = {
    cooking: this.categoryScores?.cooking || 0,
    cleaning: this.categoryScores?.cleaning || 0,
    shopping: this.categoryScores?.shopping || 0,
    transportation: this.categoryScores?.transportation || 0,
    personal_care: this.categoryScores?.personal_care || 0,
    money_management: this.categoryScores?.money_management || 0,
    communication: this.categoryScores?.communication || 0,
    safety: this.categoryScores?.safety || 0,
  };
  return Object.entries(categories)
    .filter(([, score]) => score < 50)
    .sort(([, a], [, b]) => a - b)
    .map(([category, score]) => ({ category, score }));
});

// ─── Method: get progress compared to previous assessment ───
adlAssessmentSchema.methods.getProgressFromPrevious = function (previousAssessment) {
  if (!previousAssessment) return null;

  const categories = ['cooking', 'cleaning', 'shopping', 'transportation', 'personal_care', 'money_management', 'communication', 'safety'];
  const categoryChanges = categories.map(cat => ({
    category: cat,
    current: this.categoryScores?.[cat] || 0,
    previous: previousAssessment.categoryScores?.[cat] || 0,
    change: (this.categoryScores?.[cat] || 0) - (previousAssessment.categoryScores?.[cat] || 0),
  }));

  return {
    overallChange: this.overallScore - (previousAssessment.overallScore || 0),
    overallImprovement: this.overallScore > (previousAssessment.overallScore || 0),
    previousLevel: previousAssessment.independenceLevel,
    currentLevel: this.independenceLevel,
    levelImproved: this.overallScore > (previousAssessment.overallScore || 0),
    categoryChanges,
    improvedCategories: categoryChanges.filter(c => c.change > 0),
    declinedCategories: categoryChanges.filter(c => c.change < 0),
    daysBetween: this.assessmentDate && previousAssessment.assessmentDate
      ? Math.ceil((this.assessmentDate - previousAssessment.assessmentDate) / (1000 * 60 * 60 * 24))
      : null,
  };
};

// ─── Method: generate ADL report ───
adlAssessmentSchema.methods.generateADLReport = function () {
  const dist = this.skillDistribution;
  const improvements = this.improvementAreas;
  const strengths = Object.entries(this.categoryScores?.toObject?.() || this.categoryScores || {})
    .filter(([, score]) => score >= 75)
    .map(([cat, score]) => ({ category: cat, score }));

  return {
    beneficiary: this.beneficiary,
    assessor: this.assessor,
    date: this.assessmentDate,
    type: this.assessmentType,
    overallScore: this.overallScore,
    independenceLevel: this.independenceLevel,
    totalSkillsAssessed: this.totalSkillsAssessed,
    skillDistribution: dist,
    categoryScores: this.categoryScores,
    strengths,
    improvementAreas: improvements,
    priorityAreas: this.priorityAreas,
    recommendations: this.recommendations,
    independencePercentage: dist.total ? Math.round(((dist.independent + dist.supervision) / dist.total) * 100) : 0,
  };
};

// ─── Method: get training plan suggestions ───
adlAssessmentSchema.methods.getTrainingPlanSuggestions = function () {
  const TRAINING_MAP = {
    cooking: { nameAr: 'برنامج تدريب الطبخ', focus: 'تحضير الوجبات والسلامة في المطبخ' },
    cleaning: { nameAr: 'برنامج مهارات التنظيف', focus: 'ترتيب وتنظيف المنزل' },
    shopping: { nameAr: 'برنامج مهارات التسوق', focus: 'التسوق وإدارة المشتريات' },
    transportation: { nameAr: 'برنامج استخدام المواصلات', focus: 'التنقل المستقل' },
    personal_care: { nameAr: 'برنامج العناية الشخصية', focus: 'النظافة الذاتية واللبس' },
    money_management: { nameAr: 'برنامج إدارة المال', focus: 'التعامل مع المال والميزانية' },
    communication: { nameAr: 'برنامج التواصل', focus: 'استخدام الهاتف والتواصل الاجتماعي' },
    safety: { nameAr: 'برنامج السلامة', focus: 'الأمان في المنزل والطوارئ' },
  };

  const improvements = this.improvementAreas;
  return improvements.map(area => ({
    ...area,
    ...TRAINING_MAP[area.category],
    priority: area.score < 25 ? 'عالية' : area.score < 50 ? 'متوسطة' : 'منخفضة',
    estimatedDuration: area.score < 25 ? '12 أسبوع' : area.score < 50 ? '8 أسابيع' : '4 أسابيع',
  }));
};

// ─── Static: get ADL statistics ───
adlAssessmentSchema.statics.getADLStatistics = async function () {
  const [total, byType, avgScores, byLevel] = await Promise.all([
    this.countDocuments(),
    this.aggregate([{ $group: { _id: '$assessmentType', count: { $sum: 1 } } }]),
    this.aggregate([{
      $group: {
        _id: null,
        avgOverall: { $avg: '$overallScore' },
        avgCooking: { $avg: '$categoryScores.cooking' },
        avgCleaning: { $avg: '$categoryScores.cleaning' },
        avgShopping: { $avg: '$categoryScores.shopping' },
        avgTransportation: { $avg: '$categoryScores.transportation' },
        avgPersonalCare: { $avg: '$categoryScores.personal_care' },
        avgMoneyManagement: { $avg: '$categoryScores.money_management' },
        avgCommunication: { $avg: '$categoryScores.communication' },
        avgSafety: { $avg: '$categoryScores.safety' },
      },
    }]),
    this.aggregate([{ $group: { _id: '$independenceLevel', count: { $sum: 1 } } }]),
  ]);

  return {
    total,
    byAssessmentType: byType,
    averageScores: avgScores[0] || {},
    byIndependenceLevel: byLevel,
  };
};

// ─── Static: get beneficiary progress over time ───
adlAssessmentSchema.statics.getBeneficiaryADLProgress = async function (beneficiaryId) {
  const assessments = await this.find({ beneficiary: beneficiaryId })
    .sort({ assessmentDate: 1 })
    .lean();

  if (assessments.length < 2) {
    return {
      assessmentCount: assessments.length,
      trend: 'insufficient_data',
      assessments: assessments.map(a => ({
        date: a.assessmentDate,
        type: a.assessmentType,
        overallScore: a.overallScore,
        level: a.independenceLevel,
      })),
    };
  }

  const first = assessments[0];
  const last = assessments[assessments.length - 1];
  const change = (last.overallScore || 0) - (first.overallScore || 0);

  return {
    assessmentCount: assessments.length,
    trend: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
    overallChange: change,
    firstAssessment: { date: first.assessmentDate, score: first.overallScore, level: first.independenceLevel },
    lastAssessment: { date: last.assessmentDate, score: last.overallScore, level: last.independenceLevel },
    assessments: assessments.map(a => ({
      date: a.assessmentDate,
      type: a.assessmentType,
      overallScore: a.overallScore,
      level: a.independenceLevel,
      categoryScores: a.categoryScores,
    })),
  };
};

module.exports = mongoose.model('ADLAssessment', adlAssessmentSchema);
