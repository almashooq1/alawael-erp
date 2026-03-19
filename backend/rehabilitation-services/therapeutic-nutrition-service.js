/* eslint-disable no-unused-vars */
/**
 * Therapeutic Nutrition Service for Disability Rehabilitation
 * خدمة التغذية العلاجية لتأهيل ذوي الإعاقة
 *
 * يشمل التقييم الغذائي، خطط التغذية العلاجية، إدارة صعوبات البلع،
 * والبرامج الغذائية المتخصصة لذوي الاحتياجات الخاصة
 */

class TherapeuticNutritionService {
  constructor() {
    this.sessions = new Map();
    this.plans = new Map();
    this.assessments = new Map();
    this.mealPlans = new Map();
    this.feedingRecords = new Map();
    this.progressReports = new Map();
  }

  /**
   * تقييم غذائي شامل
   */
  async assessNutritionalStatus(beneficiaryId, assessmentData = {}) {
    const assessment = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      assessorId: assessmentData.assessorId || 'system',

      // القياسات الجسمية
      anthropometrics: {
        weight: assessmentData.weight || 0,
        height: assessmentData.height || 0,
        bmi: assessmentData.bmi || 0,
        headCircumference: assessmentData.headCircumference || 0,
        midArmCircumference: assessmentData.midArmCircumference || 0,
        growthPercentile: assessmentData.growthPercentile || 0,
        weightForAge: assessmentData.weightForAge || 'normal',
        heightForAge: assessmentData.heightForAge || 'normal',
      },

      // تقييم التناول الغذائي
      dietaryIntake: {
        calorieIntake: assessmentData.calorieIntake || 0,
        proteinIntake: assessmentData.proteinIntake || 0,
        fluidIntake: assessmentData.fluidIntake || 0,
        fiberIntake: assessmentData.fiberIntake || 0,
        vitaminDeficiencies: assessmentData.vitaminDeficiencies || [],
        mineralDeficiencies: assessmentData.mineralDeficiencies || [],
        dietaryRestrictions: assessmentData.dietaryRestrictions || [],
        allergies: assessmentData.allergies || [],
      },

      // تقييم مهارات التغذية
      feedingSkills: {
        oralMotor: assessmentData.oralMotor || 0,
        chewing: assessmentData.chewing || 0,
        swallowing: assessmentData.swallowing || 0,
        selfFeeding: assessmentData.selfFeeding || 0,
        drinkingFromCup: assessmentData.drinkingFromCup || 0,
        utensilUse: assessmentData.utensilUse || 0,
        textureAcceptance: assessmentData.textureAcceptance || 0,
        overallScore: 0,
      },

      // صعوبات البلع
      swallowingAssessment: {
        hasSwallowingDifficulty: assessmentData.swallowingDifficulty || false,
        dysphagiaSeverity: assessmentData.dysphagiaSeverity || 'none',
        aspirationRisk: assessmentData.aspirationRisk || 'low',
        textureModification: assessmentData.textureModification || 'regular',
        liquidConsistency: assessmentData.liquidConsistency || 'thin',
        positioningNeeds: assessmentData.positioningNeeds || [],
      },

      // السلوك أثناء الأكل
      feedingBehavior: {
        mealDuration: assessmentData.mealDuration || 0,
        foodRefusal: assessmentData.foodRefusal || 0,
        textureAversion: assessmentData.textureAversion || 0,
        mealTimeAnxiety: assessmentData.mealTimeAnxiety || 0,
        foodSelectivity: assessmentData.foodSelectivity || 0,
        overallScore: 0,
      },

      // تقييم الجهاز الهضمي
      gastrointestinal: {
        reflux: assessmentData.reflux || false,
        constipation: assessmentData.constipation || false,
        diarrhea: assessmentData.diarrhea || false,
        abdominaPain: assessmentData.abdominalPain || false,
        nauseaVomiting: assessmentData.nauseaVomiting || false,
        feedingTube: assessmentData.feedingTube || false,
        tubeType: assessmentData.tubeType || null,
      },

      // الأدوية المؤثرة على التغذية
      medicationImpact: {
        medications: assessmentData.medications || [],
        nutritionalImpact: assessmentData.nutritionalImpact || [],
        supplementsNeeded: assessmentData.supplements || [],
      },

      status: 'completed',
    };

    // حساب الدرجات
    assessment.feedingSkills.overallScore = this._avg([
      assessment.feedingSkills.oralMotor,
      assessment.feedingSkills.chewing,
      assessment.feedingSkills.swallowing,
      assessment.feedingSkills.selfFeeding,
      assessment.feedingSkills.drinkingFromCup,
      assessment.feedingSkills.utensilUse,
      assessment.feedingSkills.textureAcceptance,
    ]);

