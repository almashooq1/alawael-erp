/* eslint-disable no-unused-vars */
/**
 * Animal-Assisted Therapy Service
 * خدمة العلاج بمساعدة الحيوانات لذوي الإعاقة
 *
 * يشمل العلاج بالخيول (Hippotherapy)، العلاج بالكلاب،
 * والعلاج بالأسماك والحيوانات الأليفة
 * لتحسين المهارات الحركية والاجتماعية والنفسية
 */

class AnimalAssistedTherapyService {
  constructor() {
    this.sessions = new Map();
    this.plans = new Map();
    this.assessments = new Map();
    this.animalRecords = new Map();
    this.progressReports = new Map();
  }

  /**
   * تقييم الجاهزية للعلاج بالحيوانات
   */
  async assessReadiness(beneficiaryId, assessmentData = {}) {
    const assessment = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      assessorId: assessmentData.assessorId || 'system',

      // الفحص الطبي
      medicalScreening: {
        allergies: assessmentData.allergies || [],
        hasAnimalAllergy: assessmentData.animalAllergy || false,
        immunocompromised: assessmentData.immunocompromised || false,
        openWounds: assessmentData.openWounds || false,
        medicalClearance: assessmentData.medicalClearance || false,
        physicianName: assessmentData.physician || '',
      },

      // الجاهزية النفسية
      psychologicalReadiness: {
        animalFear: assessmentData.animalFear || 0,
        animalInterest: assessmentData.animalInterest || 0,
        previousAnimalExperience: assessmentData.previousExperience || 'none',
        emotionalStability: assessmentData.emotionalStability || 0,
        impulseControl: assessmentData.impulseControl || 0,
        overallScore: 0,
      },

      // المهارات الحركية الأساسية
      motorBaseline: {
        balance: assessmentData.balance || 0,
        posture: assessmentData.posture || 0,
        coreStrength: assessmentData.coreStrength || 0,
        upperBodyStrength: assessmentData.upperBodyStrength || 0,
        coordination: assessmentData.coordination || 0,
        overallScore: 0,
      },

      // المهارات الاجتماعية الأساسية
      socialBaseline: {
        eyeContact: assessmentData.eyeContact || 0,
        followingInstructions: assessmentData.followingInstructions || 0,
        communication: assessmentData.communication || 0,
        empathy: assessmentData.empathy || 0,
        overallScore: 0,
      },

      // نوع العلاج المقترح
      recommendedTherapyType: assessmentData.recommendedType || 'equine',

      // التوصيات
      recommendations: assessmentData.recommendations || [],
      status: 'completed',
    };

    // حساب الدرجات
    assessment.psychologicalReadiness.overallScore = this._avg([
      10 - (assessment.psychologicalReadiness.animalFear || 0),
      assessment.psychologicalReadiness.animalInterest,
      assessment.psychologicalReadiness.emotionalStability,
      assessment.psychologicalReadiness.impulseControl,
    ]);

    assessment.motorBaseline.overallScore = this._avg([
      assessment.motorBaseline.balance,
      assessment.motorBaseline.posture,
      assessment.motorBaseline.coreStrength,
      assessment.motorBaseline.upperBodyStrength,
      assessment.motorBaseline.coordination,
    ]);

