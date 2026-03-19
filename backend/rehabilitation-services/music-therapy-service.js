/* eslint-disable no-unused-vars */
/**
 * Music Therapy Service for Disability Rehabilitation
 * خدمة العلاج بالموسيقى لتأهيل ذوي الإعاقة
 *
 * يشمل العلاج بالإيقاع، الغناء، العزف، والاستماع النشط
 * لتحسين التواصل والمهارات الحركية والحالة النفسية
 */

class MusicTherapyService {
  constructor() {
    this.sessions = new Map();
    this.plans = new Map();
    this.assessments = new Map();
    this.progressReports = new Map();
  }

  /**
   * تقييم القدرات الموسيقية والاستجابة
   */
  async assessMusicalResponse(beneficiaryId, assessmentData = {}) {
    const assessment = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      assessorId: assessmentData.assessorId || 'system',

      // الاستجابة الإيقاعية
      rhythmicResponse: {
        beatTracking: assessmentData.beatTracking || 0,
        rhythmImitation: assessmentData.rhythmImitation || 0,
        tempoAwareness: assessmentData.tempoAwareness || 0,
        bodyMovement: assessmentData.bodyMovement || 0,
        overallScore: 0,
      },

      // الاستجابة اللحنية
      melodicResponse: {
        pitchDiscrimination: assessmentData.pitchDiscrimination || 0,
        melodicContour: assessmentData.melodicContour || 0,
        vocalResponse: assessmentData.vocalResponse || 0,
        songRecognition: assessmentData.songRecognition || 0,
        overallScore: 0,
      },

      // التعبير الموسيقي
      musicalExpression: {
        emotionalResponse: assessmentData.emotionalResponse || 0,
        instrumentExploration: assessmentData.instrumentExploration || 0,
        creativePlay: assessmentData.creativePlay || 0,
        musicalPreferences: assessmentData.musicalPreferences || [],
        overallScore: 0,
      },

      // التفاعل الاجتماعي-الموسيقي
      socialMusicalInteraction: {
        turnTaking: assessmentData.turnTaking || 0,
        groupSinging: assessmentData.groupSinging || 0,
        musicalConversation: assessmentData.musicalConversation || 0,
        sharedAttention: assessmentData.sharedAttention || 0,
        overallScore: 0,
      },

      // المهارات الحركية الموسيقية
      motorMusicalSkills: {
        instrumentHandling: assessmentData.instrumentHandling || 0,
        fingerDexterity: assessmentData.fingerDexterity || 0,
        coordinatedMovement: assessmentData.coordinatedMovement || 0,
        crossBodyMovement: assessmentData.crossBodyMovement || 0,
        overallScore: 0,
      },

      status: 'completed',
    };

    // حساب الدرجات
    assessment.rhythmicResponse.overallScore = this._avg([
      assessment.rhythmicResponse.beatTracking,
      assessment.rhythmicResponse.rhythmImitation,
      assessment.rhythmicResponse.tempoAwareness,
      assessment.rhythmicResponse.bodyMovement,
    ]);

    assessment.melodicResponse.overallScore = this._avg([
      assessment.melodicResponse.pitchDiscrimination,
      assessment.melodicResponse.melodicContour,
      assessment.melodicResponse.vocalResponse,
      assessment.melodicResponse.songRecognition,
    ]);

    assessment.musicalExpression.overallScore = this._avg([
      assessment.musicalExpression.emotionalResponse,
      assessment.musicalExpression.instrumentExploration,
      assessment.musicalExpression.creativePlay,
    ]);

    assessment.socialMusicalInteraction.overallScore = this._avg([
      assessment.socialMusicalInteraction.turnTaking,
      assessment.socialMusicalInteraction.groupSinging,
      assessment.socialMusicalInteraction.musicalConversation,
      assessment.socialMusicalInteraction.sharedAttention,
    ]);