    assessment.feedingBehavior.overallScore = this._avg([
      10 - (assessment.feedingBehavior.foodRefusal || 0),
      10 - (assessment.feedingBehavior.textureAversion || 0),
      10 - (assessment.feedingBehavior.mealTimeAnxiety || 0),
      10 - (assessment.feedingBehavior.foodSelectivity || 0),
    ]);

    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  /**
   * إنشاء خطة تغذية علاجية
   */
  async createNutritionPlan(beneficiaryId, assessmentData = {}) {
    const plan = {
      id: Date.now().toString(),
      beneficiaryId,
      createdAt: new Date(),
      status: 'active',

      goals: assessmentData.goals || [
        { category: 'weight', description: 'الوصول للوزن المثالي', target: 100, current: 0 },
        {
          category: 'nutrition',
          description: 'تحقيق التناول الغذائي الكافي',
          target: 90,
          current: 0,
        },
        { category: 'feeding', description: 'تحسين مهارات الأكل المستقل', target: 80, current: 0 },
        {
          category: 'texture',
          description: 'توسيع قبول الملمسات الغذائية',
          target: 75,
          current: 0,
        },
        { category: 'behavior', description: 'تحسين سلوكيات وقت الوجبة', target: 80, current: 0 },
      ],

      // خطة الوجبات
      mealPlan: this._createMealPlan(assessmentData),

      // التعديلات الغذائية
      dietaryModifications: {
        textureModification: assessmentData.textureModification || 'regular',
        liquidConsistency: assessmentData.liquidConsistency || 'thin',
        calorieGoal: assessmentData.calorieGoal || 0,
        proteinGoal: assessmentData.proteinGoal || 0,
        fluidGoal: assessmentData.fluidGoal || 0,
        restrictions: assessmentData.restrictions || [],
        eliminationDiet: assessmentData.eliminationDiet || [],
      },

      // المكملات الغذائية
      supplements: assessmentData.supplements || [],

      // استراتيجيات التغذية
      feedingStrategies: this._recommendStrategies(assessmentData),

      // أدوات التغذية المتكيفة
      adaptiveEquipment: this._recommendAdaptiveEquipment(assessmentData),

      // تعليمات الأسرة
      familyEducation: [
        'طريقة تحضير الطعام المعدل الملمس',
        'تقنيات تقديم الأطعمة الجديدة',
        'خلق بيئة وجبة إيجابية',
        'علامات الشرق والاختناق وكيفية التعامل',
        'جدول الوجبات والوجبات الخفيفة المنتظم',
      ],

      schedule: {
        followUpFrequency: assessmentData.followUp || 'كل أسبوعين',
        dietitianVisit: assessmentData.dietitianVisit || 'شهري',
        reassessmentDate: assessmentData.reassessment || '3 أشهر',
      },

      notes: assessmentData.notes || '',
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  /**
   * تسجيل جلسة تغذية علاجية
   */
  async recordSession(beneficiaryId, sessionData = {}) {
    const session = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      therapistId: sessionData.therapistId,
      duration: sessionData.duration || 45,
      sessionType: sessionData.type || 'feeding_therapy',

      // القياسات الحالية
      currentMeasurements: {
        weight: sessionData.weight || 0,
        height: sessionData.height || 0,
      },

      // تقييم التناول الغذائي
      nutritionalTracking: {
        caloriesConsumed: sessionData.calories || 0,
        proteinConsumed: sessionData.protein || 0,
        fluidConsumed: sessionData.fluid || 0,
        mealsCompleted: sessionData.mealsCompleted || 0,
        snacksConsumed: sessionData.snacks || 0,
      },

      // تقييم مهارات التغذية
      evaluation: {
        oralMotor: sessionData.oralMotor || 0,
        chewing: sessionData.chewing || 0,
        swallowing: sessionData.swallowing || 0,
        selfFeeding: sessionData.selfFeeding || 0,
        textureAcceptance: sessionData.textureAcceptance || 0,
        mealBehavior: sessionData.mealBehavior || 0,
        newFoodsAccepted: sessionData.newFoodsAccepted || 0,
        independence: sessionData.independence || 0,
      },

      // الأطعمة المجربة
      foodsTried: sessionData.foodsTried || [],
      foodsAccepted: sessionData.foodsAccepted || [],
      foodsRefused: sessionData.foodsRefused || [],

      // ملاحظات البلع
      swallowingNotes: {
        coughing: sessionData.coughing || false,
        wetVoice: sessionData.wetVoice || false,
        pocketing: sessionData.pocketing || false,
        drooling: sessionData.drooling || false,
      },

      therapistNotes: sessionData.therapistNotes || '',
      homeRecommendations: sessionData.homeRecommendations || [],
      nextSessionPlan: sessionData.nextSessionPlan || '',
    };

    this.sessions.set(session.id, session);
    this._updateProgress(beneficiaryId, session);
    return session;
  }

  /**
   * تسجيل سجل تغذية يومي
   */
  async recordDailyFeeding(beneficiaryId, data = {}) {
    const record = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      recordedBy: data.recordedBy || 'caregiver',

      meals: (data.meals || []).map(m => ({
        type: m.type || 'lunch',
        time: m.time || '',
        foods: m.foods || [],
        portionEaten: m.portionEaten || 0,
        texture: m.texture || 'regular',
        duration: m.duration || 0,
        mood: m.mood || 'neutral',
        incidents: m.incidents || [],
      })),

      totalCalories: data.totalCalories || 0,
      totalFluid: data.totalFluid || 0,
      supplementsTaken: data.supplements || [],
      bowelMovement: data.bowelMovement || 'normal',
      notes: data.notes || '',
    };

    this.feedingRecords.set(record.id, record);
    return record;
  }

