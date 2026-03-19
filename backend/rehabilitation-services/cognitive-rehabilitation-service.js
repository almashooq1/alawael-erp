/* eslint-disable no-unused-vars */
/**
 * Cognitive Rehabilitation Service for Disability Rehabilitation
 * خدمة إعادة التأهيل المعرفي لذوي الإعاقة
 *
 * يشمل تدريبات الذاكرة، الانتباه، التخطيط، حل المشكلات،
 * والوظائف التنفيذية لتحسين القدرات المعرفية
 */

class CognitiveRehabilitationService {
  constructor() {
    this.sessions = new Map();
    this.plans = new Map();
    this.assessments = new Map();
    this.exerciseResults = new Map();
    this.progressReports = new Map();
  }

  /**
   * تقييم معرفي شامل
   */
  async assessCognitiveFunction(beneficiaryId, assessmentData = {}) {
    const assessment = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      assessorId: assessmentData.assessorId || 'system',

      // الانتباه والتركيز
      attention: {
        sustainedAttention: assessmentData.sustainedAttention || 0,
        selectiveAttention: assessmentData.selectiveAttention || 0,
        dividedAttention: assessmentData.dividedAttention || 0,
        attentionSpan: assessmentData.attentionSpan || 0,
        overallScore: 0,
      },

      // الذاكرة
      memory: {
        shortTermMemory: assessmentData.shortTermMemory || 0,
        longTermMemory: assessmentData.longTermMemory || 0,
        workingMemory: assessmentData.workingMemory || 0,
        visualMemory: assessmentData.visualMemory || 0,
        auditoryMemory: assessmentData.auditoryMemory || 0,
        proceduralMemory: assessmentData.proceduralMemory || 0,
        overallScore: 0,
      },

      // الوظائف التنفيذية
      executiveFunction: {
        planning: assessmentData.planning || 0,
        organization: assessmentData.organization || 0,
        problemSolving: assessmentData.problemSolving || 0,
        decisionMaking: assessmentData.decisionMaking || 0,
        cognitiveFlexibility: assessmentData.cognitiveFlexibility || 0,
        inhibition: assessmentData.inhibition || 0,
        overallScore: 0,
      },

      // سرعة المعالجة
      processingSpeed: {
        reactionTime: assessmentData.reactionTime || 0,
        informationProcessing: assessmentData.informationProcessing || 0,
        taskCompletion: assessmentData.taskCompletion || 0,
        overallScore: 0,
      },

      // الإدراك البصري-المكاني
      visuospatial: {
        spatialOrientation: assessmentData.spatialOrientation || 0,
        visualConstruction: assessmentData.visualConstruction || 0,
        spatialRelations: assessmentData.spatialRelations || 0,
        figureGroundDiscrimination: assessmentData.figureGround || 0,
        overallScore: 0,
      },

      // اللغة والتواصل
      languageCognition: {
        verbalFluency: assessmentData.verbalFluency || 0,
        comprehension: assessmentData.comprehension || 0,
        naming: assessmentData.naming || 0,
        reading: assessmentData.reading || 0,
        writing: assessmentData.writing || 0,
        overallScore: 0,
      },

      status: 'completed',
    };