    assessment.motorMusicalSkills.overallScore = this._avg([
      assessment.motorMusicalSkills.instrumentHandling,
      assessment.motorMusicalSkills.fingerDexterity,
      assessment.motorMusicalSkills.coordinatedMovement,
      assessment.motorMusicalSkills.crossBodyMovement,
    ]);

    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  /**
   * إنشاء خطة علاج بالموسيقى
   */
  async createMusicTherapyPlan(beneficiaryId, assessmentData = {}) {
    const plan = {
      id: Date.now().toString(),
      beneficiaryId,
      createdAt: new Date(),
      status: 'active',

      goals: assessmentData.goals || [
        {
          category: 'communication',
          description: 'تحسين مهارات التواصل اللفظي وغير اللفظي',
          target: 80,
          current: 0,
        },
        {
          category: 'motor',
          description: 'تحسين التناسق الحركي والإيقاعي',
          target: 75,
          current: 0,
        },
        {
          category: 'social',
          description: 'تعزيز التفاعل الاجتماعي والمشاركة',
          target: 70,
          current: 0,
        },
        {
          category: 'emotional',
          description: 'تحسين التنظيم العاطفي والتعبير',
          target: 75,
          current: 0,
        },
        { category: 'cognitive', description: 'تعزيز الانتباه والذاكرة', target: 70, current: 0 },
      ],

      // أنشطة موسيقية مقترحة
      activities: this._recommendActivities(assessmentData.disabilityType),

      // الآلات الموسيقية المقترحة
      instruments: this._recommendInstruments(assessmentData.disabilityType),

      schedule: {
        frequency: assessmentData.frequency || 'مرتين أسبوعياً',
        duration: assessmentData.sessionDuration || '30 دقيقة',
        totalWeeks: assessmentData.totalWeeks || 12,
      },

      notes: assessmentData.notes || '',
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  /**
   * تسجيل جلسة علاج بالموسيقى
   */
  async recordSession(beneficiaryId, sessionData = {}) {
    const session = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      therapistId: sessionData.therapistId,
      duration: sessionData.duration || 30,

      // نوع النشاط الموسيقي
      activityType: sessionData.activityType || 'listening',
      activityName: sessionData.activityName || 'استماع نشط',

      // الآلات المستخدمة
      instrumentsUsed: sessionData.instrumentsUsed || [],

      // الأغاني/المقطوعات المستخدمة
      musicPieces: sessionData.musicPieces || [],

      // تقييم الجلسة
      evaluation: {
        rhythmicEngagement: sessionData.rhythmicEngagement || 0,
        vocalParticipation: sessionData.vocalParticipation || 0,
        motorCoordination: sessionData.motorCoordination || 0,
        emotionalResponse: sessionData.emotionalResponse || 0,
        socialInteraction: sessionData.socialInteraction || 0,
        attention: sessionData.attention || 0,
      },

      // المزاج
      moodBefore: sessionData.moodBefore || 'neutral',
      moodAfter: sessionData.moodAfter || 'neutral',

      // ملاحظات المعالج
      therapistNotes: sessionData.therapistNotes || '',
      nextSessionPlan: sessionData.nextSessionPlan || '',
    };

    this.sessions.set(session.id, session);
    this._updateProgress(beneficiaryId, session);
    return session;
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

      skillProgress: {
        rhythm: this._calcProgress(sessions, 'rhythmicEngagement'),
        vocal: this._calcProgress(sessions, 'vocalParticipation'),
        motor: this._calcProgress(sessions, 'motorCoordination'),
        emotional: this._calcProgress(sessions, 'emotionalResponse'),
        social: this._calcProgress(sessions, 'socialInteraction'),
        attention: this._calcProgress(sessions, 'attention'),
      },

      moodAnalysis: this._analyzeMoods(sessions),
      preferredInstruments: this._getPreferredInstruments(sessions),
      recommendations: this._generateRecommendations(sessions),
      overallProgress: 0,
    };

    const scores = Object.values(report.skillProgress).map(s => s.average || 0);
    report.overallProgress =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return report;
  }

  // ==================== أساليب مساعدة ====================