    assessment.socialBaseline.overallScore = this._avg([
      assessment.socialBaseline.eyeContact,
      assessment.socialBaseline.followingInstructions,
      assessment.socialBaseline.communication,
      assessment.socialBaseline.empathy,
    ]);

    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  /**
   * إنشاء خطة علاج بالحيوانات
   */
  async createAnimalTherapyPlan(beneficiaryId, assessmentData = {}) {
    const therapyType = assessmentData.therapyType || 'equine';

    const plan = {
      id: Date.now().toString(),
      beneficiaryId,
      createdAt: new Date(),
      status: 'active',
      therapyType,

      goals: assessmentData.goals || this._getDefaultGoals(therapyType),

      // أنشطة العلاج
      activities: this._recommendActivities(therapyType),

      // الحيوان العلاجي المعين
      therapyAnimal: {
        type: therapyType === 'equine' ? 'حصان' : therapyType === 'canine' ? 'كلب' : 'متنوع',
        name: assessmentData.animalName || '',
        temperament: assessmentData.animalTemperament || 'هادئ ومدرب',
        certifications: assessmentData.animalCerts || [],
      },

      // إجراءات السلامة
      safetyProtocol: {
        personalProtectiveEquipment: this._getSafetyEquipment(therapyType),
        emergencyProcedures: [
          'وجود معالج مؤهل في جميع الأوقات',
          'وجود خطة إخلاء طوارئ',
          'فحص الحيوان قبل كل جلسة',
          'عدم ترك المستفيد وحده مع الحيوان',
        ],
        contraindications: [
          'حساسية شديدة من الحيوانات',
          'خوف شديد غير قابل للعلاج',
          'سلوك عنيف تجاه الحيوانات',
          'حالة صحية تمنع التعامل مع الحيوانات',
        ],
      },

      schedule: {
        frequency: assessmentData.frequency || 'مرة أسبوعياً',
        duration:
          assessmentData.sessionDuration || therapyType === 'equine' ? '45 دقيقة' : '30 دقيقة',
        totalWeeks: assessmentData.totalWeeks || 12,
      },

      notes: assessmentData.notes || '',
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  /**
   * تسجيل جلسة علاج بالحيوانات
   */
  async recordSession(beneficiaryId, sessionData = {}) {
    const session = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      therapistId: sessionData.therapistId,
      duration: sessionData.duration || 45,
      therapyType: sessionData.therapyType || 'equine',

      // الحيوان المستخدم
      animal: {
        name: sessionData.animalName || '',
        type: sessionData.animalType || 'horse',
        behaviorDuringSession: sessionData.animalBehavior || 'calm',
      },

      // الأنشطة المنفذة
      activitiesPerformed: (sessionData.activities || []).map(a => ({
        name: a.name,
        duration: a.duration || 0,
        response: a.response || 'positive',
        assistanceLevel: a.assistance || 'moderate',
      })),

      // تقييم الجلسة
      evaluation: {
        motorImprovement: sessionData.motorImprovement || 0,
        balanceAndPosture: sessionData.balancePosture || 0,
        socialInteraction: sessionData.socialInteraction || 0,
        emotionalRegulation: sessionData.emotionalRegulation || 0,
        communicationSkills: sessionData.communicationSkills || 0,
        confidenceBuilding: sessionData.confidenceBuilding || 0,
        animalBonding: sessionData.animalBonding || 0,
        followingInstructions: sessionData.followingInstructions || 0,
      },

      // المزاج
      moodBefore: sessionData.moodBefore || 'neutral',
      moodAfter: sessionData.moodAfter || 'neutral',

      // سلامة الجلسة
      safety: {
        incidentsOccurred: sessionData.incidents || false,
        incidentDetails: sessionData.incidentDetails || '',
        safetyEquipmentUsed: sessionData.safetyEquipment || [],
      },

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
        motor: this._calcProgress(sessions, 'motorImprovement'),
        balance: this._calcProgress(sessions, 'balanceAndPosture'),
        social: this._calcProgress(sessions, 'socialInteraction'),
        emotional: this._calcProgress(sessions, 'emotionalRegulation'),
        communication: this._calcProgress(sessions, 'communicationSkills'),
        confidence: this._calcProgress(sessions, 'confidenceBuilding'),
        animalBonding: this._calcProgress(sessions, 'animalBonding'),
        instructions: this._calcProgress(sessions, 'followingInstructions'),
      },

      moodAnalysis: this._analyzeMoods(sessions),
      safetyRecord: this._getSafetyRecord(sessions),
      recommendations: this._generateRecommendations(sessions),
      overallProgress: 0,
    };

    const scores = Object.values(report.skillProgress).map(s => s.average || 0);
    report.overallProgress =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return report;
  }

  // ==================== أساليب مساعدة ====================

  _getDefaultGoals(type) {
    const goals = {
      equine: [
        {
          category: 'motor',
          description: 'تحسين التوازن والوضعية على الحصان',
          target: 80,
          current: 0,
        },
        { category: 'strength', description: 'تقوية عضلات الجذع والأطراف', target: 75, current: 0 },
        { category: 'social', description: 'تعزيز التواصل والتفاعل', target: 70, current: 0 },
        {
          category: 'confidence',
          description: 'بناء الثقة بالنفس والشجاعة',
          target: 85,
          current: 0,
        },
        { category: 'emotional', description: 'تحسين التنظيم العاطفي', target: 75, current: 0 },
      ],
      canine: [
        { category: 'social', description: 'تحسين التفاعل الاجتماعي', target: 80, current: 0 },
        { category: 'emotional', description: 'تقليل القلق وتحسين المزاج', target: 80, current: 0 },
        {
          category: 'communication',
          description: 'تعزيز التواصل اللفظي وغير اللفظي',
          target: 75,
          current: 0,
        },
        {
          category: 'responsibility',
          description: 'تعلم المسؤولية والرعاية',
          target: 70,
          current: 0,
        },
      ],
      general: [
        {
          category: 'emotional',
          description: 'تحسين الحالة النفسية العامة',
          target: 80,
          current: 0,
        },
        { category: 'social', description: 'تعزيز التفاعل الاجتماعي', target: 75, current: 0 },
        { category: 'sensory', description: 'تحسين المعالجة الحسية', target: 70, current: 0 },
      ],
    };
    return goals[type] || goals['general'];
  }

