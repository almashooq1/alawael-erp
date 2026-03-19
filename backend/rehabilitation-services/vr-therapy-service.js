/**
 * 🥽 خدمة العلاج بالواقع الافتراضي — Virtual Reality Therapy Service
 * الإصدار 6.0.0
 * يشمل: علاج حركي بالواقع الافتراضي، تدريب معرفي، علاج رهاب، محاكاة بيئية
 */

class VRTherapyService {
  constructor() {
    this.assessments = new Map();
    this.plans = new Map();
    this.sessions = new Map();
    this.environments = new Map();
    this._initDefaultEnvironments();
  }

  _initDefaultEnvironments() {
    const defaults = [
      {
        id: 'env-motor-1',
        nameAr: 'غرفة التمارين الحركية',
        type: 'motor',
        difficulty: 'beginner',
        description: 'بيئة افتراضية لتمارين الأطراف العلوية والسفلية',
      },
      {
        id: 'env-motor-2',
        nameAr: 'مسار المشي الافتراضي',
        type: 'motor',
        difficulty: 'intermediate',
        description: 'محاكاة مشي في حديقة مع عوائق متدرجة',
      },
      {
        id: 'env-cognitive-1',
        nameAr: 'السوق الافتراضي',
        type: 'cognitive',
        difficulty: 'intermediate',
        description: 'محاكاة تسوق لتدريب الذاكرة والتخطيط',
      },
      {
        id: 'env-cognitive-2',
        nameAr: 'لعبة الذاكرة ثلاثية الأبعاد',
        type: 'cognitive',
        difficulty: 'beginner',
        description: 'تمارين ذاكرة تفاعلية في بيئة ثلاثية الأبعاد',
      },
      {
        id: 'env-phobia-1',
        nameAr: 'التعرض التدريجي للمرتفعات',
        type: 'phobia',
        difficulty: 'progressive',
        description: 'بيئة للعلاج التدريجي لرهاب المرتفعات',
      },
      {
        id: 'env-social-1',
        nameAr: 'الفصل الدراسي الافتراضي',
        type: 'social',
        difficulty: 'beginner',
        description: 'محاكاة فصل دراسي لتدريب المهارات الاجتماعية',
      },
      {
        id: 'env-social-2',
        nameAr: 'المقهى الافتراضي',
        type: 'social',
        difficulty: 'intermediate',
        description: 'محاكاة مقهى للتدريب على التفاعل الاجتماعي',
      },
      {
        id: 'env-daily-1',
        nameAr: 'المطبخ الافتراضي',
        type: 'daily_living',
        difficulty: 'beginner',
        description: 'تدريب على مهارات الطبخ والمطبخ',
      },
      {
        id: 'env-balance-1',
        nameAr: 'منصة التوازن',
        type: 'balance',
        difficulty: 'progressive',
        description: 'تمارين توازن متدرجة الصعوبة',
      },
    ];
    defaults.forEach(env => this.environments.set(env.id, env));
  }

