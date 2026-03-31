/**
 * ADOS-2 & Sensory Profile 2 Assessment Module
 * أدوات تقييم متخصصة: جدول ملاحظة التشخيص للتوحد (ADOS-2)
 * وملف التحليل الحسي للنسخة الثانية (Sensory Profile 2)
 */

const mongoose = require('mongoose');

// ============================================================
// ADOS-2 Schema
// ============================================================
const ADOS2Schema = new mongoose.Schema(
  {
    assessmentId: { type: String, required: true, unique: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    evaluatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    module: {
      type: String,
      enum: ['module_1', 'module_2', 'module_3', 'module_4', 'toddler'],
      required: true,
    },
    assessmentDate: { type: Date, default: Date.now },
    chronologicalAge: { type: Number }, // بالأشهر
    languageLevel: {
      type: String,
      enum: ['nonverbal', 'single_words', 'phrase_speech', 'fluent'],
    },

    // Domain A: Social Affect التواصل الاجتماعي
    socialAffect: {
      spontaneousFunctionalPlayOrImaginaryPlay: { type: Number, min: 0, max: 3, default: 0 },
      nonEcholalicLanguage: { type: Number, min: 0, max: 2, default: 0 },
      pointingOrShowingOrDirectingAttention: { type: Number, min: 0, max: 2, default: 0 },
      eyeContact: { type: Number, min: 0, max: 2, default: 0 },
      facialExpressionsDirectedToExaminer: { type: Number, min: 0, max: 3, default: 0 },
      sharedEnjoymentInInteraction: { type: Number, min: 0, max: 2, default: 0 },
      integrationOfEyeContactWithOtherBehaviors: { type: Number, min: 0, max: 2, default: 0 },
      showingAndSpontaneousInitiation: { type: Number, min: 0, max: 2, default: 0 },
      qualityOfSocialOvertures: { type: Number, min: 0, max: 2, default: 0 },
      qualityOfSocialResponse: { type: Number, min: 0, max: 2, default: 0 },
      amountOfSocialOvertures: { type: Number, min: 0, max: 2, default: 0 },
      overallQualityOfRapport: { type: Number, min: 0, max: 2, default: 0 },
      socialAffectTotal: { type: Number, default: 0 },
    },

    // Domain B: Restricted Repetitive Behaviors السلوكيات المقيدة المتكررة
    restrictedRepetitiveBehaviors: {
      unusualSensoryInterestInPlayMaterialsOrPerson: { type: Number, min: 0, max: 3, default: 0 },
      handAndFingerAndOtherComplexMannerisms: { type: Number, min: 0, max: 2, default: 0 },
      selfInjuriousBehavior: { type: Number, min: 0, max: 3, default: 0 },
      unusualOrRepetitiveInterestsOrStereotypedBehaviors: {
        type: Number,
        min: 0,
        max: 2,
        default: 0,
      },
      compulsionsOrRitualsOrRigidity: { type: Number, min: 0, max: 3, default: 0 },
      rrbTotal: { type: Number, default: 0 },
    },

    // Algorithm scores
    algorithmScores: {
      socialAffectScore: { type: Number },
      rrbScore: { type: Number },
      totalScore: { type: Number },
      comparison: { type: Number, min: 1, max: 10 },
      classification: {
        type: String,
        enum: [
          'autism',
          'autism_spectrum',
          'non_spectrum',
          'little_to_no_evidence',
          'some_evidence',
        ],
      },
      cutoffSA: { type: Number },
      cutoffRRB: { type: Number },
      cutoffTotal: { type: Number },
    },

    // Observations الملاحظات
    observations: {
      languageAndCommunication: { type: String },
      reciprocalSocialInteraction: { type: String },
      play: { type: String },
      stereotypedBehaviors: { type: String },
      behaviorProblems: { type: String },
      otherComments: { type: String },
    },

    // Coding
    codingCompleted: { type: Boolean, default: false },
    supervisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['draft', 'completed', 'reviewed'], default: 'draft' },
  },
  { timestamps: true }
);

