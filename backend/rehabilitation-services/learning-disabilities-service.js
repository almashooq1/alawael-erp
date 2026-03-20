/**
 * 📚 خدمة علاج صعوبات التعلم — Learning Disabilities Therapy Service
 * الإصدار 6.0.0
 * يشمل: عسر القراءة، عسر الكتابة، عسر الحساب، اضطراب المعالجة السمعية/البصرية
 */

class LearningDisabilitiesService {
  constructor() {
    this.assessments = new Map();
    this.plans = new Map();
    this.sessions = new Map();
    this.ieps = new Map(); // خطط تعليمية فردية
  }

  /* ─── التقييم الشامل ─── */
  async assessLearningAbilities(beneficiaryId, assessmentData) {
    const assessment = {
      id: `lda-${Date.now()}`,
      beneficiaryId,
      date: new Date(),
      age: assessmentData.age,
      grade: assessmentData.grade,
      // القراءة
      reading: {
        phonologicalAwareness: assessmentData.phonologicalAwareness ?? 0,
        decoding: assessmentData.decoding ?? 0,
        fluency: assessmentData.readingFluency ?? 0,
        comprehension: assessmentData.readingComprehension ?? 0,
        vocabulary: assessmentData.vocabulary ?? 0,
        wordsPerMinute: assessmentData.wordsPerMinute ?? 0,
      },
      // الكتابة
      writing: {
        handwriting: assessmentData.handwriting ?? 0,
        spelling: assessmentData.spelling ?? 0,
        grammar: assessmentData.grammar ?? 0,
        composition: assessmentData.composition ?? 0,
        writingSpeed: assessmentData.writingSpeed ?? 0,
        organization: assessmentData.writingOrganization ?? 0,
      },
      // الحساب
      math: {
        numberSense: assessmentData.numberSense ?? 0,
        basicOperations: assessmentData.basicOperations ?? 0,
        problemSolving: assessmentData.mathProblemSolving ?? 0,
        mathFacts: assessmentData.mathFacts ?? 0,
        spatialReasoning: assessmentData.spatialReasoning ?? 0,
        mathLanguage: assessmentData.mathLanguage ?? 0,
      },
      // المعالجة
      processing: {
        auditoryProcessing: assessmentData.auditoryProcessing ?? 0,
        visualProcessing: assessmentData.visualProcessing ?? 0,
        processingSpeed: assessmentData.processingSpeed ?? 0,
        workingMemory: assessmentData.workingMemory ?? 0,
        attention: assessmentData.attention ?? 0,
        executiveFunction: assessmentData.executiveFunction ?? 0,
      },
      // التشخيص
      diagnosis: this._determineDiagnosis(assessmentData),
      severityLevel: this._calcSeverity(assessmentData),
      strengths: this._findStrengths(assessmentData),
      weaknesses: this._findWeaknesses(assessmentData),
      learningStyle: assessmentData.learningStyle || this._assessLearningStyle(assessmentData),
      accommodationsNeeded: this._recommendAccommodations(assessmentData),
      status: 'completed',
    };
    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  /* ─── الخطة التعليمية الفردية (IEP) ─── */
  async createLearningPlan(beneficiaryId, assessmentData) {
    const plan = {
      id: `ldp-${Date.now()}`,
      beneficiaryId,
      createdAt: new Date(),
      status: 'active',
      diagnosis: assessmentData.diagnosis || this._determineDiagnosis(assessmentData),
      goals: this._generateLearningGoals(assessmentData),
      // استراتيجيات التدريس
      strategies: this._selectStrategies(assessmentData),
      // تسهيلات
      accommodations: this._recommendAccommodations(assessmentData),
      // تعديلات
      modifications: this._suggestModifications(assessmentData),
      // التكنولوجيا المساعدة
      assistiveTechnology: this._recommendTech(assessmentData),
      schedule: {
        sessionsPerWeek: assessmentData.sessionsPerWeek || 3,
        sessionDuration: assessmentData.sessionDuration || 45,
        totalWeeks: assessmentData.totalWeeks || 24,
      },
      phases: [
        {
          phase: 1,
          name: 'تشخيص وتهيئة',
          weeks: '1-4',
          focus: 'تقييم تفصيلي وبناء علاقة وبدء التدخل',
        },
        {
          phase: 2,
          name: 'تدخل مكثف',
          weeks: '5-12',
          focus: 'برامج علاجية مكثفة للمهارات الأساسية',
        },
        {
          phase: 3,
          name: 'تعزيز وتعميم',
          weeks: '13-20',
          focus: 'تعميم المهارات في البيئة الصفية',
        },
        {
          phase: 4,
          name: 'متابعة واستقلالية',
          weeks: '21-24',
          focus: 'تطوير استراتيجيات ذاتية والتقييم النهائي',
        },
      ],
      homeActivities: this._suggestHomeActivities(assessmentData),
      sessionsCompleted: 0,
    };
    this.plans.set(plan.id, plan);
    return plan;
  }

  /* ─── تسجيل جلسة ─── */
  async recordSession(beneficiaryId, sessionData) {
    const session = {
      id: `lds-${Date.now()}`,
      beneficiaryId,
      date: new Date(),
      duration: sessionData.duration || 45,
      focusArea: sessionData.focusArea || 'reading', // reading / writing / math / processing
      // تفاصيل النشاط
      activities: (sessionData.activities || []).map(a => ({
        name: a.name,
        type: a.type,
        duration: a.duration || 10,
        difficulty: a.difficulty || 'medium',
        accuracy: a.accuracy || 0,
        fluency: a.fluency || 0,
        independence: a.independence || 0,
      })),
      // أداء الجلسة
      performance: {
        taskAccuracy: sessionData.taskAccuracy || 0,
        taskFluency: sessionData.taskFluency || 0,
        attentionLevel: sessionData.attentionLevel || 5,
        effortLevel: sessionData.effortLevel || 5,
        frustrationLevel: sessionData.frustrationLevel || 3,
        independenceLevel: sessionData.independenceLevel || 5,
        promptsNeeded: sessionData.promptsNeeded || 'moderate',
      },
      // تقييمات فورية
      quickAssessments: {
        wordsReadCorrectly: sessionData.wordsReadCorrectly ?? null,
        spellingAccuracy: sessionData.spellingAccuracy ?? null,
        mathFactsCorrect: sessionData.mathFactsCorrect ?? null,
        writingSample: sessionData.writingSample ?? null,
      },
      strategiesUsed: sessionData.strategiesUsed || [],
      behaviorNotes: sessionData.behaviorNotes || '',
      goalsAddressed: sessionData.goalsAddressed || [],
      homeAssignment: sessionData.homeAssignment || '',
      therapistNotes: sessionData.notes || '',
    };

    const key = `${beneficiaryId}_sessions`;
    const sessions = this.sessions.get(key) || [];
    sessions.push(session);
    this.sessions.set(key, sessions);
    return session;
  }

  /* ─── تسجيل تقييم سريع ─── */
  async recordQuickAssessment(beneficiaryId, assessmentData) {
    const qa = {
      id: `ldq-${Date.now()}`,
      beneficiaryId,
      date: new Date(),
      type: assessmentData.type, // reading_probe / math_probe / writing_sample / spelling_test
      score: assessmentData.score,
      maxScore: assessmentData.maxScore,
      percentCorrect: Math.round((assessmentData.score / (assessmentData.maxScore || 1)) * 100),
      grade: assessmentData.grade,
      notes: assessmentData.notes || '',
    };

    const key = `${beneficiaryId}_quickAssessments`;
    const qas = this.sessions.get(key) || [];
    qas.push(qa);
    this.sessions.set(key, qas);
    return qa;
  }

  /* ─── تقرير التقدم ─── */
  async getProgressReport(beneficiaryId) {
    const sessions = this.sessions.get(`${beneficiaryId}_sessions`) || [];
    const quickAssessments = this.sessions.get(`${beneficiaryId}_quickAssessments`) || [];
    if (sessions.length === 0)
      return { beneficiaryId, totalSessions: 0, message: 'لا توجد جلسات مسجلة' };

    const perf = sessions.map(s => s.performance);
    const byArea = {};
    sessions.forEach(s => {
      if (!byArea[s.focusArea]) byArea[s.focusArea] = [];
      byArea[s.focusArea].push(s);
    });

    return {
      beneficiaryId,
      totalSessions: sessions.length,
      totalDuration: sessions.reduce((s, x) => s + x.duration, 0),
      overallPerformance: {
        avgAccuracy: this._avg(perf.map(p => p.taskAccuracy)),
        accuracyTrend: this._calcTrend(perf.map(p => p.taskAccuracy)),
        avgFluency: this._avg(perf.map(p => p.taskFluency)),
        fluencyTrend: this._calcTrend(perf.map(p => p.taskFluency)),
        avgIndependence: this._avg(perf.map(p => p.independenceLevel)),
        independenceTrend: this._calcTrend(perf.map(p => p.independenceLevel)),
      },
      byFocusArea: Object.entries(byArea).reduce((acc, [area, areaSessions]) => {
        acc[area] = {
          sessions: areaSessions.length,
          avgAccuracy: this._avg(areaSessions.map(s => s.performance.taskAccuracy)),
          trend: this._calcTrend(areaSessions.map(s => s.performance.taskAccuracy)),
        };
        return acc;
      }, {}),
      quickAssessmentTrends: this._analyzeQuickAssessments(quickAssessments),
      engagement: {
        avgAttention: this._avg(perf.map(p => p.attentionLevel)),
        avgEffort: this._avg(perf.map(p => p.effortLevel)),
        avgFrustration: this._avg(perf.map(p => p.frustrationLevel)),
      },
      recentSessions: sessions.slice(-5).map(s => ({
        date: s.date,
        focusArea: s.focusArea,
        accuracy: s.performance.taskAccuracy,
        independence: s.performance.independenceLevel,
      })),
      overallProgress: this._calcProgress(perf.map(p => p.taskAccuracy)),
      recommendations: this._generateRecommendations(sessions),
    };
  }

  /* ─── مساعدات ─── */
  _determineDiagnosis(data) {
    const diagnoses = [];
    const readingAvg = this._avg(
      [
        data.phonologicalAwareness,
        data.decoding,
        data.readingFluency,
        data.readingComprehension,
      ].filter(Boolean)
    );
    const writingAvg = this._avg(
      [data.handwriting, data.spelling, data.grammar, data.composition].filter(Boolean)
    );
    const mathAvg = this._avg(
      [data.numberSense, data.basicOperations, data.mathProblemSolving, data.mathFacts].filter(
        Boolean
      )
    );

    if (readingAvg > 0 && readingAvg < 4) diagnoses.push('عسر القراءة (Dyslexia)');
    if (writingAvg > 0 && writingAvg < 4) diagnoses.push('عسر الكتابة (Dysgraphia)');
    if (mathAvg > 0 && mathAvg < 4) diagnoses.push('عسر الحساب (Dyscalculia)');
    if ((data.auditoryProcessing || 0) < 4) diagnoses.push('اضطراب المعالجة السمعية (APD)');
    if ((data.visualProcessing || 0) < 4) diagnoses.push('اضطراب المعالجة البصرية');
    if (diagnoses.length === 0) diagnoses.push('صعوبات تعلم غير محددة');
    return diagnoses;
  }

  _calcSeverity(data) {
    const all = [
      data.phonologicalAwareness,
      data.decoding,
      data.readingFluency,
      data.handwriting,
      data.spelling,
      data.numberSense,
      data.basicOperations,
    ].filter(v => v != null);
    const avg = all.length ? all.reduce((a, b) => a + b, 0) / all.length : 5;
    if (avg <= 2) return 'شديد';
    if (avg <= 4) return 'متوسط';
    if (avg <= 6) return 'خفيف';
    return 'حدّي';
  }

  _findStrengths(data) {
    const fields = {
      vocabulary: 'المفردات',
      readingComprehension: 'الفهم القرائي',
      composition: 'التعبير الكتابي',
      mathProblemSolving: 'حل المسائل',
      spatialReasoning: 'التفكير المكاني',
      auditoryProcessing: 'المعالجة السمعية',
      executiveFunction: 'الوظائف التنفيذية',
    };
    return Object.entries(fields)
      .filter(([k]) => (data[k] || 0) >= 7)
      .map(([, v]) => v);
  }

  _findWeaknesses(data) {
    const fields = {
      phonologicalAwareness: 'الوعي الصوتي',
      decoding: 'فك الترميز',
      handwriting: 'الخط',
      spelling: 'الإملاء',
      numberSense: 'الحس العددي',
      processingSpeed: 'سرعة المعالجة',
      workingMemory: 'الذاكرة العاملة',
    };
    return Object.entries(fields)
      .filter(([k]) => (data[k] || 0) <= 3)
      .map(([, v]) => v);
  }

  _assessLearningStyle(data) {
    if ((data.visualProcessing || 5) > (data.auditoryProcessing || 5)) return 'بصري';
    if ((data.auditoryProcessing || 5) > (data.visualProcessing || 5)) return 'سمعي';
    return 'حركي/متعدد';
  }

  _selectStrategies(data) {
    const strategies = [];
    const diag = this._determineDiagnosis(data);
    if (diag.some(d => d.includes('القراءة'))) {
      strategies.push({
        name: 'أورتون-جيلنجهام',
        type: 'reading',
        description: 'نهج متعدد الحواس لتعليم القراءة',
      });
      strategies.push({
        name: 'ويلسون للقراءة',
        type: 'reading',
        description: 'برنامج منظم لفك الترميز والتهجئة',
      });
    }
    if (diag.some(d => d.includes('الكتابة'))) {
      strategies.push({
        name: 'SRSD للكتابة',
        type: 'writing',
        description: 'التطوير الذاتي للاستراتيجيات الكتابية',
      });
    }
    if (diag.some(d => d.includes('الحساب'))) {
      strategies.push({
        name: 'CRA للرياضيات',
        type: 'math',
        description: 'تدرج من الملموس إلى التمثيلي إلى المجرد',
      });
    }
    strategies.push({
      name: 'التعليم متعدد الحواس',
      type: 'general',
      description: 'استخدام البصر والسمع واللمس والحركة',
    });
    return strategies;
  }

  _recommendAccommodations(data) {
    const acc = [];
    acc.push('وقت إضافي في الاختبارات');
    acc.push('مكان هادئ للامتحانات');
    if ((data.readingFluency || 5) < 4) acc.push('قراءة الأسئلة بصوت عالٍ');
    if ((data.handwriting || 5) < 4) acc.push('استخدام الحاسوب للكتابة');
    if ((data.processingSpeed || 5) < 4) acc.push('تقليل كمية الواجبات');
    if ((data.attention || 5) < 4) acc.push('الجلوس في الصفوف الأمامية');
    return acc;
  }

  _suggestModifications(data) {
    const mods = [];
    const severity = this._calcSeverity(data);
    if (severity === 'شديد') mods.push('تقليل مستوى المحتوى الدراسي', 'معايير تقييم مختلفة');
    mods.push('تجزئة المهام الكبيرة إلى خطوات صغيرة');
    mods.push('استخدام منظمات بصرية');
    return mods;
  }

  _recommendTech(data) {
    const tech = [];
    if ((data.readingFluency || 5) < 4)
      tech.push({ name: 'برنامج تحويل النص لكلام (TTS)', purpose: 'مساعدة في القراءة' });
    if ((data.handwriting || 5) < 4)
      tech.push({ name: 'برنامج تحويل الكلام لنص (STT)', purpose: 'مساعدة في الكتابة' });
    if ((data.spelling || 5) < 4)
      tech.push({ name: 'مدقق إملائي تنبؤي', purpose: 'تصحيح الإملاء' });
    tech.push({ name: 'تطبيقات تعليمية تفاعلية', purpose: 'تعزيز التعلم المستقل' });
    return tech;
  }

  _suggestHomeActivities(_data) {
    return [
      { activity: 'قراءة يومية لمدة 15 دقيقة مع أحد الوالدين', frequency: 'يومياً' },
      { activity: 'ألعاب كلمات وألغاز', frequency: '3 مرات أسبوعياً' },
      { activity: 'تمارين رياضيات تفاعلية على التطبيقات', frequency: 'يومياً' },
      { activity: 'كتابة يوميات قصيرة', frequency: 'يومياً' },
    ];
  }

  _generateLearningGoals(data) {
    const goals = [];
    if ((data.readingFluency || 5) < 5)
      goals.push({ domain: 'reading', goal: 'رفع طلاقة القراءة بمقدار 20 كلمة/دقيقة', target: 20 });
    if ((data.spelling || 5) < 5)
      goals.push({ domain: 'writing', goal: 'تحسين دقة الإملاء لتصل 80%', target: 80 });
    if ((data.basicOperations || 5) < 5)
      goals.push({ domain: 'math', goal: 'إتقان العمليات الحسابية الأساسية بدقة 90%', target: 90 });
    if ((data.workingMemory || 5) < 5)
      goals.push({
        domain: 'processing',
        goal: 'تحسين الذاكرة العاملة لاستيعاب 5 عناصر',
        target: 5,
      });
    goals.push({ domain: 'independence', goal: 'استخدام 3 استراتيجيات تعلم ذاتية', target: 3 });
    return goals;
  }

  _generateRecommendations(sessions) {
    const recs = [];
    const avgAcc = this._avg(sessions.map(s => s.performance.taskAccuracy));
    const avgFrust = this._avg(sessions.map(s => s.performance.frustrationLevel));
    if (avgAcc < 50) recs.push('تقليل مستوى الصعوبة والتركيز على بناء الأساسيات');
    if (avgAcc > 80) recs.push('الانتقال إلى مهارات أكثر تعقيداً');
    if (avgFrust > 6) recs.push('إدراج أنشطة ترفيهية وتعزيز إيجابي أكثر');
    recs.push('التنسيق مع المعلم لتطبيق الاستراتيجيات في الصف');
    return recs;
  }

  _analyzeQuickAssessments(qas) {
    const byType = {};
    qas.forEach(qa => {
      if (!byType[qa.type]) byType[qa.type] = [];
      byType[qa.type].push(qa);
    });
    return Object.entries(byType).reduce((acc, [type, items]) => {
      acc[type] = {
        totalAssessments: items.length,
        avgPercent: this._avg(items.map(i => i.percentCorrect)),
        trend: this._calcTrend(items.map(i => i.percentCorrect)),
        latest: items[items.length - 1]?.percentCorrect || 0,
      };
      return acc;
    }, {});
  }

  _avg(arr) {
    const v = arr.filter(x => x != null && !isNaN(x));
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : 0;
  }
  _calcProgress(arr) {
    if (arr.length < 2) return 0;
    const f = this._avg(arr.slice(0, 3));
    const l = this._avg(arr.slice(-3));
    return Math.round(l - f);
  }
  _calcTrend(arr) {
    if (arr.length < 3) return 'insufficient_data';
    const f = this._avg(arr.slice(0, 3));
    const l = this._avg(arr.slice(-3));
    return l - f > 3 ? 'improving' : l - f < -3 ? 'declining' : 'stable';
  }
}

module.exports = { LearningDisabilitiesService };