    // حساب الدرجات
    const domains = [
      'attention',
      'memory',
      'executiveFunction',
      'processingSpeed',
      'visuospatial',
      'languageCognition',
    ];
    domains.forEach(domain => {
      const scores = Object.values(assessment[domain]).filter(v => typeof v === 'number' && v > 0);
      assessment[domain].overallScore =
        scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    });

    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  /**
   * إنشاء خطة إعادة تأهيل معرفي
   */
  async createCognitiveRehabPlan(beneficiaryId, assessmentData = {}) {
    const plan = {
      id: Date.now().toString(),
      beneficiaryId,
      createdAt: new Date(),
      status: 'active',

      goals: assessmentData.goals || [
        { domain: 'attention', description: 'تحسين مدة الانتباه المستمر', target: 80, current: 0 },
        { domain: 'memory', description: 'تقوية الذاكرة العاملة', target: 75, current: 0 },
        {
          domain: 'executive',
          description: 'تحسين مهارات التخطيط وحل المشكلات',
          target: 70,
          current: 0,
        },
        {
          domain: 'processing',
          description: 'زيادة سرعة المعالجة المعرفية',
          target: 75,
          current: 0,
        },
        {
          domain: 'visuospatial',
          description: 'تحسين الإدراك البصري-المكاني',
          target: 70,
          current: 0,
        },
      ],

      // التمارين المعرفية المقترحة
      exercises: this._recommendExercises(assessmentData.weakAreas),

      // الاستراتيجيات التعويضية
      compensatoryStrategies: this._recommendStrategies(assessmentData.weakAreas),

      // التكنولوجيا المساعدة
      assistiveTechnology: [
        'تطبيقات تدريب الذاكرة',
        'منبهات وتذكيرات إلكترونية',
        'مخططات يومية رقمية',
        'برامج تدريب الانتباه المحوسبة',
      ],

      schedule: {
        frequency: assessmentData.frequency || '3-4 مرات أسبوعياً',
        duration: assessmentData.sessionDuration || '45 دقيقة',
        totalWeeks: assessmentData.totalWeeks || 16,
        homeExercises: assessmentData.homeExercises !== false,
      },

      notes: assessmentData.notes || '',
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  /**
   * تسجيل جلسة تأهيل معرفي
   */
  async recordSession(beneficiaryId, sessionData = {}) {
    const session = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      therapistId: sessionData.therapistId,
      duration: sessionData.duration || 45,
      sessionType: sessionData.type || 'individual',

      // التمارين المنفذة
      exercisesCompleted: (sessionData.exercises || []).map(e => ({
        name: e.name,
        domain: e.domain || 'general',
        difficulty: e.difficulty || 'medium',
        accuracy: e.accuracy || 0,
        completionTime: e.completionTime || 0,
        attemptsNeeded: e.attempts || 1,
        assistanceLevel: e.assistance || 'independent',
      })),

      // تقييم الأداء المعرفي
      evaluation: {
        attention: sessionData.attention || 0,
        memory: sessionData.memory || 0,
        executiveFunction: sessionData.executiveFunction || 0,
        processingSpeed: sessionData.processingSpeed || 0,
        visuospatial: sessionData.visuospatial || 0,
        languageCognition: sessionData.languageCognition || 0,
      },

      // مستوى التعب المعرفي
      cognitiveFatigue: {
        startLevel: sessionData.fatigueStart || 0,
        endLevel: sessionData.fatigueEnd || 0,
        breaksTaken: sessionData.breaks || 0,
      },

      // الدافعية والمشاركة
      motivation: sessionData.motivation || 0,
      frustrationLevel: sessionData.frustration || 0,

      therapistNotes: sessionData.therapistNotes || '',
      homeExercisesAssigned: sessionData.homeExercises || [],
      nextSessionPlan: sessionData.nextSessionPlan || '',
    };

    this.sessions.set(session.id, session);
    this._updateProgress(beneficiaryId, session);
    return session;
  }

  /**
   * تسجيل نتائج تمارين منزلية
   */
  async recordHomeExercise(beneficiaryId, exerciseData = {}) {
    const result = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      recordedBy: exerciseData.recordedBy || 'beneficiary',

      exerciseName: exerciseData.name || '',
      domain: exerciseData.domain || 'general',
      duration: exerciseData.duration || 0,
      accuracy: exerciseData.accuracy || 0,
      difficulty: exerciseData.difficulty || 'medium',
      completedFully: exerciseData.completed || false,
      assistanceNeeded: exerciseData.assistance || 'none',
      notes: exerciseData.notes || '',
    };

    this.exerciseResults.set(result.id, result);
    return result;
  }

