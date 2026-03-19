/* eslint-disable no-unused-vars */
/**
 * Art Therapy Service for Disability Rehabilitation
 * خدمة العلاج بالفنون لتأهيل ذوي الإعاقة
 *
 * يشمل العلاج بالرسم، النحت، الأشغال اليدوية، والتعبير الفني
 * لتحسين الصحة النفسية والمهارات الحركية الدقيقة
 */

class ArtTherapyService {
  constructor() {
    this.sessions = new Map();
    this.plans = new Map();
    this.assessments = new Map();
    this.artworks = new Map();
    this.progressReports = new Map();
  }

  /**
   * تقييم القدرات الفنية والتعبيرية
   */
  async assessArtisticAbilities(beneficiaryId, assessmentData = {}) {
    const assessment = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      assessorId: assessmentData.assessorId || 'system',

      // تقييم المهارات الحركية الدقيقة
      fineMotorSkills: {
        gripStrength: assessmentData.gripStrength || 0,
        pencilControl: assessmentData.pencilControl || 0,
        scissorUse: assessmentData.scissorUse || 0,
        brushControl: assessmentData.brushControl || 0,
        clayManipulation: assessmentData.clayManipulation || 0,
        overallScore: 0,
      },

      // تقييم التعبير الإبداعي
      creativeExpression: {
        colorChoice: assessmentData.colorChoice || 0,
        formRecognition: assessmentData.formRecognition || 0,
        selfExpression: assessmentData.selfExpression || 0,
        emotionalAwareness: assessmentData.emotionalAwareness || 0,
        imagination: assessmentData.imagination || 0,
        overallScore: 0,
      },

      // تقييم التفاعل الاجتماعي خلال الفن
      socialInteraction: {
        groupParticipation: assessmentData.groupParticipation || 0,
        sharing: assessmentData.sharing || 0,
        cooperation: assessmentData.cooperation || 0,
        communication: assessmentData.communication || 0,
        overallScore: 0,
      },

      // تقييم الحالة النفسية من خلال الفن
      psychologicalState: {
        anxietyLevel: assessmentData.anxietyLevel || 'moderate',
        moodExpression: assessmentData.moodExpression || 'neutral',
        selfEsteem: assessmentData.selfEsteem || 0,
        stressRelief: assessmentData.stressRelief || 0,
        overallScore: 0,
      },

      status: 'completed',
    };

    // حساب الدرجات الإجمالية
    assessment.fineMotorSkills.overallScore = this._calculateAverage([
      assessment.fineMotorSkills.gripStrength,
      assessment.fineMotorSkills.pencilControl,
      assessment.fineMotorSkills.scissorUse,
      assessment.fineMotorSkills.brushControl,
      assessment.fineMotorSkills.clayManipulation,
    ]);

    assessment.creativeExpression.overallScore = this._calculateAverage([
      assessment.creativeExpression.colorChoice,
      assessment.creativeExpression.formRecognition,
      assessment.creativeExpression.selfExpression,
      assessment.creativeExpression.emotionalAwareness,
      assessment.creativeExpression.imagination,
    ]);

