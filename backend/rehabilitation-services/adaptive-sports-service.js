/**
 * 🏊 خدمة الرياضة التكيفية — Adaptive Sports Therapy Service
 * الإصدار 6.0.0
 * يشمل: رياضات كراسي متحركة، سباحة تكيفية، فروسية علاجية، رياضات جماعية تكيفية
 */

class AdaptiveSportsService {
  constructor() {
    this.assessments = new Map();
    this.plans = new Map();
    this.sessions = new Map();
    this.sportsPrograms = new Map();
    this._initSportsCatalog();
  }

  _initSportsCatalog() {
    const sports = [
      {
        id: 'sp-wheelchair-basketball',
        nameAr: 'كرة سلة على كراسي متحركة',
        category: 'team',
        disabilityTypes: ['حركية'],
        physicalDemand: 'high',
        skills: ['قوة عضلية', 'تنسيق', 'عمل جماعي'],
      },
      {
        id: 'sp-wheelchair-tennis',
        nameAr: 'تنس على كراسي متحركة',
        category: 'individual',
        disabilityTypes: ['حركية'],
        physicalDemand: 'high',
        skills: ['تنسيق يد-عين', 'سرعة', 'قوة'],
      },
      {
        id: 'sp-adaptive-swimming',
        nameAr: 'سباحة تكيفية',
        category: 'individual',
        disabilityTypes: ['حركية', 'بصرية', 'ذهنية'],
        physicalDemand: 'medium',
        skills: ['قوة', 'تحمل', 'تنفس', 'ثقة بالماء'],
      },
      {
        id: 'sp-boccia',
        nameAr: 'بوتشا',
        category: 'individual',
        disabilityTypes: ['حركية', 'شلل دماغي'],
        physicalDemand: 'low',
        skills: ['دقة', 'تركيز', 'تخطيط'],
      },
      {
        id: 'sp-goalball',
        nameAr: 'كرة الهدف (جولبول)',
        category: 'team',
        disabilityTypes: ['بصرية'],
        physicalDemand: 'medium',
        skills: ['سمع', 'تنسيق', 'قوة'],
      },
      {
        id: 'sp-sitting-volleyball',
        nameAr: 'كرة طائرة جلوس',
        category: 'team',
        disabilityTypes: ['حركية'],
        physicalDemand: 'medium',
        skills: ['تنسيق', 'سرعة رد فعل', 'عمل جماعي'],
      },
      {
        id: 'sp-therapeutic-riding',
        nameAr: 'ركوب الخيل العلاجي',
        category: 'individual',
        disabilityTypes: ['حركية', 'توحد', 'ذهنية'],
        physicalDemand: 'medium',
        skills: ['توازن', 'تنسيق', 'ثقة'],
      },
      {
        id: 'sp-archery',
        nameAr: 'رماية تكيفية',
        category: 'individual',
        disabilityTypes: ['حركية'],
        physicalDemand: 'low',
        skills: ['تركيز', 'تنسيق', 'قوة عضلية علوية'],
      },
      {
        id: 'sp-table-tennis',
        nameAr: 'تنس طاولة تكيفي',
        category: 'individual',
        disabilityTypes: ['حركية', 'ذهنية'],
        physicalDemand: 'low',
        skills: ['تنسيق يد-عين', 'سرعة رد فعل'],
      },
      {
        id: 'sp-athletics',
        nameAr: 'ألعاب قوى تكيفية',
        category: 'individual',
        disabilityTypes: ['حركية', 'بصرية'],
        physicalDemand: 'high',
        skills: ['سرعة', 'قوة', 'تحمل'],
      },
    ];
    sports.forEach(s => this.sportsPrograms.set(s.id, s));
  }

