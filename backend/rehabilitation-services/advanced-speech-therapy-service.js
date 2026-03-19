/* eslint-disable no-unused-vars */
/**
 * Advanced Speech Therapy Service for Disability Rehabilitation
 * خدمة التخاطب المتقدمة لتأهيل ذوي الإعاقة
 *
 * Supports: Speech Assessment, Articulation, Language Disorders, AAC
 */

class AdvancedSpeechTherapyService {
  constructor() {
    this.assessments = new Map();
    this.sessions = new Map();
    this.progress = new Map();
    this.aacSystems = new Map();
  }

  // ==========================================
  // تقييم التخاطب الشامل
  // ==========================================
  async createSpeechAssessment(beneficiaryId, assessmentData) {
    const assessment = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),

      // تقييم النطق
      articulation: {
        consonantSounds: assessmentData.consonantSounds || {},
        vowelSounds: assessmentData.vowelSounds || {},
        phonologicalProcesses: assessmentData.phonologicalProcesses || [],
        intelligibility: assessmentData.intelligibility || 'moderate', // mild, moderate, severe
      },

      // تقييم اللغة
      language: {
        receptive: {
          level: assessmentData.receptiveLanguage || 'age_appropriate',
          comprehension: assessmentData.comprehension || 80,
        },
        expressive: {
          level: assessmentData.expressiveLanguage || 'age_appropriate',
          vocabulary: assessmentData.vocabularySize || 100,
          sentenceStructure: assessmentData.sentenceStructure || 'simple',
        },
        pragmatics: {
          eyeContact: assessmentData.eyeContact || 'moderate',
          turnTaking: assessmentData.turnTaking || 'developing',
          socialCommunication: assessmentData.socialCommunication || 'moderate',
        },
      },

      // تقييم الصوت
      voice: {
        quality: assessmentData.voiceQuality || 'normal', // breathy, harsh, hoarse, normal
        pitch: assessmentData.pitch || 'normal',
        loudness: assessmentData.loudness || 'normal',
        resonance: assessmentData.resonance || 'normal',
      },

      // تقييم الطلاقة
      fluency: {
        stutteringType: assessmentData.stutteringType || [],
        frequency: assessmentData.stutteringFrequency || 0,
        secondaryBehaviors: assessmentData.secondaryBehaviors || [],
        avoidanceBehaviors: assessmentData.avoidanceBehaviors || [],
      },

      // تقييم التغذية والبلع
      swallowing: {
        oralPhase: assessmentData.oralPhase || 'normal',
        pharyngealPhase: assessmentData.pharyngealPhase || 'normal',
        dietTexture: assessmentData.dietTexture || 'regular',
        liquidConsistency: assessmentData.liquidConsistency || 'thin',
      },

      // التشخيص
      diagnosis: {
        primary: assessmentData.primaryDiagnosis || '',
        secondary: assessmentData.secondaryDiagnosis || [],
        severity: assessmentData.severity || 'moderate',
      },

      // خطة العلاج
      treatmentPlan: null,