    assessment.socialInteraction.overallScore = this._calculateAverage([
      assessment.socialInteraction.groupParticipation,
      assessment.socialInteraction.sharing,
      assessment.socialInteraction.cooperation,
      assessment.socialInteraction.communication,
    ]);

    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  /**
   * إنشاء خطة علاج بالفنون
   */
  async createArtTherapyPlan(beneficiaryId, assessmentData = {}) {
    const plan = {
      id: Date.now().toString(),
      beneficiaryId,
      createdAt: new Date(),
      status: 'active',

      // أهداف الخطة
      goals: assessmentData.goals || [
        {
          category: 'motor',
          description: 'تحسين المهارات الحركية الدقيقة',
          target: 80,
          current: 0,
        },
        { category: 'expression', description: 'تعزيز التعبير الإبداعي', target: 75, current: 0 },
        { category: 'social', description: 'تحسين التفاعل الاجتماعي', target: 70, current: 0 },
        { category: 'emotional', description: 'تحسين التنظيم العاطفي', target: 75, current: 0 },
      ],

      // أنشطة فنية مقترحة
      activities: this._recommendArtActivities(assessmentData.disabilityType),

      // جدول الجلسات
      schedule: {
        frequency: assessmentData.frequency || 'مرتين أسبوعياً',
        duration: assessmentData.sessionDuration || '45 دقيقة',
        totalWeeks: assessmentData.totalWeeks || 12,
        preferredDays: assessmentData.preferredDays || ['الأحد', 'الأربعاء'],
      },

      // المواد المطلوبة
      materials: this._recommendMaterials(assessmentData.disabilityType),

      // ملاحظات
      notes: assessmentData.notes || '',
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  /**
   * تسجيل جلسة علاج بالفنون
   */
  async recordSession(beneficiaryId, sessionData = {}) {
    const session = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      therapistId: sessionData.therapistId,
      duration: sessionData.duration || 45,

      // نوع النشاط الفني
      activityType: sessionData.activityType || 'drawing',
      activityName: sessionData.activityName || 'رسم حر',

      // تقييم الجلسة
      evaluation: {
        engagement: sessionData.engagement || 0,
        creativity: sessionData.creativity || 0,
        motorProgress: sessionData.motorProgress || 0,
        emotionalExpression: sessionData.emotionalExpression || 0,
        socialParticipation: sessionData.socialParticipation || 0,
      },

      // المزاج قبل وبعد الجلسة
      moodBefore: sessionData.moodBefore || 'neutral',
      moodAfter: sessionData.moodAfter || 'neutral',

      // الأعمال الفنية المنجزة
      artworkProduced: sessionData.artworkProduced || null,

      // ملاحظات المعالج
      therapistNotes: sessionData.therapistNotes || '',

      // التوصيات للجلسة القادمة
      nextSessionRecommendations: sessionData.nextSessionRecommendations || '',
    };

    this.sessions.set(session.id, session);
    this._updateProgress(beneficiaryId, session);
    return session;
  }

  /**
   * تسجيل عمل فني
   */
  async recordArtwork(beneficiaryId, artworkData = {}) {
    const artwork = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      sessionId: artworkData.sessionId,

      title: artworkData.title || 'عمل فني',
      type: artworkData.type || 'drawing',
      medium: artworkData.medium || 'أقلام ملونة',
      description: artworkData.description || '',

      // تحليل العمل الفني
      analysis: {
        colors: artworkData.colorsUsed || [],
        themes: artworkData.themes || [],
        emotionalContent: artworkData.emotionalContent || 'neutral',
        developmentalLevel: artworkData.developmentalLevel || 'age-appropriate',
        symbolism: artworkData.symbolism || '',
      },

      // التقييم الفني
      artisticAssessment: {
        composition: artworkData.composition || 0,
        colorUse: artworkData.colorUse || 0,
        detail: artworkData.detail || 0,
        originality: artworkData.originality || 0,
      },

      imageUrl: artworkData.imageUrl || null,
    };

    this.artworks.set(artwork.id, artwork);
    return artwork;
  }

  /**
   * الحصول على تقرير التقدم
   */
  async getProgressReport(beneficiaryId) {
    const sessions = Array.from(this.sessions.values()).filter(
      s => s.beneficiaryId === beneficiaryId
    );
    const artworks = Array.from(this.artworks.values()).filter(
      a => a.beneficiaryId === beneficiaryId
    );

    const report = {
      beneficiaryId,
      reportDate: new Date(),
      totalSessions: sessions.length,
      totalArtworks: artworks.length,

      // تقدم المهارات
      skillProgress: {
        fineMotor: this._calculateSkillProgress(sessions, 'motorProgress'),
        creativity: this._calculateSkillProgress(sessions, 'creativity'),
        emotional: this._calculateSkillProgress(sessions, 'emotionalExpression'),
        social: this._calculateSkillProgress(sessions, 'socialParticipation'),
        engagement: this._calculateSkillProgress(sessions, 'engagement'),
      },

      // تحليل المزاج
      moodAnalysis: this._analyzeMoodTrend(sessions),

      // الأنشطة المفضلة
      preferredActivities: this._getPreferredActivities(sessions),

      // التوصيات
      recommendations: this._generateRecommendations(sessions),

      overallProgress: 0,
    };

    const scores = Object.values(report.skillProgress).map(s => s.average || 0);
    report.overallProgress =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return report;
  }

  // ==================== أساليب مساعدة ====================

  _recommendArtActivities(disabilityType) {
    const activities = {
      motor: [
        { name: 'الرسم بالأصابع', difficulty: 'easy', benefits: ['حركية دقيقة', 'تعبير حسي'] },
        { name: 'تشكيل الصلصال', difficulty: 'easy', benefits: ['قوة القبضة', 'تناسق حركي'] },
        { name: 'القص واللصق', difficulty: 'medium', benefits: ['تناسق يد-عين', 'تخطيط'] },
        { name: 'الرسم بالفرشاة', difficulty: 'medium', benefits: ['تحكم حركي', 'إبداع'] },
      ],
      cognitive: [
        { name: 'رسم الأنماط', difficulty: 'medium', benefits: ['تركيز', 'تسلسل'] },
        { name: 'الفن التجميعي', difficulty: 'easy', benefits: ['حل مشكلات', 'تخطيط'] },
        { name: 'التلوين المنظم', difficulty: 'easy', benefits: ['انتباه', 'اتباع تعليمات'] },
        { name: 'فن الماندالا', difficulty: 'medium', benefits: ['تركيز', 'استرخاء'] },
      ],
      emotional: [
        { name: 'الرسم الحر التعبيري', difficulty: 'easy', benefits: ['تعبير عاطفي', 'تنفيس'] },
        { name: 'صنع الأقنعة', difficulty: 'medium', benefits: ['استكشاف الذات', 'هوية'] },
        { name: 'يوميات فنية', difficulty: 'easy', benefits: ['تأمل', 'وعي ذاتي'] },
        { name: 'الرسم الجماعي', difficulty: 'medium', benefits: ['تواصل', 'تعاون'] },
      ],
      sensory: [
        { name: 'اللعب بالرمل الملون', difficulty: 'easy', benefits: ['تحفيز حسي', 'استرخاء'] },
        { name: 'الطباعة بالإسفنج', difficulty: 'easy', benefits: ['تجربة حسية', 'إبداع'] },
        { name: 'النسيج', difficulty: 'medium', benefits: ['تناسق حسي-حركي', 'صبر'] },
        { name: 'الفسيفساء', difficulty: 'hard', benefits: ['دقة', 'تركيز'] },
      ],
    };
    return activities[disabilityType] || activities['emotional'];
  }

