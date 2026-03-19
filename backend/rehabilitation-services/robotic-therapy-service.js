/**
 * 🤖 خدمة العلاج بالروبوتات — Robotic-Assisted Therapy Service
 * الإصدار 6.0.0
 * يشمل: أذرع روبوتية، هياكل خارجية، روبوتات اجتماعية، أنظمة المشي الآلي
 */

class RoboticTherapyService {
  constructor() {
    this.assessments = new Map();
    this.plans = new Map();
    this.sessions = new Map();
    this.devices = new Map();
    this._initDeviceCatalog();
  }

  _initDeviceCatalog() {
    const catalog = [
      {
        id: 'robo-arm-1',
        nameAr: 'ذراع روبوتية علوية',
        type: 'upper_limb',
        brand: 'InMotion ARM',
        capabilities: ['تمارين الكتف', 'تمارين المرفق', 'تمارين المعصم'],
        suitableFor: ['سكتة دماغية', 'إصابة حبل شوكي', 'شلل دماغي'],
      },
      {
        id: 'robo-hand-1',
        nameAr: 'قفاز روبوتي لليد',
        type: 'hand',
        brand: 'Gloreha',
        capabilities: ['تمارين الأصابع', 'تمارين القبضة', 'مهارات دقيقة'],
        suitableFor: ['سكتة دماغية', 'إصابة أعصاب طرفية'],
      },
      {
        id: 'robo-gait-1',
        nameAr: 'جهاز المشي الروبوتي',
        type: 'gait',
        brand: 'Lokomat',
        capabilities: ['تدريب المشي', 'تقوية الأطراف السفلية', 'تحسين التوازن'],
        suitableFor: ['إصابة حبل شوكي', 'شلل دماغي', 'سكتة دماغية'],
      },
      {
        id: 'robo-exo-1',
        nameAr: 'هيكل خارجي للمشي',
        type: 'exoskeleton',
        brand: 'ReWalk',
        capabilities: ['مشي مستقل', 'وقوف', 'صعود درج'],
        suitableFor: ['إصابة حبل شوكي', 'شلل نصفي'],
      },
      {
        id: 'robo-social-1',
        nameAr: 'روبوت اجتماعي تفاعلي',
        type: 'social_robot',
        brand: 'NAO',
        capabilities: ['تفاعل اجتماعي', 'تدريب تواصل', 'تمارين حركية'],
        suitableFor: ['توحد', 'إعاقة ذهنية', 'انطواء'],
      },
      {
        id: 'robo-social-2',
        nameAr: 'روبوت مرافق ذكي',
        type: 'companion_robot',
        brand: 'PARO',
        capabilities: ['دعم عاطفي', 'تحفيز تفاعل', 'تهدئة'],
        suitableFor: ['توحد', 'خرف', 'قلق'],
      },
      {
        id: 'robo-balance-1',
        nameAr: 'منصة توازن روبوتية',
        type: 'balance',
        brand: 'BalanceBot',
        capabilities: ['تدريب توازن', 'تقييم استقرار', 'ألعاب تفاعلية'],
        suitableFor: ['شلل دماغي', 'إصابة دماغية', 'كبار السن'],
      },
    ];
    catalog.forEach(d => this.devices.set(d.id, d));
  }