  /**
   * الحصول على تقرير التقدم
   */
  async getProgressReport(beneficiaryId) {
    const sessions = Array.from(this.sessions.values()).filter(
      s => s.beneficiaryId === beneficiaryId
    );
    const feedingRecords = Array.from(this.feedingRecords.values()).filter(
      r => r.beneficiaryId === beneficiaryId
    );

    const report = {
      beneficiaryId,
      reportDate: new Date(),
      totalSessions: sessions.length,
      totalFeedingRecords: feedingRecords.length,

      skillProgress: {
        oralMotor: this._calcProgress(sessions, 'oralMotor'),
        chewing: this._calcProgress(sessions, 'chewing'),
        swallowing: this._calcProgress(sessions, 'swallowing'),
        selfFeeding: this._calcProgress(sessions, 'selfFeeding'),
        textureAcceptance: this._calcProgress(sessions, 'textureAcceptance'),
        mealBehavior: this._calcProgress(sessions, 'mealBehavior'),
        newFoods: this._calcProgress(sessions, 'newFoodsAccepted'),
        independence: this._calcProgress(sessions, 'independence'),
      },

      weightTrend: this._analyzeWeightTrend(sessions),
      nutritionTracking: this._analyzeNutrition(feedingRecords),
      foodAcceptance: this._analyzeFoodAcceptance(sessions),
      recommendations: this._generateRecommendations(sessions, feedingRecords),
      overallProgress: 0,
    };

    const scores = Object.values(report.skillProgress).map(s => s.average || 0);
    report.overallProgress =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return report;
  }

  // ==================== أساليب مساعدة ====================

  _createMealPlan(data = {}) {
    return {
      breakfast: {
        time: '7:00-8:00',
        examples: ['عصيدة بالفواكه', 'بيض مسلوق مع خبز', 'زبادي مع عسل ومكسرات مطحونة'],
        portionSize: 'حسب العمر والاحتياج',
      },
      morningSnack: {
        time: '10:00',
        examples: ['فاكهة مقطعة', 'بسكويت بالحليب', 'عصير فاكهة طبيعي'],
      },
      lunch: {
        time: '12:30-13:30',
        examples: ['أرز مع خضار ودجاج', 'معكرونة بالصلصة', 'شوربة عدس مع خبز'],
        portionSize: 'حسب العمر والاحتياج',
      },
      afternoonSnack: {
        time: '15:30',
        examples: ['تمر مع حليب', 'ساندويتش صغير', 'مكسرات مطحونة'],
      },
      dinner: {
        time: '18:30-19:30',
        examples: ['شوربة خضار', 'جبنة مع خبز', 'بيض أومليت مع سلطة'],
        portionSize: 'أخف من الغداء',
      },
    };
  }

  _recommendStrategies(data = {}) {
    return [
      'تقديم كميات صغيرة وزيادتها تدريجياً',
      'استخدام تقنية SOS (Sequential Oral Sensory) للأطعمة الجديدة',
      'عدم إجبار الطفل على الأكل',
      'تقديم الطعام في بيئة هادئة وخالية من المشتتات',
      'إشراك المستفيد في تحضير الطعام حسب القدرة',
      'استخدام التعزيز الإيجابي لتجربة أطعمة جديدة',
      'تقديم الأطعمة المفضلة مع الأطعمة الجديدة',
      'الحفاظ على جدول وجبات منتظم',
    ];
  }