  _recommendMaterials(disabilityType) {
    const baseMaterials = [
      'أوراق رسم متنوعة الأحجام',
      'أقلام ملونة وأقلام شمعية',
      'ألوان مائية وفرش',
      'صلصال وعجينة',
      'مقصات آمنة',
      'لاصق وشرائط',
    ];

    const specialMaterials = {
      motor: ['أقلام سميكة سهلة المسك', 'فرش بمقابض عريضة', 'إسفنج للطباعة'],
      cognitive: ['قوالب ونماذج', 'كتب تلوين مرقمة', 'أنماط للتتبع'],
      emotional: ['ألوان زاهية متنوعة', 'مواد طبيعية', 'مجلات للقص'],
      sensory: ['رمل ملون', 'خامات متنوعة الملمس', 'عجينة حسية'],
    };

    return [...baseMaterials, ...(specialMaterials[disabilityType] || [])];
  }

  _calculateAverage(scores) {
    const valid = scores.filter(s => s > 0);
    return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
  }

  _calculateSkillProgress(sessions, field) {
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

  _analyzeMoodTrend(sessions) {
    const moodMap = { very_negative: 1, negative: 2, neutral: 3, positive: 4, very_positive: 5 };
    const beforeScores = sessions.map(s => moodMap[s.moodBefore] || 3);
    const afterScores = sessions.map(s => moodMap[s.moodAfter] || 3);

    return {
      averageMoodBefore:
        beforeScores.length > 0
          ? (beforeScores.reduce((a, b) => a + b, 0) / beforeScores.length).toFixed(1)
          : 0,
      averageMoodAfter:
        afterScores.length > 0
          ? (afterScores.reduce((a, b) => a + b, 0) / afterScores.length).toFixed(1)
          : 0,
      moodImprovement:
        afterScores.length > 0 && beforeScores.length > 0
          ? (
              afterScores.reduce((a, b) => a + b, 0) / afterScores.length -
              beforeScores.reduce((a, b) => a + b, 0) / beforeScores.length
            ).toFixed(1)
          : 0,
    };
  }

  _getPreferredActivities(sessions) {
    const activityCount = {};
    sessions.forEach(s => {
      activityCount[s.activityType] = (activityCount[s.activityType] || 0) + 1;
    });
    return Object.entries(activityCount)
      .sort((a, b) => b[1] - a[1])
      .map(([activity, count]) => ({ activity, count }));
  }

  _generateRecommendations(sessions) {
    const recommendations = [];
    if (sessions.length === 0) {
      recommendations.push('البدء بجلسات استكشافية لتحديد الأنشطة المفضلة');
      return recommendations;
    }

    const avgEngagement = this._calculateSkillProgress(sessions, 'engagement').average;
    if (avgEngagement < 50) recommendations.push('زيادة التنوع في الأنشطة لتحسين المشاركة');
    if (avgEngagement >= 70) recommendations.push('تقديم أنشطة أكثر تحدياً للحفاظ على الدافعية');

    const avgMotor = this._calculateSkillProgress(sessions, 'motorProgress').average;
    if (avgMotor < 50) recommendations.push('التركيز على أنشطة تقوية المهارات الحركية الدقيقة');

    const avgSocial = this._calculateSkillProgress(sessions, 'socialParticipation').average;
    if (avgSocial < 50) recommendations.push('إضافة أنشطة فنية جماعية لتعزيز التفاعل الاجتماعي');

    return recommendations;
  }

  _updateProgress(beneficiaryId, session) {
    const current = this.progressReports.get(beneficiaryId) || { sessions: [], lastUpdated: null };
    current.sessions.push(session.id);
    current.lastUpdated = new Date();
    this.progressReports.set(beneficiaryId, current);
  }
}

module.exports = { ArtTherapyService };