  /**
   * الحصول على تقرير التقدم
   */
  async getProgressReport(beneficiaryId) {
    const sessions = Array.from(this.sessions.values()).filter(
      s => s.beneficiaryId === beneficiaryId
    );
    const homeResults = Array.from(this.exerciseResults.values()).filter(
      r => r.beneficiaryId === beneficiaryId
    );

    const report = {
      beneficiaryId,
      reportDate: new Date(),
      totalSessions: sessions.length,
      totalHomeExercises: homeResults.length,

      // تقدم المجالات المعرفية
      domainProgress: {
        attention: this._calcProgress(sessions, 'attention'),
        memory: this._calcProgress(sessions, 'memory'),
        executiveFunction: this._calcProgress(sessions, 'executiveFunction'),
        processingSpeed: this._calcProgress(sessions, 'processingSpeed'),
        visuospatial: this._calcProgress(sessions, 'visuospatial'),
        languageCognition: this._calcProgress(sessions, 'languageCognition'),
      },

      // تحليل التعب المعرفي
      fatigueAnalysis: this._analyzeFatigue(sessions),

      // دقة التمارين
      exerciseAccuracy: this._analyzeExerciseAccuracy(sessions),

      // الالتزام بالتمارين المنزلية
      homeExerciseCompliance: this._analyzeHomeCompliance(homeResults),

      recommendations: this._generateRecommendations(sessions, homeResults),
      overallProgress: 0,
    };

    const scores = Object.values(report.domainProgress).map(d => d.average || 0);
    report.overallProgress =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return report;
  }

  // ==================== أساليب مساعدة ====================

  _recommendExercises(weakAreas = []) {
    const allExercises = {
      attention: [
        {
          name: 'تتبع الأهداف المتحركة',
          difficulty: 'easy',
          description: 'تتبع أهداف متحركة على الشاشة',
        },
        {
          name: 'مطابقة الأنماط',
          difficulty: 'medium',
          description: 'إيجاد الأنماط المتطابقة في مجموعات',
        },
        {
          name: 'تمييز الأصوات',
          difficulty: 'medium',
          description: 'التعرف على أصوات محددة ضمن خلفية صوتية',
        },
        {
          name: 'الاستجابة السريعة',
          difficulty: 'hard',
          description: 'الضغط عند ظهور محفز محدد فقط',
        },
      ],
      memory: [
        {
          name: 'سلسلة الأرقام',
          difficulty: 'easy',
          description: 'تذكر وتكرار سلاسل أرقام متزايدة',
        },
        {
          name: 'مطابقة البطاقات',
          difficulty: 'easy',
          description: 'إيجاد أزواج متطابقة من البطاقات المقلوبة',
        },
        { name: 'تذكر القصة', difficulty: 'medium', description: 'استرجاع تفاصيل من قصة قصيرة' },
        { name: 'قائمة التسوق', difficulty: 'medium', description: 'حفظ وتذكر قائمة من العناصر' },
      ],
      executive: [
        {
          name: 'تخطيط المهام',
          difficulty: 'medium',
          description: 'ترتيب خطوات لإكمال مهمة معقدة',
        },
        {
          name: 'لعبة الأبراج',
          difficulty: 'hard',
          description: 'حل لغز الأبراج بأقل عدد من الحركات',
        },
        { name: 'تصنيف متعدد', difficulty: 'medium', description: 'تصنيف عناصر وفق معايير متغيرة' },
        { name: 'حل المتاهات', difficulty: 'easy', description: 'إيجاد المسار الصحيح في متاهات' },
      ],
      processing: [
        {
          name: 'ربط الرموز بالأرقام',
          difficulty: 'medium',
          description: 'ربط رموز بأرقام بأسرع وقت',
        },
        { name: 'شطب الأهداف', difficulty: 'easy', description: 'شطب رمز محدد بسرعة من مصفوفة' },
        { name: 'العد السريع', difficulty: 'medium', description: 'عد عناصر متحركة بسرعة' },
      ],
      visuospatial: [
        { name: 'تدوير الأشكال', difficulty: 'hard', description: 'تخيل شكل بعد تدويره' },
        {
          name: 'إعادة بناء الأنماط',
          difficulty: 'medium',
          description: 'إعادة بناء نمط من الذاكرة',
        },
        { name: 'رسم المرآة', difficulty: 'medium', description: 'رسم صورة معكوسة لشكل' },
        { name: 'خرائط المسار', difficulty: 'easy', description: 'اتباع وتذكر مسارات على خريطة' },
      ],
    };

    if (weakAreas.length === 0) {
      return Object.values(allExercises).flat();
    }

    return weakAreas.flatMap(area => allExercises[area] || []);
  }