  /* ─── تقييم الملاءمة الروبوتية ─── */
  async assessRoboticFitness(beneficiaryId, assessmentData) {
    const assessment = {
      id: `rta-${Date.now()}`,
      beneficiaryId,
      date: new Date(),
      diagnosis: assessmentData.diagnosis,
      affectedLimbs: assessmentData.affectedLimbs || [],
      muscleStrength: assessmentData.muscleStrength || {},
      spasticity: assessmentData.spasticity || 'none',
      rangeOfMotion: assessmentData.rangeOfMotion || {},
      cognitiveAbility: assessmentData.cognitiveAbility || 'adequate',
      motivation: assessmentData.motivation || 7,
      bodyMeasurements: {
        height: assessmentData.height,
        weight: assessmentData.weight,
        armLength: assessmentData.armLength,
        legLength: assessmentData.legLength,
      },
      contraindications: this._checkRoboticContraindications(assessmentData),
      suitableDevices: this._matchDevices(assessmentData),
      priorityAreas: this._identifyPriorityAreas(assessmentData),
      readinessScore: this._calcReadiness(assessmentData),
      status: 'completed',
    };
    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  /* ─── خطة علاجية ─── */
  async createRoboticTherapyPlan(beneficiaryId, assessmentData) {
    const plan = {
      id: `rtp-${Date.now()}`,
      beneficiaryId,
      createdAt: new Date(),
      status: 'active',
      selectedDevices: assessmentData.suitableDevices || this._matchDevices(assessmentData),
      goals: this._generateRoboticGoals(assessmentData),
      sessionProtocol: {
        warmup: { duration: 5, activities: ['تمارين إحماء يدوية', 'تهيئة الجهاز'] },
        roboticTraining: {
          duration: 25,
          assistLevel: assessmentData.spasticity === 'severe' ? 'high' : 'moderate',
        },
        cooldown: { duration: 5, activities: ['تمديد', 'تبريد'] },
        totalDuration: 35,
      },
      progressionCriteria: {
        assistReduction: 'تقليل المساعدة بنسبة 10% كل أسبوعين',
        resistanceIncrease: 'زيادة المقاومة تدريجياً مع تحسن القوة',
        speedIncrease: 'زيادة سرعة الحركة مع تحسن التحكم',
      },
      safetyProtocols: [
        'فحص الجهاز قبل كل جلسة',
        'مراقبة علامات حيوية مستمرة',
        'إيقاف فوري عند شعور المريض بألم',
        'ضبط حدود نطاق الحركة الآمنة',
      ],
      schedule: {
        sessionsPerWeek: 3,
        totalWeeks: 16,
      },
      sessionsCompleted: 0,
    };
    this.plans.set(plan.id, plan);
    return plan;
  }

  /* ─── تسجيل جلسة ─── */
  async recordSession(beneficiaryId, sessionData) {
    const session = {
      id: `rts-${Date.now()}`,
      beneficiaryId,
      date: new Date(),
      deviceUsed: sessionData.deviceId,
      duration: sessionData.duration || 35,
      // بيانات الأداء الروبوتي
      roboticMetrics: {
        assistLevel: sessionData.assistLevel || 50,
        repetitions: sessionData.repetitions || 0,
        activeROM: sessionData.activeROM || {},
        passiveROM: sessionData.passiveROM || {},
        peakForce: sessionData.peakForce || 0,
        avgForce: sessionData.avgForce || 0,
        smoothnessIndex: sessionData.smoothnessIndex || 0,
        pathDeviation: sessionData.pathDeviation || 0,
        taskCompletionRate: sessionData.taskCompletionRate || 0,
        movementSpeed: sessionData.movementSpeed || 0,
      },
      // بيانات التفاعل (للروبوتات الاجتماعية)
      socialInteraction:
        sessionData.deviceType === 'social_robot'
          ? {
              eyeContact: sessionData.eyeContact || 0,
              verbalResponses: sessionData.verbalResponses || 0,
              imitationSuccess: sessionData.imitationSuccess || 0,
              engagementScore: sessionData.engagementScore || 5,
              initiatedInteractions: sessionData.initiatedInteractions || 0,
            }
          : null,
      vitals: {
        heartRateAvg: sessionData.heartRateAvg || null,
        painLevel: sessionData.painLevel || 0,
        fatigueLevel: sessionData.fatigueLevel || 3,
      },
      therapistNotes: sessionData.notes || '',
      safetyIncidents: sessionData.safetyIncidents || [],
    };

    const key = `${beneficiaryId}_sessions`;
    const sessions = this.sessions.get(key) || [];
    sessions.push(session);
    this.sessions.set(key, sessions);
    return session;
  }

  /* ─── قائمة الأجهزة ─── */
  async getDeviceCatalog(type) {
    const all = Array.from(this.devices.values());
    return type ? all.filter(d => d.type === type) : all;
  }

  /* ─── تقرير التقدم ─── */
  async getProgressReport(beneficiaryId) {
    const sessions = this.sessions.get(`${beneficiaryId}_sessions`) || [];
    if (sessions.length === 0)
      return { beneficiaryId, totalSessions: 0, message: 'لا توجد جلسات مسجلة' };

    const metrics = sessions.map(s => s.roboticMetrics);
    return {
      beneficiaryId,
      totalSessions: sessions.length,
      totalDuration: sessions.reduce((s, x) => s + x.duration, 0),
      totalRepetitions: metrics.reduce((s, m) => s + m.repetitions, 0),
      performance: {
        avgAssistLevel: this._avg(metrics.map(m => m.assistLevel)),
        assistTrend: this._calcTrend(metrics.map(m => 100 - m.assistLevel)),
        avgTaskCompletion: this._avg(metrics.map(m => m.taskCompletionRate)),
        avgSmoothness: this._avg(metrics.map(m => m.smoothnessIndex)),
        avgForce: this._avg(metrics.map(m => m.avgForce)),
        forceTrend: this._calcTrend(metrics.map(m => m.avgForce)),
      },
      safety: {
        totalIncidents: sessions.reduce((s, x) => s + x.safetyIncidents.length, 0),
        avgPain: this._avg(sessions.map(s => s.vitals.painLevel)),
        avgFatigue: this._avg(sessions.map(s => s.vitals.fatigueLevel)),
      },
      recentSessions: sessions.slice(-5).map(s => ({
        date: s.date,
        device: s.deviceUsed,
        assistLevel: s.roboticMetrics.assistLevel,
        reps: s.roboticMetrics.repetitions,
        taskCompletion: s.roboticMetrics.taskCompletionRate,
      })),
      overallProgress: this._calcProgress(metrics.map(m => m.taskCompletionRate)),
      recommendations: this._generateRecommendations(sessions),
    };
  }

  _checkRoboticContraindications(data) {
    const list = [];
    if (data.spasticity === 'severe')
      list.push({ issue: 'تشنج شديد', action: 'استخدام وضع مساعدة عالية وتقليل السرعة' });
    if ((data.weight || 0) > 120)
      list.push({ issue: 'وزن يتجاوز سعة بعض الأجهزة', action: 'التحقق من حدود الوزن للجهاز' });
    if (data.skinCondition === 'fragile')
      list.push({ issue: 'بشرة حساسة', action: 'استخدام حشوات إضافية ومراقبة الجلد' });
    return list;
  }

  _matchDevices(data) {
    const suitable = [];
    const devices = Array.from(this.devices.values());
    devices.forEach(d => {
      if (d.suitableFor.some(s => (data.diagnosis || '').includes(s))) suitable.push(d.id);
    });
    return suitable.length > 0 ? suitable : ['robo-arm-1'];
  }

  _identifyPriorityAreas(data) {
    const areas = [];
    if ((data.affectedLimbs || []).some(l => ['right_arm', 'left_arm'].includes(l)))
      areas.push('upper_limb_function');
    if ((data.affectedLimbs || []).some(l => ['right_leg', 'left_leg'].includes(l)))
      areas.push('gait_training');
    if (data.diagnosis && data.diagnosis.includes('توحد')) areas.push('social_interaction');
    return areas.length > 0 ? areas : ['general_mobility'];
  }

  _calcReadiness(data) {
    let score = 70;
    if (data.motivation >= 8) score += 15;
    if (data.cognitiveAbility === 'adequate') score += 10;
    if (data.spasticity === 'severe') score -= 15;
    return Math.max(0, Math.min(100, score));
  }

  _generateRoboticGoals(data) {
    const goals = [];
    if ((data.affectedLimbs || []).length > 0)
      goals.push({ domain: 'motor', goal: 'تحسين نطاق الحركة النشطة بنسبة 20%', target: 20 });
    goals.push({ domain: 'strength', goal: 'زيادة القوة العضلية بمقدار درجة واحدة', target: 1 });
    goals.push({
      domain: 'independence',
      goal: 'تقليل مستوى المساعدة الروبوتية إلى 30%',
      target: 30,
    });
    goals.push({ domain: 'endurance', goal: 'زيادة عدد التكرارات لكل جلسة بنسبة 50%', target: 50 });
    return goals;
  }

  _generateRecommendations(sessions) {
    const recs = [];
    const avgAssist = this._avg(sessions.map(s => s.roboticMetrics.assistLevel));
    const avgPain = this._avg(sessions.map(s => s.vitals.painLevel));
    if (avgAssist < 30) recs.push('الانتقال إلى تمارين بمقاومة أعلى');
    if (avgAssist > 70) recs.push('التركيز على تمارين الحركة المساعدة قبل تقليل المساعدة');
    if (avgPain > 5) recs.push('مراجعة إعدادات الجهاز وتقليل الشدة');
    recs.push('دمج تمارين روبوتية مع تمارين يدوية لتعزيز التعميم');
    return recs;
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

module.exports = { RoboticTherapyService };