  _recommendAdaptiveEquipment(data = {}) {
    return [
      { name: 'ملاعق مائلة/منحنية', purpose: 'تسهيل الأكل المستقل' },
      { name: 'أطباق بحواف عالية', purpose: 'منع انسكاب الطعام' },
      { name: 'قاعدة مانعة للانزلاق', purpose: 'تثبيت الطبق' },
      { name: 'أكواب بفتحة مقطوعة', purpose: 'الشرب دون إمالة الرأس' },
      { name: 'مقابض سميكة للأدوات', purpose: 'تسهيل المسك' },
      { name: 'مريلة حماية', purpose: 'الحفاظ على النظافة' },
      { name: 'كرسي تغذية مكيف', purpose: 'وضعية جلوس صحيحة' },
    ];
  }

  _avg(values) {
    const valid = values.filter(v => typeof v === 'number' && v > 0);
    return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
  }

  _calcProgress(sessions, field) {
    const values = sessions.map(s => s.evaluation[field] || 0).filter(v => v > 0);
    return {
      average:
        values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0,
      trend:
        values.length >= 2
          ? values[values.length - 1] > values[0]
            ? 'improving'
            : 'stable'
          : 'insufficient_data',
      dataPoints: values.length,
    };
  }

  _analyzeWeightTrend(sessions) {
    const weights = sessions.map(s => s.currentMeasurements.weight).filter(w => w > 0);
    return {
      measurements: weights.length,
      firstWeight: weights[0] || 0,
      lastWeight: weights[weights.length - 1] || 0,
      change: weights.length >= 2 ? +(weights[weights.length - 1] - weights[0]).toFixed(1) : 0,
      trend:
        weights.length >= 2
          ? weights[weights.length - 1] > weights[0]
            ? 'gaining'
            : weights[weights.length - 1] < weights[0]
              ? 'losing'
              : 'stable'
          : 'insufficient_data',
    };
  }

  _analyzeNutrition(feedingRecords) {
    const calories = feedingRecords.map(r => r.totalCalories).filter(c => c > 0);
    const fluids = feedingRecords.map(r => r.totalFluid).filter(f => f > 0);
    return {
      averageCalories:
        calories.length > 0 ? Math.round(calories.reduce((a, b) => a + b, 0) / calories.length) : 0,
      averageFluid:
        fluids.length > 0 ? Math.round(fluids.reduce((a, b) => a + b, 0) / fluids.length) : 0,
      recordDays: feedingRecords.length,
    };
  }

  _analyzeFoodAcceptance(sessions) {
    const allAccepted = sessions.flatMap(s => s.foodsAccepted || []);
    const allRefused = sessions.flatMap(s => s.foodsRefused || []);
    const uniqueAccepted = [...new Set(allAccepted)];
    const uniqueRefused = [...new Set(allRefused)];
    return {
      totalFoodsAccepted: uniqueAccepted.length,
      totalFoodsRefused: uniqueRefused.length,
      acceptedFoods: uniqueAccepted,
      refusedFoods: uniqueRefused,
      acceptanceRate:
        uniqueAccepted.length + uniqueRefused.length > 0
          ? Math.round(
              (uniqueAccepted.length / (uniqueAccepted.length + uniqueRefused.length)) * 100
            )
          : 0,
    };
  }

  _generateRecommendations(sessions, records) {
    if (sessions.length === 0) return ['إجراء تقييم غذائي شامل وتحديد الاحتياجات'];
    const recommendations = [];
    const avgSelfFeeding = this._calcProgress(sessions, 'selfFeeding').average;
    if (avgSelfFeeding < 50)
      recommendations.push('التركيز على تدريب مهارات الأكل المستقل مع أدوات متكيفة');
    const avgTexture = this._calcProgress(sessions, 'textureAcceptance').average;
    if (avgTexture < 50)
      recommendations.push('تطبيق بروتوكول SOS لتوسيع قبول ملمسات الطعام تدريجياً');
    const avgBehavior = this._calcProgress(sessions, 'mealBehavior').average;
    if (avgBehavior < 50) recommendations.push('العمل على تحسين بيئة الوجبة وتقليل القلق');
    const weightTrend = this._analyzeWeightTrend(sessions);
    if (weightTrend.trend === 'losing')
      recommendations.push('مراجعة خطة التغذية وزيادة كثافة السعرات');
    return recommendations.length > 0
      ? recommendations
      : ['الاستمرار في البرنامج الحالي مع مراقبة النمو شهرياً'];
  }

  _updateProgress(beneficiaryId, session) {
    const current = this.progressReports.get(beneficiaryId) || { sessions: [], lastUpdated: null };
    current.sessions.push(session.id);
    current.lastUpdated = new Date();
    this.progressReports.set(beneficiaryId, current);
  }
}

module.exports = { TherapeuticNutritionService };
