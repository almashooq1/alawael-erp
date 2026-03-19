/* eslint-disable no-unused-vars */
/**
 * Advanced Psychological Support Service for Disability Rehabilitation
 * خدمة الدعم النفسي المتقدمة لتأهيل ذوي الإعاقة
 *
 * Supports: Counseling, Cognitive Behavioral Therapy, Group Therapy
 */

class AdvancedPsychologicalSupportService {
  constructor() {
    this.assessments = new Map();
    this.sessions = new Map();
    this.progress = new Map();
    this.groupSessions = new Map();
    this.crisisInterventions = new Map();
  }

  // ==========================================
  // التقييم النفسي الشامل
  // ==========================================
  async createPsychologicalAssessment(beneficiaryId, assessmentData) {
    const assessment = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),

      // الحالة النفسية
      mentalState: {
        mood: assessmentData.mood || 'neutral', // stable, anxious, depressed, mixed
        anxietyLevel: assessmentData.anxietyLevel || 0, // 0-10
        depressionLevel: assessmentData.depressionLevel || 0, // 0-10
        stressLevel: assessmentData.stressLevel || 0, // 0-10
        copingAbility: assessmentData.copingAbility || 'moderate',
      },

      // التقييم المعياري
      standardizedAssessments: {
        phq9: assessmentData.phq9 || null, // مقياس الاكتئاب
        gad7: assessmentData.gad7 || null, // مقياس القلق
        whoQol: assessmentData.whoQol || null, // جودة الحياة
        Rosenberg: assessmentData.rosenberg || null, // تقدير الذات
      },

      // الدعم الاجتماعي
      socialSupport: {
        familySupport: assessmentData.familySupport || 'moderate',
        friendsSupport: assessmentData.friendsSupport || 'limited',
        communitySupport: assessmentData.communitySupport || 'limited',
        caregiverBurden: assessmentData.caregiverBurden || 'moderate',
      },

      // التكيف مع الإعاقة
      disabilityAdjustment: {
        acceptanceStage: assessmentData.acceptanceStage || 'processing', // denial, anger, bargaining, depression, acceptance
        adaptationLevel: assessmentData.adaptationLevel || 'moderate',
        resilienceScore: assessmentData.resilienceScore || 50,
      },

      // خطة العلاج
      treatmentPlan: {
        primaryGoals: [],
        secondaryGoals: [],
        recommendedSessions: 0,
        sessionType: 'individual',
        frequency: 'weekly',
      },

      // عوامل الخطر
      riskFactors: {
        suicidalIdeation: assessmentData.suicidalIdeation || false,
        selfHarm: assessmentData.selfHarm || false,
        substanceUse: assessmentData.substanceUse || false,
        violenceRisk: assessmentData.violenceRisk || false,
      },

