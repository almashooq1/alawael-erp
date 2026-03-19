/**
 * 🎮 خدمة العلاج باللعب — Play Therapy Service
 * الإصدار 6.0.0
 * يشمل: علاج باللعب الموجّه، لعب حر، لعب رمزي، لعب جماعي، ألعاب تعليمية
 */

class PlayTherapyService {
  constructor() {
    this.assessments = new Map();
    this.plans = new Map();
    this.sessions = new Map();
    this.playProfiles = new Map();
  }

  /* ─── تقييم مهارات اللعب ─── */
  async assessPlaySkills(beneficiaryId, assessmentData) {
    const assessment = {
      id: `pta-${Date.now()}`,
      beneficiaryId,
      date: new Date(),
      age: assessmentData.age,
      // تقييم مراحل اللعب التطوري
      playDevelopment: {
        solitaryPlay: assessmentData.solitaryPlay ?? 0, // لعب انفرادي (0-10)
        parallelPlay: assessmentData.parallelPlay ?? 0, // لعب متوازي
        associativePlay: assessmentData.associativePlay ?? 0, // لعب تشاركي
        cooperativePlay: assessmentData.cooperativePlay ?? 0, // لعب تعاوني
        symbolicPlay: assessmentData.symbolicPlay ?? 0, // لعب رمزي
        constructivePlay: assessmentData.constructivePlay ?? 0, // لعب بنائي
        ruleBasedPlay: assessmentData.ruleBasedPlay ?? 0, // لعب بقواعد
      },
      // مهارات مرتبطة
      relatedSkills: {
        creativity: assessmentData.creativity ?? 5,
        problemSolving: assessmentData.problemSolving ?? 5,
        emotionalExpression: assessmentData.emotionalExpression ?? 5,
        turnTaking: assessmentData.turnTaking ?? 5,
        frustrationTolerance: assessmentData.frustrationTolerance ?? 5,
        attentionSpan: assessmentData.attentionMinutes ?? 5,
        imitation: assessmentData.imitation ?? 5,
        initiation: assessmentData.initiation ?? 5,
      },
      // تفضيلات اللعب
      preferences: {
        favoriteActivities: assessmentData.favoriteActivities || [],
        avoidedActivities: assessmentData.avoidedActivities || [],
        preferredPartners: assessmentData.preferredPartners || 'alone',
        environmentPreference: assessmentData.environmentPreference || 'structured',
        sensoryPreferences: assessmentData.sensoryPreferences || [],
      },
      playAge: this._estimatePlayAge(assessmentData),
      overallLevel: this._calcOverallPlayLevel(assessmentData),
      strengths: this._identifyStrengths(assessmentData),
      challenges: this._identifyChallenges(assessmentData),
      status: 'completed',
    };
    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  /* ─── الخطة العلاجية ─── */
  async createPlayTherapyPlan(beneficiaryId, assessmentData) {
    const plan = {
      id: `ptp-${Date.now()}`,
      beneficiaryId,
      createdAt: new Date(),
      status: 'active',
      approach: assessmentData.approach || 'directive', // directive / non-directive / integrated
      goals: this._generatePlayGoals(assessmentData),
      // أنشطة مقترحة
      suggestedActivities: this._suggestActivities(assessmentData),
      // جدول العلاج
      schedule: {
        sessionsPerWeek: assessmentData.sessionsPerWeek || 2,
        sessionDuration: assessmentData.sessionDuration || 45,
        totalWeeks: assessmentData.totalWeeks || 12,
        format: assessmentData.format || 'individual', // individual / group / mixed
      },
      // مراحل العلاج
      phases: [
        {
          phase: 1,
          name: 'بناء العلاقة',
          weeks: '1-3',
          focus: 'بناء الثقة والألفة مع المعالج وغرفة اللعب',
        },
        {
          phase: 2,
          name: 'الاستكشاف',
          weeks: '4-6',
          focus: 'استكشاف المشاعر والتجارب من خلال اللعب',
        },
        {
          phase: 3,
          name: 'العمل العلاجي',
          weeks: '7-10',
          focus: 'معالجة المشكلات المحددة وتطوير مهارات التأقلم',
        },
        {
          phase: 4,
          name: 'التعميم والإنهاء',
          weeks: '11-12',
          focus: 'نقل المهارات المكتسبة وإعداد للإنهاء',
        },
      ],
      materialsNeeded: this._recommendMaterials(assessmentData),
      sessionsCompleted: 0,
    };
    this.plans.set(plan.id, plan);
    return plan;
  }

  /* ─── تسجيل جلسة لعب ─── */
  async recordSession(beneficiaryId, sessionData) {
    const session = {
      id: `pts-${Date.now()}`,
      beneficiaryId,
      date: new Date(),
      sessionNumber: sessionData.sessionNumber || 1,
      type: sessionData.type || 'directed', // directed / free / symbolic / group
      duration: sessionData.duration || 45,
      setting: sessionData.setting || 'playroom',
      // أنشطة اللعب
      activities: (sessionData.activities || []).map(a => ({
        name: a.name,
        type: a.type,
        duration: a.duration || 10,
        engagement: a.engagement || 5,
        skillsTargeted: a.skillsTargeted || [],
      })),
      // ملاحظات سلوكية
      observations: {
        moodAtStart: sessionData.moodAtStart || 'neutral',
        moodAtEnd: sessionData.moodAtEnd || 'neutral',
        engagementLevel: sessionData.engagementLevel || 5,
        initiationAttempts: sessionData.initiationAttempts || 0,
        socialInteractions: sessionData.socialInteractions || 0,
        emotionalExpressions: sessionData.emotionalExpressions || [],
        playThemes: sessionData.playThemes || [],
        conflictInstances: sessionData.conflictInstances || 0,
        conflictResolution: sessionData.conflictResolution || 'none',
      },
      // تعبيرات عاطفية
      emotionalContent: {
        dominantEmotion: sessionData.dominantEmotion || 'neutral',
        emotionalRange: sessionData.emotionalRange || 3,
        emotionalRegulation: sessionData.emotionalRegulation || 5,
        copingStrategiesUsed: sessionData.copingStrategies || [],
      },
      // مهارات مُلاحظة
      skillsDemonstrated: {
        creativity: sessionData.creativityScore || null,
        sharing: sessionData.sharingScore || null,
        communication: sessionData.communicationScore || null,
        problemSolving: sessionData.problemSolvingScore || null,
      },
      goalsAddressed: sessionData.goalsAddressed || [],
      parentInvolvement: sessionData.parentInvolvement || false,
      therapistNotes: sessionData.notes || '',
    };

    const key = `${beneficiaryId}_sessions`;
    const sessions = this.sessions.get(key) || [];
    sessions.push(session);
    this.sessions.set(key, sessions);
    return session;
  }

  /* ─── تحديث ملف اللعب ─── */
  async updatePlayProfile(beneficiaryId, profileData) {
    const existing = this.playProfiles.get(beneficiaryId) || { history: [] };
    const profile = {
      beneficiaryId,
      updatedAt: new Date(),
      favoriteGames: profileData.favoriteGames || existing.favoriteGames || [],
      playPeers: profileData.playPeers || existing.playPeers || [],
      homePlayHabits: profileData.homePlayHabits || existing.homePlayHabits || '',
      parentFeedback: profileData.parentFeedback || '',
      history: [...existing.history, { date: new Date(), update: profileData }],
    };
    this.playProfiles.set(beneficiaryId, profile);
    return profile;
  }

  /* ─── تقرير التقدم ─── */
  async getProgressReport(beneficiaryId) {
    const sessions = this.sessions.get(`${beneficiaryId}_sessions`) || [];
    if (sessions.length === 0)
      return { beneficiaryId, totalSessions: 0, message: 'لا توجد جلسات مسجلة' };

    const obs = sessions.map(s => s.observations);
    const emotional = sessions.map(s => s.emotionalContent);
    const recent5 = sessions.slice(-5);

    return {
      beneficiaryId,
      totalSessions: sessions.length,
      totalDuration: sessions.reduce((s, x) => s + x.duration, 0),
      engagement: {
        average: this._avg(obs.map(o => o.engagementLevel)),
        trend: this._calcTrend(obs.map(o => o.engagementLevel)),
      },
      socialDevelopment: {
        avgInitiations: this._avg(obs.map(o => o.initiationAttempts)),
        avgSocialInteractions: this._avg(obs.map(o => o.socialInteractions)),
        conflictRate: this._avg(obs.map(o => o.conflictInstances)),
      },
      emotionalGrowth: {
        regulationTrend: this._calcTrend(emotional.map(e => e.emotionalRegulation)),
        emotionalRangeAvg: this._avg(emotional.map(e => e.emotionalRange)),
        commonEmotions: this._mostCommon(emotional.map(e => e.dominantEmotion)),
      },
      playThemes: this._mostCommon(sessions.flatMap(s => s.observations.playThemes)),
      recentSessions: recent5.map(s => ({
        date: s.date,
        type: s.type,
        engagement: s.observations.engagementLevel,
        mood: `${s.observations.moodAtStart} → ${s.observations.moodAtEnd}`,
      })),
      overallProgress: this._calcProgress(obs.map(o => o.engagementLevel)),
      recommendations: this._generateRecommendations(sessions),
    };
  }

  /* ─── مساعدات داخلية ─── */
  _estimatePlayAge(data) {
    const scores = Object.values(data.playDevelopment || {}).filter(v => typeof v === 'number');
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 5;
    if (avg <= 2) return '0-1 سنة';
    if (avg <= 4) return '1-2 سنة';
    if (avg <= 6) return '2-4 سنوات';
    if (avg <= 8) return '4-6 سنوات';
    return '6+ سنوات';
  }

  _calcOverallPlayLevel(data) {
    const vals = Object.values(data).filter(v => typeof v === 'number' && v >= 0 && v <= 10);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 5;
    if (avg <= 3) return 'below_age';
    if (avg <= 6) return 'developing';
    if (avg <= 8) return 'age_appropriate';
    return 'advanced';
  }

  _identifyStrengths(data) {
    const fields = {
      creativity: 'الإبداع',
      problemSolving: 'حل المشكلات',
      emotionalExpression: 'التعبير العاطفي',
      turnTaking: 'تبادل الأدوار',
      imitation: 'التقليد',
    };
    return Object.entries(fields)
      .filter(([k]) => (data[k] || 0) >= 7)
      .map(([, v]) => v);
  }

  _identifyChallenges(data) {
    const fields = {
      cooperativePlay: 'اللعب التعاوني',
      frustrationTolerance: 'تحمل الإحباط',
      initiation: 'المبادرة',
      symbolicPlay: 'اللعب الرمزي',
      ruleBasedPlay: 'اللعب بقواعد',
    };
    return Object.entries(fields)
      .filter(([k]) => (data[k] || 0) <= 3)
      .map(([, v]) => v);
  }

  _generatePlayGoals(data) {
    const goals = [];
    if ((data.cooperativePlay || 0) < 5)
      goals.push({
        domain: 'social',
        goal: 'المشاركة في لعب تعاوني مع قرين لمدة 10 دقائق',
        target: 10,
      });
    if ((data.emotionalExpression || 0) < 5)
      goals.push({ domain: 'emotional', goal: 'التعبير عن 5 مشاعر مختلفة أثناء اللعب', target: 5 });
    if ((data.symbolicPlay || 0) < 5)
      goals.push({
        domain: 'cognitive',
        goal: 'استخدام اللعب الرمزي في 3 سيناريوهات مختلفة',
        target: 3,
      });
    if ((data.frustrationTolerance || 0) < 5)
      goals.push({ domain: 'regulation', goal: 'استخدام استراتيجية تهدئة عند الإحباط', target: 5 });
    if ((data.turnTaking || 0) < 5)
      goals.push({ domain: 'social', goal: 'تبادل الأدوار في 4 أنشطة مختلفة', target: 4 });
    if (goals.length === 0)
      goals.push({ domain: 'general', goal: 'تعزيز مهارات اللعب العامة والاستمتاع', target: 100 });
    return goals;
  }

  _suggestActivities(data) {
    const activities = [];
    activities.push({
      name: 'لعب الأدوار (بيت، طبيب)',
      type: 'symbolic',
      skills: ['خيال', 'تواصل', 'تعبير عاطفي'],
    });
    activities.push({
      name: 'ألعاب بناء (ليقو، مكعبات)',
      type: 'constructive',
      skills: ['تخطيط', 'حل مشكلات', 'مهارات حركية دقيقة'],
    });
    activities.push({
      name: 'ألعاب حركية (كرة، توازن)',
      type: 'motor',
      skills: ['تنسيق', 'تحمل', 'تعاون'],
    });
    if ((data.cooperativePlay || 0) < 5)
      activities.push({
        name: 'ألعاب لوحية بسيطة',
        type: 'rule-based',
        skills: ['تبادل أدوار', 'صبر', 'قواعد'],
      });
    if ((data.emotionalExpression || 0) < 5)
      activities.push({
        name: 'دمى وعرائس يدوية',
        type: 'projective',
        skills: ['تعبير عاطفي', 'سرد قصص'],
      });
    return activities;
  }

  _recommendMaterials(data) {
    return [
      'صندوق رمل',
      'دمى وعرائس',
      'ألوان وأوراق',
      'مكعبات بناء',
      'ألعاب لوحية',
      'أدوات مطبخ وأطباء ألعاب',
      'كرات بأحجام مختلفة',
      'صلصال',
    ];
  }

  _generateRecommendations(sessions) {
    const recs = [];
    const avgEng = this._avg(sessions.map(s => s.observations.engagementLevel));
    const avgConflict = this._avg(sessions.map(s => s.observations.conflictInstances));
    if (avgEng < 4) recs.push('تنويع الأنشطة وإدراج اهتمامات الطفل المفضلة');
    if (avgConflict > 2) recs.push('إضافة أنشطة لتطوير مهارات حل النزاعات');
    if (sessions.length >= 8 && avgEng > 7) recs.push('بدء الانتقال إلى جلسات جماعية');
    recs.push('إشراك الأسرة في تطبيق أنشطة اللعب المنزلية');
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
  _mostCommon(arr) {
    const counts = {};
    arr.filter(Boolean).forEach(x => {
      counts[x] = (counts[x] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k);
  }
}

module.exports = { PlayTherapyService };
