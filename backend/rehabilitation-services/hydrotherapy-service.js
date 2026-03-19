/* eslint-disable no-unused-vars */
/**
 * Hydrotherapy (Aquatic Therapy) Service for Disability Rehabilitation
 * خدمة العلاج المائي لتأهيل ذوي الإعاقة
 *
 * يشمل التمارين المائية، السباحة العلاجية، والعلاج في الماء الدافئ
 * لتحسين الحركة والقوة العضلية وتقليل الألم
 */

class HydrotherapyService {
  constructor() {
    this.sessions = new Map();
    this.plans = new Map();
    this.assessments = new Map();
    this.poolSettings = new Map();
    this.progressReports = new Map();
    this.safetyRecords = new Map();
  }

  /**
   * تقييم الجاهزية للعلاج المائي
   */
  async assessAquaticReadiness(beneficiaryId, assessmentData = {}) {
    const assessment = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      assessorId: assessmentData.assessorId || 'system',

      // التقييم الطبي
      medicalClearance: {
        cleared: assessmentData.medicalClearance || false,
        physician: assessmentData.physician || '',
        conditions: assessmentData.conditions || [],
        contraindications: assessmentData.contraindications || [],
        precautions: assessmentData.precautions || [],
      },

      // الراحة في الماء
      waterComfort: {
        faceWetting: assessmentData.faceWetting || 0,
        submersion: assessmentData.submersion || 0,
        floatingTolerance: assessmentData.floatingTolerance || 0,
        movementInWater: assessmentData.movementInWater || 0,
        anxietyLevel: assessmentData.waterAnxiety || 'moderate',
        overallScore: 0,
      },

      // القدرات الحركية في الماء
      aquaticMotorSkills: {
        upperExtremity: assessmentData.upperExtremity || 0,
        lowerExtremity: assessmentData.lowerExtremity || 0,
        trunkControl: assessmentData.trunkControl || 0,
        balance: assessmentData.balance || 0,
        endurance: assessmentData.endurance || 0,
        overallScore: 0,
      },

      // القوة العضلية
      muscleStrength: {
        upperBody: assessmentData.upperBodyStrength || 0,
        lowerBody: assessmentData.lowerBodyStrength || 0,
        core: assessmentData.coreStrength || 0,
        grip: assessmentData.gripStrength || 0,
        overallScore: 0,
      },

      // مدى الحركة
      rangeOfMotion: {
        shoulders: assessmentData.shoulderROM || 0,
        elbows: assessmentData.elbowROM || 0,
        hips: assessmentData.hipROM || 0,
        knees: assessmentData.kneeROM || 0,
        ankles: assessmentData.ankleROM || 0,
        overallScore: 0,
      },

      // مستوى الألم
      painAssessment: {
        atRest: assessmentData.painAtRest || 0,
        withMovement: assessmentData.painWithMovement || 0,
        location: assessmentData.painLocation || [],
        type: assessmentData.painType || 'none',
      },

      status: 'completed',
    };

    // حساب الدرجات
    assessment.waterComfort.overallScore = this._avg([
      assessment.waterComfort.faceWetting,
      assessment.waterComfort.submersion,
      assessment.waterComfort.floatingTolerance,
      assessment.waterComfort.movementInWater,
    ]);

    assessment.aquaticMotorSkills.overallScore = this._avg([
      assessment.aquaticMotorSkills.upperExtremity,
      assessment.aquaticMotorSkills.lowerExtremity,
      assessment.aquaticMotorSkills.trunkControl,
      assessment.aquaticMotorSkills.balance,
      assessment.aquaticMotorSkills.endurance,
    ]);

    assessment.muscleStrength.overallScore = this._avg([
      assessment.muscleStrength.upperBody,
      assessment.muscleStrength.lowerBody,
      assessment.muscleStrength.core,
      assessment.muscleStrength.grip,
    ]);

