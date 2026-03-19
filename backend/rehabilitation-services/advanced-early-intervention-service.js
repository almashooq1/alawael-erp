/* eslint-disable no-unused-vars */
/**
 * Advanced Early Intervention Service for Disability Rehabilitation
 * خدمة التدخل المبكر المتقدمة لتأهيل ذوي الإعاقة
 *
 * Supports: Early Detection, Developmental Monitoring, Family Training
 */

class AdvancedEarlyInterventionService {
  constructor() {
    this.screenings = new Map();
    this.developmentPlans = new Map();
    this.familyTrainings = new Map();
    this.progress = new Map();
  }

  // ==========================================
  // الفحص المبكر للنمو
  // ==========================================
  async createDevelopmentalScreening(beneficiaryId, screeningData) {
    const screening = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      age: screeningData.age, // بالأشهر

      // مجالات النمو
      developmentalAreas: {
        motor: {
          grossMotor: {
            score: screeningData.grossMotorScore || 0,
            milestones: screeningData.grossMotorMilestones || [],
            concerns: screeningData.grossMotorConcerns || [],
          },
          fineMotor: {
            score: screeningData.fineMotorScore || 0,
            milestones: screeningData.fineMotorMilestones || [],
            concerns: screeningData.fineMotorConcerns || [],
          },
        },

        communication: {
          receptive: {
            score: screeningData.receptiveScore || 0,
            milestones: screeningData.receptiveMilestones || [],
            concerns: screeningData.receptiveConcerns || [],
          },
          expressive: {
            score: screeningData.expressiveScore || 0,
            milestones: screeningData.expressiveMilestones || [],
            concerns: screeningData.expressiveConcerns || [],
          },
        },

        cognitive: {
          score: screeningData.cognitiveScore || 0,
          milestones: screeningData.cognitiveMilestones || [],
          concerns: screeningData.cognitiveConcerns || [],
        },

        socialEmotional: {
          score: screeningData.socialScore || 0,
          milestones: screeningData.socialMilestones || [],
          concerns: screeningData.socialConcerns || [],
        },

        adaptive: {
          score: screeningData.adaptiveScore || 0,
          milestones: screeningData.adaptiveMilestones || [],
          concerns: screeningData.adaptiveConcerns || [],
        },
      },

      // أدوات الفحص المستخدمة
      screeningTools: {
        agesStages: screeningData.agesStages || null,
        denver: screeningData.denver || null,
        batelle: screeningData.batelle || null,
      },

      // النتائج
      results: {
        atRiskAreas: [],
        delayedAreas: [],
        strengths: [],
        recommendations: [],
      },

      // خطة التدخل
      interventionPlan: null,

      status: 'active',
    };

    // تحليل النتائج
    screening.results = this._analyzeScreeningResults(screening);
    screening.interventionPlan = this._createInterventionPlan(screening);