  /* ─── تقييم اللياقة الرياضية ─── */
  async assessSportsFitness(beneficiaryId, assessmentData) {
    const assessment = {
      id: `asa-${Date.now()}`,
      beneficiaryId,
      date: new Date(),
      age: assessmentData.age,
      disabilityType: assessmentData.disabilityType,
      mobilityLevel: assessmentData.mobilityLevel || 'wheelchair',
      fitnessComponents: {
        cardiovascular: assessmentData.cardiovascular ?? 5,
        muscularStrength: assessmentData.muscularStrength ?? 5,
        flexibility: assessmentData.flexibility ?? 5,
        balance: assessmentData.balance ?? 5,
        coordination: assessmentData.coordination ?? 5,
        endurance: assessmentData.endurance ?? 5,
        reactionTime: assessmentData.reactionTime ?? 5,
        agility: assessmentData.agility ?? 5,
      },
      psychologicalProfile: {
        motivation: assessmentData.motivation ?? 7,
        competitiveness: assessmentData.competitiveness ?? 5,
        teamwork: assessmentData.teamwork ?? 5,
        confidence: assessmentData.confidence ?? 5,
        stressTolerance: assessmentData.stressTolerance ?? 5,
      },
      medicalClearance: {
        cleared: assessmentData.medicalClearance ?? true,
        restrictions: assessmentData.restrictions || [],
        cardiacOK: assessmentData.cardiacOK ?? true,
        respiratoryOK: assessmentData.respiratoryOK ?? true,
      },
      suitableSports: this._matchSports(assessmentData),
      fitnessLevel: this._calcFitnessLevel(assessmentData),
      recommendedProgram: this._recommendProgram(assessmentData),
      status: 'completed',
    };
    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  /* ─── خطة رياضية ─── */
  async createSportsPlan(beneficiaryId, assessmentData) {
    const plan = {
      id: `asp-${Date.now()}`,
      beneficiaryId,
      createdAt: new Date(),
      status: 'active',
      selectedSports: assessmentData.suitableSports || this._matchSports(assessmentData),
      goals: this._generateSportsGoals(assessmentData),
      trainingSchedule: {
        sessionsPerWeek: assessmentData.sessionsPerWeek || 3,
        sessionDuration: assessmentData.sessionDuration || 60,
        totalWeeks: assessmentData.totalWeeks || 16,
      },
      phases: [
        {
          phase: 1,
          name: 'تهيئة وتكييف',
          weeks: '1-4',
          focus: 'بناء اللياقة الأساسية والتعرف على الرياضة',
        },
        {
          phase: 2,
          name: 'تطوير المهارات',
          weeks: '5-8',
          focus: 'تعلم المهارات الأساسية للرياضة المختارة',
        },
        {
          phase: 3,
          name: 'تطبيق تنافسي',
          weeks: '9-12',
          focus: 'المشاركة في تدريبات تنافسية وبطولات داخلية',
        },
        {
          phase: 4,
          name: 'التأهيل للمنافسة',
          weeks: '13-16',
          focus: 'الإعداد للمنافسات الرسمية إن مناسب',
        },
      ],
      equipmentNeeded: this._listEquipment(assessmentData),
      adaptations: this._recommendAdaptations(assessmentData),
      sessionsCompleted: 0,
    };
    this.plans.set(plan.id, plan);
    return plan;
  }

  /* ─── تسجيل جلسة تدريب ─── */
  async recordSession(beneficiaryId, sessionData) {
    const session = {
      id: `ass-${Date.now()}`,
      beneficiaryId,
      date: new Date(),
      sport: sessionData.sport,
      duration: sessionData.duration || 60,
      type: sessionData.type || 'training', // training / practice / competition
      // أداء بدني
      physicalMetrics: {
        heartRateAvg: sessionData.heartRateAvg || null,
        heartRateMax: sessionData.heartRateMax || null,
        caloriesBurned: sessionData.caloriesBurned || null,
        distanceCovered: sessionData.distanceCovered || null,
        intensityLevel: sessionData.intensityLevel || 'moderate',
        perceivedExertion: sessionData.perceivedExertion || 5,
      },
      // أداء رياضي
      sportsMetrics: {
        skillExecution: sessionData.skillExecution || 5,
        tacticalAwareness: sessionData.tacticalAwareness || 5,
        sportsmanship: sessionData.sportsmanship || 8,
        competitiveScore: sessionData.competitiveScore || null,
        personalBest: sessionData.personalBest || false,
      },
      // مقاييس نفسية-اجتماعية
      psychosocial: {
        enjoyment: sessionData.enjoyment || 7,
        confidence: sessionData.confidence || 5,
        socialInteraction: sessionData.socialInteraction || 5,
        teamBehavior: sessionData.teamBehavior || null,
        leadershipShown: sessionData.leadershipShown || false,
      },
      achievements: sessionData.achievements || [],
      injuryReport: sessionData.injury || null,
      coachNotes: sessionData.notes || '',
    };

    const key = `${beneficiaryId}_sessions`;
    const sessions = this.sessions.get(key) || [];
    sessions.push(session);
    this.sessions.set(key, sessions);
    return session;
  }

  /* ─── تسجيل إنجاز/بطولة ─── */
  async recordAchievement(beneficiaryId, achievementData) {
    const key = `${beneficiaryId}_achievements`;
    const achievements = this.sessions.get(key) || [];
    const achievement = {
      id: `ach-${Date.now()}`,
      beneficiaryId,
      date: achievementData.date || new Date(),
      sport: achievementData.sport,
      event: achievementData.event,
      result: achievementData.result,
      medal: achievementData.medal || null,
      category: achievementData.category || '',
      personalBest: achievementData.personalBest || false,
      notes: achievementData.notes || '',
    };
    achievements.push(achievement);
    this.sessions.set(key, achievements);
    return achievement;
  }

  /* ─── تقرير التقدم ─── */
  async getProgressReport(beneficiaryId) {
    const sessions = this.sessions.get(`${beneficiaryId}_sessions`) || [];
    const achievements = this.sessions.get(`${beneficiaryId}_achievements`) || [];
    if (sessions.length === 0)
      return { beneficiaryId, totalSessions: 0, message: 'لا توجد جلسات مسجلة' };

    const physical = sessions.map(s => s.physicalMetrics);
    const sports = sessions.map(s => s.sportsMetrics);
    const psycho = sessions.map(s => s.psychosocial);

    return {
      beneficiaryId,
      totalSessions: sessions.length,
      totalDuration: sessions.reduce((s, x) => s + x.duration, 0),
      sportsParticipated: [...new Set(sessions.map(s => s.sport))],
      physicalProgress: {
        avgExertion: this._avg(physical.map(p => p.perceivedExertion)),
        enduranceTrend: this._calcTrend(physical.map(p => 10 - (p.perceivedExertion || 5))),
        totalCalories: physical.reduce((s, p) => s + (p.caloriesBurned || 0), 0),
      },
      sportsProgress: {
        avgSkillExecution: this._avg(sports.map(s => s.skillExecution)),
        skillTrend: this._calcTrend(sports.map(s => s.skillExecution)),
        personalBests: sessions.filter(s => s.sportsMetrics.personalBest).length,
      },
      psychosocialProgress: {
        avgEnjoyment: this._avg(psycho.map(p => p.enjoyment)),
        avgConfidence: this._avg(psycho.map(p => p.confidence)),
        confidenceTrend: this._calcTrend(psycho.map(p => p.confidence)),
        avgSocialInteraction: this._avg(psycho.map(p => p.socialInteraction)),
      },
      achievements: achievements.slice(-5),
      injuryCount: sessions.filter(s => s.injuryReport).length,
      overallProgress: this._calcProgress(sports.map(s => s.skillExecution)),
      recommendations: this._generateRecommendations(sessions),
    };
  }

  _matchSports(data) {
    const all = Array.from(this.sportsPrograms.values());
    return all
      .filter(s => s.disabilityTypes.some(d => (data.disabilityType || '').includes(d)))
      .filter(s => {
        if (s.physicalDemand === 'high' && (data.cardiovascular || 5) < 4) return false;
        return true;
      })
      .map(s => s.id);
  }

  _calcFitnessLevel(data) {
    const vals = Object.values(data.fitnessComponents || {}).filter(v => typeof v === 'number');
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 5;
    if (avg <= 3) return 'مبتدئ';
    if (avg <= 6) return 'متوسط';
    if (avg <= 8) return 'جيد';
    return 'متقدم';
  }

  _recommendProgram(data) {
    if ((data.cardiovascular || 5) < 4) return 'برنامج بناء لياقة تأسيسي';
    if ((data.teamwork || 5) < 4) return 'رياضات فردية أولاً ثم جماعية';
    return 'برنامج متكامل فردي وجماعي';
  }

  _generateSportsGoals(data) {
    const goals = [];
    goals.push({ domain: 'fitness', goal: 'تحسين اللياقة القلبية التنفسية بنسبة 20%', target: 20 });
    goals.push({ domain: 'skill', goal: 'إتقان 5 مهارات أساسية في الرياضة المختارة', target: 5 });
    goals.push({ domain: 'social', goal: 'المشاركة في 3 أنشطة جماعية بنجاح', target: 3 });
    goals.push({ domain: 'confidence', goal: 'رفع مستوى الثقة الرياضية إلى 8/10', target: 8 });
    if ((data.competitiveness || 5) > 6)
      goals.push({ domain: 'competition', goal: 'المشاركة في بطولة محلية واحدة', target: 1 });
    return goals;
  }

  _listEquipment(data) {
    const eq = [];
    if ((data.mobilityLevel || '').includes('wheelchair')) eq.push('كرسي متحرك رياضي');
    eq.push('ملابس رياضية مناسبة', 'قفازات واقية', 'معدات السلامة');
    return eq;
  }

  _recommendAdaptations(data) {
    const adaptations = [];
    if (data.mobilityLevel === 'wheelchair')
      adaptations.push('تعديل القواعد لتتناسب مع الكرسي المتحرك');
    if (data.disabilityType && data.disabilityType.includes('بصرية'))
      adaptations.push('استخدام كرات صوتية ومعالم لمسية');
    if (data.disabilityType && data.disabilityType.includes('ذهنية'))
      adaptations.push('تبسيط القواعد واستخدام وسائل بصرية');
    adaptations.push('تدرج في المستوى حسب القدرة');
    return adaptations;
  }

  _generateRecommendations(sessions) {
    const recs = [];
    const avgEnjoy = this._avg(sessions.map(s => s.psychosocial.enjoyment));
    const avgSkill = this._avg(sessions.map(s => s.sportsMetrics.skillExecution));
    if (avgEnjoy < 5) recs.push('تجربة رياضات مختلفة لإيجاد الأنسب');
    if (avgSkill > 7) recs.push('التأهل للمنافسات والبطولات');
    if (sessions.filter(s => s.injuryReport).length > 2)
      recs.push('مراجعة برنامج الوقاية من الإصابات');
    recs.push('الاستمرار في تطوير اللياقة الأساسية بالتوازي مع المهارات الرياضية');
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
    return l - f > 1 ? 'improving' : l - f < -1 ? 'declining' : 'stable';
  }
}

module.exports = { AdaptiveSportsService };
