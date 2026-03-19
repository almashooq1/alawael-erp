/* eslint-disable no-unused-vars */
/**
 * Sensory Integration Therapy Service
 * خدمة العلاج الحسي التكاملي لذوي الإعاقة
 *
 * يشمل علاج اضطرابات المعالجة الحسية، التكامل الحسي،
 * والتنظيم الذاتي للأطفال والبالغين ذوي صعوبات المعالجة الحسية
 */

class SensoryIntegrationService {
  constructor() {
    this.sessions = new Map();
    this.plans = new Map();
    this.assessments = new Map();
    this.sensoryProfiles = new Map();
    this.sensoryDiets = new Map();
    this.progressReports = new Map();
  }

  /**
   * تقييم الملف الحسي الشامل
   */
  async assessSensoryProfile(beneficiaryId, assessmentData = {}) {
    const assessment = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      assessorId: assessmentData.assessorId || 'system',

      // النظام اللمسي
      tactileSystem: {
        lightTouch: assessmentData.lightTouch || 0,
        deepPressure: assessmentData.deepPressure || 0,
        textureDiscrimination: assessmentData.textureDiscrimination || 0,
        temperatureSensitivity: assessmentData.temperatureSensitivity || 0,
        painSensitivity: assessmentData.painSensitivity || 0,
        pattern: assessmentData.tactilePattern || 'typical', // hyper, hypo, seeking, typical
        overallScore: 0,
      },

      // النظام الدهليزي (التوازن)
      vestibularSystem: {
        balanceStatic: assessmentData.balanceStatic || 0,
        balanceDynamic: assessmentData.balanceDynamic || 0,
        movementTolerance: assessmentData.movementTolerance || 0,
        gravitationalSecurity: assessmentData.gravitationalSecurity || 0,
        postRotaryNystagmus: assessmentData.postRotaryNystagmus || 0,
        pattern: assessmentData.vestibularPattern || 'typical',
        overallScore: 0,
      },

      // النظام الحسي العميق (Proprioception)
      proprioceptiveSystem: {
        bodyAwareness: assessmentData.bodyAwareness || 0,
        forceGrading: assessmentData.forceGrading || 0,
        motorPlanning: assessmentData.motorPlanning || 0,
        jointPosition: assessmentData.jointPosition || 0,
        muscleControl: assessmentData.muscleControl || 0,
        pattern: assessmentData.proprioceptivePattern || 'typical',
        overallScore: 0,
      },

      // النظام البصري
      visualSystem: {
        visualTracking: assessmentData.visualTracking || 0,
        visualDiscrimination: assessmentData.visualDiscrimination || 0,
        lightSensitivity: assessmentData.lightSensitivity || 0,
        figureGround: assessmentData.figureGround || 0,
        visualMotor: assessmentData.visualMotor || 0,
        pattern: assessmentData.visualPattern || 'typical',
        overallScore: 0,
      },

      // النظام السمعي
      auditorySystem: {
        soundDiscrimination: assessmentData.soundDiscrimination || 0,
        soundLocalization: assessmentData.soundLocalization || 0,
        noiseSensitivity: assessmentData.noiseSensitivity || 0,
        auditoryFiltering: assessmentData.auditoryFiltering || 0,
        auditoryAttention: assessmentData.auditoryAttention || 0,
        pattern: assessmentData.auditoryPattern || 'typical',
        overallScore: 0,
      },

      // النظام الشمي والذوقي
      oralOlfactorySystem: {
        tasteSensitivity: assessmentData.tasteSensitivity || 0,
        smellSensitivity: assessmentData.smellSensitivity || 0,
        oralMotor: assessmentData.oralMotor || 0,
        foodTextureAcceptance: assessmentData.foodTextureAcceptance || 0,
        pattern: assessmentData.oralPattern || 'typical',
        overallScore: 0,
      },

      // التنظيم الذاتي
      selfRegulation: {
        arousualModulation: assessmentData.arousalModulation || 0,
        emotionalRegulation: assessmentData.emotionalRegulation || 0,
        behavioralControl: assessmentData.behavioralControl || 0,
        transitionManagement: assessmentData.transitionManagement || 0,
        selfCalming: assessmentData.selfCalming || 0,
        overallScore: 0,
      },

      // الأداء الوظيفي
      functionalImpact: {
        dailyRoutines: assessmentData.dailyRoutines || 0,
        socialParticipation: assessmentData.socialParticipation || 0,
        academicPerformance: assessmentData.academicPerformance || 0,
        playSkills: assessmentData.playSkills || 0,
        overallScore: 0,
      },

      status: 'completed',
    };