  _recommendActivities(type) {
    const activities = {
      equine: [
        { name: 'ركوب الخيل العلاجي', difficulty: 'medium', benefits: ['توازن', 'قوة', 'ثقة'] },
        {
          name: 'تنظيف وتمشيط الحصان',
          difficulty: 'easy',
          benefits: ['حركة دقيقة', 'مسؤولية', 'ترابط'],
        },
        { name: 'قيادة الحصان بالحبل', difficulty: 'medium', benefits: ['قيادة', 'تواصل', 'ثقة'] },
        { name: 'ألعاب على ظهر الحصان', difficulty: 'hard', benefits: ['توازن', 'مرح', 'تناسق'] },
        { name: 'إطعام الحصان', difficulty: 'easy', benefits: ['ترابط', 'مسؤولية', 'تعاطف'] },
      ],
      canine: [
        { name: 'المشي مع الكلب', difficulty: 'easy', benefits: ['حركة', 'مسؤولية'] },
        {
          name: 'تدريب الكلب على الأوامر',
          difficulty: 'medium',
          benefits: ['تواصل', 'صبر', 'قيادة'],
        },
        { name: 'اللعب بالكرة مع الكلب', difficulty: 'easy', benefits: ['حركة', 'تفاعل', 'مرح'] },
        { name: 'تمشيط وعناية بالكلب', difficulty: 'easy', benefits: ['حركة دقيقة', 'تعاطف'] },
        {
          name: 'القراءة للكلب',
          difficulty: 'easy',
          benefits: ['طلاقة القراءة', 'ثقة', 'استرخاء'],
        },
      ],
    };
    return activities[type] || activities['canine'];
  }

  _getSafetyEquipment(type) {
    const equipment = {
      equine: ['خوذة ركوب', 'حذاء مناسب', 'سترة واقية', 'حبل أمان'],
      canine: ['قفازات واقية (عند الحاجة)', 'طوق وسلسلة للكلب', 'مكافآت تدريبية'],
    };
    return equipment[type] || equipment['canine'];
  }

  _avg(values) {
    const valid = values.filter(v => typeof v === 'number' && v > 0);
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

  _getSafetyRecord(sessions) {
    const incidents = sessions.filter(s => s.safety.incidentsOccurred);
    return {
      totalSessions: sessions.length,
      totalIncidents: incidents.length,
      safetyRate:
        sessions.length > 0
          ? Math.round(((sessions.length - incidents.length) / sessions.length) * 100)
          : 100,
    };
  }

  _generateRecommendations(sessions) {
    if (sessions.length === 0) return ['البدء بجلسة تعريفية مع الحيوان لبناء الألفة'];
    const recommendations = [];
    const avgConfidence = this._calcProgress(sessions, 'confidenceBuilding').average;
    if (avgConfidence < 50) recommendations.push('التركيز على أنشطة بناء الثقة التدريجية');
    const avgBonding = this._calcProgress(sessions, 'animalBonding').average;
    if (avgBonding >= 70) recommendations.push('تقديم مهام رعاية أكثر استقلالية');
    const avgSocial = this._calcProgress(sessions, 'socialInteraction').average;
    if (avgSocial < 50) recommendations.push('إضافة جلسات جماعية مع مستفيدين آخرين');
    return recommendations.length > 0
      ? recommendations
      : ['الاستمرار في البرنامج مع زيادة تدريجية في التحدي'];
  }

  _updateProgress(beneficiaryId, session) {
    const current = this.progressReports.get(beneficiaryId) || { sessions: [], lastUpdated: null };
    current.sessions.push(session.id);
    current.lastUpdated = new Date();
    this.progressReports.set(beneficiaryId, current);
  }
}

module.exports = { AnimalAssistedTherapyService };
