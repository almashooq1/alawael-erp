/* eslint-disable no-unused-vars */
/**
 * Advanced Physical Therapy Service for Disability Rehabilitation
 * خدمة العلاج الطبيعي المتقدمة لتأهيل ذوي الإعاقة
 *
 * Supports: Cerebral Palsy, Stroke, Spinal Cord Injury, Muscular Dystrophy, MS
 */

class AdvancedPhysicalTherapyService {
  constructor() {
    this.treatmentPlans = new Map();
    this.sessions = new Map();
    this.progress = new Map();
    this.assessments = new Map();
    this.exerciseLibrary = this._initializeExerciseLibrary();
  }

  // ==========================================
  // مكتبة التمارين العلاجية
  // ==========================================
  _initializeExerciseLibrary() {
    return {
      // تمارين للشلل الدماغي | Cerebral Palsy Exercises
      cerebralPalsy: {
        spastic: [
          { name: 'تمارين الإطالة السلبية', category: 'stretching', duration: 15, reps: 3 },
          { name: 'تمارين الاسترخاء العضلي', category: 'relaxation', duration: 10, reps: 5 },
          { name: 'تمارين الحركة البطيئة', category: 'mobility', duration: 20, reps: 10 },
          { name: 'تمارين التوازن الجالس', category: 'balance', duration: 10, reps: 5 },
        ],
        athetoid: [
          { name: 'تمارين الثبات والاستقرار', category: 'stability', duration: 15, reps: 5 },
          { name: 'تمارين التحكم في الوضعية', category: 'posture', duration: 20, reps: 10 },
          { name: 'تمارين التنسيق الحركي', category: 'coordination', duration: 15, reps: 8 },
        ],
        ataxic: [
          { name: 'تمارين التوازن الديناميكي', category: 'balance', duration: 20, reps: 5 },
          { name: 'تمارين المشي على خط مستقيم', category: 'gait', duration: 15, reps: 10 },
          { name: 'تمارين التناسق اليدوي', category: 'coordination', duration: 10, reps: 10 },
        ],
      },

      // تمارين لإعادة التأهيل بعد السكتة الدماغية | Stroke Rehabilitation
      stroke: {
        earlyStage: [
          { name: 'تمارين الحركة السلبية', category: 'passive_rom', duration: 30, reps: 10 },
          { name: 'تمارين تغيير الوضعية', category: 'positioning', duration: 15, reps: 5 },
          { name: 'تحفيز الحركة الإرادية', category: 'facilitation', duration: 20, reps: 10 },
        ],
        recoveryStage: [
          { name: 'تمارين التقوية العضلية', category: 'strengthening', duration: 25, reps: 12 },
          { name: 'تمارين المشي', category: 'gait_training', duration: 30, reps: 1 },
          { name: 'تمارين التوازن والتنسيق', category: 'balance', duration: 20, reps: 10 },
          { name: 'تمارين الوظائف اليومية', category: 'functional', duration: 30, reps: 5 },
        ],
        chronicStage: [
          {
            name: 'تمارين الحفاظ على المدى الحركي',
            category: 'rom_maintenance',
            duration: 20,
            reps: 10,
          },
          { name: 'تمارين التحمل', category: 'endurance', duration: 30, reps: 1 },
          { name: 'تمارين المهارات الدقيقة', category: 'fine_motor', duration: 25, reps: 15 },
        ],
      },

      // تمارين لإصابات الحبل الشوكي | Spinal Cord Injury Exercises
      spinalCordInjury: {
        tetraplegia: [
          {
            name: 'تمارين تقوية العضلات المتبقية',
            category: 'strengthening',
            duration: 30,
            reps: 10,
          },
          { name: 'تمارين التنفس', category: 'respiratory', duration: 15, reps: 10 },
          { name: 'تمارين الحركة السلبية', category: 'passive_rom', duration: 20, reps: 10 },
          { name: 'تمارين الكرسي المتحرك', category: 'wheelchair_skills', duration: 25, reps: 5 },
        ],
        paraplegia: [
          { name: 'تمارين تقوية الجزء العلوي', category: 'upper_body', duration: 30, reps: 12 },
          { name: 'تمارين التوازن الجالس', category: 'sitting_balance', duration: 20, reps: 10 },
          { name: 'تمارين التحويل', category: 'transfers', duration: 25, reps: 5 },
          { name: 'تمارين الوقوف (إن أمكن)', category: 'standing', duration: 15, reps: 3 },
        ],
      },

      // تمارين الحركية العضلية | Muscular Dystrophy Exercises
      muscularDystrophy: [
        { name: 'تمارين الإطالة اللطيفة', category: 'gentle_stretching', duration: 20, reps: 5 },
        { name: 'تمارين المدى الحركي', category: 'rom', duration: 25, reps: 10 },
        { name: 'تمارين هوائية خفيفة', category: 'light_aerobic', duration: 15, reps: 1 },
        { name: 'تمارين السباحة العلاجية', category: 'hydrotherapy', duration: 30, reps: 1 },
      ],

      // تمارين التصلب المتعدد | Multiple Sclerosis Exercises
      multipleSclerosis: [
        { name: 'تمارين الإطالة', category: 'stretching', duration: 20, reps: 10 },
        { name: 'تمارين التوازن', category: 'balance', duration: 15, reps: 5 },
        { name: 'تمارين التقوية المعتدلة', category: 'moderate_strength', duration: 20, reps: 10 },
        { name: 'تمارين التحمل الهوائي', category: 'aerobic', duration: 25, reps: 1 },
        { name: 'تمارين التبريد', category: 'cooling', duration: 10, reps: 1 },
      ],
    };
  }