  _recommendStrategies(weakAreas = []) {
    const strategies = {
      attention: [
        'تقسيم المهام إلى أجزاء صغيرة',
        'استخدام مؤقتات لفترات العمل والراحة',
        'تقليل المشتتات البيئية',
        'استخدام قوائم المهام',
      ],
      memory: [
        'استخدام التكرار المتباعد',
        'ربط المعلومات الجديدة بالمعرفة السابقة',
        'استخدام المفكرات والملاحظات المكتوبة',
        'تطوير روتين يومي ثابت',
      ],
      executive: [
        'استخدام الجداول والمخططات',
        'تقسيم المشكلات إلى خطوات',
        'تطوير قوالب لاتخاذ القرارات',
        'ممارسة التفكير قبل التصرف',
      ],
      processing: [
        'إعطاء وقت إضافي للمهام',
        'تبسيط التعليمات',
        'استخدام المساعدات البصرية',
        'تقليل الضغط الزمني',
      ],
    };

    if (weakAreas.length === 0) return Object.values(strategies).flat();
    return weakAreas.flatMap(area => strategies[area] || []);
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

  _analyzeFatigue(sessions) {
    const starts = sessions.map(s => s.cognitiveFatigue.startLevel).filter(v => v > 0);
    const ends = sessions.map(s => s.cognitiveFatigue.endLevel).filter(v => v > 0);
    return {
      averageFatigueStart:
        starts.length > 0 ? +(starts.reduce((a, b) => a + b, 0) / starts.length).toFixed(1) : 0,
      averageFatigueEnd:
        ends.length > 0 ? +(ends.reduce((a, b) => a + b, 0) / ends.length).toFixed(1) : 0,
      averageFatigueIncrease:
        starts.length > 0 && ends.length > 0
          ? +(
              ends.reduce((a, b) => a + b, 0) / ends.length -
              starts.reduce((a, b) => a + b, 0) / starts.length
            ).toFixed(1)
          : 0,
    };
  }

  _analyzeExerciseAccuracy(sessions) {
    const accuracies = sessions
      .flatMap(s => s.exercisesCompleted.map(e => e.accuracy))
      .filter(v => v > 0);
    return {
      averageAccuracy:
        accuracies.length > 0
          ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
          : 0,
      totalExercises: accuracies.length,
    };
  }

  _analyzeHomeCompliance(homeResults) {
    const completed = homeResults.filter(r => r.completedFully);
    return {
      totalAssigned: homeResults.length,
      totalCompleted: completed.length,
      complianceRate:
        homeResults.length > 0 ? Math.round((completed.length / homeResults.length) * 100) : 0,
    };
  }

  _generateRecommendations(sessions, homeResults) {
    if (sessions.length === 0) return ['إجراء تقييم معرفي شامل لتحديد نقاط القوة والضعف'];
    const recommendations = [];
    const avgAttention = this._calcProgress(sessions, 'attention').average;
    if (avgAttention < 50)
      recommendations.push('التركيز على تمارين الانتباه المستمر مع فترات راحة منتظمة');
    const avgMemory = this._calcProgress(sessions, 'memory').average;
    if (avgMemory < 50) recommendations.push('استخدام استراتيجيات تعويضية للذاكرة مع تدريب مكثف');
    if (homeResults.length > 0) {
      const compliance = this._analyzeHomeCompliance(homeResults);
      if (compliance.complianceRate < 50)
        recommendations.push('تبسيط التمارين المنزلية وإشراك الأسرة في المتابعة');
    }
    const avgFatigue = this._analyzeFatigue(sessions);
    if (avgFatigue.averageFatigueIncrease > 3)
      recommendations.push('تقصير مدة الجلسات أو إضافة فترات راحة إضافية');
    return recommendations.length > 0
      ? recommendations
      : ['الاستمرار في البرنامج الحالي مع زيادة تدريجية في الصعوبة'];
  }

  _updateProgress(beneficiaryId, session) {
    const current = this.progressReports.get(beneficiaryId) || { sessions: [], lastUpdated: null };
    current.sessions.push(session.id);
    current.lastUpdated = new Date();
    this.progressReports.set(beneficiaryId, current);
  }
}

module.exports = { CognitiveRehabilitationService };