      status: 'active',
    };

    // توليد خطة العلاج
    assessment.treatmentPlan = this._generateTreatmentPlan(assessment);

    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  // ==========================================
  // توليد خطة العلاج النفسي
  // ==========================================
  _generateTreatmentPlan(assessment) {
    const plan = {
      primaryGoals: [],
      secondaryGoals: [],
      recommendedSessions: 12,
      sessionType: 'individual',
      frequency: 'weekly',
    };

    // أهداف بناءً على التقييم
    if (assessment.mentalState.depressionLevel > 5) {
      plan.primaryGoals.push({
        goal: 'تخفيف أعراض الاكتئاب',
        approach: 'Cognitive Behavioral Therapy',
        target: 'تقليل مستوى الاكتئاب إلى أقل من 3',
      });
    }

    if (assessment.mentalState.anxietyLevel > 5) {
      plan.primaryGoals.push({
        goal: 'إدارة القلق والتوتر',
        approach: 'تقنيات الاسترخاء والتنفس',
        target: 'تقليل مستوى القلق إلى أقل من 3',
      });
    }

    // أهداف التكيف مع الإعاقة
    if (assessment.disabilityAdjustment.acceptanceStage !== 'acceptance') {
      plan.primaryGoals.push({
        goal: 'تعزيز التكيف مع الإعاقة',
        approach: 'العلاج بالقبول والالتزام',
        target: 'الوصول لمرحلة القبول',
      });
    }

    // أهداف ثانوية
    plan.secondaryGoals.push(
      { goal: 'تحسين تقدير الذات', approach: 'العلاج المعرفي' },
      { goal: 'تعزيز الدعم الاجتماعي', approach: 'العلاج الجماعي' },
      { goal: 'تطوير مهارات التأقلم', approach: 'التدريب على المهارات' }
    );

    // تحديد عدد الجلسات
    const severityScore =
      assessment.mentalState.depressionLevel + assessment.mentalState.anxietyLevel;

    if (severityScore > 12) {
      plan.recommendedSessions = 20;
      plan.frequency = 'twice_weekly';
    } else if (severityScore > 8) {
      plan.recommendedSessions = 15;
    }

    return plan;
  }

  // ==========================================
  // تسجيل جلسة علاج نفسي
  // ==========================================
  async recordSession(beneficiaryId, sessionData) {
    const session = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      therapist: sessionData.therapist,
      sessionNumber: sessionData.sessionNumber,
      type: sessionData.type || 'individual', // individual, group, family

      // محتوى الجلسة
      content: {
        topics: sessionData.topics || [],
        techniques: sessionData.techniques || [],
        homework: sessionData.homework || [],
      },

      // تقييم الجلسة
      evaluation: {
        clientEngagement: sessionData.engagement || 'good',
        progress: sessionData.progress || 'moderate',
        breakthroughs: sessionData.breakthroughs || [],
        challenges: sessionData.challenges || [],
      },

      // المقاييس
      measures: {
        moodBefore: sessionData.moodBefore || 5,
        moodAfter: sessionData.moodAfter || 5,
        anxietyBefore: sessionData.anxietyBefore || 5,
        anxietyAfter: sessionData.anxietyAfter || 5,
      },

      // ملاحظات
      notes: sessionData.notes || '',
      nextSessionPlan: sessionData.nextSessionPlan || '',

      status: 'completed',
    };

    this.sessions.set(session.id, session);
    this._updateProgress(beneficiaryId, session);

    return session;
  }

  // ==========================================
  // تحديث التقدم النفسي
  // ==========================================
  _updateProgress(beneficiaryId, session) {
    const progress = this.progress.get(beneficiaryId) || {
      sessions: [],
      moodTrend: [],
      anxietyTrend: [],
      overallProgress: 0,
    };

    progress.sessions.push({
      date: session.date,
      moodChange: session.measures.moodAfter - session.measures.moodBefore,
      anxietyChange: session.measures.anxietyAfter - session.measures.anxietyBefore,
    });

    progress.moodTrend.push(session.measures.moodAfter);
    progress.anxietyTrend.push(session.measures.anxietyAfter);

    // حساب التقدم الإجمالي
    const avgMood =
      progress.moodTrend.slice(-5).reduce((a, b) => a + b, 0) /
      Math.min(5, progress.moodTrend.length);
    const avgAnxiety =
      progress.anxietyTrend.slice(-5).reduce((a, b) => a + b, 0) /
      Math.min(5, progress.anxietyTrend.length);
    progress.overallProgress = Math.round(((avgMood + (10 - avgAnxiety)) / 20) * 100);

    this.progress.set(beneficiaryId, progress);
  }

  // ==========================================
  // إنشاء جلسة جماعية
  // ==========================================
  async createGroupSession(groupData) {
    const groupSession = {
      id: Date.now().toString(),
      name: groupData.name,
      type: groupData.type, // support, therapy, skills
      description: groupData.description,

      participants: [],
      maxParticipants: groupData.maxParticipants || 10,

      schedule: {
        day: groupData.day,
        time: groupData.time,
        frequency: groupData.frequency || 'weekly',
      },

      facilitator: groupData.facilitator,

      topics: groupData.topics || [],
      goals: groupData.goals || [],

      status: 'active',
      startDate: new Date(),
      totalSessions: 0,
    };

    this.groupSessions.set(groupSession.id, groupSession);
    return groupSession;
  }

  // ==========================================
  // التدخل في الأزمات
  // ==========================================
  async handleCrisisIntervention(beneficiaryId, crisisData) {
    const intervention = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),

      type: crisisData.type, // suicidal, self_harm, acute_anxiety, breakdown
      severity: crisisData.severity, // low, medium, high, critical

      description: crisisData.description,
      triggers: crisisData.triggers || [],

      response: {
        immediateActions: [],
        referrals: [],
        followUpPlan: null,
      },

      outcome: 'pending',
      followUpDate: null,

      involvedProfessionals: crisisData.involvedProfessionals || [],
    };

    // تحديد الاستجابة المناسبة
    switch (intervention.severity) {
      case 'critical':
        intervention.response.immediateActions.push('نقل لحالة الطوارئ');
        intervention.response.immediateActions.push('إبلاغ الأسرة');
        intervention.response.referrals.push('طبيب نفسي');
        intervention.followUpDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ساعة
        break;
      case 'high':
        intervention.response.immediateActions.push('جلسة طارئة');
        intervention.response.immediateActions.push('تقييم خطر');
        intervention.followUpDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 ساعة
        break;
      case 'medium':
        intervention.response.immediateActions.push('دعم عاطفي فوري');
        intervention.response.immediateActions.push('تقنيات تهدئة');
        intervention.followUpDate = new Date(Date.now() + 72 * 60 * 60 * 1000); // 3 أيام
        break;
      default:
        intervention.response.immediateActions.push('تقييم الوضع');
        intervention.followUpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // أسبوع
    }

    this.crisisInterventions.set(intervention.id, intervention);
    return intervention;
  }

  // ==========================================
  // تقرير التقدم النفسي
  // ==========================================
  async getPsychologicalProgressReport(beneficiaryId) {
    const progress = this.progress.get(beneficiaryId);
    const assessment = Array.from(this.assessments.values()).find(
      a => a.beneficiaryId === beneficiaryId && a.status === 'active'
    );

    if (!progress) {
      return {
        beneficiaryId,
        message: 'لا توجد بيانات تقدم متاحة',
      };
    }

    return {
      beneficiaryId,
      totalSessions: progress.sessions.length,
      overallProgress: progress.overallProgress,

      moodAnalysis: {
        current: progress.moodTrend[progress.moodTrend.length - 1] || 0,
        average: Math.round(
          progress.moodTrend.reduce((a, b) => a + b, 0) / progress.moodTrend.length
        ),
        trend: this._calculateTrend(progress.moodTrend),
      },

      anxietyAnalysis: {
        current: progress.anxietyTrend[progress.anxietyTrend.length - 1] || 0,
        average: Math.round(
          progress.anxietyTrend.reduce((a, b) => a + b, 0) / progress.anxietyTrend.length
        ),
        trend: this._calculateTrend(progress.anxietyTrend, true), // lower is better
      },

      goalsProgress:
        assessment?.treatmentPlan?.primaryGoals?.map(g => ({
          goal: g.goal,
          status: 'in_progress',
          notes: 'يحتاج متابعة',
        })) || [],

      recommendations: this._generateProgressRecommendations(progress, assessment),
    };
  }

  // ==========================================
  // حساب الاتجاه
  // ==========================================
  _calculateTrend(data, lowerIsBetter = false) {
    if (data.length < 3) return 'insufficient_data';

    const recent = data.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const earlier =
      data.slice(-6, -3).reduce((a, b) => a + b, 0) / Math.max(1, data.slice(-6, -3).length);

    if (lowerIsBetter) {
      if (recent < earlier - 0.5) return 'improving';
      if (recent > earlier + 0.5) return 'worsening';
    } else {
      if (recent > earlier + 0.5) return 'improving';
      if (recent < earlier - 0.5) return 'worsening';
    }

    return 'stable';
  }

  // ==========================================
  // توصيات التقدم
  // ==========================================
  _generateProgressRecommendations(progress, assessment) {
    const recommendations = [];

    if (progress.overallProgress >= 70) {
      recommendations.push('الاستعداد لإنهاء العلاج تدريجياً');
      recommendations.push('وضع خطة للوقاية من الانتكاس');
    } else if (progress.overallProgress >= 40) {
      recommendations.push('الاستمرار في العلاج الحالي');
      recommendations.push('إضافة تمارين منزلية');
    } else {
      recommendations.push('مراجعة خطة العلاج');
      recommendations.push('النظر في العلاج الجماعي');
      recommendations.push('استشارة طبيب نفسي');
    }

    return recommendations;
  }
}

module.exports = { AdvancedPsychologicalSupportService };