  /* ─── التقييم ─── */
  async assessVRReadiness(beneficiaryId, assessmentData) {
    const assessment = {
      id: `vra-${Date.now()}`,
      beneficiaryId,
      date: new Date(),
      // فحص مدى القابلية للواقع الافتراضي
      motionSicknessRisk: assessmentData.motionSicknessHistory || 'low',
      visualAcuity: assessmentData.visualAcuity || 'adequate',
      seizureHistory: assessmentData.seizureHistory || false,
      cognitiveLevel: assessmentData.cognitiveLevel || 'moderate',
      physicalLimitations: assessmentData.physicalLimitations || [],
      anxietyLevel: assessmentData.anxietyLevel || 3,
      // تقييم المجالات المستهدفة
      targetDomains: {
        motorRehab: {
          needed: assessmentData.motorRehab ?? true,
          priority: assessmentData.motorPriority || 'medium',
        },
        cognitiveTraining: {
          needed: assessmentData.cognitiveTraining ?? false,
          priority: assessmentData.cognitivePriority || 'low',
        },
        phobiaExposure: {
          needed: assessmentData.phobiaExposure ?? false,
          targets: assessmentData.phobiaTargets || [],
        },
        socialSkills: {
          needed: assessmentData.socialSkills ?? false,
          priority: assessmentData.socialPriority || 'medium',
        },
        dailyLiving: {
          needed: assessmentData.dailyLiving ?? false,
          priority: assessmentData.dailyPriority || 'low',
        },
        balanceTraining: {
          needed: assessmentData.balanceTraining ?? false,
          priority: assessmentData.balancePriority || 'medium',
        },
      },
      // تقييم الملاءمة
      suitabilityScore: this._calcSuitability(assessmentData),
      contraindications: this._checkContraindications(assessmentData),
      recommendedEnvironments: this._recommendEnvironments(assessmentData),
      status: 'completed',
    };
    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  /* ─── الخطة العلاجية ─── */
  async createVRTherapyPlan(beneficiaryId, assessmentData) {
    const plan = {
      id: `vrp-${Date.now()}`,
      beneficiaryId,
      createdAt: new Date(),
      status: 'active',
      // إعدادات الجلسة
      sessionSettings: {
        maxDurationMinutes: assessmentData.seizureHistory ? 15 : 30,
        breakIntervalMinutes: 10,
        immersionLevel:
          assessmentData.anxietyLevel > 7
            ? 'low'
            : assessmentData.anxietyLevel > 4
              ? 'medium'
              : 'high',
        motionIntensity: assessmentData.motionSicknessRisk === 'high' ? 'minimal' : 'standard',
      },
      // الأهداف
      goals: this._generateVRGoals(assessmentData),
      // البيئات المختارة
      environments:
        assessmentData.recommendedEnvironments || this._recommendEnvironments(assessmentData),
      // جدول التدرج
      progressionSchedule: [
        {
          week: '1-2',
          phase: 'تعريف',
          description: 'تعريف بالواقع الافتراضي وبناء الراحة',
          immersion: 'low',
        },
        {
          week: '3-4',
          phase: 'أساسي',
          description: 'تمارين أساسية في بيئات بسيطة',
          immersion: 'medium',
        },
        {
          week: '5-8',
          phase: 'متقدم',
          description: 'تمارين متقدمة مع زيادة التعقيد',
          immersion: 'medium-high',
        },
        {
          week: '9-12',
          phase: 'تكامل',
          description: 'دمج المهارات في بيئات واقعية معقدة',
          immersion: 'high',
        },
      ],
      sessionsCompleted: 0,
      totalPlannedSessions: 24,
    };
    this.plans.set(plan.id, plan);
    return plan;
  }

  /* ─── تسجيل جلسة ─── */
  async recordSession(beneficiaryId, sessionData) {
    const session = {
      id: `vrs-${Date.now()}`,
      beneficiaryId,
      date: new Date(),
      environment: sessionData.environment,
      duration: sessionData.duration || 20,
      // بيانات أداء الواقع الافتراضي
      vrMetrics: {
        taskCompletionRate: sessionData.taskCompletionRate || 0,
        reactionTimeMs: sessionData.reactionTimeMs || 0,
        accuracyPercent: sessionData.accuracyPercent || 0,
        movementRange: sessionData.movementRange || {},
        balanceScore: sessionData.balanceScore || null,
        cognitiveScore: sessionData.cognitiveScore || null,
      },
      // بيانات الراحة والأمان
      comfortMetrics: {
        motionSickness: sessionData.motionSickness || 'none',
        discomfortLevel: sessionData.discomfortLevel || 0,
        anxietyDuring: sessionData.anxietyDuring || 0,
        engagementLevel: sessionData.engagementLevel || 7,
        enjoymentRating: sessionData.enjoymentRating || 7,
      },
      // بيانات فسيولوجية (إن وُجدت)
      physiological: {
        heartRateAvg: sessionData.heartRateAvg || null,
        heartRateMax: sessionData.heartRateMax || null,
        eyeTrackingData: sessionData.eyeTrackingData || null,
      },
      immersionLevel: sessionData.immersionLevel || 'medium',
      difficultyLevel: sessionData.difficultyLevel || 3,
      therapistNotes: sessionData.notes || '',
      goalsAddressed: sessionData.goalsAddressed || [],
    };

    const key = `${beneficiaryId}_sessions`;
    const sessions = this.sessions.get(key) || [];
    sessions.push(session);
    this.sessions.set(key, sessions);

    return session;
  }

  /* ─── تسجيل بيئة مخصصة ─── */
  async createCustomEnvironment(environmentData) {
    const env = {
      id: `env-custom-${Date.now()}`,
      nameAr: environmentData.nameAr,
      nameEn: environmentData.nameEn || '',
      type: environmentData.type,
      difficulty: environmentData.difficulty || 'beginner',
      description: environmentData.description || '',
      customSettings: environmentData.settings || {},
      createdAt: new Date(),
      isCustom: true,
    };
    this.environments.set(env.id, env);
    return env;
  }

  /* ─── قائمة البيئات ─── */
  async getEnvironments(type) {
    const envs = Array.from(this.environments.values());
    return type ? envs.filter(e => e.type === type) : envs;
  }

  /* ─── تقرير التقدم ─── */
  async getProgressReport(beneficiaryId) {
    const sessions = this.sessions.get(`${beneficiaryId}_sessions`) || [];
    if (sessions.length === 0)
      return { beneficiaryId, totalSessions: 0, message: 'لا توجد جلسات مسجلة' };

    const metrics = sessions.map(s => s.vrMetrics);
    const comfort = sessions.map(s => s.comfortMetrics);
    const recent5 = sessions.slice(-5);

    return {
      beneficiaryId,
      totalSessions: sessions.length,
      totalDuration: sessions.reduce((s, x) => s + x.duration, 0),
      performance: {
        avgTaskCompletion: this._avg(metrics.map(m => m.taskCompletionRate)),
        avgAccuracy: this._avg(metrics.map(m => m.accuracyPercent)),
        avgReactionTime: this._avg(metrics.map(m => m.reactionTimeMs)),
        improvementTrend: this._calcTrend(metrics.map(m => m.taskCompletionRate)),
      },
      comfort: {
        avgEngagement: this._avg(comfort.map(c => c.engagementLevel)),
        avgEnjoyment: this._avg(comfort.map(c => c.enjoymentRating)),
        motionSicknessIncidents: comfort.filter(c => c.motionSickness !== 'none').length,
        avgAnxiety: this._avg(comfort.map(c => c.anxietyDuring)),
      },
      recentSessions: recent5.map(s => ({
        date: s.date,
        environment: s.environment,
        taskCompletion: s.vrMetrics.taskCompletionRate,
        engagement: s.comfortMetrics.engagementLevel,
      })),
      overallProgress: this._calcProgress(metrics.map(m => m.taskCompletionRate)),
      recommendations: this._generateVRRecommendations(sessions),
    };
  }

  /* ─── مساعدات ─── */
  _calcSuitability(data) {
    let score = 80;
    if (data.seizureHistory) score -= 30;
    if (data.motionSicknessRisk === 'high') score -= 20;
    if (data.visualAcuity === 'poor') score -= 15;
    if (data.anxietyLevel > 8) score -= 10;
    return Math.max(0, Math.min(100, score));
  }

  _checkContraindications(data) {
    const list = [];
    if (data.seizureHistory)
      list.push({
        issue: 'تاريخ نوبات صرع',
        severity: 'high',
        action: 'تقليل مدة الجلسات وتجنب الوميض',
      });
    if (data.motionSicknessRisk === 'high')
      list.push({
        issue: 'قابلية عالية لدوار الحركة',
        severity: 'medium',
        action: 'استخدام أوضاع ثابتة وتقليل الحركة',
      });
    if (data.visualAcuity === 'poor')
      list.push({
        issue: 'ضعف حاد في البصر',
        severity: 'medium',
        action: 'ضبط التباين وحجم العناصر',
      });
    return list;
  }

  _recommendEnvironments(data) {
    const recs = [];
    if (data.motorRehab) recs.push('env-motor-1', 'env-motor-2');
    if (data.cognitiveTraining) recs.push('env-cognitive-1', 'env-cognitive-2');
    if (data.phobiaExposure) recs.push('env-phobia-1');
    if (data.socialSkills) recs.push('env-social-1', 'env-social-2');
    if (data.dailyLiving) recs.push('env-daily-1');
    if (data.balanceTraining) recs.push('env-balance-1');
    return recs.length > 0 ? recs : ['env-motor-1', 'env-cognitive-1'];
  }

  _generateVRGoals(data) {
    const goals = [];
    if (data.motorRehab)
      goals.push({
        domain: 'motor',
        goal: 'تحسين نطاق الحركة بنسبة 25%',
        metric: 'movementRange',
        target: 25,
      });
    if (data.cognitiveTraining)
      goals.push({
        domain: 'cognitive',
        goal: 'تحسين سرعة الاستجابة بنسبة 30%',
        metric: 'reactionTimeMs',
        target: 30,
      });
    if (data.balanceTraining)
      goals.push({
        domain: 'balance',
        goal: 'تحسين التوازن القائم لمدة 60 ثانية',
        metric: 'balanceScore',
        target: 60,
      });
    if (data.socialSkills)
      goals.push({
        domain: 'social',
        goal: 'إكمال 5 سيناريوهات اجتماعية بنجاح',
        metric: 'taskCompletionRate',
        target: 5,
      });
    if (data.dailyLiving)
      goals.push({
        domain: 'daily',
        goal: 'إتقان 3 مهام يومية في البيئة الافتراضية',
        metric: 'taskCompletionRate',
        target: 3,
      });
    return goals;
  }

  _generateVRRecommendations(sessions) {
    const recs = [];
    const avgCompletion = this._avg(sessions.map(s => s.vrMetrics.taskCompletionRate));
    const avgEngagement = this._avg(sessions.map(s => s.comfortMetrics.engagementLevel));
    const sickCount = sessions.filter(s => s.comfortMetrics.motionSickness !== 'none').length;

    if (avgCompletion > 80) recs.push('زيادة مستوى الصعوبة في البيئات الافتراضية');
    if (avgCompletion < 40) recs.push('تبسيط المهام وزيادة الدعم التوجيهي');
    if (avgEngagement < 5) recs.push('تغيير البيئات الافتراضية لزيادة التحفيز');
    if (sickCount > sessions.length * 0.3) recs.push('تقليل شدة الحركة واستخدام فترات راحة أطول');
    if (sessions.length >= 10) recs.push('الانتقال إلى المرحلة التالية من التدرج');
    return recs;
  }

  _avg(arr) {
    const v = arr.filter(x => x != null && !isNaN(x));
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : 0;
  }
  _calcProgress(arr) {
    if (arr.length < 2) return 0;
    const first = this._avg(arr.slice(0, 3));
    const last = this._avg(arr.slice(-3));
    return Math.round(last - first);
  }
  _calcTrend(arr) {
    if (arr.length < 3) return 'insufficient_data';
    const first = this._avg(arr.slice(0, 3));
    const last = this._avg(arr.slice(-3));
    const diff = last - first;
    return diff > 5 ? 'improving' : diff < -5 ? 'declining' : 'stable';
  }
}

module.exports = { VRTherapyService };