  // ==========================================
  // التقييم الشامل للعلاج الطبيعي
  // ==========================================
  async createComprehensiveTreatmentPlan(beneficiaryId, assessmentData) {
    const plan = {
      id: Date.now().toString(),
      beneficiaryId,
      createdAt: new Date(),

      // معلومات التشخيص
      diagnosis: {
        primary: assessmentData.primaryDiagnosis,
        secondary: assessmentData.secondaryDiagnoses || [],
        icdCode: assessmentData.icdCode,
        onsetDate: assessmentData.onsetDate,
        severity: this._assessSeverity(assessmentData),
      },

      // أهداف العلاج
      goals: {
        shortTerm: this._generateShortTermGoals(assessmentData),
        longTerm: this._generateLongTermGoals(assessmentData),
        functionalGoals: this._generateFunctionalGoals(assessmentData),
      },

      // خطة التمارين الموصى بها
      exercisePlan: this._recommendExercises(assessmentData),

      // الجدول الزمني
      schedule: {
        frequency: assessmentData.frequency || '3 مرات أسبوعياً',
        duration: assessmentData.duration || '12 أسبوع',
        sessionDuration: assessmentData.sessionDuration || 45, // دقيقة
      },

      // الأجهزة المساعدة الموصى بها
      assistiveDevices: this._recommendAssistiveDevices(assessmentData),

      // احتياطات وموانع
      precautions: assessmentData.precautions || [],
      contraindications: assessmentData.contraindications || [],

      status: 'active',
      therapist: assessmentData.therapist,
      lastUpdated: new Date(),
    };

    this.treatmentPlans.set(plan.id, plan);
    return plan;
  }

  // ==========================================
  // تسجيل جلسة علاج طبيعي
  // ==========================================
  async recordSession(beneficiaryId, sessionData) {
    const session = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),

      // معلومات الجلسة
      therapist: sessionData.therapist,
      duration: sessionData.duration, // دقيقة

      // التمارين المنفذة
      exercisesCompleted: sessionData.exercisesCompleted || [],
      exercisesModified: sessionData.exercisesModified || [],
      exercisesSkipped: sessionData.exercisesSkipped || [],

      // ملاحظات الجلسة
      observations: {
        patientResponse: sessionData.patientResponse, // excellent, good, fair, poor
        painLevel: sessionData.painLevel, // 0-10
        fatigueLevel: sessionData.fatigueLevel, // 0-10
        motivation: sessionData.motivation, // high, medium, low
        cooperation: sessionData.cooperation, // excellent, good, fair, poor
      },

      // قياسات الجلسة
      measurements: {
        romBefore: sessionData.romBefore || {},
        romAfter: sessionData.romAfter || {},
        strengthBefore: sessionData.strengthBefore || {},
        strengthAfter: sessionData.strengthAfter || {},
        painBefore: sessionData.painBefore || 0,
        painAfter: sessionData.painAfter || 0,
      },

      // التقدم المحرز
      progress: {
        overallProgress: sessionData.overallProgress, // percentage
        goalAchievement: sessionData.goalAchievement || [],
        newAbilities: sessionData.newAbilities || [],
        difficulties: sessionData.difficulties || [],
      },

      // الخطة للجلسة القادمة
      nextSessionPlan: {
        focus: sessionData.nextFocus,
        modifications: sessionData.nextModifications || [],
        homework: sessionData.homework || [],
      },