  _recommendActivities(disabilityType) {
    const activities = {
      motor: [
        { name: 'العزف على الطبل', difficulty: 'easy', benefits: ['تناسق حركي', 'قوة'] },
        { name: 'الحركة الإيقاعية', difficulty: 'easy', benefits: ['توازن', 'تناسق'] },
        { name: 'العزف على الأجراس', difficulty: 'medium', benefits: ['دقة حركية', 'انتباه'] },
      ],
      communication: [
        { name: 'الغناء الجماعي', difficulty: 'easy', benefits: ['نطق', 'تواصل'] },
        { name: 'الحوار الموسيقي', difficulty: 'medium', benefits: ['تبادل أدوار', 'استماع'] },
        { name: 'قصص موسيقية', difficulty: 'medium', benefits: ['سرد', 'تعبير'] },
      ],
      cognitive: [
        { name: 'تعلم أغاني جديدة', difficulty: 'medium', benefits: ['ذاكرة', 'تسلسل'] },
        { name: 'تمييز الأصوات', difficulty: 'easy', benefits: ['انتباه', 'تمييز'] },
        { name: 'إكمال الأنماط الإيقاعية', difficulty: 'hard', benefits: ['تفكير', 'توقع'] },
      ],
      emotional: [
        { name: 'الاستماع التأملي', difficulty: 'easy', benefits: ['استرخاء', 'وعي'] },
        { name: 'التعبير الموسيقي الحر', difficulty: 'easy', benefits: ['تنفيس', 'تعبير'] },
        { name: 'كتابة أغاني', difficulty: 'hard', benefits: ['إبداع', 'هوية'] },
      ],
    };
    return activities[disabilityType] || activities['emotional'];
  }

  _recommendInstruments(disabilityType) {
    const instruments = {
      motor: ['طبل كبير', 'ماراكاس', 'دف', 'أجراس يدوية'],
      communication: ['ميكروفون', 'كازو', 'هارمونيكا', 'عود صغير'],
      cognitive: ['بيانو صغير', 'إكسيلوفون', 'أجراس لونية', 'ميتالوفون'],
      sensory: ['أجراس الرياح', 'طبل المطر', 'كاليمبا', 'أعواد إيقاعية'],
    };
    return instruments[disabilityType] || instruments['sensory'];
  }

  _avg(values) {
    const valid = values.filter(v => v > 0);
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

  _analyzeMoods(sessions) {
    const moodMap = { very_negative: 1, negative: 2, neutral: 3, positive: 4, very_positive: 5 };
    const before = sessions.map(s => moodMap[s.moodBefore] || 3);
    const after = sessions.map(s => moodMap[s.moodAfter] || 3);
    const avgB = before.length > 0 ? before.reduce((a, b) => a + b, 0) / before.length : 0;
    const avgA = after.length > 0 ? after.reduce((a, b) => a + b, 0) / after.length : 0;
    return {
      averageBefore: +avgB.toFixed(1),
      averageAfter: +avgA.toFixed(1),
      improvement: +(avgA - avgB).toFixed(1),
    };
  }

  _getPreferredInstruments(sessions) {
    const counts = {};
    sessions.forEach(s =>
      (s.instrumentsUsed || []).forEach(i => {
        counts[i] = (counts[i] || 0) + 1;
      })
    );
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }

  _generateRecommendations(sessions) {
    if (sessions.length === 0) return ['البدء بجلسات استكشافية لتحديد التفضيلات الموسيقية'];
    const recommendations = [];
    const avgRhythm = this._calcProgress(sessions, 'rhythmicEngagement').average;
    if (avgRhythm < 50) recommendations.push('التركيز على أنشطة إيقاعية بسيطة لبناء الأساس');
    const avgVocal = this._calcProgress(sessions, 'vocalParticipation').average;
    if (avgVocal < 50) recommendations.push('استخدام أغاني مألوفة لتشجيع المشاركة الصوتية');
    const avgSocial = this._calcProgress(sessions, 'socialInteraction').average;
    if (avgSocial >= 60) recommendations.push('إدراج أنشطة موسيقية جماعية لتعزيز التفاعل');
    return recommendations.length > 0
      ? recommendations
      : ['الاستمرار في البرنامج الحالي مع زيادة التحدي تدريجياً'];
  }

  _updateProgress(beneficiaryId, session) {
    const current = this.progressReports.get(beneficiaryId) || { sessions: [], lastUpdated: null };
    current.sessions.push(session.id);
    current.lastUpdated = new Date();
    this.progressReports.set(beneficiaryId, current);
  }
}

module.exports = { MusicTherapyService };