      status: 'active',
    };

    assessment.treatmentPlan = this._generateTreatmentPlan(assessment);
    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  // ==========================================
  // توليد خطة العلاج
  // ==========================================
  _generateTreatmentPlan(assessment) {
    const plan = {
      goals: [],
      shortTermGoals: [],
      longTermGoals: [],
      recommendedFrequency: 'twice_weekly',
      duration: '6_months',
      techniques: [],
      homeProgram: [],
    };

    // أهداف بناءً على التشخيص
    if (assessment.articulation.intelligibility !== 'normal') {
      plan.goals.push({
        area: 'articulation',
        goal: 'تحسين وضوح الكلام',
        target: 'تحسين نطق الأصوات الصامتة',
        activities: ['تمارين النطق', 'تدريب الأصوات المحددة'],
      });
    }

    if (assessment.language.receptive.level !== 'age_appropriate') {
      plan.goals.push({
        area: 'receptive_language',
        goal: 'تحسين الاستيعاب اللغوي',
        target: 'زيادة فهم التعليمات والمفاهيم',
        activities: ['تدريب على التعليمات', 'تصنيف المفاهيم'],
      });
    }

    if (assessment.fluency.frequency > 5) {
      plan.goals.push({
        area: 'fluency',
        goal: 'تحسين الطلاقة الكلامية',
        target: 'تقليل التلعثم بنسبة 50%',
        activities: ['تقنيات التنفس', 'الكلام البطيء', 'الإيقاع'],
      });
    }

    // الأهداف قصيرة المدى
    plan.shortTermGoals = [
      { goal: 'تحسين نطق 5 أصوات خلال 3 أشهر', timeline: '3_months' },
      { goal: 'زيادة المفردات بنسبة 20%', timeline: '2_months' },
    ];

    // الأهداف طويلة المدى
    plan.longTermGoals = [
      { goal: 'الوصول لمستوى طلاقة طبيعي', timeline: '6_months' },
      { goal: 'تواصل فعال في المواقف الاجتماعية', timeline: '12_months' },
    ];

    // التقنيات العلاجية
    plan.techniques = ['التدريب السمعي', 'النمذجة', 'التغذية الراجعة', 'التدريب على المهارات'];

    // البرنامج المنزلي
    plan.homeProgram = [
      { activity: 'تمارين النطق اليومية', duration: '15 دقيقة' },
      { activity: 'قراءة مشتركة', duration: '20 دقيقة' },
      { activity: 'ألعاب لغوية', duration: '10 دقائق' },
    ];

    return plan;
  }

  // ==========================================
  // تسجيل جلسة تخاطب
  // ==========================================
  async recordSession(beneficiaryId, sessionData) {
    const session = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      therapist: sessionData.therapist,
      sessionNumber: sessionData.sessionNumber,
      duration: sessionData.duration || 45,

      // المحتوى
      content: {
        areasAddressed: sessionData.areasAddressed || [],
        activities: sessionData.activities || [],
        materials: sessionData.materials || [],
      },

      // القياسات
      measurements: {
        accuracyRate: sessionData.accuracyRate || 0,
        attemptsCount: sessionData.attemptsCount || 0,
        successfulAttempts: sessionData.successfulAttempts || 0,
        engagementLevel: sessionData.engagementLevel || 'good',
      },

      // الملاحظات
      observations: {
        strengths: sessionData.strengths || [],
        challenges: sessionData.challenges || [],
        improvements: sessionData.improvements || [],
      },

      // الواجب المنزلي
      homework: sessionData.homework || [],

      notes: sessionData.notes || '',
      nextSessionPlan: sessionData.nextSessionPlan || '',

      status: 'completed',
    };

    this.sessions.set(session.id, session);
    this._updateProgress(beneficiaryId, session);

    return session;
  }

  // ==========================================
  // تحديث التقدم
  // ==========================================
  _updateProgress(beneficiaryId, session) {
    const progress = this.progress.get(beneficiaryId) || {
      sessions: [],
      accuracyTrend: [],
      areasProgress: {},
      overallProgress: 0,
    };

    progress.sessions.push({
      date: session.date,
      accuracy: session.measurements.accuracyRate,
    });

    progress.accuracyTrend.push(session.measurements.accuracyRate);

    // حساب التقدم الإجمالي
    const recentAccuracy = progress.accuracyTrend.slice(-5);
    progress.overallProgress = Math.round(
      recentAccuracy.reduce((a, b) => a + b, 0) / recentAccuracy.length
    );

    this.progress.set(beneficiaryId, progress);
  }

  // ==========================================
  // إعداد نظام التواصل البديل (AAC)
  // ==========================================
  async setupAACSystem(beneficiaryId, aacData) {
    const aacSystem = {
      id: Date.now().toString(),
      beneficiaryId,
      setupDate: new Date(),

      type: aacData.type, // low_tech, mid_tech, high_tech

      // النظام المنخفض التقنية
      lowTech: {
        communicationBoard: aacData.communicationBoard || false,
        pictureCards: aacData.pictureCards || false,
        signLanguage: aacData.signLanguage || false,
      },

      // النظام عالي التقنية
      highTech: {
        deviceType: aacData.deviceType || null,
        software: aacData.software || null,
        vocabularySet: aacData.vocabularySet || 'core',
        language: aacData.language || 'arabic',
      },

      // التخصيص
      customization: {
        personalVocabulary: [],
        phrases: [],
        pages: [],
      },

      // التدريب
      training: {
        completed: false,
        sessionsCompleted: 0,
        totalSessionsRequired: 10,
        familyTrainingCompleted: false,
      },

      status: 'active',
    };

    // إضافة المفردات الأساسية العربية
    aacSystem.customization.personalVocabulary = this._getDefaultArabicVocabulary();

    this.aacSystems.set(aacSystem.id, aacSystem);
    return aacSystem;
  }

  // ==========================================
  // المفردات العربية الافتراضية
  // ==========================================
  _getDefaultArabicVocabulary() {
    return [
      // احتياجات أساسية
      { word: 'ماء', category: 'needs', image: 'water' },
      { word: 'طعام', category: 'needs', image: 'food' },
      { word: 'حمام', category: 'needs', image: 'bathroom' },
      { word: 'نوم', category: 'needs', image: 'sleep' },

      // مشاعر
      { word: 'سعيد', category: 'feelings', image: 'happy' },
      { word: 'حزين', category: 'feelings', image: 'sad' },
      { word: 'غاضب', category: 'feelings', image: 'angry' },
      { word: 'متعب', category: 'feelings', image: 'tired' },

      // أشخاص
      { word: 'أمي', category: 'people', image: 'mother' },
      { word: 'أبي', category: 'people', image: 'father' },
      { word: 'معلم', category: 'people', image: 'teacher' },

      // أنشطة
      { word: 'أريد', category: 'actions', image: 'want' },
      { word: 'لا أريد', category: 'actions', image: 'dont_want' },
      { word: 'ساعدني', category: 'actions', image: 'help' },
    ];
  }

  // ==========================================
  // تقرير التقدم
  // ==========================================
  async getProgressReport(beneficiaryId) {
    const progress = this.progress.get(beneficiaryId);
    const assessment = Array.from(this.assessments.values()).find(
      a => a.beneficiaryId === beneficiaryId
    );

    if (!progress) {
      return { beneficiaryId, message: 'لا توجد بيانات تقدم' };
    }

    return {
      beneficiaryId,
      totalSessions: progress.sessions.length,
      overallProgress: progress.overallProgress,

      accuracyAnalysis: {
        current: progress.accuracyTrend[progress.accuracyTrend.length - 1] || 0,
        average: Math.round(
          progress.accuracyTrend.reduce((a, b) => a + b, 0) / progress.accuracyTrend.length
        ),
        trend: this._calculateTrend(progress.accuracyTrend),
      },

      goalsProgress:
        assessment?.treatmentPlan?.goals?.map(g => ({
          area: g.area,
          goal: g.goal,
          status: 'in_progress',
        })) || [],

      recommendations: this._generateRecommendations(progress),
    };
  }

  _calculateTrend(data) {
    if (data.length < 3) return 'insufficient_data';
    const recent = data.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const earlier =
      data.slice(-6, -3).reduce((a, b) => a + b, 0) / Math.max(1, data.slice(-6, -3).length);
    if (recent > earlier + 5) return 'improving';
    if (recent < earlier - 5) return 'declining';
    return 'stable';
  }

  _generateRecommendations(progress) {
    const recommendations = [];
    if (progress.overallProgress >= 80) {
      recommendations.push('الاستعداد لتقليل عدد الجلسات');
      recommendations.push('التركيز على التعميم في البيئة الطبيعية');
    } else if (progress.overallProgress >= 50) {
      recommendations.push('الاستمرار في العلاج الحالي');
      recommendations.push('تعزيز البرنامج المنزلي');
    } else {
      recommendations.push('مراجعة خطة العلاج');
      recommendations.push('زيادة التكرار والتركيز');
    }
    return recommendations;
  }
}

module.exports = { AdvancedSpeechTherapyService };