    assessment.rangeOfMotion.overallScore = this._avg([
      assessment.rangeOfMotion.shoulders,
      assessment.rangeOfMotion.elbows,
      assessment.rangeOfMotion.hips,
      assessment.rangeOfMotion.knees,
      assessment.rangeOfMotion.ankles,
    ]);

    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  /**
   * إنشاء خطة علاج مائي
   */
  async createHydrotherapyPlan(beneficiaryId, assessmentData = {}) {
    const plan = {
      id: Date.now().toString(),
      beneficiaryId,
      createdAt: new Date(),
      status: 'active',

      goals: assessmentData.goals || [
        { category: 'mobility', description: 'تحسين مدى الحركة', target: 80, current: 0 },
        { category: 'strength', description: 'زيادة القوة العضلية', target: 75, current: 0 },
        { category: 'pain', description: 'تقليل مستوى الألم', target: 30, current: 100 },
        { category: 'endurance', description: 'تحسين التحمل', target: 80, current: 0 },
        { category: 'balance', description: 'تحسين التوازن', target: 75, current: 0 },
        { category: 'confidence', description: 'زيادة الثقة في الماء', target: 85, current: 0 },
      ],

      // التمارين المائية المقترحة
      exercises: this._recommendExercises(assessmentData.condition),

      // إعدادات المسبح
      poolSettings: {
        waterTemperature: assessmentData.waterTemp || '33-35°C',
        poolDepth: assessmentData.poolDepth || 'متوسط (1.2 متر)',
        equipmentNeeded: this._recommendEquipment(assessmentData.condition),
      },

      // احتياطات السلامة
      safetyProtocol: {
        lifeguardRequired: true,
        assistantRequired: assessmentData.assistantRequired !== false,
        emergencyProcedures: [
          'التأكد من وجود منقذ مدرب',
          'فحص درجة حرارة الماء قبل كل جلسة',
          'مراقبة العلامات الحيوية',
          'وجود معدات إسعاف أولي',
        ],
      },

      schedule: {
        frequency: assessmentData.frequency || 'ثلاث مرات أسبوعياً',
        duration: assessmentData.sessionDuration || '30-45 دقيقة',
        totalWeeks: assessmentData.totalWeeks || 12,
      },

      notes: assessmentData.notes || '',
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  /**
   * تسجيل جلسة علاج مائي
   */
  async recordSession(beneficiaryId, sessionData = {}) {
    const session = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      therapistId: sessionData.therapistId,
      duration: sessionData.duration || 30,

      // بيئة الجلسة
      environment: {
        waterTemperature: sessionData.waterTemp || '34°C',
        poolType: sessionData.poolType || 'therapeutic',
        equipmentUsed: sessionData.equipmentUsed || [],
      },

      // التمارين المنفذة
      exercisesPerformed: sessionData.exercises || [],

      // القياسات
      measurements: {
        vitalsBefore: {
          heartRate: sessionData.hrBefore || 0,
          bloodPressure: sessionData.bpBefore || '',
          painLevel: sessionData.painBefore || 0,
        },
        vitalsAfter: {
          heartRate: sessionData.hrAfter || 0,
          bloodPressure: sessionData.bpAfter || '',
          painLevel: sessionData.painAfter || 0,
        },
      },

      // تقييم الأداء
      evaluation: {
        mobility: sessionData.mobility || 0,
        strength: sessionData.strength || 0,
        endurance: sessionData.endurance || 0,
        balance: sessionData.balance || 0,
        painReduction: sessionData.painReduction || 0,
        waterConfidence: sessionData.waterConfidence || 0,
      },

      // تقييم السلامة
      safety: {
        incidentsOccurred: sessionData.incidents || false,
        incidentDetails: sessionData.incidentDetails || '',
        precautionsTaken: sessionData.precautions || [],
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
        mobility: this._calcProgress(sessions, 'mobility'),
        strength: this._calcProgress(sessions, 'strength'),
        endurance: this._calcProgress(sessions, 'endurance'),
        balance: this._calcProgress(sessions, 'balance'),
        painReduction: this._calcProgress(sessions, 'painReduction'),
        waterConfidence: this._calcProgress(sessions, 'waterConfidence'),
      },

      painTrend: this._analyzePainTrend(sessions),
      vitalsTrend: this._analyzeVitalsTrend(sessions),
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

  _recommendExercises(condition) {
    const exercises = {
      motor: [
        {
          name: 'المشي في الماء',
          intensity: 'low',
          sets: 3,
          duration: '5 دقائق',
          benefits: ['قوة الساق', 'توازن'],
        },
        {
          name: 'تمارين مقاومة الماء للذراعين',
          intensity: 'medium',
          sets: 3,
          reps: 10,
          benefits: ['قوة الذراع'],
        },
        {
          name: 'السباحة المدعومة',
          intensity: 'low',
          duration: '10 دقائق',
          benefits: ['تحمل', 'تنفس'],
        },
        {
          name: 'تمارين التوازن في الماء',
          intensity: 'low',
          sets: 3,
          duration: '3 دقائق',
          benefits: ['توازن', 'ثقة'],
        },
      ],
      pain: [
        {
          name: 'تمارين الطفو الاسترخائي',
          intensity: 'very_low',
          duration: '10 دقائق',
          benefits: ['استرخاء', 'تقليل ألم'],
        },
        {
          name: 'حركات لطيفة في الماء الدافئ',
          intensity: 'low',
          sets: 2,
          reps: 8,
          benefits: ['مرونة', 'تخفيف'],
        },
        {
          name: 'المشي البطيء في الماء',
          intensity: 'low',
          duration: '5 دقائق',
          benefits: ['حركة', 'دوران'],
        },
      ],
      neurological: [
        {
          name: 'تمارين التوازن مع الدعم',
          intensity: 'low',
          sets: 3,
          duration: '5 دقائق',
          benefits: ['توازن', 'وعي'],
        },
        {
          name: 'حركات تناسقية',
          intensity: 'medium',
          sets: 3,
          reps: 8,
          benefits: ['تناسق', 'تحكم'],
        },
        {
          name: 'تمارين التنفس في الماء',
          intensity: 'low',
          sets: 5,
          reps: 5,
          benefits: ['تنفس', 'استرخاء'],
        },
      ],
    };
    return exercises[condition] || exercises['motor'];
  }

  _recommendEquipment(condition) {
    const base = ['عوامات', 'نودلز مائية', 'أحزمة طفو'];
    const special = {
      motor: ['ألواح كيك', 'أوزان مائية', 'سلالم مائية'],
      pain: ['وسائد هوائية', 'أجهزة تدليك مائي'],
      neurological: ['قضبان مسك', 'أرضيات مائية مضادة للانزلاق'],
    };
    return [...base, ...(special[condition] || [])];
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

  _analyzePainTrend(sessions) {
    const painBefore = sessions.map(s => s.measurements.vitalsBefore.painLevel).filter(v => v > 0);
    const painAfter = sessions.map(s => s.measurements.vitalsAfter.painLevel).filter(v => v > 0);
    return {
      averagePainBefore:
        painBefore.length > 0
          ? +(painBefore.reduce((a, b) => a + b, 0) / painBefore.length).toFixed(1)
          : 0,
      averagePainAfter:
        painAfter.length > 0
          ? +(painAfter.reduce((a, b) => a + b, 0) / painAfter.length).toFixed(1)
          : 0,
      reduction:
        painBefore.length > 0 && painAfter.length > 0
          ? +(
              painBefore.reduce((a, b) => a + b, 0) / painBefore.length -
              painAfter.reduce((a, b) => a + b, 0) / painAfter.length
            ).toFixed(1)
          : 0,
    };
  }

  _analyzeVitalsTrend(sessions) {
    const hrBefore = sessions.map(s => s.measurements.vitalsBefore.heartRate).filter(v => v > 0);
    const hrAfter = sessions.map(s => s.measurements.vitalsAfter.heartRate).filter(v => v > 0);
    return {
      avgHeartRateBefore:
        hrBefore.length > 0 ? Math.round(hrBefore.reduce((a, b) => a + b, 0) / hrBefore.length) : 0,
      avgHeartRateAfter:
        hrAfter.length > 0 ? Math.round(hrAfter.reduce((a, b) => a + b, 0) / hrAfter.length) : 0,
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
    if (sessions.length === 0) return ['البدء بجلسات تعريفية في الماء الضحل لبناء الثقة'];
    const recommendations = [];
    const avgMobility = this._calcProgress(sessions, 'mobility').average;
    if (avgMobility >= 70) recommendations.push('زيادة مستوى صعوبة تمارين الحركة');
    const avgPain = this._calcProgress(sessions, 'painReduction').average;
    if (avgPain < 50) recommendations.push('التركيز على تمارين الاسترخاء في الماء الدافئ');
    const avgConfidence = this._calcProgress(sessions, 'waterConfidence').average;
    if (avgConfidence < 50) recommendations.push('المزيد من أنشطة بناء الثقة في الماء');
    return recommendations.length > 0
      ? recommendations
      : ['الاستمرار في البرنامج الحالي مع تقدم تدريجي'];
  }

  _updateProgress(beneficiaryId, session) {
    const current = this.progressReports.get(beneficiaryId) || { sessions: [], lastUpdated: null };
    current.sessions.push(session.id);
    current.lastUpdated = new Date();
    this.progressReports.set(beneficiaryId, current);
  }
}

module.exports = { HydrotherapyService };