    this.screenings.set(screening.id, screening);
    return screening;
  }

  // ==========================================
  // تحليل نتائج الفحص
  // ==========================================
  _analyzeScreeningResults(screening) {
    const results = {
      atRiskAreas: [],
      delayedAreas: [],
      strengths: [],
      recommendations: [],
    };

    const areas = screening.developmentalAreas;
    const age = screening.age;

    // فحص كل مجال
    const checkArea = (areaName, score, milestones) => {
      const expectedScore = this._getExpectedScore(areaName, age);

      if (score < expectedScore * 0.5) {
        results.delayedAreas.push({
          area: areaName,
          score,
          expected: expectedScore,
          severity: 'significant',
        });
      } else if (score < expectedScore * 0.75) {
        results.atRiskAreas.push({
          area: areaName,
          score,
          expected: expectedScore,
          severity: 'moderate',
        });
      } else {
        results.strengths.push({
          area: areaName,
          score,
          expected: expectedScore,
        });
      }
    };

    checkArea('gross_motor', areas.motor.grossMotor.score, areas.motor.grossMotor.milestones);
    checkArea('fine_motor', areas.motor.fineMotor.score, areas.motor.fineMotor.milestones);
    checkArea(
      'receptive_language',
      areas.communication.receptive.score,
      areas.communication.receptive.milestones
    );
    checkArea(
      'expressive_language',
      areas.communication.expressive.score,
      areas.communication.expressive.milestones
    );
    checkArea('cognitive', areas.cognitive.score, areas.cognitive.milestones);
    checkArea('social_emotional', areas.socialEmotional.score, areas.socialEmotional.milestones);
    checkArea('adaptive', areas.adaptive.score, areas.adaptive.milestones);

    // التوصيات
    if (results.delayedAreas.length > 0) {
      results.recommendations.push('تقييم متخصص عاجل');
      results.recommendations.push('بدء التدخل المبكر فوراً');
    }

    if (results.atRiskAreas.length > 0) {
      results.recommendations.push('متابعة شهرية');
      results.recommendations.push('تدريب الأسرة');
    }

    results.recommendations.push('تحفيز نقاط القوة');

    return results;
  }

  // ==========================================
  // الدرجات المتوقعة حسب العمر
  // ==========================================
  _getExpectedScore(area, ageInMonths) {
    const scores = {
      gross_motor: { 6: 5, 12: 10, 18: 15, 24: 20, 36: 25 },
      fine_motor: { 6: 4, 12: 8, 18: 12, 24: 16, 36: 20 },
      receptive_language: { 6: 3, 12: 7, 18: 11, 24: 15, 36: 19 },
      expressive_language: { 6: 2, 12: 6, 18: 10, 24: 14, 36: 18 },
      cognitive: { 6: 3, 12: 7, 18: 11, 24: 15, 36: 20 },
      social_emotional: { 6: 3, 12: 6, 18: 9, 24: 12, 36: 16 },
      adaptive: { 6: 2, 12: 5, 18: 8, 24: 11, 36: 15 },
    };

    const ageBands = [6, 12, 18, 24, 36];
    const closestAge = ageBands.reduce((prev, curr) =>
      Math.abs(curr - ageInMonths) < Math.abs(prev - ageInMonths) ? curr : prev
    );

    return scores[area]?.[closestAge] || 10;
  }

  // ==========================================
  // إنشاء خطة التدخل
  // ==========================================
  _createInterventionPlan(screening) {
    const plan = {
      goals: [],
      activities: [],
      frequency: '3_times_weekly',
      duration: '6_months',
      familyInvolvement: 'high',
      professionals: [],
    };

    // أهداف بناءً على المجالات المتأخرة
    screening.results.delayedAreas.forEach(area => {
      plan.goals.push({
        area: area.area,
        goal: `تحسين مهارات ${this._getAreaNameAr(area.area)}`,
        target: `الوصول للدرجة ${Math.round(area.expected * 0.8)}`,
        activities: this._getActivitiesForArea(area.area),
      });
    });

    // أنشطة يومية
    plan.activities = [
      { name: 'تحفيز حسي', duration: '15 دقيقة', frequency: 'يومياً' },
      { name: 'تدريب حركي', duration: '20 دقيقة', frequency: '3 مرات يومياً' },
      { name: 'تواصل وتفاعل', duration: '30 دقيقة', frequency: 'يومياً' },
    ];

    // الفريق المختص
    plan.professionals = [
      { role: 'أخصائي علاج طبيعي', frequency: 'مرتين أسبوعياً' },
      { role: 'أخصائي تخاطب', frequency: 'مرة أسبوعياً' },
      { role: 'أخصائي تغذية', frequency: 'حسب الحاجة' },
    ];

    return plan;
  }

  _getAreaNameAr(area) {
    const names = {
      gross_motor: 'المهارات الحركية الكبرى',
      fine_motor: 'المهارات الحركية الدقيقة',
      receptive_language: 'الاستيعاب اللغوي',
      expressive_language: 'التعبير اللغوي',
      cognitive: 'الإدراك والتفكير',
      social_emotional: 'المهارات الاجتماعية والانفعالية',
      adaptive: 'المهارات التكيفية',
    };
    return names[area] || area;
  }

  _getActivitiesForArea(area) {
    const activities = {
      gross_motor: ['الوقوف مع دعم', 'المشي المساعد', 'صعود الدرج'],
      fine_motor: ['مسك الأشياء', 'الإمساك بالملعقة', 'الرسم'],
      receptive_language: ['الاستجابة للاسم', 'فهم التعليمات البسيطة'],
      expressive_language: ['إصدار أصوات', 'نطق كلمات بسيطة'],
      cognitive: ['البحث عن الأشياء', 'المطابقة', 'التصنيف'],
      social_emotional: ['التواصل البصري', 'الابتسامة', 'التفاعل'],
      adaptive: ['تناول الطعام', 'اللبس', 'النظافة'],
    };
    return activities[area] || [];
  }

  // ==========================================
  // تدريب الأسرة
  // ==========================================
  async createFamilyTrainingPlan(beneficiaryId, planData) {
    const training = {
      id: Date.now().toString(),
      beneficiaryId,
      createdAt: new Date(),

      caregivers: planData.caregivers || [],

      modules: [
        {
          title: 'فهم التطور النمائي',
          sessions: 3,
          topics: ['مراحل النمو', 'علامات التأخر', 'أهمية التدخل المبكر'],
          completed: false,
        },
        {
          title: 'تقنيات التحفيز',
          sessions: 4,
          topics: ['التحفيز الحسي', 'التحفيز الحركي', 'التحفيز اللغوي'],
          completed: false,
        },
        {
          title: 'أنشطة منزلية',
          sessions: 5,
          topics: ['أنشطة يومية', 'ألعاب تعليمية', 'روتين يومي'],
          completed: false,
        },
        {
          title: 'إدارة السلوك',
          sessions: 3,
          topics: ['التعزيز الإيجابي', 'تحديد الحدود', 'التواصل الفعال'],
          completed: false,
        },
      ],

      schedule: {
        frequency: 'أسبوعي',
        preferredDay: planData.preferredDay,
        preferredTime: planData.preferredTime,
      },

      resources: [
        { type: 'video', title: 'تمارين حركية للرضع' },
        { type: 'booklet', title: 'دليل التدخل المبكر' },
        { type: 'app', title: 'تطبيق متابعة النمو' },
      ],

      progress: {
        sessionsAttended: 0,
        totalSessions: 15,
        homePracticeCompletion: 0,
        skillsLearned: [],
      },

      status: 'active',
    };

    this.familyTrainings.set(training.id, training);
    return training;
  }

  // ==========================================
  // متابعة التقدم
  // ==========================================
  async recordProgress(beneficiaryId, progressData) {
    const progress = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),

      milestones: {
        achieved: progressData.achievedMilestones || [],
        emerging: progressData.emergingMilestones || [],
        notYet: progressData.notYetMilestones || [],
      },

      scores: {
        grossMotor: progressData.grossMotorScore,
        fineMotor: progressData.fineMotorScore,
        communication: progressData.communicationScore,
        cognitive: progressData.cognitiveScore,
        social: progressData.socialScore,
        adaptive: progressData.adaptiveScore,
      },

      observations: progressData.observations || '',
      caregiverFeedback: progressData.caregiverFeedback || '',

      nextSteps: progressData.nextSteps || [],

      overallProgress: this._calculateOverallProgress(progressData),
    };

    // تحديث سجل التقدم
    const beneficiaryProgress = this.progress.get(beneficiaryId) || [];
    beneficiaryProgress.push(progress);
    this.progress.set(beneficiaryId, beneficiaryProgress);

    return progress;
  }

  // ==========================================
  // حساب التقدم الإجمالي
  // ==========================================
  _calculateOverallProgress(progressData) {
    const scores = [
      progressData.grossMotorScore,
      progressData.fineMotorScore,
      progressData.communicationScore,
      progressData.cognitiveScore,
      progressData.socialScore,
      progressData.adaptiveScore,
    ].filter(s => s !== undefined);

    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  // ==========================================
  // تقرير التقدم
  // ==========================================
  async getProgressReport(beneficiaryId) {
    const screenings = Array.from(this.screenings.values()).filter(
      s => s.beneficiaryId === beneficiaryId
    );

    const progressRecords = this.progress.get(beneficiaryId) || [];

    if (screenings.length === 0) {
      return { beneficiaryId, message: 'لا توجد بيانات تقدم' };
    }

    const latestScreening = screenings[screenings.length - 1];
    const initialScreening = screenings[0];

    return {
      beneficiaryId,
      assessmentDate: latestScreening.date,
      age: latestScreening.age,

      initialStatus: {
        atRiskAreas: initialScreening.results.atRiskAreas.length,
        delayedAreas: initialScreening.results.delayedAreas.length,
      },

      currentStatus: {
        atRiskAreas: latestScreening.results.atRiskAreas.length,
        delayedAreas: latestScreening.results.delayedAreas.length,
      },

      improvement: {
        areasImproved: this._calculateImprovement(initialScreening, latestScreening),
        overallProgress:
          progressRecords.length > 0
            ? progressRecords[progressRecords.length - 1].overallProgress
            : 0,
      },

      progressRecords: progressRecords.length,

      recommendations: this._generateOngoingRecommendations(latestScreening),
    };
  }

  _calculateImprovement(initial, latest) {
    const improved = [];

    initial.results.delayedAreas.forEach(initialArea => {
      const latestArea = latest.results.delayedAreas.find(a => a.area === initialArea.area);
      if (!latestArea || latestArea.score > initialArea.score) {
        improved.push(initialArea.area);
      }
    });

    return improved;
  }

  _generateOngoingRecommendations(screening) {
    const recommendations = [];

    if (screening.results.delayedAreas.length > 0) {
      recommendations.push('الاستمرار في برنامج التدخل المكثف');
      recommendations.push('زيادة الجلسات العلاجية');
    }

    if (screening.results.atRiskAreas.length > 0) {
      recommendations.push('متابعة شهرية للنمو');
    }

    recommendations.push('تعزيز مشاركة الأسرة');
    recommendations.push('التركيز على نقاط القوة');

    return recommendations;
  }
}

module.exports = { AdvancedEarlyInterventionService };