// ============================================================
// Sensory Profile 2 Schema
// ============================================================
const SensoryProfile2Schema = new mongoose.Schema(
  {
    assessmentId: { type: String, required: true, unique: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    respondentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    respondentRelation: {
      type: String,
      enum: ['parent', 'teacher', 'therapist', 'self', 'caregiver'],
    },
    form: {
      type: String,
      enum: ['infant_0_6', 'toddler_7_35', 'child_3_14', 'short_adult', 'adult_school'],
      required: true,
    },
    assessmentDate: { type: Date, default: Date.now },
    chronologicalAge: { type: Number }, // بالأشهر

    // Sensory Systems الأجهزة الحسية
    sensoryItems: {
      // Processing - المعالجة الحسية
      auditoryProcessing: {
        items: [{ itemNum: Number, score: { type: Number, min: 1, max: 5 } }],
        rawScore: { type: Number, default: 0 },
        classification: { type: String },
      },
      visualProcessing: {
        items: [{ itemNum: Number, score: { type: Number, min: 1, max: 5 } }],
        rawScore: { type: Number, default: 0 },
        classification: { type: String },
      },
      touchProcessing: {
        items: [{ itemNum: Number, score: { type: Number, min: 1, max: 5 } }],
        rawScore: { type: Number, default: 0 },
        classification: { type: String },
      },
      movementProcessing: {
        items: [{ itemNum: Number, score: { type: Number, min: 1, max: 5 } }],
        rawScore: { type: Number, default: 0 },
        classification: { type: String },
      },
      bodyPositionProcessing: {
        items: [{ itemNum: Number, score: { type: Number, min: 1, max: 5 } }],
        rawScore: { type: Number, default: 0 },
        classification: { type: String },
      },
      oralSensoryProcessing: {
        items: [{ itemNum: Number, score: { type: Number, min: 1, max: 5 } }],
        rawScore: { type: Number, default: 0 },
        classification: { type: String },
      },
    },

    // Quadrant Scores - درجات الأرباع
    quadrantScores: {
      seekingExcited: { rawScore: Number, classification: String, percentile: Number },
      avoidingUnhappy: { rawScore: Number, classification: String, percentile: Number },
      sensitivityMovedByBothering: { rawScore: Number, classification: String, percentile: Number },
      registrationUnderResponsive: {
        rawScore: Number,
        classification: String,
        percentile: Number,
      },
    },

    // School Factors (for child form)
    schoolFactors: {
      attentionAndBehavior: { rawScore: Number, classification: String },
      availability: { rawScore: Number, classification: String },
      movement: { rawScore: Number, classification: String },
      positioning: { rawScore: Number, classification: String },
    },

    // Total Score
    totalScore: { type: Number },
    totalClassification: {
      type: String,
      enum: [
        'much_less_than_most_people',
        'less_than_most_people',
        'similar_to_most_people',
        'more_than_most_people',
        'much_more_than_most_people',
      ],
    },

    // Profile Summary
    profileSummary: {
      dominantPattern: { type: String },
      keyStrengths: [{ type: String }],
      challengeAreas: [{ type: String }],
      recommendations: [{ type: String }],
      sensoryDiet: { type: String },
    },

    status: { type: String, enum: ['draft', 'completed', 'reviewed'], default: 'draft' },
    evaluatorNotes: { type: String },
  },
  { timestamps: true }
);

const ADOS2Assessment = mongoose.model('ADOS2Assessment', ADOS2Schema);
const SensoryProfile2Assessment = mongoose.model(
  'SensoryProfile2Assessment',
  SensoryProfile2Schema
);

// ============================================================
// ADOS-2 Module Cutoffs - حدود القطع لكل موديول
// ============================================================
const ADOS2_CUTOFFS = {
  module_1: {
    nonverbal_to_few_words: {
      autism: { sa: 11, rrb: 3, total: 14 },
      autism_spectrum: { sa: 8, rrb: 2, total: 12 },
    },
    some_words: {
      autism: { sa: 9, rrb: 3, total: 12 },
      autism_spectrum: { sa: 7, rrb: 2, total: 9 },
    },
  },
  module_2: {
    autism: { sa: 9, rrb: 0, total: 9 },
    autism_spectrum: { sa: 7, rrb: 0, total: 7 },
  },
  module_3: {
    autism: { sa: 8, rrb: 2, total: 10 },
    autism_spectrum: { sa: 6, rrb: 2, total: 8 },
  },
  module_4: {
    autism: { sa: 8, rrb: 2, total: 10 },
    autism_spectrum: { sa: 6, rrb: 2, total: 8 },
  },
  toddler: {
    '12-15months': { low: 2, medium: 5, high: 7 },
    '16-17months': { low: 2, medium: 6, high: 9 },
    '18-23months': { low: 3, medium: 8, high: 11 },
    '24-30months': { low: 3, medium: 7, high: 10 },
    '31-months': { low: 3, medium: 7, high: 10 },
  },
};

// ============================================================
// Sensory Profile 2 - Classification Ranges
// ============================================================
const SP2_CLASSIFICATIONS = {
  quadrant: {
    much_less: { label: 'أقل بكثير من معظم الأشخاص', description: 'نمط حسي منخفض جداً' },
    less: { label: 'أقل من معظم الأشخاص', description: 'نمط حسي منخفض' },
    similar: { label: 'مشابه لمعظم الأشخاص', description: 'نمط حسي طبيعي' },
    more: { label: 'أكثر من معظم الأشخاص', description: 'نمط حسي مرتفع' },
    much_more: { label: 'أكثر بكثير من معظم الأشخاص', description: 'نمط حسي مرتفع جداً' },
  },
  patterns: {
    seeker: {
      label: 'الباحث عن الإثارة (Seeker)',
      description: 'يبحث عن كميات كبيرة من المدخلات الحسية',
      strategies: [
        'توفير بيئة غنية بالمحفزات الحسية',
        'برامج الحركة المنتظمة',
        'ألعاب التحدي الحسي',
      ],
    },
    avoider: {
      label: 'المتجنب (Avoider)',
      description: 'يتجنب المدخلات الحسية ويتضايق منها بسرعة',
      strategies: ['تعديل البيئة لتقليل المحفزات', 'الإعداد المسبق للانتقالات', 'التحسس التدريجي'],
    },
    sensitive: {
      label: 'الحساس (Sensitive)',
      description: 'عتبة حسية منخفضة مع استجابة نشطة',
      strategies: ['التوقعات المحددة', 'جداول مرئية', 'أدوات التنظيم الذاتي'],
    },
    bystander: {
      label: 'المراقب (Bystander)',
      description: 'يصل الحس ببطء - تسجيل منخفض',
      strategies: ['بيئة منبهة', 'حركة متكررة', 'مدخلات حسية قوية'],
    },
  },
};

// ============================================================
// ADOS-2 Service
// ============================================================
class ADOS2Service {
  /**
   * إنشاء تقييم ADOS-2 جديد
   */
  async createAssessment(data) {
    const assessmentId = `ADOS2-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const assessment = new ADOS2Assessment({ ...data, assessmentId });
    await assessment.save();
    return { success: true, data: assessment, message: 'تم إنشاء تقييم ADOS-2 بنجاح' };
  }

  /**
   * تحديث بنود تقييم ADOS-2
   */
  async updateItems(assessmentId, itemsData) {
    const assessment = await ADOS2Assessment.findOne({ assessmentId });
    if (!assessment) throw new Error('التقييم غير موجود');

    // تحديث بنود Social Affect
    if (itemsData.socialAffect) {
      Object.assign(assessment.socialAffect, itemsData.socialAffect);
      assessment.socialAffect.socialAffectTotal = this._calculateSATotal(
        assessment.socialAffect,
        assessment.module
      );
    }

    // تحديث بنود RRB
    if (itemsData.restrictedRepetitiveBehaviors) {
      Object.assign(
        assessment.restrictedRepetitiveBehaviors,
        itemsData.restrictedRepetitiveBehaviors
      );
      assessment.restrictedRepetitiveBehaviors.rrbTotal = this._calculateRRBTotal(
        assessment.restrictedRepetitiveBehaviors,
        assessment.module
      );
    }

    await assessment.save();
    return { success: true, data: assessment };
  }

  /**
   * احتساب درجات الخوارزمية والتصنيف
   */
  async calculateAlgorithm(assessmentId) {
    const assessment = await ADOS2Assessment.findOne({ assessmentId });
    if (!assessment) throw new Error('التقييم غير موجود');

    const saScore = assessment.socialAffect.socialAffectTotal;
    const rrbScore = assessment.restrictedRepetitiveBehaviors.rrbTotal;
    const totalScore = saScore + rrbScore;

    const cutoffs = ADOS2_CUTOFFS[assessment.module];
    let classification = 'non_spectrum';

    // تصنيف بناءً على الحدود
    if (cutoffs) {
      const cutoffData =
        assessment.module === 'module_1'
          ? cutoffs[assessment.languageLevel] || cutoffs['nonverbal_to_few_words']
          : cutoffs;
      if (totalScore >= (cutoffData.autism?.total || 99)) {
        classification = 'autism';
      } else if (totalScore >= (cutoffData.autism_spectrum?.total || 99)) {
        classification = 'autism_spectrum';
      }
    }

    assessment.algorithmScores = {
      socialAffectScore: saScore,
      rrbScore,
      totalScore,
      classification,
      cutoffSA: cutoffs?.autism?.sa,
      cutoffRRB: cutoffs?.autism?.rrb,
      cutoffTotal: cutoffs?.autism?.total,
    };

    assessment.codingCompleted = true;
    assessment.status = 'completed';
    await assessment.save();

    return {
      success: true,
      data: assessment.algorithmScores,
      interpretation: this._getInterpretation(classification),
      recommendations: this._getRecommendations(classification, saScore, rrbScore),
    };
  }

  /**
   * الحصول على تقييم بالمعرف
   */
  async getAssessment(assessmentId) {
    const assessment = await ADOS2Assessment.findOne({ assessmentId })
      .populate('beneficiaryId', 'name dateOfBirth diagnosis')
      .populate('evaluatorId', 'name specialization');
    if (!assessment) throw new Error('التقييم غير موجود');
    return { success: true, data: assessment };
  }

  /**
   * استرجاع تقييمات المستفيد
   */
  async getBeneficiaryAssessments(beneficiaryId) {
    const assessments = await ADOS2Assessment.find({ beneficiaryId })
      .sort({ assessmentDate: -1 })
      .populate('evaluatorId', 'name');
    return { success: true, data: assessments, count: assessments.length };
  }

  _calculateSATotal(saData, module) {
    const saFields = [
      'spontaneousFunctionalPlayOrImaginaryPlay',
      'nonEcholalicLanguage',
      'pointingOrShowingOrDirectingAttention',
      'eyeContact',
      'facialExpressionsDirectedToExaminer',
      'sharedEnjoymentInInteraction',
      'integrationOfEyeContactWithOtherBehaviors',
      'showingAndSpontaneousInitiation',
      'qualityOfSocialOvertures',
      'qualityOfSocialResponse',
      'amountOfSocialOvertures',
      'overallQualityOfRapport',
    ];
    return saFields.reduce((sum, field) => sum + (saData[field] || 0), 0);
  }

  _calculateRRBTotal(rrbData, module) {
    const rrbFields = [
      'unusualSensoryInterestInPlayMaterialsOrPerson',
      'handAndFingerAndOtherComplexMannerisms',
      'unusualOrRepetitiveInterestsOrStereotypedBehaviors',
      'compulsionsOrRitualsOrRigidity',
    ];
    return rrbFields.reduce((sum, field) => sum + (rrbData[field] || 0), 0);
  }

  _getInterpretation(classification) {
    const interpretations = {
      autism: 'النتيجة فوق حد القطع للتوحد - يوصى بإجراء تقييم تشخيصي شامل',
      autism_spectrum: 'النتيجة في نطاق طيف التوحد - يوصى بمتابعة دقيقة وتقييم إضافي',
      non_spectrum: 'النتيجة أسفل حد القطع - لا توجد مؤشرات كافية على طيف التوحد',
      little_to_no_evidence: 'أدلة قليلة جداً أو منعدمة على طيف التوحد',
      some_evidence: 'بعض الأدلة على طيف التوحد تستدعي المتابعة',
    };
    return interpretations[classification] || 'النتيجة تحتاج إلى تفسير إكلينيكي إضافي';
  }

  _getRecommendations(classification, saScore, rrbScore) {
    const recs = [];
    if (classification === 'autism' || classification === 'autism_spectrum') {
      recs.push('إحالة فورية لفريق تشخيص متعدد التخصصات');
      recs.push('تقييم تطوري شامل');
      recs.push('تقييم الخطاب واللغة');
      if (saScore > 8) recs.push('تدخل مبكر مكثف للمهارات الاجتماعية');
      if (rrbScore > 3) recs.push('استراتيجيات لإدارة السلوكيات المقيدة المتكررة');
    }
    recs.push('مشاركة الأسرة في خطة التدخل');
    return recs;
  }
}

// ============================================================
// Sensory Profile 2 Service
// ============================================================
class SensoryProfile2Service {
  /**
   * إنشاء تقييم Sensory Profile 2 جديد
   */
  async createAssessment(data) {
    const assessmentId = `SP2-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const assessment = new SensoryProfile2Assessment({ ...data, assessmentId });
    await assessment.save();
    return { success: true, data: assessment, message: 'تم إنشاء تقييم Sensory Profile 2 بنجاح' };
  }

  /**
   * تحديث بنود التقييم الحسي
   */
  async updateItems(assessmentId, itemsData) {
    const assessment = await SensoryProfile2Assessment.findOne({ assessmentId });
    if (!assessment) throw new Error('التقييم غير موجود');

    if (itemsData.sensoryItems) {
      const systems = [
        'auditoryProcessing',
        'visualProcessing',
        'touchProcessing',
        'movementProcessing',
        'bodyPositionProcessing',
        'oralSensoryProcessing',
      ];
      systems.forEach(system => {
        if (itemsData.sensoryItems[system]) {
          assessment.sensoryItems[system].items = itemsData.sensoryItems[system].items;
          assessment.sensoryItems[system].rawScore = itemsData.sensoryItems[system].items.reduce(
            (sum, item) => sum + (item.score || 0),
            0
          );
        }
      });
    }

    await assessment.save();
    return { success: true, data: assessment };
  }

  /**
   * احتساب التصنيف الحسي وتوليد الملف
   */
  async calculateProfile(assessmentId) {
    const assessment = await SensoryProfile2Assessment.findOne({ assessmentId });
    if (!assessment) throw new Error('التقييم غير موجود');

    // احتساب درجات الأرباع
    const quadrants = this._calculateQuadrants(assessment.sensoryItems);
    assessment.quadrantScores = quadrants;

    // توليد الملف الحسي
    const profile = this._generateProfile(quadrants);
    assessment.profileSummary = profile;
    assessment.status = 'completed';

    await assessment.save();
    return {
      success: true,
      data: {
        quadrantScores: quadrants,
        profileSummary: profile,
        patterns: SP2_CLASSIFICATIONS.patterns,
        recommendations: this._generateRecommendations(profile.dominantPattern),
        sensoryDietSuggestions: this._generateSensoryDiet(profile.dominantPattern),
      },
    };
  }

  /**
   * الحصول على تقييم بالمعرف
   */
  async getAssessment(assessmentId) {
    const assessment = await SensoryProfile2Assessment.findOne({ assessmentId })
      .populate('beneficiaryId', 'name dateOfBirth diagnosis')
      .populate('respondentId', 'name');
    if (!assessment) throw new Error('التقييم غير موجود');
    return { success: true, data: assessment };
  }

  _calculateQuadrants(sensoryItems) {
    // حساب مبسط للأرباع بناءً على درجات الأجهزة الحسية
    const touch = sensoryItems.touchProcessing?.rawScore || 0;
    const movement = sensoryItems.movementProcessing?.rawScore || 0;
    const bodyPos = sensoryItems.bodyPositionProcessing?.rawScore || 0;
    const auditory = sensoryItems.auditoryProcessing?.rawScore || 0;
    const visual = sensoryItems.visualProcessing?.rawScore || 0;
    const oral = sensoryItems.oralSensoryProcessing?.rawScore || 0;

    return {
      seekingExcited: {
        rawScore: Math.round((movement + oral + auditory) / 3),
        classification: this._classifyQuadrant(Math.round((movement + oral + auditory) / 3), 15),
        percentile: null,
      },
      avoidingUnhappy: {
        rawScore: Math.round((touch + auditory + visual) / 3),
        classification: this._classifyQuadrant(Math.round((touch + auditory + visual) / 3), 15),
        percentile: null,
      },
      sensitivityMovedByBothering: {
        rawScore: Math.round((auditory + touch + visual) / 3),
        classification: this._classifyQuadrant(Math.round((auditory + touch + visual) / 3), 15),
        percentile: null,
      },
      registrationUnderResponsive: {
        rawScore: Math.round((bodyPos + movement + visual) / 3),
        classification: this._classifyQuadrant(Math.round((bodyPos + movement + visual) / 3), 15),
        percentile: null,
      },
    };
  }

  _classifyQuadrant(score, maxScore) {
    const pct = (score / maxScore) * 100;
    if (pct <= 10) return 'much_less_than_most_people';
    if (pct <= 25) return 'less_than_most_people';
    if (pct <= 75) return 'similar_to_most_people';
    if (pct <= 90) return 'more_than_most_people';
    return 'much_more_than_most_people';
  }

  _generateProfile(quadrants) {
    // تحديد النمط السائد
    const scores = {
      seeker: quadrants.seekingExcited?.rawScore || 0,
      avoider: quadrants.avoidingUnhappy?.rawScore || 0,
      sensitive: quadrants.sensitivityMovedByBothering?.rawScore || 0,
      bystander: quadrants.registrationUnderResponsive?.rawScore || 0,
    };
    const dominant = Object.keys(scores).reduce((a, b) => (scores[a] > scores[b] ? a : b));

    return {
      dominantPattern: dominant,
      keyStrengths: this._getStrengths(dominant),
      challengeAreas: this._getChallenges(dominant),
      recommendations: SP2_CLASSIFICATIONS.patterns[dominant]?.strategies || [],
    };
  }

  _getStrengths(pattern) {
    const strengthsMap = {
      seeker: ['طاقة عالية', 'فضول شديد', 'انخراط اجتماعي'],
      avoider: ['تنظيم ذاتي في البيئات الهادئة', 'حساسية عالية للتفاصيل'],
      sensitive: ['وعي حسي دقيق', 'استجابة سريعة للمحفزات'],
      bystander: ['هدوء ظاهري', 'قدرة على التركيز في بيئات مشتتة'],
    };
    return strengthsMap[pattern] || [];
  }

  _getChallenges(pattern) {
    const challengesMap = {
      seeker: ['صعوبة الجلوس الهادئ', 'البحث المفرط عن محفزات', 'خطر الإصابة'],
      avoider: ['رفض الأنشطة الجديدة', 'انهيارات عاطفية', 'صعوبة المشاركة المجتمعية'],
      sensitive: ['تشتت سهل', 'استجابة مفرطة', 'تحمل منخفض للإزعاج'],
      bystander: ['استجابة بطيئة', 'غياب الذهن', 'صعوبة الإشراك في النشاطات'],
    };
    return challengesMap[pattern] || [];
  }

  _generateRecommendations(pattern) {
    return SP2_CLASSIFICATIONS.patterns[pattern]?.strategies || [];
  }

  _generateSensoryDiet(pattern) {
    const diets = {
      seeker:
        'برنامج حسي يشمل: 30 دقيقة نشاط حركي صباحاً، استراحات حركية كل 45 دقيقة، أدوات ثقيلة للمقاومة، ألعاب البناء والتفكيك',
      avoider:
        'بيئة هادئة ومنظمة: إضاءة خافتة، سماعات عازلة للصوت، إعداد مسبق للتغييرات، فترات هدوء منتظمة',
      sensitive: 'نظام تنظيمي: جداول مرئية، بيئة قابلة للتنبؤ، تحسس تدريجي، استراتيجيات التنفس',
      bystander: 'تنبيه حسي: إضاءة قوية، موسيقى إيقاعية، حركة منتظمة، تغذية راجعة لمسية قوية',
    };
    return diets[pattern] || 'يرجى مراجعة المعالج لتخصيص برنامج حسي مناسب';
  }
}

module.exports = {
  ADOS2Service: new ADOS2Service(),
  SensoryProfile2Service: new SensoryProfile2Service(),
  ADOS2Assessment,
  SensoryProfile2Assessment,
  ADOS2_CUTOFFS,
  SP2_CLASSIFICATIONS,
};