    // حساب الدرجات
    const systems = [
      'tactileSystem',
      'vestibularSystem',
      'proprioceptiveSystem',
      'visualSystem',
      'auditorySystem',
      'oralOlfactorySystem',
      'selfRegulation',
      'functionalImpact',
    ];

    systems.forEach(system => {
      const scores = Object.entries(assessment[system])
        .filter(([key, val]) => typeof val === 'number' && key !== 'overallScore' && val > 0)
        .map(([, val]) => val);
      assessment[system].overallScore =
        scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    });

    this.assessments.set(assessment.id, assessment);
    this.sensoryProfiles.set(beneficiaryId, assessment);
    return assessment;
  }

  /**
   * إنشاء خطة علاج حسي تكاملي
   */
  async createSensoryIntegrationPlan(beneficiaryId, assessmentData = {}) {
    const plan = {
      id: Date.now().toString(),
      beneficiaryId,
      createdAt: new Date(),
      status: 'active',

      goals: assessmentData.goals || [
        { system: 'tactile', description: 'تحسين تحمل الملمسات المختلفة', target: 80, current: 0 },
        {
          system: 'vestibular',
          description: 'تحسين التوازن والأمان الجاذبي',
          target: 75,
          current: 0,
        },
        {
          system: 'proprioceptive',
          description: 'تعزيز الوعي بالجسم والتخطيط الحركي',
          target: 75,
          current: 0,
        },
        {
          system: 'regulation',
          description: 'تحسين التنظيم الذاتي والتعديل الحسي',
          target: 80,
          current: 0,
        },
        {
          system: 'functional',
          description: 'تحسين المشاركة في الأنشطة اليومية',
          target: 85,
          current: 0,
        },
      ],

      // الأنشطة العلاجية
      activities: this._recommendActivities(assessmentData.sensoryProfile),

      // الحمية الحسية (Sensory Diet)
      sensoryDiet: this._createSensoryDiet(assessmentData.sensoryProfile),

      // تعديلات البيئة
      environmentalModifications: this._recommendEnvironmentalMods(assessmentData.sensoryProfile),

      // المعدات العلاجية
      equipmentNeeded: this._recommendEquipment(assessmentData.sensoryProfile),

      schedule: {
        frequency: assessmentData.frequency || '2-3 مرات أسبوعياً',
        duration: assessmentData.sessionDuration || '45-60 دقيقة',
        totalWeeks: assessmentData.totalWeeks || 16,
        homeProgramFrequency: 'يومياً',
      },

      notes: assessmentData.notes || '',
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  /**
   * تسجيل جلسة علاج حسي تكاملي
   */
  async recordSession(beneficiaryId, sessionData = {}) {
    const session = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      therapistId: sessionData.therapistId,
      duration: sessionData.duration || 50,
      sessionType: sessionData.type || 'clinic',

      // الحالة الحسية قبل الجلسة
      arousalStateBefore: sessionData.arousalBefore || 'moderate',
      arousalStateAfter: sessionData.arousalAfter || 'optimal',

      // الأنشطة المنفذة
      activitiesPerformed: (sessionData.activities || []).map(a => ({
        name: a.name,
        sensorySystem: a.system || 'multi-sensory',
        inputType: a.inputType || 'organizing',
        duration: a.duration || 0,
        childResponse: a.response || 'positive',
        adaptiveResponse: a.adaptiveResponse || false,
      })),

      // تقييم الاستجابة الحسية
      evaluation: {
        tactileProcessing: sessionData.tactileProcessing || 0,
        vestibularProcessing: sessionData.vestibularProcessing || 0,
        proprioceptiveProcessing: sessionData.proprioceptiveProcessing || 0,
        visualProcessing: sessionData.visualProcessing || 0,
        auditoryProcessing: sessionData.auditoryProcessing || 0,
        selfRegulation: sessionData.selfRegulation || 0,
        motorPlanning: sessionData.motorPlanning || 0,
        socialEngagement: sessionData.socialEngagement || 0,
      },

      // ملاحظات السلوك
      behavioralNotes: {
        seekingBehaviors: sessionData.seekingBehaviors || [],
        avoidanceBehaviors: sessionData.avoidanceBehaviors || [],
        meltdowns: sessionData.meltdowns || 0,
        selfRegulationStrategiesUsed: sessionData.strategiesUsed || [],
      },

      therapistNotes: sessionData.therapistNotes || '',
      parentGuidance: sessionData.parentGuidance || '',
      homeActivities: sessionData.homeActivities || [],
      nextSessionPlan: sessionData.nextSessionPlan || '',
    };

    this.sessions.set(session.id, session);
    this._updateProgress(beneficiaryId, session);
    return session;
  }

  /**
   * إنشاء/تحديث الحمية الحسية
   */
  async updateSensoryDiet(beneficiaryId, dietData = {}) {
    const diet = {
      id: Date.now().toString(),
      beneficiaryId,
      updatedAt: new Date(),

      // أنشطة الصباح
      morningActivities: dietData.morning || [
        { activity: 'فرك الجسم بفرشاة ناعمة', duration: '5 دقائق', system: 'tactile' },
        { activity: 'قفز على الترامبولين', duration: '5 دقائق', system: 'vestibular' },
        { activity: 'تمارين ضغط الجدار', duration: '3 دقائق', system: 'proprioceptive' },
      ],

      // أنشطة منتصف النهار
      middayActivities: dietData.midday || [
        { activity: 'المشي بالأثقال', duration: '10 دقائق', system: 'proprioceptive' },
        { activity: 'اللعب بالعجينة', duration: '10 دقائق', system: 'tactile' },
        { activity: 'تمارين التوازن', duration: '5 دقائق', system: 'vestibular' },
      ],

      // أنشطة ما بعد الظهر
      afternoonActivities: dietData.afternoon || [
        { activity: 'السباحة أو اللعب بالماء', duration: '15 دقيقة', system: 'multi-sensory' },
        { activity: 'تمارين الاسترخاء', duration: '10 دقائق', system: 'calming' },
      ],

      // أنشطة المساء
      eveningActivities: dietData.evening || [
        { activity: 'حمام دافئ', duration: '15 دقيقة', system: 'calming' },
        { activity: 'قراءة مع ضغط عميق', duration: '10 دقائق', system: 'proprioceptive' },
      ],

      // استراتيجيات الطوارئ
      emergencyStrategies: dietData.emergency || [
        { trigger: 'إفراط في النشاط', strategy: 'ضغط عميق وأنشطة تهدئة' },
        { trigger: 'انسحاب/خمول', strategy: 'أنشطة حركية تنبيهية' },
        { trigger: 'حدة حسية', strategy: 'إزالة المحفز وتقديم بديل آمن' },
      ],

      notes: dietData.notes || '',
    };

    this.sensoryDiets.set(beneficiaryId, diet);
    return diet;
  }

  /**
   * الحصول على تقرير التقدم
   */
  async getProgressReport(beneficiaryId) {
    const sessions = Array.from(this.sessions.values()).filter(
      s => s.beneficiaryId === beneficiaryId
    );

    const report = {
      beneficiaryId,
      reportDate: new Date(),
      totalSessions: sessions.length,

      systemProgress: {
        tactile: this._calcProgress(sessions, 'tactileProcessing'),
        vestibular: this._calcProgress(sessions, 'vestibularProcessing'),
        proprioceptive: this._calcProgress(sessions, 'proprioceptiveProcessing'),
        visual: this._calcProgress(sessions, 'visualProcessing'),
        auditory: this._calcProgress(sessions, 'auditoryProcessing'),
        selfRegulation: this._calcProgress(sessions, 'selfRegulation'),
        motorPlanning: this._calcProgress(sessions, 'motorPlanning'),
        socialEngagement: this._calcProgress(sessions, 'socialEngagement'),
      },

      arousalRegulation: this._analyzeArousal(sessions),
      behaviorTrends: this._analyzeBehaviors(sessions),
      currentSensoryDiet: this.sensoryDiets.get(beneficiaryId) || null,
      recommendations: this._generateRecommendations(sessions),
      overallProgress: 0,
    };

    const scores = Object.values(report.systemProgress).map(s => s.average || 0);
    report.overallProgress =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return report;
  }

  // ==================== أساليب مساعدة ====================

  _recommendActivities(profile = {}) {
    return {
      tactile: [
        { name: 'اللعب بالرمل والماء', intensity: 'low', benefits: ['تحمل ملمسي', 'استكشاف'] },
        {
          name: 'فرش الجسم (بروتوكول ويلبارجر)',
          intensity: 'medium',
          benefits: ['تنظيم لمسي', 'تهدئة'],
        },
        {
          name: 'اللعب بالعجين والصلصال',
          intensity: 'low',
          benefits: ['تحفيز لمسي', 'حركة دقيقة'],
        },
        { name: 'صناديق الاستكشاف الحسي', intensity: 'low', benefits: ['تمييز ملمسي', 'فضول'] },
      ],
      vestibular: [
        { name: 'الأرجوحة العلاجية', intensity: 'medium', benefits: ['توازن', 'أمان جاذبي'] },
        { name: 'الدوران على كرسي', intensity: 'medium', benefits: ['استجابة دهليزية', 'تنظيم'] },
        { name: 'المشي على عارضة التوازن', intensity: 'low', benefits: ['توازن ثابت', 'ثقة'] },
        { name: 'الزحلقة والانحدار', intensity: 'medium', benefits: ['جاذبية', 'شجاعة'] },
      ],
      proprioceptive: [
        { name: 'تمارين الدفع والسحب', intensity: 'high', benefits: ['وعي جسمي', 'تنظيم'] },
        { name: 'القفز والوثب', intensity: 'high', benefits: ['مدخلات عميقة', 'تفريغ طاقة'] },
        { name: 'حمل الأشياء الثقيلة', intensity: 'medium', benefits: ['قوة', 'تنظيم'] },
        { name: 'لفافة الساندويتش (ضغط عميق)', intensity: 'low', benefits: ['تهدئة', 'أمان'] },
      ],
      multiSensory: [
        { name: 'حلبة العوائق', intensity: 'high', benefits: ['تكامل متعدد', 'تخطيط حركي'] },
        { name: 'اللعب الحسي في الماء', intensity: 'medium', benefits: ['تنظيم شامل'] },
        { name: 'الفن الحسي', intensity: 'low', benefits: ['إبداع', 'تجربة حسية'] },
      ],
    };
  }

  _createSensoryDiet(profile = {}) {
    return {
      alertingActivities: [
        'القفز على الترامبولين',
        'الرقص السريع',
        'التصفيق الإيقاعي',
        'رش الماء البارد على الوجه',
      ],
      calmingActivities: [
        'الضغط العميق (حضن قوي)',
        'الاستماع لموسيقى هادئة',
        'التنفس العميق',
        'اللعب بالعجين',
        'التأرجح البطيء',
      ],
      organizingActivities: [
        'مضغ علكة أو أطعمة مقرمشة',
        'الشرب من قشة',
        'تمارين الضغط على الجدار',
        'المشي بإيقاع منتظم',
      ],
    };
  }

  _recommendEnvironmentalMods(profile = {}) {
    return [
      'توفير ركن هادئ للتهدئة',
      'استخدام إضاءة طبيعية أو خافتة',
      'تقليل الضوضاء الخلفية',
      'توفير مقاعد حسية (كرة يوغا، وسادة تذبذب)',
      'استخدام جداول مرئية للروتين',
      'توفير سماعات عازلة للضوضاء عند الحاجة',
      'ترتيب منظم وألوان هادئة',
    ];
  }

  _recommendEquipment(profile = {}) {
    return [
      'أرجوحة علاجية (بتوجيه معالج)',
      'ترامبولين صغير',
      'كرات علاجية بأحجام مختلفة',
      'سترة ثقيلة',
      'أدوات حسية للأيدي (fidgets)',
      'فرشاة ويلبارجر',
      'حبال تسلق',
      'أسطوانات توازن',
      'صناديق حسية',
      'مواد متنوعة الملمس',
    ];
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

  _analyzeArousal(sessions) {
    const states = { low: 1, moderate: 2, optimal: 3, high: 4, overloaded: 5 };
    const before = sessions.map(s => states[s.arousalStateBefore] || 2);
    const after = sessions.map(s => states[s.arousalStateAfter] || 3);
    return {
      averageBefore:
        before.length > 0 ? +(before.reduce((a, b) => a + b, 0) / before.length).toFixed(1) : 0,
      averageAfter:
        after.length > 0 ? +(after.reduce((a, b) => a + b, 0) / after.length).toFixed(1) : 0,
      regulationImprovement:
        before.length > 0 && after.length > 0 ? 'positive' : 'insufficient_data',
    };
  }

  _analyzeBehaviors(sessions) {
    const totalMeltdowns = sessions.reduce((sum, s) => sum + (s.behavioralNotes.meltdowns || 0), 0);
    const seekingBehaviors = {};
    const avoidanceBehaviors = {};

    sessions.forEach(s => {
      (s.behavioralNotes.seekingBehaviors || []).forEach(b => {
        seekingBehaviors[b] = (seekingBehaviors[b] || 0) + 1;
      });
      (s.behavioralNotes.avoidanceBehaviors || []).forEach(b => {
        avoidanceBehaviors[b] = (avoidanceBehaviors[b] || 0) + 1;
      });
    });

    return {
      totalMeltdowns,
      averageMeltdownsPerSession:
        sessions.length > 0 ? +(totalMeltdowns / sessions.length).toFixed(1) : 0,
      commonSeekingBehaviors: Object.entries(seekingBehaviors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      commonAvoidanceBehaviors: Object.entries(avoidanceBehaviors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };
  }

  _generateRecommendations(sessions) {
    if (sessions.length === 0) return ['إجراء تقييم حسي شامل وإنشاء ملف حسي'];
    const recommendations = [];
    const avgRegulation = this._calcProgress(sessions, 'selfRegulation').average;
    if (avgRegulation < 50) recommendations.push('تكثيف أنشطة الحمية الحسية الهيكلية');
    const avgMotor = this._calcProgress(sessions, 'motorPlanning').average;
    if (avgMotor < 50) recommendations.push('إضافة أنشطة حلبة العوائق لتحسين التخطيط الحركي');
    const avgSocial = this._calcProgress(sessions, 'socialEngagement').average;
    if (avgSocial < 50) recommendations.push('دمج أنشطة حسية اجتماعية مع أقران');
    const behaviors = this._analyzeBehaviors(sessions);
    if (behaviors.averageMeltdownsPerSession > 1)
      recommendations.push('مراجعة الحمية الحسية وإضافة استراتيجيات وقائية');
    return recommendations.length > 0
      ? recommendations
      : ['الاستمرار في البرنامج مع تحديث الحمية الحسية شهرياً'];
  }

  _updateProgress(beneficiaryId, session) {
    const current = this.progressReports.get(beneficiaryId) || { sessions: [], lastUpdated: null };
    current.sessions.push(session.id);
    current.lastUpdated = new Date();
    this.progressReports.set(beneficiaryId, current);
  }
}

module.exports = { SensoryIntegrationService };