      notes: sessionData.notes || '',
    };

    this.sessions.set(session.id, session);
    this._updateProgress(beneficiaryId, session);

    return session;
  }

  // ==========================================
  // تحديث التقدم
  // ==========================================
  _updateProgress(beneficiaryId, session) {
    const current = this.progress.get(beneficiaryId) || {
      sessions: [],
      overallProgress: 0,
      milestones: [],
      assessments: [],
    };

    current.sessions.push({
      date: session.date,
      progress: session.progress.overallProgress,
      painLevel: session.observations.painLevel,
    });

    // حساب التقدم الإجمالي
    if (current.sessions.length > 0) {
      const totalProgress = current.sessions.reduce((sum, s) => sum + s.progress, 0);
      current.overallProgress = Math.round(totalProgress / current.sessions.length);
    }

    this.progress.set(beneficiaryId, current);
  }

  // ==========================================
  // توصية التمارين حسب نوع الإعاقة
  // ==========================================
  _recommendExercises(assessmentData) {
    const diagnosis = assessmentData.primaryDiagnosis?.toLowerCase() || '';

    if (diagnosis.includes('cerebral') || diagnosis.includes('شلل دماغي')) {
      return this.exerciseLibrary.cerebralPalsy;
    } else if (diagnosis.includes('stroke') || diagnosis.includes('سكتة')) {
      return this.exerciseLibrary.stroke;
    } else if (diagnosis.includes('spinal') || diagnosis.includes('حبل شوكي')) {
      return this.exerciseLibrary.spinalCordInjury;
    } else if (diagnosis.includes('muscular') || diagnosis.includes('حركية عضلية')) {
      return { exercises: this.exerciseLibrary.muscularDystrophy };
    } else if (diagnosis.includes('multiple sclerosis') || diagnosis.includes('تصلب متعدد')) {
      return { exercises: this.exerciseLibrary.multipleSclerosis };
    }

    // تمارين افتراضية للحركة العامة
    return {
      general: [
        { name: 'تمارين المدى الحركي', category: 'rom', duration: 20, reps: 10 },
        { name: 'تمارين التقوية', category: 'strengthening', duration: 25, reps: 12 },
        { name: 'تمارين التوازن', category: 'balance', duration: 15, reps: 5 },
        { name: 'تمارين المشي', category: 'gait', duration: 20, reps: 1 },
      ],
    };
  }

  // ==========================================
  // توصية الأجهزة المساعدة
  // ==========================================
  _recommendAssistiveDevices(assessmentData) {
    const devices = [];
    const mobility = assessmentData.mobilityLevel || '';

    if (mobility === 'non_ambulatory' || mobility === 'wheelchair') {
      devices.push({
        type: 'wheelchair',
        specifications: 'كرسي متحرك مخصص حسب القياسات',
        training: 'تدريب على استخدام الكرسي المتحرك',
      });
    }

    if (assessmentData.gaitDeviation || assessmentData.balanceIssues) {
      devices.push({
        type: 'walking_aid',
        options: ['عكاز', 'مشاية', 'عصا'],
        recommendation: 'مشاية للتوازن الأولي',
      });
    }

    if (assessmentData.contractures) {
      devices.push({
        type: 'orthosis',
        options: ['جبيرة', 'دعامة', 'نعل طبي'],
        recommendation: 'تقييم أخصائي الأجهزة التعويضية',
      });
    }

    return devices;
  }

  // ==========================================
  // توليد الأهداف قصيرة المدى
  // ==========================================
  _generateShortTermGoals(assessmentData) {
    const goals = [];

    goals.push({
      goal: 'تحسين المدى الحركي',
      target: 'زيادة 10 درجات في المفاصل المتأثرة',
      timeframe: '4 أسابيع',
      measurable: true,
    });

    goals.push({
      goal: 'تقليل الألم',
      target: 'تقليل مستوى الألم من 7 إلى 4',
      timeframe: '2 أسابيع',
      measurable: true,
    });

    goals.push({
      goal: 'تحسين التوازن الجالس',
      target: 'الجلوس بدون دعم لمدة 5 دقائق',
      timeframe: '3 أسابيع',
      measurable: true,
    });

    return goals;
  }

  // ==========================================
  // توليد الأهداف طويلة المدى
  // ==========================================
  _generateLongTermGoals(assessmentData) {
    const goals = [];

    goals.push({
      goal: 'تحقيق الاستقلالية في الحركة',
      target: 'التنقل المستقل داخل المنزل',
      timeframe: '3 أشهر',
      measurable: true,
    });

    goals.push({
      goal: 'تحسين الوظائف اليومية',
      target: 'أداء الأنشطة اليومية بشكل مستقل',
      timeframe: '6 أشهر',
      measurable: true,
    });

    goals.push({
      goal: 'المشاركة المجتمعية',
      target: 'القدرة على الخروج والمشاركة الاجتماعية',
      timeframe: '6-12 شهر',
      measurable: true,
    });

    return goals;
  }

  // ==========================================
  // توليد الأهداف الوظيفية
  // ==========================================
  _generateFunctionalGoals(assessmentData) {
    return [
      { activity: 'التحويل من السرير للكرسي', target: 'مستقل', timeframe: '4 أسابيع' },
      { activity: 'ارتداء الملابس', target: 'مساعدة جزئية', timeframe: '6 أسابيع' },
      { activity: 'استخدام الحمام', target: 'مستقل مع تعديلات', timeframe: '8 أسابيع' },
      { activity: 'المشي لمسافة 50 متر', target: 'باستخدام جهاز مساعد', timeframe: '3 أشهر' },
    ];
  }

  // ==========================================
  // تقييم شدة الإعاقة
  // ==========================================
  _assessSeverity(assessmentData) {
    let score = 0;

    if (assessmentData.mobilityLevel === 'non_ambulatory') score += 3;
    else if (assessmentData.mobilityLevel === 'assisted') score += 2;
    else if (assessmentData.mobilityLevel === 'independent') score += 1;

    if (assessmentData.adlDependency === 'total') score += 3;
    else if (assessmentData.adlDependency === 'partial') score += 2;
    else if (assessmentData.adlDependency === 'independent') score += 1;

    if (score >= 5) return 'severe';
    if (score >= 3) return 'moderate';
    return 'mild';
  }

  // ==========================================
  // الحصول على تقرير التقدم
  // ==========================================
  async getProgressReport(beneficiaryId) {
    const progress = this.progress.get(beneficiaryId);
    const plan = Array.from(this.treatmentPlans.values()).find(
      p => p.beneficiaryId === beneficiaryId
    );

    if (!progress) {
      return {
        beneficiaryId,
        message: 'لا توجد بيانات تقدم متاحة',
        recommendation: 'يبدأ التقييم الأولي',
      };
    }

    return {
      beneficiaryId,
      totalSessions: progress.sessions.length,
      overallProgress: progress.overallProgress,
      progressTrend: this._calculateProgressTrend(progress.sessions),
      goals: plan?.goals || {},
      milestones: progress.milestones || [],
      recommendations: this._generateProgressRecommendations(progress, plan),
    };
  }

  // ==========================================
  // حساب اتجاه التقدم
  // ==========================================
  _calculateProgressTrend(sessions) {
    if (sessions.length < 2) return 'insufficient_data';

    const recent = sessions.slice(-5);
    const earlier = sessions.slice(-10, -5);

    if (earlier.length === 0) return 'needs_more_data';

    const recentAvg = recent.reduce((sum, s) => sum + s.progress, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, s) => sum + s.progress, 0) / earlier.length;

    if (recentAvg > earlierAvg + 5) return 'improving';
    if (recentAvg < earlierAvg - 5) return 'declining';
    return 'stable';
  }

  // ==========================================
  // توليد توصيات التقدم
  // ==========================================
  _generateProgressRecommendations(progress, plan) {
    const recommendations = [];

    if (progress.overallProgress >= 80) {
      recommendations.push('الاستعداد للانتقال إلى مرحلة الصيانة');
      recommendations.push('تقليل عدد الجلسات تدريجياً');
    } else if (progress.overallProgress >= 50) {
      recommendations.push('الاستمرار في الخطة الحالية');
      recommendations.push('زيادة صعوبة التمارين تدريجياً');
    } else if (progress.overallProgress >= 25) {
      recommendations.push('مراجعة أهداف العلاج');
      recommendations.push('إضافة تمارين منزلية');
    } else {
      recommendations.push('إعادة التقييم الشامل');
      recommendations.push('استشارة الفريق متعدد التخصصات');
    }

    return recommendations;
  }

  // ==========================================
  // الحصول على خطة العلاج
  // ==========================================
  async getTreatmentPlan(beneficiaryId) {
    return Array.from(this.treatmentPlans.values()).find(
      p => p.beneficiaryId === beneficiaryId && p.status === 'active'
    );
  }

  // ==========================================
  // تحديث خطة العلاج
  // ==========================================
  async updateTreatmentPlan(planId, updates) {
    const plan = this.treatmentPlans.get(planId);
    if (!plan) return null;

    Object.assign(plan, updates, { lastUpdated: new Date() });
    this.treatmentPlans.set(planId, plan);
    return plan;
  }
}

module.exports = { AdvancedPhysicalTherapyService };
